import mongoose from 'mongoose';

const matchResultSchema = new mongoose.Schema(
  {
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    overallScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    tier: {
      type: String,
      default: 'Tier 3: Low Fit',
    },
    breakdown: {
      skillsMatchScore: { type: Number, required: true },
      experienceMatchScore: { type: Number, required: true },
      preferredSkillsBonus: { type: Number, default: 0 },
      semanticVectorScore: { type: Number, default: 0 },
    },
    vectorCosineScore: { type: Number, default: 0 },
    vectorKeyTerms: [{ type: String }],
    matchingSkills: [{ type: String }],
    exactMatches: [{ type: String }],
    synonymMatches: [
      {
        candidateTerm: { type: String },
        targetTerm: { type: String },
        attribution: { type: String },
      },
    ],
    affinityMatches: [
      {
        candidateTerm: { type: String },
        targetTerm: { type: String },
        affinityScore: { type: Number },
        domain: { type: String },
        attribution: { type: String },
      },
    ],
    missingRequiredSkills: [{ type: String }],
    matchedPreferredSkills: [{ type: String }],
    missingPreferredSkills: [{ type: String }],
    experienceComparison: {
      candidateYears: { type: Number, default: 0 },
      requiredYears: { type: Number, default: 0 },
      differenceYears: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ['exceeds', 'meets', 'under'],
        default: 'meets',
      },
    },
    explainability: {
      summary: { type: String, required: true },
      strengths: [{ type: String }],
      gaps: [{ type: String }],
      scoringRationale: [{ type: String }],
      fairnessAudit: {
        isAnonymizedEvaluation: { type: Boolean, default: true },
        demographicSignalsIgnored: { type: Boolean, default: true },
        evaluationBasis: {
          type: String,
          default: 'Strictly evaluated on demonstrable skills overlap and documented duration of experience.',
        },
      },
    },
    ownerId: {
      type: String,
      required: true,
      default: 'demo',
      index: true,
    },
    isDemo: {
      type: Boolean,
      default: false,
      index: true,
    },
    quarantined: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

matchResultSchema.index({ ownerId: 1, createdAt: -1 });
matchResultSchema.index({ ownerId: 1, jobId: 1 });
matchResultSchema.index({ isDemo: 1, quarantined: 1 });

export default mongoose.model('MatchResult', matchResultSchema);
