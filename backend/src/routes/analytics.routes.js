import { Router } from 'express';
import mongoose from 'mongoose';
import Resume from '../models/Resume.js';
import Job from '../models/Job.js';
import MatchResult from '../models/MatchResult.js';
import EvaluationAudit from '../models/EvaluationAudit.js';
import RecruitmentOutcome from '../models/RecruitmentOutcome.js';
import { rankCandidatesForJob } from '../services/matcher.service.js';
import { buildSkillOntologyGraph } from '../services/network.service.js';
import { simulateHiringScenario } from '../services/simulator.service.js';
import { runModelEvaluationLaboratory } from '../services/evaluation.service.js';
import { getTenantFilter } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * GET /api/analytics/overview
 * Real-time analytics aggregation strictly scoped to active tenant.
 * Prevents any cross-tenant data aggregation or leakage.
 */
router.get('/overview', async (req, res, next) => {
  try {
    const { jobId } = req.query;
    const filter = getTenantFilter(req);

    const [resumes, jobs, matchResults] = await Promise.all([
      Resume.find(filter).lean(),
      Job.find(filter).lean(),
      MatchResult.find(filter).populate('resumeId', 'candidateName').populate('jobId', 'title').lean(),
    ]);

    // 1. Target Job or Primary Job
    let targetJob = null;
    if (jobId) {
      targetJob = jobs.find((j) => j._id.toString() === jobId);
    } else if (jobs.length > 0) {
      targetJob = jobs[0];
    }

    // 2. Score Distribution Histogram
    const relevantMatches = targetJob
      ? matchResults.filter((m) => m.jobId?._id?.toString() === targetJob._id.toString())
      : matchResults;

    const distribution = [
      { range: '<50', label: 'Developing (<50)', count: 0, min: 0, max: 49, color: '#BD4148', candidates: [] },
      { range: '50-64', label: 'Moderate Fit (50-64)', count: 0, min: 50, max: 64, color: '#A96512', candidates: [] },
      { range: '65-79', label: 'Strong Fit (65-79)', count: 0, min: 65, max: 79, color: '#187D70', candidates: [] },
      { range: '80-89', label: 'High Compatibility (80-89)', count: 0, min: 80, max: 89, color: '#187D58', candidates: [] },
      { range: '90-100', label: 'Exceptional (90-100)', count: 0, min: 90, max: 100, color: '#12685E', candidates: [] },
    ];

    relevantMatches.forEach((m) => {
      const score = m.overallScore || 0;
      const bin = distribution.find((b) => score >= b.min && score <= b.max) || distribution[0];
      bin.count += 1;
      bin.candidates.push({
        candidateId: m.resumeId?._id,
        candidateName: m.resumeId?.candidateName || 'Candidate',
        score,
        tier: m.tier,
      });
    });

    // 3. Skill Coverage Analysis for Target Job
    const skillCoverage = [];
    if (targetJob && Array.isArray(targetJob.requiredSkills)) {
      targetJob.requiredSkills.forEach((reqSkill) => {
        const reqName = typeof reqSkill === 'string' ? reqSkill : reqSkill.name;
        let meetingCandidates = 0;

        resumes.forEach((r) => {
          const hasSkill = (r.skills || []).some(
            (s) => (typeof s === 'string' ? s : s.name).toLowerCase() === reqName.toLowerCase()
          );
          if (hasSkill) meetingCandidates += 1;
        });

        const pct = resumes.length > 0 ? Math.round((meetingCandidates / resumes.length) * 100) : 0;
        skillCoverage.push({
          skill: reqName,
          category: reqSkill.category || 'Core',
          meetingCount: meetingCandidates,
          totalPool: resumes.length,
          coveragePct: pct,
          isHighGap: pct < 50,
        });
      });
    }

    // 4. Candidate-Job Heatmap Matrix
    const heatmap = {
      candidates: resumes.map((r) => ({ id: r._id.toString(), name: r.candidateName })),
      jobs: jobs.map((j) => ({ id: j._id.toString(), title: j.title })),
      cells: [],
    };

    const matchLookup = new Map();
    matchResults.forEach((m) => {
      const rId = m.resumeId?._id?.toString() || m.resumeId?.toString();
      const jId = m.jobId?._id?.toString() || m.jobId?.toString();
      if (rId && jId) {
        matchLookup.set(`${rId}--${jId}`, {
          score: m.overallScore,
          tier: m.tier,
          matchId: m._id,
          evaluatedAt: m.createdAt,
        });
      }
    });

    resumes.forEach((r) => {
      const rId = r._id.toString();
      jobs.forEach((j) => {
        const jId = j._id.toString();
        const existing = matchLookup.get(`${rId}--${jId}`);
        heatmap.cells.push({
          candidateId: rId,
          candidateName: r.candidateName,
          jobId: jId,
          jobTitle: j.title,
          evaluated: !!existing,
          score: existing ? existing.score : null,
          tier: existing ? existing.tier : null,
          matchId: existing ? existing.matchId : null,
        });
      });
    });

    // 5. Score Component Contribution Decomposition
    let avgSkills = 0;
    let avgExp = 0;
    let avgVector = 0;
    let avgPref = 0;
    let avgTotal = 0;

    if (relevantMatches.length > 0) {
      relevantMatches.forEach((m) => {
        avgSkills += m.breakdown?.skillsMatchScore || 0;
        avgExp += m.breakdown?.experienceMatchScore || 0;
        avgVector += m.breakdown?.semanticVectorScore || 0;
        avgPref += m.breakdown?.preferredSkillsBonus || 0;
        avgTotal += m.overallScore || 0;
      });
      const cnt = relevantMatches.length;
      avgSkills = Math.round(avgSkills / cnt);
      avgExp = Math.round(avgExp / cnt);
      avgVector = Math.round(avgVector / cnt);
      avgPref = Math.round(avgPref / cnt);
      avgTotal = Math.round(avgTotal / cnt);
    }

    const componentDecomposition = [
      {
        component: 'Mandatory Skills',
        weightPct: 60,
        averageScore: avgSkills,
        effectiveContributionPts: Math.round(avgSkills * 0.60),
        description: 'Exact keyword match, canonical synonyms, and domain affinities.',
      },
      {
        component: 'Tenure & Experience',
        weightPct: 20,
        averageScore: avgExp,
        effectiveContributionPts: Math.round(avgExp * 0.20),
        description: 'Candidate verified career duration vs role minimum threshold.',
      },
      {
        component: 'Contextual Vector Cosine',
        weightPct: 15,
        averageScore: avgVector,
        effectiveContributionPts: Math.round(avgVector * 0.15),
        description: 'TF-IDF semantic vocabulary distribution overlap.',
      },
      {
        component: 'Preferred Skills Bonus',
        weightPct: 5,
        averageScore: avgPref * 10,
        effectiveContributionPts: avgPref,
        description: 'Bonus points awarded for secondary preferred qualifications.',
      },
    ];

    // 6. Historical Evaluations Timeline
    const historyTimeline = matchResults
      .slice(0, 30)
      .map((m) => ({
        timestamp: m.createdAt,
        score: m.overallScore,
        candidateName: m.resumeId?.candidateName || 'Candidate',
        jobTitle: m.jobId?.title || 'Role',
        tier: m.tier,
      }))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    res.status(200).json({
      success: true,
      selectedJobId: targetJob?._id,
      selectedJobTitle: targetJob?.title,
      totalEvaluations: matchResults.length,
      evaluatedCandidates: relevantMatches.length,
      candidatePoolSize: resumes.length,
      jobPostingsCount: jobs.length,
      distribution,
      skillCoverage,
      heatmap,
      componentDecomposition,
      averageScore: avgTotal,
      historyTimeline,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/analytics/simulate
 * What-If Hiring Simulator: Runs in-memory recalculation strictly within active tenant workspace
 */
router.post('/simulate', async (req, res, next) => {
  try {
    const { jobId, weights, minExperienceOverride, mandatorySkillsOverride, preferredSkillsOverride } = req.body;

    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required for scenario simulation.' });
    }

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ error: `Invalid job identifier: '${jobId}'` });
    }

    const filter = getTenantFilter(req);
    const [job, resumes] = await Promise.all([
      Job.findOne({ _id: jobId, ...filter }),
      Resume.find(filter),
    ]);

    if (!job) {
      return res.status(404).json({ error: 'Job requisition not found in your workspace.' });
    }

    const simulation = simulateHiringScenario(resumes, job, {
      weights,
      minExperienceOverride,
      mandatorySkillsOverride,
      preferredSkillsOverride,
    });

    res.status(200).json({
      success: true,
      data: simulation,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/network-graph
 * Skill Ontology Relationship Graph scoped to active tenant pool
 */
router.get('/network-graph', async (req, res, next) => {
  try {
    const filter = getTenantFilter(req);
    const [resumes, jobs] = await Promise.all([
      Resume.find(filter).lean(),
      Job.find(filter).lean(),
    ]);
    const { category, search, minConnections } = req.query;

    const graph = buildSkillOntologyGraph(resumes, jobs, {
      categoryFilter: category,
      searchQuery: search,
      minConnections: minConnections ? Number(minConnections) : 0,
    });

    res.status(200).json({
      success: true,
      data: graph,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/benchmark-evaluation
 * Model Evaluation Laboratory: Computes IR metrics (NDCG, Precision@K, Recall@K, MRR)
 */
router.get('/benchmark-evaluation', (req, res) => {
  const benchmarkReport = runModelEvaluationLaboratory();
  res.status(200).json({
    success: true,
    data: benchmarkReport,
  });
});

export default router;
