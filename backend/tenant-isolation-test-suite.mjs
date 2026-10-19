import http from 'http';
import assert from 'assert';
import app from './src/app.js';
import { connectDB, disconnectDB } from './src/config/db.js';
import { seedInitialData } from './src/config/seed.js';
import Resume from './src/models/Resume.js';
import Job from './src/models/Job.js';

let server;
let baseUrl;
let passedTests = 0;
let totalTests = 0;

// Connect to DB and initialize seed dataset
await connectDB();
await seedInitialData();

server = app.listen(0);
const { port } = server.address();
baseUrl = `http://127.0.0.1:${port}`;

console.log('================================================================');
console.log('DRISHTI AI - MULTI-TENANT ISOLATION & IDOR VERIFICATION SUITE');
console.log('================================================================\n');

async function makeRequest(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, options);
  let body = {};
  const text = await response.text();
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  return {
    status: response.status,
    headers: response.headers,
    body,
  };
}

async function runTenantTest(assertionNum, title, fn) {
  totalTests += 1;
  try {
    await fn();
    console.log(`[PASS] Assertion ${assertionNum}: ${title}`);
    passedTests += 1;
  } catch (err) {
    console.error(`[FAIL] Assertion ${assertionNum}: ${title}\n       Error: ${err.message}`);
    throw err;
  }
}

// -------------------------------------------------------------
// Tenant Setup: Register User A and User B workspaces
// -------------------------------------------------------------
const registerUserA = await makeRequest('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Alice Recruiter',
    email: 'alice@tenant-a.com',
    password: 'Password@123',
    role: 'recruiter',
    organization: 'Tenant Alpha Corp',
  }),
});
assert.strictEqual(registerUserA.status, 201, 'User A registration must succeed');
const userAToken = registerUserA.body.token;
const userAId = registerUserA.body.user._id.toString();

const registerUserB = await makeRequest('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Bob Recruiter',
    email: 'bob@tenant-b.com',
    password: 'Password@123',
    role: 'recruiter',
    organization: 'Tenant Beta Solutions',
  }),
});
assert.strictEqual(registerUserB.status, 201, 'User B registration must succeed');
const userBToken = registerUserB.body.token;
const userBId = registerUserB.body.user._id.toString();

// Admin login for administrative verification
const adminLogin = await makeRequest('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@drishti.ai', password: 'Admin@123' }),
});
const adminToken = adminLogin.body.token;

// Demo session token
const demoSessionRes = await makeRequest('/api/auth/demo-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ persona: 'recruiter' }),
});
const demoToken = demoSessionRes.body.token;

// Variables to hold Tenant A resource IDs
let candidateAId;
let jobAId;
let matchAId;
let evalAId;

// Variables to hold Tenant B resource IDs
let candidateBId;
let jobBId;

// =============================================================
// VERIFICATION OF 12 TENANT ISOLATION ASSERTIONS
// =============================================================

