import { useState } from 'react'

// ── Stat Card ──────────────────────────────────────────────────────────────────
export function StatCard({ label, value, accent }) {
  const isEmerald = accent === 'emerald'
  const isRed = accent === 'red'

  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-white/5 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group
      ${isEmerald ? 'border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-emerald-900/20' : 
        isRed ? 'border-red-500/20 hover:border-red-500/40 hover:shadow-red-900/20' : 
        'border-white/10 hover:border-white/20 hover:shadow-white/5'}`}>
      
      {/* Decorative Glow */}
      <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-20 transition-opacity duration-300 group-hover:opacity-40
        ${isEmerald ? 'bg-emerald-500' : isRed ? 'bg-red-500' : 'bg-white'}`} 
      />

      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">{label}</p>
      <p className={`text-4xl font-black tabular-nums tracking-tight
        ${isEmerald ? 'bg-gradient-to-br from-emerald-300 to-emerald-600 bg-clip-text text-transparent' : 
          isRed ? 'bg-gradient-to-br from-red-300 to-red-600 bg-clip-text text-transparent' : 
          'text-white'}`}>
        {value}
      </p>
    </div>
  )
}

// ── Add URL Form ───────────────────────────────────────────────────────────────
export function AddURLForm({ onAdd }) {
  const [name, setName] = useState('')
  const [url, setUrl]   = useState('')
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!url.trim()) return
    
    let formattedUrl = url.trim()
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl
    }

    setBusy(true)
    setErr('')
    try {
      await onAdd({ name: name.trim() || formattedUrl, url: formattedUrl })
      setName('')
      setUrl('')
    } catch (error) {
      const detail = error.response?.data?.detail
      setErr(typeof detail === 'string' ? detail : 'Failed to add URL.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/50 via-cyan-500/50 to-indigo-500/50" />
      
      <h2 className="mb-5 text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
        Register Endpoint
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block ml-1">Friendly Name</label>
          <input
            type="text"
            placeholder="e.g. Production API"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block ml-1">Target URL <span className="text-red-400">*</span></label>
          <input
            type="url"
            required
            placeholder="https://api.example.com/health"
            value={url}
            onChange={e => setUrl(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="mt-2 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-3.5 text-sm font-bold text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none transition-all duration-200"
        >
          {busy ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
              Registering...
            </span>
          ) : 'Start Monitoring'}
        </button>
      </form>

      {err && <p className="mt-4 text-xs font-medium text-red-400 text-center">{err}</p>}
    </div>
  )
}

// ── URL Table Helpers ──────────────────────────────────────────────────────────
function StatusBadge({ isUp, pending }) {
  if (pending) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-700/50 bg-slate-800/50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-300 shadow-inner">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500" />
        </span>
        Pending
      </span>
    )
  }
  if (isUp) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
        Operational
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.1)]">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]" />
      </span>
      Down
    </span>
  )
}

function ResponseTime({ ms }) {
  if (ms == null) return <span className="text-slate-600 font-mono">—</span>
  const isFast = ms < 300;
  const isMed = ms < 800;
  const color = isFast ? 'text-emerald-400' : isMed ? 'text-yellow-400' : 'text-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-black/50 rounded-full overflow-hidden">
        <div className={`h-full ${isFast ? 'bg-emerald-500' : isMed ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min((ms / 1000) * 100, 100)}%` }} />
      </div>
      <span className={`font-mono text-sm font-medium ${color}`}>{ms.toFixed(0)}ms</span>
    </div>
  )
}

function TimeAgo({ isoString }) {
  if (!isoString) return <span className="text-slate-600 text-xs font-medium">Never</span>
  const date = new Date(isoString)
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  let label
  if (diff < 10)   label = 'Just now'
  else if (diff < 60)   label = `${diff}s ago`
  else if (diff < 3600) label = `${Math.floor(diff / 60)}m ago`
  else                  label = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
  return (
    <span title={date.toLocaleString()} className="text-[13px] font-medium text-slate-400">
      {label}
    </span>
  )
}

function ConfirmDeleteButton({ onConfirm }) {
  const [step, setStep] = useState(0)
  if (step === 0) {
    return (
      <button onClick={() => setStep(1)} className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
      </button>
    )
  }
  return (
    <span className="flex items-center justify-end gap-1">
      <button onClick={onConfirm} className="rounded-lg px-3 py-1 text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-[0_0_10px_rgba(239,68,68,0.3)]">
        Confirm
      </button>
      <button onClick={() => setStep(0)} className="rounded-lg px-2 py-1 text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors">
        Cancel
      </button>
    </span>
  )
}

// ── Main table ─────────────────────────────────────────────────────────────────
export function URLTable({ rows, onDelete, loading }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl h-64 flex flex-col items-center justify-center gap-4 animate-pulse">
        <svg className="h-8 w-8 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
        <span className="text-sm font-medium tracking-widest text-slate-500 uppercase">Synchronizing...</span>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-16 text-center shadow-xl">
        <div className="mx-auto w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">No Endpoints Monitored</h3>
        <p className="text-slate-400 text-sm max-w-sm mx-auto">Register a URL on the left to start gathering uptime metrics and latency data.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-black/20 text-left">
              {['Endpoint', 'Status', 'Latency', 'Last Ping', ''].map(h => (
                <th key={h} className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const latest = row.latest_check;
              return (
                <tr key={row.id} className="group border-b border-white/5 transition-colors hover:bg-white/[0.03] last:border-0">
                  <td className="px-5 py-4 max-w-[200px]">
                    <p className="font-bold text-slate-100 truncate text-[15px]" title={row.name}>{row.name}</p>
                    <a href={row.url} target="_blank" rel="noreferrer" className="text-[13px] text-slate-500 hover:text-emerald-400 truncate block mt-0.5 transition-colors" title={row.url}>
                      {row.url}
                    </a>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <StatusBadge isUp={latest?.is_up} pending={!latest} />
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <ResponseTime ms={latest?.response_time_ms} />
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <TimeAgo isoString={latest?.checked_at} />
                  </td>
                  <td className="px-5 py-4 text-right whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    <ConfirmDeleteButton onConfirm={() => onDelete(row.id)} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
