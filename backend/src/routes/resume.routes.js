import { Router } from 'express';
import multer from 'multer';
import Resume from '../models/Resume.js';
import { parseResumeText, parseDocumentBuffer } from '../services/parser.service.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype === 'text/plain' || file.originalname.match(/\.(pdf|txt)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and TXT files are supported for resume ingestion.'));
    }
  },
});

/**
 * POST /api/resumes
 * Create resume from structured JSON or raw text
 */
router.post('/', async (req, res, next) => {
  try {
    const { rawText, candidateName, totalExperienceYears, skills, education, anonymize } = req.body;

    let resumeData;
    if (rawText && (!skills || skills.length === 0)) {
      // Auto-extract attributes using parser service
      resumeData = parseResumeText(rawText, { anonymize: anonymize !== false });
      if (candidateName) resumeData.candidateName = candidateName;
      if (totalExperienceYears !== undefined) resumeData.totalExperienceYears = Number(totalExperienceYears);
    } else {
      resumeData = {
        candidateName: candidateName || 'Anonymous Candidate',
        totalExperienceYears: Number(totalExperienceYears) || 0,
        skills: Array.isArray(skills) ? skills.map(s => typeof s === 'string' ? { name: s } : s) : [],
        education: education || [],
        rawText: rawText || '',
        anonymized: anonymize !== false,
      };
    }

    const resume = await Resume.create(resumeData);
    res.status(201).json({
      success: true,
      message: 'Resume parsed and ingested successfully.',
      data: resume,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/resumes/upload
 * Ingest resume from uploaded PDF file
 */
router.post('/upload', upload.single('resumeFile'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF or TXT resume file.' });
    }

    const anonymize = req.body.anonymize !== 'false';
    const parsedAttributes = await parseDocumentBuffer(req.file.buffer, req.file.mimetype, { anonymize });

    const resume = await Resume.create(parsedAttributes);

    res.status(201).json({
      success: true,
      message: 'Resume file parsed and stored successfully.',
      data: resume,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/resumes
 * List all parsed resumes
 */
router.get('/', async (req, res, next) => {
  try {
    const resumes = await Resume.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: resumes.length,
      data: resumes,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/resumes/:id
 * Fetch single resume by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    res.status(200).json({ success: true, data: resume });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/resumes/:id
 * Delete a resume
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const resume = await Resume.findByIdAndDelete(req.params.id);
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    res.status(200).json({ success: true, message: 'Resume deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
