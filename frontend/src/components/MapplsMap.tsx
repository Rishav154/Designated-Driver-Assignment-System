'use client'

import { useEffect, useRef, useState, useId } from 'react'

declare global {
  interface Window {
    mappls: any;
    initMap: () => void;
    mapplsCallbacks: Array<() => void>;
  }
}

interface MapplsMapProps {
  center?: { lat: number; lng: number }
  zoom?: number
  markers?: Array<{
    lat: number
    lng: number
    label?: string
    draggable?: boolean
  }>
  onMapClick?: (lat: number, lng: number) => void
  onMarkerDrag?: (lat: number, lng: number) => void
  className?: string
}

export default function MapplsMap({
  center = { lat: 28.6139, lng: 77.2090 },
  zoom = 12,
  markers = [],
  onMapClick,
  onMarkerDrag,
  className = "h-64",
}: MapplsMapProps) {
  const mapRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const isMapLoaded = useRef(false)
  const mapId = useId().replace(/:/g, '')
  const [error, setError] = useState(false)
  const markersRef = useRef<any[]>([])

  const updateMarkers = (mapItem: any) => {
    if (!mapItem || !window.mappls || !isMapLoaded.current) return

    try {
      markersRef.current.forEach((m) => {
        if (m && typeof m.remove === 'function') m.remove()
      })
      markersRef.current = []

      markers.forEach((m) => {
        const marker = new window.mappls.Marker({
          map: mapItem,
          position: { lat: m.lat, lng: m.lng },
          draggable: m.draggable || false,
        })
        
        if (m.label) {
            // standard marker placement
        }

        if (m.draggable && onMarkerDrag) {
          marker.addListener('dragend', () => {
            const pos = marker.getPosition ? marker.getPosition() : marker.getLngLat()
            onMarkerDrag(pos.lat, pos.lng)
          })
        }

        markersRef.current.push(marker)
      })
    } catch (err) {
      console.error('Error updating markers in MapplsMap:', err)
    }
  }

  useEffect(() => {
    if (error) return

    const initThisMap = () => {
      try {
        if (!mapContainerRef.current) return

        const map = new window.mappls.Map(`mappls-map-${mapId}`, {
          center: { lat: center.lat, lng: center.lng },
          zoom: zoom,
        })
        mapRef.current = map

        map.addListener('load', () => {
          isMapLoaded.current = true
          updateMarkers(map)
        })

        map.addListener('click', (e: any) => {
          if (onMapClick && e.lngLat) {
            onMapClick(e.lngLat.lat, e.lngLat.lng)
          }
        })
      } catch (err) {
        console.error('Error instantiating Mappls Map:', err)
      }
    }

    if (!window.initMap) {
      window.initMap = () => {
        if (window.mapplsCallbacks) {
          window.mapplsCallbacks.forEach((cb: () => void) => cb())
        }
      }
      window.mapplsCallbacks = []
    }

    if (!window.mappls) {
      window.mapplsCallbacks.push(initThisMap)
      
      if (!document.getElementById('mappls-script')) {
        const script = document.createElement('script')
        script.id = 'mappls-script'
        const key = process.env.NEXT_PUBLIC_MAPPLS_SDK_KEY
        script.src = `https://apis.mappls.com/advancedmaps/api/${key}/map_sdk?layer=vector&v=3.0&callback=initMap`
        script.async = true
        script.defer = true
        script.onerror = () => setError(true)
        document.head.appendChild(script)
      }
    } else {
      if (!mapRef.current) {
        initThisMap()
      }
    }
  }, []) // Initialize map only once

  // React to prop changes
  const markersStr = JSON.stringify(markers)
  useEffect(() => {
    if (mapRef.current && window.mappls) {
      try {
        if (typeof mapRef.current.setCenter === 'function') {
          mapRef.current.setCenter({ lat: center.lat, lng: center.lng })
        }
        if (typeof mapRef.current.setZoom === 'function') {
          mapRef.current.setZoom(zoom)
        }
        updateMarkers(mapRef.current)
      } catch (err) {
        console.error('Error updating map prop changes:', err)
      }
    }
  }, [center.lat, center.lng, zoom, markersStr])

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-amber-50 text-amber-700 font-semibold border border-amber-200 ${className}`}>
        Map unavailable
      </div>
    )
  }

  return <div id={`mappls-map-${mapId}`} ref={mapContainerRef} className={className} />
}
