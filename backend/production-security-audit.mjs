import assert from 'assert';

const PROD_URL = 'https://drishti-ai-backend-emau.onrender.com';
const runTimestamp = Date.now();

console.log('================================================================');
console.log('DRISHTI AI - INDEPENDENT PRODUCTION SECURITY & ISOLATION AUDIT');
console.log('Target Service:', PROD_URL);
console.log('Timestamp:', new Date(runTimestamp).toISOString());
console.log('================================================================\n');

let passedAssertions = 0;
let totalAssertions = 0;

async function request(path, options = {}) {
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

function verifyAssertion(title, condition, failureDetails = '') {
  totalAssertions += 1;
  if (!condition) {
    console.error(`[FAIL] ${title} - Details: ${failureDetails}`);
    throw new Error(`Assertion failed: ${title}. ${failureDetails}`);
  }
  console.log(`[PASS] ${title}`);
  passedAssertions += 1;
}

function assertSetup(condition, stepName, response = null) {
  if (!condition) {
    const errorDetails = response ? `Status: ${response.status}, Body: ${JSON.stringify(response.body)}` : '';
    console.error(`\n[FATAL SETUP ERROR] Setup step failed: "${stepName}". Aborting suite to prevent false-positives.\n${errorDetails}`);
    process.exit(1);
  }
}

async function runProductionAudit() {
  // =============================================================
  // SECTION 1: PUBLIC DEMO ACCESS & ANONYMOUS IMMUTABILITY
  // =============================================================
  console.log('--- SECTION 1: PUBLIC DEMO ACCESS & ANONYMOUS IMMUTABILITY ---');

  // 1.1 Public health check
  const healthRes = await request('/api/health');
  verifyAssertion(
    'Health check returns 200 with operational status and connected database',
    healthRes.status === 200 && healthRes.body.status === 'ok' && healthRes.body.database?.status === 'connected',
    JSON.stringify(healthRes.body)
  );

  // 1.2 Unauthenticated listing of resumes returns only isDemo=true
  const pubResumes = await request('/api/resumes');
  verifyAssertion(
    'Unauthenticated GET /api/resumes returns 200 with only public demo candidates',
    pubResumes.status === 200 &&
      Array.isArray(pubResumes.body.data) &&
      pubResumes.body.data.length > 0 &&
      pubResumes.body.data.every((r) => r.isDemo === true && r.quarantined === false),
    `Count: ${pubResumes.body.data?.length}`
  );
  const sampleDemoResumeId = pubResumes.body.data[0]._id;

  // 1.3 Unauthenticated listing of jobs returns only isDemo=true
  const pubJobs = await request('/api/jobs');
  verifyAssertion(
    'Unauthenticated GET /api/jobs returns 200 with only public demo jobs',
    pubJobs.status === 200 &&
      Array.isArray(pubJobs.body.data) &&
      pubJobs.body.data.length > 0 &&
      pubJobs.body.data.every((j) => j.isDemo === true && j.quarantined === false),
    `Count: ${pubJobs.body.data?.length}`
  );
  const sampleDemoJobId = pubJobs.body.data[0]._id;

  // 1.4 Unauthenticated access to analytics overview
  const pubAnalytics = await request('/api/analytics/overview');
  verifyAssertion(
    'Unauthenticated GET /api/analytics/overview returns 200 with demo pool',
    pubAnalytics.status === 200 && pubAnalytics.body.success === true && pubAnalytics.body.candidatePoolSize > 0,
    `Status: ${pubAnalytics.status}`
  );

  // 1.5 Unauthenticated mutations blocked
  const anonPostResume = await request('/api/resumes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidateName: 'Anon Injected' }),
  });
  verifyAssertion('Anonymous POST /api/resumes blocked (401)', anonPostResume.status === 401);

  const anonPostJob = await request('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Anon Job', description: 'Desc' }),
  });
  verifyAssertion('Anonymous POST /api/jobs blocked (401)', anonPostJob.status === 401);

  const anonDelResume = await request(`/api/resumes/${sampleDemoResumeId}`, { method: 'DELETE' });
  verifyAssertion('Anonymous DELETE /api/resumes/:id blocked (401)', anonDelResume.status === 401);

  const anonDelJob = await request(`/api/jobs/${sampleDemoJobId}`, { method: 'DELETE' });
  verifyAssertion('Anonymous DELETE /api/jobs/:id blocked (401)', anonDelJob.status === 401);

  const anonPostOutcome = await request('/api/outcomes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeId: sampleDemoResumeId, jobId: sampleDemoJobId, stage: 'hired' }),
  });
  verifyAssertion('Anonymous POST /api/outcomes blocked (401)', anonPostOutcome.status === 401);

  const anonOverride = await request('/api/audit-history/EVAL-ANY-1234/override', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newDecision: 'qualify', reason: 'Anon test' }),
  });
  verifyAssertion('Anonymous POST /api/audit-history/:id/override blocked (401)', anonOverride.status === 401);

  // 1.6 Database seed endpoint protection
  const seedGet = await request('/api/seed');
  verifyAssertion('Browser GET /api/seed rejected with 405 Method Not Allowed', seedGet.status === 405);

  const seedPostAnon = await request('/api/seed', { method: 'POST' });
  verifyAssertion('Anonymous POST /api/seed rejected with 401 Unauthorized', seedPostAnon.status === 401);

  // 1.7 Demo session restrictions
  const demoAdminRes = await request('/api/auth/demo-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persona: 'admin' }),
  });
  verifyAssertion(
    'POST /api/auth/demo-session (persona=admin) rejected with 403 Forbidden',
    demoAdminRes.status === 403 && (demoAdminRes.body.error || '').includes('Demo sessions cannot gain administrative privileges'),
    JSON.stringify(demoAdminRes.body)
  );

  const demoRecruiterRes = await request('/api/auth/demo-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persona: 'recruiter' }),
  });
  assertSetup(demoRecruiterRes.status === 200 && demoRecruiterRes.body.token, 'Acquire demo recruiter session token', demoRecruiterRes);
  const demoRecruiterToken = demoRecruiterRes.body.token;

  const demoDelResume = await request(`/api/resumes/${sampleDemoResumeId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${demoRecruiterToken}` },
  });
  verifyAssertion(
    'Demo session DELETE /api/resumes/:id rejected with 403 Forbidden',
    demoDelResume.status === 403 && (demoDelResume.body.error || '').includes('demo'),
    JSON.stringify(demoDelResume.body)
  );

  const demoSeedPost = await request('/api/seed', {
    method: 'POST',
    headers: { Authorization: `Bearer ${demoRecruiterToken}` },
  });
  verifyAssertion(
    'Demo session POST /api/seed rejected with 403 Forbidden',
    demoSeedPost.status === 403 && (demoSeedPost.body.error || '').includes('demo'),
    JSON.stringify(demoSeedPost.body)
  );

  // =============================================================
  // SECTION 2: FAIL-FAST SETUP FOR MULTI-TENANT VERIFICATION
  // =============================================================
  console.log('\n--- SECTION 2: FAIL-FAST REGISTRATION & PROVISIONING ---');

  const emailA = `audit_alpha_${runTimestamp}@drishti-verify.internal`;
  const emailB = `audit_beta_${runTimestamp}@drishti-verify.internal`;

  const regA = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Tenant Alpha Recruiter',
      email: emailA,
      password: 'AuditPassword@2026',
      role: 'recruiter',
      organization: 'Tenant Alpha Corp',
    }),
  });
  assertSetup(regA.status === 201 && regA.body.token, 'Register Tenant Alpha User', regA);
  const tokenA = regA.body.token;
  const userAId = regA.body.user?._id;
  assertSetup(userAId, 'Tenant Alpha user ID resolved', regA);
  console.log('[SETUP OK] Tenant Alpha User registered successfully.');

  const regB = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Tenant Beta Recruiter',
      email: emailB,
      password: 'AuditPassword@2026',
      role: 'recruiter',
      organization: 'Tenant Beta Corp',
    }),
  });
  assertSetup(regB.status === 201 && regB.body.token, 'Register Tenant Beta User', regB);
  const tokenB = regB.body.token;
  const userBId = regB.body.user?._id;
  assertSetup(userBId, 'Tenant Beta user ID resolved', regB);
  console.log('[SETUP OK] Tenant Beta User registered successfully.');

  // Create Candidate Alpha in Tenant A
  const createCandA = await request('/api/resumes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      candidateName: 'Alice Alpha Engineer',
      totalExperienceYears: 5,
      skills: ['Go', 'Kubernetes', 'gRPC', 'PostgreSQL'],
    }),
  });
  assertSetup(createCandA.status === 201 && createCandA.body.data?._id, 'Create Candidate Alpha', createCandA);
  const candAId = createCandA.body.data._id;
  console.log('[SETUP OK] Candidate Alpha created in Tenant Alpha workspace.');

  // Create Job Alpha in Tenant A
  const createJobA = await request('/api/jobs', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Senior Cloud Backend Engineer Alpha',
      department: 'Infrastructure',
      minExperienceYears: 4,
      description: 'Looking for Senior Go and Kubernetes engineer with microservices expertise.',
      requiredSkills: ['Go', 'Kubernetes'],
    }),
  });
  assertSetup(createJobA.status === 201 && createJobA.body.data?._id, 'Create Job Alpha', createJobA);
  const jobAId = createJobA.body.data._id;
  console.log('[SETUP OK] Job Alpha created in Tenant Alpha workspace.');

  // Evaluate Match Alpha in Tenant A
  const evalMatchA = await request('/api/matches/evaluate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeId: candAId, jobId: jobAId }),
  });
  assertSetup(evalMatchA.status === 200 && evalMatchA.body.data?._id, 'Evaluate Match Alpha', evalMatchA);
  const matchAId = evalMatchA.body.data._id;
  const evalAId = evalMatchA.body.data.evaluationId;
  assertSetup(evalAId, 'Evaluation Audit ID resolved for Match Alpha', evalMatchA);
  console.log('[SETUP OK] Match Alpha evaluated and audit record persisted.');

  // Record Outcome Alpha in Tenant A
  const outcomeA = await request('/api/outcomes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resumeId: candAId,
      jobId: jobAId,
      matchResultId: matchAId,
      stage: 'shortlisted',
    }),
  });
  assertSetup(outcomeA.status === 200 && outcomeA.body.data?._id, 'Record Outcome Alpha', outcomeA);
  const outcomeAId = outcomeA.body.data._id;
  console.log('[SETUP OK] Outcome Alpha recorded in Tenant Alpha workspace.');

  // Create Candidate Beta in Tenant B
  const createCandB = await request('/api/resumes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      candidateName: 'Bob Beta Developer',
      totalExperienceYears: 3,
      skills: ['Ruby', 'Rails', 'Redis'],
    }),
  });
  assertSetup(createCandB.status === 201 && createCandB.body.data?._id, 'Create Candidate Beta', createCandB);
  const candBId = createCandB.body.data._id;
  console.log('[SETUP OK] Candidate Beta created in Tenant Beta workspace.');

  // Create Job Beta in Tenant B
  const createJobB = await request('/api/jobs', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Fullstack Rails Developer Beta',
      department: 'Platform',
      minExperienceYears: 2,
      description: 'Looking for a Ruby on Rails fullstack developer.',
      requiredSkills: ['Ruby', 'Rails'],
    }),
  });
  assertSetup(createJobB.status === 201 && createJobB.body.data?._id, 'Create Job Beta', createJobB);
  const jobBId = createJobB.body.data._id;
  console.log('[SETUP OK] Job Beta created in Tenant Beta workspace.');

  // =============================================================
  // SECTION 3: COMPREHENSIVE CROSS-TENANT ISOLATION TESTS
  // =============================================================
  console.log('\n--- SECTION 3: COMPREHENSIVE CROSS-TENANT ISOLATION ---');

  // 3.1 Candidate Profile Isolation (Direct Read, List, Delete)
  const bGetCandA = await request(`/api/resumes/${candAId}`, { headers: { Authorization: `Bearer ${tokenB}` } });
  verifyAssertion('User B GET /api/resumes/:candAId returns 404 Not Found', bGetCandA.status === 404, `Status: ${bGetCandA.status}`);

  const bDelCandA = await request(`/api/resumes/${candAId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tokenB}` } });
  verifyAssertion('User B DELETE /api/resumes/:candAId returns 404 Not Found', bDelCandA.status === 404, `Status: ${bDelCandA.status}`);

  const bListResumes = await request('/api/resumes', { headers: { Authorization: `Bearer ${tokenB}` } });
  verifyAssertion(
    'User B GET /api/resumes list includes only Bob, zero presence of Alice',
    bListResumes.status === 200 &&
      bListResumes.body.data.some((r) => r._id === candBId) &&
      !bListResumes.body.data.some((r) => r._id === candAId),
    JSON.stringify(bListResumes.body.data?.map((r) => r._id))
  );

  const aListResumes = await request('/api/resumes', { headers: { Authorization: `Bearer ${tokenA}` } });
  verifyAssertion(
    'User A GET /api/resumes list includes Alice, zero presence of Bob',
    aListResumes.status === 200 &&
      aListResumes.body.data.some((r) => r._id === candAId) &&
      !aListResumes.body.data.some((r) => r._id === candBId),
    JSON.stringify(aListResumes.body.data?.map((r) => r._id))
  );

  // 3.2 Job Requisition Isolation (Direct Read, List, Delete)
  const bGetJobA = await request(`/api/jobs/${jobAId}`, { headers: { Authorization: `Bearer ${tokenB}` } });
  verifyAssertion('User B GET /api/jobs/:jobAId returns 404 Not Found', bGetJobA.status === 404, `Status: ${bGetJobA.status}`);

  const bDelJobA = await request(`/api/jobs/${jobAId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tokenB}` } });
  verifyAssertion('User B DELETE /api/jobs/:jobAId returns 404 Not Found', bDelJobA.status === 404, `Status: ${bDelJobA.status}`);

  const bListJobs = await request('/api/jobs', { headers: { Authorization: `Bearer ${tokenB}` } });
  verifyAssertion(
    'User B GET /api/jobs list includes only Job Beta, zero presence of Job Alpha',
    bListJobs.status === 200 &&
      bListJobs.body.data.some((j) => j._id === jobBId) &&
      !bListJobs.body.data.some((j) => j._id === jobAId),
    JSON.stringify(bListJobs.body.data?.map((j) => j._id))
  );

  const aListJobs = await request('/api/jobs', { headers: { Authorization: `Bearer ${tokenA}` } });
  verifyAssertion(
    'User A GET /api/jobs list includes Job Alpha, zero presence of Job Beta',
    aListJobs.status === 200 &&
      aListJobs.body.data.some((j) => j._id === jobAId) &&
      !aListJobs.body.data.some((j) => j._id === jobBId),
    JSON.stringify(aListJobs.body.data?.map((j) => j._id))
  );

  // 3.3 Match Evaluation & Report Isolation
  const bGetMatchA = await request(`/api/matches/${matchAId}`, { headers: { Authorization: `Bearer ${tokenB}` } });
  verifyAssertion('User B GET /api/matches/:matchAId returns 404 Not Found', bGetMatchA.status === 404, `Status: ${bGetMatchA.status}`);

  const bGetReportA = await request(`/api/matches/${matchAId}/report`, { headers: { Authorization: `Bearer ${tokenB}` } });
  verifyAssertion('User B GET /api/matches/:matchAId/report returns 404 Not Found', bGetReportA.status === 404, `Status: ${bGetReportA.status}`);

  const bListMatches = await request('/api/matches', { headers: { Authorization: `Bearer ${tokenB}` } });
  verifyAssertion(
    'User B GET /api/matches list contains 0 evaluations, zero presence of Match Alpha',
    bListMatches.status === 200 && !bListMatches.body.data.some((m) => m._id === matchAId),
    JSON.stringify(bListMatches.body)
  );

  // 3.4 Cross-Tenant Match Execution & Comparison Injection
  const bCrossMatch = await request('/api/matches/evaluate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeId: candAId, jobId: jobBId }),
  });
  verifyAssertion(
    'User B evaluating Candidate Alpha against Job Beta rejected with 404',
    bCrossMatch.status === 404 && (bCrossMatch.body.error || '').includes('not found in your workspace'),
    JSON.stringify(bCrossMatch.body)
  );

  const bCrossComp = await request('/api/matches/compare', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidateAId: candAId, candidateBId: candBId, jobId: jobBId }),
  });
  verifyAssertion(
    'User B comparing Candidate Alpha with Candidate Beta rejected with 404',
    bCrossComp.status === 404 && (bCrossComp.body.error || '').includes('in your workspace'),
    JSON.stringify(bCrossComp.body)
  );

  const bCrossCompJob = await request('/api/matches/compare', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidateAId: candBId, candidateBId: candBId, jobId: jobAId }),
  });
  verifyAssertion(
    'User B comparing against Job Alpha rejected with 404',
    bCrossCompJob.status === 404 && (bCrossCompJob.body.error || '').includes('in your workspace'),
    JSON.stringify(bCrossCompJob.body)
  );

  // 3.5 Rank Leaderboard & Fairness Audit
  const bGetRankA = await request(`/api/matches/rank/${jobAId}`, { headers: { Authorization: `Bearer ${tokenB}` } });
  verifyAssertion('User B GET /api/matches/rank/:jobAId rejected with 404', bGetRankA.status === 404, `Status: ${bGetRankA.status}`);

  const bGetFairnessA = await request(`/api/matches/fairness-audit/${jobAId}`, { headers: { Authorization: `Bearer ${tokenB}` } });
  verifyAssertion('User B GET /api/matches/fairness-audit/:jobAId rejected with 404', bGetFairnessA.status === 404, `Status: ${bGetFairnessA.status}`);

  // 3.6 What-If Simulation Isolation
  const bSimulateA = await request('/api/analytics/simulate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobId: jobAId,
      weights: { skillsWeight: 0.60, experienceWeight: 0.20, semanticWeight: 0.15, preferredWeight: 0.05 },
    }),
  });
  verifyAssertion('User B POST /api/analytics/simulate for Job Alpha rejected with 404', bSimulateA.status === 404, `Status: ${bSimulateA.status}`);

  // 3.7 Analytics Overview Strict Boundary
  const bAnalyticsOverview = await request('/api/analytics/overview', { headers: { Authorization: `Bearer ${tokenB}` } });
  verifyAssertion(
    'User B analytics candidatePoolSize is strictly 1 (only Bob) with 0 trace of Alice',
    bAnalyticsOverview.status === 200 &&
      bAnalyticsOverview.body.candidatePoolSize === 1 &&
      bAnalyticsOverview.body.jobPostingsCount === 1 &&
      !bAnalyticsOverview.body.skillCoverage?.some((s) => s.skill === 'Go'),
    JSON.stringify(bAnalyticsOverview.body)
  );

  const aAnalyticsOverview = await request('/api/analytics/overview', { headers: { Authorization: `Bearer ${tokenA}` } });
  verifyAssertion(
    'User A analytics candidatePoolSize is strictly 1 (only Alice) with 0 trace of Bob',
    aAnalyticsOverview.status === 200 &&
      aAnalyticsOverview.body.candidatePoolSize === 1 &&
      aAnalyticsOverview.body.jobPostingsCount === 1 &&
      !aAnalyticsOverview.body.skillCoverage?.some((s) => s.skill === 'Ruby'),
    JSON.stringify(aAnalyticsOverview.body)
  );

  // 3.8 Pipeline Outcomes Isolation & Forgery Prevention
  const bListOutcomes = await request('/api/outcomes', { headers: { Authorization: `Bearer ${tokenB}` } });
  verifyAssertion(
    'User B outcomes list contains 0 records, zero presence of Outcome Alpha',
    bListOutcomes.status === 200 && bListOutcomes.body.count === 0,
    `Count: ${bListOutcomes.body.count}`
  );

  const bCrossOutcome = await request('/api/outcomes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeId: candAId, jobId: jobBId, stage: 'rejected' }),
  });
  verifyAssertion(
    'User B updating outcome referencing Candidate Alpha rejected with 404',
    bCrossOutcome.status === 404 && (bCrossOutcome.body.error || '').includes('could not be found in your workspace'),
    JSON.stringify(bCrossOutcome.body)
  );

  const bCrossOutcomeDirect = await request('/api/outcomes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeId: candAId, jobId: jobAId, stage: 'rejected' }),
  });
  verifyAssertion(
    'User B updating outcome with User A candidate and job rejected with 404',
    bCrossOutcomeDirect.status === 404 && (bCrossOutcomeDirect.body.error || '').includes('could not be found in your workspace'),
    JSON.stringify(bCrossOutcomeDirect.body)
  );

  const bOutcomesAnalytics = await request('/api/outcomes/analytics', { headers: { Authorization: `Bearer ${tokenB}` } });
  verifyAssertion(
    'User B GET /api/outcomes/analytics reports strictly 0 total outcomes',
    bOutcomesAnalytics.status === 200 && bOutcomesAnalytics.body.totalOutcomes === 0,
    `Total outcomes: ${bOutcomesAnalytics.body.totalOutcomes}`
  );

  // 3.9 Audit Ledger Record & Recruiter Override Isolation
  const bGetAuditA = await request(`/api/audit-history/${evalAId}`, { headers: { Authorization: `Bearer ${tokenB}` } });
  verifyAssertion('User B GET /api/audit-history/:evalAId rejected with 404', bGetAuditA.status === 404, `Status: ${bGetAuditA.status}`);

  const bListAudits = await request('/api/audit-history', { headers: { Authorization: `Bearer ${tokenB}` } });
  verifyAssertion(
    'User B GET /api/audit-history contains 0 records, zero presence of Evaluation Audit Alpha',
    bListAudits.status === 200 && bListAudits.body.totalRecords === 0 && !bListAudits.body.data?.some((a) => a.evaluationId === evalAId),
    `Records: ${bListAudits.body.totalRecords}`
  );

  const bOverrideA = await request(`/api/audit-history/${evalAId}/override`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ newDecision: 'reject', reason: 'Cross-tenant malicious override attempt' }),
  });
  verifyAssertion('User B POST /api/audit-history/:evalAId/override rejected with 404', bOverrideA.status === 404, `Status: ${bOverrideA.status}`);

  // 3.10 Export & Webhook Integration Isolation
  const bExportA = await request(`/api/integrations/export/${matchAId}?format=markdown`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  verifyAssertion('User B GET /api/integrations/export/:matchAId rejected with 404', bExportA.status === 404, `Status: ${bExportA.status}`);

  const bDispatchA = await request('/api/integrations/webhook/dispatch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchId: matchAId, platform: 'greenhouse' }),
  });
  verifyAssertion('User B POST /api/integrations/webhook/dispatch for Match Alpha rejected with 404', bDispatchA.status === 404, `Status: ${bDispatchA.status}`);

  // 3.11 Public Internet Visitor Access to Private Records
  const pubGetCandA = await request(`/api/resumes/${candAId}`);
  verifyAssertion('Public internet visitor GET /api/resumes/:candAId returns 404 Not Found', pubGetCandA.status === 404, `Status: ${pubGetCandA.status}`);

  const pubGetJobA = await request(`/api/jobs/${jobAId}`);
  verifyAssertion('Public internet visitor GET /api/jobs/:jobAId returns 404 Not Found', pubGetJobA.status === 404, `Status: ${pubGetJobA.status}`);

  const pubGetMatchA = await request(`/api/matches/${matchAId}`);
  verifyAssertion('Public internet visitor GET /api/matches/:matchAId returns 404 Not Found', pubGetMatchA.status === 404, `Status: ${pubGetMatchA.status}`);

  const pubGetAuditA = await request(`/api/audit-history/${evalAId}`);
  verifyAssertion('Public internet visitor GET /api/audit-history/:evalAId returns 404 Not Found', pubGetAuditA.status === 404, `Status: ${pubGetAuditA.status}`);

  const pubGetExportA = await request(`/api/integrations/export/${matchAId}`);
  verifyAssertion('Public internet visitor GET /api/integrations/export/:matchAId returns 404 Not Found', pubGetExportA.status === 404, `Status: ${pubGetExportA.status}`);

  const pubOutcomes = await request('/api/outcomes');
  verifyAssertion(
    'Public internet visitor GET /api/outcomes returns 200 with zero presence of Outcome Alpha',
    pubOutcomes.status === 200 && !pubOutcomes.body.data?.some((o) => o._id === outcomeAId),
    `Count: ${pubOutcomes.body.count}`
  );

  // =============================================================
  // SECTION 4: PRODUCTION CLEANUP
  // =============================================================
  console.log('\n--- SECTION 4: PRODUCTION CLEANUP ---');

  const delCandA = await request(`/api/resumes/${candAId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tokenA}` } });
  verifyAssertion('User A cleans up Candidate Alpha (200 OK)', delCandA.status === 200, `Status: ${delCandA.status}`);

  const delJobA = await request(`/api/jobs/${jobAId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tokenA}` } });
  verifyAssertion('User A cleans up Job Alpha (200 OK)', delJobA.status === 200, `Status: ${delJobA.status}`);

  const delCandB = await request(`/api/resumes/${candBId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tokenB}` } });
  verifyAssertion('User B cleans up Candidate Beta (200 OK)', delCandB.status === 200, `Status: ${delCandB.status}`);

  const delJobB = await request(`/api/jobs/${jobBId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tokenB}` } });
  verifyAssertion('User B cleans up Job Beta (200 OK)', delJobB.status === 200, `Status: ${delJobB.status}`);

  console.log('\n================================================================');
  console.log(`PRODUCTION AUDIT COMPLETE: ${passedAssertions} / ${totalAssertions} ASSERTIONS VERIFIED`);
  console.log('================================================================');

  if (passedAssertions === totalAssertions) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runProductionAudit().catch((err) => {
  console.error('[UNCAUGHT AUDIT ERROR]', err);
  process.exit(1);
});