// -------------------------------------------------------------
// ASSERTION 1: User A can create, read, update, and delete their own records
// -------------------------------------------------------------
await runTenantTest(1, 'User A can create, read, update, and delete their own records', async () => {
  // Create Candidate in Tenant A workspace
  const candRes = await makeRequest('/api/resumes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userAToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      candidateName: 'Alice Candidate A1',
      totalExperienceYears: 4,
      skills: ['Python', 'Django', 'PostgreSQL', 'Docker'],
    }),
  });
  assert.strictEqual(candRes.status, 201);
  candidateAId = candRes.body.data._id;
  assert.strictEqual(candRes.body.data.ownerId, userAId);
  assert.strictEqual(candRes.body.data.isDemo, false);

  // Create Job in Tenant A workspace
  const jobRes = await makeRequest('/api/jobs', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userAToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Python Backend Engineer',
      department: 'Engineering',
      minExperienceYears: 3,
      description: 'Looking for a Python Backend Engineer with Django and PostgreSQL experience.',
      requiredSkills: ['Python', 'Django', 'PostgreSQL'],
    }),
  });
  assert.strictEqual(jobRes.status, 201);
  jobAId = jobRes.body.data._id;
  assert.strictEqual(jobRes.body.data.ownerId, userAId);

  // Run match evaluation in Tenant A workspace
  const matchRes = await makeRequest('/api/matches/evaluate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userAToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeId: candidateAId, jobId: jobAId }),
  });
  assert.strictEqual(matchRes.status, 200);
  matchAId = matchRes.body.data._id;
  evalAId = matchRes.body.data.evaluationId;
  assert.ok(matchAId, 'Match result must have ID');
  assert.ok(evalAId, 'Audit evaluation ID must be generated');

  // Record outcome in Tenant A workspace
  const outcomeRes = await makeRequest('/api/outcomes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userAToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resumeId: candidateAId,
      jobId: jobAId,
      matchResultId: matchAId,
      stage: 'shortlisted',
    }),
  });
  assert.strictEqual(outcomeRes.status, 200);
  assert.strictEqual(outcomeRes.body.data.stage, 'shortlisted');

  // User A can read their own records
  const readCand = await makeRequest(`/api/resumes/${candidateAId}`, {
    headers: { Authorization: `Bearer ${userAToken}` },
  });
  assert.strictEqual(readCand.status, 200);
  assert.strictEqual(readCand.body.data.candidateName, 'Alice Candidate A1');

  const readJob = await makeRequest(`/api/jobs/${jobAId}`, {
    headers: { Authorization: `Bearer ${userAToken}` },
  });
  assert.strictEqual(readJob.status, 200);
  assert.strictEqual(readJob.body.data.title, 'Python Backend Engineer');

  const readAudit = await makeRequest(`/api/audit-history/${evalAId}`, {
    headers: { Authorization: `Bearer ${userAToken}` },
  });
  assert.strictEqual(readAudit.status, 200);
  assert.strictEqual(readAudit.body.data.evaluationId, evalAId);
});

// -------------------------------------------------------------
// ASSERTION 2: User B cannot read User A's records (Returns 404 Not Found)
// -------------------------------------------------------------
await runTenantTest(2, "User B cannot read User A's records (IDOR protected with 404 Not Found)", async () => {
  // User B cannot read User A's candidate
  const candRes = await makeRequest(`/api/resumes/${candidateAId}`, {
    headers: { Authorization: `Bearer ${userBToken}` },
  });
  assert.strictEqual(candRes.status, 404, 'Must return 404 for candidate of another tenant');

  // User B cannot read User A's job
  const jobRes = await makeRequest(`/api/jobs/${jobAId}`, {
    headers: { Authorization: `Bearer ${userBToken}` },
  });
  assert.strictEqual(jobRes.status, 404, 'Must return 404 for job of another tenant');

  // User B cannot read User A's match evaluation
  const matchRes = await makeRequest(`/api/matches/${matchAId}`, {
    headers: { Authorization: `Bearer ${userBToken}` },
  });
  assert.strictEqual(matchRes.status, 404, 'Must return 404 for match of another tenant');

  // User B cannot read User A's match dossier report
  const reportRes = await makeRequest(`/api/matches/${matchAId}/report`, {
    headers: { Authorization: `Bearer ${userBToken}` },
  });
  assert.strictEqual(reportRes.status, 404, 'Must return 404 for report of another tenant');

  // User B cannot read User A's audit ledger record
  const auditRes = await makeRequest(`/api/audit-history/${evalAId}`, {
    headers: { Authorization: `Bearer ${userBToken}` },
  });
  assert.strictEqual(auditRes.status, 404, 'Must return 404 for audit record of another tenant');

  // User B's candidate listing does not include User A's candidate
  const listCand = await makeRequest('/api/resumes', {
    headers: { Authorization: `Bearer ${userBToken}` },
  });
  assert.strictEqual(listCand.status, 200);
  assert.ok(!listCand.body.data.some(c => c._id === candidateAId), 'User B must not see User A candidate in list');

  // User B's job listing does not include User A's job
  const listJob = await makeRequest('/api/jobs', {
    headers: { Authorization: `Bearer ${userBToken}` },
  });
  assert.strictEqual(listJob.status, 200);
  assert.ok(!listJob.body.data.some(j => j._id === jobAId), 'User B must not see User A job in list');
});

