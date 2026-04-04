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
  const size = isSelected ? 40 : 32
  const r = size / 2
  // Medical cross dimensions
  const arm = size * 0.22
  const len = size * 0.52
  const cx = r, cy = r
  const crossPath = `M${cx - arm},${cy - len/2} h${arm*2} v${len/2 - arm} h${len/2 - arm} v${arm*2} h${-(len/2 - arm)} v${len/2 - arm} h${-arm*2} v${-(len/2 - arm)} h${-(len/2 - arm)} v${-arm*2} h${len/2 - arm} Z`
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="s${size}" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="${isSelected?3:2}" flood-color="${color}" flood-opacity="0.45"/></filter></defs>
    <circle cx="${cx}" cy="${cy}" r="${r - 1}" fill="white" stroke="${color}" stroke-width="${isSelected?3:2}" filter="url(#s${size})"/>
    <path d="${crossPath}" fill="${color}"/>
  </svg>`
  return L.divIcon({ html: svg, className: '', iconSize: [size, size], iconAnchor: [r, r], popupAnchor: [0, -r - 4] })
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

function createRerouteIcon(size = 40) {
  const r = size / 2
  const arm = size * 0.22
  const len = size * 0.52
  const cx = r, cy = r
  const crossPath = `M${cx - arm},${cy - len/2} h${arm*2} v${len/2 - arm} h${len/2 - arm} v${arm*2} h${-(len/2 - arm)} v${len/2 - arm} h${-arm*2} v${-(len/2 - arm)} h${-(len/2 - arm)} v${-arm*2} h${len/2 - arm} Z`
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="rr" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#FF9500" flood-opacity="0.6"/></filter></defs>
    <circle cx="${cx}" cy="${cy}" r="${r - 1}" fill="white" stroke="#FF9500" stroke-width="3" filter="url(#rr)"/>
    <path d="${crossPath}" fill="#FF9500"/>
  </svg>`
  return L.divIcon({ html: svg, className: '', iconSize: [size, size], iconAnchor: [r, r], popupAnchor: [0, -r - 4] })
}

export default function MapView({ result, pickupLocation, rerouteData }) {
  const [realRoute, setRealRoute] = useState(null)
  const [rerouteRoute, setRerouteRoute] = useState(null)
  const routeKey = useRef(null)
  const rerouteKey = useRef(null)

  const pickupPos = pickupLocation ? [pickupLocation.lat, pickupLocation.lng] : [18.5074, 73.8073]
  const selectedHosp = result?.selectedHospital
  const selectedId   = result?.selectedHospital?.id
  const nearestName  = result?._raw?.routing?.nearest_hospital

  const rerouteHosp = rerouteData?.routing?.recommended?.[0] ?? null

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
      .catch(() => setRealRoute([pickupPos, dest]))
  }, [selectedHosp?.id, pickupPos[0], pickupPos[1]])

  // Fetch OSRM route for rerouted hospital
  useEffect(() => {
    if (!rerouteHosp) { setRerouteRoute(null); rerouteKey.current = null; return }
    const key = `${pickupPos[0]},${pickupPos[1]}-${rerouteHosp.lat},${rerouteHosp.lng}`
    if (rerouteKey.current === key) return
    rerouteKey.current = key
    fetchOSRMRoute(pickupPos, [rerouteHosp.lat, rerouteHosp.lng])
      .then((pts) => pts && setRerouteRoute(pts))
      .catch(() => setRerouteRoute([pickupPos, [rerouteHosp.lat, rerouteHosp.lng]]))
  }, [rerouteHosp?.id, rerouteHosp?.lat, rerouteHosp?.lng])

  const activeRoute = rerouteRoute ?? realRoute
  const routeForFit = activeRoute ?? (selectedHosp ? [pickupPos, [selectedHosp.lat, selectedHosp.lng]] : null)

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
    {/* Road closure banner */}
    {rerouteHosp && (
      <div style={{
        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
        zIndex: 1000, background: 'rgba(255,149,0,0.95)', backdropFilter: 'blur(12px)',
        borderRadius: 14, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8,
        boxShadow: '0 4px 20px rgba(255,149,0,0.4)', border: '1px solid rgba(255,255,255,0.3)',
        whiteSpace: 'nowrap',
      }}>
        <span style={{ fontSize: 14 }}>⚠</span>
        <span style={{ color: 'white', fontWeight: 700, fontSize: 12 }}>Road Closure Active</span>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>→</span>
        <span style={{ color: 'white', fontWeight: 600, fontSize: 12 }}>{rerouteHosp.name}</span>
        <span style={{ background: 'rgba(255,255,255,0.25)', color: 'white', fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '1px 6px' }}>
          {Math.round(rerouteHosp.est_travel_minutes)} min
        </span>
      </div>
    )}

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

      {/* Original route — faded when rerouted */}
      {realRoute && (
        <>
          <Polyline positions={realRoute} pathOptions={{ color: '#007AFF', weight: 7, opacity: rerouteRoute ? 0.06 : 0.12, lineCap: 'round' }} />
          <Polyline positions={realRoute} pathOptions={{ color: '#007AFF', weight: 4, opacity: rerouteRoute ? 0.25 : 0.9, lineCap: 'round', lineJoin: 'round', dashArray: rerouteRoute ? '8 6' : undefined }} />
        </>
      )}

      {/* Rerouted road — orange, prominent */}
      {rerouteRoute && (
        <>
          <Polyline positions={rerouteRoute} pathOptions={{ color: '#FF9500', weight: 8, opacity: 0.15, lineCap: 'round' }} />
          <Polyline positions={rerouteRoute} pathOptions={{ color: '#FF9500', weight: 5, opacity: 1.0, lineCap: 'round', lineJoin: 'round' }} />
        </>
      )}

      {/* Hospital markers */}
      {hospitals.map((hospital) => {
        const icuAvail  = hospital.icu_available ?? hospital.icuAvailable ?? 0
        const icuTotal  = hospital.icuBeds ?? 10
        const isRerouted = rerouteHosp && hospital.id === rerouteHosp.id
        const isSelected = !rerouteHosp && hospital.id === selectedId
        const isNearest  = hospital.name === nearestName
        const eta = hospital.est_travel_minutes ?? hospital.eta ?? null

        return (
          <Marker key={hospital.id} position={[hospital.lat, hospital.lng]}
            icon={isRerouted ? createRerouteIcon(40) : createHospitalIcon(icuAvail, icuTotal, isSelected, isNearest)}>
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif', padding: '12px', minWidth: 180 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  {isRerouted && <span style={{ background: '#FF9500', color: 'white', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>⚠ REROUTED</span>}
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
    </div>
  )
}
