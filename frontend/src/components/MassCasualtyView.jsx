import React, { useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet'
import L from 'leaflet'
import { MASS_CASUALTY_PATIENTS, HOSPITALS } from '../data/mockData'
import { Users, TrendingUp, Clock, AlertTriangle } from 'lucide-react'

const TRIAGE_CONFIG = {
  RED:    { color: '#FF3B30', bg: 'rgba(255,59,48,0.1)',  border: 'rgba(255,59,48,0.25)',  label: 'Immediate' },
  YELLOW: { color: '#FF9500', bg: 'rgba(255,149,0,0.1)', border: 'rgba(255,149,0,0.25)', label: 'Delayed' },
  GREEN:  { color: '#34C759', bg: 'rgba(52,199,89,0.1)', border: 'rgba(52,199,89,0.25)', label: 'Minor' },
}

const MOCK_ROUTES = [
  { patient: 'P001', path: [[18.52, 73.856], [18.527, 73.869], [18.5308, 73.8774]], color: '#FF3B30' },
  { patient: 'P002', path: [[18.52, 73.856], [18.524, 73.868], [18.527, 73.8755]], color: '#FF3B30' },
  { patient: 'P003', path: [[18.52, 73.856], [18.516, 73.861], [18.512, 73.868]],  color: '#FF9500' },
  { patient: 'P004', path: [[18.52, 73.856], [18.513, 73.855], [18.5074, 73.831]], color: '#FF3B30' },
]

function createPatientIcon(triage) {
  const c = TRIAGE_CONFIG[triage]
  const svg = `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="${c.color}" stroke="white" stroke-width="2.5"
        filter="url(#ps)" />
      <text x="16" y="20" text-anchor="middle" font-family="Inter" font-size="12"
        font-weight="800" fill="white">${triage[0]}</text>
      <defs>
        <filter id="ps"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="${c.color}" flood-opacity="0.4"/></filter>
      </defs>
    </svg>`
  return L.divIcon({ html: svg, className: '', iconSize: [32, 32], iconAnchor: [16, 16] })
}

function createHospIcon(id) {
  const svg = `
    <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
      <circle cx="15" cy="15" r="13" fill="#007AFF" stroke="white" stroke-width="2.5"/>
      <text x="15" y="19" text-anchor="middle" font-family="Inter" font-size="9" font-weight="700" fill="white">H</text>
    </svg>`
  return L.divIcon({ html: svg, className: '', iconSize: [30, 30], iconAnchor: [15, 15] })
}

const PATIENT_POSITIONS = [
  [18.5200, 73.8500],
  [18.5150, 73.8620],
  [18.5260, 73.8450],
  [18.5180, 73.8700],
  [18.5100, 73.8550],
  [18.5300, 73.8600],
  [18.5220, 73.8750],
]

export default function MassCasualtyView() {
  const [selectedPatient, setSelectedPatient] = useState(null)

  const red    = MASS_CASUALTY_PATIENTS.filter((p) => p.triage === 'RED')
  const yellow = MASS_CASUALTY_PATIENTS.filter((p) => p.triage === 'YELLOW')
  const green  = MASS_CASUALTY_PATIENTS.filter((p) => p.triage === 'GREEN')

  return (
    <div className="flex flex-col h-full gap-4 animate-fade-in">
      {/* Top: 3 panes */}
      <div className="flex gap-4" style={{ flex: 1, minHeight: 0 }}>
        {/* Left: Patient triage list */}
        <div className="flex flex-col gap-3" style={{ width: 280, flexShrink: 0 }}>
          <div>
            <p className="label mb-2">
              Triage Queue
              <span
                className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(255,59,48,0.1)', color: '#FF3B30' }}
              >
                {MASS_CASUALTY_PATIENTS.length} patients
              </span>
            </p>
            <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 420 }}>
              {[...red, ...yellow, ...green].map((p, i) => {
                const tc = TRIAGE_CONFIG[p.triage]
                return (
                  <div
                    key={p.id}
                    className="rounded-2xl p-3 cursor-pointer transition-all duration-200"
                    style={{
                      background: selectedPatient === p.id ? tc.bg : '#ffffff',
                      border: `1px solid ${selectedPatient === p.id ? tc.border : '#F2F2F7'}`,
                      boxShadow: selectedPatient === p.id
                        ? `0 4px 16px ${tc.color}25`
                        : '0 1px 6px rgba(0,0,0,0.04)',
                      transform: selectedPatient === p.id ? 'scale(1.01)' : 'scale(1)',
                    }}
                    onClick={() => setSelectedPatient(selectedPatient === p.id ? null : p.id)}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded-md text-xs font-black"
                          style={{ background: tc.color, color: 'white', letterSpacing: 0.5 }}
                        >
                          {p.triage}
                        </span>
                        <span className="text-xs font-semibold" style={{ color: '#1D1D1F' }}>
                          {p.name}, {p.age}
                        </span>
                      </div>
                      <span className="text-xs" style={{ color: '#86868B' }}>{p.id}</span>
                    </div>
                    <p className="text-xs font-medium mb-1.5" style={{ color: '#3C3C43' }}>{p.condition}</p>
                    <div className="flex gap-2">
                      <VitalPill label="HR" value={p.vitals.hr === 0 ? 'N/A' : p.vitals.hr} unit={p.vitals.hr === 0 ? '' : 'bpm'} />
                      <VitalPill label="SpO₂" value={p.vitals.spo2} unit="%" />
                      <VitalPill label="GCS" value={p.vitals.gcs} unit="/15" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Center: Map */}
        <div className="flex-1 rounded-2xl overflow-hidden" style={{ minHeight: 0 }}>
          <MapContainer
            center={[18.515, 73.865]}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            />
            {MASS_CASUALTY_PATIENTS.map((p, i) => (
              <Marker
                key={p.id}
                position={PATIENT_POSITIONS[i] || [18.52, 73.856]}
                icon={createPatientIcon(p.triage)}
              >
                <Popup>
                  <div style={{ fontFamily: 'Inter', padding: 10 }}>
                    <p style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</p>
                    <p style={{ fontSize: 11, color: '#86868B' }}>{p.condition}</p>
                    <p style={{ fontSize: 11, color: '#007AFF', marginTop: 4 }}>→ {p.assignedHospital}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
            {HOSPITALS.slice(0, 6).map((h) => (
              <Marker key={h.id} position={[h.lat, h.lng]} icon={createHospIcon(h.id)}>
                <Popup>
                  <div style={{ fontFamily: 'Inter', padding: 10 }}>
                    <p style={{ fontWeight: 700, fontSize: 12 }}>{h.name}</p>
                    <p style={{ fontSize: 11, color: '#34C759' }}>ICU: {h.icuAvailable}/{h.icuBeds}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
            {MOCK_ROUTES.map((r) => (
              <React.Fragment key={r.patient}>
                <Polyline positions={r.path} pathOptions={{ color: r.color, weight: 3, opacity: 0.7, dashArray: '6 4' }} />
              </React.Fragment>
            ))}
          </MapContainer>
        </div>

        {/* Right: Comparison */}
        <div className="flex flex-col gap-3" style={{ width: 260, flexShrink: 0 }}>
          <p className="label">Routing Comparison</p>

          {/* Naive */}
          <div
            className="rounded-2xl p-4"
            style={{ background: 'rgba(255,59,48,0.05)', border: '1px solid rgba(255,59,48,0.15)' }}
          >
            <p className="text-xs font-semibold mb-1" style={{ color: '#86868B' }}>
              Naive Routing (Nearest)
            </p>
            <p className="text-3xl font-bold" style={{ color: '#FF3B30' }}>72.4%</p>
            <p className="text-xs mt-1" style={{ color: '#86868B' }}>avg survival rate</p>
            <div className="mt-2 h-1.5 rounded-full" style={{ background: '#FFE5E3' }}>
              <div className="h-full rounded-full" style={{ width: '72.4%', background: '#FF3B30' }} />
            </div>
          </div>

          {/* AI */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: 'linear-gradient(135deg, rgba(52,199,89,0.08), rgba(48,209,88,0.04))',
              border: '1px solid rgba(52,199,89,0.25)',
            }}
          >
            <p className="text-xs font-semibold mb-1" style={{ color: '#86868B' }}>
              GoldenRoute AI
            </p>
            <p className="text-3xl font-bold" style={{ color: '#34C759' }}>89.1%</p>
            <p className="text-xs mt-1" style={{ color: '#86868B' }}>avg survival rate</p>
            <div className="mt-2 h-1.5 rounded-full" style={{ background: '#E8F8EE' }}>
              <div className="h-full rounded-full" style={{ width: '89.1%', background: '#34C759' }} />
            </div>
          </div>

          {/* Lives saved badge */}
          <div
            className="rounded-2xl p-4 text-center"
            style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}
          >
            <p className="text-xs font-semibold text-white opacity-80 mb-1">Lives Saved</p>
            <p className="text-4xl font-black text-white">+1.3</p>
            <p className="text-xs text-white opacity-70 mt-1">per incident (projected)</p>
          </div>

          {/* Triage summary */}
          <div className="rounded-2xl p-3" style={{ background: '#ffffff', border: '1px solid #F2F2F7' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: '#86868B' }}>Triage Summary</p>
            {Object.entries(TRIAGE_CONFIG).map(([k, v]) => {
              const count = MASS_CASUALTY_PATIENTS.filter((p) => p.triage === k).length
              return (
                <div key={k} className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: v.color }} />
                    <span className="text-xs font-medium" style={{ color: '#1D1D1F' }}>{v.label}</span>
                  </div>
                  <span className="text-xs font-bold" style={{ color: v.color }}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom: Assignment table */}
      <div className="card p-4" style={{ flexShrink: 0 }}>
        <p className="label mb-3">Patient Assignment Table</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #F2F2F7' }}>
                {['Patient', 'Condition', 'Triage', 'Assigned Hospital', 'ETA', 'AI Reasoning'].map((h) => (
                  <th key={h} className="text-left pb-2 pr-4" style={{ color: '#86868B', fontWeight: 600, fontSize: 11, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MASS_CASUALTY_PATIENTS.map((p, i) => {
                const tc = TRIAGE_CONFIG[p.triage]
                return (
                  <tr key={p.id} style={{ borderBottom: i < MASS_CASUALTY_PATIENTS.length - 1 ? '1px solid #F9F9F9' : 'none' }}>
                    <td className="py-2.5 pr-4">
                      <p className="font-semibold text-xs" style={{ color: '#1D1D1F' }}>{p.name}</p>
                      <p className="text-xs" style={{ color: '#86868B' }}>{p.id}, age {p.age}</p>
                    </td>
                    <td className="py-2.5 pr-4 text-xs font-medium" style={{ color: '#3C3C43' }}>{p.condition}</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className="px-2 py-0.5 rounded-md text-xs font-bold"
                        style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}
                      >
                        {p.triage}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-xs font-medium" style={{ color: '#1D1D1F' }}>{p.assignedHospital}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-1">
                        <Clock size={11} color="#007AFF" />
                        <span className="text-xs font-bold" style={{ color: '#007AFF' }}>{p.eta} min</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-xs" style={{ color: '#86868B', maxWidth: 200 }}>{p.reason}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function VitalPill({ label, value, unit }) {
  return (
    <div
      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
      style={{ background: '#F5F5F7' }}
    >
      <span style={{ fontSize: 9, color: '#86868B', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 10, color: '#1D1D1F', fontWeight: 700 }}>{value}{unit}</span>
    </div>
  )
}
