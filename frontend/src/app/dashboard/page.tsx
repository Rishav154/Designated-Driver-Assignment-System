'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Flag, Home, Briefcase, Star } from 'lucide-react'
import Navbar from '@/components/Navbar'
import ErrorMessage from '@/components/ErrorMessage'
import LoadingScreen from '@/components/LoadingScreen'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import dynamic from 'next/dynamic'
const OSMMap = dynamic(() => import('@/components/OSMMap'), { ssr: false })
import { getApi } from '@/lib/api'
import { useCache } from '@/context/CacheContext'

interface LocationFields {
  address: string
  lat: string
  lng: string
}

interface SavedLocation {
  id: string
  label: string
  address: string
  lat: number
  lng: number
}

const locationIcon = (label: string) => {
  if (label === 'Home') return <Home size={12} />
  if (label === 'Work') return <Briefcase size={12} />
  return <Star size={12} />
}

export default function DashboardPage() {
  const { getToken } = useAuth()
  const router = useRouter()
  const { setCache, getCache } = useCache()
  const [checking, setChecking] = useState(true)
  const [pickup, setPickup] = useState<LocationFields>({ address: '', lat: '', lng: '' })
  const [dropoff, setDropoff] = useState<LocationFields>({ address: '', lat: '', lng: '' })
  const [fare, setFare] = useState<{ distance: number; fare: number; durationSeconds?: number } | null>(null)
  const [estimating, setEstimating] = useState(false)
  const [locating, setLocating] = useState(false)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([])

  useEffect(() => {
    const cachedAuth = getCache('/api/auth/me')
    if (cachedAuth) {
      if (cachedAuth.role === 'DRIVER') router.replace('/driver/dashboard')
      else setChecking(false)
    }

    getApi(getToken)
      .then((api) => api.get('/api/auth/me'))
      .then((res) => {
        setCache('/api/auth/me', res.data)
        if (!res.data) router.replace('/onboarding')
        else if (res.data.role === 'DRIVER') router.replace('/driver/dashboard')
        else setChecking(false)
      })
      .catch(() => setChecking(false))
  }, [])

  // fetch saved locations for quick-select
  useEffect(() => {
    const cachedLocs = getCache('/api/locations')
    if (cachedLocs) {
      setSavedLocations(cachedLocs)
    }

    getApi(getToken)
      .then(api => api.get('/api/locations'))
      .then(res => {
        setSavedLocations(res.data ?? [])
        setCache('/api/locations', res.data ?? [])
      })
      .catch(() => { })
  }, [])

  async function estimateFare() {
    setError('')
    setFare(null)
    setEstimating(true)
    try {
      const api = await getApi(getToken)
      const res = await api.post('/api/rides/estimate', {
        pickupLat: parseFloat(pickup.lat),
        pickupLng: parseFloat(pickup.lng),
        dropoffLat: parseFloat(dropoff.lat),
        dropoffLng: parseFloat(dropoff.lng),
      })
      setFare(res.data)
    } catch {
      setError('Failed to estimate fare. Check your coordinates and try again.')
    } finally {
      setEstimating(false)
    }
  }

  const handleUseCurrentLocation = async () => {
    setLocating(true)
    setError('')

    const ipFallback = async () => {
      try {
        const api = await getApi(getToken)
        const res = await api.get('/api/maps/my-location')
        setPickup({
          address: res.data.address,
          lat: res.data.lat.toString(),
          lng: res.data.lng.toString(),
        })
      } catch (err: any) {
        console.error('Location detection failed:', err)
        setError('Could not determine your location automatically. Please enter it manually.')
      } finally {
        setLocating(false)
      }
    }

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude.toString()
          const lng = position.coords.longitude.toString()
          try {
            const api = await getApi(getToken)
            const res = await api.get(`/api/maps/reverse-geocode?lat=${lat}&lng=${lng}`)
            setPickup({
              address: res.data?.address || `${lat}, ${lng}`,
              lat,
              lng,
            })
          } catch (err) {
            setPickup({ address: `${lat}, ${lng}`, lat, lng })
          } finally {
            setLocating(false)
          }
        },
        () => ipFallback(),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    } else {
      await ipFallback()
    }
  }

  async function bookRide() {
    if (!fare) return
    setError('')
    setBooking(true)
    try {
      const api = await getApi(getToken)
      const res = await api.post('/api/rides/book', {
        pickupAddress: pickup.address,
        pickupLat: parseFloat(pickup.lat),
        pickupLng: parseFloat(pickup.lng),
        dropoffAddress: dropoff.address,
        dropoffLat: parseFloat(dropoff.lat),
        dropoffLng: parseFloat(dropoff.lng),
        fareEstimate: fare.fare,
      })
      router.push(`/rides/${res.data.id}/waiting`)
    } catch {
      setError('Failed to book ride. Please try again.')
    } finally {
      setBooking(false)
    }
  }

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
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-1">Book a Ride</h1>
          <p className="text-muted-foreground text-sm mb-8">Enter your pickup and dropoff locations to get started</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Pickup card */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="text-green-500" size={20} />
                <h2 className="font-semibold text-foreground">Pickup Location</h2>
              </div>
              <div className="flex flex-col gap-3">
                <div className="min-h-[120px] flex flex-col gap-3">
                  <AddressAutocomplete
                    placeholder="Search pickup location"
                    value={pickup.address}
                    onSelect={(address, lat, lng) => setPickup({ address, lat, lng })}
                  />
                  {/* Saved location chips for pickup */}
                  {savedLocations.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {savedLocations.map(loc => (
                        <button
                          key={loc.id}
                          onClick={() => setPickup({ address: loc.address, lat: loc.lat.toString(), lng: loc.lng.toString() })}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${pickup.address === loc.address
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-muted text-muted-foreground border-border hover:border-foreground/50'
                            }`}
                        >
                          {locationIcon(loc.label)}
                          {loc.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={handleUseCurrentLocation}
                    disabled={locating}
                    className="flex items-center gap-2 text-sm text-green-600 font-medium hover:text-green-700 disabled:opacity-50 mt-1"
                  >
                    {locating ? <span className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" /> : <span>📍 Use my current location</span>}
                  </button>
                </div>
                <OSMMap
                  center={
                    pickup.lat && pickup.lng
                      ? { lat: parseFloat(pickup.lat), lng: parseFloat(pickup.lng) }
                      : { lat: 28.6139, lng: 77.2090 }
                  }
                  zoom={13}
                  markers={[
                    ...(pickup.lat && pickup.lng ? [{ lat: parseFloat(pickup.lat), lng: parseFloat(pickup.lng), label: 'A', draggable: true }] : []),
                    ...(dropoff.lat && dropoff.lng ? [{ lat: parseFloat(dropoff.lat), lng: parseFloat(dropoff.lng), label: 'B' }] : [])
                  ]}
                  onMapClick={async (lat, lng) => {
                    setPickup({ ...pickup, lat: lat.toString(), lng: lng.toString() })
                    try {
                      const api = await getApi(getToken)
                      const res = await api.get(`/api/maps/reverse-geocode?lat=${lat}&lng=${lng}`)
                      setPickup({ address: res.data?.address || `${lat}, ${lng}`, lat: lat.toString(), lng: lng.toString() })
                    } catch {
                      setPickup({ address: `${lat}, ${lng}`, lat: lat.toString(), lng: lng.toString() })
                    }
                  }}
                  onMarkerDrag={async (lat, lng) => {
                    setPickup({ ...pickup, lat: lat.toString(), lng: lng.toString() })
                    try {
                      const api = await getApi(getToken)
                      const res = await api.get(`/api/maps/reverse-geocode?lat=${lat}&lng=${lng}`)
                      setPickup({ address: res.data?.address || `${lat}, ${lng}`, lat: lat.toString(), lng: lng.toString() })
                    } catch {
                      setPickup({ address: `${lat}, ${lng}`, lat: lat.toString(), lng: lng.toString() })
                    }
                  }}
                  className="h-64 w-full rounded-xl mt-2"
                />
                <p className="text-xs text-muted-foreground text-center">🗺 Tap on the map or drag the pin to set your pickup location</p>
              </div>
            </div>

            {/* Dropoff card */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Flag className="text-red-500" size={20} />
                <h2 className="font-semibold text-foreground">Dropoff Location</h2>
              </div>
              <div className="flex flex-col gap-3">
                <div className="min-h-[120px] flex flex-col gap-3">
                  <AddressAutocomplete
                    placeholder="Search dropoff location"
                    value={dropoff.address}
                    onSelect={(address, lat, lng) => setDropoff({ address, lat, lng })}
                  />
                  {/* Saved location chips for dropoff */}
                  {savedLocations.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {savedLocations.map(loc => (
                        <button
                          key={loc.id}
                          onClick={() => setDropoff({ address: loc.address, lat: loc.lat.toString(), lng: loc.lng.toString() })}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${dropoff.address === loc.address
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-muted text-muted-foreground border-border hover:border-foreground/50'
                            }`}
                        >
                          {locationIcon(loc.label)}
                          {loc.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <OSMMap
                  center={
                    dropoff.lat && dropoff.lng
                      ? { lat: parseFloat(dropoff.lat), lng: parseFloat(dropoff.lng) }
                      : { lat: 28.6139, lng: 77.2090 }
                  }
                  zoom={13}
                  markers={[
                    ...(pickup.lat && pickup.lng ? [{ lat: parseFloat(pickup.lat), lng: parseFloat(pickup.lng), label: 'A' }] : []),
                    ...(dropoff.lat && dropoff.lng ? [{ lat: parseFloat(dropoff.lat), lng: parseFloat(dropoff.lng), label: 'B', draggable: true }] : [])
                  ]}
                  onMapClick={async (lat, lng) => {
                    setDropoff({ ...dropoff, lat: lat.toString(), lng: lng.toString() })
                    try {
                      const api = await getApi(getToken)
                      const res = await api.get(`/api/maps/reverse-geocode?lat=${lat}&lng=${lng}`)
                      setDropoff({ address: res.data?.address || `${lat}, ${lng}`, lat: lat.toString(), lng: lng.toString() })
                    } catch {
                      setDropoff({ address: `${lat}, ${lng}`, lat: lat.toString(), lng: lng.toString() })
                    }
                  }}
                  onMarkerDrag={async (lat, lng) => {
                    setDropoff({ ...dropoff, lat: lat.toString(), lng: lng.toString() })
                    try {
                      const api = await getApi(getToken)
                      const res = await api.get(`/api/maps/reverse-geocode?lat=${lat}&lng=${lng}`)
                      setDropoff({ address: res.data?.address || `${lat}, ${lng}`, lat: lat.toString(), lng: lng.toString() })
                    } catch {
                      setDropoff({ address: `${lat}, ${lng}`, lat: lat.toString(), lng: lng.toString() })
                    }
                  }}
                  className="h-64 w-full rounded-xl mt-2"
                />
                <p className="text-xs text-muted-foreground text-center">🗺 Tap on the map or drag the pin to set your dropoff location</p>
              </div>
            </div>
          </div>

          {/* Estimate button */}
          <motion.button
            onClick={estimateFare}
            disabled={estimating || !pickup.lat || !pickup.lng || !dropoff.lat || !dropoff.lng}
            whileTap={{ scale: 0.97 }}
            className="w-full border-2 border-foreground text-foreground rounded-xl py-3.5 font-semibold hover:bg-muted active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
          >
            {estimating ? (
              <span className="w-5 h-5 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
            ) : 'Estimate Fare'}
          </motion.button>

          {(!pickup.lat || !pickup.lng || !dropoff.lat || !dropoff.lng) && (
            <p className="text-center text-sm text-muted-foreground mb-6 font-medium">
              ⓘ Set pickup location using "Use my location" and dropoff using the map pin
            </p>
          )}

          {error && <ErrorMessage message={error} />}

          {/* Fare result */}
          <AnimatePresence>
            {fare && (
              <motion.div
                key="fare"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="bg-card rounded-2xl border border-border shadow-sm p-6 mt-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Distance</p>
                    <p className="text-2xl font-bold text-foreground">{Number(fare.distance).toFixed(2)} km</p>
                    {fare.durationSeconds && (
                      <p className="text-sm text-muted-foreground mt-1">~{Math.round(fare.durationSeconds / 60)} min drive</p>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Estimated Fare</p>
                    <p className="text-5xl font-black text-foreground">₹{fare.fare}</p>
                  </div>
                  <div className="text-right">
                    <motion.button
                      onClick={bookRide}
                      disabled={booking}
                      whileTap={{ scale: 0.97 }}
                      className="bg-black text-white rounded-xl py-3 px-6 font-semibold text-sm hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-150"
                    >
                      {booking ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : 'Book Ride'}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}