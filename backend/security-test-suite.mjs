import http from 'http';
import assert from 'assert';
import app from './src/app.js';
import { connectDB, disconnectDB } from './src/config/db.js';
import { seedInitialData } from './src/config/seed.js';

let server;
let baseUrl;
let passedTests = 0;
let totalTests = 0;

// Setup test server with in-memory DB
await connectDB();
const seedResult = await seedInitialData();

server = app.listen(0);
const { port } = server.address();
baseUrl = `http://127.0.0.1:${port}`;

console.log('====================================================');
console.log('DRISHTI AI - AUTOMATED SECURITY & RBAC VERIFICATION SUITE');
console.log('====================================================\n');

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

async function runSecurityTest(name, fn) {
  totalTests += 1;
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passedTests += 1;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    throw err;
  }
}

// -------------------------------------------------------------
// Obtain Scoped Auth Tokens (Registered users vs Demo personas)
// -------------------------------------------------------------
const candidateLogin = await makeRequest('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'candidate@drishti.ai', password: 'Candidate@123' }),
});
const candidateToken = candidateLogin.body.token;

const recruiterLogin = await makeRequest('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'recruiter@drishti.ai', password: 'Recruiter@123' }),
});
const recruiterToken = recruiterLogin.body.token;

const adminLogin = await makeRequest('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@drishti.ai', password: 'Admin@123' }),
});
const adminToken = adminLogin.body.token;

const demoRecruiterRes = await makeRequest('/api/auth/demo-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ persona: 'recruiter' }),
});
const demoRecruiterToken = demoRecruiterRes.body.token;

assert.ok(candidateToken, 'Candidate token must be issued');
assert.ok(recruiterToken, 'Recruiter token must be issued');
assert.ok(adminToken, 'Admin token must be issued');
assert.ok(demoRecruiterToken, 'Demo recruiter token must be issued');

const sampleResumeId = seedResult.resumes[0].toString();
const sampleJobId = seedResult.jobs[0].toString();

// =============================================================
// TEST SUITE EXECUTION
// =============================================================

// 1. Public Health Check
await runSecurityTest('Public health check /api/health responds with 200 without exposing secrets', async () => {
  const res = await makeRequest('/api/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'ok');
  assert.strictEqual(res.body.service, 'drishti-ai-backend');
  assert.strictEqual(res.body.database.host, undefined);
  assert.strictEqual(res.body.database.password, undefined);
});

// 2. Public Root Endpoint
await runSecurityTest('Public root endpoint / responds with 200 service info', async () => {
  const res = await makeRequest('/');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.name, 'Drishti AI Backend Service');
});

// 3. Database Seed Protection - Prohibit GET mutation
await runSecurityTest('GET /api/seed rejects browser GET with 405 Method Not Allowed', async () => {
  const res = await makeRequest('/api/seed');
  assert.strictEqual(res.status, 405);
  assert.ok(res.body.error.includes('Method Not Allowed'));
});

// 4. Database Seed Protection - Reject Unauthenticated POST
await runSecurityTest('POST /api/seed unauthenticated returns 401 Unauthorized', async () => {
  const res = await makeRequest('/api/seed', { method: 'POST' });
  assert.strictEqual(res.status, 401);
});

// 5. Database Seed Protection - Reject Candidate Role
await runSecurityTest('POST /api/seed as Candidate returns 403 Forbidden', async () => {
  const res = await makeRequest('/api/seed', {
    method: 'POST',
    headers: { Authorization: `Bearer ${candidateToken}` },
  });
  assert.strictEqual(res.status, 403);
});

// 6. Database Seed Protection - Reject Demo Session
await runSecurityTest('POST /api/seed in Demo session returns 403 Forbidden', async () => {
  const res = await makeRequest('/api/seed', {
    method: 'POST',
    headers: { Authorization: `Bearer ${demoRecruiterToken}` },
  });
  assert.strictEqual(res.status, 403);
  assert.ok(res.body.error.includes('prohibited in demo sessions'));
});

// 7. Database Seed Protection - Permit Verified Admin Account
await runSecurityTest('POST /api/seed as Admin succeeds with 200 OK', async () => {
  const res = await makeRequest('/api/seed', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
});

// 8. Public Demo Access - Unauthenticated visitors can view public demo candidates
await runSecurityTest('GET /api/resumes unauthenticated returns 200 OK with public demo candidates', async () => {
  const res = await makeRequest('/api/resumes');
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body.data));
  assert.ok(res.body.data.length > 0);
  assert.ok(res.body.data.every(r => r.isDemo === true));
});

