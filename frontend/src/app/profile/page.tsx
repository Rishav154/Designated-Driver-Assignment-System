'use client'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { motion } from 'framer-motion'
import { Camera, Save, User, Mail, Phone } from 'lucide-react'
import Navbar from '@/components/Navbar'
import LoadingScreen from '@/components/LoadingScreen'
import { getApi } from '@/lib/api'
import { toast } from '@/components/Toast'

interface UserProfile {
  id: string
  name: string
  email: string
  phone: string | null
  profilePicture: string | null
  role: string
}

export default function ProfilePage() {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [picture, setPicture] = useState<string | null>(null)
  const [pictureFile, setPictureFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getApi(getToken)
      .then(api => api.get('/api/auth/me'))
      .then(res => {
        const user: UserProfile = res.data
        setProfile(user)
        setName(user.name ?? '')
        setPhone(user.phone ?? '')
        setPicture(user.profilePicture ?? null)
      })
      .catch(() => toast('Failed to load profile', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast('Image must be under 2 MB', 'error')
      return
    }
    setPictureFile(file)
    const reader = new FileReader()
    reader.onload = () => setPicture(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!name.trim() || name.trim().length < 2) {
      toast('Name must be at least 2 characters', 'error')
      return
    }
    setSaving(true)
    try {
      const api = await getApi(getToken)
      const payload: Record<string, string> = { name: name.trim(), phone }
      if (pictureFile) payload.profilePicture = picture!
      const res = await api.patch('/api/auth/profile', payload)
      setProfile(res.data)
      setPictureFile(null)
      toast('Profile updated successfully!', 'success')
    } catch (err: any) {
      toast(err?.response?.data?.error ?? 'Failed to update profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-1">My Profile</h1>
          <p className="text-muted-foreground text-sm mb-8">Manage your personal information</p>

          <div className="bg-card rounded-2xl border border-border shadow-sm p-8">
            {/* Avatar */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
                {picture ? (
                  <img
                    src={picture}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-card shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-muted to-border border-4 border-card shadow-lg flex items-center justify-center">
                    <User size={36} className="text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera size={20} className="text-white" />
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              <button
                onClick={() => fileRef.current?.click()}
                className="mt-3 text-sm text-blue-600 hover:text-blue-500 font-medium transition-colors"
              >
                Change photo
              </button>
              <p className="text-xs text-muted mt-1">Max 2 MB · JPG, PNG, WebP</p>
            </div>

            {/* Fields */}
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  <User size={14} className="inline mr-1.5 mb-0.5" />Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-foreground focus:border-transparent transition-all"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  <Mail size={14} className="inline mr-1.5 mb-0.5" />Email
                </label>
                <input
                  type="email"
                  value={profile?.email ?? ''}
                  disabled
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground cursor-not-allowed"
                />
                <p className="text-xs text-muted mt-1">Email cannot be changed here.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  <Phone size={14} className="inline mr-1.5 mb-0.5" />Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-foreground focus:border-transparent transition-all"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <motion.button
              onClick={handleSave}
              disabled={saving}
              whileTap={{ scale: 0.97 }}
              className="mt-8 w-full bg-foreground text-background rounded-xl py-3.5 font-semibold text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Save size={16} /> Save Changes</>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
