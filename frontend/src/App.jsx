import useMonitorData from './hooks/useMonitorData'
import { AddURLForm, URLTable, StatCard } from './components'

export default function App() {
  const { urls, loading, error, countdown, handleAdd, handleDelete } = useMonitorData()

  // No merging required anymore! The backend optimizes this payload.
  const upCount   = urls.filter(u => u.latest_check?.is_up).length
  const downCount = urls.filter(u => u.latest_check && !u.latest_check.is_up).length

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100 font-sans selection:bg-emerald-500/30 overflow-hidden relative">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[150px] pointer-events-none" />

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/60 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Uptime Monitor
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)] flex items-center gap-1.5 backdrop-blur-md">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              Auto-checking in {countdown}s
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 space-y-8 relative z-10">

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
          <StatCard label="Total Monitored" value={urls.length} />
          <StatCard label="Systems Operational" value={upCount} accent="emerald" />
          <StatCard label="Outages Detected" value={downCount} accent="red" />
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-5 py-4 text-sm text-red-200 flex items-center gap-3 animate-fade-in backdrop-blur-sm shadow-[0_0_20px_rgba(239,68,68,0.15)]">
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_2.5fr] gap-8 items-start">
          {/* ── Add URL form ── */}
          <div className="sticky top-[100px]">
            <AddURLForm onAdd={handleAdd} />
          </div>

          {/* ── Table ── */}
          <div className="w-full">
            <URLTable rows={urls} onDelete={handleDelete} loading={loading} />
          </div>
        </div>
      </main>
    </div>
  )
}
