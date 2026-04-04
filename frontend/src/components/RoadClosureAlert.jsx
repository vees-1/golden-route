import React, { useState } from 'react'
import { AlertTriangle, RefreshCw, Loader } from 'lucide-react'
import HospitalCard from './HospitalCard'
import { HOSPITALS } from '../data/mockData'

const ROADS = [
  { id: 'expressway', label: 'Pune-Mumbai Expressway' },
  { id: 'fc_road',    label: 'FC Road / Ganeshkhind Rd' },
  { id: 'sh60',       label: 'SH-60 Solapur Road' },
]

function buildHospitalCardData(h) {
  const base = HOSPITALS.find((hh) => hh.id === h.id) ?? {}
  return {
    id:            h.id,
    name:          h.name,
    eta:           parseFloat(h.est_travel_minutes?.toFixed(1)),
    distance:      h.dist_km,
    icuAvailable:  h.icu_available ?? 0,
    icuBeds:       base.icuBeds ?? (h.icu_available ?? 0) + 4,
    ventsAvailable: h.vent_available ?? 0,
    ventilators:   base.ventilators ?? (h.vent_available ?? 0) + 3,
    specialties:   (h.specialists ?? []).map((s) => s.replace(/_/g, ' ')),
    survivalRate:  null,
    lat:           h.lat,
    lng:           h.lng,
  }
}

export default function RoadClosureAlert({ currentPatientPayload, currentHospital, onReroute }) {
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  if (!currentPatientPayload) return null

  function toggle(id) {
    setSelected((p) => p.includes(id) ? p.filter((r) => r !== id) : [...p, id])
  }

  async function simulate() {
    if (!selected.length) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('http://localhost:8000/road-closure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient: currentPatientPayload, closed_roads: selected }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      const newHosp = data.routing?.recommended?.[0]
      const rerouted = newHosp && currentHospital && newHosp.name !== currentHospital
      setResult({ ...data, rerouted, newHospital: newHosp })
      if (rerouted) onReroute?.(data)
    } catch (e) {
      setResult({ error: 'Recalculation failed.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={14} style={{ color: '#FF9500' }} />
        <p className="label" style={{ marginBottom: 0 }}>Road Closure Simulation</p>
      </div>

      <p className="text-xs mb-3" style={{ color: '#86868B' }}>Select closed roads to trigger dynamic re-routing</p>

      <div className="flex flex-col gap-1.5 mb-3">
        {ROADS.map((r) => (
          <label key={r.id} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)}
              className="rounded" style={{ accentColor: '#FF9500' }} />
            <span className="text-xs font-medium" style={{ color: '#1D1D1F' }}>{r.label}</span>
          </label>
        ))}
      </div>

      <button
        onClick={simulate}
        disabled={loading || !selected.length}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold"
        style={{
          background: selected.length ? '#FF9500' : '#E5E5EA',
          color: selected.length ? 'white' : '#86868B',
          border: 'none', cursor: selected.length ? 'pointer' : 'default',
        }}
      >
        {loading ? <><Loader size={12} className="animate-spin" />Recalculating…</> : <><RefreshCw size={12} />Simulate Closure</>}
      </button>

      {result && !result.error && (
        <div className="mt-3">
          {result.rerouted ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={13} style={{ color: '#FF9500' }} />
                <p className="text-xs font-bold" style={{ color: '#FF9500' }}>Re-route triggered</p>
                {result.newHospital?.road_closure_penalty_min > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(255,59,48,0.1)', color: '#FF3B30' }}>
                    +{result.newHospital.road_closure_penalty_min} min on closed roads
                  </span>
                )}
              </div>
              <p className="label mb-2">Rerouted Hospital</p>
              <HospitalCard hospital={buildHospitalCardData(result.newHospital)} isSelected={false} isRerouted />
            </>
          ) : (
            <div className="rounded-xl p-3" style={{ background: 'rgba(52,199,89,0.08)', border: '1px solid rgba(52,199,89,0.25)' }}>
              <p className="text-xs font-bold mb-1" style={{ color: '#34C759' }}>Route unchanged</p>
              <p className="text-xs" style={{ color: '#86868B' }}>{currentHospital} remains optimal despite closures.</p>
            </div>
          )}
        </div>
      )}

      {result?.error && <p className="mt-2 text-xs" style={{ color: '#FF3B30' }}>{result.error}</p>}
    </div>
  )
}
