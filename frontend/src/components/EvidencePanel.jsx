import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle, HelpCircle, FileText, ChevronDown, ChevronUp, Search } from 'lucide-react';

/**
 * Drishti AI - Evidence Panel Component
 * Displays structured, verifiable resume evidence traces for matched and missing qualifications.
 * Explicitly distinguishes facts from inferences and separates evidence confidence from hiring probability.
 */
export default function EvidencePanel({ evidenceTraces = [], candidateName = 'Candidate', jobTitle = 'Role' }) {
  const [filterCategory, setFilterCategory] = useState('all'); // 'all' | 'exact_match' | 'synonym_match' | 'affinity_match' | 'missing'
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  if (!evidenceTraces || evidenceTraces.length === 0) {
    return (
      <div className="p-6 rounded-xl bg-white border border-[#DDE3E1] shadow-xs text-center text-xs text-[#65717D]">
        No evidence traces recorded for this evaluation yet. Run evaluation to extract verified excerpts.
      </div>
    );
  }

  // Filter traces
  const filtered = evidenceTraces.filter((trace) => {
    if (filterCategory !== 'all' && trace.category !== filterCategory) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        trace.requirement.toLowerCase().includes(q) ||
        (trace.matchedTerm && trace.matchedTerm.toLowerCase().includes(q)) ||
        (trace.excerpt && trace.excerpt.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const exactCount = evidenceTraces.filter((t) => t.category === 'exact_match').length;
  const synonymCount = evidenceTraces.filter((t) => t.category === 'synonym_match').length;
  const affinityCount = evidenceTraces.filter((t) => t.category === 'affinity_match').length;
  const missingCount = evidenceTraces.filter((t) => t.category === 'missing').length;

  return (
    <div className="rounded-xl bg-white border border-[#DDE3E1] shadow-xs overflow-hidden">
      {/* Evidence Panel Header */}
      <div className="p-5 border-b border-[#DDE3E1] bg-[#F5F8F7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-[#E5F3EF] text-[#187D70]">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-semibold text-[#202B35]">
              Evidence-Backed Qualification Audit
            </h3>
          </div>
          <p className="text-xs text-[#65717D] mt-1">
            Verifiable resume citations and extraction rationale for <strong className="text-[#202B35]">{candidateName}</strong> against <span className="text-[#187D70]">{jobTitle}</span>.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#65717D]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search requirements or citations..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[#DDE3E1] bg-white text-xs text-[#202B35] placeholder:text-[#65717D] focus:outline-none focus:border-[#187D70]"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-3 border-b border-[#DDE3E1] bg-white overflow-x-auto text-xs">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-2.5 py-1 rounded-md font-medium transition ${
            filterCategory === 'all'
              ? 'bg-[#202B35] text-white'
              : 'text-[#65717D] hover:bg-[#EEF2F1] hover:text-[#202B35]'
          }`}
        >
          All Requirements ({evidenceTraces.length})
        </button>
        <button
          onClick={() => setFilterCategory('exact_match')}
          className={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1 ${
            filterCategory === 'exact_match'
              ? 'bg-[#E3F5EC] text-[#187D58] border border-[#A7E4C4]'
              : 'text-[#65717D] hover:bg-[#EEF2F1]'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#187D58]" />
          Direct Match ({exactCount})
        </button>
        <button
          onClick={() => setFilterCategory('synonym_match')}
          className={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1 ${
            filterCategory === 'synonym_match'
              ? 'bg-[#E5F3EF] text-[#187D70] border border-[#187D70]/20'
              : 'text-[#65717D] hover:bg-[#EEF2F1]'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#187D70]" />
          Synonym ({synonymCount})
        </button>
        <button
          onClick={() => setFilterCategory('affinity_match')}
          className={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1 ${
            filterCategory === 'affinity_match'
              ? 'bg-[#EEF2F1] text-[#202B35] border border-[#DDE3E1]'
              : 'text-[#65717D] hover:bg-[#EEF2F1]'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#65717D]" />
          Transferable ({affinityCount})
        </button>
        <button
          onClick={() => setFilterCategory('missing')}
          className={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1 ${
            filterCategory === 'missing'
              ? 'bg-[#FDE8E9] text-[#BD4148] border border-[#F4B3B7]'
              : 'text-[#65717D] hover:bg-[#EEF2F1]'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#BD4148]" />
          Unverified / Gap ({missingCount})
        </button>
      </div>

      {/* Traces List */}
      <div className="divide-y divide-[#DDE3E1]">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#65717D]">
            No requirements match the selected filter.
          </div>
        ) : (
          filtered.map((trace, idx) => {
            const isExpanded = expandedIndex === idx;
            const isMissing = trace.category === 'missing';
            const isSynonym = trace.category === 'synonym_match';
            const isAffinity = trace.category === 'affinity_match';
            const isExact = trace.category === 'exact_match';

            return (
              <div key={idx} className="p-4 hover:bg-[#F9FAF9] transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {isExact && <CheckCircle2 className="w-4 h-4 text-[#187D58]" />}
                      {isSynonym && <ShieldCheck className="w-4 h-4 text-[#187D70]" />}
                      {isAffinity && <HelpCircle className="w-4 h-4 text-[#A96512]" />}
                      {isMissing && <AlertCircle className="w-4 h-4 text-[#BD4148]" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-[#202B35]">
                          {trace.requirement}
                        </span>

                        {isExact && (
                          <span className="px-2 py-0.5 rounded bg-[#E3F5EC] text-[#187D58] border border-[#A7E4C4] text-[10px] font-medium">
                            Direct Match
                          </span>
                        )}
                        {isSynonym && (
                          <span className="px-2 py-0.5 rounded bg-[#E5F3EF] text-[#187D70] border border-[#187D70]/20 text-[10px] font-medium">
                            Synonym: {trace.matchedTerm}
                          </span>
                        )}
                        {isAffinity && (
                          <span className="px-2 py-0.5 rounded bg-[#FDF6E2] text-[#A96512] border border-[#F5D698] text-[10px] font-medium">
                            Transferable: {trace.matchedTerm}
                          </span>
                        )}
                        {isMissing && (
                          <span className="px-2 py-0.5 rounded bg-[#FDE8E9] text-[#BD4148] border border-[#F4B3B7] text-[10px] font-medium">
                            Unverified in Resume
                          </span>
                        )}

                        <span className="text-[10px] text-[#65717D] bg-[#EEF2F1] px-2 py-0.5 rounded font-mono">
                          Evidence Quality: <strong className="text-[#202B35]">{trace.evidenceQuality || 'N/A'}</strong>
                        </span>
                      </div>

                      {/* Excerpt Citation */}
                      {trace.excerpt && (
                        <div className="mt-2 text-xs bg-[#F5F8F7] border border-[#DDE3E1] rounded-lg p-2.5 text-[#202B35] font-mono leading-relaxed">
                          <div className="text-[10px] uppercase font-semibold text-[#65717D] flex items-center gap-1.5 mb-1 font-sans">
                            <FileText className="w-3 h-3 text-[#187D70]" />
                            <span>Source Section: {trace.sourceSection || 'Resume Excerpt'}</span>
                          </div>
                          <span className="text-[#202B35] text-[11px]">"{trace.excerpt}"</span>
                        </div>
                      )}

                      {/* Rationale explanation */}
                      <p className="text-xs text-[#65717D] mt-2 leading-relaxed">
                        {trace.rationale}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                    className="p-1 rounded text-[#65717D] hover:text-[#202B35] hover:bg-[#EEF2F1] shrink-0"
                    title="Toggle detailed audit metadata"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-[#DDE3E1] text-xs space-y-1.5 bg-white p-3 rounded-lg border">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-[#65717D] block">Target Requirement:</span>
                        <span className="font-semibold text-[#202B35]">{trace.requirement}</span>
                      </div>
                      <div>
                        <span className="text-[#65717D] block">Matched Candidate Artifact:</span>
                        <span className="font-mono text-[#187D70]">{trace.matchedTerm || 'None'}</span>
                      </div>
                      <div>
                        <span className="text-[#65717D] block">Source Section Location:</span>
                        <span className="text-[#202B35]">{trace.sourceSection || 'Unspecified'}</span>
                      </div>
                      <div>
                        <span className="text-[#65717D] block">Evidence Confidence Metric:</span>
                        <span className="text-[#202B35] font-semibold">{trace.evidenceQuality?.toUpperCase()} (Citations verified)</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-[#65717D] italic pt-1">
                      * Note: Evidence confidence measures citation presence in candidate document, and is strictly independent of general hiring probability.
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
