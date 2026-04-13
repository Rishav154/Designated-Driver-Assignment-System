'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth, useUser } from '@clerk/nextjs'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Lock, Wallet, CreditCard } from 'lucide-react'
import Navbar from '@/components/Navbar'
import StarRating from '@/components/StarRating'
import ErrorMessage from '@/components/ErrorMessage'
import { getApi } from '@/lib/api'
import Script from 'next/script'

interface RideData {
  id: string
  status: string
  pickupAddress: string
  dropoffAddress: string
  fareEstimate: number
  fareFinal?: number
  driver: { id: string; name: string }
}

export default function CompletePage() {
  const { id } = useParams<{ id: string }>()
  const rideId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : ''
  const { getToken } = useAuth()
  const { user } = useUser()
  const router = useRouter()
  const [ride, setRide] = useState<RideData | null>(null)
  const [paid, setPaid] = useState(false)
  const [paying, setPaying] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'CASH'>('ONLINE')
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [ratingDone, setRatingDone] = useState(false)
  const [error, setError] = useState('')

  // Confetti circles
  const confetti = [
    { x: -60, y: -80, color: '#f59e0b', size: 12, delay: 0 },
    { x: 80, y: -60, color: '#10b981', size: 8, delay: 0.05 },
    { x: -80, y: 20, color: '#3b82f6', size: 10, delay: 0.1 },
    { x: 60, y: 30, color: '#ec4899', size: 9, delay: 0.08 },
  ]

  useEffect(() => {
    if (!rideId) return
    getApi(getToken).then((api) => api.get(`/api/rides/${rideId}`)).then((res) => setRide(res.data))
  }, [rideId, getToken])

  const fare = ride?.fareFinal ?? ride?.fareEstimate ?? 0

  async function handlePay() {
    setError('')
    setPaying(true)
    try {
      const api = await getApi(getToken)
      
      if (paymentMethod === 'CASH') {
          await api.post(`/api/payments/${rideId}/pay`, { method: 'CASH', amount: fare })
          setPaid(true)
          setPaying(false)
          return
      }

      // ONLINE PAYMENT
      const orderRes = await api.post(`/api/payments/${rideId}/create-order`)
      const order = orderRes.data

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "SafeRide",
        description: "Ride Fare Payment",
        order_id: order.id,
        handler: async function (response: any) {
          try {
            await api.post(`/api/payments/${rideId}/pay`, {
              method: 'ONLINE',
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            })
            setPaid(true)
          } catch {
            setError('Payment verification failed. Please try again or contact support.')
          } finally {
            setPaying(false)
          }
        },
        prefill: {
          name: user?.fullName || "Customer",
          email: user?.primaryEmailAddress?.emailAddress || "",
        },
        theme: {
          color: "#16a34a"
        },
        modal: {
          backdrop_color: "#000000a6"
        }
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.on('payment.failed', function (response: any) {
        setError('Payment Failed: ' + response.error.description)
        setPaying(false)
      })
      rzp.open()

    } catch (err: any) {
      setError(err?.response?.data?.error || 'Payment setup failed. Please try again.')
      setPaying(false)
    }
  }

  async function handleRate() {
    if (!rating || !ride?.driver?.id) return
    setError('')
    setSubmitting(true)
    try {
      const api = await getApi(getToken)
      await api.post('/api/ratings', { 
        rideId, 
        rateeId: ride.driver.id, 
        score: rating, 
        comment 
      })
      setRatingDone(true)
    } catch {
      setError('Failed to submit rating. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!ride) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    )
  }

  return (
     <div className="min-h-screen bg-background">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <Navbar />
      <div className="pt-24 pb-12 px-4 max-w-2xl mx-auto space-y-4">
           <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="bg-card rounded-2xl border border-border shadow-sm p-8 text-center relative overflow-hidden"
        >
          {/* Confetti */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {confetti.map((c, i) => (
              <motion.div
                key={i}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                animate={{ x: c.x, y: c.y, opacity: [0, 1, 0], scale: [0, 1.2, 0.8] }}
                transition={{ duration: 0.8, delay: c.delay, ease: 'easeOut' }}
                style={{ backgroundColor: c.color, width: c.size, height: c.size, borderRadius: '50%', position: 'absolute' }}
              />
            ))}
          </div>

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
            className="mb-4 flex justify-center"
          >
             <CheckCircle className="text-green-500" size={64} strokeWidth={1.5} />
          </motion.div>
          <h1 className="text-3xl font-black text-foreground tracking-tight mb-2">Ride Complete!</h1>
          <p className="text-muted-foreground text-sm">From {ride.pickupAddress} to {ride.dropoffAddress}</p>
        </motion.div>

        {/* Fare card */}
         <div className="bg-card rounded-2xl border border-border shadow-sm p-6 text-center">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Total Fare</p>
          <p className="text-6xl font-black text-foreground">₹{fare}</p>
        </div>

        {/* Payment section */}
        <AnimatePresence mode="wait">
          {!paid ? (
            <motion.div
              key="payment"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="bg-card rounded-2xl border border-border shadow-sm p-6"
            >
               <div className="flex items-center gap-2 mb-4">
                <Lock size={16} className="text-muted-foreground" />
                <p className="font-semibold text-foreground text-sm">Secure Payment</p>
              </div>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('ONLINE')}
                  className={`flex flex-col items-center justify-center py-4 rounded-xl border transition-all ${
                    paymentMethod === 'ONLINE'
                      ? 'border-green-600 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-500'
                      : 'border-border bg-background hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <CreditCard size={24} className="mb-2" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Pay Online</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`flex flex-col items-center justify-center py-4 rounded-xl border transition-all ${
                    paymentMethod === 'CASH'
                      ? 'border-green-600 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-500'
                      : 'border-border bg-background hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <Wallet size={24} className="mb-2" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Pay Cash</span>
                </button>
              </div>

              {error && <div className="mb-4"><ErrorMessage message={error} /></div>}
              <motion.button
                onClick={handlePay}
                disabled={paying}
                whileTap={{ scale: 0.97 }}
                className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3.5 font-semibold text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {paying && paymentMethod === 'CASH' ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : paying && paymentMethod === 'ONLINE' ? (
                  <span>Initializing...</span>
                ) : `Pay ₹${fare}`}
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="paid"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
               className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 flex items-center gap-3"
            >
              <CheckCircle className="text-green-500 shrink-0" size={20} />
              <p className="text-green-600 dark:text-green-400 font-semibold text-sm">Payment successful — ₹{fare} paid securely</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rating section */}
        <AnimatePresence>
          {paid && !ratingDone && (
            <motion.div
              key="rating"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
                className="bg-card rounded-2xl border border-border shadow-sm p-6"
            >
              <h2 className="text-lg font-bold text-foreground mb-1">Rate your experience</h2>
              <p className="text-muted-foreground text-sm mb-5">How was {ride.driver?.name}?</p>
              {error && <div className="mb-4"><ErrorMessage message={error} /></div>}
              <div className="flex justify-center mb-5">
                <StarRating value={rating} onChange={setRating} />
              </div>
              <textarea
                 placeholder="Leave a comment (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="bg-background border border-border rounded-xl px-4 py-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-foreground transition-all mb-4 resize-none placeholder:text-muted"
              />
               <motion.button
                onClick={handleRate}
                disabled={!rating || submitting}
                whileTap={{ scale: 0.97 }}
                className="w-full bg-foreground text-background rounded-xl py-3.5 font-semibold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-150"
              >
                {submitting ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : 'Submit Rating'}
              </motion.button>
            </motion.div>
          )}

          {ratingDone && (
            <motion.div
              key="rating-done"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
                className="bg-card rounded-2xl border border-border shadow-sm p-8 text-center"
            >
              <p className="text-2xl font-bold text-foreground mb-2">Thank you! 🎉</p>
              <p className="text-muted-foreground text-sm mb-6">Your feedback helps us improve SafeRide</p>
              <motion.button
                 onClick={() => router.push('/dashboard')}
                whileTap={{ scale: 0.97 }}
                className="bg-foreground text-background rounded-xl py-3 px-8 font-semibold text-sm hover:opacity-90 transition-all duration-150"
              >
                Back to Dashboard
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}