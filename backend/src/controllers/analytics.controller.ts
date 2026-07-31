import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../utils/prisma';

export const getDashboardAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Aggregate Interview Sessions
    const sessions = await prisma.interviewSession.findMany({
      where: { userId, status: 'COMPLETED' },
      orderBy: { createdAt: 'asc' }
    });

    const totalInterviews = sessions.length;
    let avgScore = 0;
    const scoresOverTime = sessions.map(s => ({
      date: s.createdAt,
      score: s.overallScore || 0,
      type: s.type
    }));

    if (totalInterviews > 0) {
      const sum = sessions.reduce((acc, curr) => acc + (curr.overallScore || 0), 0);
      avgScore = Math.round(sum / totalInterviews);
    }

    // Get Resume Score
    const resume = await prisma.resume.findUnique({
      where: { userId }
    });

    res.json({
      totalInterviews,
      avgScore,
      scoresOverTime,
      resumeScore: resume?.atsScore || null,
      recentInterviews: sessions.slice(-5).reverse()
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getInterviewFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const session = await prisma.interviewSession.findUnique({
      where: { id }
    });

    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    res.json({
      id: session.id,
      type: session.type,
      role: session.role,
      status: session.status,
      overallScore: session.overallScore,
      feedback: session.feedback ? JSON.parse(session.feedback) : null,
      date: session.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
