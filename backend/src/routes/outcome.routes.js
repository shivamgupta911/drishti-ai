import { Router } from 'express';
import RecruitmentOutcome from '../models/RecruitmentOutcome.js';
import Resume from '../models/Resume.js';
import Job from '../models/Job.js';

const router = Router();

/**
 * GET /api/outcomes
 * List all recorded recruitment outcomes with optional filters by jobId or stage
 */
router.get('/', async (req, res, next) => {
  try {
    const { jobId, stage } = req.query;
    const filter = {};
    if (jobId) filter.jobId = jobId;
    if (stage) filter.stage = stage;

    const outcomes = await RecruitmentOutcome.find(filter)
      .populate('resumeId', 'candidateName email totalExperienceYears')
      .populate('jobId', 'title department')
      .sort({ updatedAt: -1 });

    // Aggregate stage metrics
    const stageCounts = {
      pending: 0,
      shortlisted: 0,
      interviewed: 0,
      hired: 0,
      rejected: 0,
      withdrawn: 0,
    };

    outcomes.forEach((o) => {
      if (stageCounts[o.stage] !== undefined) {
        stageCounts[o.stage] += 1;
      }
    });

    res.status(200).json({
      success: true,
      count: outcomes.length,
      stageCounts,
      data: outcomes,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/outcomes
 * Record or update candidate recruitment pipeline outcome
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      resumeId,
      jobId,
      matchResultId,
      stage = 'pending',
      predictedScore,
      predictedTier,
      technicalCompetencyRating,
      culturalAlignmentRating,
      notes,
      dispositionReason,
      recordedBy,
    } = req.body;

    if (!resumeId || !jobId) {
      return res.status(400).json({ error: 'Both resumeId and jobId are required.' });
    }

    const outcome = await RecruitmentOutcome.findOneAndUpdate(
      { resumeId, jobId },
      {
        resumeId,
        jobId,
        matchResultId,
        stage,
        predictedScore,
        predictedTier,
        recruiterFeedback: {
          technicalCompetencyRating: technicalCompetencyRating ? Number(technicalCompetencyRating) : undefined,
          culturalAlignmentRating: culturalAlignmentRating ? Number(culturalAlignmentRating) : undefined,
          notes: notes || '',
          dispositionReason: dispositionReason || '',
        },
        recordedBy: recordedBy || {
          userId: 'usr_recruiter_01',
          userName: 'Sarah Connor',
          userRole: 'recruiter',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      message: `Applicant stage updated to '${stage}'.`,
      data: outcome,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/outcomes/analytics
 * Computes outcome funnel conversion rates and compares against score tier predictions
 */
router.get('/analytics', async (req, res, next) => {
  try {
    const outcomes = await RecruitmentOutcome.find().lean();

    const total = outcomes.length;
    const stages = ['pending', 'shortlisted', 'interviewed', 'hired', 'rejected', 'withdrawn'];

    const funnel = stages.map((s) => ({
      stage: s,
      label: s.charAt(0).toUpperCase() + s.slice(1),
      count: outcomes.filter((o) => o.stage === s).length,
      rate: total > 0 ? Math.round((outcomes.filter((o) => o.stage === s).length / total) * 100) : 0,
    }));

    // Tier to Hire Correlation
    // Compares candidates who received High (>=75) vs Moderate (50-74) vs Low (<50) match score
    const highFit = outcomes.filter((o) => (o.predictedScore || 0) >= 75);
    const modFit = outcomes.filter((o) => (o.predictedScore || 0) >= 50 && (o.predictedScore || 0) < 75);
    const lowFit = outcomes.filter((o) => (o.predictedScore || 0) < 50);

    const correlation = [
      {
        tier: 'High Fit (>=75)',
        totalCandidates: highFit.length,
        interviewedCount: highFit.filter((o) => ['interviewed', 'hired'].includes(o.stage)).length,
        hiredCount: highFit.filter((o) => o.stage === 'hired').length,
        interviewRate: highFit.length > 0 ? Math.round((highFit.filter((o) => ['interviewed', 'hired'].includes(o.stage)).length / highFit.length) * 100) : 0,
        hireRate: highFit.length > 0 ? Math.round((highFit.filter((o) => o.stage === 'hired').length / highFit.length) * 100) : 0,
      },
      {
        tier: 'Moderate Fit (50-74)',
        totalCandidates: modFit.length,
        interviewedCount: modFit.filter((o) => ['interviewed', 'hired'].includes(o.stage)).length,
        hiredCount: modFit.filter((o) => o.stage === 'hired').length,
        interviewRate: modFit.length > 0 ? Math.round((modFit.filter((o) => ['interviewed', 'hired'].includes(o.stage)).length / modFit.length) * 100) : 0,
        hireRate: modFit.length > 0 ? Math.round((modFit.filter((o) => o.stage === 'hired').length / modFit.length) * 100) : 0,
      },
      {
        tier: 'Low Fit (<50)',
        totalCandidates: lowFit.length,
        interviewedCount: lowFit.filter((o) => ['interviewed', 'hired'].includes(o.stage)).length,
        hiredCount: lowFit.filter((o) => o.stage === 'hired').length,
        interviewRate: lowFit.length > 0 ? Math.round((lowFit.filter((o) => ['interviewed', 'hired'].includes(o.stage)).length / lowFit.length) * 100) : 0,
        hireRate: lowFit.length > 0 ? Math.round((lowFit.filter((o) => o.stage === 'hired').length / lowFit.length) * 100) : 0,
      },
    ];

    res.status(200).json({
      success: true,
      totalOutcomes: total,
      funnel,
      correlation,
      disclaimer:
        'Recruitment outcomes reflect subjective hiring committee preferences and external factors. They do not constitute unbiased ground-truth performance or justify autonomous retraining.',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
