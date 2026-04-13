'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft, MapPin, Flag, Car, User, Phone, CreditCard, Star, Clock, CalendarDays
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import LoadingScreen from '@/components/LoadingScreen'
import StatusBadge from '@/components/StatusBadge'
import { getApi } from '@/lib/api'
import { toast } from '@/components/Toast'

interface TripDetail {
  id: string
  pickupAddress: string
  dropoffAddress: string
  pickupLat: number
  pickupLng: number
  dropoffLat: number
  dropoffLng: number
  fareEstimate: number
  fareFinal: number | null
  durationSeconds: number | null
  status: string
  createdAt: string
  completedAt: string | null
  customer: { id: string; name: string; phone: string | null; profilePicture: string | null }
  driver: {
    id: string; name: string; phone: string | null; profilePicture: string | null
    driverProfile: { vehicleMake: string; vehicleModel: string; vehiclePlate: string; rating: number } | null
  } | null
  payment: { id: string; amount: number; status: string } | null
  ratings: { id: string; score: number; comment: string | null; raterId: string }[]
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <div className="p-2 bg-muted/50 rounded-lg">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
        <p className="text-sm font-semibold text-foreground mt-0.5">{value}</p>
      </div>
    </div>
  )
}

export default function TripDetailPage() {
  const { getToken } = useAuth()
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [trip, setTrip] = useState<TripDetail | null>(null)

  useEffect(() => {
    getApi(getToken)
      .then(api => api.get(`/api/rides/${params.id}`))
      .then(res => setTrip(res.data))
      .catch(() => toast('Failed to load trip details', 'error'))
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) return <LoadingScreen />
   if (!trip) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground">Trip not found</p>
        <button onClick={() => router.push('/trips')} className="mt-4 text-blue-500 text-sm">Back to trips</button>
      </div>
    </div>
  )

  const myRating = trip.ratings?.[0]

  return (
     <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {/* Back button */}
           <button
            onClick={() => router.push('/trips')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm font-medium mb-6 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Trips
          </button>

          {/* Header */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={trip.status} />
                </div>
                 <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                  <CalendarDays size={12} />
                  {new Date(trip.createdAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
               <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Fare</p>
                <p className="text-3xl font-black text-foreground">₹{trip.fareFinal ?? trip.fareEstimate}</p>
                {trip.durationSeconds && (
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 justify-end">
                    <Clock size={11} /> ~{Math.round(trip.durationSeconds / 60)} min
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Route */}
           <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Route</h2>
            <div className="space-y-3">
               <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin size={14} className="text-green-500" />
                </div>
                 <div>
                  <p className="text-xs text-muted-foreground font-medium">PICKUP</p>
                  <p className="text-sm text-foreground font-medium mt-0.5">{trip.pickupAddress}</p>
                </div>
              </div>
              <div className="ml-4 border-l-2 border-dashed border-border h-4" />
               <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Flag size={14} className="text-red-500" />
                </div>
                 <div>
                  <p className="text-xs text-muted-foreground font-medium">DROPOFF</p>
                  <p className="text-sm text-foreground font-medium mt-0.5">{trip.dropoffAddress}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Driver info */}
          {trip.driver && (
             <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Driver</h2>
              <div className="flex items-center gap-4 mb-4">
                {trip.driver.profilePicture ? (
                  <img src={trip.driver.profilePicture} alt={trip.driver.name} className="w-12 h-12 rounded-full object-cover border-2 border-gray-100" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    <User size={20} className="text-gray-400" />
                  </div>
                )}
                 <div>
                  <p className="font-semibold text-foreground">{trip.driver.name}</p>
                  {trip.driver.phone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone size={12} /> {trip.driver.phone}
                    </p>
                  )}
                </div>
              </div>
               {trip.driver.driverProfile && (
                <div className="bg-muted/30 rounded-xl p-4 space-y-1">
                   <InfoRow
                    icon={<Car size={14} className="text-muted-foreground" />}
                    label="Vehicle"
                    value={`${trip.driver.driverProfile.vehicleMake} ${trip.driver.driverProfile.vehicleModel}`}
                  />
                   <InfoRow
                    icon={<span className="text-xs font-bold text-muted-foreground">🔢</span>}
                    label="Plate"
                    value={trip.driver.driverProfile.vehiclePlate}
                  />
                  <InfoRow
                    icon={<Star size={14} className="text-yellow-500" />}
                    label="Driver Rating"
                    value={`${trip.driver.driverProfile.rating.toFixed(1)} / 5.0`}
                  />
                </div>
              )}
            </div>
          )}

          {/* Payment */}
          {trip.payment && (
             <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Payment</h2>
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <CreditCard size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">₹{trip.payment.amount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Cash / In-app</p>
                  </div>
                </div>
                 <span className={`px-3 py-1 rounded-full text-xs font-semibold ${trip.payment.status === 'PAID' ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'}`}>
                  {trip.payment.status}
                </span>
              </div>
            </div>
          )}

          {/* Rating */}
          {myRating && (
             <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Your Rating</h2>
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map(s => (
                   <Star key={s} size={20} className={s <= myRating.score ? 'text-yellow-400 fill-yellow-400' : 'text-muted'} />
                ))}
                <span className="text-sm text-muted-foreground ml-2">{myRating.score}/5</span>
              </div>
              {myRating.comment && <p className="text-sm text-muted-foreground italic">"{myRating.comment}"</p>}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
