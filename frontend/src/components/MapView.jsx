import React, { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import { HOSPITALS } from '../data/mockData'

// Fix for default marker icons with Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function createHospitalIcon(available, total, isSelected, isNearest) {
  const ratio = available / total
  const color = isSelected
    ? '#007AFF'
    : isNearest
    ? '#FF9500'
    : ratio > 0.4
    ? '#34C759'
    : ratio > 0.15
    ? '#FF9500'
    : '#FF3B30'

  const size = isSelected ? 36 : 28
  const border = isSelected ? 3 : 2

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - border}"
        fill="${color}" stroke="white" stroke-width="${border}"
        filter="url(#shadow)" />
      ${isSelected ? `<circle cx="${size/2}" cy="${size/2}" r="${size/2 - border - 3}" fill="rgba(255,255,255,0.2)" />` : ''}
      <text x="${size/2}" y="${size/2 + 4}" text-anchor="middle"
        font-family="Inter, sans-serif" font-weight="700"
        font-size="${isSelected ? 10 : 8}" fill="white">H</text>
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="${color}" flood-opacity="0.4"/>
        </filter>
      </defs>
    </svg>
  `

  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
  })
}

function createAmbulanceIcon() {
  const svg = `
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="white" stroke="#FF3B30" stroke-width="2.5"
        filter="url(#amb-shadow)" />
      <text x="20" y="26" text-anchor="middle" font-size="18">🚑</text>
      <defs>
        <filter id="amb-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#FF3B30" flood-opacity="0.35"/>
        </filter>
      </defs>
    </svg>
  `
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -24],
  })
}

function MapRecenter({ center }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true })
  }, [center, map])
  return null
}

function AnimatedRoute({ positions }) {
  if (!positions || positions.length < 2) return null
  return (
    <>
      {/* Shadow line */}
      <Polyline
        positions={positions}
        pathOptions={{ color: '#007AFF', weight: 8, opacity: 0.1, lineCap: 'round' }}
      />
      {/* Main route */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: '#007AFF',
          weight: 4,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
          dashArray: '8 4',
        }}
      />
    </>
  )
}

export default function MapView({ result, pickupLocation }) {
  const center = [18.52, 73.856]
  const pickupPos = pickupLocation
    ? [pickupLocation.lat, pickupLocation.lng]
    : [18.52, 73.856]

  const selectedId = result?.selectedHospital?.id
  const nearestId  = result?.nearestHospital?.id
  const route      = result?.route

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        maxZoom={19}
      />

      {/* Hospital markers */}
      {HOSPITALS.map((hospital) => (
        <Marker
          key={hospital.id}
          position={[hospital.lat, hospital.lng]}
          icon={createHospitalIcon(
            hospital.icuAvailable,
            hospital.icuBeds,
            hospital.id === selectedId,
            hospital.id === nearestId
          )}
        >
          <Popup>
            <div style={{ fontFamily: 'Inter, sans-serif', padding: '12px', minWidth: 180 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                {hospital.id === selectedId && (
                  <span style={{
                    background: 'linear-gradient(135deg, #007AFF, #5856D6)',
                    color: 'white',
                    borderRadius: 6,
                    padding: '2px 8px',
                    fontSize: 10,
                    fontWeight: 700,
                  }}>AI PICK</span>
                )}
                {hospital.id === nearestId && (
                  <span style={{
                    background: '#FF9500',
                    color: 'white',
                    borderRadius: 6,
                    padding: '2px 8px',
                    fontSize: 10,
                    fontWeight: 700,
                  }}>NEAREST</span>
                )}
              </div>
              <p style={{ fontWeight: 700, fontSize: 13, color: '#1D1D1F', marginBottom: 4 }}>
                {hospital.name}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <div style={{ background: '#F5F5F7', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                  <p style={{ fontSize: 10, color: '#86868B', marginBottom: 2 }}>ICU</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#34C759' }}>
                    {hospital.icuAvailable}/{hospital.icuBeds}
                  </p>
                </div>
                <div style={{ background: '#F5F5F7', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                  <p style={{ fontSize: 10, color: '#86868B', marginBottom: 2 }}>ETA</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#007AFF' }}>
                    {hospital.eta}m
                  </p>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Ambulance / pickup */}
      <Marker position={pickupPos} icon={createAmbulanceIcon()}>
        <Popup>
          <div style={{ fontFamily: 'Inter, sans-serif', padding: '10px' }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: '#FF3B30' }}>🚑 Ambulance</p>
            <p style={{ fontSize: 11, color: '#86868B', marginTop: 2 }}>
              {pickupLocation?.name || 'Current Location'}
            </p>
          </div>
        </Popup>
      </Marker>

      {/* Animated route */}
      {route && <AnimatedRoute positions={route} />}
    </MapContainer>
  )
}
