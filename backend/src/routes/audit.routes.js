import { Router } from 'express';
import mongoose from 'mongoose';
import EvaluationAudit from '../models/EvaluationAudit.js';
import {
  authenticate,
  requireRole,
  requirePrivateWorkspace,
  getTenantFilter,
} from '../middleware/auth.middleware.js';

const router = Router();

/**
 * GET /api/audit-history
 * List versioned evaluation audit records scoped strictly to active tenant
 */
router.get('/', async (req, res, next) => {
  try {
    const { jobId, resumeId, page = 1, limit = 20 } = req.query;
    const filter = { ...getTenantFilter(req) };
    if (jobId && mongoose.Types.ObjectId.isValid(jobId)) filter.jobId = jobId;
    if (resumeId && mongoose.Types.ObjectId.isValid(resumeId)) filter.resumeId = resumeId;

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
 * Fetch single immutable evaluation audit record scoped strictly to active tenant
 */
router.get('/:evaluationId', async (req, res, next) => {
  try {
    const record = await EvaluationAudit.findOne({
      evaluationId: req.params.evaluationId,
      ...getTenantFilter(req),
    })
      .populate('resumeId')
      .populate('jobId');

    if (!record) {
      return res.status(404).json({ error: 'Audit evaluation record not found in your workspace.' });
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
 * Record an authorized recruiter override with audit trail in private workspace.
 * Public demo users are forbidden from recording overrides.
 */
router.post('/:evaluationId/override', authenticate, requirePrivateWorkspace, requireRole('recruiter', 'admin'), async (req, res, next) => {
  try {
    const { newDecision, reason } = req.body;

    if (!newDecision || !reason) {
      return res.status(400).json({ error: 'Both newDecision and reason are required to log an override.' });
    }

    const record = await EvaluationAudit.findOne({
      evaluationId: req.params.evaluationId,
      ...getTenantFilter(req),
    });

    if (!record) {
      return res.status(404).json({ error: 'Audit evaluation record not found in your workspace.' });
    }

    const overriddenBy = req.user?.name
      ? `${req.user.name} (${req.user.role})`
      : (req.user?.email || 'Authorized Evaluator');

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
      message: 'Recruiter override successfully recorded in audit ledger.',
      data: record,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
