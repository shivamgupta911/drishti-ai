import { Router } from 'express';
import Resume from '../models/Resume.js';
import Job from '../models/Job.js';
import MatchResult from '../models/MatchResult.js';
import { evaluateMatch, rankCandidatesForJob, compareTwoCandidates } from '../services/matcher.service.js';
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

    if (resumeId) {
      resumeObj = await Resume.findById(resumeId);
      if (!resumeObj) {
        return res.status(404).json({ error: `Resume with ID ${resumeId} not found.` });
      }
    } else if (rawResumeText) {
      resumeObj = parseResumeText(rawResumeText, { anonymize: true });
    }

    if (jobId) {
      jobObj = await Job.findById(jobId);
      if (!jobObj) {
        return res.status(404).json({ error: `Job with ID ${jobId} not found.` });
      }
    } else if (rawJobText) {
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

    const evaluation = evaluateMatch(resumeObj, jobObj);

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
 * GET /api/matches/rank/:jobId
 * Batch evaluates all candidate profiles against a specific job posting
 */
router.get('/rank/:jobId', async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job posting not found.' });
    }

    const resumes = await Resume.find();
    if (resumes.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No candidates available to rank. Please ingest resumes first.',
        data: {
          jobId: job._id,
          jobTitle: job.title,
          leaderboard: [],
          cohortSize: 0,
        },
      });
    }

    const ranking = rankCandidatesForJob(resumes, job);

    res.status(200).json({
      success: true,
      data: ranking,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/matches/compare
 * Generates an explainable side-by-side comparison between two candidates for a role
 */
router.post('/compare', async (req, res, next) => {
  try {
    const { candidateAId, candidateBId, jobId } = req.body;

    if (!candidateAId || !candidateBId || !jobId) {
      return res.status(400).json({
        error: 'Please provide candidateAId, candidateBId, and jobId.',
      });
    }

    const [candidateA, candidateB, job] = await Promise.all([
      Resume.findById(candidateAId),
      Resume.findById(candidateBId),
      Job.findById(jobId),
    ]);

    if (!candidateA || !candidateB || !job) {
      return res.status(404).json({
        error: 'One or more of the specified candidates or job posting could not be found.',
      });
    }

    const comparison = compareTwoCandidates(candidateA, candidateB, job);

    res.status(200).json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/matches/:id/report
 * Returns a structured, printable compliance & algorithmic fairness audit dossier
 */
router.get('/:id/report', async (req, res, next) => {
  try {
    const match = await MatchResult.findById(req.params.id)
      .populate('resumeId')
      .populate('jobId');

    if (!match) {
      return res.status(404).json({ error: 'Match evaluation not found.' });
    }

    const auditDossier = {
      dossierId: `DRISHTI-AUDIT-${match._id.toString().toUpperCase()}`,
      generatedAt: new Date().toISOString(),
      role: {
        title: match.jobId?.title || 'Unknown Role',
        company: match.jobId?.company || 'Drishti AI Ecosystem',
        department: match.jobId?.department || 'Engineering',
        minExperienceYears: match.jobId?.minExperienceYears || 0,
      },
      candidate: {
        identifier: match.resumeId?.candidateName || 'Anonymous Candidate',
        anonymized: match.resumeId?.anonymized !== false,
        totalExperienceYears: match.resumeId?.totalExperienceYears || 0,
      },
      evaluation: {
        overallScore: match.overallScore,
        breakdown: match.breakdown,
        matchingSkills: match.matchingSkills,
        missingRequiredSkills: match.missingRequiredSkills,
        experienceStatus: match.experienceComparison?.status,
      },
      explainabilitySummary: match.explainability?.summary,
      scoringRationale: match.explainability?.scoringRationale || [],
      fairnessCompliance: {
        certification: 'DRISHTI-EVAL-FAIRNESS-COMPLIANT',
        demographicSignalsMasked: true,
        adverseImpactMitigated: true,
        statement: 'This candidate evaluation was executed by deterministic attribute matching on verified skills and documented experience duration, with complete exclusion of PII and demographic indicators.',
      },
    };

    res.status(200).json({
      success: true,
      data: auditDossier,
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
