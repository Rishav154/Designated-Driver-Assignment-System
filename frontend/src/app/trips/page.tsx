'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Clock, MapPin, Flag, ChevronRight, Car, User } from 'lucide-react'
import Navbar from '@/components/Navbar'
import LoadingScreen from '@/components/LoadingScreen'
import StatusBadge from '@/components/StatusBadge'
import { getApi } from '@/lib/api'
import { toast } from '@/components/Toast'
import { useCache } from '@/context/CacheContext'

interface Trip {
  id: string
  pickupAddress: string
  dropoffAddress: string
  fareEstimate: number
  fareFinal: number | null
  status: string
  createdAt: string
  completedAt: string | null
  durationSeconds: number | null
  driver: { id: string; name: string } | null
  customer: { id: string; name: string }
}

interface HistoryResponse {
  rides: Trip[]
  total: number
  page: number
  pages: number
}

function formatDate(dt: string) {
  return new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function TripsPage() {
  const { getToken } = useAuth()
  const router = useRouter()
  const { setCache, getCache } = useCache()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<HistoryResponse | null>(null)
  const [page, setPage] = useState(1)
  const [role, setRole] = useState<'CUSTOMER' | 'DRIVER' | null>(null)

  const fetchHistory = async (p: number) => {
    const cacheKey = `/api/rides/history?page=${p}`
    const cached = getCache(cacheKey)
    if (cached) {
      setData(cached)
    } else {
      setLoading(true)
    }

    try {
      const api = await getApi(getToken)
      const promises: [Promise<any>, Promise<any>?] = [
        api.get(`/api/rides/history?page=${p}&limit=10`)
      ]
      if (!role) {
        promises.push(api.get('/api/auth/me'))
      }

      const [historyRes, authRes] = await Promise.all(promises)
      
      setData(historyRes.data)
      setCache(cacheKey, historyRes.data)
      
      if (authRes) {
        setRole(authRes.data?.role)
        setCache('/api/auth/me', authRes.data)
      }
      
      setPage(p)
    } catch {
      toast('Failed to load trip history', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    const cacheKey = `/api/rides/history?page=1`
    const cached = getCache(cacheKey)
    const cachedAuth = getCache('/api/auth/me')
    if (cached) {
      setData(cached)
      setLoading(false)
    }
    if (cachedAuth) {
      setRole(cachedAuth.role)
    }

    fetchHistory(1) 
  }, [])

  if (loading && !data) return <LoadingScreen />

  const trips = data?.rides ?? []

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-1">Trip History</h1>
          <p className="text-muted-foreground text-sm mb-8">
            {data?.total ?? 0} trip{data?.total !== 1 ? 's' : ''} total
          </p>

          {trips.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border shadow-sm p-12 text-center">
              <Car size={44} className="mx-auto mb-4 text-muted" />
              <p className="text-muted-foreground font-medium">No trips yet</p>
              <p className="text-muted-foreground/60 text-sm mt-1">Your completed rides will show up here</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="mt-6 inline-flex items-center gap-2 bg-foreground text-background px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Book Your First Ride
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {trips.map((trip, i) => (
                <motion.div
                  key={trip.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => router.push(`/trips/${trip.id}`)}
                  className="bg-card rounded-2xl border border-border shadow-sm p-5 cursor-pointer hover:border-foreground/20 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-3">
                        <StatusBadge status={trip.status} />
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock size={12} />
                          {formatDate(trip.createdAt)}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-start gap-2.5">
                          <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                          <p className="text-sm text-foreground truncate">{trip.pickupAddress}</p>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                          <p className="text-sm text-foreground truncate">{trip.dropoffAddress}</p>
                        </div>
                      </div>

                      {role === 'DRIVER' ? (
                        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                          <User size={12} /> {trip.customer?.name}
                        </p>
                      ) : trip.driver && (
                        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                          <Car size={12} /> {trip.driver.name}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-2xl font-black text-foreground">
                        ₹{trip.fareFinal ?? trip.fareEstimate}
                      </p>
                      {trip.durationSeconds && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          ~{Math.round(trip.durationSeconds / 60)} min
                        </p>
                      )}
                      <ChevronRight size={16} className="ml-auto mt-2 text-muted group-hover:text-foreground transition-colors" />
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Pagination */}
              {data && data.pages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-4">
                  <button
                    onClick={() => fetchHistory(page - 1)}
                    disabled={page <= 1 || loading}
                    className="px-4 py-2 border border-border rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-muted transition-colors"
                  >
                    ← Previous
                  </button>
                  <span className="text-sm text-muted-foreground">Page {page} of {data.pages}</span>
                  <button
                    onClick={() => fetchHistory(page + 1)}
                    disabled={page >= data.pages || loading}
                    className="px-4 py-2 border border-border rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-muted transition-colors"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
