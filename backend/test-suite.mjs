import assert from 'assert';
import { evaluateMatch, rankCandidatesForJob, compareTwoCandidates } from './src/services/matcher.service.js';
import { getSynonymMatch, getDomainAffinity, evaluateSkillAgainstRequirement } from './src/services/taxonomy.service.js';
import { parseResumeText, extractSkills, extractExperienceYears, parseDocumentBuffer } from './src/services/parser.service.js';
import { generateSalt, hashPassword, verifyPassword, generateToken, verifyToken } from './src/middleware/auth.middleware.js';
import { computeCosineSimilarity, computeSemanticVectorMatch, tokenizeText } from './src/services/embedding.service.js';
import { auditDisparateImpact } from './src/services/fairness.service.js';

console.log('====================================================');
console.log('DRISHTI AI - COMPREHENSIVE ENTERPRISE VERIFICATION SUITE');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
  }
}

// ---------------------------------------------------------
// 1. Keyword Matching & Taxonomy Tests
// ---------------------------------------------------------
runTest('Exact keyword matching recognizes identical terms', () => {
  const match = getSynonymMatch('React', 'React');
  assert.strictEqual(match.isMatch, true);
  assert.strictEqual(match.matchType, 'exact');
  assert.strictEqual(match.score, 1.0);
});

runTest('Parser extracts standard tech keywords from raw text', () => {
  const text = 'Senior engineer proficient in Python, Docker, React, and MongoDB with 5 years of experience.';
  const skills = extractSkills(text);
  const skillNames = skills.map(s => s.name);

  assert.ok(skillNames.includes('Python'));
  assert.ok(skillNames.includes('Docker'));
  assert.ok(skillNames.includes('React'));
  assert.ok(skillNames.includes('MongoDB'));
});

// ---------------------------------------------------------
// 2. Semantic Similarity & Synonym Resolution Tests
// ---------------------------------------------------------
runTest('Synonym engine maps "K8s" to "Kubernetes" with 100% credit', () => {
  const match = getSynonymMatch('K8s', 'Kubernetes');
  assert.strictEqual(match.isMatch, true);
  assert.strictEqual(match.matchType, 'synonym');
  assert.strictEqual(match.score, 1.0);
});

runTest('Synonym engine maps "Postgres" to "PostgreSQL" with 100% credit', () => {
  const match = getSynonymMatch('Postgres', 'PostgreSQL');
  assert.strictEqual(match.isMatch, true);
  assert.strictEqual(match.matchType, 'synonym');
  assert.strictEqual(match.score, 1.0);
});

runTest('Synonym engine maps "TS" to "TypeScript" and "JS" to "JavaScript"', () => {
  assert.strictEqual(getSynonymMatch('TS', 'TypeScript').isMatch, true);
  assert.strictEqual(getSynonymMatch('JS', 'JavaScript').isMatch, true);
});

runTest('Domain affinity grants partial credit for Docker -> Kubernetes (Container Ecosystem)', () => {
  const affinity = getDomainAffinity('Docker', 'Kubernetes');
  assert.strictEqual(affinity.hasAffinity, true);
  assert.strictEqual(affinity.affinityScore, 0.65);
  assert.strictEqual(affinity.domain, 'Container Ecosystem');
});

runTest('Domain affinity grants partial credit for MySQL -> PostgreSQL (Relational Databases)', () => {
  const affinity = getDomainAffinity('MySQL', 'PostgreSQL');
  assert.strictEqual(affinity.hasAffinity, true);
  assert.strictEqual(affinity.affinityScore, 0.75);
  assert.strictEqual(affinity.domain, 'Relational Databases');
});

runTest('Domain affinity grants partial credit for GCP -> AWS (Major Cloud Providers)', () => {
  const affinity = getDomainAffinity('GCP', 'AWS');
  assert.strictEqual(affinity.hasAffinity, true);
  assert.strictEqual(affinity.affinityScore, 0.80);
});

