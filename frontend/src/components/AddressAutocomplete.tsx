'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { getApi } from '@/lib/api'

interface Suggestion {
  eLoc: string
  placeName: string
  placeAddress: string
  latitude?: number
  longitude?: number
}

interface AddressAutocompleteProps {
  placeholder: string
  value: string
  onSelect: (address: string, lat: string, lng: string) => void
  icon?: React.ReactNode
}

export default function AddressAutocomplete({ placeholder, value, onSelect, icon }: AddressAutocompleteProps) {
  const { getToken } = useAuth()
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!query || query.length < 3 || query === value) {
        setSuggestions([])
        return
      }

      setLoading(true)
      try {
        const api = await getApi(getToken)
        const res = await api.get(`/api/maps/autosuggest?query=${encodeURIComponent(query)}`)
        setSuggestions(res.data)
        setIsOpen(true)
      } catch (error) {
        console.error('Failed to fetch suggestions', error)
      } finally {
        setLoading(false)
      }
    }

    const timeoutId = setTimeout(fetchSuggestions, 400)
    return () => clearTimeout(timeoutId)
  }, [query, getToken, value])

  const handleSelect = async (suggestion: Suggestion) => {
    // Use coordinates from autosuggest if available
    let lat = suggestion.latitude?.toString() || ''
    let lng = suggestion.longitude?.toString() || ''

    const displayName = suggestion.placeName || suggestion.placeAddress || ''
    setQuery(displayName)
    setIsOpen(false)

    // If autosuggest didn't include coords, use Nominatim geocoding via backend
    if (!lat || !lng) {
      try {
        const api = await getApi(getToken)
        // 1. First try Nominatim with full detailed query
        const fullQuery = [suggestion.placeName, suggestion.placeAddress].filter(Boolean).join(', ')
        let res = await api.get(`/api/maps/geocode?address=${encodeURIComponent(fullQuery)}`)

        // 2. If it fails, Nominatim is probably being too strict, so try just the placeName + city or just placeName
        if (!res.data?.coordinatesAvailable && suggestion.placeName) {
           res = await api.get(`/api/maps/geocode?address=${encodeURIComponent(suggestion.placeName)}`)
        }

        if (res.data?.coordinatesAvailable) {
          lat = res.data.latitude
          lng = res.data.longitude
        } else {
          // Both approaches failed coordinates
          const address = res.data?.displayName || suggestion.placeAddress || displayName
          // Pass empty coordinates. The Dashboard map will default.
          onSelect(address, '', '')
          return
        }
      } catch (error) {
        console.error('Failed to geocode address', error)
      }
    }

    onSelect(suggestion.placeAddress || displayName, lat, lng)
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative flex items-center">
        {icon && <div className="absolute left-3">{icon}</div>}
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true)
          }}
          className={`bg-background border border-border rounded-xl py-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-foreground focus:border-transparent placeholder:text-muted-foreground transition-all ${icon ? 'pl-10 pr-4' : 'px-4'}`}
        />
        {loading && (
          <div className="absolute right-3">
            <span className="w-4 h-4 border-2 border-muted border-t-foreground rounded-full animate-spin inline-block" />
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-60 overflow-auto">
          {suggestions.map((s, idx) => (
            <li
              key={s.eLoc || idx}
              onClick={() => handleSelect(s)}
              className="px-4 py-3 hover:bg-muted cursor-pointer border-b border-border last:border-0"
            >
              <p className="text-sm font-semibold text-foreground">{s.placeName}</p>
              <p className="text-xs text-muted-foreground truncate">{s.placeAddress}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}