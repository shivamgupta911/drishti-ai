import { Router } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import Resume from '../models/Resume.js';
import { parseResumeText, parseDocumentBuffer } from '../services/parser.service.js';
import {
  authenticate,
  requireRole,
  requirePrivateWorkspace,
  getTenantFilter,
} from '../middleware/auth.middleware.js';

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
 * Create candidate profile in private user workspace (Recruiter / Admin only)
 */
router.post('/', authenticate, requirePrivateWorkspace, requireRole('recruiter', 'admin'), async (req, res, next) => {
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

    // Bind strictly to authenticated tenant context
    resumeData.ownerId = req.tenant.id;
    resumeData.isDemo = false;
    resumeData.quarantined = false;

    const resume = await Resume.create(resumeData);
    res.status(201).json({
      success: true,
      message: 'Resume parsed and ingested into your private workspace successfully.',
      data: resume,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/resumes/upload
 * Ingest resume from uploaded PDF file into private workspace (Recruiter / Admin only)
 */
router.post('/upload', authenticate, requirePrivateWorkspace, requireRole('recruiter', 'admin'), upload.single('resumeFile'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF or TXT resume file.' });
    }

    const anonymize = req.body.anonymize !== 'false';
    const parsedAttributes = await parseDocumentBuffer(req.file.buffer, req.file.mimetype, { anonymize });

    parsedAttributes.ownerId = req.tenant.id;
    parsedAttributes.isDemo = false;
    parsedAttributes.quarantined = false;

    const resume = await Resume.create(parsedAttributes);

    res.status(201).json({
      success: true,
      message: 'Resume file parsed and stored in your private workspace successfully.',
      data: resume,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/resumes
 * List candidate profiles scoped to the active tenant (Demo visitors see demo data; users see their own)
 */
router.get('/', async (req, res, next) => {
  try {
    const filter = getTenantFilter(req);
    const resumes = await Resume.find(filter).sort({ createdAt: -1 });
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
 * Fetch single candidate profile by ID scoped strictly to active tenant (IDOR protected)
 */
router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: `Invalid resume identifier: '${req.params.id}'` });
    }

    // Role-based candidate self-view constraint
    if (req.user?.role === 'candidate' && req.user.resumeId && req.user.resumeId !== req.params.id) {
      return res.status(403).json({ error: 'Access denied: You may only view your own candidate profile.' });
    }

    const filter = { _id: req.params.id, ...getTenantFilter(req) };
    const resume = await Resume.findOne(filter);
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
 * Delete a candidate profile from private workspace (Workspace owner only)
 */
router.delete('/:id', authenticate, requirePrivateWorkspace, requireRole('recruiter', 'admin'), async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: `Invalid resume identifier: '${req.params.id}'` });
    }

    const filter = { _id: req.params.id, ownerId: req.tenant.id };
    const resume = await Resume.findOneAndDelete(filter);
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    res.status(200).json({ success: true, message: 'Resume deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
