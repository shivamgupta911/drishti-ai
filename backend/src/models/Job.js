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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Job', jobSchema);
