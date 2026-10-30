import { Router } from 'express';
import mongoose from 'mongoose';
import Job from '../models/Job.js';
import { extractSkills, extractExperienceYears } from '../services/parser.service.js';
import {
  authenticate,
  requireRole,
  requirePrivateWorkspace,
  getTenantFilter,
} from '../middleware/auth.middleware.js';

const router = Router();

/**
 * POST /api/jobs
 * Create job description in private workspace (Recruiter / Admin only)
 */
router.post('/', authenticate, requirePrivateWorkspace, requireRole('recruiter', 'admin'), async (req, res, next) => {
  try {
    const {
      title,
      company,
      department,
      description,
      minExperienceYears,
      requiredSkills,
      preferredSkills,
      educationRequirement,
      responsibilities,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required to create a job posting.' });
    }

    // If skills are not explicitly passed, auto-extract from the job description
    let finalRequiredSkills = requiredSkills;
    if (!finalRequiredSkills || finalRequiredSkills.length === 0) {
      const extracted = extractSkills(description);
      finalRequiredSkills = extracted.map(s => ({
        name: s.name,
        category: s.category,
        weight: 1.0,
      }));
    } else {
      finalRequiredSkills = finalRequiredSkills.map(s => (typeof s === 'string' ? { name: s, weight: 1.0 } : s));
    }

    const finalPreferredSkills = Array.isArray(preferredSkills)
      ? preferredSkills.map(s => (typeof s === 'string' ? { name: s, weight: 0.5 } : s))
      : [];

    const calculatedMinExp = minExperienceYears !== undefined
      ? Number(minExperienceYears)
      : extractExperienceYears(description);

    const job = await Job.create({
      title,
      company: (company && company.trim()) ? company.trim() : 'Company not specified',
      department: department || 'Engineering',
      description,
      minExperienceYears: calculatedMinExp,
      requiredSkills: finalRequiredSkills,
      preferredSkills: finalPreferredSkills,
      educationRequirement: educationRequirement || 'Bachelor degree in relevant domain',
      responsibilities: Array.isArray(responsibilities) ? responsibilities : [],
      ownerId: req.tenant.id,
      isDemo: false,
      quarantined: false,
    });

    res.status(201).json({
      success: true,
      message: 'Job posting created in your private workspace successfully.',
      data: job,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/jobs
 * List all job postings scoped to active tenant (Demo visitors see demo jobs; users see their own)
 */
router.get('/', async (req, res, next) => {
  try {
    const filter = getTenantFilter(req);
    const jobs = await Job.find(filter).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/jobs/:id
 * Fetch single job by ID scoped strictly to active tenant (IDOR protected)
 */
router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: `Invalid job identifier: '${req.params.id}'` });
    }

    const filter = { _id: req.params.id, ...getTenantFilter(req) };
    const job = await Job.findOne(filter);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.status(200).json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/jobs/:id
 * Update job description in private workspace (Recruiter / Admin only, workspace owner only)
 */
router.put('/:id', authenticate, requirePrivateWorkspace, requireRole('recruiter', 'admin'), async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: `Invalid job identifier: '${req.params.id}'` });
    }

    const filter = { _id: req.params.id, ownerId: req.tenant.id };
    const job = await Job.findOne(filter);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const {
      title,
      company,
      department,
      description,
      minExperienceYears,
      requiredSkills,
      preferredSkills,
      educationRequirement,
      responsibilities,
    } = req.body;

    if (title !== undefined) {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        return res.status(400).json({ error: 'Job title cannot be empty.' });
      }
      job.title = trimmedTitle;
    }

    if (description !== undefined) {
      const trimmedDesc = description.trim();
      if (!trimmedDesc) {
        return res.status(400).json({ error: 'Job description cannot be empty.' });
      }
      job.description = trimmedDesc;
    }

    if (company !== undefined) {
      job.company = company.trim() || 'Company not specified';
    }

    if (department !== undefined) {
      job.department = department.trim() || job.department;
    }

    if (minExperienceYears !== undefined) {
      const parsedExp = Number(minExperienceYears);
      if (isNaN(parsedExp) || parsedExp < 0) {
        return res.status(400).json({ error: 'Minimum experience years must be a non-negative number.' });
      }
      job.minExperienceYears = parsedExp;
    }

    if (requiredSkills !== undefined) {
      if (Array.isArray(requiredSkills) && requiredSkills.length > 0) {
        job.requiredSkills = requiredSkills.map(s => (typeof s === 'string' ? { name: s.trim(), weight: 1.0 } : s)).filter(s => s.name);
      } else if (job.description) {
        const extracted = extractSkills(job.description);
        job.requiredSkills = extracted.map(s => ({
          name: s.name,
          category: s.category,
          weight: 1.0,
        }));
      }
    }

    if (preferredSkills !== undefined && Array.isArray(preferredSkills)) {
      job.preferredSkills = preferredSkills.map(s => (typeof s === 'string' ? { name: s.trim(), weight: 0.5 } : s)).filter(s => s.name);
    }

    if (educationRequirement !== undefined) {
      job.educationRequirement = educationRequirement;
    }

    if (responsibilities !== undefined && Array.isArray(responsibilities)) {
      job.responsibilities = responsibilities;
    }

    await job.save();

    res.status(200).json({
      success: true,
      message: 'Job posting updated successfully.',
      data: job,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/jobs/:id
 * Delete job posting from private workspace (Workspace owner only)
 */
router.delete('/:id', authenticate, requirePrivateWorkspace, requireRole('recruiter', 'admin'), async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: `Invalid job identifier: '${req.params.id}'` });
    }

    const filter = { _id: req.params.id, ownerId: req.tenant.id };
    const job = await Job.findOneAndDelete(filter);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.status(200).json({ success: true, message: 'Job deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
