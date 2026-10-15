/**
 * Drishti AI - Skill Taxonomy & Semantic Synonym Engine
 * Resolves canonical skills, technical synonyms, and domain affinities.
 */

// 1. Canonical skill definitions and known synonyms
export const SYNONYM_MAP = {
  'javascript': ['javascript', 'js', 'es6', 'es2020', 'ecmascript'],
  'typescript': ['typescript', 'ts'],
  'react': ['react', 'react.js', 'reactjs', 'react framework', 'react native'],
  'node.js': ['node', 'nodejs', 'node.js', 'node js'],
  'express': ['express', 'express.js', 'expressjs', 'express framework'],
  'mongodb': ['mongo', 'mongodb', 'documentdb', 'mongoose'],
  'postgresql': ['postgres', 'postgresql', 'psql'],
  'mysql': ['mysql', 'mariadb'],
  'kubernetes': ['kubernetes', 'k8s', 'kube'],
  'docker': ['docker', 'containerization', 'containers'],
  'aws': ['aws', 'amazon web services', 'ec2', 's3', 'lambda', 'aws cloud'],
  'azure': ['azure', 'microsoft azure'],
  'gcp': ['gcp', 'google cloud', 'google cloud platform'],
  'ci/cd': ['ci/cd', 'cicd', 'continuous integration', 'github actions', 'jenkins', 'gitlab ci'],
  'rest apis': ['rest', 'restful', 'rest apis', 'rest api', 'api design', 'rest services'],
  'graphql': ['graphql', 'apollo', 'gql'],
  'tailwind': ['tailwind', 'tailwindcss', 'tailwind css'],
  'python': ['python', 'python3', 'py'],
  'java': ['java', 'core java', 'j2ee'],
  'c++': ['c++', 'cpp'],
  'c#': ['c#', 'csharp', '.net', 'dotnet'],
  'redis': ['redis', 'redis cache', 'in-memory cache'],
  'terraform': ['terraform', 'iac', 'infrastructure as code'],
  'linux': ['linux', 'unix', 'ubuntu', 'centos', 'debian'],
};

// 2. Domain Affinities: Related technologies in the same domain that grant partial semantic credit
export const DOMAIN_AFFINITIES = [
  {
    domain: 'Relational Databases',
    skills: ['postgresql', 'mysql', 'sql', 'sqlite', 'oracle'],
    affinityScore: 0.75,
    explanation: 'Demonstrates core relational database modeling and SQL query capabilities.',
  },
  {
    domain: 'NoSQL Databases',
    skills: ['mongodb', 'cassandra', 'dynamodb', 'redis', 'couchdb'],
    affinityScore: 0.70,
    explanation: 'Demonstrates distributed document/key-value storage paradigm proficiency.',
  },
  {
    domain: 'Major Cloud Providers',
    skills: ['aws', 'gcp', 'azure'],
    affinityScore: 0.80,
    explanation: 'Transferable core public cloud architecture and compute/storage management skills.',
  },
  {
    domain: 'Frontend Component Frameworks',
    skills: ['react', 'vue', 'angular', 'svelte'],
    affinityScore: 0.70,
    explanation: 'Transferable reactive state management and component architecture expertise.',
  },
  {
    domain: 'Container Ecosystem',
    skills: ['docker', 'kubernetes'],
    affinityScore: 0.65,
    explanation: 'Shared container runtime and image packaging foundation.',
  },
  {
    domain: 'Backend Web Frameworks',
    skills: ['express', 'fastapi', 'flask', 'django', 'spring boot', 'nest.js'],
    affinityScore: 0.65,
    explanation: 'Fundamental REST routing, middleware, and request lifecycle competency.',
  },
];

// Helper to normalize strings for comparison
function normalize(str) {
  return (str || '')
    .trim()
    .toLowerCase()
    .replace(/[._\-/\s]+/g, '');
}

/**
 * Checks whether candidate skill is an exact match or known synonym for target skill
 */
export function getSynonymMatch(candidateTerm, targetTerm) {
  const normCandidate = normalize(candidateTerm);
  const normTarget = normalize(targetTerm);

  // Exact match after normalization
  if (normCandidate === normTarget) {
    return {
      isMatch: true,
      matchType: 'exact',
      score: 1.0,
      candidateTerm,
      targetTerm,
    };
  }

  // Check synonym mappings
  for (const [canonical, synonyms] of Object.entries(SYNONYM_MAP)) {
    const normCanonical = normalize(canonical);
    const normSynonyms = synonyms.map(normalize);

    const targetMatches = normCanonical === normTarget || normSynonyms.includes(normTarget);
    const candidateMatches = normCanonical === normCandidate || normSynonyms.includes(normCandidate);

    if (targetMatches && candidateMatches) {
      return {
        isMatch: true,
        matchType: 'synonym',
        score: 1.0,
        candidateTerm,
        targetTerm,
        canonical,
      };
    }
  }

  return { isMatch: false };
}

/**
 * Checks whether candidate skill shares a semantic domain affinity with target skill
 */
export function getDomainAffinity(candidateTerm, targetTerm) {
  const normCandidate = normalize(candidateTerm);
  const normTarget = normalize(targetTerm);

  for (const group of DOMAIN_AFFINITIES) {
    const normalizedGroupSkills = group.skills.map(normalize);

    const hasCandidate = normalizedGroupSkills.includes(normCandidate);
    const hasTarget = normalizedGroupSkills.includes(normTarget);

    if (hasCandidate && hasTarget && normCandidate !== normTarget) {
      return {
        hasAffinity: true,
        domain: group.domain,
        affinityScore: group.affinityScore,
        explanation: group.explanation,
        candidateTerm,
        targetTerm,
      };
    }
  }

  return { hasAffinity: false };
}

/**
 * Comprehensive resolution of candidate skill against a required job skill
 */
export function evaluateSkillAgainstRequirement(candidateSkills, requiredSkillName) {
  const target = requiredSkillName;

  // 1. Check exact matches first
  for (const cand of candidateSkills) {
    const candName = typeof cand === 'string' ? cand : cand.name;
    const synonymCheck = getSynonymMatch(candName, target);
    if (synonymCheck.isMatch) {
      return {
        matched: true,
        matchType: synonymCheck.matchType,
        score: 1.0,
        matchedWith: candName,
        targetSkill: target,
        attribution: synonymCheck.matchType === 'synonym'
          ? `Candidate skill '${candName}' resolved as canonical synonym for required '${target}'.`
          : `Direct exact match for required '${target}'.`,
      };
    }
  }

  // 2. Check domain affinities for partial credit
  let bestAffinity = null;
  for (const cand of candidateSkills) {
    const candName = typeof cand === 'string' ? cand : cand.name;
    const affinityCheck = getDomainAffinity(candName, target);
    if (affinityCheck.hasAffinity) {
      if (!bestAffinity || affinityCheck.affinityScore > bestAffinity.score) {
        bestAffinity = {
          matched: true,
          matchType: 'affinity',
          score: affinityCheck.affinityScore,
          matchedWith: candName,
          targetSkill: target,
          domain: affinityCheck.domain,
          attribution: `Candidate possesses '${candName}' (${affinityCheck.domain}), granting ${Math.round(affinityCheck.affinityScore * 100)}% partial affinity credit toward required '${target}'. ${affinityCheck.explanation}`,
        };
      }
    }
  }

  if (bestAffinity) {
    return bestAffinity;
  }

  return {
    matched: false,
    matchType: 'none',
    score: 0,
    targetSkill: target,
    attribution: `Missing mandatory qualification: '${target}'.`,
  };
}
