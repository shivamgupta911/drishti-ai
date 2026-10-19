import assert from 'assert';

const PROD_URL = 'https://drishti-ai-backend-emau.onrender.com';
const ts = new Date('2026-10-19T06:51:35.435Z').getTime();

console.log('================================================================');
console.log('DRISHTI AI - FINAL PRODUCTION SECURITY & ISOLATION VERIFICATION');
console.log('Target Service:', PROD_URL);
console.log('Audit Accounts Timestamp:', ts);
console.log('Timestamp:', new Date().toISOString());
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;
const resultsLog = [];

async function req(path, options = {}) {
  const url = `${PROD_URL}${path}`;
  const res = await fetch(url, options);
  let body = {};
  const txt = await res.text();
  try {
    body = JSON.parse(txt);
  } catch {
    body = { raw: txt };
  }
  return {
    status: res.status,
    headers: res.headers,
    body,
  };
}

function record(name, status, expectedStatus, condition, details = '') {
  totalTests += 1;
  const isPass = condition && (expectedStatus ? status === expectedStatus : true);
  if (isPass) {
    passedTests += 1;
    console.log(`[PASS] ${name} (HTTP ${status})`);
    resultsLog.push({ name, status, result: 'PASS', details });
  } else {
    console.error(`[FAIL] ${name} (HTTP ${status}, expected ${expectedStatus}) - Details: ${details}`);
    resultsLog.push({ name, status, result: 'FAIL', details });
    throw new Error(`Verification failed on test: ${name}`);
  }
}

