import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Layers,
  Network,
  Share2,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Users,
  Briefcase,
  HelpCircle,
  FileCheck,
  RefreshCw,
  Info
} from 'lucide-react';
import { getApiUrl, safeParseResponse } from '../config/api';

/**
 * Drishti AI - Graph-Based Analytics Laboratory Component
 * Houses real-time statistical distributions, candidate ranking bar charts, skill coverage analysis,
 * candidate-job compatibility heatmap, score decomposition, model IR evaluation, and interactive skill network graph.
 */
export default function AnalyticsLab({ jobs = [], selectedJobId, onSelectCandidate, onSelectJob, showBanner }) {
  const [activeTab, setActiveTab] = useState('distribution'); // 'distribution' | 'ranking' | 'coverage' | 'heatmap' | 'network' | 'benchmark' | 'outcomes'
  const [activeJobId, setActiveJobId] = useState(selectedJobId || (jobs[0]?._id || ''));
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [analyticsError, setAnalyticsError] = useState(null);

  // Score distribution filter
  const [selectedScoreRange, setSelectedScoreRange] = useState(null);

  // Network graph state
  const [networkData, setNetworkData] = useState(null);
  const [loadingNetwork, setLoadingNetwork] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [networkSearch, setNetworkSearch] = useState('');
  const [networkCategory, setNetworkCategory] = useState('all');
  const [zoomLevel, setZoomLevel] = useState(1);

  // Model benchmark state
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [loadingBenchmark, setLoadingBenchmark] = useState(false);

  // Outcome analytics state
  const [outcomeData, setOutcomeData] = useState(null);
  const [loadingOutcome, setLoadingOutcome] = useState(false);

  // Fetch overview analytics
  const fetchOverviewAnalytics = async (jobId) => {
    setLoadingAnalytics(true);
    setAnalyticsError(null);
    try {
      const url = getApiUrl(`/api/analytics/overview${jobId ? `?jobId=${jobId}` : ''}`);
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await safeParseResponse(res);
      setAnalyticsData(data);
    } catch (err) {
      setAnalyticsError(err.message || 'Failed to load analytics laboratory.');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Fetch Network Graph
  const fetchNetworkGraph = async () => {
    setLoadingNetwork(true);
    try {
      const params = new URLSearchParams();
      if (networkCategory !== 'all') params.append('category', networkCategory);
      if (networkSearch.trim()) params.append('search', networkSearch.trim());
      const res = await fetch(getApiUrl(`/api/analytics/network-graph?${params.toString()}`));
      const data = await safeParseResponse(res);
      setNetworkData(data.data);
    } catch (err) {
      console.error('Error fetching network graph:', err);
    } finally {
      setLoadingNetwork(false);
    }
  };

  // Fetch Benchmark
  const fetchBenchmark = async () => {
    setLoadingBenchmark(true);
    try {
      const res = await fetch(getApiUrl('/api/analytics/benchmark-evaluation'));
      const data = await safeParseResponse(res);
      setBenchmarkData(data.data);
    } catch (err) {
      console.error('Error fetching model benchmark:', err);
    } finally {
      setLoadingBenchmark(false);
    }
  };

  // Fetch Outcomes
  const fetchOutcomes = async () => {
    setLoadingOutcome(true);
    try {
      const res = await fetch(getApiUrl('/api/outcomes/analytics'));
      const data = await safeParseResponse(res);
      setOutcomeData(data);
    } catch (err) {
      console.error('Error fetching outcome analytics:', err);
    } finally {
      setLoadingOutcome(false);
    }
  };

  useEffect(() => {
    fetchOverviewAnalytics(activeJobId);
  }, [activeJobId]);

  useEffect(() => {
    if (activeTab === 'network' && !networkData) fetchNetworkGraph();
    if (activeTab === 'benchmark' && !benchmarkData) fetchBenchmark();
    if (activeTab === 'outcomes' && !outcomeData) fetchOutcomes();
  }, [activeTab]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-[#DDE3E1] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#E5F3EF] text-[#187D70]">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#202B35] tracking-tight">
              Graph-Based Analytics Laboratory
            </h1>
          </div>
          <p className="text-[#65717D] text-sm mt-1 max-w-2xl">
            Statistical candidate distributions, requirement coverage matrices, skill relationship graphs, and information retrieval benchmark validation.
          </p>
        </div>

        {/* Job Selector */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <label className="text-xs font-semibold text-[#65717D] uppercase font-mono tracking-wider shrink-0">
            Requisition:
          </label>
          <select
            value={activeJobId}
            onChange={(e) => {
              setActiveJobId(e.target.value);
              if (onSelectJob) onSelectJob(e.target.value);
            }}
            className="w-full sm:w-auto max-w-full px-3 py-2 rounded-lg bg-white border border-[#DDE3E1] text-xs font-medium text-[#202B35] focus:outline-none focus:border-[#187D70] truncate min-w-0 cursor-pointer"
          >
            {jobs.map((j) => (
              <option key={j._id} value={j._id}>
                {j.title} ({j.department})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Laboratory Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 border-b border-[#DDE3E1] pb-px overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('distribution')}
          className={`px-3.5 py-2 font-medium border-b-2 transition shrink-0 ${
            activeTab === 'distribution'
              ? 'border-[#187D70] text-[#187D70] font-semibold'
              : 'border-transparent text-[#65717D] hover:text-[#202B35]'
          }`}
        >
          Score Distribution
        </button>
        <button
          onClick={() => setActiveTab('coverage')}
          className={`px-3.5 py-2 font-medium border-b-2 transition shrink-0 ${
            activeTab === 'coverage'
              ? 'border-[#187D70] text-[#187D70] font-semibold'
              : 'border-transparent text-[#65717D] hover:text-[#202B35]'
          }`}
        >
          Skill Coverage &amp; Gaps
        </button>
        <button
          onClick={() => setActiveTab('heatmap')}
          className={`px-3.5 py-2 font-medium border-b-2 transition shrink-0 ${
            activeTab === 'heatmap'
              ? 'border-[#187D70] text-[#187D70] font-semibold'
              : 'border-transparent text-[#65717D] hover:text-[#202B35]'
          }`}
        >
          Candidate-Job Heatmap
        </button>
        <button
          onClick={() => setActiveTab('decomposition')}
          className={`px-3.5 py-2 font-medium border-b-2 transition shrink-0 ${
            activeTab === 'decomposition'
              ? 'border-[#187D70] text-[#187D70] font-semibold'
              : 'border-transparent text-[#65717D] hover:text-[#202B35]'
          }`}
        >
          Component Decomposition
        </button>
        <button
          onClick={() => setActiveTab('network')}
          className={`px-3.5 py-2 font-medium border-b-2 transition shrink-0 ${
            activeTab === 'network'
              ? 'border-[#187D70] text-[#187D70] font-semibold'
              : 'border-transparent text-[#65717D] hover:text-[#202B35]'
          }`}
        >
          Skill Ontology Graph
        </button>
        <button
          onClick={() => setActiveTab('benchmark')}
          className={`px-3.5 py-2 font-medium border-b-2 transition shrink-0 ${
            activeTab === 'benchmark'
              ? 'border-[#187D70] text-[#187D70] font-semibold'
              : 'border-transparent text-[#65717D] hover:text-[#202B35]'
          }`}
        >
          Model IR Benchmark
        </button>
        <button
          onClick={() => setActiveTab('outcomes')}
          className={`px-3.5 py-2 font-medium border-b-2 transition shrink-0 ${
            activeTab === 'outcomes'
              ? 'border-[#187D70] text-[#187D70] font-semibold'
              : 'border-transparent text-[#65717D] hover:text-[#202B35]'
          }`}
        >
          Outcome Funnel &amp; Trends
        </button>
      </div>

      {loadingAnalytics ? (
        <div className="p-16 text-center text-[#65717D] space-y-3 bg-white rounded-xl border border-[#DDE3E1]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#187D70]" />
          <p className="text-xs">Aggregating live operational database telemetry...</p>
        </div>
      ) : analyticsError ? (
        <div className="p-8 text-center text-xs text-[#BD4148] bg-[#FDE8E9] rounded-xl border border-[#F4B3B7]">
          {analyticsError}
        </div>
      ) : (
        <>
          {/* ============================================================== */}
          {/* SUB-TAB 1: SCORE DISTRIBUTION HISTOGRAM                        */}
          {/* ============================================================== */}
          {activeTab === 'distribution' && (
            <div className="space-y-6">
              <div className="p-6 rounded-xl bg-white border border-[#DDE3E1] shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DDE3E1] pb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-[#202B35] flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#187D70]" />
                      <span>Candidate Compatibility Score Distribution</span>
                    </h2>
                    <p className="text-xs text-[#65717D] mt-0.5">
                      Histogram of evaluated candidates across 5 competency brackets. Click any bar to filter the cohort table below.
                    </p>
                  </div>

                  {selectedScoreRange && (
                    <button
                      onClick={() => setSelectedScoreRange(null)}
                      className="text-xs text-[#187D70] hover:underline font-medium"
                    >
                      Clear Range Filter
                    </button>
                  )}
                </div>

                {/* Histogram Visualizer */}
                <div className="space-y-4">
                  <div className="grid grid-cols-5 gap-3 h-48 items-end pt-6 border-b border-[#DDE3E1] pb-2">
                    {analyticsData?.distribution.map((bin) => {
                      const maxCount = Math.max(...analyticsData.distribution.map((b) => b.count), 1);
                      const heightPct = Math.round((bin.count / maxCount) * 100);
                      const isSelected = selectedScoreRange === bin.range;

                      return (
                        <div
                          key={bin.range}
                          onClick={() => setSelectedScoreRange(isSelected ? null : bin.range)}
                          className={`flex flex-col items-center justify-end h-full group cursor-pointer transition p-2 rounded-lg ${
                            isSelected ? 'bg-[#E5F3EF]' : 'hover:bg-[#F5F8F7]'
                          }`}
                        >
                          <span className="text-xs font-mono font-bold text-[#202B35] mb-2 tabular-nums">
                            {bin.count}
                          </span>
                          <div
                            className="w-full max-w-[48px] rounded-t-md transition-all duration-300"
                            style={{
                              height: `${Math.max(heightPct, 6)}%`,
                              backgroundColor: bin.color,
                              opacity: isSelected || !selectedScoreRange ? 1 : 0.4,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Bin Labels */}
                  <div className="grid grid-cols-5 gap-3 text-center text-xs">
                    {analyticsData?.distribution.map((bin) => (
                      <div key={bin.range} className="space-y-0.5">
                        <span className="font-semibold text-[#202B35] block">{bin.label}</span>
                        <span className="text-[11px] text-[#65717D] block font-mono">
                          {analyticsData.evaluatedCandidates > 0
                            ? Math.round((bin.count / analyticsData.evaluatedCandidates) * 100)
                            : 0}
                          % of pool
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Educational Notice */}
                <div className="p-3 bg-[#F5F8F7] rounded-lg border border-[#DDE3E1] text-[11px] text-[#65717D] flex items-start gap-2">
                  <Info className="w-4 h-4 text-[#187D70] shrink-0 mt-0.5" />
                  <span>
                    Drishti AI compatibility scores indicate multi-factor requirement overlap and must not be interpreted as an automated probability of candidate hire.
                  </span>
                </div>
              </div>

              {/* Filtered Candidate Sub-Table */}
              <div className="rounded-xl bg-white border border-[#DDE3E1] shadow-xs overflow-hidden">
                <div className="p-4 border-b border-[#DDE3E1] flex items-center justify-between">
                  <span className="font-semibold text-xs text-[#202B35]">
                    {selectedScoreRange
                      ? `Candidates in Bracket '${selectedScoreRange}' (${
                          analyticsData?.distribution.find((b) => b.range === selectedScoreRange)?.candidates.length || 0
                        })`
                      : `All Evaluated Candidates (${analyticsData?.evaluatedCandidates || 0})`}
                  </span>
                  <span className="text-[11px] text-[#65717D] font-mono">
                    Total Pool: {analyticsData?.candidatePoolSize} Profiles
                  </span>
                </div>

                <div className="divide-y divide-[#DDE3E1]">
                  {(selectedScoreRange
                    ? analyticsData?.distribution.find((b) => b.range === selectedScoreRange)?.candidates
                    : analyticsData?.distribution.flatMap((b) => b.candidates)
                  )?.map((cand) => (
                    <div
                      key={cand.candidateId}
                      className="p-3.5 flex items-center justify-between hover:bg-[#F9FAF9] transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#E5F3EF] text-[#187D70] font-bold text-xs flex items-center justify-center">
                          {cand.candidateName.charAt(0)}
                        </div>
                        <div>
                          <span className="font-semibold text-xs text-[#202B35] block">
                            {cand.candidateName}
                          </span>
                          <span className="text-[11px] text-[#65717D] block">{cand.tier}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="font-mono font-bold text-sm text-[#187D70] tabular-nums">
                          {cand.score}%
                        </span>
                        {onSelectCandidate && (
                          <button
                            onClick={() => onSelectCandidate(cand.candidateId)}
                            className="px-2.5 py-1 rounded-md border border-[#DDE3E1] bg-white hover:bg-[#EEF2F1] text-[11px] font-medium text-[#202B35] transition"
                          >
                            Inspect Audit
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* SUB-TAB 2: SKILL COVERAGE & GAPS                               */}
          {/* ============================================================== */}
          {activeTab === 'coverage' && (
            <div className="space-y-6">
              <div className="p-6 rounded-xl bg-white border border-[#DDE3E1] shadow-xs space-y-6">
                <div>
                  <h2 className="text-sm font-semibold text-[#202B35] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#187D70]" />
                    <span>Candidate Pool Skill Coverage &amp; Gap Prevalence</span>
                  </h2>
                  <p className="text-xs text-[#65717D] mt-0.5">
                    Percentage of candidates meeting each mandatory requirement for <strong className="text-[#202B35]">{analyticsData?.selectedJobTitle}</strong>.
                  </p>
                </div>

                <div className="space-y-4">
                  {analyticsData?.skillCoverage.map((sc) => (
                    <div key={sc.skill} className="space-y-1.5 p-3 rounded-lg border border-[#DDE3E1] bg-white">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#202B35]">{sc.skill}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EEF2F1] text-[#65717D]">
                            {sc.category}
                          </span>
                          {sc.isHighGap && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#FDE8E9] text-[#BD4148] border border-[#F4B3B7]">
                              High Scarcity (&lt;50%)
                            </span>
                          )}
                        </div>

                        <span className="font-mono font-bold text-[#202B35] tabular-nums">
                          {sc.meetingCount} / {sc.totalPool} Candidates ({sc.coveragePct}%)
                        </span>
                      </div>

                      <div className="h-2 rounded-full bg-[#EEF2F1] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            sc.isHighGap ? 'bg-[#BD4148]' : 'bg-[#187D70]'
                          }`}
                          style={{ width: `${sc.coveragePct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* SUB-TAB 3: CANDIDATE-JOB HEATMAP MATRIX                        */}
          {/* ============================================================== */}
          {activeTab === 'heatmap' && (
            <div className="p-6 rounded-xl bg-white border border-[#DDE3E1] shadow-xs space-y-6">
              <div>
                <h2 className="text-sm font-semibold text-[#202B35] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#187D70]" />
                  <span>Candidate-Job Compatibility Matrix</span>
                </h2>
                <p className="text-xs text-[#65717D] mt-0.5">
                  Two-dimensional evaluation matrix comparing all candidate profiles against open requisitions.
                </p>
              </div>

              {/* Heatmap Grid */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#DDE3E1] bg-[#EEF2F1]">
                      <th className="py-3 px-4 font-mono uppercase text-[10px] text-[#65717D] sticky left-0 bg-[#EEF2F1] z-10">
                        Candidate Profile
                      </th>
                      {analyticsData?.heatmap.jobs.map((job) => (
                        <th key={job.id} className="py-3 px-4 font-semibold text-[#202B35] text-center min-w-[140px]">
                          {job.title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDE3E1]">
                    {analyticsData?.heatmap.candidates.map((cand) => (
                      <tr key={cand.id} className="hover:bg-[#F9FAF9] transition">
                        <td className="py-3 px-4 font-semibold text-[#202B35] sticky left-0 bg-white z-10 border-r border-[#DDE3E1]">
                          {cand.name}
                        </td>
                        {analyticsData?.heatmap.jobs.map((job) => {
                          const cell = analyticsData.heatmap.cells.find(
                            (c) => c.candidateId === cand.id && c.jobId === job.id
                          );
                          const isEvaluated = cell && cell.evaluated;
                          const score = isEvaluated ? cell.score : null;

                          let bgColor = 'bg-white text-[#65717D] border border-dashed border-[#DDE3E1]';
                          if (isEvaluated) {
                            if (score >= 80) bgColor = 'bg-[#E3F5EC] text-[#187D58] border border-[#A7E4C4] font-bold';
                            else if (score >= 65) bgColor = 'bg-[#E5F3EF] text-[#187D70] border border-[#187D70]/20 font-bold';
                            else if (score >= 50) bgColor = 'bg-[#FDF6E2] text-[#A96512] border border-[#F5D698] font-bold';
                            else bgColor = 'bg-[#FDE8E9] text-[#BD4148] border border-[#F4B3B7] font-bold';
                          }

                          return (
                            <td key={job.id} className="py-3 px-4 text-center">
                              <div
                                className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-mono tabular-nums ${bgColor}`}
                                title={
                                  isEvaluated
                                    ? `${cand.name} for ${job.title}: ${score}% (${cell.tier})`
                                    : 'Not evaluated yet'
                                }
                              >
                                {isEvaluated ? `${score}%` : 'Unevaluated'}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* SUB-TAB 4: SCORE COMPONENT DECOMPOSITION                       */}
          {/* ============================================================== */}
          {activeTab === 'decomposition' && (
            <div className="p-6 rounded-xl bg-white border border-[#DDE3E1] shadow-xs space-y-6">
              <div>
                <h2 className="text-sm font-semibold text-[#202B35] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#187D70]" />
                  <span>Additive Score Component Contribution Breakdown</span>
                </h2>
                <p className="text-xs text-[#65717D] mt-0.5">
                  Reconciliation of mathematical component contributions toward the final compatibility score for <strong className="text-[#202B35]">{analyticsData?.selectedJobTitle}</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analyticsData?.componentDecomposition.map((comp) => (
                  <div key={comp.component} className="p-4 rounded-xl border border-[#DDE3E1] bg-[#F5F8F7] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#202B35]">{comp.component}</span>
                      <span className="font-mono text-[#187D70] font-bold">
                        Weight: {comp.weightPct}%
                      </span>
                    </div>

                    <div className="text-2xl font-bold text-[#202B35] tabular-nums font-mono">
                      +{comp.effectiveContributionPts} <span className="text-xs font-normal text-[#65717D]">effective pts</span>
                    </div>

                    <p className="text-xs text-[#65717D] leading-relaxed">
                      {comp.description}
                    </p>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-lg bg-white border border-[#DDE3E1] text-xs flex items-center justify-between">
                <span className="font-semibold text-[#202B35]">Average Total Compatibility Score:</span>
                <span className="text-xl font-mono font-bold text-[#187D70] tabular-nums">
                  {analyticsData?.averageScore}%
                </span>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* SUB-TAB 5: SKILL ONTOLOGY NETWORK GRAPH                        */}
          {/* ============================================================== */}
          {activeTab === 'network' && (
            <div className="p-6 rounded-xl bg-white border border-[#DDE3E1] shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DDE3E1] pb-4">
                <div>
                  <h2 className="text-sm font-semibold text-[#202B35] flex items-center gap-2">
                    <Network className="w-4 h-4 text-[#187D70]" />
                    <span>Skill Relationship &amp; Domain Ontology Network</span>
                  </h2>
                  <p className="text-xs text-[#65717D] mt-0.5">
                    Interactive node-link graph mapping canonical skills, synonym bridges, and domain transfer credits.
                  </p>
                </div>

                {/* Graph Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 2.0))}
                    className="p-1.5 rounded-lg border border-[#DDE3E1] bg-white hover:bg-[#EEF2F1] text-[#65717D]"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.6))}
                    className="p-1.5 rounded-lg border border-[#DDE3E1] bg-white hover:bg-[#EEF2F1] text-[#65717D]"
                    title="Zoom out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setZoomLevel(1); setSelectedNode(null); }}
                    className="p-1.5 rounded-lg border border-[#DDE3E1] bg-white hover:bg-[#EEF2F1] text-[#65717D]"
                    title="Reset zoom"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#65717D]" />
                  <input
                    type="text"
                    value={networkSearch}
                    onChange={(e) => {
                      setNetworkSearch(e.target.value);
                      fetchNetworkGraph();
                    }}
                    placeholder="Search skills or aliases..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[#DDE3E1] bg-white text-xs text-[#202B35] focus:outline-none focus:border-[#187D70]"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {['all', 'Frontend Framework', 'Backend Runtime', 'Database Storage', 'Cloud & DevOps', 'API Architecture'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { setNetworkCategory(cat); fetchNetworkGraph(); }}
                      className={`px-2.5 py-1 rounded-md text-xs transition ${
                        networkCategory === cat
                          ? 'bg-[#187D70] text-white font-medium'
                          : 'bg-[#EEF2F1] text-[#65717D] hover:text-[#202B35]'
                      }`}
                    >
                      {cat.replace(' / ', '/')}
                    </button>
                  ))}
                </div>
              </div>

              {/* SVG Node-Link Canvas */}
              <div className="relative border border-[#DDE3E1] rounded-xl bg-[#F5F8F7] overflow-hidden min-h-[420px] flex items-center justify-center">
                {loadingNetwork ? (
                  <div className="text-center text-[#65717D] space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#187D70]" />
                    <p className="text-xs">Generating ontology layout...</p>
                  </div>
                ) : networkData?.nodes.length === 0 ? (
                  <div className="text-xs text-[#65717D]">No skills found matching search criteria.</div>
                ) : (
                  <svg
                    className="w-full h-[460px] cursor-grab active:cursor-grabbing"
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center', transition: 'transform 0.2s ease-out' }}
                  >
                    {/* Render Links */}
                    {networkData?.links.map((link, idx) => {
                      // Determine coordinates based on node order
                      const srcNodeIdx = networkData.nodes.findIndex((n) => n.id === link.source);
                      const tgtNodeIdx = networkData.nodes.findIndex((n) => n.id === link.target);
                      if (srcNodeIdx === -1 || tgtNodeIdx === -1) return null;

                      // Circular layout approximation for clarity
                      const total = networkData.nodes.length;
                      const cx = 380;
                      const cy = 230;
                      const r = 170;

                      const angleSrc = (srcNodeIdx / total) * 2 * Math.PI;
                      const angleTgt = (tgtNodeIdx / total) * 2 * Math.PI;

                      const x1 = cx + r * Math.cos(angleSrc);
                      const y1 = cy + r * Math.sin(angleSrc);
                      const x2 = cx + r * Math.cos(angleTgt);
                      const y2 = cy + r * Math.sin(angleTgt);

                      const strokeColor =
                        link.type === 'prerequisite'
                          ? '#187D70'
                          : link.type === 'affinity'
                          ? '#A96512'
                          : '#65717D';

                      return (
                        <line
                          key={idx}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={strokeColor}
                          strokeWidth={link.type === 'prerequisite' ? 2 : 1.2}
                          strokeDasharray={link.type === 'affinity' ? '4 3' : 'none'}
                          opacity={0.4}
                        />
                      );
                    })}

                    {/* Render Nodes */}
                    {networkData?.nodes.map((node, idx) => {
                      const total = networkData.nodes.length;
                      const cx = 380;
                      const cy = 230;
                      const r = 170;
                      const angle = (idx / total) * 2 * Math.PI;
                      const x = cx + r * Math.cos(angle);
                      const y = cy + r * Math.sin(angle);
                      const isSelected = selectedNode?.id === node.id;

                      return (
                        <g
                          key={node.id}
                          transform={`translate(${x}, ${y})`}
                          onClick={() => setSelectedNode(node)}
                          className="cursor-pointer group"
                        >
                          <circle
                            r={isSelected ? 16 : 12}
                            fill={isSelected ? '#187D70' : '#FFFFFF'}
                            stroke={isSelected ? '#12685E' : '#187D70'}
                            strokeWidth={isSelected ? 3 : 2}
                            className="transition-all duration-150"
                          />
                          <text
                            y={-18}
                            textAnchor="middle"
                            fill="#202B35"
                            fontSize="11"
                            fontWeight={isSelected ? '700' : '500'}
                            className="select-none font-sans"
                          >
                            {node.name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                )}

                {/* Legend Overlay */}
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs p-2.5 rounded-lg border border-[#DDE3E1] text-[10px] space-y-1 shadow-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-[#187D70]" />
                    <span>Prerequisite / Direct Dependency</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-[#A96512] border-b border-dashed" />
                    <span>Domain Affinity Transfer Credit</span>
                  </div>
                </div>
              </div>

              {/* Node Inspection Inspector Drawer */}
              {selectedNode && (
                <div className="p-4 rounded-xl bg-white border border-[#187D70]/30 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-[#DDE3E1] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#202B35]">{selectedNode.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E5F3EF] text-[#187D70]">
                        {selectedNode.category}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedNode(null)}
                      className="text-xs text-[#65717D] hover:text-[#202B35]"
                    >
                      Close Inspector
                    </button>
                  </div>

                  <p className="text-xs text-[#65717D] leading-relaxed">
                    {selectedNode.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                    <div className="p-2.5 rounded-lg bg-[#F5F8F7] border border-[#DDE3E1]">
                      <span className="text-[10px] uppercase font-mono text-[#65717D] block">Known Aliases</span>
                      <span className="font-semibold text-[#202B35] mt-0.5 block">
                        {selectedNode.aliases?.length > 0 ? selectedNode.aliases.join(', ') : 'None registered'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#F5F8F7] border border-[#DDE3E1]">
                      <span className="text-[10px] uppercase font-mono text-[#65717D] block">Candidates with Skill</span>
                      <span className="font-bold text-[#187D70] mt-0.5 block tabular-nums">
                        {selectedNode.candidateCount} Profiles
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#F5F8F7] border border-[#DDE3E1]">
                      <span className="text-[10px] uppercase font-mono text-[#65717D] block">Requisitions Demanding</span>
                      <span className="font-bold text-[#202B35] mt-0.5 block tabular-nums">
                        {selectedNode.jobCount} Job Postings
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* SUB-TAB 6: MODEL INFORMATION RETRIEVAL BENCHMARK               */}
          {/* ============================================================== */}
          {activeTab === 'benchmark' && (
            <div className="p-6 rounded-xl bg-white border border-[#DDE3E1] shadow-xs space-y-6">
              <div>
                <h2 className="text-sm font-semibold text-[#202B35] flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-[#187D70]" />
                  <span>Model Evaluation Laboratory: Information Retrieval Metrics</span>
                </h2>
                <p className="text-xs text-[#65717D] mt-0.5">
                  Controlled empirical benchmark evaluating 4 ranking approaches across documented, labelled ground-truth relevance pairs.
                </p>
              </div>

              {loadingBenchmark ? (
                <div className="p-12 text-center text-[#65717D] space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#187D70]" />
                  <p className="text-xs">Computing NDCG, Precision@K, and MRR metrics...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Metrics Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#EEF2F1] text-[#65717D] uppercase font-mono text-[10px] tracking-wider border-b border-[#DDE3E1]">
                        <tr>
                          <th className="py-3 px-4">Algorithm Pipeline</th>
                          <th className="py-3 px-4 text-center">Precision@1</th>
                          <th className="py-3 px-4 text-center">Precision@3</th>
                          <th className="py-3 px-4 text-center">Recall@3</th>
                          <th className="py-3 px-4 text-center">NDCG@3</th>
                          <th className="py-3 px-4 text-center">MRR</th>
                          <th className="py-3 px-4 text-center">False Negatives</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DDE3E1] text-[#202B35]">
                        {benchmarkData?.modelsEvaluated.map((m) => (
                          <tr key={m.modelId} className="hover:bg-[#F9FAF9] transition">
                            <td className="py-3 px-4">
                              <span className="font-semibold text-[#202B35] block">{m.name}</span>
                              <span className="text-[11px] text-[#65717D] block">{m.description}</span>
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold tabular-nums">
                              {m.metrics.precisionAt1}%
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold tabular-nums">
                              {m.metrics.precisionAt3}%
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold tabular-nums">
                              {m.metrics.recallAt3}%
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-[#187D70] tabular-nums">
                              {m.metrics.ndcgAt3}
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold tabular-nums">
                              {m.metrics.mrr}
                            </td>
                            <td className="py-3 px-4 text-center font-mono tabular-nums">
                              {m.errorAnalysis.falseNegativeCount > 0 ? (
                                <span className="text-[#BD4148] font-bold">
                                  {m.errorAnalysis.falseNegativeCount}
                                </span>
                              ) : (
                                <span className="text-[#187D58] font-bold">0</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Benchmark Conclusion Banner */}
                  <div className="p-4 rounded-xl bg-[#E5F3EF] border border-[#187D70]/20 text-xs text-[#202B35] space-y-1">
                    <span className="font-semibold text-[#187D70] block">Benchmark Finding:</span>
                    <p className="text-[#65717D] leading-relaxed">
                      {benchmarkData?.conclusion}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* SUB-TAB 7: OUTCOME FUNNEL & PIPELINE TRENDS                    */}
          {/* ============================================================== */}
          {activeTab === 'outcomes' && (
            <div className="p-6 rounded-xl bg-white border border-[#DDE3E1] shadow-xs space-y-6">
              <div>
                <h2 className="text-sm font-semibold text-[#202B35] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#187D70]" />
                  <span>Applicant Funnel Progression &amp; Score Calibration</span>
                </h2>
                <p className="text-xs text-[#65717D] mt-0.5">
                  Conversion metrics through recruiter stages and calibration against predicted compatibility tiers.
                </p>
              </div>

              {loadingOutcome ? (
                <div className="p-12 text-center text-[#65717D] space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#187D70]" />
                  <p className="text-xs">Computing funnel conversion rates...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Funnel Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                    {outcomeData?.funnel.map((f) => (
                      <div key={f.stage} className="p-3.5 rounded-xl border border-[#DDE3E1] bg-[#F5F8F7] text-center">
                        <span className="text-[10px] font-mono uppercase text-[#65717D] block">{f.label}</span>
                        <span className="text-xl font-bold text-[#202B35] mt-1 block tabular-nums">{f.count}</span>
                        <span className="text-[10px] text-[#187D70] font-mono block">{f.rate}% of pool</span>
                      </div>
                    ))}
                  </div>

                  {/* Correlation Table */}
                  <div className="border border-[#DDE3E1] rounded-xl overflow-hidden">
                    <div className="p-4 bg-[#EEF2F1] border-b border-[#DDE3E1] font-semibold text-xs text-[#202B35]">
                      Predicted Score Tier vs. Realized Recruiter Progression
                    </div>
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#F5F8F7] text-[#65717D] uppercase font-mono text-[10px] border-b border-[#DDE3E1]">
                        <tr>
                          <th className="py-3 px-4">Compatibility Tier</th>
                          <th className="py-3 px-4 text-center">Candidates</th>
                          <th className="py-3 px-4 text-center">Interview Rate</th>
                          <th className="py-3 px-4 text-center">Hire Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DDE3E1] text-[#202B35]">
                        {outcomeData?.correlation.map((c) => (
                          <tr key={c.tier} className="hover:bg-[#F9FAF9] transition">
                            <td className="py-3 px-4 font-semibold text-[#202B35]">{c.tier}</td>
                            <td className="py-3 px-4 text-center font-mono tabular-nums">{c.totalCandidates}</td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-[#187D70] tabular-nums">
                              {c.interviewRate}%
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-[#187D58] tabular-nums">
                              {c.hireRate}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Ethical Disclaimer */}
                  <div className="p-3.5 bg-[#FDF6E2] border border-[#F5D698] rounded-xl text-xs text-[#A96512] flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{outcomeData?.disclaimer}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
