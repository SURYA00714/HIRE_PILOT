import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../utils/prisma';
import { supabase } from '../utils/supabase';

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { user: { select: { name: true, email: true } } }
    });

    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { college, degree, skills, experience, preferredLang, targetRole, targetCompany } = req.body;

    const profile = await prisma.profile.update({
      where: { userId },
      data: {
        college,
        degree,
        skills,
        experience,
        preferredLang,
        targetRole,
        targetCompany
      }
    });

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const uploadProfileImage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('profiles')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
      });

    if (error) {
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage.from('profiles').getPublicUrl(fileName);

    res.json({ message: 'Profile image uploaded successfully', imageUrl: publicUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
