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
    breakdown: {
      skillsMatchScore: { type: Number, required: true },
      experienceMatchScore: { type: Number, required: true },
      preferredSkillsBonus: { type: Number, default: 0 },
    },
    matchingSkills: [{ type: String }],
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('MatchResult', matchResultSchema);
