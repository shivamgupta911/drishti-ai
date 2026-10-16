/**
 * Drishti AI - Advanced Semantic Vector Similarity Engine
 * Computes deterministic TF-IDF embeddings and cosine similarity between resumes and job postings.
 */

// Common English & recruitment stopwords to filter out noise
const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as',
  'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'could',
  'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had',
  'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself',
  'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours',
  'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that',
  'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those',
  'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when',
  'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself',
  'yourselves', 'role', 'job', 'position', 'candidate', 'seeking', 'looking', 'work', 'working',
]);

/**
 * Tokenizes text preserving tech terms like C++, C#, .NET, CI/CD, Node.js
 */
export function tokenizeText(text) {
  if (!text || typeof text !== 'string') return [];

  // Preserve tech acronyms and symbols before lowercase split
  const cleaned = text
    .replace(/c\+\+/gi, 'cpp')
    .replace(/c#/gi, 'csharp')
    .replace(/\.net/gi, 'dotnet')
    .replace(/ci\/cd/gi, 'cicd')
    .replace(/node\.js/gi, 'nodejs')
    .replace(/vue\.js/gi, 'vuejs')
    .replace(/react\.js/gi, 'react');

  const rawTokens = cleaned
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/);

  return rawTokens.filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

/**
 * Calculates Term Frequency (TF) for a token array
 */
export function computeTermFrequency(tokens) {
  const tf = {};
  const total = tokens.length;
  if (total === 0) return tf;

  for (const token of tokens) {
    tf[token] = (tf[token] || 0) + 1;
  }

  // Sublinear TF scaling: 1 + log(count)
  for (const token in tf) {
    tf[token] = 1 + Math.log(tf[token]);
  }

  return tf;
}

/**
 * Computes cosine similarity between two sparse vector objects
 * cosine(A, B) = (A . B) / (||A|| * ||B||)
 */
export function computeCosineSimilarity(vectorA, vectorB) {
  let dotProduct = 0;
  let normASq = 0;
  let normBSq = 0;

  for (const term in vectorA) {
    const valA = vectorA[term];
    normASq += valA * valA;
    if (vectorB[term]) {
      dotProduct += valA * vectorB[term];
    }
  }

  for (const term in vectorB) {
    const valB = vectorB[term];
    normBSq += valB * valB;
  }

  const normA = Math.sqrt(normASq);
  const normB = Math.sqrt(normBSq);

  if (normA === 0 || normB === 0) return 0;

  const similarity = dotProduct / (normA * normB);
  return Math.min(Math.max(similarity, 0), 1.0);
}

/**
 * Extracts and composes unified text representation of a resume
 */
export function buildResumeCorpus(resume) {
  const parts = [];

  if (resume.summary) parts.push(resume.summary);
  if (resume.rawText) parts.push(resume.rawText);

  if (Array.isArray(resume.skills)) {
    const skillNames = resume.skills.map((s) => (typeof s === 'string' ? s : s.name));
    parts.push(skillNames.join(' '));
  }

  if (Array.isArray(resume.experience)) {
    for (const exp of resume.experience) {
      if (exp.title) parts.push(exp.title);
      if (exp.description) parts.push(exp.description);
      if (Array.isArray(exp.technologies)) parts.push(exp.technologies.join(' '));
    }
  }

  return parts.join(' ');
}

/**
 * Extracts and composes unified text representation of a job description
 */
export function buildJobCorpus(job) {
  const parts = [];

  if (job.title) parts.push(job.title);
  if (job.description) parts.push(job.description);

  if (Array.isArray(job.requiredSkills)) {
    const reqNames = job.requiredSkills.map((s) => (typeof s === 'string' ? s : s.name));
    parts.push(reqNames.join(' '));
  }

  if (Array.isArray(job.preferredSkills)) {
    const prefNames = job.preferredSkills.map((s) => (typeof s === 'string' ? s : s.name));
    parts.push(prefNames.join(' '));
  }

  if (Array.isArray(job.responsibilities)) {
    parts.push(job.responsibilities.join(' '));
  }

  return parts.join(' ');
}

/**
 * Computes semantic vector match between a candidate resume and job posting
 */
export function computeSemanticVectorMatch(resume, job) {
  const resumeText = buildResumeCorpus(resume);
  const jobText = buildJobCorpus(job);

  const resumeTokens = tokenizeText(resumeText);
  const jobTokens = tokenizeText(jobText);

  const resumeTf = computeTermFrequency(resumeTokens);
  const jobTf = computeTermFrequency(jobTokens);

  const cosineScore = computeCosineSimilarity(resumeTf, jobTf);
  const vectorSimilarityScore = Math.round(cosineScore * 100);

  // Identify top shared terms that contributed positively to the dot product
  const sharedContributions = [];
  for (const term in resumeTf) {
    if (jobTf[term]) {
      const contribution = resumeTf[term] * jobTf[term];
      sharedContributions.push({ term, contribution });
    }
  }

  sharedContributions.sort((a, b) => b.contribution - a.contribution);
  const topSharedTerms = sharedContributions.slice(0, 8).map((sc) => sc.term);

  return {
    rawCosine: Math.round(cosineScore * 1000) / 1000,
    vectorSimilarityScore,
    topSharedTerms,
    tokensEvaluated: {
      resumeTokensCount: resumeTokens.length,
      jobTokensCount: jobTokens.length,
    },
  };
}
