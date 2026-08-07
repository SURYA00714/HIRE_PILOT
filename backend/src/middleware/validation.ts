import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

// Generic validation middleware factory
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
};

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100)
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

// Profile schema
export const updateProfileSchema = z.object({
  college: z.string().optional(),
  degree: z.string().optional(),
  skills: z.array(z.string()).optional(),
  experience: z.number().int().min(0).max(50).optional(),
  preferredLang: z.string().optional(),
  targetRole: z.string().optional(),
  targetCompany: z.string().optional(),
  bio: z.string().max(500).optional()
});

// Interview setup schema
export const interviewSetupSchema = z.object({
  type: z.string().min(1, 'Interview type is required'),
  role: z.string().min(1, 'Role is required'),
  experienceLevel: z.string().min(1, 'Experience level is required'),
  inputMode: z.string().default('text'),
  difficulty: z.number().int().min(1).max(10).optional(),
  questionCount: z.number().int().min(3).max(20).optional()
});
