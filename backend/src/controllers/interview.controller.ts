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
        type: type || 'Technical',
        role: role || 'Software Engineer',
        experienceLevel: experienceLevel || 'Mid-Level',
        inputMode: inputMode || 'text',
        status: 'PENDING'
      }
    });

    // Return sessionId at top level — this is what the frontend expects
    res.status(201).json({ sessionId: session.id, session });
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

export const getInterviewById = async (req: AuthRequest, res: Response) => {
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
      ...session,
      feedback: session.feedback ? JSON.parse(session.feedback) : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
