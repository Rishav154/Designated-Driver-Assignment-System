'use client'
import { useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { io } from 'socket.io-client'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Phone, Check, Navigation, Flag } from 'lucide-react'
import Navbar from '@/components/Navbar'
import StatusBadge from '@/components/StatusBadge'
import ErrorMessage from '@/components/ErrorMessage'
import MapplsMap from '@/components/MapplsMap'
import { getApi } from '@/lib/api'

interface RideData {
  id: string
  status: string
  pickupAddress: string
  dropoffAddress: string
  pickupLat: number
  pickupLng: number
  dropoffLat: number
  dropoffLng: number
  fareEstimate: number
  customer: { name: string; phone: string }
  driver?: { id: string; name: string }
}

const buttonConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  SEARCHING: {
    label: 'Accept Ride',
    icon: <Check size={18} />,
    className: 'bg-green-600 hover:bg-green-700 text-white',
  },
  DRIVER_ASSIGNED: {
    label: 'Start Ride',
    icon: <Navigation size={18} />,
    className: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  IN_PROGRESS: {
    label: 'Complete Ride',
    icon: <Flag size={18} />,
    className: 'bg-black hover:bg-gray-900 text-white',
  },
  COMPLETED: {
    label: 'Ride Completed',
    icon: <Check size={18} />,
    className: 'bg-gray-200 text-gray-400 cursor-not-allowed',
  },
}

export default function DriverRidePage() {
  const { id } = useParams<{ id: string }>()
  const rideId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : ''
  const { getToken } = useAuth()
  const router = useRouter()
  const [ride, setRide] = useState<RideData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!rideId) return
    getApi(getToken)
      .then((api) => api.get(`/api/rides/${rideId}`))
      .then((res) => setRide(res.data))
      .catch(() => setError('Failed to load ride details.'))
  }, [rideId])

  // Send live location only when IN_PROGRESS
  useEffect(() => {
    if (!ride || ride.status !== 'IN_PROGRESS' || !rideId) return
    const socket = io(process.env.NEXT_PUBLIC_API_URL!)
    socket.emit('join:ride', rideId)
    
    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        socket.emit('driver:location', {
          rideId,
          lat: coords.latitude,
          lng: coords.longitude,
        })
      },
      (err) => console.error('Error watching position', err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
      socket.disconnect()
    }
  }, [ride?.status, rideId])

  async function handleAction() {
    if (!ride || ride.status === 'COMPLETED') return
    setLoading(true)
    setError('')
    try {
      const api = await getApi(getToken)
      if (ride.status === 'SEARCHING') {
        await api.post(`/api/rides/${rideId}/accept`)
        setRide((r) => r ? { ...r, status: 'DRIVER_ASSIGNED' } : r)
      } else if (ride.status === 'DRIVER_ASSIGNED') {
        await api.post(`/api/rides/${rideId}/start`)
        setRide((r) => r ? { ...r, status: 'IN_PROGRESS' } : r)
      } else if (ride.status === 'IN_PROGRESS') {
        await api.post(`/api/rides/${rideId}/complete`)
        setRide((r) => r ? { ...r, status: 'COMPLETED' } : r)
        router.push('/driver/dashboard')
      }
    } catch {
      setError('Action failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!ride) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    )
  }

  const btn = buttonConfig[ride.status] ?? buttonConfig.COMPLETED
  const initials = ride.customer?.name?.charAt(0)?.toUpperCase() || 'C'

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-24 pb-12 px-4 max-w-2xl mx-auto space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.push('/driver/dashboard')}
              className="flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-black">Ride Details</h1>
                <StatusBadge status={ride.status} />
              </div>
            </div>
          </div>

          {error && <div className="mb-4"><ErrorMessage message={error} /></div>}

          {/* Map Section */}
          <div className="mb-6 h-64 w-full relative">
            <MapplsMap
              center={{ lat: ride.pickupLat, lng: ride.pickupLng }}
              markers={[
                { lat: ride.pickupLat, lng: ride.pickupLng, label: 'A' },
                { lat: ride.dropoffLat, lng: ride.dropoffLng, label: 'B' }
              ]}
              className="h-full w-full"
            />
            {ride.status === 'IN_PROGRESS' && (
              <div className="absolute top-4 left-4 right-4 bg-white/90 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.1)] rounded-full px-4 py-2 flex items-center justify-center gap-2 border border-blue-100 z-10 transition-all">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
                </span>
                <span className="text-sm font-semibold text-blue-900">Sharing your location...</span>
              </div>
            )}
          </div>

          {/* Customer card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Customer</p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-white font-bold text-xl shrink-0">
                {initials}
              </div>
              <div>
                <p className="font-bold text-black">{ride.customer?.name}</p>
                <a
                  href={`tel:${ride.customer?.phone}`}
                  className="flex items-center gap-1 text-gray-500 text-sm hover:text-black transition-colors mt-0.5"
                >
                  <Phone size={12} />
                  {ride.customer?.phone}
                </a>
              </div>
            </div>
          </div>

          {/* Route card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Route</p>
            <div className="flex flex-col gap-0">
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 mt-1 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Pickup</p>
                  <p className="text-sm font-semibold text-black">{ride.pickupAddress}</p>
                </div>
              </div>
              <div className="ml-[5px] h-8 w-px border-l-2 border-dashed border-gray-200" />
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500 mt-1 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Dropoff</p>
                  <p className="text-sm font-semibold text-black">{ride.dropoffAddress}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Fare card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Fare</p>
            <p className="text-5xl font-black text-black">₹{ride.fareEstimate}</p>
          </div>

          {/* Action button with AnimatePresence */}
          <AnimatePresence mode="wait">
            <motion.button
              key={ride.status}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={ride.status !== 'COMPLETED' ? handleAction : undefined}
              disabled={loading || ride.status === 'COMPLETED'}
              whileTap={ride.status !== 'COMPLETED' ? { scale: 0.97 } : {}}
              className={`w-full rounded-xl py-4 font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 ${btn.className} disabled:opacity-60`}
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {btn.icon}
                  {btn.label}
                </>
              )}
            </motion.button>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}