async function run() {
  // ========================================================================
  // STEP 1: CONFIRM DEPLOYED COMMIT & SECURITY FINGERPRINTS
  // ========================================================================
  console.log('--- STEP 1: CONFIRM DEPLOYED COMMIT & SECURITY CONTROLS ---');

  // Health check
  const health = await req('/api/health');
  record(
    'Health check operational with persistent MongoDB Atlas connection',
    health.status,
    200,
    health.body.status === 'ok' && health.body.database?.status === 'connected' && health.body.database?.isInMemory === false,
    JSON.stringify(health.body)
  );

  // Security headers & cache-control
  const resumesCheck = await req('/api/resumes');
  const cacheControl = resumesCheck.headers.get('cache-control') || '';
  record(
    'Security cache-control headers enforced (no-store, no-cache, private)',
    resumesCheck.status,
    200,
    cacheControl.includes('no-store') && cacheControl.includes('private'),
    `Cache-Control: ${cacheControl}`
  );

  // Seed method restriction
  const seedGet = await req('/api/seed');
  record(
    'GET /api/seed rejected with 405 Method Not Allowed',
    seedGet.status,
    405,
    (seedGet.body.error || '').includes('Method Not Allowed'),
    JSON.stringify(seedGet.body)
  );

  // Demo admin escalation blocking
  const demoAdmin = await req('/api/auth/demo-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persona: 'admin' }),
  });
  record(
    'POST /api/auth/demo-session (persona=admin) blocked with 403 Forbidden',
    demoAdmin.status,
    403,
    (demoAdmin.body.error || '').includes('cannot gain administrative privileges'),
    JSON.stringify(demoAdmin.body)
  );

  // Admin self-registration escalation blocking
  const regAdmin = await req('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Exploit Admin',
      email: `fake_admin_${Date.now()}@internal.test`,
      password: 'password123',
      role: 'admin',
    }),
  });
  record(
    'POST /api/auth/register with role=admin blocked with 403 Forbidden',
    regAdmin.status,
    403,
    (regAdmin.body.error || '').includes('Registration with administrative or auditor roles is forbidden'),
    JSON.stringify(regAdmin.body)
  );

  // ========================================================================
  // STEP 2: PUBLIC DEMO ACCESS & PERMITTED DEMO WORKFLOWS
  // ========================================================================
  console.log('\n--- STEP 2: PUBLIC DEMO ACCESS & PERMITTED DEMO WORKFLOWS ---');

  // Unauthenticated read of resumes (only synthetic demo data)
  const pubResumes = await req('/api/resumes');
  record(
    'Public visitor GET /api/resumes returns 200 with only synthetic demo resumes',
    pubResumes.status,
    200,
    pubResumes.body.data?.length > 0 && pubResumes.body.data.every((r) => r.isDemo === true && r.quarantined === false),
    `Count: ${pubResumes.body.data?.length}`
  );
  const demoResumeId = pubResumes.body.data[0]._id;

  // Unauthenticated read of jobs (only synthetic demo data)
  const pubJobs = await req('/api/jobs');
  record(
    'Public visitor GET /api/jobs returns 200 with only synthetic demo jobs',
    pubJobs.status,
    200,
    pubJobs.body.data?.length > 0 && pubJobs.body.data.every((j) => j.isDemo === true && j.quarantined === false),
    `Count: ${pubJobs.body.data?.length}`
  );
  const demoJobId = pubJobs.body.data[0]._id;

  // Permitted demo workflow: Match evaluation on demo records
  const demoMatch = await req('/api/matches/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeId: demoResumeId, jobId: demoJobId }),
  });
  record(
    'Public visitor permitted workflow: POST /api/matches/evaluate on demo data succeeds with 200 OK',
    demoMatch.status,
    200,
    demoMatch.body.success === true && typeof demoMatch.body.data?.overallScore === 'number',
    `Score: ${demoMatch.body.data?.overallScore}`
  );

  // Permitted demo workflow: Batch rank leaderboard for demo job
  const demoRank = await req(`/api/matches/rank/${demoJobId}`);
  record(
    'Public visitor permitted workflow: GET /api/matches/rank/:jobId succeeds with 200 OK',
    demoRank.status,
    200,
    demoRank.body.success === true && Array.isArray(demoRank.body.data?.leaderboard),
    `Cohort: ${demoRank.body.data?.cohortSize}`
  );

  // Permitted demo workflow: Fairness audit for demo job
  const demoFairness = await req(`/api/matches/fairness-audit/${demoJobId}`);
  record(
    'Public visitor permitted workflow: GET /api/matches/fairness-audit/:jobId succeeds with 200 OK',
    demoFairness.status,
    200,
    demoFairness.body.success === true && demoFairness.body.fairnessAudit !== undefined,
    `Adverse Impact: ${demoFairness.body.fairnessAudit?.overallCompliant}`
  );

  // Permitted demo workflow: Analytics overview for demo pool
  const demoAnalytics = await req('/api/analytics/overview');
  record(
    'Public visitor permitted workflow: GET /api/analytics/overview succeeds with 200 OK',
    demoAnalytics.status,
    200,
    demoAnalytics.body.success === true && demoAnalytics.body.candidatePoolSize > 0,
    `Candidate Pool: ${demoAnalytics.body.candidatePoolSize}`
  );

  // Permitted demo workflow: Recruiter demo session token acquisition
  const demoRecruiter = await req('/api/auth/demo-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persona: 'recruiter' }),
  });
  record(
    'Public visitor permitted workflow: POST /api/auth/demo-session (persona=recruiter) returns signed token',
    demoRecruiter.status,
    200,
    demoRecruiter.body.success === true && !!demoRecruiter.body.token,
    `Token: ${demoRecruiter.body.token?.substring(0, 15)}...`
  );
  const demoToken = demoRecruiter.body.token;

  // Unauthenticated mutations rejected (401)
  const anonResume = await req('/api/resumes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidateName: 'Anon Injected' }),
  });
  record('Unauthenticated POST /api/resumes rejected with 401 Unauthorized', anonResume.status, 401, true);

  const anonJob = await req('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Anon Job', description: 'Desc' }),
  });
  record('Unauthenticated POST /api/jobs rejected with 401 Unauthorized', anonJob.status, 401, true);

  const anonDelResume = await req(`/api/resumes/${demoResumeId}`, { method: 'DELETE' });
  record('Unauthenticated DELETE /api/resumes/:id rejected with 401 Unauthorized', anonDelResume.status, 401, true);

  const anonOutcome = await req('/api/outcomes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeId: demoResumeId, jobId: demoJobId, stage: 'hired' }),
  });
  record('Unauthenticated POST /api/outcomes rejected with 401 Unauthorized', anonOutcome.status, 401, true);

  const anonOverride = await req('/api/audit-history/EVAL-TEST-0000/override', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newDecision: 'qualify', reason: 'Anon attempt' }),
  });
  record('Unauthenticated POST /api/audit-history/:id/override rejected with 401 Unauthorized', anonOverride.status, 401, true);

  const anonSeed = await req('/api/seed', { method: 'POST' });
  record('Unauthenticated POST /api/seed rejected with 401 Unauthorized', anonSeed.status, 401, true);

  // Demo session mutation rejections (403)
  const demoDelResume = await req(`/api/resumes/${demoResumeId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${demoToken}` },
  });
  record('Demo session DELETE /api/resumes/:id rejected with 403 Forbidden', demoDelResume.status, 403, (demoDelResume.body.error || '').includes('demo'));

  const demoCreateJob = await req('/api/jobs', {
    method: 'POST',
    headers: { Authorization: `Bearer ${demoToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Demo Job', description: 'Desc' }),
  });
  record('Demo session POST /api/jobs rejected with 403 Forbidden', demoCreateJob.status, 403, (demoCreateJob.body.error || '').includes('demo'));

  const demoSeed = await req('/api/seed', {
    method: 'POST',
    headers: { Authorization: `Bearer ${demoToken}` },
  });
  record('Demo session POST /api/seed rejected with 403 Forbidden', demoSeed.status, 403, (demoSeed.body.error || '').includes('demo'));

  // ========================================================================
  // STEP 3: PRIVATE DATA ISOLATION WITH TWO SEPARATE TEST ACCOUNTS
  // ========================================================================
  console.log('\n--- STEP 3: PRIVATE DATA ISOLATION WITH TWO SEPARATE TEST ACCOUNTS ---');

  // Authenticate Account A
  const emailA = `audit_alpha_${ts}@drishti-verify.internal`;
  const loginA = await req('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailA, password: 'AuditPassword@2026' }),
  });
  record('Account A login succeeds with 200 OK and valid JWT', loginA.status, 200, !!loginA.body.token, `User: ${loginA.body.user?.email}`);
  const tokenA = loginA.body.token;

  // Authenticate Account B
  const emailB = `audit_beta_${ts}@drishti-verify.internal`;
  const loginB = await req('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailB, password: 'AuditPassword@2026' }),
  });
  record('Account B login succeeds with 200 OK and valid JWT', loginB.status, 200, !!loginB.body.token, `User: ${loginB.body.user?.email}`);
  const tokenB = loginB.body.token;

  // Account A creates Candidate A
  const createCandA = await req('/api/resumes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      candidateName: 'Alice Alpha Senior Rust Specialist',
      totalExperienceYears: 6,
      skills: ['Rust', 'WebAssembly', 'Tokio', 'PostgreSQL'],
    }),
  });
  record('Account A creates Candidate A in private workspace (201 Created)', createCandA.status, 201, !!createCandA.body.data?._id);
  const candAId = createCandA.body.data._id;

  // Account A creates Job A
  const createJobA = await req('/api/jobs', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Principal Systems Rust Engineer Alpha',
      department: 'Systems Engineering',
      minExperienceYears: 5,
      description: 'Systems engineer role requiring expertise in Rust, Tokio, and WebAssembly.',
      requiredSkills: ['Rust', 'Tokio'],
    }),
  });
  record('Account A creates Job A in private workspace (201 Created)', createJobA.status, 201, !!createJobA.body.data?._id);
  const jobAId = createJobA.body.data._id;

  // Account A evaluates Match A
  const matchA = await req('/api/matches/evaluate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeId: candAId, jobId: jobAId }),
  });
  record('Account A evaluates Match A (200 OK)', matchA.status, 200, !!matchA.body.data?._id);
  const matchAId = matchA.body.data._id;
  const evalAId = matchA.body.data.evaluationId;

  // Account A records Outcome A
  const outcomeA = await req('/api/outcomes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resumeId: candAId,
      jobId: jobAId,
      matchResultId: matchAId,
      stage: 'shortlisted',
    }),
  });
  record('Account A records Outcome A (200 OK)', outcomeA.status, 200, !!outcomeA.body.data?._id);
  const outcomeAId = outcomeA.body.data._id;

  // Account B creates Candidate B
  const createCandB = await req('/api/resumes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      candidateName: 'Bob Beta Flutter Specialist',
      totalExperienceYears: 3,
      skills: ['Flutter', 'Dart', 'Firebase'],
    }),
  });
  record('Account B creates Candidate B in private workspace (201 Created)', createCandB.status, 201, !!createCandB.body.data?._id);
  const candBId = createCandB.body.data._id;

  // Account B creates Job B
  const createJobB = await req('/api/jobs', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Senior Mobile Flutter Engineer Beta',
      department: 'Mobile Platform',
      minExperienceYears: 3,
      description: 'Mobile developer role focusing on Flutter and Dart cross-platform apps.',
      requiredSkills: ['Flutter', 'Dart'],
    }),
  });
  record('Account B creates Job B in private workspace (201 Created)', createJobB.status, 201, !!createJobB.body.data?._id);
  const jobBId = createJobB.body.data._id;

  // --- ISOLATION ASSERTIONS ---

  // 1. Resumes Isolation
  const bGetCandA = await req(`/api/resumes/${candAId}`, { headers: { Authorization: `Bearer ${tokenB}` } });
  record('Account B GET /api/resumes/:candAId returns 404 Not Found', bGetCandA.status, 404, true);

  const bDelCandA = await req(`/api/resumes/${candAId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tokenB}` } });
  record('Account B DELETE /api/resumes/:candAId returns 404 Not Found', bDelCandA.status, 404, true);

  const bListResumes = await req('/api/resumes', { headers: { Authorization: `Bearer ${tokenB}` } });
  record(
    'Account B GET /api/resumes contains only Bob, zero presence of Alice',
    bListResumes.status,
    200,
    bListResumes.body.data.some((r) => r._id === candBId) && !bListResumes.body.data.some((r) => r._id === candAId)
  );

  const aListResumes = await req('/api/resumes', { headers: { Authorization: `Bearer ${tokenA}` } });
  record(
    'Account A GET /api/resumes contains only Alice, zero presence of Bob',
    aListResumes.status,
    200,
    aListResumes.body.data.some((r) => r._id === candAId) && !aListResumes.body.data.some((r) => r._id === candBId)
  );

  // 2. Jobs Isolation
  const bGetJobA = await req(`/api/jobs/${jobAId}`, { headers: { Authorization: `Bearer ${tokenB}` } });
  record('Account B GET /api/jobs/:jobAId returns 404 Not Found', bGetJobA.status, 404, true);

  const bDelJobA = await req(`/api/jobs/${jobAId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tokenB}` } });
  record('Account B DELETE /api/jobs/:jobAId returns 404 Not Found', bDelJobA.status, 404, true);

  const bListJobs = await req('/api/jobs', { headers: { Authorization: `Bearer ${tokenB}` } });
  record(
    'Account B GET /api/jobs contains only Job Beta, zero presence of Job Alpha',
    bListJobs.status,
    200,
    bListJobs.body.data.some((j) => j._id === jobBId) && !bListJobs.body.data.some((j) => j._id === jobAId)
  );

  const aListJobs = await req('/api/jobs', { headers: { Authorization: `Bearer ${tokenA}` } });
  record(
    'Account A GET /api/jobs contains only Job Alpha, zero presence of Job Beta',
    aListJobs.status,
    200,
    aListJobs.body.data.some((j) => j._id === jobAId) && !aListJobs.body.data.some((j) => j._id === jobBId)
  );

  // 3. Matching & Leaderboard Isolation
  const bGetMatchA = await req(`/api/matches/${matchAId}`, { headers: { Authorization: `Bearer ${tokenB}` } });
  record('Account B GET /api/matches/:matchAId returns 404 Not Found', bGetMatchA.status, 404, true);

  const bCrossMatch = await req('/api/matches/evaluate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeId: candAId, jobId: jobBId }),
  });
  record(
    'Account B evaluating Candidate Alpha against Job Beta rejected with 404',
    bCrossMatch.status,
    404,
    (bCrossMatch.body.error || '').includes('not found in your workspace')
  );

  const bRankJobA = await req(`/api/matches/rank/${jobAId}`, { headers: { Authorization: `Bearer ${tokenB}` } });
  record('Account B GET /api/matches/rank/:jobAId rejected with 404', bRankJobA.status, 404, true);

  const bFairnessJobA = await req(`/api/matches/fairness-audit/${jobAId}`, { headers: { Authorization: `Bearer ${tokenB}` } });
  record('Account B GET /api/matches/fairness-audit/:jobAId rejected with 404', bFairnessJobA.status, 404, true);

  // 4. Comparisons Isolation
  const bCrossComp1 = await req('/api/matches/compare', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidateAId: candAId, candidateBId: candBId, jobId: jobBId }),
  });
  record(
    'Account B comparing Candidate Alpha with Candidate Beta rejected with 404',
    bCrossComp1.status,
    404,
    (bCrossComp1.body.error || '').includes('in your workspace')
  );

  const bCrossComp2 = await req('/api/matches/compare', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidateAId: candBId, candidateBId: candBId, jobId: jobAId }),
  });
  record(
    'Account B comparing against Job Alpha rejected with 404',
    bCrossComp2.status,
    404,
    (bCrossComp2.body.error || '').includes('in your workspace')
  );

  // 5. Analytics Isolation
  const bSimulateA = await req('/api/analytics/simulate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId: jobAId, weights: { skillsWeight: 0.6, experienceWeight: 0.2, semanticWeight: 0.15, preferredWeight: 0.05 } }),
  });
  record('Account B POST /api/analytics/simulate for Job Alpha rejected with 404', bSimulateA.status, 404, true);

  const bAnalytics = await req('/api/analytics/overview', { headers: { Authorization: `Bearer ${tokenB}` } });
  record(
    'Account B analytics pool strictly 1 (Bob), zero presence of Rust skill',
    bAnalytics.status,
    200,
    bAnalytics.body.candidatePoolSize === 1 && !bAnalytics.body.skillCoverage?.some((s) => s.skill === 'Rust')
  );

  const aAnalytics = await req('/api/analytics/overview', { headers: { Authorization: `Bearer ${tokenA}` } });
  record(
    'Account A analytics pool strictly 1 (Alice), zero presence of Flutter skill',
    aAnalytics.status,
    200,
    aAnalytics.body.candidatePoolSize === 1 && !aAnalytics.body.skillCoverage?.some((s) => s.skill === 'Flutter')
  );

  // 6. Exports & Integrations Isolation
  const bExportA = await req(`/api/integrations/export/${matchAId}?format=markdown`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  record('Account B GET /api/integrations/export/:matchAId rejected with 404', bExportA.status, 404, true);

  const bDispatchA = await req('/api/integrations/webhook/dispatch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchId: matchAId, platform: 'greenhouse' }),
  });
  record('Account B POST /api/integrations/webhook/dispatch for Match Alpha rejected with 404', bDispatchA.status, 404, true);

  // 7. Audit History Isolation
  const bGetAuditA = await req(`/api/audit-history/${evalAId}`, { headers: { Authorization: `Bearer ${tokenB}` } });
  record('Account B GET /api/audit-history/:evalAId rejected with 404', bGetAuditA.status, 404, true);

  const bListAudits = await req('/api/audit-history', { headers: { Authorization: `Bearer ${tokenB}` } });
  record(
    'Account B GET /api/audit-history contains 0 records, zero presence of Evaluation Audit Alpha',
    bListAudits.status,
    200,
    bListAudits.body.totalRecords === 0 && !bListAudits.body.data?.some((a) => a.evaluationId === evalAId)
  );

  const bOverrideA = await req(`/api/audit-history/${evalAId}/override`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ newDecision: 'reject', reason: 'Cross-tenant override test' }),
  });
  record('Account B POST /api/audit-history/:evalAId/override rejected with 404', bOverrideA.status, 404, true);

  // 8. Outcomes Isolation
  const bListOutcomes = await req('/api/outcomes', { headers: { Authorization: `Bearer ${tokenB}` } });
  record(
    'Account B GET /api/outcomes contains 0 records, zero presence of Outcome Alpha',
    bListOutcomes.status,
    200,
    bListOutcomes.body.count === 0
  );

  const bCrossOutcome = await req('/api/outcomes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeId: candAId, jobId: jobBId, stage: 'rejected' }),
  });
  record(
    'Account B POST /api/outcomes with Candidate Alpha rejected with 404',
    bCrossOutcome.status,
    404,
    (bCrossOutcome.body.error || '').includes('could not be found in your workspace')
  );

  const bOutcomesAnalytics = await req('/api/outcomes/analytics', { headers: { Authorization: `Bearer ${tokenB}` } });
  record('Account B GET /api/outcomes/analytics reports strictly 0 total outcomes', bOutcomesAnalytics.status, 200, bOutcomesAnalytics.body.totalOutcomes === 0);

  // 9. Public visitor access to private records
  const pubCandA = await req(`/api/resumes/${candAId}`);
  record('Public internet visitor GET /api/resumes/:candAId returns 404 Not Found', pubCandA.status, 404, true);

  const pubJobA = await req(`/api/jobs/${jobAId}`);
  record('Public internet visitor GET /api/jobs/:jobAId returns 404 Not Found', pubJobA.status, 404, true);

  const pubMatchA = await req(`/api/matches/${matchAId}`);
  record('Public internet visitor GET /api/matches/:matchAId returns 404 Not Found', pubMatchA.status, 404, true);

  const pubAuditA = await req(`/api/audit-history/${evalAId}`);
  record('Public internet visitor GET /api/audit-history/:evalAId returns 404 Not Found', pubAuditA.status, 404, true);

  const pubExportA = await req(`/api/integrations/export/${matchAId}`);
  record('Public internet visitor GET /api/integrations/export/:matchAId returns 404 Not Found', pubExportA.status, 404, true);

  // ========================================================================
  // STEP 4: TEARDOWN TEST CANDIDATES & JOBS
  // ========================================================================
  console.log('\n--- STEP 4: CLEANUP TEST CANDIDATES & JOBS ---');

  const delCandA = await req(`/api/resumes/${candAId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tokenA}` } });
  record('Account A cleans up Candidate Alpha (200 OK)', delCandA.status, 200, true);

  const delJobA = await req(`/api/jobs/${jobAId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tokenA}` } });
  record('Account A cleans up Job Alpha (200 OK)', delJobA.status, 200, true);

  const delCandB = await req(`/api/resumes/${candBId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tokenB}` } });
  record('Account B cleans up Candidate Beta (200 OK)', delCandB.status, 200, true);

  const delJobB = await req(`/api/jobs/${jobBId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tokenB}` } });
  record('Account B cleans up Job Beta (200 OK)', delJobB.status, 200, true);

  // Confirm teardown clean state
  const checkResumesA = await req('/api/resumes', { headers: { Authorization: `Bearer ${tokenA}` } });
  record('Account A candidate count is 0 after cleanup', checkResumesA.status, 200, checkResumesA.body.count === 0);

  const checkJobsA = await req('/api/jobs', { headers: { Authorization: `Bearer ${tokenA}` } });
  record('Account A job count is 0 after cleanup', checkJobsA.status, 200, checkJobsA.body.count === 0);

  const checkResumesB = await req('/api/resumes', { headers: { Authorization: `Bearer ${tokenB}` } });
  record('Account B candidate count is 0 after cleanup', checkResumesB.status, 200, checkResumesB.body.count === 0);

  const checkJobsB = await req('/api/jobs', { headers: { Authorization: `Bearer ${tokenB}` } });
  record('Account B job count is 0 after cleanup', checkJobsB.status, 200, checkJobsB.body.count === 0);

  console.log('\n================================================================');
  console.log(`FINAL PRODUCTION VERIFICATION COMPLETE: ${passedTests} / ${totalTests} PASSED`);
  console.log('================================================================');

  return { passedTests, totalTests, resultsLog };
}

run().catch((err) => {
  console.error('[FATAL AUDIT FAILURE]', err);
  process.exit(1);
});
