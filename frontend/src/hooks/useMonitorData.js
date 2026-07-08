import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL ?? ''

export default function useMonitorData() {
  const [urls, setUrls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ── Fetch URLs ──────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      // Add a cache-buster query parameter to prevent browser caching of API responses
      const res = await axios.get(`${API}/urls?t=${Date.now()}`)
      setUrls(res.data)
      setError(null)
    } catch (err) {
      setError('Could not reach the API. Is the backend running on :8000?')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Auto-refresh every 60 s ────────────────────────────────
  useEffect(() => {
    fetchData()

    const refreshInterval = setInterval(() => {
      fetchData()
    }, 60_000)

    return () => {
      clearInterval(refreshInterval)
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
  }

  return { urls, loading, error, handleAdd, handleDelete }
}
