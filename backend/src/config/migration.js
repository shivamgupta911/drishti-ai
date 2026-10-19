import Resume from '../models/Resume.js';
import Job from '../models/Job.js';
import MatchResult from '../models/MatchResult.js';
import EvaluationAudit from '../models/EvaluationAudit.js';
import RecruitmentOutcome from '../models/RecruitmentOutcome.js';

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

    return {
      success: true,
      migratedResumes: unownedResumes.length,
      migratedJobs: unownedJobs.length,
      migratedMatches: unownedMatches.length,
      migratedAudits: unownedAudits.length,
      migratedOutcomes: unownedOutcomes.length,
    };
  } catch (err) {
    console.error('[Migration Error]', err.message);
    return { success: false, error: err.message };
  }
}