// ---------------------------------------------------------
// 3. Evidence-Backed Evaluation & Matching Engine Tests
// ---------------------------------------------------------
runTest('Complete matching flow evaluates candidate with exact + synonym matches', () => {
  const resume = {
    candidateName: 'Candidate Alpha (Anonymized)',
    totalExperienceYears: 5,
    skills: [
      { name: 'React' },
      { name: 'K8s' }, // synonym for Kubernetes
      { name: 'AWS' },
      { name: 'Docker' },
      { name: 'CI/CD' },
      { name: 'Terraform' },
    ],
    anonymized: true,
  };

  const job = {
    title: 'Cloud DevOps Specialist',
    minExperienceYears: 4,
    requiredSkills: [
      { name: 'AWS', weight: 1.0 },
      { name: 'Kubernetes', weight: 1.0 },
      { name: 'Docker', weight: 1.0 },
      { name: 'CI/CD', weight: 1.0 },
      { name: 'Terraform', weight: 1.0 },
    ],
    preferredSkills: [
      { name: 'Python', weight: 0.5 },
    ],
  };

  const evaluation = evaluateMatch(resume, job);

  // Overall Score should be >= 85
  assert.ok(evaluation.overallScore >= 85, `Expected >= 85, got ${evaluation.overallScore}`);
  assert.strictEqual(evaluation.tier, 'Tier 1: High Fit');

  // Exact matches
  assert.ok(evaluation.exactMatches.includes('AWS'));
  assert.ok(evaluation.exactMatches.includes('Docker'));
  assert.ok(evaluation.exactMatches.includes('CI/CD'));
  assert.ok(evaluation.exactMatches.includes('Terraform'));

  // Synonym matches
  const synMatch = evaluation.synonymMatches.find(sm => sm.targetTerm === 'Kubernetes');
  assert.ok(synMatch, 'Expected Kubernetes in synonymMatches');
  assert.strictEqual(synMatch.candidateTerm, 'K8s');

  // Seniority
  assert.strictEqual(evaluation.experienceComparison.status, 'exceeds');
  assert.strictEqual(evaluation.experienceComparison.differenceYears, 1);

  // Evidence-backed explainability
  assert.ok(evaluation.explainability.summary.includes('Strong Match'));
  assert.ok(evaluation.explainability.strengths.length >= 3);
  assert.ok(evaluation.explainability.scoringRationale.length >= 2);
  assert.strictEqual(evaluation.explainability.fairnessAudit.isAnonymizedEvaluation, true);
  assert.strictEqual(evaluation.explainability.fairnessAudit.demographicSignalsIgnored, true);
});

runTest('Gap analysis correctly detects missing mandatory skills and experience deficits', () => {
  const resume = {
    candidateName: 'Candidate Junior',
    totalExperienceYears: 1,
    skills: [{ name: 'React' }, { name: 'HTML' }],
    anonymized: true,
  };

  const job = {
    title: 'Senior Backend Engineer',
    minExperienceYears: 5,
    requiredSkills: [
      { name: 'Node.js', weight: 1.0 },
      { name: 'PostgreSQL', weight: 1.0 },
      { name: 'Docker', weight: 1.0 },
    ],
  };

  const evaluation = evaluateMatch(resume, job);

  assert.ok(evaluation.overallScore < 40, `Expected < 40, got ${evaluation.overallScore}`);
  assert.strictEqual(evaluation.tier, 'Tier 3: Low Fit');
  assert.strictEqual(evaluation.missingRequiredSkills.length, 3);
  assert.strictEqual(evaluation.experienceComparison.status, 'under');
  assert.strictEqual(evaluation.experienceComparison.differenceYears, -4);
  assert.ok(evaluation.explainability.gaps.length >= 2);
});

// ---------------------------------------------------------
// 4. Batch Cohort Ranking Tests
// ---------------------------------------------------------
runTest('Batch ranking orders candidates descending by score with cohort analytics', () => {
  const resumes = [
    { _id: '1', candidateName: 'Candidate Low', totalExperienceYears: 1, skills: [{ name: 'HTML' }] },
    { _id: '2', candidateName: 'Candidate High', totalExperienceYears: 5, skills: [{ name: 'React' }, { name: 'Node.js' }, { name: 'MongoDB' }, { name: 'Express' }] },
    { _id: '3', candidateName: 'Candidate Mid', totalExperienceYears: 3, skills: [{ name: 'React' }, { name: 'JavaScript' }] },
  ];

  const job = {
    _id: 'j1',
    title: 'Full-Stack Engineer',
    minExperienceYears: 3,
    requiredSkills: [
      { name: 'React', weight: 1.0 },
      { name: 'Node.js', weight: 1.0 },
      { name: 'MongoDB', weight: 1.0 },
      { name: 'Express', weight: 1.0 },
    ],
  };

  const ranking = rankCandidatesForJob(resumes, job);

  assert.strictEqual(ranking.cohortSize, 3);
  assert.strictEqual(ranking.leaderboard[0].candidateName, 'Candidate High');
  assert.strictEqual(ranking.leaderboard[0].rank, 1);
  assert.strictEqual(ranking.leaderboard[1].candidateName, 'Candidate Mid');
  assert.strictEqual(ranking.leaderboard[1].rank, 2);
  assert.strictEqual(ranking.leaderboard[2].candidateName, 'Candidate Low');
  assert.strictEqual(ranking.leaderboard[2].rank, 3);
  assert.ok(ranking.analytics.avgScore > 0);
});

