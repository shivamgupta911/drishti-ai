import React, { useState, useEffect } from 'react';
import { Sliders, RefreshCw, ArrowUpRight, ArrowDownRight, Minus, AlertTriangle, CheckCircle2, RotateCcw, ShieldAlert } from 'lucide-react';
import { getApiUrl, safeParseResponse } from '../config/api';

/**
 * Drishti AI - What-If Hiring Simulator Component
 * Allows talent partners to simulate scoring policy adjustments, component weights,
 * and qualification reclassifications with live mathematical validation and rank shift diagnostics.
 */
export default function WhatIfSimulator({ jobs = [], selectedJobId, onSelectJob, showBanner }) {
  const [activeJobId, setActiveJobId] = useState(selectedJobId || (jobs[0]?._id || ''));
  const [loadingSim, setLoadingSim] = useState(false);
  const [simResults, setSimResults] = useState(null);
  const [simError, setSimError] = useState(null);

  // Scenario Configuration State
  const [skillsWeight, setSkillsWeight] = useState(60);
  const [expWeight, setExpWeight] = useState(20);
  const [semanticWeight, setSemanticWeight] = useState(15);
  const [prefWeight, setPrefWeight] = useState(5);
  const [minExpOverride, setMinExpOverride] = useState(null);
  const [mandatorySkills, setMandatorySkills] = useState([]);
  const [preferredSkills, setPreferredSkills] = useState([]);

  // Active Job Object
  const currentJob = jobs.find((j) => j._id === activeJobId) || jobs[0];

  // Initialize or reset scenario whenever active job changes
  useEffect(() => {
    if (currentJob) {
      setMinExpOverride(currentJob.minExperienceYears || 0);
      const reqs = (currentJob.requiredSkills || []).map((s) => (typeof s === 'string' ? s : s.name));
      const prefs = (currentJob.preferredSkills || []).map((s) => (typeof s === 'string' ? s : s.name));
      setMandatorySkills(reqs);
      setPreferredSkills(prefs);
    }
  }, [activeJobId, currentJob]);

  // Compute Total Weight Sum for mathematical 100% enforcement
  const totalWeight = skillsWeight + expWeight + semanticWeight + prefWeight;
  const isWeightValid = totalWeight === 100;

  // Run Simulation API Call
  const handleRunSimulation = async () => {
    if (!isWeightValid) {
      setSimError(`Weights must sum to exactly 100%. Current sum: ${totalWeight}%.`);
      return;
    }
    setLoadingSim(true);
    setSimError(null);

    try {
      const res = await fetch(getApiUrl('/api/analytics/simulate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          jobId: activeJobId,
          weights: {
            skillsWeight: skillsWeight / 100,
            experienceWeight: expWeight / 100,
            semanticWeight: semanticWeight / 100,
            preferredWeight: prefWeight / 100,
          },
          minExperienceOverride: Number(minExpOverride),
          mandatorySkillsOverride: mandatorySkills,
          preferredSkillsOverride: preferredSkills,
        }),
      });

      const data = await safeParseResponse(res);
      setSimResults(data.data);
      if (showBanner) showBanner('What-If simulation executed with updated policy weights!');
    } catch (err) {
      setSimError(err.message || 'Simulation execution failed.');
    } finally {
      setLoadingSim(false);
    }
  };

  // Run initial simulation on load
  useEffect(() => {
    if (activeJobId && isWeightValid) {
      handleRunSimulation();
    }
  }, [activeJobId]);

  // Toggle a skill between Mandatory and Preferred
  const handleToggleSkillClassification = (skillName) => {
    if (mandatorySkills.includes(skillName)) {
      setMandatorySkills((prev) => prev.filter((s) => s !== skillName));
      setPreferredSkills((prev) => [...prev, skillName]);
    } else {
      setPreferredSkills((prev) => prev.filter((s) => s !== skillName));
      setMandatorySkills((prev) => [...prev, skillName]);
    }
  };

  // Reset to Baseline Defaults
  const handleResetDefaults = () => {
    setSkillsWeight(60);
    setExpWeight(20);
    setSemanticWeight(15);
    setPrefWeight(5);
    if (currentJob) {
      setMinExpOverride(currentJob.minExperienceYears || 0);
      setMandatorySkills((currentJob.requiredSkills || []).map((s) => (typeof s === 'string' ? s : s.name)));
      setPreferredSkills((currentJob.preferredSkills || []).map((s) => (typeof s === 'string' ? s : s.name)));
    }
    setSimError(null);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-[#DDE3E1] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#E5F3EF] text-[#187D70]">
              <Sliders className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#202B35] tracking-tight">
              What-If Hiring Policy Simulator
            </h1>
          </div>
          <p className="text-[#65717D] text-sm mt-1 max-w-2xl">
            Simulate the impact of modifying candidate evaluation weights, experience thresholds, and skill classifications without altering immutable candidate records.
          </p>
        </div>

        {/* Job Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-[#65717D] uppercase font-mono tracking-wider">
            Requisition:
          </label>
          <select
            value={activeJobId}
            onChange={(e) => {
              setActiveJobId(e.target.value);
              if (onSelectJob) onSelectJob(e.target.value);
            }}
            className="px-3 py-2 rounded-lg bg-white border border-[#DDE3E1] text-xs font-medium text-[#202B35] focus:outline-none focus:border-[#187D70]"
          >
            {jobs.map((j) => (
              <option key={j._id} value={j._id}>
                {j.title} ({j.department})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Controls Panel & Simulated Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Simulation Controls (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-xl bg-white border border-[#DDE3E1] shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#DDE3E1] pb-4">
              <h2 className="text-sm font-semibold text-[#202B35] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#187D70]" />
                <span>Component Weight Sliders</span>
              </h2>

              <button
                onClick={handleResetDefaults}
                className="text-xs text-[#65717D] hover:text-[#202B35] flex items-center gap-1 font-medium transition"
                title="Reset to production defaults"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Total Weight Verification Alert */}
            <div
              className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                isWeightValid
                  ? 'bg-[#E3F5EC] border-[#A7E4C4] text-[#187D58]'
                  : 'bg-[#FDE8E9] border-[#F4B3B7] text-[#BD4148]'
              }`}
            >
              <div className="flex items-center gap-2">
                {isWeightValid ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>
                  {isWeightValid
                    ? 'Weight Constraint Valid: Sum = 100%'
                    : `Invalid Sum: ${totalWeight}% (Must equal 100%)`}
                </span>
              </div>
              <span className="font-mono font-bold">{totalWeight}%</span>
            </div>

            {/* Slider 1: Mandatory Skills Weight */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#202B35]">Mandatory Skills Weight</span>
                <span className="font-mono text-[#187D70] font-bold">{skillsWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={skillsWeight}
                onChange={(e) => setSkillsWeight(Number(e.target.value))}
                className="w-full accent-[#187D70] cursor-pointer"
              />
              <span className="text-[11px] text-[#65717D] block">Exact, synonym, and domain transfer credits.</span>
            </div>

            {/* Slider 2: Experience Tenure Weight */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#202B35]">Tenure &amp; Duration Weight</span>
                <span className="font-mono text-[#187D70] font-bold">{expWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={expWeight}
                onChange={(e) => setExpWeight(Number(e.target.value))}
                className="w-full accent-[#187D70] cursor-pointer"
              />
              <span className="text-[11px] text-[#65717D] block">Candidate verified career years vs requirement.</span>
            </div>

            {/* Slider 3: Semantic Vector Cosine Weight */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#202B35]">Semantic Vector Cosine</span>
                <span className="font-mono text-[#187D70] font-bold">{semanticWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={semanticWeight}
                onChange={(e) => setSemanticWeight(Number(e.target.value))}
                className="w-full accent-[#187D70] cursor-pointer"
              />
              <span className="text-[11px] text-[#65717D] block">TF-IDF semantic vocabulary distribution overlap.</span>
            </div>

            {/* Slider 4: Preferred Skills Bonus Weight */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#202B35]">Preferred Bonus Weight</span>
                <span className="font-mono text-[#187D70] font-bold">{prefWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="5"
                value={prefWeight}
                onChange={(e) => setPrefWeight(Number(e.target.value))}
                className="w-full accent-[#187D70] cursor-pointer"
              />
              <span className="text-[11px] text-[#65717D] block">Additional credit for optional nice-to-have capabilities.</span>
            </div>

            {/* Experience Threshold Override */}
            <div className="pt-4 border-t border-[#DDE3E1] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#202B35]">Minimum Experience Threshold Override</span>
                <span className="font-mono text-[#187D70] font-bold">{minExpOverride} Years</span>
              </div>
              <input
                type="range"
                min="0"
                max="12"
                step="1"
                value={minExpOverride || 0}
                onChange={(e) => setMinExpOverride(Number(e.target.value))}
                className="w-full accent-[#187D70] cursor-pointer"
              />
              <span className="text-[11px] text-[#65717D] block">Original Job Requirement: {currentJob?.minExperienceYears || 0} Years.</span>
            </div>

            {/* Requirement Reclassification Toggles */}
            <div className="pt-4 border-t border-[#DDE3E1] space-y-3">
              <span className="text-xs font-semibold text-[#202B35] block">
                Requirement Classification (Click tag to toggle Mandatory ↔ Preferred):
              </span>
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#65717D] block mb-1">
                    Mandatory Qualifications ({mandatorySkills.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {mandatorySkills.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleToggleSkillClassification(s)}
                        className="px-2 py-1 rounded bg-[#E5F3EF] border border-[#187D70]/20 text-[#187D70] text-xs font-medium hover:bg-[#FDE8E9] hover:text-[#BD4148] hover:border-[#F4B3B7] transition cursor-pointer"
                        title="Click to demote to Preferred"
                      >
                        {s} (Mandatory)
                      </button>
                    ))}
                  </div>
                </div>

                {preferredSkills.length > 0 && (
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#65717D] block mb-1">
                      Preferred / Bonus Skills ({preferredSkills.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {preferredSkills.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleToggleSkillClassification(s)}
                          className="px-2 py-1 rounded bg-[#EEF2F1] border border-[#DDE3E1] text-[#202B35] text-xs font-medium hover:bg-[#E5F3EF] hover:text-[#187D70] hover:border-[#187D70]/20 transition cursor-pointer"
                          title="Click to promote to Mandatory"
                        >
                          {s} (Preferred)
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Trigger Simulation Button */}
            <button
              onClick={handleRunSimulation}
              disabled={loadingSim || !isWeightValid}
              className="w-full py-2.5 rounded-lg bg-[#187D70] hover:bg-[#12685E] text-white text-xs font-semibold transition disabled:opacity-40 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              {loadingSim ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sliders className="w-3.5 h-3.5" />
              )}
              <span>Recalculate Scenario Rankings</span>
            </button>
          </div>
        </div>

        {/* Right Column: Comparative Rankings & Impact Diagnostics (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Summary KPI Strip */}
          {simResults && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-white border border-[#DDE3E1] shadow-xs">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#65717D] block">Evaluated</span>
                <span className="text-xl font-bold text-[#202B35] mt-1 block tabular-nums">
                  {simResults.summary.candidatesEvaluated}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-white border border-[#DDE3E1] shadow-xs">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#187D58] block">Rank Rose</span>
                <span className="text-xl font-bold text-[#187D58] mt-1 block tabular-nums flex items-center gap-1">
                  <ArrowUpRight className="w-4 h-4" />
                  {simResults.summary.candidatesMovedUp}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-white border border-[#DDE3E1] shadow-xs">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#BD4148] block">Rank Fell</span>
                <span className="text-xl font-bold text-[#BD4148] mt-1 block tabular-nums flex items-center gap-1">
                  <ArrowDownRight className="w-4 h-4" />
                  {simResults.summary.candidatesMovedDown}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-white border border-[#DDE3E1] shadow-xs">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#65717D] block">Unchanged</span>
                <span className="text-xl font-bold text-[#202B35] mt-1 block tabular-nums">
                  {simResults.summary.candidatesUnchanged}
                </span>
              </div>
            </div>
          )}

          {/* Results Table */}
          <div className="rounded-xl bg-white border border-[#DDE3E1] shadow-xs overflow-hidden">
            <div className="p-5 border-b border-[#DDE3E1] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#202B35]">
                  Original vs. Simulated Candidate Rankings
                </h3>
                <p className="text-xs text-[#65717D] mt-0.5">
                  Side-by-side comparison illustrating candidate movement under the simulated policy.
                </p>
              </div>

              {simResults && (
                <span className="text-xs font-mono text-[#187D70] bg-[#E5F3EF] px-2.5 py-1 rounded-md">
                  Scenario ID: {simResults.scenarioId.slice(0, 12)}
                </span>
              )}
            </div>

            {loadingSim ? (
              <div className="p-12 text-center text-[#65717D] space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#187D70]" />
                <p className="text-xs">Computing candidate score vectors under simulated weights...</p>
              </div>
            ) : simError ? (
              <div className="p-8 text-center text-xs text-[#BD4148] bg-[#FDE8E9]">
                {simError}
              </div>
            ) : simResults?.results.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#65717D]">
                No evaluated candidates available for this role. Click "Seed Data" to load candidate records.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#EEF2F1] text-[#65717D] uppercase font-mono text-[10px] tracking-wider border-b border-[#DDE3E1]">
                    <tr>
                      <th className="py-3 px-4">Sim. Rank</th>
                      <th className="py-3 px-4">Candidate</th>
                      <th className="py-3 px-4 text-center">Orig. Rank</th>
                      <th className="py-3 px-4 text-center">Score Delta</th>
                      <th className="py-3 px-4 text-right">Simulated Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDE3E1] text-[#202B35]">
                    {simResults?.results.map((c) => {
                      const movedUp = c.rankDelta > 0;
                      const movedDown = c.rankDelta < 0;

                      return (
                        <tr key={c.candidateId} className="hover:bg-[#F9FAF9] transition">
                          <td className="py-3 px-4 font-mono font-bold text-sm">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#EEF2F1] text-[#202B35]">
                              #{c.simulatedRank}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-[#202B35]">{c.candidateName}</div>
                            <div className="text-[11px] text-[#65717D] mt-0.5 max-w-sm">
                              {c.shiftExplanation || 'No rank shift detected under current weights.'}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-[#65717D]">
                            #{c.originalRank}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {movedUp && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E3F5EC] text-[#187D58] font-bold text-[11px] border border-[#A7E4C4]">
                                <ArrowUpRight className="w-3 h-3" />+{c.rankDelta}
                              </span>
                            )}
                            {movedDown && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FDE8E9] text-[#BD4148] font-bold text-[11px] border border-[#F4B3B7]">
                                <ArrowDownRight className="w-3 h-3" />{c.rankDelta}
                              </span>
                            )}
                            {!movedUp && !movedDown && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#EEF2F1] text-[#65717D] text-[11px]">
                                <Minus className="w-3 h-3" /> 0
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-mono font-bold text-sm text-[#187D70]">
                              {c.simulatedScore}%
                            </span>
                            <span className="text-[10px] text-[#65717D] block font-mono">
                              Orig: {c.originalScore}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Responsibility Notice */}
            <div className="p-4 bg-[#F5F8F7] border-t border-[#DDE3E1] text-[11px] text-[#65717D] flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-[#A96512] shrink-0 mt-0.5" />
              <span>
                Simulated ranking adjustments serve decision-support exploration and do not constitute an autonomous hiring policy or legal certification of adverse-impact compliance.
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
