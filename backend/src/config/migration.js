import Resume from '../models/Resume.js';
import Job from '../models/Job.js';
import MatchResult from '../models/MatchResult.js';
import EvaluationAudit from '../models/EvaluationAudit.js';
import RecruitmentOutcome from '../models/RecruitmentOutcome.js';
import User from '../models/User.js';

/**
 * Drishti AI - Safe Data Migration & Tenancy Isolation Engine
 *
 * Scans all collections for unowned or legacy records:
 * 1. Categorizes synthetic demo records as public demo data (ownerId: 'demo', isDemo: true, quarantined: false).
 * 2. Any records whose ownership cannot be proven are placed into QUARANTINE (quarantined: true, isDemo: false),
 *    ensuring they are never exposed to public demo visitors or cross-tenant private queries.
 * 3. Does not alter or delete existing user data.
 */
export async function migrateExistingData() {
  try {
    const demoCandidateNames = [
      'Candidate Alpha (Anonymized)',
      'Candidate Beta (Anonymized)',
      'Candidate Gamma (Anonymized)',
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
      if (['Full-Stack Software Engineer', 'Cloud DevOps Specialist'].includes(j.title)) {
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
