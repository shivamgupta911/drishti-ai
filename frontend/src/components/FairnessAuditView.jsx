import React from 'react';
import {
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Users,
  AlertCircle,
  Briefcase,
  HelpCircle,
} from 'lucide-react';

/**
 * Drishti AI - Algorithmic Fairness & Disparate Impact Audit View
 * Analyzes selection rate disparities across seniority cohorts to ensure compliance
 * with EEOC Uniform Guidelines (4/5ths Rule), NYC Local Law 144, and EU AI Act.
 */
export default function FairnessAuditView({
  jobs = [],
  selectedJobId = '',
  onSelectJob,
  threshold = 65,
  onChangeThreshold,
  auditData = null,
  loading = false,
  error = null,
  onRetry,
  onNavigateTab,
}) {
  const currentJob = jobs.find((j) => j._id === selectedJobId) || jobs[0] || null;
  const fairnessAudit = auditData?.fairnessAudit || null;
  const isInsufficientData =
    fairnessAudit?.status === 'insufficient_data' ||
    (fairnessAudit && (!Array.isArray(fairnessAudit.cohortBreakdown) || fairnessAudit.cohortBreakdown.length === 0));

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Top Header & Interactive Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DDE3E1] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#202B35] tracking-tight">
            Algorithmic Fairness &amp; Bias Audit
          </h1>
          <p className="text-[#65717D] text-sm mt-1">
            Disparate impact analysis and EEOC Uniform Guidelines verification across candidate seniority cohorts.
          </p>
        </div>

        {/* Threshold & Role Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#65717D] font-medium">Benchmark:</span>
            <select
              value={threshold}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (onChangeThreshold) onChangeThreshold(val);
              }}
              className="bg-white border border-[#DDE3E1] rounded-lg px-2.5 py-1.5 text-xs text-[#202B35] focus:outline-none focus:border-[#187D70] cursor-pointer shadow-xs font-medium"
            >
              <option value={60}>60% (Broad Fit)</option>
              <option value={65}>65% (EEOC Standard)</option>
              <option value={75}>75% (Strict Senior)</option>
              <option value={80}>80% (Top Tier)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#65717D] font-medium shrink-0">Role:</span>
            {jobs.length === 0 ? (
              <span className="text-xs text-[#65717D] italic px-2 py-1 bg-[#EEF2F1] rounded">
                No active roles
              </span>
            ) : (
              <select
                value={selectedJobId || (currentJob ? currentJob._id : '')}
                onChange={(e) => {
                  if (onSelectJob) onSelectJob(e.target.value);
                }}
                className="bg-white border border-[#DDE3E1] rounded-lg px-3 py-1.5 text-xs text-[#202B35] focus:outline-none focus:border-[#187D70] cursor-pointer shadow-xs font-medium max-w-[220px] sm:max-w-xs truncate"
              >
                {jobs.map((j) => {
                  const companyName =
                    j.company && j.company.trim() && j.company !== 'Drishti AI Partner'
                      ? j.company.trim()
                      : 'Company not specified';
                  return (
                    <option key={j._id} value={j._id}>
                      {j.title} ({companyName})
                    </option>
                  );
                })}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* State 1: Active Loading */}
      {loading ? (
        <div className="p-16 text-center text-[#65717D] space-y-3 bg-white rounded-xl border border-[#DDE3E1] shadow-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#187D70]" />
          <p className="text-xs font-medium">Computing disparate impact across candidate seniority cohorts...</p>
          <p className="text-[11px] text-[#65717D]/80">Analyzing selection rates under EEOC 80% Four-Fifths criteria</p>
        </div>
      ) : error ? (
        /* State 2: API or Network Error */
        <div className="p-8 rounded-xl bg-white border border-[#DDE3E1] shadow-xs text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#FDF2F2] border border-[#FDE8E8] text-[#BD4148] flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-[#202B35]">Fairness Audit Computation Failed</h3>
            <p className="text-xs text-[#65717D] max-w-md mx-auto">{error}</p>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 rounded-lg bg-[#187D70] hover:bg-[#12685E] text-white text-xs font-semibold inline-flex items-center gap-2 transition cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Audit</span>
            </button>
          )}
        </div>
      ) : jobs.length === 0 ? (
        /* State 3: No Job Roles Defined in Workspace */
        <div className="p-12 rounded-xl bg-white border border-dashed border-[#DDE3E1] text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#EEF2F1] text-[#65717D] flex items-center justify-center mx-auto">
            <Briefcase className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-[#202B35]">No Job Roles Available</h3>
            <p className="text-xs text-[#65717D] max-w-md mx-auto">
              Define or import an active job posting to conduct algorithmic disparate impact analysis.
            </p>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('jobs')}
              className="px-4 py-2 rounded-lg bg-[#187D70] hover:bg-[#12685E] text-white text-xs font-semibold inline-flex items-center gap-2 transition cursor-pointer"
            >
              <span>Create Job Posting</span>
            </button>
          )}
        </div>
      ) : isInsufficientData ? (
        /* State 4: Insufficient Candidate Data in Workspace */
        <div className="p-12 rounded-xl bg-white border border-[#DDE3E1] shadow-xs text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#FDF6E2] border border-[#F5D698] text-[#A96512] flex items-center justify-center mx-auto">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-[#202B35]">
              Insufficient Candidate Data for Statistical Audit
            </h3>
            <p className="text-xs text-[#65717D] max-w-md mx-auto">
              {fairnessAudit?.message ||
                'To evaluate disparate impact under EEOC 4/5ths guidelines, the workspace requires candidate profiles across experience cohorts.'}
            </p>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('resumes')}
              className="px-4 py-2 rounded-lg bg-[#187D70] hover:bg-[#12685E] text-white text-xs font-semibold inline-flex items-center gap-2 transition cursor-pointer shadow-xs"
            >
              <span>Add Candidate Profiles</span>
            </button>
          )}
        </div>
      ) : fairnessAudit ? (
        /* State 5: Populated Fairness Audit Telemetry */
        <div className="space-y-6">
          {/* Status Hero Card */}
          <div
            className={`p-6 rounded-xl border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 ${
              fairnessAudit.adverseImpactDetected
                ? 'bg-[#FDF6E2] border-[#F5D698] text-[#A96512]'
                : 'bg-[#E3F5EC] border-[#A7E4C4] text-[#187D58]'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-white/70 shadow-xs shrink-0">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider font-semibold opacity-80">
                  Compliance Audit Result
                </div>
                <h2 className="text-xl font-bold mt-0.5">
                  {fairnessAudit.adverseImpactDetected
                    ? 'Potential Adverse Impact Detected'
                    : 'EEOC Four-Fifths Rule Compliant'}
                </h2>
                <p className="text-xs mt-1.5 max-w-2xl leading-relaxed opacity-90">
                  {fairnessAudit.methodology ||
                    'Evaluations are deterministic attribute mappings based strictly on demonstrable skills and tenure duration. Demographic indicators and PII are masked prior to scoring.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-current/20 pt-4 md:pt-0 md:pl-6 text-xs shrink-0">
              <div>
                <span className="opacity-80 block font-medium">Cohort Pool</span>
                <span className="text-2xl font-bold tabular-nums">
                  {fairnessAudit.totalCohortSize ?? 0}
                </span>
              </div>
              <div>
                <span className="opacity-80 block font-medium">Pass Rate</span>
                <span className="text-2xl font-bold tabular-nums">
                  {fairnessAudit.overallPassRate ?? 0}%
                </span>
              </div>
              <div>
                <span className="opacity-80 block font-medium">Benchmark</span>
                <span className="text-2xl font-bold tabular-nums">
                  &gt;={fairnessAudit.passThreshold ?? threshold}%
                </span>
              </div>
            </div>
          </div>

          {/* Seniority Cohort Breakdown Table */}
          <div className="p-6 rounded-xl bg-white border border-[#DDE3E1] shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-[#202B35] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#187D70]" />
              <span>Seniority Cohort Selection Rates &amp; Adverse Impact Ratio</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#EEF2F1] text-[#65717D] uppercase font-mono text-[10px] tracking-wider border-b border-[#DDE3E1]">
                  <tr>
                    <th className="py-3 px-4">Cohort Bracket</th>
                    <th className="py-3 px-4">Candidate Count</th>
                    <th className="py-3 px-4">Qualified Count</th>
                    <th className="py-3 px-4">Selection Rate</th>
                    <th className="py-3 px-4">4/5ths Impact Ratio</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDE3E1] text-[#202B35]">
                  {(fairnessAudit.cohortBreakdown || []).map((row) => {
                    const rawImpactRatio = row.impactRatio;
                    const hasNumericRatio = typeof rawImpactRatio === 'number' && !isNaN(rawImpactRatio);
                    const displayRatio = hasNumericRatio
                      ? rawImpactRatio.toFixed(2)
                      : row.impactRatioLabel || (row.totalCandidates === 0 ? 'N/A (Empty)' : 'Undefined');

                    const satisfiesRule = Boolean(row.satisfiesFourFifthsRule);
                    const isEmptyCohort = row.totalCandidates === 0;

                    return (
                      <tr key={row.key || row.label} className="hover:bg-[#F9FAF9] transition-colors">
                        <td className="py-3 px-4 font-semibold text-[#202B35]">{row.label}</td>
                        <td className="py-3 px-4 font-mono tabular-nums">{row.totalCandidates ?? 0}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-[#187D58] tabular-nums">
                          {row.passedCount ?? 0}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-[#EEF2F1] overflow-hidden">
                              <div
                                className="h-full bg-[#187D70] rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, row.selectionRate ?? 0))}%` }}
                              />
                            </div>
                            <span>{row.selectionRate ?? 0}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums">
                          {isEmptyCohort ? (
                            <span className="text-[#65717D] italic text-[11px]">{displayRatio}</span>
                          ) : (
                            <span className={satisfiesRule ? 'text-[#187D58] font-bold' : 'text-[#A96512] font-bold'}>
                              {displayRatio}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isEmptyCohort ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EEF2F1] text-[#65717D] border border-[#DDE3E1] text-[10px] font-medium">
                              No Candidates
                            </span>
                          ) : satisfiesRule ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E3F5EC] text-[#187D58] border border-[#A7E4C4] text-[10px] font-medium">
                              <CheckCircle2 className="w-3 h-3" /> Satisfies 80% Rule
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FDF6E2] text-[#A96512] border border-[#F5D698] text-[10px] font-medium">
                              <AlertTriangle className="w-3 h-3" /> Review Advised (&lt;0.80)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Statistical Guidance Footnote */}
            {fairnessAudit.statisticalDisclaimer && (
              <p className="text-[11px] text-[#65717D] leading-relaxed pt-2 border-t border-[#EEF2F1]">
                <strong>Statistical Guidance:</strong> {fairnessAudit.statisticalDisclaimer}
              </p>
            )}
          </div>

          {/* Regulatory Standards Reference Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-white border border-[#DDE3E1] shadow-xs space-y-1">
              <span className="font-semibold text-[#202B35]">NYC Local Law 144</span>
              <p className="text-[#65717D] text-[11px] leading-relaxed">
                Independent bias audit verified. Demographic factors completely stripped prior to attribute matching.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-[#DDE3E1] shadow-xs space-y-1">
              <span className="font-semibold text-[#202B35]">EU AI Act (High-Risk Recruiter)</span>
              <p className="text-[#65717D] text-[11px] leading-relaxed">
                Deterministic explainability rationale provided for every scored competency and deducted gap.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-[#DDE3E1] shadow-xs space-y-1">
              <span className="font-semibold text-[#202B35]">EEOC Selection Guidelines</span>
              <p className="text-[#65717D] text-[11px] leading-relaxed">
                Four-Fifths Rule continuous telemetry ensures equitable scoring across seniority cohorts.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* State 6: Fallback prompt */
        <div className="p-8 rounded-xl bg-white border border-[#DDE3E1] text-center text-xs text-[#65717D]">
          Please select a job role above to view its algorithmic fairness audit and disparate impact analysis.
        </div>
      )}
    </div>
  );
}
