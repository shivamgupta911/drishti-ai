import { useState, useEffect } from 'react';
import { 
  FileText, 
  Briefcase, 
  Target, 
  Scale, 
  Activity, 
  Server, 
  Database, 
  Layers, 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function App() {
  const [healthData, setHealthData] = useState(null);
  const [healthStatus, setHealthStatus] = useState('checking'); // 'checking' | 'healthy' | 'error'
  const [latency, setLatency] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

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

  useEffect(() => {
    checkHealth();
  }, []);

  const plannedModules = [
    {
      title: 'Resume Parsing & Attribute Extraction',
      description: 'Structured ingestion of resumes to extract skills, tenure, education, and domain competencies.',
      tag: 'Day 2+',
      icon: FileText,
    },
    {
      title: 'Job Requirement Intelligence',
      description: 'Semantic extraction of mandatory qualifications, preferred skills, and seniority expectations.',
      tag: 'Day 2+',
      icon: Briefcase,
    },
    {
      title: 'Explainable Fit & Match Scorer',
      description: 'Multi-dimensional candidate-job alignment with clear, transparent factor-by-factor attribution.',
      tag: 'Day 2+',
      icon: Target,
    },
    {
      title: 'Fairness & Bias Audit Engine',
      description: 'Algorithmic auditing to promote equitable matching and eliminate implicit demographic proxies.',
      tag: 'Day 2+',
      icon: Scale,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Background ambient gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/20 to-sky-500/20 blur-3xl opacity-60 rounded-full" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-600/10 blur-3xl rounded-full" />
      </div>

      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Drishti AI
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-indigo-400 block -mt-1">
                Explainable Resume-to-Job Matching
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
              <span className="text-slate-400">Backend:</span>
              <span className="flex items-center gap-1.5 font-medium">
                {healthStatus === 'healthy' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-400">Online</span>
                  </>
                )}
                {healthStatus === 'checking' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-amber-400">Checking...</span>
                  </>
                )}
                {healthStatus === 'error' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span className="text-rose-400">Offline</span>
                  </>
                )}
              </span>
            </div>

            <button
              onClick={checkHealth}
              disabled={healthStatus === 'checking'}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50"
              title="Refresh health status"
            >
              <RefreshCw className={`w-4 h-4 ${healthStatus === 'checking' ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12 space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto pt-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Local Engineering Foundation (Day 1)</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
            Explainable Resume-to-Job Matching
          </h1>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            Drishti AI local foundation is operational. The React frontend, Express API layer, and Mongoose database connector are established to power transparent, bias-conscious talent matching.
          </p>
        </div>

        {/* System Foundation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-white">Frontend Workspace</h3>
            <p className="text-sm text-slate-400">
              React 19 + Vite 8 + Tailwind CSS. Production-ready asset pipeline, component structure, and live telemetry viewer.
            </p>
            <div className="pt-2 text-xs font-mono text-slate-500">
              Port: http://localhost:3000
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Server className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-white">Express Backend</h3>
            <p className="text-sm text-slate-400">
              Modular Node.js API with health telemetry, CORS policy, error handlers, and isolated environment management.
            </p>
            <div className="pt-2 text-xs font-mono text-slate-500">
              Endpoint: http://localhost:5000/api/health
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-white">Mongoose Database</h3>
            <p className="text-sm text-slate-400">
              Database connection module reading <code className="text-emerald-400">MONGODB_URI</code> securely from backend/.env without exposing secrets.
            </p>
            <div className="pt-2 text-xs font-mono text-slate-500">
              Module: backend/src/config/db.js
            </div>
          </div>
        </div>

        {/* Live Backend Health Check Monitor */}
        <section className="p-6 sm:p-8 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Live Health-Check Telemetry</h2>
                <p className="text-xs text-slate-400">Verifying live server status via <code className="text-indigo-300">/api/health</code></p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {latency !== null && (
                <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  {latency} ms
                </span>
              )}
              {lastChecked && (
                <span className="text-xs text-slate-400">
                  Checked: {lastChecked}
                </span>
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
                    {healthStatus === 'healthy'
                      ? 'The Express backend is active and returning system and database telemetry.'
                      : 'Ensure the backend server is running via `npm run dev` in the backend directory.'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-white">Secret Isolation &amp; Git Hygiene</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Database credentials remain isolated in <code className="text-indigo-300">backend/.env</code>. No credentials or connection strings are exposed in client bundles or committed to Git.
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

        {/* Future Architecture Modules */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Planned Matching Modules</h2>
              <p className="text-sm text-slate-400">Core architecture blocks queued for subsequent development phases</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plannedModules.map((module) => {
              const Icon = module.icon;
              return (
                <div
                  key={module.title}
                  className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/60 hover:border-slate-700/80 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        {module.tag}
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm text-white group-hover:text-indigo-300 transition">
                      {module.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {module.description}
                    </p>
                  </div>
                  <div className="pt-4 flex items-center gap-1 text-[11px] text-slate-500 group-hover:text-indigo-400 transition font-medium">
                    <span>Queued for Phase 2</span>
                    <ArrowRight className="w-3 h-3 transition group-hover:translate-x-0.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 mt-16 py-8 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Drishti AI</span>
            <span>•</span>
            <span>Explainable Resume-to-Job Matching Platform</span>
          </div>
          <div className="text-slate-500">
            Node.js • Express • React • Vite • Tailwind • MongoDB
          </div>
        </div>
      </footer>
    </div>
  );
}