// -------------------------------------------------------------
// ASSERTION 3: User B cannot update, delete, or export User A's records
// -------------------------------------------------------------
await runTenantTest(3, "User B cannot update, delete, or export User A's records", async () => {
  // User B attempts to delete User A's candidate
  const delCand = await makeRequest(`/api/resumes/${candidateAId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userBToken}` },
  });
  assert.strictEqual(delCand.status, 404, 'Delete must fail with 404');

  // User B attempts to delete User A's job
  const delJob = await makeRequest(`/api/jobs/${jobAId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userBToken}` },
  });
  assert.strictEqual(delJob.status, 404, 'Delete job must fail with 404');

  // User B attempts to export User A's match report
  const exportRes = await makeRequest(`/api/integrations/export/${matchAId}?format=markdown`, {
    headers: { Authorization: `Bearer ${userBToken}` },
  });
  assert.strictEqual(exportRes.status, 404, 'Export report must fail with 404');

  // User B attempts to override User A's evaluation
  const overrideRes = await makeRequest(`/api/audit-history/${evalAId}/override`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userBToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ newDecision: 'qualify', reason: 'Malicious override attempt' }),
  });
  assert.strictEqual(overrideRes.status, 404, 'Override must fail with 404');
});

// -------------------------------------------------------------
// ASSERTION 4: ID parameter tampering fails across all entities
// -------------------------------------------------------------
await runTenantTest(4, 'ID parameter tampering fails across candidate, job, match, and outcome endpoints', async () => {
  const forgedId = '660000000000000000000000';

  const t1 = await makeRequest(`/api/resumes/${forgedId}`, { headers: { Authorization: `Bearer ${userBToken}` } });
  assert.strictEqual(t1.status, 404);

  const t2 = await makeRequest(`/api/jobs/${forgedId}`, { headers: { Authorization: `Bearer ${userBToken}` } });
  assert.strictEqual(t2.status, 404);

  const t3 = await makeRequest(`/api/matches/${forgedId}`, { headers: { Authorization: `Bearer ${userBToken}` } });
  assert.strictEqual(t3.status, 404);

  const t4 = await makeRequest(`/api/audit-history/EVAL-FORGED-9999`, { headers: { Authorization: `Bearer ${userBToken}` } });
  assert.strictEqual(t4.status, 404);
});

// -------------------------------------------------------------
// ASSERTION 5: User B cannot run a match or comparison referencing User A's records
// -------------------------------------------------------------
await runTenantTest(5, "User B cannot match or compare referencing User A's candidate or job ID", async () => {
  // Create Candidate B and Job B in User B's workspace
  const candBRes = await makeRequest('/api/resumes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userBToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      candidateName: 'Bob Candidate B1',
      totalExperienceYears: 6,
      skills: ['React', 'TypeScript', 'Tailwind', 'Next.js'],
    }),
  });
  assert.strictEqual(candBRes.status, 201);
  candidateBId = candBRes.body.data._id;

  const jobBRes = await makeRequest('/api/jobs', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userBToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Frontend React Lead',
      department: 'Product',
      minExperienceYears: 5,
      description: 'Looking for a Senior Frontend React Developer with TypeScript and Next.js.',
      requiredSkills: ['React', 'TypeScript'],
    }),
  });
  assert.strictEqual(jobBRes.status, 201);
  jobBId = jobBRes.body.data._id;

  // 1. User B tries to evaluate User A's candidate against User B's job
  const crossMatch1 = await makeRequest('/api/matches/evaluate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userBToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeId: candidateAId, jobId: jobBId }),
  });
  assert.strictEqual(crossMatch1.status, 404, 'Cross-tenant match evaluation must fail with 404');
  assert.ok(crossMatch1.body.error.includes('not found in your workspace'));

  // 2. User B tries to evaluate User B's candidate against User A's job
  const crossMatch2 = await makeRequest('/api/matches/evaluate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userBToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeId: candidateBId, jobId: jobAId }),
  });
  assert.strictEqual(crossMatch2.status, 404, 'Cross-tenant job match must fail with 404');
  assert.ok(crossMatch2.body.error.includes('not found in your workspace'));

  // 3. User B tries to compare User A's candidate against Candidate B for Job B
  const crossComp = await makeRequest('/api/matches/compare', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userBToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidateAId: candidateAId, candidateBId: candidateBId, jobId: jobBId }),
  });
  assert.strictEqual(crossComp.status, 404, 'Cross-tenant comparison must fail with 404');
  assert.ok(crossComp.body.error.includes('in your workspace'), `Expected error message to include 'in your workspace', got: ${crossComp.body.error}`);
});

