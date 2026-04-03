import React, { useState } from 'react'
import { AlertTriangle, RefreshCw, Loader, X } from 'lucide-react'

const ROADS = [
  { id: 'expressway', label: 'Pune-Mumbai Expressway' },
  { id: 'fc_road',    label: 'FC Road / Ganeshkhind Rd' },
  { id: 'sh60',       label: 'SH-60 Solapur Road' },
]

export default function RoadClosureAlert({ currentPatientPayload, currentHospital, onReroute }) {
  const [open, setOpen] = useState(false)
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
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} style={{ color: '#FF9500' }} />
          <p className="label" style={{ marginBottom: 0 }}>Road Closure Simulation <span className="ml-1 text-xs font-normal" style={{ color: '#86868B' }}>Twist 2</span></p>
        </div>
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
        <div className="mt-3 rounded-xl p-3"
          style={{
            background: result.rerouted ? 'rgba(255,149,0,0.08)' : 'rgba(52,199,89,0.08)',
            border: `1px solid ${result.rerouted ? 'rgba(255,149,0,0.25)' : 'rgba(52,199,89,0.25)'}`,
          }}>
          {result.rerouted ? (
            <>
              <p className="text-xs font-bold mb-1" style={{ color: '#FF9500' }}>⚠ Re-route triggered</p>
              <p className="text-xs" style={{ color: '#3C3C43' }}>
                New optimal: <strong>{result.newHospital?.name}</strong>
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#86868B' }}>
                ETA: {Math.round(result.newHospital?.est_travel_minutes)} min
                {result.newHospital?.road_closure_penalty_min > 0 && (
                  <span style={{ color: '#FF3B30' }}> (+{result.newHospital.road_closure_penalty_min} min penalty on affected roads)</span>
                )}
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-bold mb-1" style={{ color: '#34C759' }}>Route unchanged</p>
              <p className="text-xs" style={{ color: '#86868B' }}>
                {currentHospital} remains optimal despite closures.
              </p>
            </>
          )}
        </div>
      )}
      {result?.error && <p className="mt-2 text-xs" style={{ color: '#FF3B30' }}>{result.error}</p>}
    </div>
  )
}
