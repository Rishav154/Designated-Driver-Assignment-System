'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle } from 'lucide-react'
import { io } from 'socket.io-client'
import { getApi } from '@/lib/api'

interface DriverInfo {
  name: string
  phone: string
}

export default function WaitingPage() {
  const { id } = useParams<{ id: string }>()
  const { getToken } = useAuth()
  const router = useRouter()
  const [driver, setDriver] = useState<DriverInfo | null>(null)
  const [rideId, setRideId] = useState<string>('')

  useEffect(() => {
    setRideId(typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '')
  }, [id])

  useEffect(() => {
    if (!rideId) return
    const socket = io(process.env.NEXT_PUBLIC_API_URL!)
    socket.emit('join:ride', rideId)
    socket.on('status:update', ({ status, driver: d }: { status: string; driver?: DriverInfo }) => {
      if (status === 'DRIVER_ASSIGNED' && d) {
        setDriver(d)
        setTimeout(() => router.push(`/rides/${rideId}/active`), 2000)
      }
    })
    return () => { socket.disconnect() }
  }, [rideId, router])

  // Also poll the ride status in case socket event was missed
  useEffect(() => {
    if (!rideId) return
    const interval = setInterval(async () => {
      try {
        const api = await getApi(getToken)
        const res = await api.get(`/api/rides/${rideId}`)
        if (res.data.status === 'DRIVER_ASSIGNED' && res.data.driver) {
          setDriver(res.data.driver)
          clearInterval(interval)
          setTimeout(() => router.push(`/rides/${rideId}/active`), 2000)
        }
      } catch {}
    }, 5000)
    return () => clearInterval(interval)
  }, [rideId, getToken, router])

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <AnimatePresence mode="wait">
        {!driver ? (
          <motion.div
            key="searching"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            {/* Spinning ring */}
            <div className="w-20 h-20 border-4 border-muted border-t-foreground rounded-full animate-spin mx-auto mb-8" />

            <h1 className="text-2xl font-bold text-foreground mb-2">Finding your driver</h1>
             <div className="flex items-center justify-center gap-1 mb-3">
              <p className="text-muted-foreground text-sm">Looking</p>
              <span className="dot-pulse flex items-center">
                <span /><span /><span />
              </span>
            </div>
            <p className="text-muted-foreground/60 text-sm max-w-xs mx-auto mb-10">
              Sit tight — we&apos;re matching you with a nearby driver
            </p>
            <p className="font-mono text-xs text-muted">Ride ID: {rideId}</p>
          </motion.div>
        ) : (
          <motion.div
            key="found"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
              className="mb-6 flex justify-center"
            >
               <CheckCircle className="text-green-500" size={72} strokeWidth={1.5} />
            </motion.div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Driver Found!</h1>
            <p className="text-2xl font-semibold text-foreground mb-1">{driver.name}</p>
            <p className="text-muted-foreground mb-6">{driver.phone}</p>
            <p className="text-muted-foreground/60 text-sm italic">Heading to your ride details...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}