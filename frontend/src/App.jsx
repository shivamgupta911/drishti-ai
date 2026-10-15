import { useState, useEffect } from 'react';
import { 
  FileText, 
  Briefcase, 
  Target, 
  Scale, 
  Activity, 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Upload, 
  Plus, 
  ChevronRight, 
  AlertTriangle, 
  Trash2, 
  Zap, 
  BarChart3, 
  FileCheck, 
  Download 
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('matcher'); // 'matcher' | 'leaderboard' | 'comparison' | 'resumes' | 'jobs' | 'system'
  
  // Health telemetry state
  const [healthData, setHealthData] = useState(null);
  const [healthStatus, setHealthStatus] = useState('checking'); // 'checking' | 'healthy' | 'error'
  const [latency, setLatency] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  // Data collections
  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);

  // Match Studio state
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [matchError, setMatchError] = useState(null);

  // Leaderboard state
  const [leaderboardJobId, setLeaderboardJobId] = useState('');
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Comparison state
  const [compCandA, setCompCandA] = useState('');
  const [compCandB, setCompCandB] = useState('');
  const [compJobId, setCompJobId] = useState('');
  const [compResult, setCompResult] = useState(null);
  const [evaluatingComp, setEvaluatingComp] = useState(false);

  // Audit Dossier Modal state
  const [activeDossier, setActiveDossier] = useState(null);

  // Ingestion form state
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [anonymizePII, setAnonymizePII] = useState(true);
  const [submittingResume, setSubmittingResume] = useState(false);

  // Job form state
  const [jobTitle, setJobTitle] = useState('');
  const [jobDepartment, setJobDepartment] = useState('Engineering');
  const [jobExpYears, setJobExpYears] = useState(3);
  const [jobDescription, setJobDescription] = useState('');
  const [submittingJob, setSubmittingJob] = useState(false);

  // Notification message
  const [bannerMsg, setBannerMsg] = useState(null);

  const showBanner = (text) => {
    setBannerMsg(text);
    setTimeout(() => setBannerMsg(null), 4000);
  };

  const checkHealth = async () => {
    setHealthStatus('checking');
    const startTime = performance.now();
    try {
      const response = await fetch('/api/health');
      const endTime = performance.now();
      setLatency(Math.round(endTime - startTime));

      if (response.ok) {
        const data = await response.json();
        setHealthData(data);
        setHealthStatus('healthy');
      } else {
        setHealthStatus('error');
        setHealthData({ error: `Server returned HTTP ${response.status}` });
      }
    } catch (err) {
      setHealthStatus('error');
      setHealthData({ error: err.message || 'Failed to connect to backend server' });
    } finally {
      setLastChecked(new Date().toLocaleTimeString());
    }
  };

  const fetchResumesAndJobs = async () => {
    setLoadingData(true);
    try {
      const [resumesRes, jobsRes] = await Promise.all([
        fetch('/api/resumes'),
        fetch('/api/jobs'),
      ]);

      if (resumesRes.ok) {
        const rData = await resumesRes.json();
        const rList = rData.data || [];
        setResumes(rList);
        if (rList.length > 0 && !selectedResumeId) {
          setSelectedResumeId(rList[0]._id);
        }
        if (rList.length > 1 && !compCandB) {
          setCompCandA(rList[0]._id);
          setCompCandB(rList[1]._id);
        }
      }

      if (jobsRes.ok) {
        const jData = await jobsRes.json();
        const jList = jData.data || [];
        setJobs(jList);
        if (jList.length > 0 && !selectedJobId) {
          setSelectedJobId(jList[0]._id);
          setLeaderboardJobId(jList[0]._id);
          setCompJobId(jList[0]._id);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSeedData = async () => {
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      showBanner(data.message || 'Sample candidates and job postings seeded!');
      await fetchResumesAndJobs();
    } catch (err) {
      showBanner(`Seed error: ${err.message}`);
    }
  };

  const handleEvaluateMatch = async () => {
    if (!selectedResumeId || !selectedJobId) {
      setMatchError('Please select both a candidate profile and a job posting.');
      return;
    }
    setEvaluating(true);
    setMatchError(null);
    try {
      const res = await fetch('/api/matches/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeId: selectedResumeId, jobId: selectedJobId }),
      });
      const data = await res.json();
      if (res.ok) {
        setMatchResult(data.data);
      } else {
        setMatchError(data.error || 'Evaluation failed.');
      }
    } catch (err) {
      setMatchError(err.message || 'Error communicating with matching engine.');
    } finally {
      setEvaluating(false);
    }
  };

  const fetchLeaderboard = async (targetJobId) => {
    const jId = targetJobId || leaderboardJobId;
    if (!jId) return;
    setLoadingLeaderboard(true);
    try {
      const res = await fetch(`/api/matches/rank/${jId}`);
      const data = await res.json();
      if (res.ok) {
        setLeaderboardData(data.data);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const handleCompareCandidates = async () => {
    if (!compCandA || !compCandB || !compJobId) return;
    setEvaluatingComp(true);
    try {
      const res = await fetch('/api/matches/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateAId: compCandA,
          candidateBId: compCandB,
          jobId: compJobId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCompResult(data.data);
      }
    } catch (err) {
      console.error('Error comparing candidates:', err);
    } finally {
      setEvaluatingComp(false);
    }
  };

  const handleOpenDossier = async (matchId) => {
    if (!matchId) return;
    try {
      const res = await fetch(`/api/matches/${matchId}/report`);
      const data = await res.json();
      if (res.ok) {
        setActiveDossier(data.data);
      }
    } catch (err) {
      console.error('Error fetching dossier:', err);
    }
  };

  const handleCreateResume = async (e) => {
    e.preventDefault();
    setSubmittingResume(true);
    try {
      if (resumeFile) {
        const formData = new FormData();
        formData.append('resumeFile', resumeFile);
        formData.append('anonymize', String(anonymizePII));

        const res = await fetch('/api/resumes/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (res.ok) {
          showBanner('Resume uploaded, parsed, and anonymized successfully!');
          setResumeFile(null);
          await fetchResumesAndJobs();
          setActiveTab('matcher');
        } else {
          showBanner(`Upload failed: ${data.error}`);
        }
      } else if (resumeText.trim()) {
        const res = await fetch('/api/resumes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawText: resumeText, anonymize: anonymizePII }),
        });
        const data = await res.json();
        if (res.ok) {
          showBanner('Candidate profile parsed and stored successfully!');
          setResumeText('');
          await fetchResumesAndJobs();
          setActiveTab('matcher');
        } else {
          showBanner(`Parsing failed: ${data.error}`);
        }
      }
    } catch (err) {
      showBanner(`Error: ${err.message}`);
    } finally {
      setSubmittingResume(false);
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    if (!jobTitle || !jobDescription) return;
    setSubmittingJob(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: jobTitle,
          department: jobDepartment,
          minExperienceYears: Number(jobExpYears),
          description: jobDescription,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showBanner('Job posting created and required skills extracted!');
        setJobTitle('');
        setJobDescription('');
        await fetchResumesAndJobs();
        setActiveTab('matcher');
      } else {
        showBanner(`Failed: ${data.error}`);
      }
    } catch (err) {
      showBanner(`Error: ${err.message}`);
    } finally {
      setSubmittingJob(false);
    }
  };

  const handleDeleteResume = async (id) => {
    try {
      await fetch(`/api/resumes/${id}`, { method: 'DELETE' });
      showBanner('Candidate record deleted.');
      await fetchResumesAndJobs();
    } catch (err) {
      showBanner(`Delete failed: ${err.message}`);
    }
  };

  const handleDeleteJob = async (id) => {
    try {
      await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
      showBanner('Job posting deleted.');
      await fetchResumesAndJobs();
    } catch (err) {
      showBanner(`Delete failed: ${err.message}`);
    }
  };

  useEffect(() => {
    checkHealth();
    fetchResumesAndJobs();
  }, []);

  useEffect(() => {
    if (activeTab === 'leaderboard' && leaderboardJobId) {
      fetchLeaderboard(leaderboardJobId);
    }
  }, [activeTab, leaderboardJobId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white pb-16">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/20 to-sky-500/20 blur-3xl opacity-60 rounded-full" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-600/10 blur-3xl rounded-full" />
      </div>

      {/* Global Notification Banner */}
      {bannerMsg && (
        <div className="bg-indigo-600 text-white text-xs font-medium py-2 px-4 text-center fixed top-0 left-0 right-0 z-50 shadow-md flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{bannerMsg}</span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Drishti AI
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-indigo-400 block -mt-1">
                Semantic Match &amp; Audit Platform
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden lg:flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('matcher')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'matcher' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Match Studio
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === 'leaderboard' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Leaderboard</span>
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === 'comparison' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Compare Candidates</span>
            </button>
            <button
              onClick={() => setActiveTab('resumes')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'resumes' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Resumes ({resumes.length})
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'jobs' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Jobs ({jobs.length})
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'system' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Telemetry
            </button>
          </nav>

          {/* Status & Quick Action */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSeedData}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white text-xs transition"
              title="Populate test candidates with synonyms and jobs"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Seed Data</span>
            </button>

            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                {healthStatus === 'healthy' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-400 capitalize">
                      {healthData?.database?.type === 'in-memory (local-development-only)' ? 'DB (Local Dev)' : 'Online'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span className="text-rose-400">Offline</span>
                  </>
                )}
              </span>
            </div>

            <button
              onClick={() => { checkHealth(); fetchResumesAndJobs(); }}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition"
              title="Refresh status & data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${healthStatus === 'checking' ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="lg:hidden flex border-t border-slate-800/80 px-4 py-2 gap-1 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('matcher')}
            className={`px-3 py-1 rounded-lg shrink-0 ${activeTab === 'matcher' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
          >
            Match Studio
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-3 py-1 rounded-lg shrink-0 ${activeTab === 'leaderboard' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
          >
            Leaderboard
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-3 py-1 rounded-lg shrink-0 ${activeTab === 'comparison' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
          >
            Compare
          </button>
          <button
            onClick={() => setActiveTab('resumes')}
            className={`px-3 py-1 rounded-lg shrink-0 ${activeTab === 'resumes' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
          >
            Resumes ({resumes.length})
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`px-3 py-1 rounded-lg shrink-0 ${activeTab === 'jobs' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
          >
            Jobs ({jobs.length})
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-3 py-1 rounded-lg shrink-0 ${activeTab === 'system' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
          >
            Telemetry
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        
        {/* ============================================================== */}
        {/* TAB 1: MATCH STUDIO                                            */}
        {/* ============================================================== */}
        {activeTab === 'matcher' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-medium mb-2">
                  <Target className="w-3 h-3" />
                  <span>Semantic Match Studio (Day 3)</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Explainable Candidate Evaluation
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  Powered by semantic synonym resolution (e.g. K8s ↔ Kubernetes, Postgres ↔ PostgreSQL) and domain transfer affinity.
                </p>
              </div>

              {resumes.length === 0 && (
                <button
                  onClick={handleSeedData}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition self-start"
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  Load Sample Data
                </button>
              )}
            </div>

            {/* Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Candidate Selector */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
                    <FileText className="w-4 h-4" />
                    <span>Candidate Profile</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('resumes')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    + Add New
                  </button>
                </div>

                {resumes.length > 0 ? (
                  <select
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {resumes.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.candidateName} • {r.totalExperienceYears} yrs exp ({r.skills?.length || 0} skills)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                    No candidate resumes found. Click "Seed Data" or add one in the Resumes tab.
                  </div>
                )}

                {selectedResumeId && (
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/70 text-xs space-y-2">
                    {(() => {
                      const sel = resumes.find(r => r._id === selectedResumeId);
                      if (!sel) return null;
                      return (
                        <>
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="font-semibold text-white">{sel.candidateName}</span>
                            <span className="text-slate-400">{sel.totalExperienceYears} yrs experience</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {sel.skills?.map((s, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px]">
                                {typeof s === 'string' ? s : s.name}
                              </span>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Job Selector */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
                    <Briefcase className="w-4 h-4" />
                    <span>Job Description</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('jobs')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    + Add New
                  </button>
                </div>

                {jobs.length > 0 ? (
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {jobs.map((j) => (
                      <option key={j._id} value={j._id}>
                        {j.title} • {j.company} (Req: {j.minExperienceYears}+ yrs)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                    No job postings found. Click "Seed Data" or add one in the Jobs tab.
                  </div>
                )}

                {selectedJobId && (
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/70 text-xs space-y-2">
                    {(() => {
                      const sel = jobs.find(j => j._id === selectedJobId);
                      if (!sel) return null;
                      return (
                        <>
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="font-semibold text-white">{sel.title}</span>
                            <span className="text-slate-400">Min {sel.minExperienceYears} yrs required</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {sel.requiredSkills?.map((s, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-800/50 text-indigo-300 text-[10px]">
                                {typeof s === 'string' ? s : s.name}
                              </span>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Evaluate Action Button */}
            <div className="text-center">
              <button
                onClick={handleEvaluateMatch}
                disabled={evaluating || !selectedResumeId || !selectedJobId}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-xl shadow-indigo-500/25 transition disabled:opacity-40 inline-flex items-center gap-2"
              >
                {evaluating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Resolving Synonyms &amp; Evaluating...</span>
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4" />
                    <span>Run Explainable Match Evaluation</span>
                  </>
                )}
              </button>
              {matchError && (
                <p className="text-xs text-rose-400 mt-2 font-medium">{matchError}</p>
              )}
            </div>

            {/* Match Results Display */}
            {matchResult && (
              <section className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl space-y-8 animate-in fade-in duration-300">
                {/* Result Top Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-800 pb-6">
                  <div className="space-y-1">
                    <span className="text-xs uppercase font-mono tracking-wider text-slate-400">
                      Overall Compatibility Score
                    </span>
                    <div className="flex items-baseline gap-3">
                      <span className={`text-5xl font-black tracking-tight ${
                        matchResult.overallScore >= 80 ? 'text-emerald-400' :
                        matchResult.overallScore >= 60 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {matchResult.overallScore}%
                      </span>
                      <span className="text-sm font-semibold text-slate-300">
                        {matchResult.tier || (matchResult.overallScore >= 80 ? 'Tier 1: High Fit' : matchResult.overallScore >= 60 ? 'Tier 2: Moderate Fit' : 'Tier 3: Low Fit')}
                      </span>
                    </div>
                  </div>

                  {/* Factor Breakdown Bars */}
                  <div className="w-full sm:w-80 space-y-2 text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-300">
                        <span>Mandatory Skills &amp; Synonyms (65% wt)</span>
                        <span className="font-mono">{matchResult.breakdown?.skillsMatchScore}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${matchResult.breakdown?.skillsMatchScore || 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-300">
                        <span>Experience Duration (25% wt)</span>
                        <span className="font-mono">{matchResult.breakdown?.experienceMatchScore}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${matchResult.breakdown?.experienceMatchScore || 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-300">
                        <span>Preferred Bonus (up to 10%)</span>
                        <span className="font-mono">+{matchResult.breakdown?.preferredSkillsBonus || 0} pts</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${(matchResult.breakdown?.preferredSkillsBonus || 0) * 10}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Semantic Alignment Matrix (Exact, Synonym, Affinity, Missing) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Satisfied Skills & Synonyms */}
                  <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-4">
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span className="text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Satisfied Core Competencies
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {matchResult.exactMatches?.length || 0} exact, {matchResult.synonymMatches?.length || 0} synonym
                      </span>
                    </div>

                    {/* Exact matches */}
                    {matchResult.exactMatches && matchResult.exactMatches.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Direct Exact Matches</span>
                        <div className="flex flex-wrap gap-1.5">
                          {matchResult.exactMatches.map((s, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
                              ✓ {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Synonym matches */}
                    {matchResult.synonymMatches && matchResult.synonymMatches.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-900">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400">Resolved Technical Synonyms (100% credit)</span>
                        <div className="space-y-1.5">
                          {matchResult.synonymMatches.map((sm, i) => (
                            <div key={i} className="p-2 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-300 flex items-center justify-between">
                              <span className="font-semibold font-mono">{sm.candidateTerm} ➔ {sm.targetTerm}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-900 text-cyan-200">Synonym</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Affinity matches */}
                    {matchResult.affinityMatches && matchResult.affinityMatches.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-900">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-purple-400">Domain Transfer Affinities (Partial credit)</span>
                        <div className="space-y-1.5">
                          {matchResult.affinityMatches.map((am, i) => (
                            <div key={i} className="p-2 rounded-lg bg-purple-950/30 border border-purple-800/40 text-xs text-purple-300 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold font-mono">{am.candidateTerm} ➔ {am.targetTerm}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900 text-purple-200 font-mono">
                                  {Math.round(am.affinityScore * 100)}% credit
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 leading-tight">{am.attribution}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Missing Skills (Gap Analysis) */}
                  <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-4">
                    <div className="flex items-center gap-2 text-rose-400 text-sm font-semibold">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Missing Mandatory Qualifications ({matchResult.missingRequiredSkills?.length || 0})</span>
                    </div>

                    {matchResult.missingRequiredSkills && matchResult.missingRequiredSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {matchResult.missingRequiredSkills.map((s, i) => (
                          <span key={i} className="px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
                            ✕ {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-emerald-400 p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Zero mandatory skill gaps! Candidate fulfills 100% of core role competencies.</span>
                      </div>
                    )}

                    {/* Seniority Duration Check */}
                    <div className="pt-3 border-t border-slate-900 space-y-2">
                      <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400">Experience Duration Check</span>
                      <div className="flex items-center justify-between text-xs bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                        <span>
                          Candidate: <strong className="text-white">{matchResult.experienceComparison?.candidateYears} yrs</strong> / Required: <strong className="text-white">{matchResult.experienceComparison?.requiredYears} yrs</strong>
                        </span>
                        <span className={`px-2 py-0.5 rounded-full font-semibold uppercase text-[10px] ${
                          matchResult.experienceComparison?.status === 'exceeds' ? 'bg-emerald-500/20 text-emerald-300' :
                          matchResult.experienceComparison?.status === 'meets' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-amber-500/20 text-amber-300'
                        }`}>
                          {matchResult.experienceComparison?.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Plain-English Explainability Narrative */}
                <div className="p-6 rounded-2xl bg-indigo-950/20 border border-indigo-800/40 space-y-4">
                  <div className="flex items-center gap-2 text-indigo-300 text-sm font-bold">
                    <Sparkles className="w-4 h-4" />
                    <span>Explainable Evaluation Narrative</span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed font-medium">
                    {matchResult.explainability?.summary}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {matchResult.explainability?.strengths && matchResult.explainability.strengths.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Core Strengths
                        </span>
                        <ul className="space-y-1.5 text-xs text-slate-300">
                          {matchResult.explainability.strengths.map((str, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-emerald-400 mt-0.5">•</span>
                              <span>{str}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {matchResult.explainability?.gaps && matchResult.explainability.gaps.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" /> Skill Gaps &amp; Recommendations
                        </span>
                        <ul className="space-y-1.5 text-xs text-slate-300">
                          {matchResult.explainability.gaps.map((gap, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-amber-400 mt-0.5">•</span>
                              <span>{gap}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions & Fairness Dossier Export */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">Algorithmic Fairness Certified</div>
                      <div className="text-slate-400">
                        Demographic signals masked. Evaluated strictly on verified skill taxonomy and tenure.
                      </div>
                    </div>
                  </div>

                  {matchResult._id && (
                    <button
                      onClick={() => handleOpenDossier(matchResult._id)}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 font-medium flex items-center gap-1.5 self-start sm:self-auto transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>View &amp; Export Audit Dossier</span>
                    </button>
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: LEADERBOARD & BATCH COHORT RANKING                      */}
        {/* ============================================================== */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-medium mb-2">
                  <BarChart3 className="w-3 h-3" />
                  <span>Cohort Ranking Engine</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Candidate Leaderboard
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  Batch rank and compare all candidates in the database against a selected job description.
                </p>
              </div>

              {/* Job Selector for Leaderboard */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-medium">Select Role:</span>
                <select
                  value={leaderboardJobId}
                  onChange={(e) => {
                    setLeaderboardJobId(e.target.value);
                    fetchLeaderboard(e.target.value);
                  }}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {jobs.map((j) => (
                    <option key={j._id} value={j._id}>{j.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {loadingLeaderboard ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                <span className="text-xs">Evaluating and ranking candidate pool...</span>
              </div>
            ) : leaderboardData ? (
              <div className="space-y-6">
                {/* Cohort Metric Tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <span className="text-[11px] uppercase text-slate-400 block font-mono">Cohort Size</span>
                    <span className="text-2xl font-bold text-white mt-1 block">{leaderboardData.cohortSize} Candidates</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <span className="text-[11px] uppercase text-slate-400 block font-mono">Cohort Average</span>
                    <span className="text-2xl font-bold text-indigo-400 mt-1 block">{leaderboardData.analytics?.avgScore}%</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <span className="text-[11px] uppercase text-slate-400 block font-mono">Tier 1 (High Fit)</span>
                    <span className="text-2xl font-bold text-emerald-400 mt-1 block">{leaderboardData.analytics?.topFitCount}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <span className="text-[11px] uppercase text-slate-400 block font-mono">Highest Fit Score</span>
                    <span className="text-2xl font-bold text-purple-400 mt-1 block">{leaderboardData.analytics?.highestScore}%</span>
                  </div>
                </div>

                {/* Leaderboard Table */}
                <div className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden shadow-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase font-mono text-[11px]">
                        <th className="py-3.5 px-4 w-16 text-center">Rank</th>
                        <th className="py-3.5 px-4">Candidate Identifier</th>
                        <th className="py-3.5 px-4 text-center">Fit Score</th>
                        <th className="py-3.5 px-4">Experience</th>
                        <th className="py-3.5 px-4">Skills Coverage</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {leaderboardData.leaderboard?.map((cand) => (
                        <tr key={cand.resumeId} className="hover:bg-slate-800/30 transition">
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs ${
                              cand.rank === 1 ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' :
                              cand.rank === 2 ? 'bg-slate-300/20 text-slate-200 border border-slate-300/30' :
                              cand.rank === 3 ? 'bg-amber-700/20 text-amber-500 border border-amber-700/30' :
                              'text-slate-400'
                            }`}>
                              {cand.rank}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-semibold text-white">{cand.candidateName}</div>
                            <span className="text-[11px] text-slate-400">{cand.tier}</span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`text-base font-bold ${
                              cand.overallScore >= 80 ? 'text-emerald-400' :
                              cand.overallScore >= 60 ? 'text-amber-400' : 'text-rose-400'
                            }`}>
                              {cand.overallScore}%
                            </span>
                          </td>
                          <td className="py-4 px-4 text-slate-300">
                            {cand.totalExperienceYears} yrs
                            <span className="text-slate-500 text-[10px] block">
                              (Req: {leaderboardData.minExperienceYears} yrs)
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-wrap gap-1">
                              {cand.matchingSkills?.slice(0, 4).map((s, i) => (
                                <span key={i} className="px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 text-[10px]">
                                  {s}
                                </span>
                              ))}
                              {(cand.missingRequiredSkills?.length || 0) > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-800/40 text-rose-300 text-[10px]">
                                  {cand.missingRequiredSkills.length} missing
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedResumeId(cand.resumeId);
                                setSelectedJobId(leaderboardData.jobId);
                                handleEvaluateMatch();
                                setActiveTab('matcher');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium text-[11px] transition"
                            >
                              Audit View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: SIDE-BY-SIDE CANDIDATE COMPARISON                       */}
        {/* ============================================================== */}
        {activeTab === 'comparison' && (
          <div className="space-y-8">
            <div className="border-b border-slate-800 pb-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-medium mb-2">
                <Scale className="w-3 h-3" />
                <span>Pairwise Explainability Differential</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Candidate Comparison Studio
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Compare two candidates side-by-side against the same job description to explain why one outranks another.
              </p>
            </div>

            {/* Comparison Selectors */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Candidate A</label>
                  <select
                    value={compCandA}
                    onChange={(e) => setCompCandA(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {resumes.map(r => (
                      <option key={r._id} value={r._id}>{r.candidateName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Candidate B</label>
                  <select
                    value={compCandB}
                    onChange={(e) => setCompCandB(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {resumes.map(r => (
                      <option key={r._id} value={r._id}>{r.candidateName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Target Role</label>
                  <select
                    value={compJobId}
                    onChange={(e) => setCompJobId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {jobs.map(j => (
                      <option key={j._id} value={j._id}>{j.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleCompareCandidates}
                disabled={evaluatingComp || !compCandA || !compCandB || compCandA === compCandB}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition disabled:opacity-40"
              >
                {evaluatingComp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Scale className="w-3.5 h-3.5" />}
                <span>Generate Side-by-Side Comparison</span>
              </button>
              {compCandA === compCandB && (
                <p className="text-xs text-amber-400">Please choose two different candidates to compare.</p>
              )}
            </div>

            {/* Comparison Diff Display */}
            {compResult && (
              <div className="space-y-6">
                {/* Differential Explanation Card */}
                <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 text-xs space-y-2">
                  <span className="font-mono uppercase text-indigo-400 tracking-wider text-[11px] font-semibold">
                    Explainable Decision Summary
                  </span>
                  <p className="text-sm text-slate-200 leading-relaxed font-medium">
                    {compResult.explainableReasoning}
                  </p>
                </div>

                {/* Side-by-Side Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Candidate A Card */}
                  <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-slate-500">Candidate A</span>
                        <h3 className="text-base font-bold text-white">{compResult.candidateA.name}</h3>
                      </div>
                      <span className={`text-3xl font-extrabold ${
                        compResult.candidateA.overallScore >= 80 ? 'text-emerald-400' :
                        compResult.candidateA.overallScore >= 60 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {compResult.candidateA.overallScore}%
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-slate-400 block mb-1">Mandatory Skills Score</span>
                        <div className="font-mono text-white text-sm">{compResult.candidateA.breakdown?.skillsMatchScore}%</div>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-1">Documented Experience</span>
                        <div className="font-mono text-white text-sm">{compResult.candidateA.experienceYears} Years</div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-slate-400 block">Satisfied Skills</span>
                        <div className="flex flex-wrap gap-1">
                          {compResult.candidateA.matchingSkills?.map((s, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 text-[10px]">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      {compResult.candidateA.uniqueSkills?.length > 0 && (
                        <div className="space-y-1 pt-2 border-t border-slate-900">
                          <span className="text-slate-400 block">Skills Unique to A</span>
                          <div className="flex flex-wrap gap-1">
                            {compResult.candidateA.uniqueSkills.map((s, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 text-[10px]">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Candidate B Card */}
                  <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-slate-500">Candidate B</span>
                        <h3 className="text-base font-bold text-white">{compResult.candidateB.name}</h3>
                      </div>
                      <span className={`text-3xl font-extrabold ${
                        compResult.candidateB.overallScore >= 80 ? 'text-emerald-400' :
                        compResult.candidateB.overallScore >= 60 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {compResult.candidateB.overallScore}%
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-slate-400 block mb-1">Mandatory Skills Score</span>
                        <div className="font-mono text-white text-sm">{compResult.candidateB.breakdown?.skillsMatchScore}%</div>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-1">Documented Experience</span>
                        <div className="font-mono text-white text-sm">{compResult.candidateB.experienceYears} Years</div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-slate-400 block">Satisfied Skills</span>
                        <div className="flex flex-wrap gap-1">
                          {compResult.candidateB.matchingSkills?.map((s, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 text-[10px]">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      {compResult.candidateB.uniqueSkills?.length > 0 && (
                        <div className="space-y-1 pt-2 border-t border-slate-900">
                          <span className="text-slate-400 block">Skills Unique to B</span>
                          <div className="flex flex-wrap gap-1">
                            {compResult.candidateB.uniqueSkills.map((s, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 text-[10px]">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: RESUME INGESTION & EXPLORER                             */}
        {/* ============================================================== */}
        {activeTab === 'resumes' && (
          <div className="space-y-8">
            <div className="border-b border-slate-800 pb-6">
              <h1 className="text-2xl font-bold text-white tracking-tight">Candidate Profiles &amp; Ingestion</h1>
              <p className="text-slate-400 text-sm mt-1">
                Upload PDF resumes or paste text for automatic entity extraction and anonymization.
              </p>
            </div>

            {/* Ingestion Box */}
            <form onSubmit={handleCreateResume} className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Ingest New Resume</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Upload PDF Resume File</label>
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    onChange={(e) => setResumeFile(e.target.files[0])}
                    className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer p-2 rounded-xl bg-slate-950 border border-slate-800"
                  />
                  <p className="text-[11px] text-slate-500">Supports PDF &amp; TXT documents up to 5MB.</p>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <input
                    type="checkbox"
                    id="anonymizeToggle"
                    checked={anonymizePII}
                    onChange={(e) => setAnonymizePII(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 rounded"
                  />
                  <label htmlFor="anonymizeToggle" className="text-xs text-slate-300 cursor-pointer">
                    <strong className="block text-white font-medium">Anonymize PII for Bias Mitigation</strong>
                    Mask candidate names, emails, and phone numbers during parsing.
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Or Paste Resume Plain Text</label>
                <textarea
                  rows={4}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste resume content here to extract skills and experience..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={submittingResume || (!resumeFile && !resumeText.trim())}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition disabled:opacity-40 flex items-center gap-2"
              >
                {submittingResume ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>Parse &amp; Store Candidate</span>
              </button>
            </form>

            {/* Existing Resumes List */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Stored Candidates ({resumes.length})</h2>
              {resumes.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center text-sm text-slate-500">
                  No candidate resumes stored yet. Click "Seed Data" in the top bar to load sample profiles.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resumes.map((r) => (
                    <div key={r._id} className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-white">{r.candidateName}</span>
                          <button
                            onClick={() => handleDeleteResume(r._id)}
                            className="text-slate-500 hover:text-rose-400 transition"
                            title="Delete candidate"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-xs text-slate-400">
                          {r.totalExperienceYears} years documented experience
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {r.summary || 'No summary provided.'}
                        </p>

                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {r.skills?.slice(0, 8).map((s, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px]">
                              {typeof s === 'string' ? s : s.name}
                            </span>
                          ))}
                          {(r.skills?.length || 0) > 8 && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px]">
                              +{r.skills.length - 8} more
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Anonymized: {r.anonymized ? 'Yes' : 'No'}</span>
                        <button
                          onClick={() => { setSelectedResumeId(r._id); setActiveTab('matcher'); }}
                          className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                        >
                          Select for Match <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: JOB POSTINGS & REQUIREMENTS                             */}
        {/* ============================================================== */}
        {activeTab === 'jobs' && (
          <div className="space-y-8">
            <div className="border-b border-slate-800 pb-6">
              <h1 className="text-2xl font-bold text-white tracking-tight">Job Postings &amp; Core Requirements</h1>
              <p className="text-slate-400 text-sm mt-1">
                Define roles with mandatory qualifications and preferred competencies.
              </p>
            </div>

            <form onSubmit={handleCreateJob} className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Create New Job Posting</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Job Title</label>
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Lead Backend Engineer"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Department</label>
                  <input
                    type="text"
                    value={jobDepartment}
                    onChange={(e) => setJobDepartment(e.target.value)}
                    placeholder="e.g. Core Engineering"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Min Experience (Years)</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={jobExpYears}
                    onChange={(e) => setJobExpYears(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Job Description &amp; Technical Requirements</label>
                <textarea
                  rows={4}
                  required
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Describe role and key technologies (React, Node.js, Python, AWS, Docker etc.)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={submittingJob}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition disabled:opacity-40 flex items-center gap-2"
              >
                {submittingJob ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Publish Job &amp; Extract Skills</span>
              </button>
            </form>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Active Job Postings ({jobs.length})</h2>
              {jobs.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center text-sm text-slate-500">
                  No active job descriptions. Click "Seed Data" to load sample postings.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {jobs.map((j) => (
                    <div key={j._id} className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-white">{j.title}</span>
                          <button
                            onClick={() => handleDeleteJob(j._id)}
                            className="text-slate-500 hover:text-rose-400 transition"
                            title="Delete job"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-xs text-slate-400">
                          {j.department} • Min {j.minExperienceYears} yrs experience
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {j.description}
                        </p>

                        <div className="space-y-1.5 pt-2">
                          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Mandatory Skills:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {j.requiredSkills?.map((s, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 text-[10px]">
                                {typeof s === 'string' ? s : s.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{j.company}</span>
                        <button
                          onClick={() => { setSelectedJobId(j._id); setActiveTab('matcher'); }}
                          className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                        >
                          Select for Match <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 6: SYSTEM TELEMETRY                                        */}
        {/* ============================================================== */}
        {activeTab === 'system' && (
          <div className="space-y-8">
            <div className="border-b border-slate-800 pb-6">
              <h1 className="text-2xl font-bold text-white tracking-tight">System Telemetry &amp; Architecture</h1>
              <p className="text-slate-400 text-sm mt-1">
                Real-time operational monitoring of API and database services.
              </p>
            </div>

            <section className="p-6 sm:p-8 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Live Health-Check Telemetry</h2>
                    <p className="text-xs text-slate-400">Real-time status pinging <code className="text-indigo-300">/api/health</code></p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {latency !== null && (
                    <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                      {latency} ms
                    </span>
                  )}
                  {lastChecked && (
                    <span className="text-xs text-slate-400">Checked: {lastChecked}</span>
                  )}
                  <button
                    onClick={checkHealth}
                    disabled={healthStatus === 'checking'}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-medium transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${healthStatus === 'checking' ? 'animate-spin' : ''}`} />
                    Test Endpoint
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    {healthStatus === 'healthy' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {healthStatus === 'healthy' ? 'Express API Responding Normally' : 'Service Not Connected Yet'}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Backend active on port 5000. Database connected via {healthData?.database?.type || 'active driver'}.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-white">Secret Isolation &amp; Git Hygiene</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Database credentials remain isolated in <code className="text-indigo-300">backend/.env</code> and excluded from Git commits.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Response Payload</span>
                  <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-indigo-300 overflow-x-auto max-h-48 leading-relaxed">
                    {healthData ? JSON.stringify(healthData, null, 2) : '// No response yet'}
                  </pre>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Audit Dossier Modal */}
      {activeDossier && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
                <FileCheck className="w-5 h-5" />
                <span>Algorithmic Fairness &amp; Match Compliance Dossier</span>
              </div>
              <button
                onClick={() => setActiveDossier(null)}
                className="text-slate-400 hover:text-white text-xs font-mono p-1 rounded hover:bg-slate-800"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-indigo-400">DOSSIER_ID: {activeDossier.dossierId}</div>
                <div className="text-slate-400">TIMESTAMP: {activeDossier.generatedAt}</div>
                <div className="text-slate-400">ROLE: {activeDossier.role?.title} ({activeDossier.role?.company})</div>
                <div className="text-slate-400">CANDIDATE: {activeDossier.candidate?.identifier}</div>
                <div className="text-emerald-400">SCORE: {activeDossier.evaluation?.overallScore}%</div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 space-y-1">
                <div className="font-bold">CERTIFICATION: {activeDossier.fairnessCompliance?.certification}</div>
                <p className="text-[11px] leading-relaxed text-slate-300">{activeDossier.fairnessCompliance?.statement}</p>
              </div>

              <div className="space-y-1.5 text-slate-300 font-sans">
                <span className="font-mono text-xs uppercase text-slate-400">Summary:</span>
                <p className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200">
                  {activeDossier.explainabilitySummary}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(activeDossier, null, 2));
                  showBanner('Audit Dossier JSON copied to clipboard!');
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
              >
                Copy JSON Dossier
              </button>
              <button
                onClick={() => setActiveDossier(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 mt-16 py-8 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Drishti AI</span>
            <span>•</span>
            <span>Day 3 Semantic Match &amp; Audit Milestone</span>
          </div>
          <div className="text-slate-500">
            Node.js • Express • React 19 • Vite • Tailwind • Mongoose
          </div>
        </div>
      </footer>
    </div>
  );
}
