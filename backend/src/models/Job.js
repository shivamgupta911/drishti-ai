import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
    },
    company: {
      type: String,
      default: 'Drishti AI Partner',
      trim: true,
    },
    department: {
      type: String,
      default: 'Engineering',
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
    },
    minExperienceYears: {
      type: Number,
      default: 0,
      min: 0,
    },
    requiredSkills: [
      {
        name: { type: String, required: true, trim: true },
        weight: { type: Number, default: 1.0, min: 0.1, max: 2.0 },
        category: { type: String, default: 'Core' },
      },
    ],
    preferredSkills: [
      {
        name: { type: String, required: true, trim: true },
        weight: { type: Number, default: 0.5, min: 0.1, max: 1.0 },
        category: { type: String, default: 'Bonus' },
      },
    ],
    educationRequirement: {
      type: String,
      default: 'Bachelor degree in Computer Science or equivalent practical experience',
    },
    responsibilities: [{ type: String }],
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

jobSchema.index({ ownerId: 1, createdAt: -1 });
jobSchema.index({ isDemo: 1, quarantined: 1 });

export default mongoose.model('Job', jobSchema);
