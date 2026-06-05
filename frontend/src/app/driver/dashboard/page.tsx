'use client'
import { useAuth } from '@clerk/nextjs'
import { useEffect, useState, useCallback } from 'react'
import { useCache } from '@/context/CacheContext'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/Navbar'
import ErrorMessage from '@/components/ErrorMessage'
import StarRating from '@/components/StarRating'
import { getApi } from '@/lib/api'
import { Wallet, Star, Calendar, Car, MessageSquare, TrendingUp, BarChart3 } from 'lucide-react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area 
} from 'recharts'

import LoadingScreen from '@/components/LoadingScreen'

interface Ride {
  id: string
  pickupAddress: string
  dropoffAddress: string
  fareEstimate: number
  customer: { name: string }
}

interface Stats {
  totalIncome: number
  todayIncome: number
  totalRides: number
  todayRides: number
  rating: number
  dailyStats: {
    date: string
    rides: number
    income: number
  }[]
  feedback: {
    id: string
    score: number
    comment: string
    customerName: string
    customerAvatar: string | null
  }[]
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
  const { setCache, getCache } = useCache()
  const router = useRouter()
  const [available, setAvailable] = useState(false)
  const [rides, setRides] = useState<Ride[]>([])
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(0) // seconds ago
  const [checking, setChecking] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)

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
    const cachedAuth = getCache('/api/auth/me')
    const cachedStats = getCache('/api/drivers/stats')
    if (cachedAuth && cachedStats) {
      if (cachedAuth.role !== 'DRIVER') {
        router.replace('/dashboard')
        return
      }
      setAvailable(cachedAuth.driverProfile?.isAvailable ?? false)
      setStats(cachedStats)
      setChecking(false)
    }

    getApi(getToken)
      .then((api) => Promise.all([
        api.get('/api/auth/me'),
        api.get('/api/drivers/stats')
      ]))
      .then(([authRes, statsRes]) => {
        if (!authRes.data) {
          router.replace('/onboarding')
          return
        }
        if (authRes.data.role !== 'DRIVER') {
          router.replace('/dashboard')
          return
        }
        
        setCache('/api/auth/me', authRes.data)
        setCache('/api/drivers/stats', statsRes.data)
        setAvailable(authRes.data.driverProfile?.isAvailable ?? false)
        setStats(statsRes.data)
        setChecking(false)
      })
      .catch(() => setChecking(false))
  }, [getToken])

  useEffect(() => {
    if (checking) return
    fetchOpenRides()
    const pollInterval = setInterval(fetchOpenRides, 10000)
    return () => clearInterval(pollInterval)
  }, [fetchOpenRides, checking])

  // "last updated" counter
  useEffect(() => {
    if (!available) return
    const tick = setInterval(() => setLastUpdated((s) => s + 1), 1000)
    return () => clearInterval(tick)
  }, [available])

  if (checking) return <LoadingScreen />

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 px-4 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-1">Driver Dashboard</h1>
          <p className="text-muted-foreground text-sm mb-8">Manage your availability and track your earnings</p>

          {error && <div className="mb-4"><ErrorMessage message={error} /></div>}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Today's Overview */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card p-6 rounded-2xl border border-border shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-500/10 text-green-500 rounded-xl flex items-center justify-center">
                  <Calendar size={20} />
                </div>
                <h3 className="font-bold text-foreground">Today&apos;s Overview</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 divide-x divide-border">
                <div className="pr-2">
                  <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Income</p>
                  <p className="text-2xl font-black text-foreground">₹{stats?.todayIncome || 0}</p>
                </div>
                <div className="pl-4">
                  <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Rides</p>
                  <p className="text-2xl font-black text-foreground">{stats?.todayRides || 0}</p>
                </div>
              </div>
            </motion.div>

            {/* Lifetime Overview */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card p-6 rounded-2xl border border-border shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center">
                  <TrendingUp size={20} />
                </div>
                <h3 className="font-bold text-foreground">Lifetime Summary</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 divide-x divide-border">
                <div className="pr-2">
                  <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Total Income</p>
                  <p className="text-2xl font-black text-foreground">₹{stats?.totalIncome || 0}</p>
                </div>
                <div className="pl-4">
                  <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Total Rides</p>
                  <p className="text-2xl font-black text-foreground">{stats?.totalRides || 0}</p>
                </div>
              </div>
            </motion.div>

            {/* Performance Card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card p-6 rounded-2xl border border-border shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-yellow-500/10 text-yellow-500 rounded-xl flex items-center justify-center">
                  <Star size={20} />
                </div>
                <h3 className="font-bold text-foreground">Performance</h3>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Rating</p>
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-black text-foreground">{stats?.rating.toFixed(1) || '5.0'}</p>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        fill={i < Math.round(stats?.rating || 5) ? "#f59e0b" : "transparent"}
                        className={i < Math.round(stats?.rating || 5) ? "text-yellow-500" : "text-gray-200"}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            {/* Status panel */}
            <div className="md:col-span-2 bg-card rounded-2xl border border-border shadow-sm p-6">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-6">Status</h2>
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
                      <p className="text-xl font-bold text-foreground">You&apos;re Online</p>
                      <p className="text-muted-foreground text-sm mt-1">Accepting ride requests</p>
                    </>
                  ) : (
                    <>
                      <span className="relative flex h-10 w-10 mb-4">
                        <span className="relative inline-flex rounded-full h-10 w-10 bg-muted" />
                      </span>
                      <p className="text-xl font-bold text-foreground">You&apos;re Offline</p>
                      <p className="text-muted-foreground text-sm mt-1">Go online to start accepting rides</p>
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
            <div className="md:col-span-3 bg-card rounded-2xl border border-border shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Open Ride Requests</h2>
                {available && <span className="text-xs text-muted-foreground">Updated {lastUpdated}s ago</span>}
              </div>

              {!available ? (
                <div className="flex flex-col items-center justify-center py-12 text-center opacity-40 select-none">
                  <div className="w-10 h-10 rounded-full bg-gray-200 mb-3" />
                  <p className="text-sm text-gray-500 font-medium">Go online to see ride requests</p>
                </div>
              ) : rides.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-10 h-10 rounded-full bg-muted mb-3 flex items-center justify-center">
                    <span className="text-muted-foreground text-lg">🚗</span>
                  </div>
                  <p className="text-sm text-muted-foreground">No open rides right now</p>
                  <p className="text-xs text-muted-foreground mt-1">Check back in a moment</p>
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
                        <p className="font-semibold text-foreground text-sm truncate">{ride.pickupAddress}</p>
                        <p className="text-muted-foreground text-xs truncate">→ {ride.dropoffAddress}</p>
                        <p className="text-muted-foreground text-xs mt-1">{ride.customer?.name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-green-600 text-sm">₹{ride.fareEstimate}</p>
                        <motion.button
                          onClick={() => router.push(`/driver/rides/${ride.id}`)}
                          whileTap={{ scale: 0.95 }}
                          className="mt-2 bg-foreground text-background px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-colors"
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

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
            {/* Income Trend */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card p-6 rounded-3xl border border-border shadow-sm"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500/10 text-green-500 rounded-lg flex items-center justify-center">
                    <Wallet size={16} />
                  </div>
                  <h3 className="font-bold text-foreground">Income Trend</h3>
                </div>
                <span className="text-[10px] font-bold text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Last 7 Days</span>
              </div>
              <div className="h-[240px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.dailyStats || []}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                      tickFormatter={(v) => `₹${v}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px', color: 'var(--foreground)' }}
                      itemStyle={{ fontWeight: 'bold' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="income" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorIncome)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Rides Trend */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card p-6 rounded-3xl border border-border shadow-sm"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center">
                    <BarChart3 size={16} />
                  </div>
                  <h3 className="font-bold text-foreground">Rides Taken</h3>
                </div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Last 7 Days</span>
              </div>
              <div className="h-[240px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats?.dailyStats || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px', color: 'var(--foreground)' }}
                      itemStyle={{ fontWeight: 'bold' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="rides" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* Feedback Section */}
          <div className="mt-12">
            <div className="flex items-center gap-2 mb-6">
              <MessageSquare size={20} className="text-muted-foreground" />
              <h2 className="text-lg font-bold text-foreground">Customer Feedback</h2>
              <div className="ml-auto flex items-center gap-1 bg-yellow-500/10 text-yellow-600 px-3 py-1 rounded-full text-sm font-bold border border-yellow-500/20">
                <Star size={14} fill="currentColor" />
                {stats?.rating.toFixed(1)}
              </div>
            </div>

            {stats?.feedback.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border shadow-sm p-12 text-center">
                <p className="text-muted-foreground text-sm">No feedback received yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats?.feedback.map((f, i) => (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-card p-6 rounded-2xl border border-border shadow-sm"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold ring-2 ring-background overflow-hidden">
                        {f.customerAvatar ? (
                          <img src={f.customerAvatar} alt={f.customerName} className="w-full h-full object-cover" />
                        ) : (
                          f.customerName.charAt(0)
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm">{f.customerName}</p>
                        <div className="flex gap-0.5 mt-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={10}
                              fill={i < f.score ? "#f59e0b" : "transparent"}
                              className={i < f.score ? "text-yellow-500" : "text-gray-200"}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    {f.comment && (
                      <p className="text-muted-foreground text-sm leading-relaxed italic">&quot;{f.comment}&quot;</p>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}