import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../utils/prisma';

export const getPlatformStats = async (req: AuthRequest, res: Response) => {
  try {
    const totalUsers = await prisma.user.count({ where: { role: 'USER' } });
    const totalInterviews = await prisma.interviewSession.count();
    const completedInterviews = await prisma.interviewSession.count({ where: { status: 'COMPLETED' } });
    
    // Average score across all platforms
    const sessions = await prisma.interviewSession.findMany({
      where: { status: 'COMPLETED' },
      select: { overallScore: true }
    });
    
    let avgPlatformScore = 0;
    if (sessions.length > 0) {
      const sum = sessions.reduce((acc, curr) => acc + (curr.overallScore || 0), 0);
      avgPlatformScore = Math.round(sum / sessions.length);
    }

    res.json({
      totalUsers,
      totalInterviews,
      completedInterviews,
      avgPlatformScore
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'USER' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        profile: {
          select: {
            targetRole: true
          }
        },
        _count: {
          select: { sessions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
