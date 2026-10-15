import { Router } from 'express';
import Job from '../models/Job.js';
import { extractSkills, extractExperienceYears } from '../services/parser.service.js';

const router = Router();

/**
 * POST /api/jobs
 * Create job description, auto-populating skills if not explicitly provided
 */
router.post('/', async (req, res, next) => {
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
      company: company || 'Drishti AI Partner',
      department: department || 'Engineering',
      description,
      minExperienceYears: calculatedMinExp,
      requiredSkills: finalRequiredSkills,
      preferredSkills: finalPreferredSkills,
      educationRequirement: educationRequirement || 'Bachelor degree in relevant domain',
      responsibilities: Array.isArray(responsibilities) ? responsibilities : [],
    });

    res.status(201).json({
      success: true,
      message: 'Job posting created successfully.',
      data: job,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/jobs
 * List all job postings
 */
router.get('/', async (req, res, next) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
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
 * Fetch single job by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.status(200).json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/jobs/:id
 * Delete job posting
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.status(200).json({ success: true, message: 'Job deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
