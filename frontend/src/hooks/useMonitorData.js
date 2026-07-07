import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL ?? ''

export default function useMonitorData() {
  const [urls, setUrls] = useState([])
  const [checks, setChecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [countdown, setCountdown] = useState(10)
  const countdownRef = useRef(10)

  // ── Fetch both endpoints concurrently ───────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [urlsRes, checksRes] = await Promise.all([
        axios.get(`${API}/urls`),
        axios.get(`${API}/health-checks?limit=200`),
      ])
      setUrls(urlsRes.data)
      setChecks(checksRes.data)
      setError(null)
    } catch (err) {
      setError('Could not reach the API. Is the backend running on :8000?')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Auto-refresh every 10 s + live countdown ────────────────────────────────
  useEffect(() => {
    fetchData()

    const refreshInterval = setInterval(() => {
      fetchData()
      countdownRef.current = 10
      setCountdown(10)
    }, 10_000)

    const tickInterval = setInterval(() => {
      countdownRef.current -= 1
      setCountdown(countdownRef.current)
    }, 1_000)

    return () => {
      clearInterval(refreshInterval)
      clearInterval(tickInterval)
    }
  }, [fetchData])

  // ── CRUD ────────────────────────────────────────────────────────────────────
  const handleAdd = async ({ name, url }) => {
    await axios.post(`${API}/urls`, { name, url })
    fetchData()
  }

  const handleDelete = async (id) => {
    await axios.delete(`${API}/urls/${id}`)
    setUrls(prev => prev.filter(u => u.id !== id))
    setChecks(prev => prev.filter(c => c.url_id !== id))
  }

  return { urls, checks, loading, error, countdown, handleAdd, handleDelete }
}
