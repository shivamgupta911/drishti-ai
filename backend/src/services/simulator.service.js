import { evaluateSkillAgainstRequirement } from './taxonomy.service.js';
import { computeSemanticVectorMatch } from './embedding.service.js';

/**
 * Drishti AI - What-If Hiring Simulator Service
 * Executes deterministic, in-memory scenario simulations with adjustable component weights,
 * requirement reclassifications, and tenure thresholds without modifying stored records.
 */

export function simulateHiringScenario(resumes = [], job, scenarioConfig = {}) {
  if (!job) {
    throw new Error('A baseline job requisition is required for scenario simulation.');
  }

  const {
    weights = { skillsWeight: 0.60, experienceWeight: 0.20, semanticWeight: 0.15, preferredWeight: 0.05 },
    minExperienceOverride = null,
    mandatorySkillsOverride = null, // Array of skill names designated mandatory
    preferredSkillsOverride = null, // Array of skill names designated preferred
  } = scenarioConfig;

  // 1. Validate Weights Sum to 1.0 (with 0.01 tolerance for floating point)
  const sumWeights =
    (weights.skillsWeight || 0) +
    (weights.experienceWeight || 0) +
    (weights.semanticWeight || 0) +
    (weights.preferredWeight || 0);

  if (Math.abs(sumWeights - 1.0) > 0.02) {
    throw new Error(
      `Scenario component weights must sum to exactly 100% (1.0). Current sum: ${Math.round(sumWeights * 100)}%.`
    );
  }

  // 2. Formulate Simulated Job Specification
  const activeMinYears = minExperienceOverride !== null ? Number(minExperienceOverride) : job.minExperienceYears;

  const baseRequired = (job.requiredSkills || []).map((s) => (typeof s === 'string' ? s : s.name));
  const basePreferred = (job.preferredSkills || []).map((s) => (typeof s === 'string' ? s : s.name));
  const allKnownSkills = Array.from(new Set([...baseRequired, ...basePreferred]));

  const activeMandatory = Array.isArray(mandatorySkillsOverride)
    ? mandatorySkillsOverride
    : baseRequired;

  const activePreferred = Array.isArray(preferredSkillsOverride)
    ? preferredSkillsOverride
    : basePreferred.filter((s) => !activeMandatory.includes(s));

  // 3. Score Each Candidate Under Original vs Simulated Configurations
  const simulations = resumes.map((resume) => {
    // --- Baseline Score (Original Rule) ---
    const origExpYears = job.minExperienceYears || 0;
    const candYears = resume.totalExperienceYears || 0;
    let origExpScore = 100;
    if (origExpYears > 0 && candYears < origExpYears) {
      origExpScore = Math.max(Math.round((candYears / origExpYears) * 100), 20);
    }

    let origEarnedSkills = 0;
    baseRequired.forEach((reqName) => {
      const res = evaluateSkillAgainstRequirement(resume.skills || [], reqName);
      if (res.matched) origEarnedSkills += res.score;
    });
    const origSkillsScore = baseRequired.length > 0 ? Math.round((origEarnedSkills / baseRequired.length) * 100) : 100;
    const origVector = computeSemanticVectorMatch(resume, job).vectorSimilarityScore;

    let origPrefEarned = 0;
    basePreferred.forEach((prefName) => {
      const res = evaluateSkillAgainstRequirement(resume.skills || [], prefName);
      if (res.matched) origPrefEarned += res.score;
    });
    const origPrefBonus = basePreferred.length > 0 ? Math.round((origPrefEarned / basePreferred.length) * 10) : 0;

    const originalOverallScore = Math.min(
      Math.max(
        Math.round(origSkillsScore * 0.60 + origVector * 0.15 + origExpScore * 0.20 + origPrefBonus),
        0
      ),
      100
    );

    // --- Simulated Score (New Scenario Rule) ---
    let simExpScore = 100;
    if (activeMinYears > 0 && candYears < activeMinYears) {
      simExpScore = Math.max(Math.round((candYears / activeMinYears) * 100), 20);
    }

    let simEarnedSkills = 0;
    const simMissing = [];
    activeMandatory.forEach((reqName) => {
      const res = evaluateSkillAgainstRequirement(resume.skills || [], reqName);
      if (res.matched) {
        simEarnedSkills += res.score;
      } else {
        simMissing.push(reqName);
      }
    });
    const simSkillsScore = activeMandatory.length > 0 ? Math.round((simEarnedSkills / activeMandatory.length) * 100) : 100;

    let simPrefEarned = 0;
    activePreferred.forEach((prefName) => {
      const res = evaluateSkillAgainstRequirement(resume.skills || [], prefName);
      if (res.matched) simPrefEarned += res.score;
    });
    const simPrefScore = activePreferred.length > 0 ? Math.round((simPrefEarned / activePreferred.length) * 100) : 100;

    const simulatedOverallScore = Math.min(
      Math.max(
        Math.round(
          simSkillsScore * weights.skillsWeight +
          simExpScore * weights.experienceWeight +
          origVector * weights.semanticWeight +
          simPrefScore * weights.preferredWeight
        ),
        0
      ),
      100
    );

    return {
      candidateId: resume._id,
      candidateName: resume.candidateName,
      totalExperienceYears: candYears,
      originalScore: originalOverallScore,
      simulatedScore: simulatedOverallScore,
      scoreDelta: simulatedOverallScore - originalOverallScore,
      components: {
        skillsScore: simSkillsScore,
        experienceScore: simExpScore,
        semanticScore: origVector,
        preferredScore: simPrefScore,
      },
      missingMandatory: simMissing,
    };
  });

  // 4. Assign Original Ranks
  simulations.sort((a, b) => b.originalScore - a.originalScore);
  simulations.forEach((c, idx) => {
    c.originalRank = idx + 1;
  });

  // 5. Assign Simulated Ranks & Compute Movement
  simulations.sort((a, b) => b.simulatedScore - a.simulatedScore);
  simulations.forEach((c, idx) => {
    c.simulatedRank = idx + 1;
    c.rankDelta = c.originalRank - c.simulatedRank; // Positive means moved up, negative down

    // Compute explicit reasons for rank & score shift
    const reasons = [];
    if (weights.skillsWeight > 0.60 && c.components.skillsScore >= 80) {
      reasons.push('Benefited from increased weighting on core mandatory skills.');
    } else if (weights.skillsWeight > 0.60 && c.components.skillsScore < 60) {
      reasons.push('Penalized by heavier weight on missing mandatory skills.');
    }

    if (weights.experienceWeight > 0.20 && c.totalExperienceYears >= activeMinYears) {
      reasons.push('Gained advantage from higher weight placed on verified tenure.');
    } else if (activeMinYears > job.minExperienceYears && c.totalExperienceYears < activeMinYears) {
      reasons.push(`Impacted by higher minimum experience threshold (${activeMinYears} yrs vs ${job.minExperienceYears} yrs).`);
    }

    if (c.scoreDelta !== 0 && reasons.length === 0) {
      reasons.push(
        c.scoreDelta > 0
          ? 'Realigned favorably with simulated priority matrix.'
          : 'Score adjusted downward due to updated requirement weights.'
      );
    }

    c.shiftExplanation = reasons.join(' ');
  });

  return {
    scenarioId: `SIM-${Date.now()}`,
    jobId: job._id,
    jobTitle: job.title,
    appliedConfig: {
      weights,
      minExperienceYears: activeMinYears,
      mandatorySkills: activeMandatory,
      preferredSkills: activePreferred,
      allAvailableSkills: allKnownSkills,
    },
    results: simulations,
    summary: {
      candidatesEvaluated: simulations.length,
      candidatesMovedUp: simulations.filter((c) => c.rankDelta > 0).length,
      candidatesMovedDown: simulations.filter((c) => c.rankDelta < 0).length,
      candidatesUnchanged: simulations.filter((c) => c.rankDelta === 0).length,
      topCandidateOriginal: simulations.find((c) => c.originalRank === 1)?.candidateName,
      topCandidateSimulated: simulations.find((c) => c.simulatedRank === 1)?.candidateName,
    },
  };
}
