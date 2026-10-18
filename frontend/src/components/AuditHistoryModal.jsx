import React, { useState, useEffect } from 'react';
import { X, History, ShieldCheck, UserCheck, RefreshCw, AlertCircle, CheckCircle2, ChevronRight, GitCommit } from 'lucide-react';
import { getApiUrl, safeParseResponse } from '../config/api';

/**
 * Drishti AI - Audit History & Version Ledger Modal
 * Explores immutable evaluation history records and logs authorized recruiter overrides with reasoning.
 */
export default function AuditHistoryModal({ isOpen, onClose, selectedJobId, showBanner, activeUser }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Override form state
  const [overrideDecision, setOverrideDecision] = useState('qualify');
  const [overrideReason, setOverrideReason] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const url = getApiUrl(`/api/audit-history${selectedJobId ? `?jobId=${selectedJobId}` : ''}`);
      const res = await fetch(url);
      const data = await safeParseResponse(res);
      setRecords(data.data || []);
      if (data.data && data.data.length > 0 && !selectedRecord) {
        setSelectedRecord(data.data[0]);
      }
    } catch (err) {
      console.error('Failed to load audit history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, selectedJobId]);

  const handleSaveOverride = async (e) => {
    e.preventDefault();
    if (!selectedRecord || !overrideReason.trim()) return;
    setSubmittingOverride(true);

    try {
      const res = await fetch(getApiUrl(`/api/audit-history/${selectedRecord.evaluationId}/override`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          newDecision: overrideDecision,
          reason: overrideReason,
          overriddenBy: `${activeUser?.name || 'Authorized Recruiter'} (${activeUser?.title || 'Talent Partner'})`,
        }),
      });

      const data = await safeParseResponse(res);
      setSelectedRecord(data.data);
      setOverrideReason('');
      if (showBanner) showBanner('Recruiter override decision committed to immutable ledger.');
      await fetchHistory();
    } catch (err) {
      if (showBanner) showBanner(`Override failed: ${err.message}`);
    } finally {
      setSubmittingOverride(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl border border-[#DDE3E1] shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#DDE3E1] flex items-center justify-between bg-[#F5F8F7]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[#E5F3EF] border border-[#187D70]/20 flex items-center justify-center text-[#187D70]">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#202B35]">Evaluation Audit Ledger &amp; Version History</h2>
              <span className="text-xs text-[#65717D]">
                Cryptographically tracked candidate-job evaluations and recruiter overrides.
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-[#DDE3E1] bg-white hover:bg-[#EEF2F1] text-[#65717D] hover:text-[#202B35] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Historical Records List (5 Cols) */}
          <div className="md:col-span-5 border border-[#DDE3E1] rounded-xl overflow-hidden flex flex-col max-h-[500px]">
            <div className="p-3 bg-[#EEF2F1] border-b border-[#DDE3E1] text-xs font-semibold text-[#202B35]">
              Persisted Audits ({records.length})
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#DDE3E1]">
              {loading ? (
                <div className="p-8 text-center text-xs text-[#65717D]">Loading audit ledger...</div>
              ) : records.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#65717D]">No audit records found. Click "Seed Data" or run Match Studio evaluations.</div>
              ) : (
                records.map((r) => {
                  const isSelected = selectedRecord?.evaluationId === r.evaluationId;
                  return (
                    <div
                      key={r.evaluationId}
                      onClick={() => setSelectedRecord(r)}
                      className={`p-3 text-xs cursor-pointer transition ${
                        isSelected ? 'bg-[#E5F3EF] border-l-4 border-l-[#187D70]' : 'hover:bg-[#F9FAF9]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#202B35]">{r.resumeId?.candidateName || 'Candidate'}</span>
                        <span className="font-mono text-[#187D70] font-bold">{r.overallScore}%</span>
                      </div>
                      <div className="text-[11px] text-[#65717D] mt-0.5 truncate">{r.jobId?.title || 'Job'}</div>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-[#65717D] font-mono">
                        <span>{r.evaluationId}</span>
                        <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Selected Record Inspector & Override Form (7 Cols) */}
          <div className="md:col-span-7 space-y-4">
            {selectedRecord ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#F5F8F7] border border-[#DDE3E1] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-[#187D70]">{selectedRecord.evaluationId}</span>
                    <span className="px-2 py-0.5 rounded bg-white text-[#202B35] border border-[#DDE3E1] text-[10px] font-mono">
                      Algorithm: {selectedRecord.algorithmVersion}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-[#65717D] block text-[11px]">Candidate:</span>
                      <span className="font-semibold text-[#202B35]">{selectedRecord.resumeId?.candidateName || 'Candidate'}</span>
                    </div>
                    <div>
                      <span className="text-[#65717D] block text-[11px]">Target Role:</span>
                      <span className="font-semibold text-[#202B35]">{selectedRecord.jobId?.title || 'Job'}</span>
                    </div>
                    <div>
                      <span className="text-[#65717D] block text-[11px]">Recorded Score:</span>
                      <span className="font-bold text-sm text-[#187D70] font-mono">{selectedRecord.overallScore}% ({selectedRecord.tier})</span>
                    </div>
                    <div>
                      <span className="text-[#65717D] block text-[11px]">Audit Timestamp:</span>
                      <span className="font-mono text-[11px] text-[#202B35]">{new Date(selectedRecord.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Recruiter Override Status / Form */}
                <div className="p-4 rounded-xl bg-white border border-[#DDE3E1] space-y-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#187D70]" />
                    <span className="font-semibold text-xs text-[#202B35]">Recruiter Override Audit Trail</span>
                  </div>

                  {selectedRecord.recruiterOverride?.isOverridden ? (
                    <div className="p-3 rounded-lg bg-[#E3F5EC] border border-[#A7E4C4] text-xs space-y-1">
                      <div className="flex items-center justify-between font-semibold text-[#187D58]">
                        <span>Override Decision: {selectedRecord.recruiterOverride.newDecision?.toUpperCase()}</span>
                        <span className="text-[10px] font-mono">{new Date(selectedRecord.recruiterOverride.overriddenAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[11px] text-[#202B35]">
                        <strong>Reason:</strong> {selectedRecord.recruiterOverride.reason}
                      </p>
                      <div className="text-[10px] text-[#65717D]">
                        Actor: {selectedRecord.recruiterOverride.overriddenBy}
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSaveOverride} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-[#65717D] block mb-1">Override Action:</label>
                          <select
                            value={overrideDecision}
                            onChange={(e) => setOverrideDecision(e.target.value)}
                            className="w-full p-2 rounded-lg border border-[#DDE3E1] bg-white text-xs text-[#202B35]"
                          >
                            <option value="qualify">Qualify / Advance Candidate</option>
                            <option value="disqualify">Disqualify / Disregard Fit</option>
                            <option value="manual_pass">Manual Exceptional Pass</option>
                            <option value="re-evaluate">Request Panel Re-evaluation</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[#65717D] block mb-1">Authorized Actor:</label>
                          <input
                            type="text"
                            disabled
                            value={`${activeUser?.name || 'Sarah Connor'} (${activeUser?.title || 'Recruiter'})`}
                            className="w-full p-2 rounded-lg border border-[#DDE3E1] bg-[#EEF2F1] text-xs text-[#65717D]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[#65717D] text-xs block mb-1">Justification &amp; Qualitative Notes (Required):</label>
                        <textarea
                          rows={2}
                          required
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                          placeholder="Document verifiable rationale for overriding algorithmic recommendation..."
                          className="w-full p-2.5 rounded-lg border border-[#DDE3E1] text-xs text-[#202B35] focus:outline-none focus:border-[#187D70]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submittingOverride}
                        className="px-4 py-2 rounded-lg bg-[#187D70] hover:bg-[#12685E] text-white text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        {submittingOverride ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <GitCommit className="w-3.5 h-3.5" />}
                        <span>Commit Override Decision</span>
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-[#65717D]">
                Select an evaluation from the ledger on the left to inspect full audit details.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
