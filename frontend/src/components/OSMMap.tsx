'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default marker icon issue with bundlers
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const greenIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const redIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const blueIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function getMarkerIcon(label?: string) {
  if (label === 'A') return greenIcon
  if (label === 'B') return redIcon
  if (label === 'D') return blueIcon
  return defaultIcon
}

interface OSMMapProps {
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

// Component to handle map click events
function MapClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng)
      }
    },
  })
  return null
}

// Component to update map center/zoom when props change
function MapUpdater({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) {
  const map = useMap()
  const prevCenter = useRef(center)
  const prevZoom = useRef(zoom)

  useEffect(() => {
    if (
      prevCenter.current.lat !== center.lat ||
      prevCenter.current.lng !== center.lng ||
      prevZoom.current !== zoom
    ) {
      map.setView([center.lat, center.lng], zoom)
      prevCenter.current = center
      prevZoom.current = zoom
    }
  }, [center.lat, center.lng, zoom, map])

  return null
}

export default function OSMMap({
  center = { lat: 28.6139, lng: 77.2090 },
  zoom = 12,
  markers = [],
  onMapClick,
  onMarkerDrag,
  className = "h-64",
}: OSMMapProps) {
  const [mapReady, setMapReady] = useState(false)

  return (
    <div className={className} style={{ position: 'relative', zIndex: 0 }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%', borderRadius: 'inherit' }}
        whenReady={() => setMapReady(true)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onMapClick={onMapClick} />
        <MapUpdater center={center} zoom={zoom} />
        {mapReady &&
          markers.map((m, idx) => (
            <Marker
              key={`${m.lat}-${m.lng}-${m.label || idx}`}
              position={[m.lat, m.lng]}
              icon={getMarkerIcon(m.label)}
              draggable={m.draggable || false}
              eventHandlers={
                m.draggable && onMarkerDrag
                  ? {
                      dragend: (e) => {
                        const latlng = e.target.getLatLng()
                        onMarkerDrag(latlng.lat, latlng.lng)
                      },
                    }
                  : undefined
              }
            />
          ))}
      </MapContainer>
    </div>
  )
}
