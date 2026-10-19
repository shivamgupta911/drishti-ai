import Resume from '../models/Resume.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import MatchResult from '../models/MatchResult.js';
import EvaluationAudit from '../models/EvaluationAudit.js';
import RecruitmentOutcome from '../models/RecruitmentOutcome.js';
import { generateSalt, hashPassword } from '../middleware/auth.middleware.js';
import { evaluateMatch } from '../services/matcher.service.js';
import { buildEvidenceDossier } from '../services/evidence.service.js';

export async function seedInitialData() {
  // Always clear and seed fresh rich dataset for Day 3 verification
  await Resume.deleteMany({});
  await Job.deleteMany({});
  await User.deleteMany({});
  await MatchResult.deleteMany({});
  await EvaluationAudit.deleteMany({});
  await RecruitmentOutcome.deleteMany({});

  // Seed RBAC Users
  const recSalt = generateSalt();
  const recruiter = await User.create({
    name: 'Sarah Connor (Senior Talent Partner)',
    email: 'recruiter@drishti.ai',
    salt: recSalt,
    passwordHash: hashPassword('Recruiter@123', recSalt),
    role: 'recruiter',
    organization: 'Nexus Talent Solutions',
  });

  const mgrSalt = generateSalt();
  const manager = await User.create({
    name: 'David Vance (VP of Platform Engineering)',
    email: 'manager@drishti.ai',
    salt: mgrSalt,
    passwordHash: hashPassword('Manager@123', mgrSalt),
    role: 'hiring_manager',
    organization: 'Drishti AI Ecosystem',
  });

  const candSalt = generateSalt();
  const candidateUser = await User.create({
    name: 'Alex Mercer (Candidate)',
    email: 'candidate@drishti.ai',
    salt: candSalt,
    passwordHash: hashPassword('Candidate@123', candSalt),
    role: 'candidate',
    organization: 'Open Talent Community',
  });

  const adminSalt = generateSalt();
  const designatedAdmin = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.toLowerCase().trim() : null;
  const adminRole = (!designatedAdmin || designatedAdmin === 'admin@drishti.ai') ? 'admin' : 'recruiter';
  const adminUser = await User.create({
    name: 'Elena Rostova (Compliance & Security Admin)',
    email: 'admin@drishti.ai',
    salt: adminSalt,
    passwordHash: hashPassword('Admin@123', adminSalt),
    role: adminRole,
    organization: 'Drishti AI Ecosystem',
  });

  // Sample Resume 1: Full-Stack Engineer (Alpha)
  const candidate1 = await Resume.create({
    candidateName: 'Candidate Alpha (Anonymized)',
    email: 'candidate_alpha@masked.drishti.ai',
    phone: '***-***-****',
    summary: 'Full-stack software engineer with 4 years building scalable web services in Node.js, React, and MongoDB.',
    totalExperienceYears: 4,
    skills: [
      { name: 'JavaScript', category: 'Languages' },
      { name: 'TypeScript', category: 'Languages' },
      { name: 'React', category: 'Frameworks' },
      { name: 'Node.js', category: 'Frameworks' },
      { name: 'Express', category: 'Frameworks' },
      { name: 'MongoDB', category: 'Databases' },
      { name: 'Git', category: 'Cloud / DevOps' },
      { name: 'Docker', category: 'Cloud / DevOps' },
      { name: 'REST APIs', category: 'Architecture' },
    ],
    experience: [
      {
        title: 'Full Stack Developer',
        company: 'CloudTech Solutions',
        durationMonths: 28,
        description: 'Engineered REST APIs with Express and microservices with MongoDB. Built responsive UIs in React.',
        technologies: ['React', 'Node.js', 'MongoDB', 'Docker'],
      },
      {
        title: 'Junior Web Developer',
        company: 'Innovate Digital',
        durationMonths: 20,
        description: 'Maintained internal frontends and backend endpoints using JavaScript and Express.',
        technologies: ['JavaScript', 'Express', 'Git'],
      },
    ],
    education: [
      {
        degree: 'Bachelor of Technology in Computer Science',
        institution: 'Tech University',
        graduationYear: 2022,
      },
    ],
    anonymized: true,
    ownerId: 'demo',
    isDemo: true,
    quarantined: false,
  });

  // Sample Resume 2: Junior Frontend Developer (Beta)
  const candidate2 = await Resume.create({
    candidateName: 'Candidate Beta (Anonymized)',
    email: 'candidate_beta@masked.drishti.ai',
    phone: '***-***-****',
    summary: 'Frontend developer with 2 years of experience focusing on React, Tailwind CSS, and modern UI design.',
    totalExperienceYears: 2,
    skills: [
      { name: 'JavaScript', category: 'Languages' },
      { name: 'HTML', category: 'Languages' },
      { name: 'CSS', category: 'Languages' },
      { name: 'React', category: 'Frameworks' },
      { name: 'Tailwind', category: 'Frameworks' },
      { name: 'Git', category: 'Cloud / DevOps' },
    ],
    experience: [
      {
        title: 'Frontend Associate',
        company: 'WebCraft Studio',
        durationMonths: 24,
        description: 'Developed modern web interfaces using React and Tailwind CSS.',
        technologies: ['React', 'Tailwind', 'JavaScript'],
      },
    ],
    education: [
      {
        degree: 'Bachelor of Science in Information Technology',
        institution: 'Metro College',
        graduationYear: 2024,
      },
    ],
    anonymized: true,
    ownerId: 'demo',
    isDemo: true,
    quarantined: false,
  });

  // Sample Resume 3: Cloud & Platform DevOps Engineer (Gamma)
  // Uses synonyms like "K8s", "Postgres", and domain affinities like "GCP"
  const candidate3 = await Resume.create({
    candidateName: 'Candidate Gamma (Anonymized)',
    email: 'candidate_gamma@masked.drishti.ai',
    phone: '***-***-****',
    summary: 'Senior Cloud & Site Reliability Engineer with 6 years architecting high-availability infrastructure in AWS, K8s, Terraform, and CI/CD pipelines.',
    totalExperienceYears: 6,
    skills: [
      { name: 'AWS', category: 'Cloud / DevOps' },
      { name: 'K8s', category: 'Cloud / DevOps' }, // Synonym for Kubernetes
      { name: 'Docker', category: 'Cloud / DevOps' },
      { name: 'Terraform', category: 'Cloud / DevOps' },
      { name: 'CI/CD', category: 'Cloud / DevOps' },
      { name: 'Python', category: 'Languages' },
      { name: 'Linux', category: 'Cloud / DevOps' },
      { name: 'Postgres', category: 'Databases' }, // Synonym for PostgreSQL
      { name: 'GCP', category: 'Cloud / DevOps' }, // Domain affinity to AWS
    ],
    experience: [
      {
        title: 'Senior Cloud DevOps Engineer',
        company: 'ScaleOps Infrastructure',
        durationMonths: 48,
        description: 'Automated multi-region cluster deployments using Terraform and K8s. Configured GitHub Actions CI/CD.',
        technologies: ['AWS', 'K8s', 'Terraform', 'CI/CD'],
      },
    ],
    education: [
      {
        degree: 'Master of Science in Distributed Systems',
        institution: 'Apex Institute of Technology',
        graduationYear: 2020,
      },
    ],
    anonymized: true,
    ownerId: 'demo',
    isDemo: true,
    quarantined: false,
  });

  // Sample Job 1: Full-Stack Software Engineer
  const job1 = await Job.create({
    title: 'Full-Stack Software Engineer',
    company: 'Drishti AI Ecosystem',
    department: 'Core Platform',
    description: 'We are seeking a Full-Stack Engineer with experience in React, Node.js, Express, and MongoDB. Must have solid experience with Docker and RESTful microservices.',
    minExperienceYears: 3,
    requiredSkills: [
      { name: 'React', weight: 1.0, category: 'Core' },
      { name: 'Node.js', weight: 1.0, category: 'Core' },
      { name: 'Express', weight: 1.0, category: 'Core' },
      { name: 'MongoDB', weight: 1.0, category: 'Core' },
      { name: 'JavaScript', weight: 1.0, category: 'Core' },
    ],
    preferredSkills: [
      { name: 'TypeScript', weight: 0.5, category: 'Bonus' },
      { name: 'Docker', weight: 0.5, category: 'Bonus' },
      { name: 'Kubernetes', weight: 0.5, category: 'Bonus' },
      { name: 'AWS', weight: 0.5, category: 'Bonus' },
    ],
    educationRequirement: 'B.Tech / B.S. in Computer Science or equivalent',
    responsibilities: [
      'Design, develop, and maintain explainable talent intelligence services.',
      'Build resilient RESTful APIs in Node.js and Express.',
      'Develop modern, responsive client components in React.',
    ],
    ownerId: 'demo',
    isDemo: true,
    quarantined: false,
  });

  // Sample Job 2: Senior Cloud & DevOps Specialist
  const job2 = await Job.create({
    title: 'Cloud DevOps Specialist',
    company: 'Drishti Infrastructure',
    department: 'Cloud Ops',
    description: 'Looking for a Senior DevOps engineer with deep experience in AWS, Kubernetes, Terraform, Docker, and CI/CD pipelines. 5+ years experience required.',
    minExperienceYears: 5,
    requiredSkills: [
      { name: 'AWS', weight: 1.0, category: 'Core' },
      { name: 'Kubernetes', weight: 1.0, category: 'Core' },
      { name: 'Docker', weight: 1.0, category: 'Core' },
      { name: 'CI/CD', weight: 1.0, category: 'Core' },
      { name: 'Terraform', weight: 1.0, category: 'Core' },
    ],
    preferredSkills: [
      { name: 'Python', weight: 0.5, category: 'Bonus' },
      { name: 'Linux', weight: 0.5, category: 'Bonus' },
    ],
    educationRequirement: 'B.Tech / B.S. in Computer Science or equivalent',
    responsibilities: [
      'Manage multi-region cloud clusters and automated zero-downtime deployments.',
      'Ensure high security, infrastructure-as-code consistency, and strict compliance.',
    ],
    ownerId: 'demo',
    isDemo: true,
    quarantined: false,
  });

  // Pre-calculate evaluation records, evidence traces, and recruitment outcomes
  const candidateJobPairs = [
    { resume: candidate1, job: job1, stage: 'interviewed', techRating: 4, cultRating: 5, notes: 'Strong full-stack acumen with Node.js & React.' },
    { resume: candidate2, job: job1, stage: 'pending', techRating: 3, cultRating: 4, notes: 'Good frontend base, lacks backend Node.js duration.' },
    { resume: candidate3, job: job1, stage: 'shortlisted', techRating: 4, cultRating: 4, notes: 'Deep infrastructure background with transferable backend skills.' },
    { resume: candidate3, job: job2, stage: 'hired', techRating: 5, cultRating: 5, notes: 'Exceptional SRE & Kubernetes cluster architecture.' },
    { resume: candidate1, job: job2, stage: 'rejected', techRating: 2, cultRating: 4, dispositionReason: 'Insufficient multi-region cloud & Terraform experience.' },
  ];

  const seededMatches = [];
  for (const pair of candidateJobPairs) {
    const evalData = evaluateMatch(pair.resume, pair.job);
    const evidenceTraces = buildEvidenceDossier(pair.resume, pair.job, evalData);
    evalData.evidenceTraces = evidenceTraces;

    const matchRecord = await MatchResult.create({
      resumeId: pair.resume._id,
      jobId: pair.job._id,
      ownerId: 'demo',
      isDemo: true,
      quarantined: false,
      ...evalData,
    });
    seededMatches.push(matchRecord);

    await EvaluationAudit.create({
      evaluationId: `EVAL-${matchRecord._id.toString().substring(18).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`,
      matchResultId: matchRecord._id,
      resumeId: pair.resume._id,
      jobId: pair.job._id,
      overallScore: evalData.overallScore,
      tier: evalData.tier,
      componentScores: evalData.breakdown,
      exactMatches: evalData.exactMatches,
      synonymMatches: evalData.synonymMatches,
      affinityMatches: evalData.affinityMatches,
      missingRequiredSkills: evalData.missingRequiredSkills,
      evidenceTraces,
      ownerId: 'demo',
      isDemo: true,
      quarantined: false,
    });

    await RecruitmentOutcome.create({
      resumeId: pair.resume._id,
      jobId: pair.job._id,
      matchResultId: matchRecord._id,
      stage: pair.stage,
      predictedScore: evalData.overallScore,
      predictedTier: evalData.tier,
      recruiterFeedback: {
        technicalCompetencyRating: pair.techRating,
        culturalAlignmentRating: pair.cultRating,
        notes: pair.notes || '',
        dispositionReason: pair.dispositionReason || '',
      },
      recordedBy: {
        userId: recruiter._id.toString(),
        userName: recruiter.name,
        userRole: recruiter.role,
      },
      ownerId: 'demo',
      isDemo: true,
      quarantined: false,
    });
  }

  return {
    message: 'Sample candidates, job postings, RBAC users, and evaluation audits seeded successfully.',
    resumes: [candidate1._id, candidate2._id, candidate3._id],
    jobs: [job1._id, job2._id],
    users: [recruiter._id, manager._id, candidateUser._id, adminUser._id],
    matchesCount: seededMatches.length,
  };
}
