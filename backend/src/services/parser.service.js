/**
 * Drishti AI - Explainable Resume & Document Parser
 * Extracts structured skills, experience indicators, and education attributes from raw text.
 */

// Comprehensive skills taxonomy across core software, cloud, and engineering domains
export const SKILLS_TAXONOMY = {
  Languages: [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Golang', 
    'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'SQL', 'HTML', 'CSS', 'Bash'
  ],
  Frameworks: [
    'React', 'Node.js', 'Express', 'Next.js', 'Vue', 'Angular', 'Django', 
    'Flask', 'FastAPI', 'Spring Boot', 'Tailwind', 'Bootstrap', 'GraphQL'
  ],
  Databases: [
    'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'SQLite', 'DynamoDB', 
    'Cassandra', 'Elasticsearch', 'Firebase'
  ],
  Cloud_DevOps: [
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'CI/CD', 'Git', 'GitHub', 
    'Linux', 'Terraform', 'Nginx', 'Microservices'
  ],
  AI_Data: [
    'Machine Learning', 'Deep Learning', 'PyTorch', 'TensorFlow', 'NLP', 
    'Pandas', 'NumPy', 'Scikit-Learn', 'Data Analysis'
  ]
};

// Flattened list with regex matchers
const ALL_SKILLS = [];
for (const [category, skills] of Object.entries(SKILLS_TAXONOMY)) {
  for (const skill of skills) {
    ALL_SKILLS.push({
      name: skill,
      category: category.replace('_', ' / '),
      // Regex with word boundaries
      regex: new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
    });
  }
}

/**
 * Extracts skills from raw text based on the taxonomy
 */
export function extractSkills(text) {
  if (!text) return [];
  const foundSkills = [];
  const seen = new Set();

  for (const item of ALL_SKILLS) {
    if (item.regex.test(text) && !seen.has(item.name.toLowerCase())) {
      seen.add(item.name.toLowerCase());
      foundSkills.push({
        name: item.name,
        category: item.category,
      });
    }
  }

  return foundSkills;
}

/**
 * Estimates years of experience from textual cues or date ranges
 */
export function extractExperienceYears(text) {
  if (!text) return 0;

  // Look for patterns like "5 years of experience", "3+ years", "4 yrs"
  const directMatch = text.match(/(\d+)\+?\s*(?:years?|yrs?)(?:\s+of)?\s+experience/i);
  if (directMatch) {
    const years = parseInt(directMatch[1], 10);
    if (!isNaN(years) && years <= 40) return years;
  }

  // Look for date ranges like 2018 - 2023 or 2019 - Present
  const dateRanges = text.matchAll(/(20\d\d)\s*[-–—to]+\s*(20\d\d|present|current)/gi);
  let totalCalculatedYears = 0;
  const currentYear = new Date().getFullYear();

  for (const match of dateRanges) {
    const startYear = parseInt(match[1], 10);
    const endYear = match[2].toLowerCase().includes('present') || match[2].toLowerCase().includes('current')
      ? currentYear
      : parseInt(match[2], 10);

    if (!isNaN(startYear) && !isNaN(endYear) && endYear >= startYear) {
      totalCalculatedYears += (endYear - startYear);
    }
  }

  return Math.min(Math.max(totalCalculatedYears, 0), 40);
}

/**
 * Extracts education qualifications from raw text
 */
export function extractEducation(text) {
  if (!text) return [];
  const degrees = [];
  const patterns = [
    { degree: 'Ph.D.', regex: /\b(Ph\.?D|Doctor of Philosophy)\b/i },
    { degree: 'Master of Science (M.S.)', regex: /\b(M\.?S\.?|Master of Science|Master's)\b/i },
    { degree: 'Master of Technology (M.Tech)', regex: /\b(M\.?Tech|Master of Technology)\b/i },
    { degree: 'Bachelor of Technology (B.Tech)', regex: /\b(B\.?Tech|Bachelor of Technology)\b/i },
    { degree: 'Bachelor of Science (B.S.)', regex: /\b(B\.?S\.?|Bachelor of Science|Bachelor's)\b/i },
    { degree: 'Bachelor of Computer Applications (BCA)', regex: /\b(BCA|Bachelor of Computer Applications)\b/i },
  ];

  for (const p of patterns) {
    if (p.regex.test(text)) {
      degrees.push({
        degree: p.degree,
        institution: 'Recognized University / Institution',
      });
    }
  }

  return degrees;
}

/**
 * Full parsing pipeline for a resume text
 */
export function parseResumeText(rawText, options = { anonymize: true }) {
  const skills = extractSkills(rawText);
  const experienceYears = extractExperienceYears(rawText);
  const education = extractEducation(rawText);

  // Email regex
  const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const rawEmail = emailMatch ? emailMatch[0] : '';

  // Phone regex
  const phoneMatch = rawText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const rawPhone = phoneMatch ? phoneMatch[0] : '';

  // Candidate name heuristic: First non-empty line or fallback
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const rawName = lines.length > 0 && lines[0].length < 40 ? lines[0] : 'Candidate Profile';

  // Apply bias-mitigation anonymization
  const candidateName = options.anonymize ? 'Candidate (Anonymized for Bias Mitigation)' : rawName;
  const email = options.anonymize && rawEmail ? `candidate_${Math.random().toString(36).substring(7)}@masked.drishti.ai` : rawEmail;
  const phone = options.anonymize && rawPhone ? '***-***-****' : rawPhone;

  return {
    candidateName,
    email,
    phone,
    totalExperienceYears: experienceYears,
    skills,
    education,
    summary: rawText.substring(0, 300).trim() + (rawText.length > 300 ? '...' : ''),
    rawText,
    anonymized: options.anonymize,
  };
}
