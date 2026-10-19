import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema(
  {
    candidateName: {
      type: String,
      default: 'Anonymous Candidate',
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    summary: {
      type: String,
      default: '',
    },
    totalExperienceYears: {
      type: Number,
      default: 0,
      min: 0,
    },
    skills: [
      {
        name: { type: String, required: true, trim: true },
        category: { type: String, default: 'General' },
      },
    ],
    experience: [
      {
        title: { type: String, default: '' },
        company: { type: String, default: '' },
        durationMonths: { type: Number, default: 0 },
        description: { type: String, default: '' },
        technologies: [{ type: String }],
      },
    ],
    education: [
      {
        degree: { type: String, default: '' },
        institution: { type: String, default: '' },
        graduationYear: { type: Number },
      },
    ],
    rawText: {
      type: String,
      default: '',
    },
    anonymized: {
      type: Boolean,
      default: true,
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

resumeSchema.index({ ownerId: 1, createdAt: -1 });
resumeSchema.index({ isDemo: 1, quarantined: 1 });

export default mongoose.model('Resume', resumeSchema);
