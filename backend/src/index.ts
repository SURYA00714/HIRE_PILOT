import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import resumeRoutes from './routes/resume.routes';
import interviewRoutes from './routes/interview.routes';
import analyticsRoutes from './routes/analytics.routes';
import adminRoutes from './routes/admin.routes';
import { InterviewService } from './services/interview.service';
import prisma from './utils/prisma';
import { apiLimiter } from './middleware/rateLimiter';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
const PORT = process.env.PORT || 5000;

// Security & parsing middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json({ limit: '10mb' }));
app.use(apiLimiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'HIRE_PILOT API is running', timestamp: new Date().toISOString() });
});

// In-memory cache for zero-latency TTS audio on repeated phrases (greetings, standard prompts)
const ttsCache = new Map<string, { buffer: Buffer, type: string }>();

// TTS Audio — Google Translate real human MP3 voice, falls back to espeak-ng
app.get('/api/tts', async (req: express.Request, res: express.Response) => {
  const text = (req.query.text as string) || 'Hello';
  const gender = (req.query.gender as string) || 'female';
  // Safe clean text for shell use
  const cleanText = text.replace(/[*#"'`$\\]/g, '').replace(/\n/g, ' ').trim().substring(0, 250);
  if (!cleanText) return res.status(400).json({ error: 'No text provided' });

  const cacheKey = `${gender}:${cleanText}`;
  if (ttsCache.has(cacheKey)) {
    const cached = ttsCache.get(cacheKey)!;
    res.set({ 'Content-Type': cached.type, 'Content-Length': cached.buffer.length.toString(), 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600' });
    return res.send(cached.buffer);
  }

  // ── OPTION 1: 100% Offline espeak-ng local fallback ──────
  // The environment is blocking external network requests (npm, responsivevoice, google)
  // so we must use local command-line tools.
  try {
    const { execSync } = require('child_process');
    // Using a male/female voice ID natively built into linux espeak
    const voiceId = gender === 'male' ? 'en-us+m3' : 'en-us+f3';
    const speed = gender === 'male' ? '140' : '125';
    const wavBuffer = execSync(
      `espeak-ng -v ${voiceId} -s ${speed} -p ${gender === 'male' ? '32' : '55'} -a 90 -g 8 --stdout "${cleanText}"`,
      { maxBuffer: 8 * 1024 * 1024 }
    );

    ttsCache.set(cacheKey, { buffer: wavBuffer, type: 'audio/wav' });

    // Prevent memory leaks: cap cache at 100 entries (FIFO)
    if (ttsCache.size > 100) {
      const firstKey = ttsCache.keys().next().value;
      if (firstKey) ttsCache.delete(firstKey);
    }

    res.set({ 'Content-Type': 'audio/wav', 'Content-Length': wavBuffer.length.toString(), 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache' });
    return res.send(wavBuffer);
  } catch (err: any) {
    console.error('espeak-ng TTS error:', err.message);
    return res.status(500).json({ error: 'TTS unavailable locally' });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Socket.IO Interview Logic
io.on('connection', (socket) => {
  console.log('User connected to interview socket:', socket.id);

  let currentSessionId = '';
  let currentQuestionId = '';

  socket.on('start_interview', async (data) => {
    try {
      const sessionId = data.sessionId;
      if (!sessionId) {
        return socket.emit('interview_error', { message: 'No session ID provided' });
      }

      currentSessionId = sessionId;

      // Fetch existing session and resume context from DB
      const dbSession = await prisma.interviewSession.findUnique({
        where: { id: sessionId },
        include: { user: { include: { resume: true } } }
      });

      if (!dbSession) {
        return socket.emit('interview_error', { message: 'Session not found' });
      }

      let resumeContext = '';
      let extractedSkills: string[] = [];
      if (dbSession.user?.resume?.extractedText) {
        resumeContext = `Extracted Text:\n${dbSession.user.resume.extractedText}`;
        try {
          const parsedFeedback = JSON.parse(dbSession.user.resume.feedback || '{}');
          if (parsedFeedback.skills) extractedSkills = parsedFeedback.skills;
        } catch {}
      }

      const session = await InterviewService.createSession({
        sessionId,
        userId: dbSession.userId,
        interviewType: data.type || dbSession.type || 'Technical',
        targetRole: data.role || dbSession.role || 'Software Engineer',
        experienceLevel: data.experienceLevel || dbSession.experienceLevel || 'Mid-Level',
        maxQuestions: data.questionCount || dbSession.questionCount || 5,
        resumeContext,
        extractedSkills,
        socketId: socket.id
      });
      
      const { question, questionId } = await InterviewService.startInterview(session.sessionId);
      
      currentQuestionId = questionId;

      socket.emit('next_question', { 
        question,
        questionNumber: 1,
        totalQuestions: session.maxQuestions
      });
    } catch (err: any) {
      console.error('Failed to start interview:', err);
      socket.emit('interview_error', { message: err?.message || 'Failed to start interview' });
    }
  });

  socket.on('submit_answer', async (data) => {
    try {
      const { answer, responseTimeMs } = data;
      
      if (!currentSessionId || !currentQuestionId) {
        return socket.emit('interview_error', { message: 'No active question found' });
      }

      const { evaluation, nextQuestion, isComplete } = await InterviewService.processAnswer(
        currentSessionId,
        currentQuestionId,
        answer,
        responseTimeMs || 30000
      );
      
      socket.emit('answer_evaluated', { evaluation });
      
      if (isComplete) {
        const finalEval = await InterviewService.completeInterview(currentSessionId);
        
        // Award XP and update Profile to user (legacy compatibility)
        const session = await prisma.interviewSession.findUnique({ where: { id: currentSessionId } });
        let xpEarned = Math.round((finalEval.overallScore || 50) * 2);
        if (session) {
          await prisma.user.update({
            where: { id: session.userId },
            data: { xp: { increment: xpEarned }, lastActiveDate: new Date() }
          });
          
          try {
            const profile = await prisma.profile.findUnique({ where: { userId: session.userId } });
            if (profile) {
              const currentStrong = JSON.parse(profile.strongTopics || '[]');
              const currentWeak = JSON.parse(profile.weakTopics || '[]');
              const newStrong = [...new Set([...currentStrong, ...(finalEval.strengths || [])])].slice(-10);
              const newWeak = [...new Set([...currentWeak, ...(finalEval.weaknesses || [])])].slice(-10);
              await prisma.profile.update({
                where: { userId: session.userId },
                data: { strongTopics: JSON.stringify(newStrong), weakTopics: JSON.stringify(newWeak) }
              });
            }
          } catch (e) {
             console.error('Failed to update profile topics:', e);
          }
        }
        
        socket.emit('interview_completed', { ...finalEval, xpEarned, duration: 300 });
      } else if (nextQuestion) {
        const sessionObj = InterviewService.getSession(currentSessionId);
        currentQuestionId = nextQuestion.questionId;

        socket.emit('next_question', {
          question: nextQuestion.question,
          feedbackOnLast: evaluation.feedback,
          questionNumber: sessionObj.questionCounter,
          totalQuestions: sessionObj.maxQuestions
        });
      }
    } catch (err: any) {
      console.error('Failed to process answer:', err);
      socket.emit('interview_error', { message: 'Failed to process answer' });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

if (process.env.NODE_ENV !== 'production' || process.env.RENDER || process.env.RAILWAY) {
  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 HIRE_PILOT Server running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Address:`, server.address());
  });
}

// Export for serverless environments
export default app;
