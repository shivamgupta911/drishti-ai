import mongoose from 'mongoose';

/**
 * Drishti AI - Recruitment Outcome Schema
 * Tracks applicant progression through hiring pipeline stages (shortlisted, interviewed, rejected, hired, withdrawn)
 * with structured feedback and auditor attribution.
 */
const recruitmentOutcomeSchema = new mongoose.Schema(
  {
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
    matchResultId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatchResult',
      index: true,
    },
    stage: {
      type: String,
      enum: ['pending', 'shortlisted', 'interviewed', 'rejected', 'hired', 'withdrawn'],
      default: 'pending',
      required: true,
    },
    predictedScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    predictedTier: {
      type: String,
    },
    recruiterFeedback: {
      technicalCompetencyRating: { type: Number, min: 1, max: 5 },
      culturalAlignmentRating: { type: Number, min: 1, max: 5 },
      notes: { type: String, default: '' },
      dispositionReason: { type: String, default: '' },
    },
    recordedBy: {
      userId: { type: String, default: 'system' },
      userName: { type: String, default: 'Recruiter' },
      userRole: { type: String, default: 'recruiter' },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for quick lookup
recruitmentOutcomeSchema.index({ jobId: 1, stage: 1 });
recruitmentOutcomeSchema.index({ resumeId: 1, jobId: 1 }, { unique: true });

export default mongoose.model('RecruitmentOutcome', recruitmentOutcomeSchema);
