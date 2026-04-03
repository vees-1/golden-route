import React, { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { HOSPITALS } from '../data/mockData'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function createHospitalIcon(available, total, isSelected, isNearest) {
  const ratio = available / total
  const color = isSelected ? '#007AFF'
    : isNearest ? '#FF9500'
    : ratio > 0.4 ? '#34C759'
    : ratio > 0.15 ? '#FF9500'
    : '#FF3B30'
  const size = isSelected ? 36 : 28
  const border = isSelected ? 3 : 2
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${size/2}" cy="${size/2}" r="${size/2 - border}" fill="${color}" stroke="white" stroke-width="${border}" filter="url(#s)"/>
    <text x="${size/2}" y="${size/2+4}" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="${isSelected?10:8}" fill="white">H</text>
    <defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="${color}" flood-opacity="0.4"/></filter></defs>
  </svg>`
  return L.divIcon({ html: svg, className: '', iconSize: [size, size], iconAnchor: [size/2, size/2], popupAnchor: [0, -size/2-4] })
}

function createAmbulanceIcon() {
  const svg = `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="18" fill="white" stroke="#FF3B30" stroke-width="2.5" filter="url(#a)"/>
    <text x="20" y="26" text-anchor="middle" font-size="18">🚑</text>
    <defs><filter id="a" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#FF3B30" flood-opacity="0.35"/></filter></defs>
  </svg>`
  return L.divIcon({ html: svg, className: '', iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -24] })
}

function FitRoute({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (positions?.length >= 2) {
      map.fitBounds(L.latLngBounds(positions), { padding: [60, 60], maxZoom: 15, animate: true })
    }
  }, [positions, map])
  return null
}

// Fetch real road route from OSRM public server
async function fetchOSRMRoute(from, to) {
  const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`
  const res = await fetch(url)
  const data = await res.json()
  if (data.routes?.[0]) {
    // OSRM returns [lng, lat], Leaflet needs [lat, lng]
    return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
  }
  return null
}

export default function MapView({ result, pickupLocation }) {
  const [realRoute, setRealRoute] = useState(null)
  const routeKey = useRef(null)

  const pickupPos = pickupLocation ? [pickupLocation.lat, pickupLocation.lng] : [18.5074, 73.8073]
  const selectedHosp = result?.selectedHospital
  const selectedId   = result?.selectedHospital?.id
  const nearestName  = result?._raw?.routing?.nearest_hospital

  const apiHospitals = result ? [
    ...(result._raw?.routing?.recommended ?? []),
    ...(result._raw?.routing?.infeasible ?? []),
  ] : []
  const apiMap = Object.fromEntries(apiHospitals.map((h) => [h.id, h]))
  const hospitals = HOSPITALS.map((h) => ({ ...h, ...apiMap[h.id] }))

  // Fetch real OSRM route when hospital changes
  useEffect(() => {
    if (!selectedHosp) { setRealRoute(null); return }
    const key = `${pickupPos[0]},${pickupPos[1]}-${selectedHosp.lat},${selectedHosp.lng}`
    if (routeKey.current === key) return
    routeKey.current = key
    const dest = [selectedHosp.lat, selectedHosp.lng]
    fetchOSRMRoute(pickupPos, dest)
      .then((pts) => pts && setRealRoute(pts))
      .catch(() => setRealRoute([pickupPos, dest])) // fallback to straight line
  }, [selectedHosp?.id, pickupPos[0], pickupPos[1]])

  const routeForFit = realRoute ?? (selectedHosp ? [pickupPos, [selectedHosp.lat, selectedHosp.lng]] : null)

  return (
    <MapContainer
      center={pickupPos}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      {/* OpenStreetMap standard tiles — shows full road network */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />

      {routeForFit && <FitRoute positions={routeForFit} />}

      {/* Real road route from OSRM */}
      {realRoute && (
        <>
          <Polyline positions={realRoute} pathOptions={{ color: '#007AFF', weight: 7, opacity: 0.12, lineCap: 'round' }} />
          <Polyline positions={realRoute} pathOptions={{ color: '#007AFF', weight: 4, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }} />
        </>
      )}

      {/* Hospital markers */}
      {hospitals.map((hospital) => {
        const icuAvail  = hospital.icu_available ?? hospital.icuAvailable ?? 0
        const icuTotal  = hospital.icuBeds ?? 10
        const isSelected = hospital.id === selectedId
        const isNearest  = hospital.name === nearestName
        const eta = hospital.est_travel_minutes ?? hospital.eta ?? null

        return (
          <Marker key={hospital.id} position={[hospital.lat, hospital.lng]}
            icon={createHospitalIcon(icuAvail, icuTotal, isSelected, isNearest)}>
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif', padding: '12px', minWidth: 180 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  {isSelected && <span style={{ background: 'linear-gradient(135deg,#007AFF,#5856D6)', color: 'white', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>AI PICK</span>}
                  {isNearest && <span style={{ background: '#FF9500', color: 'white', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>NEAREST</span>}
                </div>
                <p style={{ fontWeight: 700, fontSize: 13, color: '#1D1D1F', marginBottom: 6 }}>{hospital.name}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <div style={{ background: '#F5F5F7', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                    <p style={{ fontSize: 10, color: '#86868B', marginBottom: 2 }}>ICU</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: icuAvail > 0 ? '#34C759' : '#FF3B30' }}>{icuAvail} free</p>
                  </div>
                  <div style={{ background: '#F5F5F7', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                    <p style={{ fontSize: 10, color: '#86868B', marginBottom: 2 }}>ETA</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#007AFF' }}>{eta != null ? `${Math.round(eta)}m` : '—'}</p>
                  </div>
                </div>
                {hospital.load_pct != null && (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ fontSize: 10, color: '#86868B', marginBottom: 4 }}>Load</p>
                    <div style={{ height: 4, background: '#E5E5EA', borderRadius: 2 }}>
                      <div style={{ height: '100%', borderRadius: 2, width: `${hospital.load_pct}%`, background: hospital.load_pct > 85 ? '#FF3B30' : hospital.load_pct > 65 ? '#FF9500' : '#34C759' }} />
                    </div>
                    <p style={{ fontSize: 10, color: '#86868B', marginTop: 2 }}>{hospital.load_pct}% occupied</p>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )
      })}

      {/* Ambulance marker */}
      <Marker position={pickupPos} icon={createAmbulanceIcon()}>
        <Popup>
          <div style={{ fontFamily: 'Inter, sans-serif', padding: '10px' }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: '#FF3B30' }}>🚑 Ambulance</p>
            <p style={{ fontSize: 11, color: '#86868B', marginTop: 2 }}>{pickupLocation?.name || 'Current Location'}</p>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  )
}