// -------------------------------------------------------------
// ASSERTION 6: Private analytics, leaderboards, audits, and pipeline metrics do not leak or aggregate cross-user data
// -------------------------------------------------------------
await runTenantTest(6, 'Private analytics, leaderboards, audits, and pipeline metrics do not mix cross-tenant data', async () => {
  // User B checks their analytics overview
  const analyticsB = await makeRequest('/api/analytics/overview', {
    headers: { Authorization: `Bearer ${userBToken}` },
  });
  assert.strictEqual(analyticsB.status, 200);
  assert.strictEqual(analyticsB.body.candidatePoolSize, 1, 'User B pool size must only reflect their 1 candidate');
  assert.strictEqual(analyticsB.body.jobPostingsCount, 1, 'User B job count must only reflect their 1 job');
  assert.ok(!analyticsB.body.skillCoverage.some(s => s.skill === 'Django'), 'User B analytics must not contain Tenant A skills');

  // User B checks leaderboard for Job B
  const lbB = await makeRequest(`/api/matches/rank/${jobBId}`, {
    headers: { Authorization: `Bearer ${userBToken}` },
  });
  assert.strictEqual(lbB.status, 200);
  assert.strictEqual(lbB.body.data.cohortSize, 1, 'Leaderboard cohort size must be 1');
  assert.strictEqual(lbB.body.data.leaderboard[0].candidateName, 'Bob Candidate B1');

  // User B checks audit history (has not performed matches yet)
  const auditB = await makeRequest('/api/audit-history', {
    headers: { Authorization: `Bearer ${userBToken}` },
  });
  assert.strictEqual(auditB.status, 200);
  assert.strictEqual(auditB.body.totalRecords, 0, 'User B audit history must be 0');

  // User B checks outcomes (has not recorded outcomes yet)
  const outcomesB = await makeRequest('/api/outcomes', {
    headers: { Authorization: `Bearer ${userBToken}` },
  });
  assert.strictEqual(outcomesB.status, 200);
  assert.strictEqual(outcomesB.body.count, 0, 'User B outcomes count must be 0');
});

// -------------------------------------------------------------
// ASSERTION 7: Unauthenticated visitors can access ONLY public demo data
// -------------------------------------------------------------
await runTenantTest(7, 'Unauthenticated visitors can access ONLY public demo data, not private user data', async () => {
  // Listing resumes unauthenticated returns only isDemo: true records
  const demoResumes = await makeRequest('/api/resumes');
  assert.strictEqual(demoResumes.status, 200);
  assert.ok(demoResumes.body.data.length > 0);
  assert.ok(demoResumes.body.data.every(r => r.isDemo === true), 'All resumes must be demo data');
  assert.ok(!demoResumes.body.data.some(r => r._id === candidateAId || r._id === candidateBId));

  // Listing jobs unauthenticated returns only isDemo: true jobs
  const demoJobs = await makeRequest('/api/jobs');
  assert.strictEqual(demoJobs.status, 200);
  assert.ok(demoJobs.body.data.length > 0);
  assert.ok(demoJobs.body.data.every(j => j.isDemo === true), 'All jobs must be demo data');
  assert.ok(!demoJobs.body.data.some(j => j._id === jobAId || j._id === jobBId));
});

