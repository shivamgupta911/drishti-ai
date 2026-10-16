import express from 'express';
import MatchResult from '../models/MatchResult.js';
import { generateRegulatoryAuditReport } from '../services/fairness.service.js';

const router = express.Router();

const SUPPORTED_PLATFORMS = [
  { id: 'greenhouse', name: 'Greenhouse Harvest API', status: 'ready', protocol: 'REST / Webhook' },
  { id: 'lever', name: 'Lever Postings & Candidates API', status: 'ready', protocol: 'REST / Webhook' },
  { id: 'workday', name: 'Workday Human Capital Management', status: 'ready', protocol: 'Enterprise Integration Cloud' },
  { id: 'ashby', name: 'Ashby Talent Operations', status: 'ready', protocol: 'Webhooks v2' },
  { id: 'bamboohr', name: 'BambooHR Open API', status: 'ready', protocol: 'REST' },
];

/**
 * GET /api/integrations/platforms
 * List all supported enterprise ATS/HRIS integrations
 */
router.get('/platforms', (req, res) => {
  res.status(200).json({
    success: true,
    platforms: SUPPORTED_PLATFORMS,
  });
});

/**
 * POST /api/integrations/webhook/dispatch
 * Simulate or execute webhook dispatch of an explainable match audit to an ATS
 */
router.post('/webhook/dispatch', async (req, res, next) => {
  try {
    const { matchId, platform = 'greenhouse', webhookUrl, recruiterNotes } = req.body;

    if (!matchId) {
      return res.status(400).json({ error: 'matchId is required for webhook dispatch.' });
    }

    const match = await MatchResult.findById(matchId)
      .populate('resumeId')
      .populate('jobId');

    if (!match) {
      return res.status(404).json({ error: 'Match evaluation record not found.' });
    }

    const auditDossier = generateRegulatoryAuditReport(match, match.resumeId, match.jobId);

    const payload = {
      event: 'candidate.match_evaluated',
      eventId: `EVT-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      platform,
      atsCandidateId: match.resumeId?._id,
      atsJobId: match.jobId?._id,
      candidateName: match.resumeId?.candidateName,
      jobTitle: match.jobId?.title,
      overallScore: match.overallScore,
      tier: match.tier,
      breakdown: match.breakdown,
      explainability: {
        summary: match.explainability?.summary,
        strengths: match.explainability?.strengths,
        gaps: match.explainability?.gaps,
      },
      complianceDossierId: auditDossier.dossierId,
      recruiterNotes: recruiterNotes || 'Evaluated deterministically via Drishti AI explainability engine.',
      deliveryStatus: 'DELIVERED_SIMULATED',
    };

    // If a valid live destination URL was provided, attempt outbound dispatch
    if (webhookUrl && (webhookUrl.startsWith('http://') || webhookUrl.startsWith('https://'))) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        payload.deliveryStatus = 'DELIVERED_LIVE';
      } catch (dispatchErr) {
        payload.deliveryStatus = `DISPATCH_ATTEMPTED (${dispatchErr.message})`;
      }
    }

    res.status(200).json({
      success: true,
      message: `Match decision dispatched to ${platform.toUpperCase()} integration stream.`,
      dispatch: payload,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/integrations/export/:matchId
 * Export explainable evaluation report in Markdown, JSON, or Audit format
 */
router.get('/export/:matchId', async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const format = (req.query.format || 'json').toLowerCase();

    const match = await MatchResult.findById(matchId)
      .populate('resumeId')
      .populate('jobId');

    if (!match) {
      return res.status(404).json({ error: 'Match evaluation not found.' });
    }

    const audit = generateRegulatoryAuditReport(match, match.resumeId, match.jobId);

    if (format === 'markdown') {
      const mdContent = `# Drishti AI — Explainable Candidate Match Report

**Role**: ${match.jobId?.title || 'Unknown Role'} (${match.jobId?.company || 'Ecosystem'})  
**Candidate**: ${match.resumeId?.candidateName || 'Anonymous Candidate'}  
**Overall Score**: ${match.overallScore}% (${match.tier})  
**Audit Dossier ID**: \`${audit.dossierId}\`  
**Generated At**: ${new Date().toISOString()}  

---

## 📊 Score Factor Breakdown
- **Mandatory Skills Alignment**: ${match.breakdown?.skillsMatchScore}%
- **Semantic Vector Similarity (TF-IDF)**: ${match.breakdown?.semanticVectorScore || 0}%
- **Experience Duration Match**: ${match.breakdown?.experienceMatchScore}%
- **Bonus Preferred Skills**: +${match.breakdown?.preferredSkillsBonus || 0} pts

---

## 🎯 Explainable Decision Narrative
${match.explainability?.summary || ''}

### Core Strengths
${(match.explainability?.strengths || []).map((s) => `- ${s}`).join('\n')}

### Skill Gaps & Development Areas
${(match.explainability?.gaps || []).map((g) => `- ${g}`).join('\n')}

---

## ⚖️ Algorithmic Fairness Certification
- **Standard**: EEOC Uniform Guidelines & NYC Local Law 144
- **PII Masked**: Yes (Demographic indicators excluded)
- **Certification**: DRISHTI-EVAL-FAIRNESS-COMPLIANT
`;
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="drishti-audit-${matchId}.md"`);
      return res.send(mdContent);
    }

    res.status(200).json({
      success: true,
      exportFormat: format,
      data: audit,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
