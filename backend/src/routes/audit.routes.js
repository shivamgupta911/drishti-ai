import { Router } from 'express';
import EvaluationAudit from '../models/EvaluationAudit.js';

const router = Router();

/**
 * GET /api/audit-history
 * List versioned evaluation audit records with pagination and filters
 */
router.get('/', async (req, res, next) => {
  try {
    const { jobId, resumeId, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (jobId) filter.jobId = jobId;
    if (resumeId) filter.resumeId = resumeId;

    const skip = (Number(page) - 1) * Number(limit);
    const [total, records] = await Promise.all([
      EvaluationAudit.countDocuments(filter),
      EvaluationAudit.find(filter)
        .populate('resumeId', 'candidateName')
        .populate('jobId', 'title department')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
    ]);

    res.status(200).json({
      success: true,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      totalRecords: total,
      data: records,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/audit-history/:evaluationId
 * Fetch single immutable evaluation audit record
 */
router.get('/:evaluationId', async (req, res, next) => {
  try {
    const record = await EvaluationAudit.findOne({ evaluationId: req.params.evaluationId })
      .populate('resumeId')
      .populate('jobId');

    if (!record) {
      return res.status(404).json({ error: 'Audit evaluation record not found.' });
    }

    res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/audit-history/:evaluationId/override
 * Record an authorized recruiter override with audit trail and justification
 */
router.post('/:evaluationId/override', async (req, res, next) => {
  try {
    const { newDecision, reason, overriddenBy = 'Sarah Connor (Senior Talent Partner)' } = req.body;

    if (!newDecision || !reason) {
      return res.status(400).json({ error: 'Both newDecision and reason are required to log an override.' });
    }

    const record = await EvaluationAudit.findOne({ evaluationId: req.params.evaluationId });
    if (!record) {
      return res.status(404).json({ error: 'Audit evaluation record not found.' });
    }

    record.recruiterOverride = {
      isOverridden: true,
      originalScore: record.overallScore,
      newDecision,
      reason,
      overriddenBy,
      overriddenAt: new Date(),
    };

    await record.save();

    res.status(200).json({
      success: true,
      message: 'Recruiter override successfully logged in audit ledger.',
      data: record,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/audit-history/compare-versions
 * Side-by-side comparison between two historical evaluation audit records
 */
router.get('/compare-versions', async (req, res, next) => {
  try {
    const { evalIdA, evalIdB } = req.query;

    if (!evalIdA || !evalIdB) {
      return res.status(400).json({ error: 'Please provide both evalIdA and evalIdB parameters.' });
    }

    const [evalA, evalB] = await Promise.all([
      EvaluationAudit.findOne({ evaluationId: evalIdA }).populate('resumeId').populate('jobId'),
      EvaluationAudit.findOne({ evaluationId: evalIdB }).populate('resumeId').populate('jobId'),
    ]);

    if (!evalA || !evalB) {
      return res.status(404).json({ error: 'One or both evaluation audit versions could not be located.' });
    }

    res.status(200).json({
      success: true,
      comparison: {
        versionA: {
          id: evalA.evaluationId,
          algorithmVersion: evalA.algorithmVersion,
          score: evalA.overallScore,
          tier: evalA.tier,
          componentScores: evalA.componentScores,
          createdAt: evalA.createdAt,
        },
        versionB: {
          id: evalB.evaluationId,
          algorithmVersion: evalB.algorithmVersion,
          score: evalB.overallScore,
          tier: evalB.tier,
          componentScores: evalB.componentScores,
          createdAt: evalB.createdAt,
        },
        scoreDelta: evalB.overallScore - evalA.overallScore,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