// ---------------------------------------------------------
// 5. Pairwise Comparison Tests
// ---------------------------------------------------------
runTest('Pairwise comparison computes differential and identifies unique skills', () => {
  const candidateA = {
    _id: 'a',
    candidateName: 'Candidate A',
    totalExperienceYears: 4,
    skills: [{ name: 'React' }, { name: 'Node.js' }, { name: 'TypeScript' }],
  };
  const candidateB = {
    _id: 'b',
    candidateName: 'Candidate B',
    totalExperienceYears: 2,
    skills: [{ name: 'React' }, { name: 'HTML' }],
  };
  const job = {
    title: 'Full Stack Engineer',
    minExperienceYears: 3,
    requiredSkills: [{ name: 'React' }, { name: 'Node.js' }],
  };

  const comparison = compareTwoCandidates(candidateA, candidateB, job);

  assert.strictEqual(comparison.leader.id, 'a');
  assert.ok(comparison.scoreDifferential > 0);
  assert.ok(comparison.candidateA.uniqueSkills.includes('TypeScript'));
  assert.ok(comparison.candidateB.uniqueSkills.includes('HTML'));
  assert.ok(comparison.explainableReasoning.includes('leads by'));
});

// ---------------------------------------------------------
// 6. Bias Mitigation & PII Anonymization Tests
// ---------------------------------------------------------
runTest('Resume text parser masks candidate name, email, and phone when anonymize=true', () => {
  const rawResume = `John Doe
Email: john.doe@personalmail.com
Phone: (555) 123-4567
Summary: Software Engineer with 4 years of experience in JavaScript, React, and AWS.`;

  const parsed = parseResumeText(rawResume, { anonymize: true });

  assert.strictEqual(parsed.anonymized, true);
  assert.strictEqual(parsed.candidateName, 'Candidate (Anonymized for Bias Mitigation)');
  assert.ok(!parsed.email.includes('john.doe@personalmail.com'));
  assert.strictEqual(parsed.phone, '***-***-****');
  assert.strictEqual(parsed.totalExperienceYears, 4);
});

// ---------------------------------------------------------
// 7. Semantic Vector & TF-IDF Cosine Similarity Tests
// ---------------------------------------------------------
runTest('Cosine similarity between identical vectors is exactly 1.0', () => {
  const vecA = { react: 1.5, nodejs: 2.0, aws: 1.2 };
  const similarity = computeCosineSimilarity(vecA, vecA);
  assert.strictEqual(Math.round(similarity * 1000) / 1000, 1.0);
});

runTest('Cosine similarity between completely disjoint vectors is 0.0', () => {
  const vecA = { react: 1.5, nodejs: 2.0 };
  const vecB = { python: 1.8, django: 2.2 };
  const similarity = computeCosineSimilarity(vecA, vecB);
  assert.strictEqual(similarity, 0.0);
});

runTest('Text tokenizer preserves tech acronyms and removes stopwords', () => {
  const text = 'A senior developer working with Node.js, C++, and CI/CD pipelines in AWS.';
  const tokens = tokenizeText(text);
  assert.ok(tokens.includes('nodejs'));
  assert.ok(tokens.includes('cpp'));
  assert.ok(tokens.includes('cicd'));
  assert.ok(tokens.includes('aws'));
  assert.ok(!tokens.includes('with'));
  assert.ok(!tokens.includes('in'));
});

