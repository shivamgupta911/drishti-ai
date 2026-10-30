import Resume from '../models/Resume.js';
import Job from '../models/Job.js';
import MatchResult from '../models/MatchResult.js';
import EvaluationAudit from '../models/EvaluationAudit.js';
import RecruitmentOutcome from '../models/RecruitmentOutcome.js';
import User from '../models/User.js';
import { evaluateMatch } from '../services/matcher.service.js';
import { buildEvidenceDossier } from '../services/evidence.service.js';

/**
 * Drishti AI - Safe Data Migration & Tenancy Isolation Engine
 *
 * Scans all collections for unowned or legacy records:
 * 1. Categorizes synthetic demo records as public demo data (ownerId: 'demo', isDemo: true, quarantined: false).
 * 2. Normalizes legacy demo candidate names and job company names safely and idempotently.
 * 3. Ensures complete 5-candidate and 5-job sample cohorts with varied experience levels and realistic companies.
 * 4. Any records whose ownership cannot be proven are placed into QUARANTINE (quarantined: true, isDemo: false),
 *    ensuring they are never exposed to public demo visitors or cross-tenant private queries.
 * 5. Does not alter or delete existing user data.
 */
export async function migrateExistingData() {
  try {
    const demoCandidateNames = [
      'Candidate Alpha (Anonymized)',
      'Candidate Beta (Anonymized)',
      'Candidate Gamma (Anonymized)',
      'Candidate #001',
      'Candidate #002',
      'Candidate #003',
      'Candidate #004',
      'Candidate #005',
    ];

    const demoJobTitles = [
      'Full-Stack Software Engineer',
      'Cloud DevOps Specialist',
      'Senior Cloud & DevOps Specialist',
      'Frontend React Developer',
      'Junior Software Engineering Intern',
      'Principal Platform Architect',
    ];

    // 1. Resumes Migration
    const unownedResumes = await Resume.find({
      $or: [{ ownerId: { $exists: false } }, { ownerId: null }, { ownerId: '' }],
    });

    for (const r of unownedResumes) {
      if (demoCandidateNames.includes(r.candidateName)) {
        r.ownerId = 'demo';
        r.isDemo = true;
        r.quarantined = false;
      } else {
        r.ownerId = 'quarantine';
        r.isDemo = false;
        r.quarantined = true;
      }
      await r.save();
    }

    // 2. Jobs Migration
    const unownedJobs = await Job.find({
      $or: [{ ownerId: { $exists: false } }, { ownerId: null }, { ownerId: '' }],
    });

    for (const j of unownedJobs) {
      if (demoJobTitles.includes(j.title)) {
        j.ownerId = 'demo';
        j.isDemo = true;
        j.quarantined = false;
      } else {
        j.ownerId = 'quarantine';
        j.isDemo = false;
        j.quarantined = true;
      }
      await j.save();
    }

    // 3. MatchResults Migration
    const unownedMatches = await MatchResult.find({
      $or: [{ ownerId: { $exists: false } }, { ownerId: null }, { ownerId: '' }],
    });

    for (const m of unownedMatches) {
      const resume = await Resume.findById(m.resumeId);
      if (resume && resume.isDemo) {
        m.ownerId = 'demo';
        m.isDemo = true;
        m.quarantined = false;
      } else {
        m.ownerId = resume ? resume.ownerId : 'quarantine';
        m.isDemo = false;
        m.quarantined = !resume || resume.quarantined;
      }
      await m.save();
    }

    // 4. EvaluationAudits Migration
    const unownedAudits = await EvaluationAudit.find({
      $or: [{ ownerId: { $exists: false } }, { ownerId: null }, { ownerId: '' }],
    });

    for (const a of unownedAudits) {
      const resume = await Resume.findById(a.resumeId);
      if (resume && resume.isDemo) {
        a.ownerId = 'demo';
        a.isDemo = true;
        a.quarantined = false;
      } else {
        a.ownerId = resume ? resume.ownerId : 'quarantine';
        a.isDemo = false;
        a.quarantined = !resume || resume.quarantined;
      }
      await a.save();
    }

    // 5. Outcomes Migration
    const unownedOutcomes = await RecruitmentOutcome.find({
      $or: [{ ownerId: { $exists: false } }, { ownerId: null }, { ownerId: '' }],
    });

    for (const o of unownedOutcomes) {
      const resume = await Resume.findById(o.resumeId);
      if (resume && resume.isDemo) {
        o.ownerId = 'demo';
        o.isDemo = true;
        o.quarantined = false;
      } else {
        o.ownerId = resume ? resume.ownerId : 'quarantine';
        o.isDemo = false;
        o.quarantined = !resume || resume.quarantined;
      }
      await o.save();
    }

    // 6. Safe, Idempotent Normalization & Cohort Completion
    await ensureSampleDemoDataset();

    const soleAdminResult = await provisionSoleAdministrator();

    return {
      success: true,
      migratedResumes: unownedResumes.length,
      migratedJobs: unownedJobs.length,
      migratedMatches: unownedMatches.length,
      migratedAudits: unownedAudits.length,
      migratedOutcomes: unownedOutcomes.length,
      soleAdmin: soleAdminResult,
    };
  } catch (err) {
    console.error('[Migration Error]', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Idempotently normalizes legacy demo candidate and job records in place,
 * replacing 'Drishti AI Partner' with neutral fallbacks or realistic company names,
 * and ensuring at least 5 sample candidates and 5 sample jobs exist with varied experience levels.
 */
async function ensureSampleDemoDataset() {
  // 1. Update legacy demo candidate names in place
  const legacyCandidateUpdates = [
    { match: /Candidate Alpha/i, newName: 'Candidate #001', email: 'candidate_001@masked.drishti.ai', exp: 4 },
    { match: /Candidate Beta/i, newName: 'Candidate #002', email: 'candidate_002@masked.drishti.ai', exp: 2 },
    { match: /Candidate Gamma/i, newName: 'Candidate #003', email: 'candidate_003@masked.drishti.ai', exp: 6 },
  ];
  for (const item of legacyCandidateUpdates) {
    const existing = await Resume.findOne({ candidateName: item.match, isDemo: true });
    if (existing) {
      const prevName = existing.candidateName;
      existing.candidateName = item.newName;
      existing.email = item.email;
      existing.totalExperienceYears = item.exp;
      await existing.save();
      console.log(`[Migration] Updated legacy candidate '${prevName}' -> '${item.newName}' (ID: ${existing._id})`);
    }
  }

  // 2. Update legacy demo job companies and requirements in place
  const legacyJobUpdates = [
    { title: 'Full-Stack Software Engineer', company: 'NexTech Cloud Systems', minExp: 3 },
    { title: 'Cloud DevOps Specialist', company: 'TerraScale Infrastructure', minExp: 5 },
    { title: 'Senior Cloud & DevOps Specialist', company: 'TerraScale Infrastructure', minExp: 5 },
  ];
  for (const item of legacyJobUpdates) {
    const existingJob = await Job.findOne({ title: item.title, isDemo: true });
    if (existingJob) {
      let changed = false;
      if (!existingJob.company || existingJob.company.includes('Drishti') || existingJob.company === 'Company not specified' || existingJob.company === 'Drishti AI Partner') {
        existingJob.company = item.company;
        changed = true;
      }
      if (existingJob.minExperienceYears === 0 && item.minExp > 0) {
        existingJob.minExperienceYears = item.minExp;
        changed = true;
      }
      if (changed) {
        await existingJob.save();
        console.log(`[Migration] Updated demo job '${item.title}' company -> '${existingJob.company}', req: ${existingJob.minExperienceYears}+ yrs (ID: ${existingJob._id})`);
      }
    }
  }

  // 3. Neutralize any lingering 'Drishti AI Partner' in all jobs
  await Job.updateMany(
    { company: 'Drishti AI Partner' },
    { $set: { company: 'Company not specified' } }
  );

  // 4. Ensure Candidate #004 (Fresher / Intern - 0 yrs) exists in demo
  let cand4 = await Resume.findOne({ candidateName: 'Candidate #004', isDemo: true });
  if (!cand4) {
    cand4 = await Resume.create({
      candidateName: 'Candidate #004',
      email: 'candidate_004@masked.drishti.ai',
      phone: '***-***-****',
      summary: 'Recent Computer Science graduate with hands-on coursework and academic projects in Python, JavaScript, and SQL. Seeking entry-level engineering roles and internships.',
      totalExperienceYears: 0,
      skills: [
        { name: 'Python', category: 'Languages' },
        { name: 'JavaScript', category: 'Languages' },
        { name: 'HTML', category: 'Languages' },
        { name: 'CSS', category: 'Languages' },
        { name: 'SQL', category: 'Databases' },
        { name: 'Git', category: 'Cloud / DevOps' },
      ],
      experience: [],
      education: [
        {
          degree: 'Bachelor of Technology in Computer Science',
          institution: 'National Institute of Technology',
          graduationYear: 2026,
        },
      ],
      anonymized: true,
      ownerId: 'demo',
      isDemo: true,
      quarantined: false,
    });
    console.log(`[Migration] Created sample demo Candidate #004 (0 yrs exp, ID: ${cand4._id})`);
  }

  // 5. Ensure Candidate #005 (Principal Platform Architect - 9 yrs) exists in demo
  let cand5 = await Resume.findOne({ candidateName: 'Candidate #005', isDemo: true });
  if (!cand5) {
    cand5 = await Resume.create({
      candidateName: 'Candidate #005',
      email: 'candidate_005@masked.drishti.ai',
      phone: '***-***-****',
      summary: 'Principal Platform Architect with 9 years of enterprise experience designing distributed cloud systems, Kubernetes microservices, and high-throughput data pipelines.',
      totalExperienceYears: 9,
      skills: [
        { name: 'Kubernetes', category: 'Cloud / DevOps' },
        { name: 'AWS', category: 'Cloud / DevOps' },
        { name: 'Docker', category: 'Cloud / DevOps' },
        { name: 'Terraform', category: 'Cloud / DevOps' },
        { name: 'Microservices', category: 'Cloud / DevOps' },
        { name: 'Python', category: 'Languages' },
        { name: 'Go', category: 'Languages' },
        { name: 'Linux', category: 'Cloud / DevOps' },
        { name: 'CI/CD', category: 'Cloud / DevOps' },
        { name: 'PostgreSQL', category: 'Databases' },
      ],
      experience: [
        {
          title: 'Principal Architect',
          company: 'Global Cloud Systems',
          durationMonths: 60,
          description: 'Led architecture for core platform microservices handling 50k+ req/sec on Kubernetes and AWS.',
          technologies: ['Kubernetes', 'AWS', 'Go', 'Microservices'],
        },
      ],
      education: [
        {
          degree: 'Master of Technology in Software Systems',
          institution: 'State University of Technology',
          graduationYear: 2017,
        },
      ],
      anonymized: true,
      ownerId: 'demo',
      isDemo: true,
      quarantined: false,
    });
    console.log(`[Migration] Created sample demo Candidate #005 (9 yrs exp, ID: ${cand5._id})`);
  }

  // 6. Ensure Job 3 (Frontend React Developer - 2 yrs) exists in demo
  let job3 = await Job.findOne({ title: 'Frontend React Developer', isDemo: true });
  if (!job3) {
    job3 = await Job.create({
      title: 'Frontend React Developer',
      company: 'Apex Digital Labs',
      department: 'Product Engineering',
      description: 'Growing creative product team looking for a Frontend Developer skilled in React, Tailwind CSS, TypeScript, and modern responsive web standards. 2+ years experience required.',
      minExperienceYears: 2,
      requiredSkills: [
        { name: 'React', weight: 1.0, category: 'Core' },
        { name: 'JavaScript', weight: 1.0, category: 'Core' },
        { name: 'HTML', weight: 1.0, category: 'Core' },
        { name: 'CSS', weight: 1.0, category: 'Core' },
        { name: 'Tailwind', weight: 1.0, category: 'Core' },
      ],
      preferredSkills: [
        { name: 'TypeScript', weight: 0.5, category: 'Bonus' },
        { name: 'Git', weight: 0.5, category: 'Bonus' },
      ],
      educationRequirement: 'B.S. / B.Tech or equivalent practical experience',
      responsibilities: [
        'Build engaging, accessible user interfaces with React and Tailwind CSS.',
        'Collaborate with design and product teams on responsive client features.',
      ],
      ownerId: 'demo',
      isDemo: true,
      quarantined: false,
    });
    console.log(`[Migration] Created sample demo Job 3: Frontend React Developer (Apex Digital Labs, ID: ${job3._id})`);
  }

  // 7. Ensure Job 4 (Junior Software Engineering Intern - 0 yrs) exists in demo
  let job4 = await Job.findOne({ title: 'Junior Software Engineering Intern', isDemo: true });
  if (!job4) {
    job4 = await Job.create({
      title: 'Junior Software Engineering Intern',
      company: 'InnoWave Technologies',
      department: 'Talent Incubator',
      description: 'Entry-level software engineering internship for fresh graduates and students. Learn professional software development in Python, JavaScript, and SQL with hands-on mentorship. No prior experience required.',
      minExperienceYears: 0,
      requiredSkills: [
        { name: 'Python', weight: 1.0, category: 'Core' },
        { name: 'JavaScript', weight: 1.0, category: 'Core' },
        { name: 'Git', weight: 1.0, category: 'Core' },
        { name: 'SQL', weight: 1.0, category: 'Core' },
      ],
      preferredSkills: [
        { name: 'HTML', weight: 0.5, category: 'Bonus' },
        { name: 'CSS', weight: 0.5, category: 'Bonus' },
      ],
      educationRequirement: 'Enrolled in or recent graduate of B.S. / B.Tech Computer Science or related degree',
      responsibilities: [
        'Participate in code reviews, feature implementation, and automated test writing.',
        'Learn modern software engineering workflows in a supportive team environment.',
      ],
      ownerId: 'demo',
      isDemo: true,
      quarantined: false,
    });
    console.log(`[Migration] Created sample demo Job 4: Junior Software Engineering Intern (InnoWave Technologies, 0 yrs, ID: ${job4._id})`);
  }

  // 8. Ensure Job 5 (Principal Platform Architect - 8 yrs) exists in demo
  let job5 = await Job.findOne({ title: 'Principal Platform Architect', isDemo: true });
  if (!job5) {
    job5 = await Job.create({
      title: 'Principal Platform Architect',
      company: 'CyberCore Dynamics',
      department: 'Enterprise Architecture',
      description: 'Enterprise platform leadership role responsible for distributed microservices, event streaming architectures, Kubernetes orchestration, and cloud reliability at scale. 8+ years required.',
      minExperienceYears: 8,
      requiredSkills: [
        { name: 'Kubernetes', weight: 1.0, category: 'Core' },
        { name: 'AWS', weight: 1.0, category: 'Core' },
        { name: 'Microservices', weight: 1.0, category: 'Core' },
        { name: 'Python', weight: 1.0, category: 'Core' },
        { name: 'Docker', weight: 1.0, category: 'Core' },
      ],
      preferredSkills: [
        { name: 'Go', weight: 0.5, category: 'Bonus' },
        { name: 'Terraform', weight: 0.5, category: 'Bonus' },
        { name: 'CI/CD', weight: 0.5, category: 'Bonus' },
        { name: 'PostgreSQL', weight: 0.5, category: 'Bonus' },
      ],
      educationRequirement: 'Master degree in Computer Science or equivalent senior enterprise experience',
      responsibilities: [
        'Define long-term architectural vision for cloud platforms and microservice infrastructure.',
        'Set engineering standards for high availability, security, and developer velocity.',
      ],
      ownerId: 'demo',
      isDemo: true,
      quarantined: false,
    });
    console.log(`[Migration] Created sample demo Job 5: Principal Platform Architect (CyberCore Dynamics, ID: ${job5._id})`);
  }

  // 9. Ensure evaluations and outcomes exist for sample pairs
  const allDemoResumes = await Resume.find({ isDemo: true, ownerId: 'demo' });
  const allDemoJobs = await Job.find({ isDemo: true, ownerId: 'demo' });
  const recruiter = await User.findOne({ email: 'recruiter@drishti.ai' });
  const recorder = recruiter ? {
    userId: recruiter._id.toString(),
    userName: recruiter.name,
    userRole: recruiter.role,
  } : {
    userId: 'demo',
    userName: 'Sarah Connor',
    userRole: 'recruiter',
  };

  for (const r of allDemoResumes) {
    for (const j of allDemoJobs) {
      const existingMatch = await MatchResult.findOne({ resumeId: r._id, jobId: j._id, isDemo: true });
      if (!existingMatch) {
        const evalData = evaluateMatch(r, j);
        const evidenceTraces = buildEvidenceDossier(r, j, evalData);
        evalData.evidenceTraces = evidenceTraces;

        const matchRecord = await MatchResult.create({
          resumeId: r._id,
          jobId: j._id,
          ownerId: 'demo',
          isDemo: true,
          quarantined: false,
          ...evalData,
        });

        await EvaluationAudit.create({
          evaluationId: `EVAL-${matchRecord._id.toString().substring(18).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`,
          matchResultId: matchRecord._id,
          resumeId: r._id,
          jobId: j._id,
          overallScore: evalData.overallScore,
          tier: evalData.tier,
          componentScores: evalData.breakdown,
          exactMatches: evalData.exactMatches,
          synonymMatches: evalData.synonymMatches,
          affinityMatches: evalData.affinityMatches,
          missingRequiredSkills: evalData.missingRequiredSkills,
          evidenceTraces,
          ownerId: 'demo',
          isDemo: true,
          quarantined: false,
        });

        await RecruitmentOutcome.create({
          resumeId: r._id,
          jobId: j._id,
          matchResultId: matchRecord._id,
          stage: evalData.overallScore >= 80 ? 'shortlisted' : evalData.overallScore >= 60 ? 'interviewed' : 'pending',
          predictedScore: evalData.overallScore,
          predictedTier: evalData.tier,
          recruiterFeedback: {
            technicalCompetencyRating: Math.max(1, Math.min(5, Math.round(evalData.overallScore / 20))),
            culturalAlignmentRating: 4,
            notes: `Evaluated for ${j.title}. Compatibility: ${evalData.overallScore}%.`,
          },
          recordedBy: recorder,
          ownerId: 'demo',
          isDemo: true,
          quarantined: false,
        });
      }
    }
  }
}

/**
 * Safe, Idempotent Administrator Status & Controlled Provisioning Hook
 *
 * Rules:
 * 1. Audits and logs current administrator accounts and the designated target account.
 * 2. ADMIN_EMAIL alone does NOT silently promote an unverified or unintended account on startup.
 *    Promotion requires explicit confirmation via ADMIN_PROVISION_CONFIRMED=true and verification
 *    against ADMIN_VERIFIED_USER_ID if configured.
 * 3. Never auto-creates accounts, hardcodes passwords, or exposes bootstrap endpoints.
 * 4. Fails safely if the account is missing, inactive, unverified, or unapproved.
 * 5. Does NOT automatically demote existing administrator accounts without explicit approval
 *    (ADMIN_DEMOTE_APPROVED=true).
 */
export async function provisionSoleAdministrator() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.toLowerCase().trim() : null;
    if (!adminEmail) {
      console.log('[Sole Admin Audit] No ADMIN_EMAIL configured in environment. Skipping administrator role audit.');
      return { status: 'skipped', reason: 'ADMIN_EMAIL not configured' };
    }

    // 1. Audit existing administrator accounts in the database
    const existingAdmins = await User.find({ role: 'admin' });
    if (existingAdmins.length > 0) {
      console.log(`[Sole Admin Audit] Current accounts with 'admin' role (${existingAdmins.length}):`);
      for (const a of existingAdmins) {
        console.log(` - Email: ${a.email}, ID: ${a._id}, Active: ${a.isActive}, CreatedAt: ${a.createdAt}`);
      }
    } else {
      console.log("[Sole Admin Audit] Zero accounts currently hold the 'admin' role.");
    }

    // 2. Locate the designated target account in the database
    const targetUser = await User.findOne({ email: adminEmail });
    if (!targetUser) {
      console.warn(
        `[Sole Admin Audit] Intended administrator account '${adminEmail}' does not exist in the database yet. ` +
        `Waiting for user registration. No accounts were promoted.`
      );
      return { status: 'account_not_found', email: adminEmail };
    }

    console.log(
      `[Sole Admin Audit] Intended administrator account located: ${targetUser.email} ` +
      `(ID: ${targetUser._id}, Current Role: '${targetUser.role}', Active: ${targetUser.isActive}, Verified: ${targetUser.isVerified})`
    );

    // 3. Validate account status and credentials
    if (targetUser.isActive === false) {
      console.warn(
        `[Sole Admin Provisioning] Target account '${adminEmail}' (ID: ${targetUser._id}) is deactivated. ` +
        `Promotion aborted.`
      );
      return { status: 'account_inactive', email: adminEmail };
    }

    if (!targetUser.passwordHash || !targetUser.salt) {
      console.warn(
        `[Sole Admin Provisioning] Target account '${adminEmail}' lacks valid credentials. ` +
        `Promotion aborted.`
      );
      return { status: 'account_unverified', email: adminEmail };
    }

    // 4. Require explicit confirmation before promotion: ADMIN_EMAIL alone must not silently promote
    const isProvisionConfirmed = process.env.ADMIN_PROVISION_CONFIRMED === 'true';
    if (!isProvisionConfirmed && targetUser.role !== 'admin') {
      console.log(
        `[Sole Admin Audit] Administrator promotion for ${targetUser.email} (ID: ${targetUser._id}) ` +
        `is awaiting explicit approval (set ADMIN_PROVISION_CONFIRMED=true to execute). No roles modified.`
      );
      return {
        status: 'pending_approval',
        targetUser: targetUser.toSafeObject(),
        existingAdmins: existingAdmins.map((a) => a.toSafeObject()),
      };
    }

    // 5. Verify database ID match if ADMIN_VERIFIED_USER_ID is provided
    if (process.env.ADMIN_VERIFIED_USER_ID) {
      const verifiedId = process.env.ADMIN_VERIFIED_USER_ID.trim();
      if (targetUser._id.toString() !== verifiedId) {
        console.warn(
          `[Sole Admin Provisioning] Security ID mismatch: configured ADMIN_VERIFIED_USER_ID (${verifiedId}) ` +
          `does not match database account ID (${targetUser._id}). Promotion aborted for safety.`
        );
        return { status: 'id_mismatch', expectedId: verifiedId, actualId: targetUser._id.toString() };
      }
    }

    // 6. Handle other administrator accounts: require explicit approval before demoting
    const otherAdmins = existingAdmins.filter((a) => a._id.toString() !== targetUser._id.toString());
    const demotedList = [];

    if (otherAdmins.length > 0) {
      const isDemoteApproved = process.env.ADMIN_DEMOTE_APPROVED === 'true';
      if (isDemoteApproved) {
        console.log(`[Sole Admin Provisioning] Executing approved demotion for ${otherAdmins.length} unauthorized admin account(s):`);
        for (const admin of otherAdmins) {
          console.log(` - Demoting ${admin.email} (ID: ${admin._id}) to recruiter`);
          admin.role = 'recruiter';
          await admin.save();
          demotedList.push({ id: admin._id.toString(), email: admin.email });
        }
      } else {
        console.warn(
          `[Sole Admin Warning] ${otherAdmins.length} other account(s) hold the 'admin' role. ` +
          `Automatic demotion was not executed (requires explicit ADMIN_DEMOTE_APPROVED=true).`
        );
      }
    }

    // 7. Promote target user to sole administrator
    const wasAlreadyAdmin = targetUser.role === 'admin';
    if (!wasAlreadyAdmin) {
      targetUser.role = 'admin';
    }
    targetUser.isVerified = true;
    await targetUser.save();

    console.log(
      `[Sole Admin Provisioning] Confirmed ${targetUser.email} (ID: ${targetUser._id}) as verified administrator. ` +
      `(demoted other admins: ${demotedList.length})`
    );

    return {
      status: 'success',
      adminId: targetUser._id.toString(),
      adminEmail: targetUser.email,
      wasAlreadyAdmin,
      demotedAdmins: demotedList,
      pendingOtherAdmins: otherAdmins.length - demotedList.length,
    };
  } catch (err) {
    console.error('[Sole Admin Provisioning Error]', err.message);
    return { status: 'error', error: err.message };
  }
}