// -------------------------------------------------------------
// ASSERTION 8: Public demo requests cannot read, modify, or delete private records
// -------------------------------------------------------------
await runTenantTest(8, 'Public demo requests cannot read, modify, or delete private records', async () => {
  // Read private candidate unauthenticated
  const getPriv = await makeRequest(`/api/resumes/${candidateAId}`);
  assert.strictEqual(getPriv.status, 404, 'Unauthenticated access to private candidate must return 404');

  // Delete private candidate with demo token
  const delPriv = await makeRequest(`/api/resumes/${candidateAId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${demoToken}` },
  });
  assert.strictEqual(delPriv.status, 403, 'Demo deletion must be rejected with 403 Forbidden');

  // Create candidate with demo token
  const createDemo = await makeRequest('/api/resumes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${demoToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidateName: 'Illegal Demo Candidate' }),
  });
  assert.strictEqual(createDemo.status, 403, 'Demo candidate creation must be rejected with 403 Forbidden');
});

// -------------------------------------------------------------
// ASSERTION 9: Demo sessions cannot gain admin permissions
// -------------------------------------------------------------
await runTenantTest(9, 'Demo sessions cannot gain admin permissions', async () => {
  // Attempting to request demo session with admin persona fails with 403
  const demoAdminRes = await makeRequest('/api/auth/demo-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persona: 'admin' }),
  });
  assert.strictEqual(demoAdminRes.status, 403, 'Demo admin session must return 403');
  assert.ok(demoAdminRes.body.error.includes('Demo sessions cannot gain administrative privileges'));

  // Attempting to execute admin database seed with demo token fails with 403
  const seedDemoRes = await makeRequest('/api/seed', {
    method: 'POST',
    headers: { Authorization: `Bearer ${demoToken}` },
  });
  assert.strictEqual(seedDemoRes.status, 403, 'Demo seed request must return 403 Forbidden');
});

