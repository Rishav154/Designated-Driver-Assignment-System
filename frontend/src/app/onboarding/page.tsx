'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useUser } from '@clerk/nextjs'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Car } from 'lucide-react'
import { getApi } from '@/lib/api'
import ErrorMessage from '@/components/ErrorMessage'

export default function OnboardingPage() {
  const router = useRouter()
  const { getToken } = useAuth()
  const { user } = useUser()
  const [role, setRole] = useState<'CUSTOMER' | 'DRIVER' | null>(null)
  const [form, setForm] = useState({ licenseNo: '', vehicleMake: '', vehicleModel: '', vehiclePlate: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isDriverFormComplete =
    form.licenseNo.trim() && form.vehicleMake.trim() && form.vehicleModel.trim() && form.vehiclePlate.trim()
  const canContinue = role === 'CUSTOMER' || (role === 'DRIVER' && isDriverFormComplete)

  async function handleContinue() {
    if (!role || !canContinue || !user) return
    setLoading(true)
    setError('')
    try {
      const api = await getApi(getToken)
      
      // 1. Sync user data with role, name, email
      await api.post('/api/auth/sync', {
        role,
        name: user.fullName || user.username || 'User',
        email: user.primaryEmailAddress?.emailAddress,
        phone: user.primaryPhoneNumber?.phoneNumber,
      })

      // 2. If driver, save profile details separately
      if (role === 'DRIVER') {
        await api.post('/api/auth/driver-profile', form)
      }

      router.push(role === 'DRIVER' ? '/driver/dashboard' : '/dashboard')
    } catch (err: any) {
      console.error('Onboarding sync error:', err.response?.data || err.message)
      setError(err.response?.data?.error || 'Failed to save your profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="bg-card rounded-2xl border border-border shadow-sm p-8 w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-2xl font-bold text-foreground tracking-tight mb-1">SafeRide</p>
          <h1 className="text-xl font-bold text-foreground">Welcome to SafeRide</h1>
          <p className="text-muted-foreground text-sm mt-1">Tell us how you&apos;ll be using the app</p>
        </div>
        <hr className="border-border mb-6" />

        {/* Role selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { key: 'CUSTOMER' as const, icon: <User size={24} />, title: 'I need a driver', desc: 'Book a designated driver for your vehicle' },
            { key: 'DRIVER' as const, icon: <Car size={24} />, title: "I'm a driver", desc: 'Accept ride requests and earn money' },
          ].map((opt) => (
             <motion.button
              key={opt.key}
              type="button"
              onClick={() => setRole(opt.key)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex flex-col items-center text-center gap-2 rounded-xl p-5 border-2 transition-all duration-150 ${
                role === opt.key ? 'border-foreground bg-foreground/5' : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              <span className={role === opt.key ? 'text-foreground' : 'text-muted'}>{opt.icon}</span>
              <span className="font-semibold text-sm text-foreground">{opt.title}</span>
              <span className="text-xs text-muted-foreground leading-tight">{opt.desc}</span>
            </motion.button>
          ))}
        </div>

        {/* Driver form */}
        <AnimatePresence>
          {role === 'DRIVER' && (
            <motion.div
              key="driver-form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-4 mb-6">
                {[
                  { label: 'License Number', key: 'licenseNo', placeholder: 'DL-1234567890' },
                  { label: 'Vehicle Make', key: 'vehicleMake', placeholder: 'Toyota' },
                  { label: 'Vehicle Model', key: 'vehicleModel', placeholder: 'Fortuner' },
                  { label: 'Number Plate', key: 'vehiclePlate', placeholder: 'MH-12-AB-1234' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">{field.label}</label>
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      value={form[field.key as keyof typeof form]}
                      onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                      className="bg-background border border-border rounded-xl px-4 py-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-foreground transition-all placeholder:text-muted"
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && <div className="mb-4"><ErrorMessage message={error} /></div>}

         <motion.button
          onClick={handleContinue}
          disabled={!canContinue || loading}
          whileTap={canContinue ? { scale: 0.97 } : {}}
          className="w-full bg-foreground text-background rounded-xl py-3.5 font-semibold text-sm hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : 'Continue'}
        </motion.button>
      </motion.div>
    </div>
  )
}