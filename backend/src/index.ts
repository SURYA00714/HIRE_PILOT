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
import { generateNextQuestion, generateFinalEvaluation } from './utils/adaptiveInterview';
import prisma from './utils/prisma';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(helmet());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'HIRE_PILOT API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

// Socket.IO Interview Logic
io.on('connection', (socket) => {
  console.log('User connected to interview socket:', socket.id);

  let interviewState = {
    sessionId: '',
    role: '',
    experienceLevel: '',
    qaHistory: [] as { question: string, answer: string }[],
    currentDifficulty: 3
  };

  socket.on('start_interview', async (data) => {
    interviewState.sessionId = data.sessionId;
    interviewState.role = data.role;
    interviewState.experienceLevel = data.experienceLevel;

    try {
      const firstQ = await generateNextQuestion(interviewState.role, interviewState.experienceLevel, [], interviewState.currentDifficulty);
      socket.emit('next_question', { question: firstQ.nextQuestion });
      interviewState.currentDifficulty = firstQ.newDifficulty;
      interviewState.qaHistory.push({ question: firstQ.nextQuestion, answer: '' });
    } catch (err) {
      socket.emit('error', { message: 'Failed to generate question' });
    }
  });

  socket.on('submit_answer', async (data) => {
    const { answer } = data;
    if (interviewState.qaHistory.length > 0) {
      interviewState.qaHistory[interviewState.qaHistory.length - 1].answer = answer;
    }

    // End interview after 5 questions for this MVP
    if (interviewState.qaHistory.length >= 5) {
      const finalEval = await generateFinalEvaluation(interviewState.role, interviewState.experienceLevel, interviewState.qaHistory);
      
      // Save to database
      if (interviewState.sessionId) {
        await prisma.interviewSession.update({
          where: { id: interviewState.sessionId },
          data: {
            status: 'COMPLETED',
            overallScore: finalEval.overallScore,
            feedback: JSON.stringify(finalEval)
          }
        });
      }

      socket.emit('interview_completed', finalEval);
      return;
    }

    try {
      const nextQ = await generateNextQuestion(interviewState.role, interviewState.experienceLevel, interviewState.qaHistory, interviewState.currentDifficulty);
      socket.emit('next_question', { question: nextQ.nextQuestion, feedbackOnLast: nextQ.feedbackOnLastAnswer });
      interviewState.currentDifficulty = nextQ.newDifficulty;
      interviewState.qaHistory.push({ question: nextQ.nextQuestion, answer: '' });
    } catch (err) {
      socket.emit('error', { message: 'Failed to generate question' });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

if (process.env.NODE_ENV !== 'production' || process.env.RENDER || process.env.RAILWAY) {
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export for serverless environments (like Vercel)
export default app;