// 9. Public Demo Access - Unauthenticated visitors can view public demo jobs
await runSecurityTest('GET /api/jobs unauthenticated returns 200 OK with public demo jobs', async () => {
  const res = await makeRequest('/api/jobs');
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body.data));
  assert.ok(res.body.data.length > 0);
  assert.ok(res.body.data.every(j => j.isDemo === true));
});

// 10. Public Demo Access - Unauthenticated visitors can view public demo analytics
await runSecurityTest('GET /api/analytics/overview unauthenticated returns 200 OK with demo overview', async () => {
  const res = await makeRequest('/api/analytics/overview');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.candidatePoolSize > 0);
});

// 11. Malformed ObjectId Validation / Stack Trace Protection
await runSecurityTest('GET /api/resumes/:id with invalid ID returns 400 without leaking stack traces', async () => {
  const res = await makeRequest('/api/resumes/malformed-id-12345');
  assert.strictEqual(res.status, 400);
  assert.ok(res.body.error.includes('Invalid resume identifier'));
  assert.strictEqual(res.body.stack, undefined);
});

// 12. Resume Deletion Protection - Demo session cannot delete candidates
await runSecurityTest('DELETE /api/resumes/:id in demo session returns 403 Forbidden', async () => {
  const res = await makeRequest(`/api/resumes/${sampleResumeId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${demoRecruiterToken}` },
  });
  assert.strictEqual(res.status, 403);
  assert.ok(res.body.error.includes('demo'));
});

// 13. Job Creation Protection - Demo session cannot create jobs in public space
await runSecurityTest('POST /api/jobs in demo session returns 403 Forbidden', async () => {
  const res = await makeRequest('/api/jobs', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${demoRecruiterToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title: 'Demo Job', description: 'Demo Desc' }),
  });
  assert.strictEqual(res.status, 403);
  assert.ok(res.body.error.includes('demo'));
});

// 14. Job Requisitions - Validation of Required Fields for Private Recruiter
await runSecurityTest('POST /api/jobs as Recruiter with missing description returns 400 Bad Request', async () => {
  const res = await makeRequest('/api/jobs', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${recruiterToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title: 'Incomplete Job' }),
  });
  assert.strictEqual(res.status, 400);
  assert.ok(res.body.error.includes('Title and description are required'));
});

// 15. User Registration Privilege Escalation Prevention
await runSecurityTest('POST /api/auth/register with role="admin" returns 403 Forbidden', async () => {
  const res = await makeRequest('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Malicious Actor',
      email: 'attacker@evil.com',
      password: 'Password123!',
      role: 'admin',
    }),
  });
  assert.strictEqual(res.status, 403);
  assert.ok(res.body.error.includes('Registration with administrative or auditor roles is forbidden'));
});

// 16. Demo Session Privilege Escalation Prevention
await runSecurityTest('POST /api/auth/demo-session with persona="admin" returns 403 Forbidden', async () => {
  const res = await makeRequest('/api/auth/demo-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persona: 'admin' }),
  });
  assert.strictEqual(res.status, 403);
  assert.ok(res.body.error.includes('Demo sessions cannot gain administrative privileges'));
});

// 17. SSRF Protection - Block Localhost Webhook
await runSecurityTest('POST /api/integrations/webhook/dispatch blocks localhost SSRF with 400', async () => {
  const res = await makeRequest('/api/integrations/webhook/dispatch', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${recruiterToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      matchId: sampleResumeId,
      webhookUrl: 'http://localhost:8080/admin',
    }),
  });
  assert.strictEqual(res.status, 400);
  assert.ok(res.body.error.includes('Webhook destinations must use the HTTPS protocol') || res.body.error.includes('prohibited'));
});

// 18. SSRF Protection - Block Cloud Metadata Service (169.254.169.254)
await runSecurityTest('POST /api/integrations/webhook/dispatch blocks cloud metadata IP with 400', async () => {
  const res = await makeRequest('/api/integrations/webhook/dispatch', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${recruiterToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      matchId: sampleResumeId,
      webhookUrl: 'https://169.254.169.254/latest/meta-data',
    }),
  });
  assert.strictEqual(res.status, 400);
  assert.ok(res.body.error.includes('prohibited'));
});

