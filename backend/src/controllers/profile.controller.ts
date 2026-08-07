import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../utils/prisma';
import { supabase } from '../utils/supabase';

// Helper to parse JSON strings from SQLite
const parseProfile = (profile: any) => {
  if (!profile) return profile;
  return {
    ...profile,
    skills: profile.skills ? JSON.parse(profile.skills) : [],
    weakTopics: profile.weakTopics ? JSON.parse(profile.weakTopics) : [],
    strongTopics: profile.strongTopics ? JSON.parse(profile.strongTopics) : []
  };
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { user: { select: { name: true, email: true } } }
    });

    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(parseProfile(profile));
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
        skills: skills ? JSON.stringify(skills) : undefined,
        experience,
        preferredLang,
        targetRole,
        targetCompany
      }
    });

    res.json(parseProfile(profile));
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
