'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useUser } from '@clerk/nextjs'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Car } from 'lucide-react'
import { getApi } from '@/lib/api'
import { useCache } from '@/context/CacheContext'
import ErrorMessage from '@/components/ErrorMessage'
import LoadingScreen from '@/components/LoadingScreen'

export default function OnboardingPage() {
  const router = useRouter()
  const { getToken } = useAuth()
  const { user } = useUser()
  const { setCache, getCache } = useCache()
  const [role, setRole] = useState<'CUSTOMER' | 'DRIVER' | null>(null)
  const [form, setForm] = useState({ licenseNo: '', comfortableVehicles: '', age: '', gender: '' })
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const cachedAuth = getCache('/api/auth/me')
    if (cachedAuth) {
      if (cachedAuth.role === 'DRIVER') {
        router.replace('/driver/dashboard')
        return
      } else if (cachedAuth.role === 'CUSTOMER') {
        router.replace('/dashboard')
        return
      }
    }

    getApi(getToken)
      .then((api) => api.get('/api/auth/me'))
      .then((res) => {
        if (res.data) {
          setCache('/api/auth/me', res.data)
          if (res.data.role === 'DRIVER') {
            router.replace('/driver/dashboard')
          } else if (res.data.role === 'CUSTOMER') {
            router.replace('/dashboard')
          } else {
            setCheckingAuth(false)
          }
        } else {
          setCheckingAuth(false)
        }
      })
      .catch(() => setCheckingAuth(false))
  }, [getToken, getCache, setCache, router])

  const isDriverFormComplete =
    form.licenseNo.trim() &&
    form.comfortableVehicles.trim() &&
    form.age.trim() &&
    form.gender.trim()
  const canContinue = role === 'CUSTOMER' || (role === 'DRIVER' && isDriverFormComplete)

  async function handleContinue() {
    if (!role || !canContinue || !user) return
    setLoading(true)
    setError('')
    try {
      const api = await getApi(getToken)
      
      // 1. Sync user data with role, name, email
      const syncRes = await api.post('/api/auth/sync', {
        role,
        name: user.fullName || user.username || 'User',
        email: user.primaryEmailAddress?.emailAddress,
        phone: user.primaryPhoneNumber?.phoneNumber,
      })

      let userData = syncRes.data

      // 2. If driver, save profile details separately
      if (role === 'DRIVER') {
        const profileRes = await api.post('/api/auth/driver-profile', form)
        userData = { ...userData, driverProfile: profileRes.data }
      }

      setCache('/api/auth/me', userData)

      router.push(role === 'DRIVER' ? '/driver/dashboard' : '/dashboard')
    } catch (err: any) {
      console.error('Onboarding sync error:', err.response?.data || err.message)
      setError(err.response?.data?.error || 'Failed to save your profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return <LoadingScreen />
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
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">License Number</label>
                  <input
                    type="text"
                    placeholder="e.g. DL-1234567890"
                    value={form.licenseNo}
                    onChange={(e) => setForm((f) => ({ ...f, licenseNo: e.target.value }))}
                    className="bg-background border border-border rounded-xl px-4 py-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-foreground transition-all placeholder:text-muted"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Vehicles you are comfortable to drive</label>
                  <select
                    value={form.comfortableVehicles}
                    onChange={(e) => setForm((f) => ({ ...f, comfortableVehicles: e.target.value }))}
                    className="bg-background border border-border rounded-xl px-4 py-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-foreground transition-all text-foreground"
                  >
                    <option value="" disabled>Select Vehicle Type</option>
                    <option value="Hatchbacks & Sedans (Manual/Automatic)">Hatchbacks & Sedans (Manual/Automatic)</option>
                    <option value="Hatchbacks, Sedans & SUVs (Manual/Automatic)">Hatchbacks, Sedans & SUVs (Manual/Automatic)</option>
                    <option value="Automatic Vehicles Only (All Sizes)">Automatic Vehicles Only (All Sizes)</option>
                    <option value="Manual Vehicles Only (All Sizes)">Manual Vehicles Only (All Sizes)</option>
                    <option value="Luxury & Automatic Cars Only">Luxury & Automatic Cars Only</option>
                    <option value="All Vehicle Types (Manual/Automatic/Luxury)">All Vehicle Types (Manual/Automatic/Luxury)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Age</label>
                    <input
                      type="number"
                      placeholder="e.g. 25"
                      value={form.age}
                      onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                      className="bg-background border border-border rounded-xl px-4 py-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-foreground transition-all placeholder:text-muted"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Gender</label>
                    <select
                      value={form.gender}
                      onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                      className="bg-background border border-border rounded-xl px-4 py-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-foreground transition-all text-foreground"
                    >
                      <option value="" disabled>Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
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