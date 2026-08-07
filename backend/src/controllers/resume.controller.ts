import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../utils/prisma';
import { supabase } from '../utils/supabase';
import { ResumeIntelligence } from '../services/resume-intelligence';
import { randomUUID } from 'crypto';
// @ts-ignore
import pdf from 'pdf-parse';

export const uploadResume = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { jobRole } = req.body;
    if (!jobRole) return res.status(400).json({ error: 'Job role is required for ATS scoring' });

    const file = req.file;
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${userId}-resume-${Date.now()}.${fileExt}`;

    // Upload to Supabase (Graceful fallback if bucket missing)
    let publicUrl = '';
    try {
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
        });

      if (uploadError) {
        console.warn('Supabase upload failed, bypassing cloud storage:', uploadError.message);
      } else {
        const { data } = supabase.storage.from('resumes').getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      }
    } catch (e: any) {
      console.warn('Supabase upload threw exception:', e.message);
    }

    // Extract Text (only for PDF in this example)
    let extractedText = '';
    if (file.mimetype === 'application/pdf') {
      try {
        const data = await pdf(file.buffer);
        extractedText = data.text;
      } catch (parseError: any) {
        console.warn('PDF parsing failed:', parseError.message);
        extractedText = 'Unable to parse PDF text due to encoding issues. Please manually enter your skills in your profile.';
      }
    } else {
      return res.status(400).json({ error: 'Only PDF files are supported currently' });
    }

    // AI Analysis via Resume Intelligence
    const correlationId = randomUUID();
    const entities = await ResumeIntelligence.extractEntities(extractedText, correlationId);

    // Save to Database
    const resume = await prisma.resume.upsert({
      where: { userId },
      update: {
        fileUrl: publicUrl,
        fileName: file.originalname,
        atsScore: entities.atsScore,
        feedback: JSON.stringify(entities),
        extractedText
      },
      create: {
        userId,
        fileUrl: publicUrl,
        fileName: file.originalname,
        atsScore: entities.atsScore,
        feedback: JSON.stringify(entities),
        extractedText
      }
    });

    res.json({ message: 'Resume uploaded and analyzed successfully', resume });
  } catch (error) {
    console.error('Resume upload error:', error);
    res.status(500).json({ error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error)), stack: error instanceof Error ? error.stack : undefined });
  }
};
