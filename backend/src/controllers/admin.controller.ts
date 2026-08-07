import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../utils/prisma';

export const getAdminDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalInterviews = await prisma.interviewSession.count();
    const completedInterviews = await prisma.interviewSession.count({
      where: { status: 'COMPLETED' }
    });

    // Average score across all completed interviews
    const allCompleted = await prisma.interviewSession.findMany({
      where: { status: 'COMPLETED' },
      select: { overallScore: true }
    });
    const avgScore = allCompleted.length > 0
      ? Math.round(allCompleted.reduce((sum, s) => sum + (s.overallScore || 0), 0) / allCompleted.length)
      : 0;

    // Recent registrations
    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, name: true, email: true, role: true, xp: true, createdAt: true }
    });

    // Recent audit logs
    const recentLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: { select: { name: true, email: true } }
      }
    });

    res.json({
      totalUsers,
      totalInterviews,
      completedInterviews,
      avgScore,
      recentUsers,
      recentLogs
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string || '';

    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } }
      ]
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, email: true, role: true, xp: true, streak: true,
          createdAt: true, _count: { select: { sessions: true } }
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const logs = await prisma.auditLog.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } }
      }
    });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
