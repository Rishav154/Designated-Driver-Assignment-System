'use client'
import { useAuth } from '@clerk/nextjs'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/Navbar'
import ErrorMessage from '@/components/ErrorMessage'
import { getApi } from '@/lib/api'

import LoadingScreen from '@/components/LoadingScreen'

interface Ride {
  id: string
  pickupAddress: string
  dropoffAddress: string
  fareEstimate: number
  customer: { name: string }
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.35, ease: 'easeOut' as const } 
  },
}

export default function DriverDashboard() {
  const { getToken } = useAuth()
  const router = useRouter()
  const [available, setAvailable] = useState(false)
  const [rides, setRides] = useState<Ride[]>([])
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(0) // seconds ago

  const [checking, setChecking] = useState(true)

  const fetchOpenRides = useCallback(async () => {
    try {
      const api = await getApi(getToken)
      const res = await api.get('/api/drivers/open-rides')
      setRides(res.data)
      setLastUpdated(0)
    } catch {
      // silently fail on polling
    }
  }, [getToken])

  async function toggleAvailability() {
    setToggling(true)
    setError('')
    try {
      const api = await getApi(getToken)
      await api.post('/api/drivers/availability', { isAvailable: !available })
      setAvailable((a) => !a)
      if (!available) fetchOpenRides()
    } catch {
      setError('Failed to update status. Please try again.')
    } finally {
      setToggling(false)
    }
  }

  useEffect(() => {
    getApi(getToken)
      .then((api) => api.get('/api/auth/me'))
      .then((res) => {
        if (!res.data) router.replace('/onboarding')
        else if (res.data.role !== 'DRIVER') router.replace('/dashboard')
        else setChecking(false)
      })
      .catch(() => setChecking(false))
  }, [])

  useEffect(() => {
    if (checking) return
    fetchOpenRides()
    const pollInterval = setInterval(fetchOpenRides, 10000)
    return () => clearInterval(pollInterval)
  }, [fetchOpenRides, checking])

  // "last updated" counter
  useEffect(() => {
    const tick = setInterval(() => setLastUpdated((s) => s + 1), 1000)
    return () => clearInterval(tick)
  }, [])

  if (checking) return <LoadingScreen />

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-24 pb-12 px-4 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <h1 className="text-3xl font-bold text-black tracking-tight mb-1">Driver Dashboard</h1>
          <p className="text-gray-500 text-sm mb-8">Manage your availability and ride requests</p>

          {error && <div className="mb-4"><ErrorMessage message={error} /></div>}

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Status panel */}
            <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-6">Status</h2>
              <AnimatePresence mode="wait">
                <motion.div
                  key={available ? 'online' : 'offline'}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col items-center text-center mb-8"
                >
                  {available ? (
                    <>
                      <span className="relative flex h-10 w-10 mb-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-10 w-10 bg-green-500" />
                      </span>
                      <p className="text-xl font-bold text-black">You&apos;re Online</p>
                      <p className="text-gray-500 text-sm mt-1">Accepting ride requests</p>
                    </>
                  ) : (
                    <>
                      <span className="relative flex h-10 w-10 mb-4">
                        <span className="relative inline-flex rounded-full h-10 w-10 bg-gray-300" />
                      </span>
                      <p className="text-xl font-bold text-black">You&apos;re Offline</p>
                      <p className="text-gray-500 text-sm mt-1">Go online to start accepting rides</p>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              <motion.button
                onClick={toggleAvailability}
                disabled={toggling}
                whileTap={{ scale: 0.97 }}
                className={`w-full rounded-xl py-3.5 font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  available
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {toggling ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : available ? 'Go Offline' : 'Go Online'}
              </motion.button>
            </div>

            {/* Rides panel */}
            <div className="md:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Open Ride Requests</h2>
                <span className="text-xs text-gray-400">Updated {lastUpdated}s ago</span>
              </div>

              {!available ? (
                <div className="flex flex-col items-center justify-center py-12 text-center opacity-40 select-none">
                  <div className="w-10 h-10 rounded-full bg-gray-200 mb-3" />
                  <p className="text-sm text-gray-500 font-medium">Go online to see ride requests</p>
                </div>
              ) : rides.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-10 h-10 rounded-full bg-gray-100 mb-3 flex items-center justify-center">
                    <span className="text-gray-400 text-lg">🚗</span>
                  </div>
                  <p className="text-sm text-gray-500">No open rides right now</p>
                  <p className="text-xs text-gray-400 mt-1">Check back in a moment</p>
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="flex flex-col gap-3"
                >
                  {rides.map((ride) => (
                    <motion.div
                      key={ride.id}
                      variants={itemVariants}
                      whileHover={{ y: -1, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                      className="border border-gray-100 rounded-xl p-4 flex items-center justify-between gap-4 transition-shadow duration-200"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-black text-sm truncate">{ride.pickupAddress}</p>
                        <p className="text-gray-500 text-xs truncate">→ {ride.dropoffAddress}</p>
                        <p className="text-gray-400 text-xs mt-1">{ride.customer?.name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-green-600 text-sm">₹{ride.fareEstimate}</p>
                        <motion.button
                          onClick={() => router.push(`/driver/rides/${ride.id}`)}
                          whileTap={{ scale: 0.95 }}
                          className="mt-2 bg-black text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-800 transition-colors"
                        >
                          View
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}