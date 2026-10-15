import { evaluateSkillAgainstRequirement } from './taxonomy.service.js';

/**
 * Drishti AI - Explainable Matching Engine (Day 3 Edition)
 * Features semantic synonym resolution, domain affinity scoring, and cohort ranking.
 */

export function evaluateMatch(resume, job) {
  if (!resume || !job) {
    throw new Error('Both resume and job objects are required for match evaluation.');
  }

  const candidateSkills = resume.skills || [];

  // 1. Required Skills Evaluation with Semantic & Synonym Resolution
  const requiredSkills = job.requiredSkills || [];
  let totalRequiredWeight = 0;
  let earnedRequiredWeight = 0;

  const exactMatches = [];
  const synonymMatches = [];
  const affinityMatches = [];
  const missingRequiredSkills = [];
  const allResolvedSkills = [];

  requiredSkills.forEach((req) => {
    const name = typeof req === 'string' ? req : req.name;
    const weight = typeof req === 'object' && req.weight ? req.weight : 1.0;
    totalRequiredWeight += weight;

    const resolution = evaluateSkillAgainstRequirement(candidateSkills, name);
    allResolvedSkills.push(resolution);

    if (resolution.matched) {
      earnedRequiredWeight += weight * resolution.score;

      if (resolution.matchType === 'exact') {
        exactMatches.push(name);
      } else if (resolution.matchType === 'synonym') {
        synonymMatches.push({
          candidateTerm: resolution.matchedWith,
          targetTerm: name,
          attribution: resolution.attribution,
        });
      } else if (resolution.matchType === 'affinity') {
        affinityMatches.push({
          candidateTerm: resolution.matchedWith,
          targetTerm: name,
          affinityScore: resolution.score,
          domain: resolution.domain,
          attribution: resolution.attribution,
        });
      }
    } else {
      missingRequiredSkills.push(name);
    }
  });

  // Calculate normalized required skills score (0 - 100)
  const skillsMatchScore = totalRequiredWeight > 0
    ? Math.round((earnedRequiredWeight / totalRequiredWeight) * 100)
    : 100;

  // 2. Preferred Skills Evaluation (Bonus up to 10 points)
  const preferredSkills = job.preferredSkills || [];
  let totalPreferredWeight = 0;
  let earnedPreferredWeight = 0;
  const matchedPreferredSkills = [];
  const missingPreferredSkills = [];

  preferredSkills.forEach((pref) => {
    const name = typeof pref === 'string' ? pref : pref.name;
    const weight = typeof pref === 'object' && pref.weight ? pref.weight : 0.5;
    totalPreferredWeight += weight;

    const resolution = evaluateSkillAgainstRequirement(candidateSkills, name);
    if (resolution.matched) {
      earnedPreferredWeight += weight * resolution.score;
      matchedPreferredSkills.push(resolution.matchedWith || name);
    } else {
      missingPreferredSkills.push(name);
    }
  });

  const preferredSkillsBonus = totalPreferredWeight > 0
    ? Math.round((earnedPreferredWeight / totalPreferredWeight) * 10)
    : 0;

  // 3. Experience Duration Alignment
  const candidateYears = resume.totalExperienceYears || 0;
  const requiredYears = job.minExperienceYears || 0;
  const differenceYears = candidateYears - requiredYears;

  let experienceMatchScore = 100;
  let experienceStatus = 'meets';

  if (requiredYears === 0) {
    experienceMatchScore = 100;
    experienceStatus = 'meets';
  } else if (candidateYears >= requiredYears) {
    experienceMatchScore = 100;
    experienceStatus = candidateYears > requiredYears ? 'exceeds' : 'meets';
  } else {
    experienceStatus = 'under';
    experienceMatchScore = Math.max(Math.round((candidateYears / requiredYears) * 100), 20);
  }

  // 4. Overall Weighted Score (65% Skills, 25% Experience, + up to 10% Preferred Bonus)
  const rawOverall = Math.round(
    skillsMatchScore * 0.65 + experienceMatchScore * 0.25 + preferredSkillsBonus
  );
  const overallScore = Math.min(Math.max(rawOverall, 0), 100);

  // 5. Plain-English Explainability Narrative
  const strengths = [];
  const gaps = [];
  const scoringRationale = [];

  // Exact Matches
  if (exactMatches.length > 0) {
    strengths.push(`Direct exact match for ${exactMatches.length} core required skills: ${exactMatches.join(', ')}.`);
  }

  // Synonym Matches
  if (synonymMatches.length > 0) {
    synonymMatches.forEach((sm) => {
      strengths.push(`Semantic Synonym: Candidate term '${sm.candidateTerm}' mapped to mandatory '${sm.targetTerm}'.`);
    });
  }

  // Affinity Matches
  if (affinityMatches.length > 0) {
    affinityMatches.forEach((am) => {
      strengths.push(`Domain Affinity: '${am.candidateTerm}' credited toward '${am.targetTerm}' (${am.domain}, ${Math.round(am.affinityScore * 100)}% partial credit).`);
    });
  }

  // Preferred Bonus
  if (matchedPreferredSkills.length > 0) {
    strengths.push(`Possesses ${matchedPreferredSkills.length} bonus preferred skills: ${matchedPreferredSkills.join(', ')}.`);
    scoringRationale.push(`+${preferredSkillsBonus} bonus pts from preferred skills.`);
  }

  // Missing Skills
  if (missingRequiredSkills.length > 0) {
    gaps.push(`Missing ${missingRequiredSkills.length} mandatory qualifications: ${missingRequiredSkills.join(', ')}.`);
    scoringRationale.push(`-${Math.round((100 - skillsMatchScore) * 0.65)} pts penalty for missing core skills.`);
  }

  // Scoring Rationale
  scoringRationale.push(`+${Math.round(skillsMatchScore * 0.65)} pts from required skill & semantic affinity alignment.`);
  if (experienceStatus === 'exceeds') {
    strengths.push(`Exceeds minimum experience requirement by ${differenceYears} year(s) (${candidateYears} yrs vs ${requiredYears} required).`);
    scoringRationale.push(`+25 pts full credit for meeting/exceeding seniority threshold.`);
  } else if (experienceStatus === 'meets') {
    strengths.push(`Satisfies minimum experience requirement of ${requiredYears} year(s).`);
    scoringRationale.push(`+25 pts full credit for meeting seniority threshold.`);
  } else {
    gaps.push(`Falls short of minimum experience by ${Math.abs(differenceYears)} year(s) (${candidateYears} yrs vs ${requiredYears} required).`);
    scoringRationale.push(`+${Math.round(experienceMatchScore * 0.25)} pts partial credit for ${candidateYears}/${requiredYears} experience years.`);
  }

  // Summary Tier
  let tier = 'Tier 3: Low Fit';
  let summary = '';
  if (overallScore >= 80) {
    tier = 'Tier 1: High Fit';
    summary = `Strong Match (${overallScore}%): Candidate demonstrates exceptional alignment with core role competencies and experience expectations.`;
  } else if (overallScore >= 60) {
    tier = 'Tier 2: Moderate Fit';
    summary = `Moderate Match (${overallScore}%): Candidate satisfies major requirements with minor skill or experience gaps that could be bridged with onboarding.`;
  } else {
    tier = 'Tier 3: Low Fit';
    summary = `Low Match (${overallScore}%): Significant gaps identified in mandatory skills or minimum required professional tenure.`;
  }

  return {
    overallScore,
    tier,
    breakdown: {
      skillsMatchScore,
      experienceMatchScore,
      preferredSkillsBonus,
    },
    matchingSkills: [...exactMatches, ...synonymMatches.map(s => s.targetTerm)],
    exactMatches,
    synonymMatches,
    affinityMatches,
    missingRequiredSkills,
    matchedPreferredSkills,
    missingPreferredSkills,
    experienceComparison: {
      candidateYears,
      requiredYears,
      differenceYears,
      status: experienceStatus,
    },
    explainability: {
      summary,
      strengths,
      gaps,
      scoringRationale,
      fairnessAudit: {
        isAnonymizedEvaluation: Boolean(resume.anonymized),
        demographicSignalsIgnored: true,
        evaluationBasis: 'Strictly evaluated on demonstrable skills overlap, semantic taxonomy mapping, and documented duration of experience.',
      },
    },
  };
}

