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

  const [countdown, setCountdown] = useState(60)

  // ── Auto-refresh & Countdown ──────────────────────────────
  useEffect(() => {
    fetchData()

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchData()
          return 60
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      clearInterval(timer)
    }
  }, [fetchData])

  // ── CRUD ────────────────────────────────────────────────────────────────────
  const handleAdd = async ({ name, url }) => {
    await axios.post(`${API}/urls`, { name, url })
    fetchData()
    setCountdown(60) // Reset countdown on manual add
  }

  const handleDelete = async (id) => {
    await axios.delete(`${API}/urls/${id}`)
    setUrls(prev => prev.filter(u => u.id !== id))
  }

  return { urls, loading, error, countdown, handleAdd, handleDelete }
}
