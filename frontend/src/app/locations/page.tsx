'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useAuth } from '@clerk/nextjs'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Plus, Pencil, Trash2, Home, Briefcase, Star } from 'lucide-react'
import Navbar from '@/components/Navbar'
import LoadingScreen from '@/components/LoadingScreen'
import Modal from '@/components/Modal'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import { getApi } from '@/lib/api'
import { toast } from '@/components/Toast'
import { useCache } from '@/context/CacheContext'

const OSMMap = dynamic(() => import('@/components/OSMMap'), { ssr: false })

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
  Home: 'bg-blue-500/10 border-blue-500/20',
  Work: 'bg-purple-500/10 border-purple-500/20',
}

const PRESET_LABELS = ['Home', 'Work', 'Custom']

export default function LocationsPage() {
  const { getToken } = useAuth()
  const { setCache, getCache } = useCache()
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
  const [mapCenter, setMapCenter] = useState({ lat: 28.6139, lng: 77.2090 })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const cached = getCache('/api/locations')
    if (cached) {
      setLocations(cached)
      setLoading(false)
    }
    fetchLocations()
  }, [])

  const fetchLocations = async () => {
    try {
      const api = await getApi(getToken)
      const res = await api.get('/api/locations')
      setLocations(res.data)
      setCache('/api/locations', res.data)
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
    setMapCenter({ lat: 28.6139, lng: 77.2090 })
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
    setMapCenter({ lat: loc.lat, lng: loc.lng })
    setModalOpen(true)
  }

  const handleMapInteract = async (lat: number, lng: number) => {
    setFormLat(lat.toString())
    setFormLng(lng.toString())
    setMapCenter({ lat, lng })
    
    try {
      const api = await getApi(getToken)
      const res = await api.get(`/api/maps/reverse-geocode?lat=${lat}&lng=${lng}`)
      if (res.data?.address) {
        setFormAddress(res.data.address)
      }
    } catch (err) {
      console.error('Failed to reverse geocode', err)
      toast('Failed to get address for this location', 'error')
    }
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
        const updated = locations.map(l => l.id === editTarget.id ? res.data : l)
        setLocations(updated)
        setCache('/api/locations', updated)
        toast('Location updated!', 'success')
      } else {
        const res = await api.post('/api/locations', {
          label, address: formAddress, lat: formLat, lng: formLng
        })
        const updated = [...locations, res.data]
        setLocations(updated)
        setCache('/api/locations', updated)
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
      const updated = locations.filter(l => l.id !== id)
      setLocations(updated)
      setCache('/api/locations', updated)
      toast('Location removed', 'info')
    } catch {
      toast('Failed to delete location', 'error')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Saved Locations</h1>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={openAdd}
              className="flex items-center gap-1.5 bg-foreground text-background px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus size={16} /> Add Location
            </motion.button>
          </div>
          <p className="text-muted-foreground text-sm mb-8">Save frequent addresses for faster booking</p>

          {locations.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border shadow-sm p-12 text-center">
              <MapPin size={44} className="mx-auto mb-4 text-muted" />
              <p className="text-muted-foreground font-medium">No saved locations yet</p>
              <p className="text-muted-foreground/60 text-sm mt-1">Add your home, office, or any frequent destination</p>
              <button
                onClick={openAdd}
                className="mt-6 inline-flex items-center gap-2 bg-foreground text-background px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
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
                    className={`bg-card rounded-2xl border shadow-sm p-5 flex items-start gap-4 ${labelColors[loc.label] ?? 'border-border'}`}
                  >
                    <div className="mt-0.5 p-2 bg-card rounded-xl shadow-sm border border-border">
                      {labelIcons[loc.label] ?? <Star size={18} className="text-orange-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{loc.label}</p>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">{loc.address}</p>
                      <p className="text-xs text-muted mt-1">{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(loc)}
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(loc.id)}
                        disabled={deleting === loc.id}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                      >
                        {deleting === loc.id
                          ? <span className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin block" />
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
        maxWidth="max-w-4xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* Label */}
            <div>
              <label className="block text-sm font-semibold text-muted-foreground mb-2">Label</label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_LABELS.map(l => (
                  <button
                    key={l}
                    onClick={() => setFormLabel(l)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${formLabel === l
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-card text-foreground border-border hover:border-foreground/50'}`}
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
                  className="mt-2 w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground transition-all"
                />
              )}
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-semibold text-muted-foreground mb-2">Address</label>
              <AddressAutocomplete
                placeholder="Search for a location…"
                value={formAddress}
                onSelect={(address, lat, lng) => {
                  setFormAddress(address)
                  setFormLat(lat)
                  setFormLng(lng)
                  if (lat && lng) {
                    setMapCenter({ lat: parseFloat(lat), lng: parseFloat(lng) })
                  }
                }}
              />
              {formLat && formLng && (
                <p className="text-xs text-muted mt-1.5">📍 {parseFloat(formLat).toFixed(5)}, {parseFloat(formLng).toFixed(5)}</p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 py-3 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <motion.button
                onClick={handleSave}
                disabled={saving}
                whileTap={{ scale: 0.97 }}
                className="flex-1 py-3 bg-foreground text-background rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save'}
              </motion.button>
            </div>
          </div>

          <div className="h-[300px] md:h-full min-h-[300px] rounded-2xl overflow-hidden border border-border shadow-inner bg-muted relative">
            <OSMMap
              center={mapCenter}
              zoom={15}
              markers={formLat && formLng ? [{ lat: parseFloat(formLat), lng: parseFloat(formLng), draggable: true }] : []}
              onMapClick={handleMapInteract}
              onMarkerDrag={handleMapInteract}
              className="h-full w-full"
            />
            <div className="absolute top-3 left-3 z-[400] bg-card/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm border border-border">
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Map Preview</p>
              <p className="text-[11px] text-muted-foreground font-medium">Click or drag to adjust</p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
