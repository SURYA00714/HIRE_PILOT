import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../utils/prisma';

export const getDashboardAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Get user with XP and streak
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, streak: true, name: true }
    });

    // Aggregate Interview Sessions
    const sessions = await prisma.interviewSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    });

    const completedSessions = sessions.filter(s => s.status === 'COMPLETED');
    const totalInterviews = completedSessions.length;
    
    let avgScore = 0;
    if (totalInterviews > 0) {
      const sum = completedSessions.reduce((acc, curr) => acc + (curr.overallScore || 0), 0);
      avgScore = Math.round(sum / totalInterviews);
    }

    // Scores over time for charts
    const scoresOverTime = completedSessions.map(s => ({
      date: s.createdAt,
      score: s.overallScore || 0,
      type: s.type,
      role: s.role
    }));

    // Type breakdown
    const typeBreakdown: Record<string, { count: number, avgScore: number }> = {};
    completedSessions.forEach(s => {
      if (!typeBreakdown[s.type]) {
        typeBreakdown[s.type] = { count: 0, avgScore: 0 };
      }
      typeBreakdown[s.type].count++;
      typeBreakdown[s.type].avgScore += (s.overallScore || 0);
    });
    Object.keys(typeBreakdown).forEach(key => {
      typeBreakdown[key].avgScore = Math.round(typeBreakdown[key].avgScore / typeBreakdown[key].count);
    });

    // Total XP earned
    const totalXp = user?.xp || 0;

    // Get Resume Score
    const resume = await prisma.resume.findUnique({
      where: { userId }
    });

    // Recent achievements
    const achievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
      take: 5
    });

    res.json({
      totalInterviews,
      avgScore,
      scoresOverTime,
      typeBreakdown,
      totalXp,
      streak: user?.streak || 0,
      resumeScore: resume?.atsScore || null,
      recentInterviews: sessions.slice(-5).reverse(),
      achievements: achievements.map(a => ({
        name: a.achievement.name,
        icon: a.achievement.icon,
        unlockedAt: a.unlockedAt
      }))
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
      where: { id },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    res.json({
      id: session.id,
      type: session.type,
      role: session.role,
      experienceLevel: session.experienceLevel,
      status: session.status,
      overallScore: session.overallScore,
      duration: session.duration,
      xpEarned: session.xpEarned,
      feedback: session.feedback ? JSON.parse(session.feedback) : null,
      questions: session.questions,
      createdAt: session.createdAt,
      completedAt: session.completedAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
