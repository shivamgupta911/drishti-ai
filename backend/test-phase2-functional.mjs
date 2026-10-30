import http from 'http';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from './src/app.js';
import User from './src/models/User.js';
import Job from './src/models/Job.js';
import Resume from './src/models/Resume.js';
import { generateToken } from './src/middleware/auth.middleware.js';
import { migrateExistingData } from './src/config/migration.js';

let mongod;
let server;
let baseUrl;
let recruiterToken;
let recruiterUser;
let adminToken;
let adminUser;
let demoToken;

async function setup() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await migrateExistingData();

  recruiterUser = await User.create({
    name: 'Recruiter Jane',
    email: 'jane@enterprise.com',
    role: 'recruiter',
    isActive: true,
    isVerified: true,
    passwordHash: 'hash',
    salt: 'salt',
  });
  recruiterToken = generateToken({
    id: recruiterUser._id.toString(),
    email: recruiterUser.email,
    name: recruiterUser.name,
    role: recruiterUser.role,
    isDemo: false,
  });

  adminUser = await User.create({
    name: 'Admin Shivam',
    email: 'shivamkgupta911@gmail.com',
    role: 'admin',
    isActive: true,
    isVerified: true,
    passwordHash: 'hash',
    salt: 'salt',
  });
  process.env.ADMIN_EMAIL = 'shivamkgupta911@gmail.com';
  adminToken = generateToken({
    id: adminUser._id.toString(),
    email: adminUser.email,
    name: adminUser.name,
    role: adminUser.role,
    isDemo: false,
  });

  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;

  // Demo token
  const demoRes = await fetch(`${baseUrl}/api/auth/demo-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persona: 'recruiter' }),
  });
  const demoData = await demoRes.json();
  demoToken = demoData.token;
}

async function requestApi(path, options = {}) {
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

async function runAudit() {
  console.log('=== DRISHTI AI: COMPREHENSIVE FUNCTIONAL AUDIT (PHASE 2) ===\n');
  await setup();

  const findings = [];

  // -------------------------------------------------------------
  // MODULE A: JOB MANAGEMENT
  // -------------------------------------------------------------
  console.log('--- TESTING MODULE A: JOB MANAGEMENT ---');

  // A1: Create Job Posting (Valid)
  const createJobRes = await requestApi('/api/jobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${recruiterToken}`,
    },
    body: JSON.stringify({
      title: 'Senior Cloud Platform Engineer',
      company: 'Starlight Dynamics',
      department: 'Infrastructure',
      minExperienceYears: 5,
      description: 'Design multi-region Kubernetes clusters with AWS, Terraform, and Docker.',
    }),
  });

  if (createJobRes.status === 201 && createJobRes.body.data?._id) {
    console.log('[PASS] A1: Create job posting succeeded with 201 Created.');
  } else {
    console.log('[FAIL] A1: Create job posting failed:', createJobRes.status, createJobRes.body);
  }
  const createdJobId = createJobRes.body.data?._id;

  // A2: Validate Empty Title / Description
  const emptyJobRes = await requestApi('/api/jobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${recruiterToken}`,
    },
    body: JSON.stringify({ title: '', description: '' }),
  });
  if (emptyJobRes.status === 400) {
    console.log('[PASS] A2: Empty job fields rejected with 400 Bad Request.');
  } else {
    console.log('[FAIL] A2: Empty job not rejected properly:', emptyJobRes.status);
  }

  // A3: Check if PUT /api/jobs/:id exists (CRITICAL DEFECT CHECK)
  console.log('Checking edit job route (PUT /api/jobs/:id)...');
  const editJobRes = await requestApi(`/api/jobs/${createdJobId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${recruiterToken}`,
    },
    body: JSON.stringify({
      title: 'Lead Cloud Architect',
      company: 'Starlight Dynamics Group',
      department: 'Cloud Architecture',
      minExperienceYears: 7,
      description: 'Updated architecture requirements with Go and Kubernetes.',
    }),
  });

  if (editJobRes.status === 404) {
    findings.push({
      area: 'Job Management',
      severity: 'CRITICAL',
      title: 'No Job Edit / Update Endpoint or UI Action Exists',
      description: 'PUT /api/jobs/:id does not exist (returns 404), and Job cards only display a Delete button with no edit option.',
    });
    console.log('[DEFECT CONFIRMED] A3: PUT /api/jobs/:id returns 404! Job editing is missing on the backend.');
  } else if (editJobRes.status === 200) {
    console.log('[PASS] A3: Job editing succeeded.');
  }

  // A4: Delete Job Posting with unauthorized persona (Demo)
  const demoDeleteRes = await requestApi(`/api/jobs/${createdJobId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${demoToken}` },
  });
  if (demoDeleteRes.status === 403) {
    console.log('[PASS] A4: Demo persona correctly blocked from deleting jobs (403 Forbidden).');
  } else {
    console.log('[FAIL] A4: Demo persona not blocked:', demoDeleteRes.status);
  }

  // -------------------------------------------------------------
  // MODULE B: CANDIDATE MANAGEMENT
  // -------------------------------------------------------------
  console.log('\n--- TESTING MODULE B: CANDIDATE MANAGEMENT ---');

  // B1: Ingest Candidate via Text
  const candRes = await requestApi('/api/resumes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${recruiterToken}`,
    },
    body: JSON.stringify({
      rawText: 'Experienced Senior Engineer with 6 years in React, Node.js, AWS, and Docker. Led payments team.',
      anonymize: true,
    }),
  });
  if (candRes.status === 201 && candRes.body.data?._id) {
    console.log(`[PASS] B1: Candidate created with sequential label '${candRes.body.data.candidateName}'.`);
  } else {
    console.log('[FAIL] B1: Candidate creation failed:', candRes.status);
  }
  const createdCandId = candRes.body.data?._id;

  // B2: Candidate with Zero Skills
  const zeroSkillRes = await requestApi('/api/resumes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${recruiterToken}`,
    },
    body: JSON.stringify({
      rawText: 'Non-technical administrative coordinator with customer support background.',
      anonymize: true,
    }),
  });
  if (zeroSkillRes.status === 201 && zeroSkillRes.body.data?.skills?.length === 0) {
    console.log('[PASS] B2: Candidate with 0 technical skills ingested safely without crash.');
  } else {
    console.log('[FAIL] B2: Zero skill candidate handling failed:', zeroSkillRes.status);
  }

  // B3: Check Candidate Edit route (PUT /api/resumes/:id)
  const editCandRes = await requestApi(`/api/resumes/${createdCandId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${recruiterToken}`,
    },
    body: JSON.stringify({
      candidateName: 'Candidate #101',
      totalExperienceYears: 7,
      skills: ['React', 'Node.js', 'Docker', 'Kubernetes'],
    }),
  });
  if (editCandRes.status === 200 && editCandRes.body.data?.totalExperienceYears === 7) {
    console.log('[PASS] B3: Candidate editing succeeded with 200 OK.');
  } else {
    findings.push({
      area: 'Candidate Management',
      severity: 'HIGH',
      title: 'Candidate editing failed',
      description: `PUT /api/resumes/:id returned status ${editCandRes.status}`,
    });
    console.log(`[FAIL] B3: Candidate editing returned status ${editCandRes.status}`);
  }

  // -------------------------------------------------------------
  // MODULE C: RESUME PROCESSING & ERROR HANDLING
  // -------------------------------------------------------------
  console.log('\n--- TESTING MODULE C: RESUME PROCESSING ---');

  // C1: Upload Non-PDF/TXT file (e.g. text with png extension or bad mime)
  const boundary = '----WebKitFormBoundaryTest123';
  const badMimeBody = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="resumeFile"; filename="photo.png"',
    'Content-Type: image/png',
    '',
    'fake image bytes',
    `--${boundary}--`,
  ].join('\r\n');

  const badMimeRes = await requestApi('/api/resumes/upload', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      Authorization: `Bearer ${recruiterToken}`,
    },
    body: badMimeBody,
  });

  if (badMimeRes.status === 400) {
    console.log('[PASS] C1: Unsupported file rejected with 400 Bad Request.');
  } else {
    findings.push({
      area: 'Resume Processing',
      severity: 'HIGH',
      title: 'Unsupported File Upload Handling',
      description: `Expected 400, got ${badMimeRes.status}`,
    });
    console.log(`[FAIL] C1: Unsupported file returned ${badMimeRes.status}`);
  }

  // C2: Upload Empty File (0 bytes)
  const emptyBody = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="resumeFile"; filename="empty.txt"',
    'Content-Type: text/plain',
    '',
    '',
    `--${boundary}--`,
  ].join('\r\n');

  const emptyRes = await requestApi('/api/resumes/upload', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      Authorization: `Bearer ${recruiterToken}`,
    },
    body: emptyBody,
  });

  if (emptyRes.status === 400) {
    console.log('[PASS] C2: Zero-byte file rejected with 400 Bad Request.');
  } else {
    findings.push({
      area: 'Resume Processing',
      severity: 'HIGH',
      title: 'Empty File Upload Handling',
      description: `Expected 400, got ${emptyRes.status}`,
    });
    console.log(`[FAIL] C2: Zero-byte file returned ${emptyRes.status}`);
  }

  // C3: Upload Oversized File (> 5MB)
  const bigChunk = 'X'.repeat(5.5 * 1024 * 1024);
  const oversizedBody = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="resumeFile"; filename="large.txt"',
    'Content-Type: text/plain',
    '',
    bigChunk,
    `--${boundary}--`,
  ].join('\r\n');

  const oversizedRes = await requestApi('/api/resumes/upload', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      Authorization: `Bearer ${recruiterToken}`,
    },
    body: oversizedBody,
  });

  if (oversizedRes.status === 413) {
    console.log('[PASS] C3: Oversized file rejected with 413 Payload Too Large.');
  } else {
    findings.push({
      area: 'Resume Processing',
      severity: 'HIGH',
      title: 'Oversized File Upload Handling',
      description: `Expected 413, got ${oversizedRes.status}`,
    });
    console.log(`[FAIL] C3: Oversized file returned ${oversizedRes.status}`);
  }

  // -------------------------------------------------------------
  // MODULE D: MATCHING ENGINE
  // -------------------------------------------------------------
  console.log('\n--- TESTING MODULE D: MATCHING ENGINE ---');

  const matchRes = await requestApi('/api/matches/evaluate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${recruiterToken}`,
    },
    body: JSON.stringify({
      resumeId: createdCandId,
      jobId: createdJobId,
    }),
  });

  if (matchRes.status === 200 && matchRes.body.success) {
    const score = matchRes.body.data.overallScore;
    console.log(`[PASS] D1: Match evaluation produced valid score: ${score}% (${matchRes.body.data.tier}).`);
  } else {
    console.log('[FAIL] D1: Match evaluation failed:', matchRes.status, matchRes.body);
  }

  // -------------------------------------------------------------
  // MODULE E: ANALYTICS LAB
  // -------------------------------------------------------------
  console.log('\n--- TESTING MODULE E: ANALYTICS LAB ---');
  const analyticsRes = await requestApi('/api/analytics/overview', {
    headers: { Authorization: `Bearer ${recruiterToken}` },
  });
  if (analyticsRes.status === 200 && analyticsRes.body.success) {
    console.log('[PASS] E1: Analytics overview returned valid dataset and metrics.');
  } else {
    console.log('[FAIL] E1: Analytics overview failed:', analyticsRes.status);
  }

  // -------------------------------------------------------------
  // MODULE F: WHAT-IF SIMULATOR
  // -------------------------------------------------------------
  console.log('\n--- TESTING MODULE F: WHAT-IF SIMULATOR ---');
  const invalidSimRes = await requestApi('/api/analytics/simulate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${recruiterToken}`,
    },
    body: JSON.stringify({
      jobId: createdJobId,
      weights: { skillsWeight: 0.5, experienceWeight: 0.2, semanticWeight: 0.1, preferredWeight: 0.1 },
    }),
  });
  if (invalidSimRes.status === 400) {
    console.log('[PASS] F1: Invalid simulation weights correctly rejected with 400 Bad Request.');
  } else {
    console.log('[FAIL] F1: Invalid simulation weights not rejected:', invalidSimRes.status);
  }

  // -------------------------------------------------------------
  // MODULE G: AUDIT LEDGER
  // -------------------------------------------------------------
  console.log('\n--- TESTING MODULE G: AUDIT LEDGER ---');
  const auditListRes = await requestApi('/api/audit-history', {
    headers: { Authorization: `Bearer ${recruiterToken}` },
  });
  if (auditListRes.status === 200 && Array.isArray(auditListRes.body.data)) {
    console.log(`[PASS] G1: Audit ledger returned ${auditListRes.body.data.length} records.`);
  } else {
    console.log('[FAIL] G1: List audit history failed:', auditListRes.status);
  }

  console.log('\n=== DEFECT FINDINGS IDENTIFIED ===');
  console.log(JSON.stringify(findings, null, 2));

  server.close();
  await mongoose.disconnect();
  await mongod.stop();
}

runAudit().catch(async (err) => {
  console.error('Audit suite crashed:', err);
  if (server) server.close();
  if (mongod) await mongod.stop();
  process.exit(1);
});