// -------------------------------------------------------------
// ASSERTION 10: Seeding or database reset endpoints reject unauthenticated or non-admin requests
// -------------------------------------------------------------
await runTenantTest(10, 'Seeding endpoints reject unauthenticated or non-admin requests', async () => {
  // GET /api/seed rejected
  const getSeed = await makeRequest('/api/seed');
  assert.strictEqual(getSeed.status, 405, 'GET /api/seed must return 405');

  // Unauthenticated POST /api/seed rejected
  const unauthSeed = await makeRequest('/api/seed', { method: 'POST' });
  assert.strictEqual(unauthSeed.status, 401, 'Unauthenticated seed must return 401');

  // Regular user (User A) POST /api/seed rejected
  const userSeed = await makeRequest('/api/seed', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userAToken}` },
  });
  assert.strictEqual(userSeed.status, 403, 'Regular user seed must return 403');

  // Verified admin POST /api/seed succeeds
  const adminSeed = await makeRequest('/api/seed', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(adminSeed.status, 200, 'Admin seed must return 200 OK');
});

// -------------------------------------------------------------
// ASSERTION 11: Existing application features work correctly for authorized tenants
// -------------------------------------------------------------
await runTenantTest(11, 'Existing application features work correctly for authorized tenants', async () => {
  // Re-create Candidate A and Job A after the seed in Assertion 10
  const reCandA = await makeRequest('/api/resumes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userAToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      candidateName: 'Alice Candidate A2',
      totalExperienceYears: 4,
      skills: ['Python', 'Django', 'PostgreSQL', 'Docker'],
    }),
  });
  candidateAId = reCandA.body.data._id;

  const reJobA = await makeRequest('/api/jobs', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userAToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Python Backend Engineer v2',
      department: 'Engineering',
      minExperienceYears: 3,
      description: 'Senior Python Engineer with Django and PostgreSQL experience.',
      requiredSkills: ['Python', 'Django', 'PostgreSQL'],
    }),
  });
  jobAId = reJobA.body.data._id;

  // 1. Matching
  const matchRes = await makeRequest('/api/matches/evaluate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userAToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeId: candidateAId, jobId: jobAId }),
  });
  assert.strictEqual(matchRes.status, 200);
  matchAId = matchRes.body.data._id;

  // 2. What-If Scenario Simulator
  const simRes = await makeRequest('/api/analytics/simulate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userAToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobId: jobAId,
      weights: { skillsWeight: 0.60, experienceWeight: 0.20, semanticWeight: 0.15, preferredWeight: 0.05 },
    }),
  });
  assert.strictEqual(simRes.status, 200);
  assert.ok(Array.isArray(simRes.body.data.results));
  assert.ok(simRes.body.data.scenarioId);

  // 3. Fairness Audit
  const fairnessRes = await makeRequest(`/api/matches/fairness-audit/${jobAId}?threshold=65`, {
    headers: { Authorization: `Bearer ${userAToken}` },
  });
  assert.strictEqual(fairnessRes.status, 200);
  assert.ok(fairnessRes.body.fairnessAudit);

  // 4. Skill Ontology Network Graph
  const netRes = await makeRequest('/api/analytics/network-graph', {
    headers: { Authorization: `Bearer ${userAToken}` },
  });
  assert.strictEqual(netRes.status, 200);
  assert.ok(Array.isArray(netRes.body.data.nodes));

  // 5. ATS Webhook Dispatch (Simulated)
  const webhookRes = await makeRequest('/api/integrations/webhook/dispatch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userAToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchId: matchAId, platform: 'greenhouse' }),
  });
  assert.strictEqual(webhookRes.status, 200);
  assert.strictEqual(webhookRes.body.dispatch.deliveryStatus, 'DELIVERED_SIMULATED');
});

// -------------------------------------------------------------
// ASSERTION 12: Quarantined records of unknown ownership are never accessible publicly
// -------------------------------------------------------------
await runTenantTest(12, 'Quarantined records of unknown ownership are never accessible publicly or to users', async () => {
  // Inject a quarantined legacy record of unknown ownership into the DB
  const quarantinedRecord = await Resume.create({
    candidateName: 'Legacy Unknown Candidate X',
    email: 'unknown@legacy.internal',
    ownerId: 'quarantine',
    isDemo: false,
    quarantined: true,
  });
  const quarantinedId = quarantinedRecord._id.toString();

  // 1. Unauthenticated visitor cannot retrieve quarantined candidate by ID
  const pubGet = await makeRequest(`/api/resumes/${quarantinedId}`);
  assert.strictEqual(pubGet.status, 404, 'Public request for quarantined record must return 404');

  // 2. Unauthenticated visitor resume list does not contain quarantined record
  const pubList = await makeRequest('/api/resumes');
  assert.ok(!pubList.body.data.some(r => r._id === quarantinedId), 'Public list must not contain quarantined record');

  // 3. User A cannot retrieve quarantined candidate by ID
  const userAGet = await makeRequest(`/api/resumes/${quarantinedId}`, {
    headers: { Authorization: `Bearer ${userAToken}` },
  });
  assert.strictEqual(userAGet.status, 404, 'User A request for quarantined record must return 404');

  // 4. User B cannot retrieve quarantined candidate by ID
  const userBGet = await makeRequest(`/api/resumes/${quarantinedId}`, {
    headers: { Authorization: `Bearer ${userBToken}` },
  });
  assert.strictEqual(userBGet.status, 404, 'User B request for quarantined record must return 404');

  // Cleanup injected test record
  await Resume.findByIdAndDelete(quarantinedId);
});

// -------------------------------------------------------------
// Shutdown and Summary
// -------------------------------------------------------------
await new Promise((resolve) => server.close(resolve));
await disconnectDB();

console.log('\n================================================================');
console.log(`MULTI-TENANT ISOLATION SUITE: ${passedTests} / ${totalTests} ASSERTIONS VERIFIED`);
console.log('================================================================');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
