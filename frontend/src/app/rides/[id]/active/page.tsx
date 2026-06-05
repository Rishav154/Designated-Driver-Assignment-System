'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { motion } from 'framer-motion'
import { Phone } from 'lucide-react'
import { io } from 'socket.io-client'
import Navbar from '@/components/Navbar'
import dynamic from 'next/dynamic'
const OSMMap = dynamic(() => import('@/components/OSMMap'), { ssr: false })
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
  driver: { 
    name: string; 
    phone: string; 
    driverProfile?: { 
      comfortableVehicles: string; 
      age: number; 
      gender: string 
    } 
  }
}

interface Location { lat: number; lng: number }

export default function ActiveRidePage() {
  const { id } = useParams<{ id: string }>()
  const rideId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : ''
  const { getToken } = useAuth()
  const router = useRouter()
  const [ride, setRide] = useState<RideData | null>(null)
  const [location, setLocation] = useState<Location | null>(null)
  const [locationTime, setLocationTime] = useState<string>('')

  useEffect(() => {
    if (!rideId) return
    getApi(getToken).then((api) => api.get(`/api/rides/${rideId}`)).then((res) => setRide(res.data))
  }, [rideId])

  useEffect(() => {
    if (!rideId) return
    const socket = io(process.env.NEXT_PUBLIC_API_URL!)
    socket.emit('join:ride', rideId)
    socket.on('location:update', ({ lat, lng }: Location) => {
      setLocation({ lat, lng })
      setLocationTime(new Date().toLocaleTimeString())
    })
    socket.on('status:update', ({ status }: { status: string }) => {
      if (status === 'COMPLETED') router.push(`/rides/${rideId}/complete`)
    })
    return () => { socket.disconnect() }
  }, [rideId, router])

  if (!ride) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    )
  }

  const initials = ride.driver?.name?.charAt(0)?.toUpperCase() || 'D'

  return (
     <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 px-4 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
           <h1 className="text-3xl font-bold text-foreground tracking-tight mb-1">Your Ride</h1>
          <p className="text-muted-foreground text-sm mb-8">Your driver is on the way</p>

          {/* Map Section */}
          <div className="mb-6 h-72 w-full">
            <OSMMap
              center={{ lat: ride.pickupLat, lng: ride.pickupLng }}
              markers={[
                { lat: ride.pickupLat, lng: ride.pickupLng, label: 'A' },
                { lat: ride.dropoffLat, lng: ride.dropoffLng, label: 'B' },
                ...(location ? [{ lat: location.lat, lng: location.lng, label: 'D' }] : [])
              ]}
              className="h-full w-full"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Driver card */}
             <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-foreground flex items-center justify-center text-background font-bold text-xl">
                  {initials}
                </div>
                <div>
                  <p className="font-bold text-foreground">{ride.driver?.name}</p>
                   <a href={`tel:${ride.driver?.phone}`} className="flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground transition-colors">
                    <Phone size={12} />{ride.driver?.phone}
                  </a>
                </div>
              </div>
               {ride.driver?.driverProfile && (
                <div className="text-muted-foreground text-xs space-y-1 mt-2 border-t border-border pt-2">
                  <p>Comfortable with: <span className="font-semibold text-foreground">{ride.driver.driverProfile.comfortableVehicles}</span></p>
                  <p>Age: <span className="font-semibold text-foreground">{ride.driver.driverProfile.age}</span> · Gender: <span className="font-semibold text-foreground">{ride.driver.driverProfile.gender}</span></p>
                </div>
              )}
            </div>

            {/* Route card */}
             <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Route</h3>
              <div className="flex flex-col gap-0">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500 mt-1 shrink-0" />
                   <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Pickup</p>
                    <p className="text-sm font-semibold text-foreground">{ride.pickupAddress}</p>
                  </div>
                </div>
                <div className="ml-[5px] h-8 w-px border-l-2 border-dashed border-border" />
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500 mt-1 shrink-0" />
                   <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Dropoff</p>
                    <p className="text-sm font-semibold text-foreground">{ride.dropoffAddress}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Location card */}
             <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                </span>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Live Location</p>
              </div>
              {location ? (
                 <>
                  <p className="font-mono text-sm text-foreground font-semibold mb-1">
                    {location.lat.toFixed(6)}
                  </p>
                  <p className="font-mono text-sm text-foreground font-semibold mb-2">
                    {location.lng.toFixed(6)}
                  </p>
                  <p className="text-xs text-muted-foreground">Updated at {locationTime}</p>
                </>
              ) : (
                 <p className="text-sm text-muted-foreground">Waiting for location update...</p>
              )}
            </div>
          </div>

          {/* Fare card */}
           <div className="bg-card rounded-2xl border border-border shadow-sm p-6 text-center">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Estimated Fare</p>
            <p className="text-5xl font-black text-foreground">₹{ride.fareEstimate}</p>
            <p className="text-muted-foreground text-sm mt-2">Final fare confirmed on completion</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}