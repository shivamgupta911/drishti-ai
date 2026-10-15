import Resume from '../models/Resume.js';
import Job from '../models/Job.js';

export async function seedInitialData() {
  // Always clear and seed fresh rich dataset for Day 3 verification
  await Resume.deleteMany({});
  await Job.deleteMany({});

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
  });

  return {
    message: 'Sample candidates and job postings seeded successfully.',
    resumes: [candidate1._id, candidate2._id, candidate3._id],
    jobs: [job1._id, job2._id],
  };
}
