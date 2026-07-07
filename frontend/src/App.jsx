import useMonitorData from './hooks/useMonitorData'
import { AddURLForm, URLTable, StatCard } from './components'

export default function App() {
  const { urls, checks, loading, error, countdown, handleAdd, handleDelete } = useMonitorData()

  // ── Merge URLs with their latest health check ───────────────────────────────
  const rows = urls.map(url => {
    const latest = checks
      .filter(c => c.url_id === url.id)
      .sort((a, b) => new Date(b.checked_at) - new Date(a.checked_at))[0] ?? null
    return { ...url, latest }
  })

  const upCount   = rows.filter(r => r.latest?.is_up).length
  const downCount = rows.filter(r => r.latest && !r.latest.is_up).length

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100">

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            <h1 className="text-lg font-bold tracking-tight">Uptime Monitor</h1>
          </div>
          <p className="text-xs text-slate-400">
            Refreshing in{' '}
            <span className="font-mono font-semibold text-emerald-400">{countdown}s</span>
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6">

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <StatCard label="Monitored" value={urls.length} />
          <StatCard label="Up" value={upCount}   accent="emerald" />
          <StatCard label="Down" value={downCount} accent="red" />
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            ⚠ {error}
          </div>
        )}

        {/* ── Add URL form ── */}
        <AddURLForm onAdd={handleAdd} />

        {/* ── Table ── */}
        <URLTable rows={rows} onDelete={handleDelete} loading={loading} />
      </main>
    </div>
  )
}
