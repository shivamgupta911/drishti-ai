import React, { useState, useEffect } from 'react';
import { UserCheck, CheckCircle2, AlertCircle, RefreshCw, Send, Star, ShieldAlert, FileText } from 'lucide-react';
import { getApiUrl, safeParseResponse } from '../config/api';

/**
 * Drishti AI - Recruitment Outcome Tracker Component
 * Enables recruiters to record pipeline stages, interview assessments, and structured feedback.
 */
export default function OutcomeTracker({ candidates = [], jobs = [], selectedJobId, showBanner, activeUser }) {
  const [activeJobId, setActiveJobId] = useState(selectedJobId || (jobs[0]?._id || ''));
  const [selectedResumeId, setSelectedResumeId] = useState(candidates[0]?._id || '');
  const [outcomes, setOutcomes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [stage, setStage] = useState('pending');
  const [techRating, setTechRating] = useState(4);
  const [cultRating, setCultRating] = useState(4);
  const [notes, setNotes] = useState('');
  const [dispositionReason, setDispositionReason] = useState('');

  const fetchOutcomes = async () => {
    setLoading(true);
    try {
      const url = getApiUrl(`/api/outcomes${activeJobId ? `?jobId=${activeJobId}` : ''}`);
      const res = await fetch(url);
      const data = await safeParseResponse(res);
      setOutcomes(data.data || []);

      // If an existing outcome exists for selected candidate, populate form
      const existing = (data.data || []).find(
        (o) => o.resumeId?._id === selectedResumeId || o.resumeId === selectedResumeId
      );
      if (existing) {
        setStage(existing.stage || 'pending');
        setTechRating(existing.recruiterFeedback?.technicalCompetencyRating || 4);
        setCultRating(existing.recruiterFeedback?.culturalAlignmentRating || 4);
        setNotes(existing.recruiterFeedback?.notes || '');
        setDispositionReason(existing.recruiterFeedback?.dispositionReason || '');
      } else {
        setStage('pending');
        setNotes('');
        setDispositionReason('');
      }
    } catch (err) {
      console.error('Error fetching outcomes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeJobId) {
      fetchOutcomes();
    }
  }, [activeJobId, selectedResumeId]);

  const handleSubmitOutcome = async (e) => {
    e.preventDefault();
    if (!selectedResumeId || !activeJobId) return;
    setSaving(true);

    try {
      const res = await fetch(getApiUrl('/api/outcomes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          resumeId: selectedResumeId,
          jobId: activeJobId,
          stage,
          technicalCompetencyRating: techRating,
          culturalAlignmentRating: cultRating,
          notes,
          dispositionReason,
          recordedBy: {
            userId: 'usr_recruiter_current',
            userName: activeUser?.name || 'Sarah Connor',
            userRole: activeUser?.role || 'recruiter',
          },
        }),
      });

      await safeParseResponse(res);
      if (showBanner) showBanner(`Applicant stage updated to '${stage.toUpperCase()}'.`);
      await fetchOutcomes();
    } catch (err) {
      if (showBanner) showBanner(`Failed to save outcome: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const selectedCandidate = candidates.find((c) => c._id === selectedResumeId) || candidates[0];
  const selectedJob = jobs.find((j) => j._id === activeJobId) || jobs[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-[#DDE3E1] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#E5F3EF] text-[#187D70]">
              <UserCheck className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#202B35] tracking-tight">
              Recruitment Pipeline Outcome Tracker
            </h1>
          </div>
          <p className="text-[#65717D] text-sm mt-1 max-w-2xl">
            Track interview progression, dispositions, and structured candidate feedback to monitor decision alignment over time.
          </p>
        </div>

        {/* Requisition Select */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-[#65717D] uppercase font-mono tracking-wider">
            Requisition:
          </label>
          <select
            value={activeJobId}
            onChange={(e) => setActiveJobId(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white border border-[#DDE3E1] text-xs font-medium text-[#202B35] focus:outline-none focus:border-[#187D70]"
          >
            {jobs.map((j) => (
              <option key={j._id} value={j._id}>
                {j.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Outcome Form (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleSubmitOutcome} className="p-6 rounded-xl bg-white border border-[#DDE3E1] shadow-xs space-y-5">
            <h2 className="text-sm font-semibold text-[#202B35] flex items-center gap-2 border-b border-[#DDE3E1] pb-3">
              <FileText className="w-4 h-4 text-[#187D70]" />
              <span>Record Pipeline Stage</span>
            </h2>

            {/* Candidate Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#202B35]">Applicant:</label>
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-[#DDE3E1] bg-[#F5F6F3] text-xs text-[#202B35] focus:outline-none focus:border-[#187D70]"
              >
                {candidates.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.candidateName} ({c.totalExperienceYears} yrs exp)
                  </option>
                ))}
              </select>
            </div>

            {/* Stage Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#202B35]">Hiring Pipeline Stage:</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-[#DDE3E1] bg-white text-xs font-semibold text-[#187D70] focus:outline-none focus:border-[#187D70]"
              >
                <option value="pending">Pending Initial Review</option>
                <option value="shortlisted">Shortlisted for Screening</option>
                <option value="interviewed">Panel Interview Completed</option>
                <option value="hired">Offer Extended &amp; Hired</option>
                <option value="rejected">Rejected / Not Selected</option>
                <option value="withdrawn">Candidate Withdrawn</option>
              </select>
            </div>

            {/* Ratings */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#65717D]">Technical Competency:</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setTechRating(star)}
                      className="p-1 text-[#A96512]"
                    >
                      <Star className={`w-4 h-4 ${star <= techRating ? 'fill-[#A96512]' : 'text-[#DDE3E1]'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#65717D]">Cultural Alignment:</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setCultRating(star)}
                      className="p-1 text-[#187D70]"
                    >
                      <Star className={`w-4 h-4 ${star <= cultRating ? 'fill-[#187D70]' : 'text-[#DDE3E1]'}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Disposition & Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#202B35]">Recruiter Assessment Notes:</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Document interview impressions, project walkthrough notes, or team feedback..."
                className="w-full p-2.5 rounded-lg border border-[#DDE3E1] text-xs text-[#202B35] focus:outline-none focus:border-[#187D70]"
              />
            </div>

            {stage === 'rejected' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#BD4148]">Specific Disposition Rationale:</label>
                <input
                  type="text"
                  value={dispositionReason}
                  onChange={(e) => setDispositionReason(e.target.value)}
                  placeholder="e.g., Lacks required distributed systems experience..."
                  className="w-full p-2.5 rounded-lg border border-[#F4B3B7] bg-[#FDE8E9]/30 text-xs text-[#202B35] focus:outline-none"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-lg bg-[#187D70] hover:bg-[#12685E] text-white text-xs font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Save Applicant Outcome</span>
            </button>
          </form>
        </div>

        {/* Right Column: Active Pipeline Funnel (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-xl bg-white border border-[#DDE3E1] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#DDE3E1] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#202B35]">
                  Recorded Outcomes for {selectedJob?.title}
                </h3>
                <span className="text-xs text-[#65717D]">
                  {outcomes.length} Applicants with tracked stage disposition
                </span>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-[#65717D]">Loading outcomes...</div>
            ) : outcomes.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#65717D]">
                No outcomes logged yet for this requisition. Select an applicant on the left to record their status.
              </div>
            ) : (
              <div className="divide-y divide-[#DDE3E1]">
                {outcomes.map((o) => {
                  let badgeBg = 'bg-[#EEF2F1] text-[#65717D]';
                  if (o.stage === 'hired') badgeBg = 'bg-[#E3F5EC] text-[#187D58] border border-[#A7E4C4]';
                  else if (o.stage === 'interviewed' || o.stage === 'shortlisted') badgeBg = 'bg-[#E5F3EF] text-[#187D70] border border-[#187D70]/20';
                  else if (o.stage === 'rejected') badgeBg = 'bg-[#FDE8E9] text-[#BD4148] border border-[#F4B3B7]';

                  return (
                    <div key={o._id} className="p-4 hover:bg-[#F9FAF9] transition space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-[#202B35]">
                          {o.resumeId?.candidateName || 'Candidate'}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${badgeBg}`}>
                          {o.stage}
                        </span>
                      </div>

                      {o.recruiterFeedback?.notes && (
                        <p className="text-xs text-[#65717D] italic">
                          "{o.recruiterFeedback.notes}"
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-[#65717D] pt-1">
                        <span>Recorded by: {o.recordedBy?.userName || 'Recruiter'}</span>
                        <span className="font-mono">{new Date(o.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ethical Notice */}
          <div className="p-4 bg-[#F5F8F7] rounded-xl border border-[#DDE3E1] text-xs text-[#65717D] flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-[#A96512] shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              Recruitment outcomes reflect nuanced human interview interactions. Drishti AI does not automatically retrain matching models on recruiter outcomes to prevent reinforcing historical hiring biases.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
