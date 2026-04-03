import React, { useState } from 'react'
import { HOSPITALS } from '../data/mockData'

const SPECIALTIES_COLOR = {
  'Cardiac':      '#FF3B30',
  'Neurology':    '#5856D6',
  'Trauma':       '#FF9500',
  'Orthopedics':  '#34C759',
  'Surgery':      '#007AFF',
  'General':      '#86868B',
  'Oncology':     '#AF52DE',
  'Burns':        '#FF6B35',
  'Pediatrics':   '#FF2D55',
  'Neurosurgery': '#5AC8FA',
}

function LoadBar({ pct, color }) {
  return (
    <div className="h-1.5 rounded-full w-full" style={{ background: '#F2F2F7' }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function StatusDot({ available, total }) {
  const pct = (available / total) * 100
  const color = pct > 40 ? '#34C759' : pct > 15 ? '#FF9500' : '#FF3B30'
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
      <span className="text-xs font-bold tabular-nums" style={{ color }}>
        {available}<span className="font-normal" style={{ color: '#86868B' }}>/{total}</span>
      </span>
    </div>
  )
}

export default function HospitalStatusView({ lastResult }) {
  const [filter, setFilter] = useState('all')

  const recommended = lastResult?.routing?.recommended?.[0]?.name

  const filtered = HOSPITALS.filter((h) => {
    if (filter === 'icu')  return h.icuAvailable > 0
    if (filter === 'vent') return h.ventsAvailable > 0
    return true
  })

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#1D1D1F' }}>Hospital Network Status</h2>
          <p className="text-sm mt-1" style={{ color: '#86868B' }}>
            Live capacity across all Pune hospitals — refreshed per dispatch
          </p>
        </div>
        <div className="flex gap-2">
          {[['all', 'All'], ['icu', 'ICU Available'], ['vent', 'Ventilator Available']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={{
                background: filter === id ? 'linear-gradient(135deg,#007AFF,#5856D6)' : '#F5F5F7',
                color: filter === id ? 'white' : '#1D1D1F',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 overflow-y-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {filtered.map((h) => {
          const icuPct   = (h.icuAvailable / h.icuBeds) * 100
          const ventPct  = (h.ventsAvailable / h.ventilators) * 100
          const loadColor = icuPct > 40 ? '#34C759' : icuPct > 15 ? '#FF9500' : '#FF3B30'
          const isRecommended = h.name === recommended

          return (
            <div
              key={h.id}
              className="rounded-2xl p-4 transition-all duration-200"
              style={{
                background: isRecommended ? 'linear-gradient(135deg, rgba(0,122,255,0.06), rgba(88,86,214,0.04))' : 'white',
                border: isRecommended ? '1.5px solid rgba(0,122,255,0.3)' : '1px solid #F2F2F7',
                boxShadow: isRecommended ? '0 4px 20px rgba(0,122,255,0.12)' : '0 1px 6px rgba(0,0,0,0.04)',
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold" style={{ color: '#1D1D1F' }}>{h.name}</p>
                    {isRecommended && (
                      <span className="px-1.5 py-0.5 rounded-md text-xs font-bold" style={{ background: 'rgba(0,122,255,0.1)', color: '#007AFF' }}>
                        Last routed
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: '#86868B' }}>ETA ~{h.eta} min · {h.distance} km</p>
                </div>
                <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ background: loadColor }} />
              </div>

              {/* ICU & Vents */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-xs mb-1" style={{ color: '#86868B' }}>ICU Beds</p>
                  <StatusDot available={h.icuAvailable} total={h.icuBeds} />
                  <div className="mt-1.5">
                    <LoadBar pct={icuPct} color={loadColor} />
                  </div>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: '#86868B' }}>Ventilators</p>
                  <StatusDot available={h.ventsAvailable} total={h.ventilators} />
                  <div className="mt-1.5">
                    <LoadBar pct={ventPct} color={ventPct > 40 ? '#34C759' : ventPct > 15 ? '#FF9500' : '#FF3B30'} />
                  </div>
                </div>
              </div>

              {/* Survival rate */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs" style={{ color: '#86868B' }}>Survival rate</p>
                <p className="text-xs font-bold" style={{ color: '#34C759' }}>{h.survivalRate}%</p>
              </div>

              {/* Specialties */}
              <div className="flex flex-wrap gap-1">
                {h.specialties.map((s) => (
                  <span
                    key={s}
                    className="px-1.5 py-0.5 rounded-md text-xs font-medium"
                    style={{
                      background: `${SPECIALTIES_COLOR[s] || '#86868B'}15`,
                      color: SPECIALTIES_COLOR[s] || '#86868B',
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
