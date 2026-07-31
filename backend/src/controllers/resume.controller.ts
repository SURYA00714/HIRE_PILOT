import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../utils/prisma';
import { supabase } from '../utils/supabase';
import { analyzeResume } from '../utils/gemini';
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

    // Upload to Supabase
    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('resumes').getPublicUrl(fileName);

    // Extract Text (only for PDF in this example)
    let extractedText = '';
    if (file.mimetype === 'application/pdf') {
      const data = await pdf(file.buffer);
      extractedText = data.text;
    } else {
      return res.status(400).json({ error: 'Only PDF files are supported currently' });
    }

    // AI Analysis
    const aiFeedback = await analyzeResume(extractedText, jobRole);

    // Save to Database
    const resume = await prisma.resume.upsert({
      where: { userId },
      update: {
        fileUrl: publicUrl,
        fileName: file.originalname,
        atsScore: aiFeedback.atsScore,
        feedback: JSON.stringify(aiFeedback),
        extractedText
      },
      create: {
        userId,
        fileUrl: publicUrl,
        fileName: file.originalname,
        atsScore: aiFeedback.atsScore,
        feedback: JSON.stringify(aiFeedback),
        extractedText
      }
    });

    res.json({ message: 'Resume uploaded and analyzed successfully', resume });
  } catch (error) {
    console.error('Resume upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