/**
 * Batch evaluates and ranks an entire candidate pool against a single job description
 */
export function rankCandidatesForJob(resumes, job) {
  if (!Array.isArray(resumes) || !job) {
    throw new Error('Resumes array and job object are required for cohort ranking.');
  }

  const evaluatedPool = resumes.map((resume) => {
    const evaluation = evaluateMatch(resume, job);
    return {
      resumeId: resume._id,
      candidateName: resume.candidateName,
      totalExperienceYears: resume.totalExperienceYears,
      skillsCount: resume.skills?.length || 0,
      anonymized: resume.anonymized,
      ...evaluation,
    };
  });

  // Sort descending by overallScore, then by skillsMatchScore, then experience
  evaluatedPool.sort((a, b) => {
    if (b.overallScore !== a.overallScore) return b.overallScore - a.overallScore;
    if (b.breakdown.skillsMatchScore !== a.breakdown.skillsMatchScore) {
      return b.breakdown.skillsMatchScore - a.breakdown.skillsMatchScore;
    }
    return b.experienceComparison.candidateYears - a.experienceComparison.candidateYears;
  });

  // Assign ranks
  const rankedCandidates = evaluatedPool.map((c, index) => ({
    rank: index + 1,
    ...c,
  }));

  // Cohort Analytics
  const total = rankedCandidates.length;
  const avgScore = total > 0
    ? Math.round(rankedCandidates.reduce((acc, curr) => acc + curr.overallScore, 0) / total)
    : 0;

  const topFitCount = rankedCandidates.filter(c => c.overallScore >= 80).length;
  const moderateFitCount = rankedCandidates.filter(c => c.overallScore >= 60 && c.overallScore < 80).length;
  const lowFitCount = rankedCandidates.filter(c => c.overallScore < 60).length;

  return {
    jobId: job._id,
    jobTitle: job.title,
    minExperienceYears: job.minExperienceYears,
    cohortSize: total,
    analytics: {
      avgScore,
      topFitCount,
      moderateFitCount,
      lowFitCount,
      highestScore: total > 0 ? rankedCandidates[0].overallScore : 0,
    },
    leaderboard: rankedCandidates,
  };
}

