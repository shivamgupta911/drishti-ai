/**
 * Drishti AI - Evidence-Backed Resume Intelligence Service
 * Extracts contextual text excerpts and source sections from candidate resumes
 * to substantiate matched and missing job requirements with verifiable evidence.
 */

/**
 * Searches candidate resume text and structured experiences to extract a verbatim sentence/context
 * supporting the presence of a given skill or related concept.
 */
export function findSkillEvidenceExcerpt(resume, targetTerm) {
  if (!resume || !targetTerm) return { excerpt: '', sourceSection: 'Unspecified', evidenceQuality: 'none' };

  const termPattern = targetTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const termRegex = new RegExp(`\\b${termPattern}\\b`, 'i');

  // 1. Check structured professional experience descriptions
  if (Array.isArray(resume.experience) && resume.experience.length > 0) {
    for (const exp of resume.experience) {
      // Check tech array
      const hasInTech = exp.technologies?.some((t) => termRegex.test(t));
      // Check description text
      if (exp.description && termRegex.test(exp.description)) {
        // Extract the exact sentence containing the skill
        const sentences = exp.description.split(/(?<=[.!?])\s+/);
        const matchedSentence = sentences.find((s) => termRegex.test(s));
        if (matchedSentence) {
          return {
            excerpt: matchedSentence.trim(),
            sourceSection: `Work Experience (${exp.title || 'Role'} at ${exp.company || 'Company'})`,
            evidenceQuality: 'high',
          };
        }
      } else if (hasInTech) {
        return {
          excerpt: `Listed as deployed technology in role: ${exp.title} at ${exp.company}.`,
          sourceSection: `Work Experience Technologies (${exp.company})`,
          evidenceQuality: 'moderate',
        };
      }
    }
  }

  // 2. Check raw resume text if available
  if (resume.rawText && termRegex.test(resume.rawText)) {
    const lines = resume.rawText.split(/[\r\n]+/);
    for (const line of lines) {
      if (termRegex.test(line) && line.trim().length > 15 && line.trim().length < 250) {
        // Classify section roughly by keywords
        let section = 'Resume Body';
        const lowerLine = line.toLowerCase();
        if (lowerLine.includes('project') || lowerLine.includes('built') || lowerLine.includes('developed')) {
          section = 'Projects / Deliverables';
        } else if (lowerLine.includes('skills') || lowerLine.includes('proficient')) {
          section = 'Skills Matrix';
        } else if (lowerLine.includes('education') || lowerLine.includes('degree')) {
          section = 'Education';
        }

        return {
          excerpt: line.trim(),
          sourceSection: section,
          evidenceQuality: section.includes('Projects') ? 'high' : 'moderate',
        };
      }
    }
  }

  // 3. Check skills array
  const hasInSkills = resume.skills?.some((s) => termRegex.test(typeof s === 'string' ? s : s.name));
  if (hasInSkills) {
    return {
      excerpt: `Explicitly declared in candidate technical skills profile under category '${resume.skills.find((s) => termRegex.test(typeof s === 'string' ? s : s.name))?.category || 'Technical'}'.`,
      sourceSection: 'Skills Inventory',
      evidenceQuality: 'moderate',
    };
  }

  return {
    excerpt: '',
    sourceSection: 'None',
    evidenceQuality: 'none',
  };
}

/**
 * Generates an exhaustive evidence report for all requirements of a job against a candidate
 */
export function buildEvidenceDossier(resume, job, matchEvaluation) {
  const requiredSkills = job.requiredSkills || [];
  const evidenceTraces = [];

  for (const req of requiredSkills) {
    const reqName = typeof req === 'string' ? req : req.name;

    // Check if exact match
    const isExact = matchEvaluation.exactMatches?.includes(reqName);
    if (isExact) {
      const evidence = findSkillEvidenceExcerpt(resume, reqName);
      evidenceTraces.push({
        requirement: reqName,
        category: 'exact_match',
        matchedTerm: reqName,
        excerpt: evidence.excerpt || `Direct keyword match '${reqName}' confirmed in candidate profile.`,
        sourceSection: evidence.sourceSection,
        evidenceQuality: evidence.evidenceQuality !== 'none' ? evidence.evidenceQuality : 'moderate',
        rationale: `Candidate explicitly demonstrates core competency in '${reqName}'.`,
      });
      continue;
    }

    // Check synonym matches
    const synMatch = matchEvaluation.synonymMatches?.find(
      (sm) => sm.targetTerm?.toLowerCase() === reqName.toLowerCase()
    );
    if (synMatch) {
      const evidence = findSkillEvidenceExcerpt(resume, synMatch.candidateTerm);
      evidenceTraces.push({
        requirement: reqName,
        category: 'synonym_match',
        matchedTerm: synMatch.candidateTerm,
        excerpt: evidence.excerpt || `Candidate demonstrated equivalent technical synonym '${synMatch.candidateTerm}'.`,
        sourceSection: evidence.sourceSection,
        evidenceQuality: evidence.evidenceQuality !== 'none' ? evidence.evidenceQuality : 'inferred',
        rationale: `Semantic equivalence: '${synMatch.candidateTerm}' maps 1:1 to required '${reqName}' (${synMatch.attribution || 'standard synonym'}).`,
      });
      continue;
    }

    // Check affinity matches
    const affMatch = matchEvaluation.affinityMatches?.find(
      (am) => am.targetTerm?.toLowerCase() === reqName.toLowerCase()
    );
    if (affMatch) {
      const evidence = findSkillEvidenceExcerpt(resume, affMatch.candidateTerm);
      evidenceTraces.push({
        requirement: reqName,
        category: 'affinity_match',
        matchedTerm: affMatch.candidateTerm,
        excerpt: evidence.excerpt || `Candidate has verified background in related domain technology '${affMatch.candidateTerm}'.`,
        sourceSection: evidence.sourceSection,
        evidenceQuality: 'inferred',
        rationale: `Transferable skill credit: '${affMatch.candidateTerm}' demonstrates foundational '${affMatch.domain}' principles relevant to '${reqName}'.`,
      });
      continue;
    }

    // Missing requirement
    evidenceTraces.push({
      requirement: reqName,
      category: 'missing',
      matchedTerm: null,
      excerpt: 'No direct keyword or certified technical synonym found in candidate profile or work experience entries.',
      sourceSection: 'N/A',
      evidenceQuality: 'none',
      rationale: `Candidate profile lacks documented evidence for mandatory requirement '${reqName}'. Recommended for technical screening inquiry.`,
    });
  }

  return evidenceTraces;
}
