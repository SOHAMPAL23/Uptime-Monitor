import { useState } from 'react'

// ── Stat Card ──────────────────────────────────────────────────────────────────
export function StatCard({ label, value, accent }) {
  const valueClass =
    accent === 'emerald' ? 'text-emerald-400' :
    accent === 'red'     ? 'text-red-400' :
    'text-white'

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-[11px] font-medium uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${valueClass}`}>{value}</p>
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
      setErr(typeof detail === 'string' ? detail : 'Failed to add URL. Check it is a valid address.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="mb-4 text-sm font-semibold text-slate-300 uppercase tracking-wider">
        Add URL to Monitor
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          id="url-name"
          type="text"
          placeholder="Label  (e.g. My API)"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full sm:w-40 shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition"
        />

        <input
          id="url-address"
          type="url"
          required
          placeholder="https://example.com"
          value={url}
          onChange={e => setUrl(e.target.value)}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition"
        />

        <button
          id="add-url-btn"
          type="submit"
          disabled={busy}
          className="shrink-0 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
        >
          {busy ? 'Adding…' : '+ Add'}
        </button>
      </form>

      {err && (
        <p className="mt-2 text-xs text-red-400">{err}</p>
      )}
    </div>
  )
}

// ── URL Table Helpers ──────────────────────────────────────────────────────────
function StatusBadge({ isUp, pending }) {
  if (pending) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-pulse" />
        Pending
      </span>
    )
  }
  if (isUp) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800 bg-emerald-950/60 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        UP
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-800 bg-red-950/60 px-2.5 py-0.5 text-xs font-semibold text-red-400">
      <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
      DOWN
    </span>
  )
}

function ResponseTime({ ms }) {
  if (ms == null) return <span className="text-slate-500">—</span>
  const color = ms < 300 ? 'text-emerald-400' : ms < 800 ? 'text-yellow-400' : 'text-red-400'
  return <span className={`font-mono text-sm ${color}`}>{ms.toFixed(0)} ms</span>
}

function TimeAgo({ isoString }) {
  if (!isoString) return <span className="text-slate-500">Never</span>
  const date = new Date(isoString)
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  let label
  if (diff < 5)    label = 'just now'
  else if (diff < 60)   label = `${diff}s ago`
  else if (diff < 3600) label = `${Math.floor(diff / 60)}m ago`
  else                  label = date.toLocaleTimeString()
  return (
    <span title={date.toLocaleString()} className="text-sm text-slate-400">
      {label}
    </span>
  )
}

function ConfirmDeleteButton({ onConfirm }) {
  const [step, setStep] = useState(0)
  if (step === 0) {
    return (
      <button
        onClick={() => setStep(1)}
        className="rounded px-2 py-1 text-xs text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors duration-150"
      >
        Remove
      </button>
    )
  }
  return (
    <span className="flex items-center gap-1">
      <button
        onClick={onConfirm}
        className="rounded px-2 py-1 text-xs font-semibold text-red-400 bg-red-950/40 hover:bg-red-900/50 transition-colors"
      >
        Confirm
      </button>
      <button
        onClick={() => setStep(0)}
        className="rounded px-2 py-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        Cancel
      </button>
    </span>
  )
}

function LoadingSpinner() {
  return (
    <svg className="h-5 w-5 animate-spin text-emerald-400" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

// ── Main table ─────────────────────────────────────────────────────────────────
export function URLTable({ rows, onDelete, loading }) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-12 flex items-center justify-center">
        <LoadingSpinner />
        <span className="ml-3 text-sm text-slate-400">Loading…</span>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-12 text-center">
        <p className="text-slate-500 text-sm">No URLs monitored yet. Add one above ↑</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden animate-fade-in">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left">
              {['URL', 'Status', 'Response Time', 'Last Checked', ''].map(h => (
                <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.id}
                className={`border-b border-slate-800/60 transition-colors hover:bg-slate-800/40 ${i % 2 === 0 ? '' : 'bg-slate-900/50'}`}
              >
                <td className="px-4 py-3 max-w-xs">
                  <p className="font-medium text-slate-200 truncate" title={row.name}>{row.name}</p>
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-500 hover:text-emerald-400 truncate block transition-colors"
                    title={row.url}
                  >
                    {row.url}
                  </a>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge isUp={row.latest?.is_up} pending={!row.latest} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <ResponseTime ms={row.latest?.response_time_ms} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <TimeAgo isoString={row.latest?.checked_at} />
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <ConfirmDeleteButton onConfirm={() => onDelete(row.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 text-[11px] text-slate-600 border-t border-slate-800">
        {rows.length} URL{rows.length !== 1 ? 's' : ''} tracked
      </div>
    </div>
  )
}
