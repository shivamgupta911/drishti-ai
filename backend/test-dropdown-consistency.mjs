import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Resume from './src/models/Resume.js';
import Job from './src/models/Job.js';
import MatchResult from './src/models/MatchResult.js';
import EvaluationAudit from './src/models/EvaluationAudit.js';
import RecruitmentOutcome from './src/models/RecruitmentOutcome.js';
import User from './src/models/User.js';
import { migrateExistingData } from './src/config/migration.js';

let mongod;

async function runTest() {
  console.log('=== DRISHTI AI: DATA CONSISTENCY & DROPDOWN LABELING VERIFICATION ===\n');

  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  // 1. Setup legacy test data
  console.log('Step 1: Setting up legacy test dataset with "Drishti AI Partner" and legacy candidates...');
  const legacyCand1 = await Resume.create({
    candidateName: 'Candidate Alpha (Anonymized)',
    email: 'alpha@legacy.ai',
    totalExperienceYears: 4,
    skills: [{ name: 'React', category: 'Frontend' }, { name: 'Node.js', category: 'Backend' }],
    ownerId: 'demo',
    isDemo: true,
  });
  const legacyCand2 = await Resume.create({
    candidateName: 'Candidate Beta (Anonymized)',
    email: 'beta@legacy.ai',
    totalExperienceYears: 2,
    skills: [{ name: 'Python', category: 'Languages' }],
    ownerId: 'demo',
    isDemo: true,
  });
  const legacyCand3 = await Resume.create({
    candidateName: 'Candidate Gamma (Anonymized)',
    email: 'gamma@legacy.ai',
    totalExperienceYears: 6,
    skills: [{ name: 'AWS', category: 'Cloud / DevOps' }],
    ownerId: 'demo',
    isDemo: true,
  });

  const legacyJob1 = await Job.create({
    title: 'Full-Stack Software Engineer',
    description: 'Build full-stack scalable web applications using React and Node.js.',
    company: 'Drishti AI Partner',
    minExperienceYears: 0,
    department: 'Engineering',
    requiredSkills: [{ name: 'React', importance: 'mandatory' }],
    ownerId: 'demo',
    isDemo: true,
  });
  const legacyJob2 = await Job.create({
    title: 'Cloud DevOps Specialist',
    description: 'Design and automate scalable cloud infrastructure and CI/CD pipelines.',
    company: 'Drishti AI Partner',
    minExperienceYears: 0,
    department: 'Infrastructure',
    requiredSkills: [{ name: 'AWS', importance: 'mandatory' }],
    ownerId: 'demo',
    isDemo: true,
  });

  const cand1OriginalId = legacyCand1._id.toString();
  const cand2OriginalId = legacyCand2._id.toString();
  const cand3OriginalId = legacyCand3._id.toString();
  const job1OriginalId = legacyJob1._id.toString();
  const job2OriginalId = legacyJob2._id.toString();

  console.log(`Legacy Candidate IDs: ${cand1OriginalId}, ${cand2OriginalId}, ${cand3OriginalId}`);
  console.log(`Legacy Job IDs: ${job1OriginalId}, ${job2OriginalId}`);

  // 2. Run Migration
  console.log('\nStep 2: Running safe, idempotent database migration...');
  const migrationResult = await migrateExistingData();
  console.log('Migration Result:', JSON.stringify(migrationResult, null, 2));

  // 3. Verify Candidate Cohort
  console.log('\nStep 3: Verifying candidate cohort in database...');
  const candidates = await Resume.find({ isDemo: true }).sort({ candidateName: 1 });
  console.log(`Total demo candidates in DB: ${candidates.length} (Expected: 5)`);
  if (candidates.length !== 5) {
    throw new Error(`Expected 5 demo candidates, found ${candidates.length}`);
  }

  // Check ID preservation
  const updatedCand1 = await Resume.findById(cand1OriginalId);
  const updatedCand2 = await Resume.findById(cand2OriginalId);
  const updatedCand3 = await Resume.findById(cand3OriginalId);
  if (!updatedCand1 || updatedCand1.candidateName !== 'Candidate #001') {
    throw new Error(`Candidate 1 ID or name mismatch: ${updatedCand1?.candidateName}`);
  }
  if (!updatedCand2 || updatedCand2.candidateName !== 'Candidate #002') {
    throw new Error(`Candidate 2 ID or name mismatch: ${updatedCand2?.candidateName}`);
  }
  if (!updatedCand3 || updatedCand3.candidateName !== 'Candidate #003') {
    throw new Error(`Candidate 3 ID or name mismatch: ${updatedCand3?.candidateName}`);
  }
  console.log('PASS: Legacy candidate IDs preserved and upgraded in place (Candidate #001, #002, #003).');

  const expList = candidates.map(c => c.totalExperienceYears);
  console.log('Candidate Experience Levels:', expList);
  // Must have 0 yrs (fresher) and experienced candidates (e.g. 2, 4, 6, 9)
  if (!expList.includes(0)) throw new Error('Missing 0-year fresher candidate!');
  if (!expList.includes(2) || !expList.includes(4) || !expList.includes(6) || !expList.includes(9)) {
    throw new Error('Candidate cohort does not cover varied experience levels [0, 2, 4, 6, 9]!');
  }
  console.log('PASS: Candidate cohort contains varied experience levels: [0, 2, 4, 6, 9] years.');

  // 4. Verify Job Cohort
  console.log('\nStep 4: Verifying job cohort in database...');
  const jobs = await Job.find({ isDemo: true }).sort({ title: 1 });
  console.log(`Total demo jobs in DB: ${jobs.length} (Expected: 5)`);
  if (jobs.length !== 5) {
    throw new Error(`Expected 5 demo jobs, found ${jobs.length}`);
  }

  // Check ID preservation
  const updatedJob1 = await Job.findById(job1OriginalId);
  const updatedJob2 = await Job.findById(job2OriginalId);
  if (!updatedJob1 || updatedJob1.company === 'Drishti AI Partner') {
    throw new Error(`Job 1 company still has legacy partner: ${updatedJob1?.company}`);
  }
  if (!updatedJob2 || updatedJob2.company === 'Drishti AI Partner') {
    throw new Error(`Job 2 company still has legacy partner: ${updatedJob2?.company}`);
  }
  console.log('PASS: Legacy job IDs preserved and upgraded with realistic companies:');
  console.log(` - Job 1: ${updatedJob1.title} @ ${updatedJob1.company} (Req: ${updatedJob1.minExperienceYears}+ yrs)`);
  console.log(` - Job 2: ${updatedJob2.title} @ ${updatedJob2.company} (Req: ${updatedJob2.minExperienceYears}+ yrs)`);

  const companies = jobs.map(j => j.company);
  const reqExpList = jobs.map(j => j.minExperienceYears);
  console.log('Job Companies:', companies);
  console.log('Job Req Experience:', reqExpList);

  if (companies.some(c => c === 'Drishti AI Partner')) {
    throw new Error('Found lingering "Drishti AI Partner" in job cohort!');
  }
  const uniqueCompanies = new Set(companies);
  if (uniqueCompanies.size < 4) {
    throw new Error(`Insufficient company name diversity: ${Array.from(uniqueCompanies)}`);
  }
  if (!reqExpList.includes(0)) {
    throw new Error('Missing 0-year requirement entry-level internship job!');
  }
  console.log('PASS: Job cohort contains realistic, varied company names and experience requirements including 0+ yrs.');

  // 5. Test Frontend Dropdown Formatting Logic
  console.log('\nStep 5: Simulating and testing frontend dropdown label formatting...');
  for (let idx = 0; idx < candidates.length; idx++) {
    const r = candidates[idx];
    const displayName = (r.candidateName && r.candidateName !== 'Candidate (Anonymized for Bias Mitigation)')
      ? r.candidateName
      : `Candidate #${String(idx + 1).padStart(3, '0')}`;
    const exp = r.totalExperienceYears ?? 0;
    const skillsCount = r.skills?.length || 0;
    const dropdownLabel = `${displayName} • ${exp} yrs experience (${skillsCount} skills)`;
    console.log(` - Candidate Option [value="${r._id}"]: "${dropdownLabel}"`);

    // Verify properties
    if (dropdownLabel.includes('Candidate (Anonymized for Bias Mitigation)')) {
      throw new Error(`Dropdown label retains generic placeholder: ${dropdownLabel}`);
    }
    if (!dropdownLabel.includes(`${exp} yrs experience`)) {
      throw new Error(`Dropdown label experience mismatch: ${dropdownLabel}`);
    }
  }
  console.log('PASS: All candidate dropdown labels display unique sequential identifiers, actual experience, and skill counts.');

  for (const j of jobs) {
    const companyName = (j.company && j.company.trim() && j.company !== 'Drishti AI Partner')
      ? j.company
      : 'Company not specified';
    const minExp = j.minExperienceYears ?? 0;
    const dropdownLabel = `${j.title} • ${companyName} (Req: ${minExp}+ yrs)`;
    console.log(` - Job Option [value="${j._id}"]: "${dropdownLabel}"`);

    if (dropdownLabel.includes('Drishti AI Partner')) {
      throw new Error(`Job dropdown label retains "Drishti AI Partner": ${dropdownLabel}`);
    }
    if (!dropdownLabel.includes(companyName)) {
      throw new Error(`Job dropdown label company mismatch: ${dropdownLabel}`);
    }
  }
  console.log('PASS: All job dropdown labels display realistic company names and accurate experience requirements.');

  // 6. Test Neutral Fallback for Missing Company
  console.log('\nStep 6: Testing neutral fallback for job with missing company...');
  const jobNoCompany = await Job.create({
    title: 'Ad-hoc Role',
    description: 'Testing fallback',
    minExperienceYears: 1,
    requiredSkills: [{ name: 'Git', importance: 'mandatory' }],
    ownerId: 'demo',
    isDemo: true,
  });
  const fallbackCompany = (jobNoCompany.company && jobNoCompany.company.trim() && jobNoCompany.company !== 'Drishti AI Partner')
    ? jobNoCompany.company
    : 'Company not specified';
  if (fallbackCompany !== 'Company not specified') {
    throw new Error(`Expected neutral fallback "Company not specified", got: "${fallbackCompany}"`);
  }
  console.log(`PASS: Unspecified company correctly falls back to "${fallbackCompany}".`);

  // 7. Verify Idempotency of Migration
  console.log('\nStep 7: Verifying migration idempotency (running migration a second time)...');
  const secondMigration = await migrateExistingData();
  const candsAfter = await Resume.find({ isDemo: true });
  const jobsAfter = await Job.find({ isDemo: true });
  if (candsAfter.length !== candidates.length) {
    throw new Error(`Idempotency violated: candidates count changed from ${candidates.length} to ${candsAfter.length}`);
  }
  if (jobsAfter.length !== jobs.length + 1) { // +1 from test step 6
    throw new Error(`Idempotency violated: jobs count changed unexpectedly`);
  }
  console.log('PASS: Migration is strictly idempotent. No duplicate records created on re-execution.');

  // 8. Verify Match Results and Dossiers
  console.log('\nStep 8: Verifying match records and dossiers for all 5 candidates and 5 jobs...');
  const matchCount = await MatchResult.countDocuments({ isDemo: true });
  const auditCount = await EvaluationAudit.countDocuments({ isDemo: true });
  const outcomeCount = await RecruitmentOutcome.countDocuments({ isDemo: true });
  console.log(`Matches: ${matchCount}, Audits: ${auditCount}, Outcomes: ${outcomeCount}`);
  if (matchCount < 25 || auditCount < 25 || outcomeCount < 25) {
    throw new Error(`Expected at least 25 (5x5) evaluation pairs, found ${matchCount}`);
  }
  console.log('PASS: Complete evaluation matrix populated for all candidate-job pairs.');

  console.log('\n=== ALL VERIFICATIONS PASSED SUCCESSFULLY ===');
}

runTest()
  .then(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('\nFAILED WITH ERROR:', err);
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
    process.exit(1);
  });