/**
 * Produces an explainable side-by-side differential between two candidates for a role
 */
export function compareTwoCandidates(candidateA, candidateB, job) {
  const evalA = evaluateMatch(candidateA, job);
  const evalB = evaluateMatch(candidateB, job);

  const scoreDiff = evalA.overallScore - evalB.overallScore;
  let leader = null;
  if (scoreDiff > 0) {
    leader = { id: candidateA._id, name: candidateA.candidateName, margin: scoreDiff, candidateKey: 'A' };
  } else if (scoreDiff < 0) {
    leader = { id: candidateB._id, name: candidateB.candidateName, margin: Math.abs(scoreDiff), candidateKey: 'B' };
  }

  // Skills only A has
  const setB = new Set((candidateB.skills || []).map(s => (typeof s === 'string' ? s : s.name).toLowerCase()));
  const setA = new Set((candidateA.skills || []).map(s => (typeof s === 'string' ? s : s.name).toLowerCase()));

  const uniqueToA = (candidateA.skills || []).filter(s => !setB.has((typeof s === 'string' ? s : s.name).toLowerCase()));
  const uniqueToB = (candidateB.skills || []).filter(s => !setA.has((typeof s === 'string' ? s : s.name).toLowerCase()));

  return {
    jobTitle: job.title,
    leader,
    scoreDifferential: Math.abs(scoreDiff),
    candidateA: {
      id: candidateA._id,
      name: candidateA.candidateName,
      overallScore: evalA.overallScore,
      tier: evalA.tier,
      breakdown: evalA.breakdown,
      matchingSkills: evalA.matchingSkills,
      missingSkills: evalA.missingRequiredSkills,
      experienceYears: candidateA.totalExperienceYears,
      uniqueSkills: uniqueToA.map(s => typeof s === 'string' ? s : s.name),
    },
    candidateB: {
      id: candidateB._id,
      name: candidateB.candidateName,
      overallScore: evalB.overallScore,
      tier: evalB.tier,
      breakdown: evalB.breakdown,
      matchingSkills: evalB.matchingSkills,
      missingSkills: evalB.missingRequiredSkills,
      experienceYears: candidateB.totalExperienceYears,
      uniqueSkills: uniqueToB.map(s => typeof s === 'string' ? s : s.name),
    },
    explainableReasoning: leader
      ? `${leader.name} leads by ${leader.margin} pts primarily due to higher mandatory skills alignment (${leader.id === candidateA._id ? evalA.breakdown.skillsMatchScore : evalB.breakdown.skillsMatchScore}% vs ${leader.id === candidateA._id ? evalB.breakdown.skillsMatchScore : evalA.breakdown.skillsMatchScore}%) and seniority fit.`
      : 'Both candidates demonstrate equivalent overall compatibility scores.',
  };
}