runTest('Semantic vector engine computes cosine match and identifies top shared terms', () => {
  const resume = {
    summary: 'Cloud infrastructure architect focused on Kubernetes, Docker, and automation pipelines.',
    skills: [{ name: 'Kubernetes' }, { name: 'Docker' }, { name: 'Terraform' }],
  };
  const job = {
    title: 'Cloud DevOps Architect',
    description: 'Looking for an engineer to manage Kubernetes clusters and automated Docker pipelines with Terraform.',
  };
  const match = computeSemanticVectorMatch(resume, job);
  assert.ok(match.rawCosine > 0.5);
  assert.ok(match.topSharedTerms.includes('kubernetes'));
  assert.ok(match.topSharedTerms.includes('docker'));
});

// ---------------------------------------------------------
// 8. EEOC 4/5ths Rule & Algorithmic Fairness Tests
// ---------------------------------------------------------
runTest('EEOC 4/5ths calculator confirms compliance when pass rates are equitable', () => {
  const cohort = [
    { totalExperienceYears: 1, overallScore: 80 },
    { totalExperienceYears: 2, overallScore: 75 },
    { totalExperienceYears: 4, overallScore: 85 },
    { totalExperienceYears: 5, overallScore: 78 },
    { totalExperienceYears: 7, overallScore: 90 },
    { totalExperienceYears: 8, overallScore: 88 },
  ];
  const audit = auditDisparateImpact(cohort, 65);
  assert.strictEqual(audit.adverseImpactDetected, false);
  assert.strictEqual(audit.status, 'compliant');
  assert.strictEqual(audit.overallPassRate, 100);
});

runTest('EEOC 4/5ths calculator detects adverse impact when a cohort falls below 80% threshold', () => {
  const cohort = [
    { totalExperienceYears: 1, overallScore: 40 }, // Junior fail
    { totalExperienceYears: 2, overallScore: 45 }, // Junior fail
    { totalExperienceYears: 4, overallScore: 85 }, // Mid pass
    { totalExperienceYears: 5, overallScore: 80 }, // Mid pass
    { totalExperienceYears: 7, overallScore: 90 }, // Senior pass
    { totalExperienceYears: 8, overallScore: 92 }, // Senior pass
  ];
  const audit = auditDisparateImpact(cohort, 65);
  assert.strictEqual(audit.adverseImpactDetected, true);
  assert.strictEqual(audit.status, 'potential_adverse_impact');
});

// ---------------------------------------------------------
// 9. Enterprise RBAC & Cryptographic Security Tests
// ---------------------------------------------------------
runTest('Password hashing produces secure PBKDF2 hash verifiable with salt', () => {
  const salt = generateSalt();
  const password = 'SuperSecretRecruiterPassword123!';
  const hash = hashPassword(password, salt);

  assert.ok(hash.length > 32);
  assert.strictEqual(verifyPassword(password, salt, hash), true);
  assert.strictEqual(verifyPassword('WrongPassword!', salt, hash), false);
});

runTest('JWT token generator produces valid verifiable signed token with payload', () => {
  const payload = { id: 'u123', email: 'recruiter@drishti.ai', role: 'recruiter' };
  const token = generateToken(payload);
  const decoded = verifyToken(token);

  assert.strictEqual(decoded.id, 'u123');
  assert.strictEqual(decoded.email, 'recruiter@drishti.ai');
  assert.strictEqual(decoded.role, 'recruiter');
  assert.ok(decoded.exp > Date.now());
});

runTest('JWT verifier rejects tampered token signature', () => {
  const token = generateToken({ id: 'u123', role: 'candidate' });
  const tamperedToken = token.slice(0, -5) + 'AAAAA';
  assert.throws(() => verifyToken(tamperedToken), /signature/i);
});

// ---------------------------------------------------------
// 10. Multi-Format Document Ingestion Tests
// ---------------------------------------------------------
runTest('Buffer parser parses text document into structured candidate profile', async () => {
  const textBuffer = Buffer.from('Jane Architect\nEmail: jane@enterprise.com\nExpert in React, Python, and AWS with 6 years experience.');
  const parsed = await parseDocumentBuffer(textBuffer, 'text/plain', { anonymize: true });

  assert.strictEqual(parsed.anonymized, true);
  assert.strictEqual(parsed.totalExperienceYears, 6);
  const skillNames = parsed.skills.map(s => s.name);
  assert.ok(skillNames.includes('React'));
  assert.ok(skillNames.includes('Python'));
  assert.ok(skillNames.includes('AWS'));
});

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('====================================================');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
