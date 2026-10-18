import mongoose from 'mongoose';

/**
 * Drishti AI - Evaluation Audit & Version History Schema
 * Preserves an immutable, reproducible evaluation record with scoring version,
 * algorithm metadata, component breakdown, evidence traces, and recruiter overrides.
 */
const evaluationAuditSchema = new mongoose.Schema(
  {
    evaluationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    matchResultId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatchResult',
      index: true,
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    algorithmVersion: {
      type: String,
      default: 'drishti-engine-v2.1-hybrid',
      required: true,
    },
    modelVersion: {
      type: String,
      default: 'tfidf-sublinear-cosine-v2',
      required: true,
    },
    configVersion: {
      type: String,
      default: 'cfg-2026-v2',
    },
    weightsApplied: {
      mandatorySkills: { type: Number, default: 0.60 },
      experience: { type: Number, default: 0.20 },
      semanticVector: { type: Number, default: 0.15 },
      preferredBonus: { type: Number, default: 0.10 },
    },
    componentScores: {
      skillsMatchScore: { type: Number, required: true },
      experienceMatchScore: { type: Number, required: true },
      semanticVectorScore: { type: Number, required: true },
      preferredSkillsBonus: { type: Number, default: 0 },
    },
    overallScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    tier: {
      type: String,
      required: true,
    },
    exactMatches: [{ type: String }],
    synonymMatches: [
      {
        candidateTerm: String,
        targetTerm: String,
        attribution: String,
      },
    ],
    affinityMatches: [
      {
        candidateTerm: String,
        targetTerm: String,
        affinityScore: Number,
        domain: String,
        attribution: String,
      },
    ],
    missingRequiredSkills: [{ type: String }],
    evidenceTraces: [
      {
        requirement: String,
        category: {
          type: String,
          enum: ['exact_match', 'synonym_match', 'affinity_match', 'unverified', 'missing'],
        },
        matchedTerm: String,
        excerpt: String,
        sourceSection: String,
        evidenceQuality: {
          type: String,
          enum: ['high', 'moderate', 'inferred', 'none'],
        },
        rationale: String,
      },
    ],
    recruiterOverride: {
      isOverridden: { type: Boolean, default: false },
      originalScore: Number,
      newDecision: {
        type: String,
        enum: ['qualify', 'disqualify', 're-evaluate', 'manual_pass'],
      },
      reason: String,
      overriddenBy: String,
      overriddenAt: Date,
    },
    immutableTimestamp: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    timestamps: true,
  }
);

evaluationAuditSchema.index({ jobId: 1, overallScore: -1 });
evaluationAuditSchema.index({ resumeId: 1, createdAt: -1 });

export default mongoose.model('EvaluationAudit', evaluationAuditSchema);
