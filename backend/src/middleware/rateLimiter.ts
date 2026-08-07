import { Request, Response, NextFunction } from 'express';

// Mock rate limiter for local development
export const apiLimiter = (req: Request, res: Response, next: NextFunction) => next();
export const authLimiter = (req: Request, res: Response, next: NextFunction) => next();
export const interviewLimiter = (req: Request, res: Response, next: NextFunction) => next();
