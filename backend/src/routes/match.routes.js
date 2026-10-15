import { Router } from 'express';
import Resume from '../models/Resume.js';
import Job from '../models/Job.js';
import MatchResult from '../models/MatchResult.js';
import { evaluateMatch } from '../services/matcher.service.js';
import { parseResumeText, extractSkills, extractExperienceYears } from '../services/parser.service.js';

const router = Router();

/**
 * POST /api/matches/evaluate
 * Compare candidate resume against job description and produce explainable audit
 */
router.post('/evaluate', async (req, res, next) => {
  try {
    const { resumeId, jobId, rawResumeText, rawJobText } = req.body;

    let resumeObj = null;
    let jobObj = null;

    // Option A: Resolve by ID from database
    if (resumeId) {
      resumeObj = await Resume.findById(resumeId);
      if (!resumeObj) {
        return res.status(404).json({ error: `Resume with ID ${resumeId} not found.` });
      }
    } else if (rawResumeText) {
      // Ephemeral on-the-fly parse
      resumeObj = parseResumeText(rawResumeText, { anonymize: true });
    }

    if (jobId) {
      jobObj = await Job.findById(jobId);
      if (!jobObj) {
        return res.status(404).json({ error: `Job with ID ${jobId} not found.` });
      }
    } else if (rawJobText) {
      // Ephemeral on-the-fly job parse
      jobObj = {
        title: 'Ad-hoc Job Posting',
        minExperienceYears: extractExperienceYears(rawJobText),
        requiredSkills: extractSkills(rawJobText),
        preferredSkills: [],
      };
    }

    if (!resumeObj || !jobObj) {
      return res.status(400).json({
        error: 'Provide either valid { resumeId, jobId } or { rawResumeText, rawJobText } for match evaluation.',
      });
    }

    // Run explainable matching engine
    const evaluation = evaluateMatch(resumeObj, jobObj);

    // Persist if linked to persistent DB records
    let savedRecord = null;
    if (resumeObj._id && jobObj._id) {
      savedRecord = await MatchResult.create({
        resumeId: resumeObj._id,
        jobId: jobObj._id,
        ...evaluation,
      });
    }

    res.status(200).json({
      success: true,
      data: savedRecord || evaluation,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/matches
 * List all saved match evaluations
 */
router.get('/', async (req, res, next) => {
  try {
    const matches = await MatchResult.find()
      .populate('resumeId', 'candidateName totalExperienceYears skills')
      .populate('jobId', 'title company minExperienceYears')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: matches.length,
      data: matches,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/matches/:id
 * Get single match audit
 */
router.get('/:id', async (req, res, next) => {
  try {
    const match = await MatchResult.findById(req.params.id)
      .populate('resumeId')
      .populate('jobId');

    if (!match) {
      return res.status(404).json({ error: 'Match evaluation not found' });
    }

    res.status(200).json({ success: true, data: match });
  } catch (error) {
    next(error);
  }
});

export default router;
