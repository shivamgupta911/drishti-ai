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

  // Sample Resume 1: Full-Stack Engineer (Candidate #001 - 4 yrs)
  const candidate1 = await Resume.create({
    candidateName: 'Candidate #001',
    email: 'candidate_001@masked.drishti.ai',
    phone: '***-***-****',
    summary: 'Full-stack software engineer with 4 years building scalable web services in Node.js, React, Express, and MongoDB.',
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

  // Sample Resume 2: Junior Frontend Developer (Candidate #002 - 2 yrs)
  const candidate2 = await Resume.create({
    candidateName: 'Candidate #002',
    email: 'candidate_002@masked.drishti.ai',
    phone: '***-***-****',
    summary: 'Frontend developer with 2 years of experience focusing on React, Tailwind CSS, TypeScript, and modern UI engineering.',
    totalExperienceYears: 2,
    skills: [
      { name: 'JavaScript', category: 'Languages' },
      { name: 'TypeScript', category: 'Languages' },
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

  // Sample Resume 3: Cloud & Platform DevOps Engineer (Candidate #003 - 6 yrs)
  const candidate3 = await Resume.create({
    candidateName: 'Candidate #003',
    email: 'candidate_003@masked.drishti.ai',
    phone: '***-***-****',
    summary: 'Senior Cloud & Site Reliability Engineer with 6 years architecting high-availability infrastructure in AWS, K8s, Terraform, Docker, and CI/CD pipelines.',
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

  // Sample Resume 4: Fresher / Software Intern (Candidate #004 - 0 yrs)
  const candidate4 = await Resume.create({
    candidateName: 'Candidate #004',
    email: 'candidate_004@masked.drishti.ai',
    phone: '***-***-****',
    summary: 'Recent Computer Science graduate with hands-on coursework and academic projects in Python, JavaScript, and SQL. Seeking entry-level engineering roles and internships.',
    totalExperienceYears: 0,
    skills: [
      { name: 'Python', category: 'Languages' },
      { name: 'JavaScript', category: 'Languages' },
      { name: 'HTML', category: 'Languages' },
      { name: 'CSS', category: 'Languages' },
      { name: 'SQL', category: 'Databases' },
      { name: 'Git', category: 'Cloud / DevOps' },
    ],
    experience: [],
    education: [
      {
        degree: 'Bachelor of Technology in Computer Science',
        institution: 'National Institute of Technology',
        graduationYear: 2026,
      },
    ],
    anonymized: true,
    ownerId: 'demo',
    isDemo: true,
    quarantined: false,
  });

  // Sample Resume 5: Principal Platform Architect (Candidate #005 - 9 yrs)
  const candidate5 = await Resume.create({
    candidateName: 'Candidate #005',
    email: 'candidate_005@masked.drishti.ai',
    phone: '***-***-****',
    summary: 'Principal Platform Architect with 9 years of enterprise experience designing distributed cloud systems, Kubernetes microservices, and high-throughput data pipelines.',
    totalExperienceYears: 9,
    skills: [
      { name: 'Kubernetes', category: 'Cloud / DevOps' },
      { name: 'AWS', category: 'Cloud / DevOps' },
      { name: 'Docker', category: 'Cloud / DevOps' },
      { name: 'Terraform', category: 'Cloud / DevOps' },
      { name: 'Microservices', category: 'Cloud / DevOps' },
      { name: 'Python', category: 'Languages' },
      { name: 'Go', category: 'Languages' },
      { name: 'Linux', category: 'Cloud / DevOps' },
      { name: 'CI/CD', category: 'Cloud / DevOps' },
      { name: 'PostgreSQL', category: 'Databases' },
    ],
    experience: [
      {
        title: 'Principal Architect',
        company: 'Global Cloud Systems',
        durationMonths: 60,
        description: 'Led architecture for core platform microservices handling 50k+ req/sec on Kubernetes and AWS.',
        technologies: ['Kubernetes', 'AWS', 'Go', 'Microservices'],
      },
      {
        title: 'Senior Systems Engineer',
        company: 'DataFlow Technologies',
        durationMonths: 48,
        description: 'Engineered automated multi-region infrastructure pipelines and real-time event streaming.',
        technologies: ['Python', 'Docker', 'PostgreSQL', 'Linux'],
      },
    ],
    education: [
      {
        degree: 'Master of Technology in Software Systems',
        institution: 'State University of Technology',
        graduationYear: 2017,
      },
    ],
    anonymized: true,
    ownerId: 'demo',
    isDemo: true,
    quarantined: false,
  });

  // Sample Job 1: Full-Stack Software Engineer (3 yrs min)
  const job1 = await Job.create({
    title: 'Full-Stack Software Engineer',
    company: 'NexTech Cloud Systems',
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

  // Sample Job 2: Senior Cloud & DevOps Specialist (5 yrs min)
  const job2 = await Job.create({
    title: 'Senior Cloud & DevOps Specialist',
    company: 'TerraScale Infrastructure',
    department: 'Cloud Operations',
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

  // Sample Job 3: Frontend React Developer (2 yrs min)
  const job3 = await Job.create({
    title: 'Frontend React Developer',
    company: 'Apex Digital Labs',
    department: 'Product Engineering',
    description: 'Growing creative product team looking for a Frontend Developer skilled in React, Tailwind CSS, TypeScript, and modern responsive web standards. 2+ years experience required.',
    minExperienceYears: 2,
    requiredSkills: [
      { name: 'React', weight: 1.0, category: 'Core' },
      { name: 'JavaScript', weight: 1.0, category: 'Core' },
      { name: 'HTML', weight: 1.0, category: 'Core' },
      { name: 'CSS', weight: 1.0, category: 'Core' },
      { name: 'Tailwind', weight: 1.0, category: 'Core' },
    ],
    preferredSkills: [
      { name: 'TypeScript', weight: 0.5, category: 'Bonus' },
      { name: 'Git', weight: 0.5, category: 'Bonus' },
    ],
    educationRequirement: 'B.S. / B.Tech or equivalent practical experience',
    responsibilities: [
      'Build engaging, accessible user interfaces with React and Tailwind CSS.',
      'Collaborate with design and product teams on responsive client features.',
    ],
    ownerId: 'demo',
    isDemo: true,
    quarantined: false,
  });

  // Sample Job 4: Junior Software Engineering Intern (0 yrs min - Genuine Entry-Level Internship)
  const job4 = await Job.create({
    title: 'Junior Software Engineering Intern',
    company: 'InnoWave Technologies',
    department: 'Talent Incubator',
    description: 'Entry-level software engineering internship for fresh graduates and students. Learn professional software development in Python, JavaScript, and SQL with hands-on mentorship. No prior experience required.',
    minExperienceYears: 0,
    requiredSkills: [
      { name: 'Python', weight: 1.0, category: 'Core' },
      { name: 'JavaScript', weight: 1.0, category: 'Core' },
      { name: 'Git', weight: 1.0, category: 'Core' },
      { name: 'SQL', weight: 1.0, category: 'Core' },
    ],
    preferredSkills: [
      { name: 'HTML', weight: 0.5, category: 'Bonus' },
      { name: 'CSS', weight: 0.5, category: 'Bonus' },
    ],
    educationRequirement: 'Enrolled in or recent graduate of B.S. / B.Tech Computer Science or related degree',
    responsibilities: [
      'Participate in code reviews, feature implementation, and automated test writing.',
      'Learn modern software engineering workflows in a supportive team environment.',
    ],
    ownerId: 'demo',
    isDemo: true,
    quarantined: false,
  });

  // Sample Job 5: Principal Platform Architect (8 yrs min)
  const job5 = await Job.create({
    title: 'Principal Platform Architect',
    company: 'CyberCore Dynamics',
    department: 'Enterprise Architecture',
    description: 'Enterprise platform leadership role responsible for distributed microservices, event streaming architectures, Kubernetes orchestration, and cloud reliability at scale. 8+ years required.',
    minExperienceYears: 8,
    requiredSkills: [
      { name: 'Kubernetes', weight: 1.0, category: 'Core' },
      { name: 'AWS', weight: 1.0, category: 'Core' },
      { name: 'Microservices', weight: 1.0, category: 'Core' },
      { name: 'Python', weight: 1.0, category: 'Core' },
      { name: 'Docker', weight: 1.0, category: 'Core' },
    ],
    preferredSkills: [
      { name: 'Go', weight: 0.5, category: 'Bonus' },
      { name: 'Terraform', weight: 0.5, category: 'Bonus' },
      { name: 'CI/CD', weight: 0.5, category: 'Bonus' },
      { name: 'PostgreSQL', weight: 0.5, category: 'Bonus' },
    ],
    educationRequirement: 'Master degree in Computer Science or equivalent senior enterprise experience',
    responsibilities: [
      'Define long-term architectural vision for cloud platforms and microservice infrastructure.',
      'Set engineering standards for high availability, security, and developer velocity.',
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
    { resume: candidate2, job: job3, stage: 'shortlisted', techRating: 4, cultRating: 5, notes: 'Strong React and modern CSS capabilities.' },
    { resume: candidate4, job: job4, stage: 'hired', techRating: 4, cultRating: 5, notes: 'High aptitude fresher, exceptional computer science fundamentals.' },
    { resume: candidate5, job: job5, stage: 'hired', techRating: 5, cultRating: 5, notes: 'Proven enterprise architectural leadership and microservices depth.' },
    { resume: candidate5, job: job2, stage: 'interviewed', techRating: 5, cultRating: 4, notes: 'Senior cloud expertise with extensive platform depth.' },
    { resume: candidate4, job: job1, stage: 'rejected', techRating: 2, cultRating: 4, dispositionReason: 'Role requires 3+ years production full-stack experience.' },
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
    resumes: [candidate1._id, candidate2._id, candidate3._id, candidate4._id, candidate5._id],
    jobs: [job1._id, job2._id, job3._id, job4._id, job5._id],
    users: [recruiter._id, manager._id, candidateUser._id, adminUser._id],
    matchesCount: seededMatches.length,
  };
}
