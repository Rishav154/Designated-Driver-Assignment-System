'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Plus, Pencil, Trash2, Home, Briefcase, Star } from 'lucide-react'
import Navbar from '@/components/Navbar'
import LoadingScreen from '@/components/LoadingScreen'
import Modal from '@/components/Modal'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import { getApi } from '@/lib/api'
import { toast } from '@/components/Toast'

interface SavedLocation {
  id: string
  label: string
  address: string
  lat: number
  lng: number
}

const labelIcons: Record<string, React.ReactNode> = {
  Home: <Home size={18} className="text-blue-500" />,
  Work: <Briefcase size={18} className="text-purple-500" />,
}

const labelColors: Record<string, string> = {
  Home: 'bg-blue-50 border-blue-100',
  Work: 'bg-purple-50 border-purple-100',
}

const PRESET_LABELS = ['Home', 'Work', 'Custom']

export default function LocationsPage() {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [locations, setLocations] = useState<SavedLocation[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<SavedLocation | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // form state
  const [formLabel, setFormLabel] = useState('Home')
  const [customLabel, setCustomLabel] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formLat, setFormLat] = useState('')
  const [formLng, setFormLng] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchLocations()
  }, [])

  const fetchLocations = async () => {
    try {
      const api = await getApi(getToken)
      const res = await api.get('/api/locations')
      setLocations(res.data)
    } catch {
      toast('Failed to load locations', 'error')
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditTarget(null)
    setFormLabel('Home')
    setCustomLabel('')
    setFormAddress('')
    setFormLat('')
    setFormLng('')
    setModalOpen(true)
  }

  const openEdit = (loc: SavedLocation) => {
    setEditTarget(loc)
    const preset = PRESET_LABELS.includes(loc.label) ? loc.label : 'Custom'
    setFormLabel(preset)
    setCustomLabel(preset === 'Custom' ? loc.label : '')
    setFormAddress(loc.address)
    setFormLat(loc.lat.toString())
    setFormLng(loc.lng.toString())
    setModalOpen(true)
  }

  const handleSave = async () => {
    const label = formLabel === 'Custom' ? customLabel.trim() : formLabel
    if (!label) { toast('Please enter a label', 'error'); return }
    if (!formAddress) { toast('Please select an address', 'error'); return }
    if (!formLat || !formLng) { toast('Please select a valid address with coordinates', 'error'); return }

    setSaving(true)
    try {
      const api = await getApi(getToken)
      if (editTarget) {
        const res = await api.patch(`/api/locations/${editTarget.id}`, {
          label, address: formAddress, lat: formLat, lng: formLng
        })
        setLocations(prev => prev.map(l => l.id === editTarget.id ? res.data : l))
        toast('Location updated!', 'success')
      } else {
        const res = await api.post('/api/locations', {
          label, address: formAddress, lat: formLat, lng: formLng
        })
        setLocations(prev => [...prev, res.data])
        toast('Location saved!', 'success')
      }
      setModalOpen(false)
    } catch (err: any) {
      toast(err?.response?.data?.error ?? 'Failed to save location', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      const api = await getApi(getToken)
      await api.delete(`/api/locations/${id}`)
      setLocations(prev => prev.filter(l => l.id !== id))
      toast('Location removed', 'info')
    } catch {
      toast('Failed to delete location', 'error')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-3xl font-bold text-black tracking-tight">Saved Locations</h1>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={openAdd}
              className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-black transition-colors"
            >
              <Plus size={16} /> Add Location
            </motion.button>
          </div>
          <p className="text-gray-500 text-sm mb-8">Save frequent addresses for faster booking</p>

          {locations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <MapPin size={44} className="mx-auto mb-4 text-gray-200" />
              <p className="text-gray-500 font-medium">No saved locations yet</p>
              <p className="text-gray-400 text-sm mt-1">Add your home, office, or any frequent destination</p>
              <button
                onClick={openAdd}
                className="mt-6 inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-black transition-colors"
              >
                <Plus size={16} /> Add Your First Location
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {locations.map(loc => (
                  <motion.div
                    key={loc.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    layout
                    className={`bg-white rounded-2xl border shadow-sm p-5 flex items-start gap-4 ${labelColors[loc.label] ?? 'border-gray-100'}`}
                  >
                    <div className="mt-0.5 p-2 bg-white rounded-xl shadow-sm border border-gray-100">
                      {labelIcons[loc.label] ?? <Star size={18} className="text-orange-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{loc.label}</p>
                      <p className="text-sm text-gray-500 truncate mt-0.5">{loc.address}</p>
                      <p className="text-xs text-gray-300 mt-1">{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(loc)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(loc.id)}
                        disabled={deleting === loc.id}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                      >
                        {deleting === loc.id
                          ? <span className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin block" />
                          : <Trash2 size={16} />}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Edit Location' : 'Add Location'}
      >
        <div className="space-y-4">
          {/* Label */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Label</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_LABELS.map(l => (
                <button
                  key={l}
                  onClick={() => setFormLabel(l)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${formLabel === l
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'}`}
                >
                  {l}
                </button>
              ))}
            </div>
            {formLabel === 'Custom' && (
              <input
                type="text"
                value={customLabel}
                onChange={e => setCustomLabel(e.target.value)}
                placeholder="e.g. Gym, Parents' House…"
                className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
              />
            )}
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
            <AddressAutocomplete
              placeholder="Search for a location…"
              value={formAddress}
              onSelect={(address, lat, lng) => {
                setFormAddress(address)
                setFormLat(lat)
                setFormLng(lng)
              }}
            />
            {formLat && formLng && (
              <p className="text-xs text-gray-400 mt-1.5">📍 {parseFloat(formLat).toFixed(5)}, {parseFloat(formLng).toFixed(5)}</p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <motion.button
              onClick={handleSave}
              disabled={saving}
              whileTap={{ scale: 0.97 }}
              className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-black disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save'}
            </motion.button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