// 19. Public Demo Access - Unauthenticated visitors can view public demo audit history
await runSecurityTest('GET /api/audit-history unauthenticated returns 200 OK with demo audits', async () => {
  const res = await makeRequest('/api/audit-history');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(Array.isArray(res.body.data));
});

// 20. Public Demo Access - Unauthenticated visitors can view public demo outcomes
await runSecurityTest('GET /api/outcomes unauthenticated returns 200 OK with demo outcomes', async () => {
  const res = await makeRequest('/api/outcomes');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(Array.isArray(res.body.data));
});

// 21. Audit Override Protection - Demo session cannot record overrides
await runSecurityTest('POST /api/audit-history/:id/override in demo session returns 403 Forbidden', async () => {
  const historyRes = await makeRequest('/api/audit-history');
  const evalId = historyRes.body.data[0].evaluationId;

  const overrideRes = await makeRequest(`/api/audit-history/${evalId}/override`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${demoRecruiterToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      newDecision: 'qualify',
      reason: 'Attempted demo override',
    }),
  });
  assert.strictEqual(overrideRes.status, 403);
  assert.ok(overrideRes.body.error.includes('demo'));
});

// 22. Outcome Modification Protection - Demo session cannot update candidate pipeline
await runSecurityTest('POST /api/outcomes in demo session returns 403 Forbidden', async () => {
  const outcomeRes = await makeRequest('/api/outcomes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${demoRecruiterToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resumeId: sampleResumeId,
      jobId: sampleJobId,
      stage: 'interviewed',
    }),
  });
  assert.strictEqual(outcomeRes.status, 403);
  assert.ok(outcomeRes.body.error.includes('demo'));
});

// 23. Match Studio - Public Demo Candidate Evaluation
await runSecurityTest('POST /api/matches/evaluate on demo candidates succeeds with 200 OK', async () => {
  const resumesRes = await makeRequest('/api/resumes');
  const activeResumeId = resumesRes.body.data[0]._id;
  const jobsRes = await makeRequest('/api/jobs');
  const activeJobId = jobsRes.body.data[0]._id;

  const res = await makeRequest('/api/matches/evaluate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resumeId: activeResumeId,
      jobId: activeJobId,
    }),
  });
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.data.overallScore > 0);
  assert.ok(Array.isArray(res.body.data.evidenceTraces));
});

// 24. Security Headers & Caching Headers
await runSecurityTest('Sensitive endpoints return Cache-Control: no-store, private and security headers', async () => {
  const res = await makeRequest('/api/resumes');
  assert.strictEqual(res.status, 200);
  const cacheControl = res.headers.get('cache-control') || '';
  const xContentType = res.headers.get('x-content-type-options') || '';
  const xFrameOptions = res.headers.get('x-frame-options') || '';

  assert.ok(cacheControl.includes('no-store'), 'Must include no-store');
  assert.ok(cacheControl.includes('private'), 'Must include private');
  assert.strictEqual(xContentType, 'nosniff');
  assert.strictEqual(xFrameOptions, 'DENY');
});

// 25. Tampered Bearer Token Rejection
await runSecurityTest('Tampered JWT token returns 401 Authentication failed', async () => {
  const tampered = recruiterToken.slice(0, -6) + 'XXXXXX';
  const res = await makeRequest('/api/resumes', {
    headers: { Authorization: `Bearer ${tampered}` },
  });
  assert.strictEqual(res.status, 401);
  assert.ok(res.body.error.includes('signature') || res.body.error.includes('Authentication failed'));
});

// 26. Private Workspace Candidate Creation & Deletion
await runSecurityTest('Private workspace candidate creation and deletion succeeds', async () => {
  // Create candidate in recruiter workspace
  const createRes = await makeRequest('/api/resumes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${recruiterToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      candidateName: 'Private Recruiter Candidate',
      totalExperienceYears: 5,
      skills: ['React', 'TypeScript', 'Node.js'],
    }),
  });
  assert.strictEqual(createRes.status, 201);
  const createdId = createRes.body.data._id;

  // Recruiter deletes their own candidate
  const delRes = await makeRequest(`/api/resumes/${createdId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${recruiterToken}` },
  });
  assert.strictEqual(delRes.status, 200);
  assert.strictEqual(delRes.body.success, true);
});

// Cleanup and shutdown
await new Promise((resolve) => server.close(resolve));
await disconnectDB();

console.log('\n====================================================');
console.log(`SECURITY TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('====================================================');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
