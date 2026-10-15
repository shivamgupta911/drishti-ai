/**
 * Drishti AI - Explainable Matching Engine
 * Multi-dimensional, transparent scoring with factor attribution and bias audit.
 */

export function evaluateMatch(resume, job) {
  if (!resume || !job) {
    throw new Error('Both resume and job objects are required for match evaluation.');
  }

  // Normalize candidate skill set for case-insensitive lookup
  const candidateSkillsMap = new Map();
  (resume.skills || []).forEach((s) => {
    const skillName = typeof s === 'string' ? s : s.name;
    if (skillName) {
      candidateSkillsMap.set(skillName.trim().toLowerCase(), skillName.trim());
    }
  });

  // 1. Required Skills Evaluation
  const requiredSkills = job.requiredSkills || [];
  let totalRequiredWeight = 0;
  let earnedRequiredWeight = 0;
  const matchingSkills = [];
  const missingRequiredSkills = [];

  requiredSkills.forEach((req) => {
    const name = typeof req === 'string' ? req : req.name;
    const weight = typeof req === 'object' && req.weight ? req.weight : 1.0;
    totalRequiredWeight += weight;

    if (candidateSkillsMap.has(name.trim().toLowerCase())) {
      earnedRequiredWeight += weight;
      matchingSkills.push(name);
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

    if (candidateSkillsMap.has(name.trim().toLowerCase())) {
      earnedPreferredWeight += weight;
      matchedPreferredSkills.push(name);
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
    // Graceful partial credit: percentage of required years met
    experienceMatchScore = Math.max(Math.round((candidateYears / requiredYears) * 100), 20);
  }

  // 4. Overall Weighted Score Calculation
  // Weighted: 65% Required Skills, 25% Experience, + up to 10% Preferred Bonus
  const rawOverall = Math.round(
    skillsMatchScore * 0.65 + experienceMatchScore * 0.25 + preferredSkillsBonus
  );
  const overallScore = Math.min(Math.max(rawOverall, 0), 100);

  // 5. Plain-English Explainability Narrative
  const strengths = [];
  const gaps = [];
  const scoringRationale = [];

  // Skill factors
  if (matchingSkills.length > 0) {
    strengths.push(`Matches ${matchingSkills.length} core required skills: ${matchingSkills.join(', ')}.`);
    scoringRationale.push(`+${Math.round(skillsMatchScore * 0.65)} pts from required skill alignment (${matchingSkills.length}/${requiredSkills.length} satisfied).`);
  }
  if (matchedPreferredSkills.length > 0) {
    strengths.push(`Possesses ${matchedPreferredSkills.length} bonus preferred skills: ${matchedPreferredSkills.join(', ')}.`);
    scoringRationale.push(`+${preferredSkillsBonus} bonus pts from preferred skills.`);
  }

  if (missingRequiredSkills.length > 0) {
    gaps.push(`Missing ${missingRequiredSkills.length} mandatory qualifications: ${missingRequiredSkills.join(', ')}.`);
    scoringRationale.push(`-${Math.round((100 - skillsMatchScore) * 0.65)} pts penalty for missing core skills.`);
  }

  // Experience factors
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

  // Overall explanation summary
  let summary = '';
  if (overallScore >= 80) {
    summary = `Strong Match (${overallScore}%): Candidate demonstrates exceptional alignment with core role competencies and experience expectations.`;
  } else if (overallScore >= 60) {
    summary = `Moderate Match (${overallScore}%): Candidate satisfies major requirements with minor skill or experience gaps that could be bridged with onboarding.`;
  } else {
    summary = `Low Match (${overallScore}%): Significant gaps identified in mandatory skills or minimum required professional tenure.`;
  }

  return {
    overallScore,
    breakdown: {
      skillsMatchScore,
      experienceMatchScore,
      preferredSkillsBonus,
    },
    matchingSkills,
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
        evaluationBasis: 'Strictly evaluated on demonstrable skills overlap and documented duration of experience.',
      },
    },
  };
}
