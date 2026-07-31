import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../utils/prisma';

export const createInterviewSession = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { type, role, experienceLevel, inputMode } = req.body;

    const session = await prisma.interviewSession.create({
      data: {
        userId,
        type,
        role,
        experienceLevel,
        inputMode,
        status: 'PENDING'
      }
    });

    res.status(201).json({ message: 'Interview session created', session });
  } catch (error) {
    console.error('Create interview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getInterviewSessions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const sessions = await prisma.interviewSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
