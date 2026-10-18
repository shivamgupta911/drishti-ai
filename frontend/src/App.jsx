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
  Download,
  Send,
  UserCheck,
  Users,
  History,
  Sliders,
  GitBranch
} from 'lucide-react';
import { getApiUrl, safeParseResponse } from './config/api';
import EvidencePanel from './components/EvidencePanel';
import WhatIfSimulator from './components/WhatIfSimulator';
import AnalyticsLab from './components/AnalyticsLab';
import AuditHistoryModal from './components/AuditHistoryModal';
import OutcomeTracker from './components/OutcomeTracker';

export default function App() {
  const [activeTab, setActiveTab] = useState('matcher'); // 'matcher' | 'leaderboard' | 'comparison' | 'analytics' | 'simulator' | 'outcomes' | 'fairness' | 'resumes' | 'jobs' | 'system'
  
  // Health telemetry state
  const [healthData, setHealthData] = useState(null);
  const [healthStatus, setHealthStatus] = useState('checking'); // 'checking' | 'healthy' | 'error'
  const [latency, setLatency] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  // Data collections
  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

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

  // Audit History Modal state
  const [auditModalOpen, setAuditModalOpen] = useState(false);

  // Active RBAC user persona
  const [activeUser, setActiveUser] = useState({
    name: 'Sarah Connor',
    role: 'recruiter',
    title: 'Senior Talent Partner',
    email: 'recruiter@drishti.ai',
  });

  // Fairness & Bias Audit state
  const [fairnessAuditData, setFairnessAuditData] = useState(null);
  const [loadingFairness, setLoadingFairness] = useState(false);
  const [fairnessThreshold, setFairnessThreshold] = useState(65);

  // ATS Webhook Modal state
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [webhookPlatform, setWebhookPlatform] = useState('greenhouse');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [dispatchingWebhook, setDispatchingWebhook] = useState(false);
  const [webhookResponse, setWebhookResponse] = useState(null);

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

  const checkHealth = async (isRetry = false) => {
    setHealthStatus((prev) => (prev === 'healthy' ? 'healthy' : 'checking'));
    const startTime = performance.now();
    try {
      const response = await fetch(getApiUrl('/api/health'), {
        headers: { Accept: 'application/json' },
      });
      const endTime = performance.now();
      setLatency(Math.round(endTime - startTime));

      const data = await safeParseResponse(response);
      setHealthData(data);
      setHealthStatus('healthy');
    } catch (err) {
      console.warn('Health check attempt failed:', err.message);
      setHealthStatus('error');
      setHealthData({ error: err.message || 'Failed to connect to backend server' });

      // Automatically retry once after 4 seconds to accommodate cold start wake-up
      if (!isRetry) {
        setTimeout(() => checkHealth(true), 4000);
      }
    } finally {
      setLastChecked(new Date().toLocaleTimeString());
    }
  };

  const fetchResumesAndJobs = async () => {
    setLoadingData(true);
    try {
      const [resumesRes, jobsRes] = await Promise.all([
        fetch(getApiUrl('/api/resumes'), { headers: { Accept: 'application/json' } }),
        fetch(getApiUrl('/api/jobs'), { headers: { Accept: 'application/json' } }),
      ]);

      if (resumesRes.ok) {
        const rData = await safeParseResponse(resumesRes);
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
        const jData = await safeParseResponse(jobsRes);
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
    setLoadingData(true);
    try {
      const res = await fetch(getApiUrl('/api/seed'), {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });
      const data = await safeParseResponse(res);
      showBanner(data.message || 'Sample candidates and job postings seeded!');
      await fetchResumesAndJobs();
      checkHealth(true);
    } catch (err) {
      showBanner(`Seed error: ${err.message}`);
    } finally {
      setLoadingData(false);
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
      const res = await fetch(getApiUrl('/api/matches/evaluate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ resumeId: selectedResumeId, jobId: selectedJobId }),
      });
      const data = await safeParseResponse(res);
      setMatchResult(data.data);
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
      const res = await fetch(getApiUrl(`/api/matches/rank/${jId}`), {
        headers: { Accept: 'application/json' },
      });
      const data = await safeParseResponse(res);
      setLeaderboardData(data.data);
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
      const res = await fetch(getApiUrl('/api/matches/compare'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          candidateAId: compCandA,
          candidateBId: compCandB,
          jobId: compJobId,
        }),
      });
      const data = await safeParseResponse(res);
      setCompResult(data.data);
    } catch (err) {
      console.error('Error comparing candidates:', err);
    } finally {
      setEvaluatingComp(false);
    }
  };

  const handleOpenDossier = async (matchId) => {
    if (!matchId) return;
    try {
      const res = await fetch(getApiUrl(`/api/matches/${matchId}/report`), {
        headers: { Accept: 'application/json' },
      });
      const data = await safeParseResponse(res);
      setActiveDossier(data.data);
    } catch (err) {
      console.error('Error fetching dossier:', err);
      showBanner(`Dossier load error: ${err.message}`);
    }
  };

  const fetchFairnessAudit = async (jobId, threshold = fairnessThreshold) => {
    if (!jobId) return;
    setLoadingFairness(true);
    try {
      const res = await fetch(getApiUrl(`/api/matches/fairness-audit/${jobId}?threshold=${threshold}`), {
        headers: { Accept: 'application/json' },
      });
      const data = await safeParseResponse(res);
      setFairnessAuditData(data);
    } catch (err) {
      console.error('Error fetching fairness audit:', err);
    } finally {
      setLoadingFairness(false);
    }
  };

  const handleDispatchWebhook = async () => {
    if (!matchResult?._id) return;
    setDispatchingWebhook(true);
    setWebhookResponse(null);
    try {
      const res = await fetch(getApiUrl('/api/integrations/webhook/dispatch'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          matchId: matchResult._id,
          platform: webhookPlatform,
          webhookUrl: webhookUrl || undefined,
          recruiterNotes: `Approved by ${activeUser.name} (${activeUser.title}). Certified compliant with NYC Local Law 144 & EEOC Guidelines.`,
        }),
      });
      const data = await safeParseResponse(res);
      setWebhookResponse(data);
      showBanner(`Successfully dispatched evaluation to ${webhookPlatform.toUpperCase()} ATS stream!`);
    } catch (err) {
      setWebhookResponse({ error: err.message });
      showBanner(`Webhook dispatch error: ${err.message}`);
    } finally {
      setDispatchingWebhook(false);
    }
  };

  const handleDownloadMarkdown = (matchId) => {
    if (!matchId) return;
    window.open(getApiUrl(`/api/integrations/export/${matchId}?format=markdown`), '_blank');
  };

  const handleCreateResume = async (e) => {
    e.preventDefault();
    setSubmittingResume(true);
    try {
      if (resumeFile) {
        const formData = new FormData();
        formData.append('resumeFile', resumeFile);
        formData.append('anonymize', String(anonymizePII));

        const res = await fetch(getApiUrl('/api/resumes/upload'), {
          method: 'POST',
          body: formData,
        });
        await safeParseResponse(res);
        showBanner('Resume uploaded, parsed, and anonymized successfully!');
        setResumeFile(null);
        await fetchResumesAndJobs();
        setActiveTab('matcher');
      } else if (resumeText.trim()) {
        const res = await fetch(getApiUrl('/api/resumes'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ rawText: resumeText, anonymize: anonymizePII }),
        });
        await safeParseResponse(res);
        showBanner('Candidate profile parsed and stored successfully!');
        setResumeText('');
        await fetchResumesAndJobs();
        setActiveTab('matcher');
      }
    } catch (err) {
      showBanner(`Upload failed: ${err.message}`);
    } finally {
      setSubmittingResume(false);
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    if (!jobTitle || !jobDescription) return;
    setSubmittingJob(true);
    try {
      const res = await fetch(getApiUrl('/api/jobs'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          title: jobTitle,
          department: jobDepartment,
          minExperienceYears: Number(jobExpYears),
          description: jobDescription,
        }),
      });
      await safeParseResponse(res);
      showBanner('Job posting created and required skills extracted!');
      setJobTitle('');
      setJobDescription('');
      await fetchResumesAndJobs();
      setActiveTab('matcher');
    } catch (err) {
      showBanner(`Job creation failed: ${err.message}`);
    } finally {
      setSubmittingJob(false);
    }
  };

  const handleDeleteResume = async (id) => {
    if (!window.confirm('Are you sure you want to delete this candidate profile?')) return;
    try {
      const res = await fetch(getApiUrl(`/api/resumes/${id}`), { method: 'DELETE' });
      await safeParseResponse(res);
      showBanner('Candidate record deleted.');
      await fetchResumesAndJobs();
    } catch (err) {
      showBanner(`Delete failed: ${err.message}`);
    }
  };

  const handleDeleteJob = async (id) => {
    if (!window.confirm('Are you sure you want to delete this job posting?')) return;
    try {
      const res = await fetch(getApiUrl(`/api/jobs/${id}`), { method: 'DELETE' });
      await safeParseResponse(res);
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

  useEffect(() => {
    if (activeTab === 'fairness' && (selectedJobId || leaderboardJobId)) {
      fetchFairnessAudit(selectedJobId || leaderboardJobId, fairnessThreshold);
    }
  }, [activeTab, selectedJobId, leaderboardJobId, fairnessThreshold]);

  return (
    <div className="min-h-screen bg-[#F5F6F3] text-[#202B35] font-sans antialiased selection:bg-[#E5F3EF] selection:text-[#187D70] pb-20">
      
      {/* Global Notification Toast */}
      {bannerMsg && (
        <aside aria-label="Notification" className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="bg-[#202B35] text-white text-xs font-medium py-2.5 px-4 rounded-lg shadow-lg border border-slate-700/60 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#E5F3EF]" />
            <span>{bannerMsg}</span>
          </div>
        </aside>
      )}

      {/* Primary Application Header */}
      <header className="border-b border-[#DDE3E1] bg-white sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          
          {/* Brand Identity */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="h-9 w-9 rounded-lg bg-[#E5F3EF] border border-[#187D70]/20 flex items-center justify-center text-[#187D70] shrink-0">
              <Target className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-[#202B35] block leading-none">
                Drishti AI
              </span>
              <span className="text-[11px] text-[#65717D] tracking-normal font-normal block mt-0.5">
                Explainable Job-Fit Intelligence
              </span>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav aria-label="Main Navigation" className="hidden lg:flex items-center gap-1 text-xs overflow-x-auto py-1">
            <button
              onClick={() => setActiveTab('matcher')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors shrink-0 ${
                activeTab === 'matcher'
                  ? 'bg-[#E5F3EF] text-[#187D70] font-semibold border border-[#187D70]/20'
                  : 'text-[#65717D] hover:text-[#202B35] hover:bg-[#EEF2F1]'
              }`}
            >
              Match Studio
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                activeTab === 'leaderboard'
                  ? 'bg-[#E5F3EF] text-[#187D70] font-semibold border border-[#187D70]/20'
                  : 'text-[#65717D] hover:text-[#202B35] hover:bg-[#EEF2F1]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Leaderboard</span>
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                activeTab === 'comparison'
                  ? 'bg-[#E5F3EF] text-[#187D70] font-semibold border border-[#187D70]/20'
                  : 'text-[#65717D] hover:text-[#202B35] hover:bg-[#EEF2F1]'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Compare</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                activeTab === 'analytics'
                  ? 'bg-[#E5F3EF] text-[#187D70] font-semibold border border-[#187D70]/20'
                  : 'text-[#65717D] hover:text-[#202B35] hover:bg-[#EEF2F1]'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-[#187D70]" />
              <span>Analytics Lab</span>
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                activeTab === 'simulator'
                  ? 'bg-[#E5F3EF] text-[#187D70] font-semibold border border-[#187D70]/20'
                  : 'text-[#65717D] hover:text-[#202B35] hover:bg-[#EEF2F1]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-[#187D70]" />
              <span>What-If</span>
            </button>
            <button
              onClick={() => setActiveTab('outcomes')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                activeTab === 'outcomes'
                  ? 'bg-[#E5F3EF] text-[#187D70] font-semibold border border-[#187D70]/20'
                  : 'text-[#65717D] hover:text-[#202B35] hover:bg-[#EEF2F1]'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5 text-[#187D70]" />
              <span>Pipeline</span>
            </button>
            <button
              onClick={() => setActiveTab('fairness')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                activeTab === 'fairness'
                  ? 'bg-[#E5F3EF] text-[#187D70] font-semibold border border-[#187D70]/20'
                  : 'text-[#65717D] hover:text-[#202B35] hover:bg-[#EEF2F1]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Fairness</span>
            </button>
            <button
              onClick={() => setActiveTab('resumes')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors shrink-0 ${
                activeTab === 'resumes'
                  ? 'bg-[#E5F3EF] text-[#187D70] font-semibold border border-[#187D70]/20'
                  : 'text-[#65717D] hover:text-[#202B35] hover:bg-[#EEF2F1]'
              }`}
            >
              Resumes ({resumes.length})
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors shrink-0 ${
                activeTab === 'jobs'
                  ? 'bg-[#E5F3EF] text-[#187D70] font-semibold border border-[#187D70]/20'
                  : 'text-[#65717D] hover:text-[#202B35] hover:bg-[#EEF2F1]'
              }`}
            >
              Jobs ({jobs.length})
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                activeTab === 'system'
                  ? 'bg-[#E5F3EF] text-[#187D70] font-semibold border border-[#187D70]/20'
                  : 'text-[#65717D] hover:text-[#202B35] hover:bg-[#EEF2F1]'
              }`}
            >
              <span>Telemetry</span>
            </button>
          </nav>

          {/* Actions & Persona Control */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Audit History Ledger Trigger */}
            <button
              onClick={() => setAuditModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#DDE3E1] bg-white hover:bg-[#EEF2F1] text-[#202B35] text-xs font-medium transition shadow-xs cursor-pointer"
              title="Audit History & Recruiter Override Ledger"
            >
              <History className="w-3.5 h-3.5 text-[#187D70]" />
              <span className="hidden xl:inline">Audit Ledger</span>
            </button>

            {/* User Persona Switcher */}
            <div className="hidden 2xl:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#F5F6F3] border border-[#DDE3E1] text-xs">
              <UserCheck className="w-3.5 h-3.5 text-[#187D70]" />
              <select
                value={activeUser.role}
                onChange={(e) => {
                  const r = e.target.value;
                  if (r === 'recruiter') {
                    setActiveUser({ name: 'Sarah Connor', role: 'recruiter', title: 'Senior Talent Partner', email: 'recruiter@drishti.ai' });
                  } else if (r === 'hiring_manager') {
                    setActiveUser({ name: 'David Vance', role: 'hiring_manager', title: 'VP Platform Engineering', email: 'manager@drishti.ai' });
                  } else {
                    setActiveUser({ name: 'Alex Mercer', role: 'candidate', title: 'Candidate Profile', email: 'candidate@drishti.ai' });
                  }
                  showBanner(`Active persona: ${r.replace('_', ' ').toUpperCase()}`);
                }}
                className="bg-transparent text-[#202B35] font-medium focus:outline-none cursor-pointer"
              >
                <option value="recruiter">Sarah (Recruiter)</option>
                <option value="hiring_manager">David (Manager)</option>
                <option value="candidate">Alex (Candidate)</option>
              </select>
            </div>

            {/* Seed Data Action */}
            <button
              onClick={handleSeedData}
              disabled={loadingData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DDE3E1] bg-white hover:bg-[#EEF2F1] text-[#202B35] text-xs font-medium transition disabled:opacity-50 shadow-xs cursor-pointer"
              title="Populate test candidates with technical synonyms and jobs"
            >
              <Zap className={`w-3.5 h-3.5 text-[#A96512] ${loadingData ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline">{loadingData ? 'Seeding...' : 'Seed Data'}</span>
            </button>

            {/* Connection Status Indicator */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#DDE3E1] bg-[#F5F6F3] text-xs"
              title={
                healthStatus === 'healthy'
                  ? `Backend connected (${latency ? `${latency}ms` : 'operational'})`
                  : healthStatus === 'checking'
                  ? 'Connecting to backend...'
                  : (healthData?.error || 'Backend offline')
              }
            >
              {healthStatus === 'healthy' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#187D58]" />
                  <span className="text-[#187D58] font-medium text-[11px] hidden sm:inline">
                    {healthData?.database?.type === 'in-memory (local-development-only)' ? 'Local Dev DB' : 'Connected'}
                  </span>
                </>
              ) : healthStatus === 'checking' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#A96512] animate-pulse" />
                  <span className="text-[#A96512] font-medium text-[11px] hidden sm:inline">Connecting...</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#BD4148]" />
                  <span className="text-[#BD4148] font-medium text-[11px] hidden sm:inline">Offline</span>
                </>
              )}
            </div>

            {/* Refresh telemetry */}
            <button
              onClick={() => { checkHealth(); fetchResumesAndJobs(); }}
              disabled={loadingData}
              className="p-1.5 rounded-lg border border-[#DDE3E1] bg-white hover:bg-[#EEF2F1] text-[#65717D] hover:text-[#202B35] transition disabled:opacity-50 shadow-xs cursor-pointer"
              title="Refresh connection status & records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${healthStatus === 'checking' || loadingData ? 'animate-spin text-[#187D70]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="lg:hidden flex border-t border-[#DDE3E1] px-4 py-2 gap-1.5 overflow-x-auto text-xs bg-white">
          <button
            onClick={() => setActiveTab('matcher')}
            className={`px-3 py-1.5 rounded-md shrink-0 font-medium ${activeTab === 'matcher' ? 'bg-[#E5F3EF] text-[#187D70] font-semibold' : 'text-[#65717D]'}`}
          >
            Match Studio
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-3 py-1.5 rounded-md shrink-0 font-medium ${activeTab === 'leaderboard' ? 'bg-[#E5F3EF] text-[#187D70] font-semibold' : 'text-[#65717D]'}`}
          >
            Leaderboard
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-3 py-1.5 rounded-md shrink-0 font-medium ${activeTab === 'comparison' ? 'bg-[#E5F3EF] text-[#187D70] font-semibold' : 'text-[#65717D]'}`}
          >
            Compare
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 rounded-md shrink-0 font-medium ${activeTab === 'analytics' ? 'bg-[#E5F3EF] text-[#187D70] font-semibold' : 'text-[#65717D]'}`}
          >
            Analytics Lab
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 rounded-md shrink-0 font-medium ${activeTab === 'simulator' ? 'bg-[#E5F3EF] text-[#187D70] font-semibold' : 'text-[#65717D]'}`}
          >
            What-If
          </button>
          <button
            onClick={() => setActiveTab('outcomes')}
            className={`px-3 py-1.5 rounded-md shrink-0 font-medium ${activeTab === 'outcomes' ? 'bg-[#E5F3EF] text-[#187D70] font-semibold' : 'text-[#65717D]'}`}
          >
            Pipeline
          </button>
          <button
            onClick={() => setActiveTab('fairness')}
            className={`px-3 py-1.5 rounded-md shrink-0 font-medium ${activeTab === 'fairness' ? 'bg-[#E5F3EF] text-[#187D70] font-semibold' : 'text-[#65717D]'}`}
          >
            Fairness
          </button>
          <button
            onClick={() => setActiveTab('resumes')}
            className={`px-3 py-1.5 rounded-md shrink-0 font-medium ${activeTab === 'resumes' ? 'bg-[#E5F3EF] text-[#187D70] font-semibold' : 'text-[#65717D]'}`}
          >
            Resumes ({resumes.length})
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`px-3 py-1.5 rounded-md shrink-0 font-medium ${activeTab === 'jobs' ? 'bg-[#E5F3EF] text-[#187D70] font-semibold' : 'text-[#65717D]'}`}
          >
            Jobs ({jobs.length})
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-3 py-1.5 rounded-md shrink-0 font-medium ${activeTab === 'system' ? 'bg-[#E5F3EF] text-[#187D70] font-semibold' : 'text-[#65717D]'}`}
          >
            Telemetry
          </button>
          <button
            onClick={() => setAuditModalOpen(true)}
            className="px-3 py-1.5 rounded-md shrink-0 font-medium text-[#187D70] bg-[#E5F3EF]"
          >
            Audit Ledger
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {/* ============================================================== */}
        {/* TAB 1: MATCH STUDIO (PRIMARY EXPERIENCE)                      */}
        {/* ============================================================== */}
        {activeTab === 'matcher' && (
          <div className="space-y-8">
            
            {/* Page Heading */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DDE3E1] pb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#202B35] tracking-tight">
                  Explainable Candidate Evaluation
                </h1>
                <p className="text-[#65717D] text-sm mt-1">
                  Deterministic competency matching with semantic synonym resolution and TF-IDF vector similarity.
                </p>
              </div>

              {resumes.length === 0 && (
                <button
                  onClick={handleSeedData}
                  disabled={loadingData}
                  className="px-4 py-2 rounded-lg bg-[#187D70] hover:bg-[#12685E] text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition self-start disabled:opacity-50"
                >
                  <Zap className={`w-3.5 h-3.5 ${loadingData ? 'animate-pulse' : ''}`} />
                  <span>{loadingData ? 'Loading Data...' : 'Load Sample Data'}</span>
                </button>
              )}
            </div>

            {/* Selection Grid: Candidate Profile vs Job Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Candidate Selector Card */}
              <div className="p-6 rounded-xl bg-white border border-[#DDE3E1] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#202B35] font-semibold text-sm">
                    <FileText className="w-4 h-4 text-[#187D70]" />
                    <span>Candidate Profile</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('resumes')}
                    className="text-xs text-[#187D70] hover:text-[#12685E] font-medium flex items-center gap-1"
                  >
                    + Add Candidate
                  </button>
                </div>

                {resumes.length > 0 ? (
                  <select
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="w-full bg-[#F5F6F3] border border-[#DDE3E1] rounded-lg p-2.5 text-xs text-[#202B35] focus:outline-none focus:border-[#187D70] font-medium cursor-pointer"
                  >
                    {resumes.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.candidateName} • {r.totalExperienceYears} yrs experience ({r.skills?.length || 0} skills)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-5 rounded-lg bg-[#F5F6F3] border border-dashed border-[#DDE3E1] text-center text-xs text-[#65717D]">
                    No candidate profiles found. Click "Seed Data" to load sample profiles.
                  </div>
                )}

                {/* Candidate Quick Detail Preview */}
                {selectedResumeId && (
                  <div className="p-4 rounded-lg bg-[#F5F6F3] border border-[#DDE3E1] text-xs space-y-2.5">
                    {(() => {
                      const sel = resumes.find(r => r._id === selectedResumeId);
                      if (!sel) return null;
                      return (
                        <>
                          <div className="flex items-center justify-between text-[#202B35]">
                            <span className="font-semibold text-sm">{sel.candidateName}</span>
                            <span className="text-[#65717D] font-mono text-[11px]">{sel.totalExperienceYears} yrs tenure</span>
                          </div>
                          <p className="text-[11px] text-[#65717D] line-clamp-2 leading-relaxed">
                            {sel.summary || 'Profile summary extracted from candidate resume.'}
                          </p>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {sel.skills?.map((s, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-white border border-[#DDE3E1] text-[#202B35] text-[10px] font-medium">
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

              {/* Job Selector Card */}
              <div className="p-6 rounded-xl bg-white border border-[#DDE3E1] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#202B35] font-semibold text-sm">
                    <Briefcase className="w-4 h-4 text-[#187D70]" />
                    <span>Job Description</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('jobs')}
                    className="text-xs text-[#187D70] hover:text-[#12685E] font-medium flex items-center gap-1"
                  >
                    + Add Job
                  </button>
                </div>

                {jobs.length > 0 ? (
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="w-full bg-[#F5F6F3] border border-[#DDE3E1] rounded-lg p-2.5 text-xs text-[#202B35] focus:outline-none focus:border-[#187D70] font-medium cursor-pointer"
                  >
                    {jobs.map((j) => (
                      <option key={j._id} value={j._id}>
                        {j.title} • {j.company} (Req: {j.minExperienceYears}+ yrs)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-5 rounded-lg bg-[#F5F6F3] border border-dashed border-[#DDE3E1] text-center text-xs text-[#65717D]">
                    No job postings found. Click "Seed Data" to load sample postings.
                  </div>
                )}

                {/* Job Quick Detail Preview */}
                {selectedJobId && (
                  <div className="p-4 rounded-lg bg-[#F5F6F3] border border-[#DDE3E1] text-xs space-y-2.5">
                    {(() => {
                      const sel = jobs.find(j => j._id === selectedJobId);
                      if (!sel) return null;
                      return (
                        <>
                          <div className="flex items-center justify-between text-[#202B35]">
                            <span className="font-semibold text-sm">{sel.title}</span>
                            <span className="text-[#65717D] font-mono text-[11px]">Min {sel.minExperienceYears} yrs req</span>
                          </div>
                          <p className="text-[11px] text-[#65717D] line-clamp-2 leading-relaxed">
                            {sel.description}
                          </p>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {sel.requiredSkills?.map((s, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-[#E5F3EF] border border-[#187D70]/20 text-[#187D70] text-[10px] font-semibold">
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

            {/* Primary Action Button */}
            <div className="text-center pt-2">
              <button
                onClick={handleEvaluateMatch}
                disabled={evaluating || !selectedResumeId || !selectedJobId}
                className="px-8 py-3 rounded-lg bg-[#187D70] hover:bg-[#12685E] text-white font-semibold text-sm shadow-xs transition-colors disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
              >
                {evaluating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Evaluating Skill Alignment &amp; Vectors...</span>
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4" />
                    <span>Run Explainable Match Evaluation</span>
                  </>
                )}
              </button>
              {matchError && (
                <p className="text-xs text-[#BD4148] mt-2.5 font-medium">{matchError}</p>
              )}
            </div>

            {/* Results Section */}
            {matchResult && (
              <section className="p-6 sm:p-8 rounded-xl bg-white border border-[#DDE3E1] shadow-xs space-y-8 animate-in fade-in duration-150">
                
                {/* Result Overview Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-[#DDE3E1] pb-6">
                  <div className="space-y-1.5">
                    <span className="text-xs uppercase font-mono tracking-wider text-[#65717D]">
                      Overall Compatibility Score
                    </span>
                    <div className="flex items-baseline gap-3">
                      <span className={`text-5xl font-extrabold tracking-tight tabular-nums ${
                        matchResult.overallScore >= 80 ? 'text-[#187D58]' :
                        matchResult.overallScore >= 60 ? 'text-[#A96512]' : 'text-[#BD4148]'
                      }`}>
                        {matchResult.overallScore}%
                      </span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${
                        matchResult.overallScore >= 80 ? 'bg-[#E3F5EC] text-[#187D58] border-[#A7E4C4]' :
                        matchResult.overallScore >= 60 ? 'bg-[#FDF6E2] text-[#A96512] border-[#F5D698]' :
                        'bg-[#FDE8E9] text-[#BD4148] border-[#F4B3B7]'
                      }`}>
                        {matchResult.tier || (matchResult.overallScore >= 80 ? 'Tier 1: High Fit' : matchResult.overallScore >= 60 ? 'Tier 2: Moderate Fit' : 'Tier 3: Low Fit')}
                      </span>
                    </div>
                  </div>

                  {/* 4-Factor Breakdown Bars */}
                  <div className="w-full lg:w-96 space-y-2.5 text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[#202B35]">
                        <span className="font-medium">Mandatory Skills &amp; Synonyms (60%)</span>
                        <span className="font-mono font-semibold tabular-nums">{matchResult.breakdown?.skillsMatchScore}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#EEF2F1] overflow-hidden">
                        <div
                          className="h-full bg-[#187D70] rounded-full transition-all duration-300"
                          style={{ width: `${matchResult.breakdown?.skillsMatchScore || 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[#202B35]">
                        <span className="font-medium">Semantic Vector Match (15%)</span>
                        <span className="font-mono font-semibold tabular-nums">{matchResult.breakdown?.semanticVectorScore || 0}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#EEF2F1] overflow-hidden">
                        <div
                          className="h-full bg-[#2A8575] rounded-full transition-all duration-300"
                          style={{ width: `${matchResult.breakdown?.semanticVectorScore || 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[#202B35]">
                        <span className="font-medium">Experience Duration (20%)</span>
                        <span className="font-mono font-semibold tabular-nums">{matchResult.breakdown?.experienceMatchScore}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#EEF2F1] overflow-hidden">
                        <div
                          className="h-full bg-[#3B82F6] rounded-full transition-all duration-300"
                          style={{ width: `${matchResult.breakdown?.experienceMatchScore || 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[#202B35]">
                        <span className="font-medium">Preferred Bonus (up to 10%)</span>
                        <span className="font-mono font-semibold tabular-nums">+{matchResult.breakdown?.preferredSkillsBonus || 0} pts</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#EEF2F1] overflow-hidden">
                        <div
                          className="h-full bg-[#8B5CF6] rounded-full transition-all duration-300"
                          style={{ width: `${(matchResult.breakdown?.preferredSkillsBonus || 0) * 10}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Competency Alignment Matrix (Satisfied vs Missing) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Satisfied Core Competencies */}
                  <div className="p-5 rounded-xl bg-[#F5F8F7] border border-[#DDE3E1] space-y-4">
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span className="text-[#187D58] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Satisfied Core Competencies
                      </span>
                      <span className="text-xs text-[#65717D] font-mono">
                        {matchResult.exactMatches?.length || 0} direct, {matchResult.synonymMatches?.length || 0} synonym
                      </span>
                    </div>

                    {/* Exact Matches */}
                    {matchResult.exactMatches && matchResult.exactMatches.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-[#65717D]">Direct Exact Matches</span>
                        <div className="flex flex-wrap gap-1.5">
                          {matchResult.exactMatches.map((s, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-md bg-[#E3F5EC] border border-[#A7E4C4] text-[#187D58] text-xs font-medium">
                              ✓ {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Resolved Synonyms */}
                    {matchResult.synonymMatches && matchResult.synonymMatches.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-[#DDE3E1]/70">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-[#187D70]">Resolved Technical Synonyms (100% Credit)</span>
                        <div className="space-y-1.5">
                          {matchResult.synonymMatches.map((sm, i) => (
                            <div key={i} className="p-2 rounded-md bg-white border border-[#DDE3E1] text-xs text-[#202B35] flex items-center justify-between">
                              <span className="font-semibold font-mono text-[#187D70]">{sm.candidateTerm} ➔ {sm.targetTerm}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E5F3EF] text-[#187D70] font-medium">Synonym</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Domain Transfer Affinity */}
                    {matchResult.affinityMatches && matchResult.affinityMatches.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-[#DDE3E1]/70">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-[#8B5CF6]">Domain Transfer Affinities (Partial Credit)</span>
                        <div className="space-y-1.5">
                          {matchResult.affinityMatches.map((am, i) => (
                            <div key={i} className="p-2.5 rounded-md bg-white border border-[#DDE3E1] text-xs text-[#202B35] space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold font-mono text-[#8B5CF6]">{am.candidateTerm} ➔ {am.targetTerm}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-mono">
                                  {Math.round(am.affinityScore * 100)}% credit
                                </span>
                              </div>
                              <p className="text-[11px] text-[#65717D] leading-tight">{am.attribution}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Missing Qualifications & Seniority Check */}
                  <div className="p-5 rounded-xl bg-[#FCFAFA] border border-[#DDE3E1] space-y-4">
                    <div className="flex items-center gap-2 text-[#BD4148] text-sm font-semibold">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Missing Mandatory Qualifications ({matchResult.missingRequiredSkills?.length || 0})</span>
                    </div>

                    {matchResult.missingRequiredSkills && matchResult.missingRequiredSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {matchResult.missingRequiredSkills.map((s, i) => (
                          <span key={i} className="px-3 py-1 rounded-md bg-[#FDE8E9] border border-[#F4B3B7] text-[#BD4148] text-xs font-medium">
                            ✕ {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-[#187D58] p-3 rounded-lg bg-[#E3F5EC] border border-[#A7E4C4]">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Zero mandatory skill gaps. Candidate fulfills 100% of core role competencies.</span>
                      </div>
                    )}

                    {/* Seniority Duration Check */}
                    <div className="pt-3 border-t border-[#DDE3E1]/70 space-y-2">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-[#65717D]">Experience Duration Analysis</span>
                      <div className="flex items-center justify-between text-xs bg-white p-3 rounded-lg border border-[#DDE3E1]">
                        <span className="text-[#202B35]">
                          Candidate: <strong>{matchResult.experienceComparison?.candidateYears} yrs</strong> / Required: <strong>{matchResult.experienceComparison?.requiredYears} yrs</strong>
                        </span>
                        <span className={`px-2 py-0.5 rounded-md font-semibold uppercase text-[10px] ${
                          matchResult.experienceComparison?.status === 'exceeds' ? 'bg-[#E3F5EC] text-[#187D58]' :
                          matchResult.experienceComparison?.status === 'meets' ? 'bg-[#EFF6FF] text-[#1D4ED8]' :
                          'bg-[#FDF6E2] text-[#A96512]'
                        }`}>
                          {matchResult.experienceComparison?.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Plain-English Explainability Narrative */}
                <div className="p-6 rounded-xl bg-[#F0F7F5] border border-[#D0E7E1] space-y-4">
                  <div className="flex items-center gap-2 text-[#187D70] text-sm font-bold">
                    <Sparkles className="w-4 h-4" />
                    <span>Explainable Evaluation Narrative</span>
                  </div>
                  <p className="text-sm text-[#202B35] leading-relaxed font-normal">
                    {matchResult.explainability?.summary}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {matchResult.explainability?.strengths && matchResult.explainability.strengths.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-[#187D58] flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Core Strengths
                        </span>
                        <ul className="space-y-1 text-xs text-[#202B35]">
                          {matchResult.explainability.strengths.map((str, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-[#187D58]">•</span>
                              <span>{str}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {matchResult.explainability?.gaps && matchResult.explainability.gaps.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-[#A96512] flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" /> Skill Gaps &amp; Recommendations
                        </span>
                        <ul className="space-y-1 text-xs text-[#202B35]">
                          {matchResult.explainability.gaps.map((gap, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-[#A96512]">•</span>
                              <span>{gap}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Evidence-Backed Source Excerpts & Verifiable Citations */}
                <EvidencePanel
                  traces={matchResult.evidenceTraces || []}
                  candidateName={resumes.find((r) => r._id === selectedResumeId)?.candidateName}
                />

                {/* Actions & Regulatory Dossier Export */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#F5F6F3] border border-[#DDE3E1] text-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#E3F5EC] text-[#187D58]">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-[#202B35]">Algorithmic Fairness Certified</div>
                      <div className="text-[#65717D]">
                        Demographic signals masked. Evaluated strictly on verified skill taxonomy and tenure duration.
                      </div>
                    </div>
                  </div>

                  {matchResult._id && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleDownloadMarkdown(matchResult._id)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-[#DDE3E1] hover:bg-[#EEF2F1] text-[#202B35] font-medium flex items-center gap-1.5 transition shadow-xs"
                        title="Download Markdown audit report"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-[#187D70]" />
                        <span>Markdown</span>
                      </button>

                      <button
                        onClick={() => setWebhookModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-[#E5F3EF] border border-[#187D70]/20 hover:bg-[#d6ede6] text-[#187D70] font-medium flex items-center gap-1.5 transition shadow-xs"
                        title="Dispatch decision payload to Greenhouse, Lever, Workday, or Ashby"
                      >
                        <Send className="w-3.5 h-3.5 text-[#187D70]" />
                        <span>ATS Webhook</span>
                      </button>

                      <button
                        onClick={() => setAuditModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-[#DDE3E1] hover:bg-[#EEF2F1] text-[#202B35] font-medium flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                        title="View immutable evaluation audit record and log recruiter overrides"
                      >
                        <History className="w-3.5 h-3.5 text-[#187D70]" />
                        <span>Audit Ledger</span>
                      </button>

                      <button
                        onClick={() => handleOpenDossier(matchResult._id)}
                        className="px-4 py-1.5 rounded-lg bg-[#187D70] hover:bg-[#12685E] text-white font-medium flex items-center gap-1.5 transition shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Audit Dossier</span>
                      </button>
                    </div>
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
            
            {/* Header & Role Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DDE3E1] pb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#202B35] tracking-tight">
                  Candidate Leaderboard
                </h1>
                <p className="text-[#65717D] text-sm mt-1">
                  Batch rank and compare all candidates in the database against a selected job description.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-[#65717D] font-medium">Select Role:</span>
                <select
                  value={leaderboardJobId}
                  onChange={(e) => {
                    setLeaderboardJobId(e.target.value);
                    fetchLeaderboard(e.target.value);
                  }}
                  className="bg-white border border-[#DDE3E1] rounded-lg px-3 py-2 text-xs text-[#202B35] focus:outline-none focus:border-[#187D70] font-medium cursor-pointer shadow-xs"
                >
                  {jobs.map((j) => (
                    <option key={j._id} value={j._id}>{j.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {loadingLeaderboard ? (
              <div className="p-12 text-center text-[#65717D] flex flex-col items-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-[#187D70]" />
                <span className="text-xs">Evaluating and ranking candidate cohort...</span>
              </div>
            ) : leaderboardData ? (
              <div className="space-y-6">
                
                {/* Cohort Metric Tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-white border border-[#DDE3E1] shadow-xs">
                    <span className="text-[11px] uppercase text-[#65717D] block font-mono font-medium">Cohort Size</span>
                    <span className="text-2xl font-bold text-[#202B35] mt-1 block tabular-nums">{leaderboardData.cohortSize} Candidates</span>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-[#DDE3E1] shadow-xs">
                    <span className="text-[11px] uppercase text-[#65717D] block font-mono font-medium">Cohort Average</span>
                    <span className="text-2xl font-bold text-[#187D70] mt-1 block tabular-nums">{leaderboardData.analytics?.avgScore}%</span>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-[#DDE3E1] shadow-xs">
                    <span className="text-[11px] uppercase text-[#65717D] block font-mono font-medium">Tier 1 (High Fit)</span>
                    <span className="text-2xl font-bold text-[#187D58] mt-1 block tabular-nums">{leaderboardData.analytics?.topFitCount}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-[#DDE3E1] shadow-xs">
                    <span className="text-[11px] uppercase text-[#65717D] block font-mono font-medium">Highest Fit Score</span>
                    <span className="text-2xl font-bold text-[#202B35] mt-1 block tabular-nums">{leaderboardData.analytics?.highestScore}%</span>
                  </div>
                </div>

                {/* Leaderboard Table */}
                <div className="rounded-xl bg-white border border-[#DDE3E1] overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#DDE3E1] bg-[#EEF2F1] text-[#65717D] uppercase font-mono text-[10px] tracking-wider">
                        <th className="py-3 px-4 w-14 text-center">Rank</th>
                        <th className="py-3 px-4">Candidate Identifier</th>
                        <th className="py-3 px-4 text-center">Fit Score</th>
                        <th className="py-3 px-4">Experience</th>
                        <th className="py-3 px-4">Skills Coverage</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DDE3E1] text-[#202B35]">
                      {leaderboardData.leaderboard?.map((cand) => (
                        <tr key={cand.resumeId} className="hover:bg-[#F9FAF9] transition-colors">
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-bold text-xs ${
                              cand.rank === 1 ? 'bg-[#FDF6E2] text-[#A96512] border border-[#F5D698]' :
                              cand.rank === 2 ? 'bg-[#EEF2F1] text-[#202B35] border border-[#DDE3E1]' :
                              cand.rank === 3 ? 'bg-[#E5F3EF] text-[#187D70] border border-[#187D70]/20' :
                              'text-[#65717D]'
                            }`}>
                              {cand.rank}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#202B35]">{cand.candidateName}</div>
                            <span className="text-[11px] text-[#65717D]">{cand.tier}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`text-sm font-bold tabular-nums ${
                              cand.overallScore >= 80 ? 'text-[#187D58]' :
                              cand.overallScore >= 60 ? 'text-[#A96512]' : 'text-[#BD4148]'
                            }`}>
                              {cand.overallScore}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-[#202B35]">
                            <span className="font-medium font-mono">{cand.totalExperienceYears} yrs</span>
                            <span className="text-[#65717D] text-[10px] block">
                              (Req: {leaderboardData.minExperienceYears} yrs)
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1">
                              {cand.matchingSkills?.slice(0, 4).map((s, i) => (
                                <span key={i} className="px-1.5 py-0.5 rounded bg-[#E3F5EC] border border-[#A7E4C4] text-[#187D58] text-[10px]">
                                  {s}
                                </span>
                              ))}
                              {(cand.missingRequiredSkills?.length || 0) > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-[#FDE8E9] border border-[#F4B3B7] text-[#BD4148] text-[10px]">
                                  {cand.missingRequiredSkills.length} missing
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedResumeId(cand.resumeId);
                                setSelectedJobId(leaderboardData.jobId);
                                handleEvaluateMatch();
                                setActiveTab('matcher');
                              }}
                              className="px-2.5 py-1 rounded-md bg-[#E5F3EF] hover:bg-[#d6ede6] text-[#187D70] border border-[#187D70]/20 font-medium text-[11px] transition shadow-xs"
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
            <div className="border-b border-[#DDE3E1] pb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#202B35] tracking-tight">
                Candidate Comparison Studio
              </h1>
              <p className="text-[#65717D] text-sm mt-1">
                Compare two candidates side-by-side against the same job description to explain why one outranks another.
              </p>
            </div>

            {/* Comparison Selectors Card */}
            <div className="p-6 rounded-xl bg-white border border-[#DDE3E1] shadow-xs space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#202B35]">Candidate A</label>
                  <select
                    value={compCandA}
                    onChange={(e) => setCompCandA(e.target.value)}
                    className="w-full bg-[#F5F6F3] border border-[#DDE3E1] rounded-lg p-2 text-xs text-[#202B35] focus:outline-none focus:border-[#187D70] font-medium cursor-pointer"
                  >
                    {resumes.map(r => (
                      <option key={r._id} value={r._id}>{r.candidateName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#202B35]">Candidate B</label>
                  <select
                    value={compCandB}
                    onChange={(e) => setCompCandB(e.target.value)}
                    className="w-full bg-[#F5F6F3] border border-[#DDE3E1] rounded-lg p-2 text-xs text-[#202B35] focus:outline-none focus:border-[#187D70] font-medium cursor-pointer"
                  >
                    {resumes.map(r => (
                      <option key={r._id} value={r._id}>{r.candidateName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#202B35]">Target Role</label>
                  <select
                    value={compJobId}
                    onChange={(e) => setCompJobId(e.target.value)}
                    className="w-full bg-[#F5F6F3] border border-[#DDE3E1] rounded-lg p-2 text-xs text-[#202B35] focus:outline-none focus:border-[#187D70] font-medium cursor-pointer"
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
                className="px-6 py-2.5 rounded-lg bg-[#187D70] hover:bg-[#12685E] text-white text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50 shadow-xs cursor-pointer"
              >
                {evaluatingComp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Scale className="w-3.5 h-3.5" />}
                <span>Generate Side-by-Side Comparison</span>
              </button>
              {compCandA === compCandB && (
                <p className="text-xs text-[#A96512]">Please choose two different candidates to compare.</p>
              )}
            </div>

            {/* Comparison Diff Display */}
            {compResult && (
              <div className="space-y-6">
                
                {/* Decision Narrative Card */}
                <div className="p-5 rounded-xl bg-[#F0F7F5] border border-[#D0E7E1] text-xs space-y-1.5">
                  <span className="font-mono uppercase text-[#187D70] tracking-wider text-[11px] font-semibold">
                    Explainable Differential Summary
                  </span>
                  <p className="text-sm text-[#202B35] leading-relaxed font-normal">
                    {compResult.explainableReasoning}
                  </p>
                </div>

                {/* Symmetrical Side-by-Side Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Candidate A Card */}
                  <div className="p-6 rounded-xl bg-white border border-[#DDE3E1] shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-[#DDE3E1] pb-3">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-[#65717D]">Candidate A</span>
                        <h3 className="text-base font-bold text-[#202B35]">{compResult.candidateA.name}</h3>
                      </div>
                      <span className={`text-3xl font-extrabold tabular-nums ${
                        compResult.candidateA.overallScore >= 80 ? 'text-[#187D58]' :
                        compResult.candidateA.overallScore >= 60 ? 'text-[#A96512]' : 'text-[#BD4148]'
                      }`}>
                        {compResult.candidateA.overallScore}%
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-[#EEF2F1]">
                        <span className="text-[#65717D]">Mandatory Skills Score</span>
                        <span className="font-mono font-semibold text-[#202B35] tabular-nums">{compResult.candidateA.breakdown?.skillsMatchScore}%</span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b border-[#EEF2F1]">
                        <span className="text-[#65717D]">Documented Experience</span>
                        <span className="font-mono font-semibold text-[#202B35] tabular-nums">{compResult.candidateA.experienceYears} Years</span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <span className="text-[#65717D] block">Satisfied Skills</span>
                        <div className="flex flex-wrap gap-1">
                          {compResult.candidateA.matchingSkills?.map((s, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-[#E3F5EC] border border-[#A7E4C4] text-[#187D58] text-[10px] font-medium">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      {compResult.candidateA.uniqueSkills?.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-[#EEF2F1]">
                          <span className="text-[#187D70] font-medium block">Skills Unique to {compResult.candidateA.name}</span>
                          <div className="flex flex-wrap gap-1">
                            {compResult.candidateA.uniqueSkills.map((s, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-[#E5F3EF] border border-[#187D70]/20 text-[#187D70] text-[10px] font-semibold">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Candidate B Card */}
                  <div className="p-6 rounded-xl bg-white border border-[#DDE3E1] shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-[#DDE3E1] pb-3">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-[#65717D]">Candidate B</span>
                        <h3 className="text-base font-bold text-[#202B35]">{compResult.candidateB.name}</h3>
                      </div>
                      <span className={`text-3xl font-extrabold tabular-nums ${
                        compResult.candidateB.overallScore >= 80 ? 'text-[#187D58]' :
                        compResult.candidateB.overallScore >= 60 ? 'text-[#A96512]' : 'text-[#BD4148]'
                      }`}>
                        {compResult.candidateB.overallScore}%
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-[#EEF2F1]">
                        <span className="text-[#65717D]">Mandatory Skills Score</span>
                        <span className="font-mono font-semibold text-[#202B35] tabular-nums">{compResult.candidateB.breakdown?.skillsMatchScore}%</span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b border-[#EEF2F1]">
                        <span className="text-[#65717D]">Documented Experience</span>
                        <span className="font-mono font-semibold text-[#202B35] tabular-nums">{compResult.candidateB.experienceYears} Years</span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <span className="text-[#65717D] block">Satisfied Skills</span>
                        <div className="flex flex-wrap gap-1">
                          {compResult.candidateB.matchingSkills?.map((s, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-[#E3F5EC] border border-[#A7E4C4] text-[#187D58] text-[10px] font-medium">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      {compResult.candidateB.uniqueSkills?.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-[#EEF2F1]">
                          <span className="text-[#187D70] font-medium block">Skills Unique to {compResult.candidateB.name}</span>
                          <div className="flex flex-wrap gap-1">
                            {compResult.candidateB.uniqueSkills.map((s, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-[#E5F3EF] border border-[#187D70]/20 text-[#187D70] text-[10px] font-semibold">
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
        {/* TAB 4: GRAPH-BASED ANALYTICS LABORATORY                        */}
        {/* ============================================================== */}
        {activeTab === 'analytics' && (
          <AnalyticsLab
            jobs={jobs}
            selectedJobId={selectedJobId || leaderboardJobId}
            onSelectCandidate={(candId) => {
              setSelectedResumeId(candId);
              setActiveTab('matcher');
            }}
            onSelectJob={(jId) => {
              setSelectedJobId(jId);
              setLeaderboardJobId(jId);
            }}
            showBanner={showBanner}
          />
        )}

        {/* ============================================================== */}
        {/* TAB 5: WHAT-IF HIRING POLICY SIMULATOR                         */}
        {/* ============================================================== */}
        {activeTab === 'simulator' && (
          <WhatIfSimulator
            jobs={jobs}
            selectedJobId={selectedJobId || leaderboardJobId}
            onSelectJob={(jId) => {
              setSelectedJobId(jId);
              setLeaderboardJobId(jId);
            }}
            showBanner={showBanner}
          />
        )}

        {/* ============================================================== */}
        {/* TAB 6: RECRUITMENT OUTCOME & PIPELINE TRACKER                  */}
        {/* ============================================================== */}
        {activeTab === 'outcomes' && (
          <OutcomeTracker
            candidates={resumes}
            jobs={jobs}
            selectedJobId={selectedJobId || leaderboardJobId}
            showBanner={showBanner}
            activeUser={activeUser}
          />
        )}

        {/* ============================================================== */}
        {/* TAB 7: FAIRNESS & DISPARATE IMPACT AUDIT (EEOC 4/5ths)          */}
        {/* ============================================================== */}
        {activeTab === 'fairness' && (
          <div className="space-y-8">
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
                    value={fairnessThreshold}
                    onChange={(e) => {
                      const t = Number(e.target.value);
                      setFairnessThreshold(t);
                      fetchFairnessAudit(selectedJobId || (jobs.length > 0 ? jobs[0]._id : ''), t);
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
                  <span className="text-xs text-[#65717D] font-medium">Role:</span>
                  <select
                    value={selectedJobId}
                    onChange={(e) => {
                      setSelectedJobId(e.target.value);
                      fetchFairnessAudit(e.target.value, fairnessThreshold);
                    }}
                    className="bg-white border border-[#DDE3E1] rounded-lg px-3 py-1.5 text-xs text-[#202B35] focus:outline-none focus:border-[#187D70] cursor-pointer shadow-xs font-medium"
                  >
                    {jobs.map(j => (
                      <option key={j._id} value={j._id}>{j.title}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {loadingFairness ? (
              <div className="p-12 text-center text-[#65717D] space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#187D70]" />
                <p className="text-xs">Computing disparate impact across candidate seniority cohorts...</p>
              </div>
            ) : fairnessAuditData?.fairnessAudit ? (
              <div className="space-y-6">
                
                {/* Status Hero Card */}
                <div className={`p-6 rounded-xl border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                  fairnessAuditData.fairnessAudit.adverseImpactDetected
                    ? 'bg-[#FDF6E2] border-[#F5D698] text-[#A96512]'
                    : 'bg-[#E3F5EC] border-[#A7E4C4] text-[#187D58]'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-white/70 shadow-xs shrink-0">
                      <ShieldCheck className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="text-[11px] font-mono uppercase tracking-wider font-semibold opacity-80">Compliance Audit Result</div>
                      <h2 className="text-xl font-bold mt-0.5">
                        {fairnessAuditData.fairnessAudit.adverseImpactDetected
                          ? 'Potential Adverse Impact Detected'
                          : 'EEOC Four-Fifths Rule Compliant'}
                      </h2>
                      <p className="text-xs mt-1.5 max-w-2xl leading-relaxed opacity-90">
                        {fairnessAuditData.fairnessAudit.methodology}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-current/20 pt-4 md:pt-0 md:pl-6 text-xs shrink-0">
                    <div>
                      <span className="opacity-80 block font-medium">Cohort Pool</span>
                      <span className="text-2xl font-bold tabular-nums">{fairnessAuditData.fairnessAudit.totalCohortSize}</span>
                    </div>
                    <div>
                      <span className="opacity-80 block font-medium">Pass Rate</span>
                      <span className="text-2xl font-bold tabular-nums">{fairnessAuditData.fairnessAudit.overallPassRate}%</span>
                    </div>
                    <div>
                      <span className="opacity-80 block font-medium">Benchmark</span>
                      <span className="text-2xl font-bold tabular-nums">&gt;={fairnessAuditData.fairnessAudit.passThreshold}%</span>
                    </div>
                  </div>
                </div>

                {/* Cohort Breakdown Table */}
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
                        {fairnessAuditData.fairnessAudit.cohortBreakdown.map((row) => (
                          <tr key={row.key} className="hover:bg-[#F9FAF9] transition-colors">
                            <td className="py-3 px-4 font-semibold text-[#202B35]">{row.label}</td>
                            <td className="py-3 px-4 font-mono tabular-nums">{row.totalCandidates}</td>
                            <td className="py-3 px-4 font-mono font-semibold text-[#187D58] tabular-nums">{row.passedCount}</td>
                            <td className="py-3 px-4 font-mono tabular-nums">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 rounded-full bg-[#EEF2F1] overflow-hidden">
                                  <div className="h-full bg-[#187D70] rounded-full" style={{ width: `${row.selectionRate}%` }} />
                                </div>
                                <span>{row.selectionRate}%</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono tabular-nums">
                              <span className={row.satisfiesFourFifthsRule ? 'text-[#187D58] font-bold' : 'text-[#A96512] font-bold'}>
                                {row.impactRatio.toFixed(2)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {row.satisfiesFourFifthsRule ? (
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
                        ))}
                      </tbody>
                    </table>
                  </div>
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
              <div className="p-8 rounded-xl bg-white border border-[#DDE3E1] text-center text-xs text-[#65717D]">
                Please select a job role above to view its algorithmic fairness audit and disparate impact analysis.
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: RESUME INGESTION & EXPLORER                             */}
        {/* ============================================================== */}
        {activeTab === 'resumes' && (
          <div className="space-y-8">
            <div className="border-b border-[#DDE3E1] pb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#202B35] tracking-tight">
                Candidate Profiles &amp; Ingestion
              </h1>
              <p className="text-[#65717D] text-sm mt-1">
                Upload PDF resumes or paste plain text for automatic skill extraction and bias-mitigating anonymization.
              </p>
            </div>

            {/* Ingestion Form Card */}
            <form onSubmit={handleCreateResume} className="p-6 rounded-xl bg-white border border-[#DDE3E1] shadow-xs space-y-4">
              <h2 className="text-base font-semibold text-[#202B35] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#187D70]" />
                <span>Ingest New Resume</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#202B35]">Upload PDF Resume File</label>
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    onChange={(e) => setResumeFile(e.target.files[0])}
                    className="w-full text-xs text-[#65717D] file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#187D70] file:text-white hover:file:bg-[#12685E] cursor-pointer p-2 rounded-lg bg-[#F5F6F3] border border-[#DDE3E1]"
                  />
                  <p className="text-[11px] text-[#65717D]">Supports PDF &amp; TXT documents up to 5MB.</p>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-lg bg-[#F5F6F3] border border-[#DDE3E1]">
                  <input
                    type="checkbox"
                    id="anonymizeToggle"
                    checked={anonymizePII}
                    onChange={(e) => setAnonymizePII(e.target.checked)}
                    className="w-4 h-4 accent-[#187D70] rounded cursor-pointer"
                  />
                  <label htmlFor="anonymizeToggle" className="text-xs text-[#202B35] cursor-pointer">
                    <strong className="block font-medium">Anonymize PII for Bias Mitigation</strong>
                    Mask candidate names, emails, and phone numbers during parsing.
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#202B35]">Or Paste Resume Plain Text</label>
                <textarea
                  rows={4}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste candidate resume text here to extract technical skills and experience..."
                  className="w-full bg-[#F5F6F3] border border-[#DDE3E1] rounded-lg p-3 text-xs text-[#202B35] placeholder:text-[#65717D] focus:outline-none focus:border-[#187D70]"
                />
              </div>

              <button
                type="submit"
                disabled={submittingResume || (!resumeFile && !resumeText.trim())}
                className="px-5 py-2.5 rounded-lg bg-[#187D70] hover:bg-[#12685E] text-white text-xs font-semibold transition disabled:opacity-40 flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {submittingResume ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>Parse &amp; Store Candidate</span>
              </button>
            </form>

            {/* Existing Candidates Grid */}
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-[#202B35]">Stored Candidates ({resumes.length})</h2>
              {resumes.length === 0 ? (
                <div className="p-8 rounded-xl bg-white border border-dashed border-[#DDE3E1] text-center text-sm text-[#65717D]">
                  No candidate resumes stored yet. Click "Seed Data" in the top bar to load sample profiles.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resumes.map((r) => (
                    <div key={r._id} className="p-5 rounded-xl bg-white border border-[#DDE3E1] shadow-xs flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-[#202B35]">{r.candidateName}</span>
                          <button
                            onClick={() => handleDeleteResume(r._id)}
                            className="text-[#65717D] hover:text-[#BD4148] transition p-1"
                            title="Delete candidate profile"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-xs text-[#65717D] font-mono">
                          {r.totalExperienceYears} years documented experience
                        </div>
                        <p className="text-xs text-[#65717D] line-clamp-2 leading-relaxed">
                          {r.summary || 'No summary provided.'}
                        </p>

                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {r.skills?.slice(0, 8).map((s, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded-md bg-[#EEF2F1] text-[#202B35] text-[10px] font-medium">
                              {typeof s === 'string' ? s : s.name}
                            </span>
                          ))}
                          {(r.skills?.length || 0) > 8 && (
                            <span className="px-2 py-0.5 rounded-md bg-[#EEF2F1] text-[#65717D] text-[10px]">
                              +{r.skills.length - 8} more
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#DDE3E1] flex items-center justify-between text-[11px] text-[#65717D]">
                        <span>Anonymized: {r.anonymized ? 'Yes' : 'No'}</span>
                        <button
                          onClick={() => { setSelectedResumeId(r._id); setActiveTab('matcher'); }}
                          className="text-[#187D70] hover:text-[#12685E] font-medium flex items-center gap-1"
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
        {/* TAB 6: JOB POSTINGS & REQUIREMENTS                             */}
        {/* ============================================================== */}
        {activeTab === 'jobs' && (
          <div className="space-y-8">
            <div className="border-b border-[#DDE3E1] pb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#202B35] tracking-tight">
                Job Postings &amp; Core Requirements
              </h1>
              <p className="text-[#65717D] text-sm mt-1">
                Define open roles with mandatory qualifications, experience thresholds, and preferred competencies.
              </p>
            </div>

            {/* Create Job Form Card */}
            <form onSubmit={handleCreateJob} className="p-6 rounded-xl bg-white border border-[#DDE3E1] shadow-xs space-y-4">
              <h2 className="text-base font-semibold text-[#202B35] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#187D70]" />
                <span>Create New Job Posting</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#202B35]">Job Title</label>
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Lead Backend Engineer"
                    className="w-full bg-[#F5F6F3] border border-[#DDE3E1] rounded-lg p-2.5 text-xs text-[#202B35] focus:outline-none focus:border-[#187D70]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#202B35]">Department</label>
                  <input
                    type="text"
                    value={jobDepartment}
                    onChange={(e) => setJobDepartment(e.target.value)}
                    placeholder="e.g. Core Engineering"
                    className="w-full bg-[#F5F6F3] border border-[#DDE3E1] rounded-lg p-2.5 text-xs text-[#202B35] focus:outline-none focus:border-[#187D70]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#202B35]">Min Experience (Years)</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={jobExpYears}
                    onChange={(e) => setJobExpYears(e.target.value)}
                    className="w-full bg-[#F5F6F3] border border-[#DDE3E1] rounded-lg p-2.5 text-xs text-[#202B35] focus:outline-none focus:border-[#187D70]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#202B35]">Job Description &amp; Technical Requirements</label>
                <textarea
                  rows={4}
                  required
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Describe role and key technologies (React, Node.js, Python, AWS, Docker etc.)..."
                  className="w-full bg-[#F5F6F3] border border-[#DDE3E1] rounded-lg p-3 text-xs text-[#202B35] placeholder:text-[#65717D] focus:outline-none focus:border-[#187D70]"
                />
              </div>

              <button
                type="submit"
                disabled={submittingJob}
                className="px-5 py-2.5 rounded-lg bg-[#187D70] hover:bg-[#12685E] text-white text-xs font-semibold transition disabled:opacity-40 flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {submittingJob ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Publish Job &amp; Extract Skills</span>
              </button>
            </form>

            {/* Active Jobs Grid */}
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-[#202B35]">Active Job Postings ({jobs.length})</h2>
              {jobs.length === 0 ? (
                <div className="p-8 rounded-xl bg-white border border-dashed border-[#DDE3E1] text-center text-sm text-[#65717D]">
                  No active job descriptions. Click "Seed Data" to load sample postings.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {jobs.map((j) => (
                    <div key={j._id} className="p-5 rounded-xl bg-white border border-[#DDE3E1] shadow-xs flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-[#202B35]">{j.title}</span>
                          <button
                            onClick={() => handleDeleteJob(j._id)}
                            className="text-[#65717D] hover:text-[#BD4148] transition p-1"
                            title="Delete job posting"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-xs text-[#65717D]">
                          {j.department} • Min {j.minExperienceYears} yrs experience
                        </div>
                        <p className="text-xs text-[#65717D] line-clamp-2 leading-relaxed">
                          {j.description}
                        </p>

                        <div className="space-y-1.5 pt-2">
                          <span className="text-[10px] uppercase font-mono tracking-wider text-[#65717D]">Mandatory Skills:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {j.requiredSkills?.map((s, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded-md bg-[#E5F3EF] border border-[#187D70]/20 text-[#187D70] text-[10px] font-semibold">
                                {typeof s === 'string' ? s : s.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#DDE3E1] flex items-center justify-between text-[11px] text-[#65717D]">
                        <span>{j.company}</span>
                        <button
                          onClick={() => { setSelectedJobId(j._id); setActiveTab('matcher'); }}
                          className="text-[#187D70] hover:text-[#12685E] font-medium flex items-center gap-1"
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
        {/* TAB 7: SYSTEM TELEMETRY & HEALTH                               */}
        {/* ============================================================== */}
        {activeTab === 'system' && (
          <div className="space-y-8">
            <div className="border-b border-[#DDE3E1] pb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#202B35] tracking-tight">
                System Telemetry &amp; Architecture
              </h1>
              <p className="text-[#65717D] text-sm mt-1">
                Real-time operational monitoring of API endpoints, database driver state, and security boundaries.
              </p>
            </div>

            <section className="p-6 sm:p-8 rounded-xl bg-white border border-[#DDE3E1] shadow-xs space-y-6">
              
              {/* Telemetry Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DDE3E1] pb-5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-[#E5F3EF] border border-[#187D70]/20 flex items-center justify-center text-[#187D70]">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[#202B35]">Live Health-Check Telemetry</h2>
                    <p className="text-xs text-[#65717D]">
                      Target Endpoint: <code className="text-[#187D70] font-mono">{getApiUrl('/api/health')}</code>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {latency !== null && (
                    <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-[#EEF2F1] text-[#202B35] border border-[#DDE3E1] tabular-nums">
                      {latency} ms
                    </span>
                  )}
                  {lastChecked && (
                    <span className="text-xs text-[#65717D]">Checked: {lastChecked}</span>
                  )}
                  <button
                    onClick={checkHealth}
                    disabled={healthStatus === 'checking'}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#187D70] hover:bg-[#12685E] text-white text-xs font-medium transition disabled:opacity-50 shadow-xs cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${healthStatus === 'checking' ? 'animate-spin' : ''}`} />
                    <span>Test Endpoint</span>
                  </button>
                </div>
              </div>

              {/* Status Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-[#F5F6F3] border border-[#DDE3E1]">
                    {healthStatus === 'healthy' ? (
                      <CheckCircle2 className="w-5 h-5 text-[#187D58] shrink-0 mt-0.5" />
                    ) : healthStatus === 'checking' ? (
                      <RefreshCw className="w-5 h-5 text-[#A96512] shrink-0 mt-0.5 animate-spin" />
                    ) : (
                      <XCircle className="w-5 h-5 text-[#BD4148] shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="text-sm font-semibold text-[#202B35]">
                        {healthStatus === 'healthy'
                          ? 'Express API Responding Normally'
                          : healthStatus === 'checking'
                          ? 'Verifying Backend Connectivity...'
                          : 'Service Connection Offline'}
                      </div>
                      <div className="text-xs text-[#65717D] mt-1">
                        {healthStatus === 'healthy'
                          ? `Backend active. Database connected via ${healthData?.database?.type || 'driver'}.`
                          : healthStatus === 'checking'
                          ? 'Sending health ping to verify runtime and database availability...'
                          : (healthData?.error || 'Unable to establish connection to backend service.')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-lg bg-[#F5F6F3] border border-[#DDE3E1]">
                    <ShieldCheck className="w-5 h-5 text-[#187D70] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-[#202B35]">Secret Isolation &amp; Git Hygiene</div>
                      <div className="text-xs text-[#65717D] mt-1">
                        Database credentials remain isolated in <code className="text-[#187D70] font-mono">backend/.env</code> and excluded from Git commits.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#65717D]">Response Payload</span>
                  <pre className="p-4 rounded-lg bg-[#F5F6F3] border border-[#DDE3E1] font-mono text-xs text-[#202B35] overflow-x-auto max-h-48 leading-relaxed">
                    {healthData ? JSON.stringify(healthData, null, 2) : '// No response yet'}
                  </pre>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL 1: ALGORITHMIC FAIRNESS & AUDIT DOSSIER                  */}
      {/* ============================================================== */}
      {activeDossier && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white border border-[#DDE3E1] rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-xl animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-[#DDE3E1] pb-4">
              <div className="flex items-center gap-2 text-[#187D70] font-semibold text-sm">
                <FileCheck className="w-5 h-5" />
                <span>Algorithmic Fairness &amp; Match Compliance Dossier</span>
              </div>
              <button
                onClick={() => setActiveDossier(null)}
                className="text-[#65717D] hover:text-[#202B35] text-xs font-mono p-1 rounded hover:bg-[#EEF2F1] cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="p-4 rounded-lg bg-[#F5F6F3] border border-[#DDE3E1] space-y-1.5">
                <div className="text-[#187D70] font-semibold">DOSSIER_ID: {activeDossier.dossierId}</div>
                <div className="text-[#65717D]">TIMESTAMP: {activeDossier.generatedAt}</div>
                <div className="text-[#65717D]">ROLE: {activeDossier.role?.title} ({activeDossier.role?.company})</div>
                <div className="text-[#65717D]">CANDIDATE: {activeDossier.candidate?.identifier}</div>
                <div className="text-[#187D58] font-bold">SCORE: {activeDossier.evaluation?.overallScore}%</div>
              </div>

              <div className="p-4 rounded-lg bg-[#E3F5EC] border border-[#A7E4C4] text-[#187D58] space-y-1">
                <div className="font-bold">CERTIFICATION: {activeDossier.fairnessCompliance?.certification}</div>
                <p className="text-[11px] leading-relaxed opacity-90">{activeDossier.fairnessCompliance?.statement}</p>
              </div>

              <div className="space-y-1.5 text-[#202B35] font-sans">
                <span className="font-mono text-xs uppercase text-[#65717D]">Evaluation Summary:</span>
                <p className="p-3.5 rounded-lg bg-[#F5F6F3] border border-[#DDE3E1] text-xs text-[#202B35] leading-relaxed">
                  {activeDossier.explainabilitySummary}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#DDE3E1]">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(activeDossier, null, 2));
                  showBanner('Audit Dossier JSON copied to clipboard!');
                }}
                className="px-4 py-2 rounded-lg bg-white border border-[#DDE3E1] hover:bg-[#EEF2F1] text-[#202B35] text-xs font-medium transition shadow-xs cursor-pointer"
              >
                Copy JSON Dossier
              </button>
              <button
                onClick={() => setActiveDossier(null)}
                className="px-4 py-2 rounded-lg bg-[#187D70] hover:bg-[#12685E] text-white text-xs font-medium transition shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: ATS WEBHOOK DISPATCH MODAL                            */}
      {/* ============================================================== */}
      {webhookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white border border-[#DDE3E1] rounded-2xl p-6 sm:p-8 shadow-xl space-y-6 animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-[#DDE3E1] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#E5F3EF] text-[#187D70]">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#202B35]">Dispatch to ATS Webhook</h2>
                  <span className="text-[11px] text-[#65717D]">Enterprise HRIS Stream Integration</span>
                </div>
              </div>
              <button
                onClick={() => { setWebhookModalOpen(false); setWebhookResponse(null); }}
                className="text-[#65717D] hover:text-[#202B35] p-1 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[#202B35] font-semibold">Target ATS / HRIS Platform</label>
                <select
                  value={webhookPlatform}
                  onChange={(e) => setWebhookPlatform(e.target.value)}
                  className="w-full bg-[#F5F6F3] border border-[#DDE3E1] rounded-lg p-2.5 text-[#202B35] focus:outline-none focus:border-[#187D70] cursor-pointer"
                >
                  <option value="greenhouse">Greenhouse (Harvest Webhook API)</option>
                  <option value="lever">Lever (Postings &amp; Candidates API)</option>
                  <option value="workday">Workday (Enterprise Integration Cloud)</option>
                  <option value="ashby">Ashby (Talent Operations Webhook)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[#202B35] font-semibold">Outbound Webhook URL (Optional for live delivery)</label>
                <input
                  type="url"
                  placeholder="https://your-ats.com/webhooks/drishti-ai"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full bg-[#F5F6F3] border border-[#DDE3E1] rounded-lg p-2.5 text-[#202B35] focus:outline-none focus:border-[#187D70] font-mono text-[11px]"
                />
                <p className="text-[11px] text-[#65717D]">
                  Leave blank to run a simulated delivery test with cryptographic payload signature.
                </p>
              </div>

              {webhookResponse && (
                <div className="p-4 rounded-lg bg-[#F5F6F3] border border-[#DDE3E1] space-y-2">
                  <span className="font-semibold text-[#187D58] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Webhook Event Emitted
                  </span>
                  <pre className="text-[10px] text-[#202B35] font-mono bg-white p-2.5 rounded-md border border-[#DDE3E1] overflow-x-auto max-h-40">
                    {JSON.stringify(webhookResponse, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#DDE3E1]">
              <button
                onClick={() => { setWebhookModalOpen(false); setWebhookResponse(null); }}
                className="px-4 py-2 rounded-lg bg-white border border-[#DDE3E1] hover:bg-[#EEF2F1] text-[#202B35] text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleDispatchWebhook}
                disabled={dispatchingWebhook}
                className="px-5 py-2 rounded-lg bg-[#187D70] hover:bg-[#12685E] text-white text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50 shadow-xs cursor-pointer"
              >
                {dispatchingWebhook ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{dispatchingWebhook ? 'Dispatching...' : 'Confirm & Dispatch Event'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: AUDIT HISTORY & RECRUITER OVERRIDE LEDGER             */}
      {/* ============================================================== */}
      <AuditHistoryModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        selectedJobId={selectedJobId || leaderboardJobId}
        showBanner={showBanner}
        activeUser={activeUser}
      />

      {/* Application Footer */}
      <footer className="border-t border-[#DDE3E1] mt-20 py-8 text-center text-xs text-[#65717D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#202B35]">Drishti AI</span>
            <span>•</span>
            <span>Explainable Job-Fit Intelligence &amp; Recruitment Analytics Platform</span>
          </div>
          <div className="text-[#65717D]">
            Deterministic Matching • EEOC AEDT Compliant • RBAC • TF-IDF Vectors
          </div>
        </div>
      </footer>
    </div>
  );
}
