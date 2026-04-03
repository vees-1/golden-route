import React, { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { GOLDEN_HOUR_DATA } from '../data/mockData'

const CONDITION_MAP = {
  cardiac_arrest:           'cardiac_arrest',
  STEMI:                    'cardiac_arrest',
  acute_stroke:             'stroke',
  severe_trauma:            'trauma',
  moderate_trauma:          'trauma',
  respiratory_failure:      'respiratory',
  chest_pain_unstable_angina: 'respiratory',
  allergic_anaphylaxis:     'respiratory',
  drowning:                 'cardiac_arrest',
  seizure_episode:          'stroke',
  spinal_injury:            'trauma',
  abdominal_emergency:      'trauma',
  diabetic_crisis:          'stroke',
  minor_fracture:           'trauma',
}

const CONDITIONS = [
  { id: 'cardiac_arrest', label: 'Cardiac Arrest' },
  { id: 'stroke',         label: 'Stroke' },
  { id: 'trauma',         label: 'Severe Trauma' },
  { id: 'respiratory',   label: 'Respiratory' },
]

function interpolate(data, t) {
  for (let i = 0; i < data.length - 1; i++) {
    if (t >= data[i].time && t <= data[i + 1].time) {
      const ratio = (t - data[i].time) / (data[i + 1].time - data[i].time)
      return data[i].survival + ratio * (data[i + 1].survival - data[i].survival)
    }
  }
  return data[data.length - 1]?.survival ?? 0
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded-xl text-sm" style={{ background: 'rgba(29,29,31,0.92)', color: 'white', backdropFilter: 'blur(12px)' }}>
      <p className="font-semibold mb-1">t = {label} min</p>
      <p style={{ color: '#34C759' }}>Survival: {payload[0]?.value?.toFixed(1)}%</p>
    </div>
  )
}

export default function GoldenHourChart({ result }) {
  const apiCondition = result?.survival?.condition
  const mappedId = apiCondition ? (CONDITION_MAP[apiCondition] || 'cardiac_arrest') : null

  const [conditionId, setConditionId] = useState('cardiac_arrest')
  const activeId = mappedId || conditionId

  const data = GOLDEN_HOUR_DATA[activeId]

  const ourETA     = result?.routing?.recommended?.[0]?.est_travel_minutes ?? 8
  const nearestETA = (() => {
    const name = result?.routing?.nearest_hospital
    const all  = [...(result?.routing?.recommended ?? []), ...(result?.routing?.infeasible ?? [])]
    return all.find((h) => h.name === name)?.est_travel_minutes ?? 13
  })()

  const ourSurvival     = Math.round(interpolate(data, ourETA))
  const nearestSurvival = Math.round(interpolate(data, nearestETA))
  const diff = ourSurvival - nearestSurvival

  const conditionLabel = CONDITIONS.find((c) => c.id === activeId)?.label ?? activeId

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#1D1D1F' }}>Golden Hour Analysis</h2>
          <p className="text-sm mt-1" style={{ color: '#86868B' }}>
            {result ? `Showing curve for ${conditionLabel} — from last dispatch` : 'Survival probability drops every minute. Our routing wins the race.'}
          </p>
        </div>
        {!mappedId && (
          <select
            className="custom-select"
            value={conditionId}
            onChange={(e) => setConditionId(e.target.value)}
          >
            {CONDITIONS.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <StatCard label="GoldenRoute ETA"     value={`${Math.round(ourETA)} min`}     sub={`${ourSurvival}% survival`}     color="#34C759" bg="rgba(52,199,89,0.08)"   border="rgba(52,199,89,0.2)" />
        <StatCard label="Nearest Hospital ETA" value={`${Math.round(nearestETA)} min`} sub={`${nearestSurvival}% survival`} color="#FF3B30" bg="rgba(255,59,48,0.06)"   border="rgba(255,59,48,0.15)" />
        <StatCard label="Survival Advantage"   value={`+${diff}%`}                     sub={`${Math.round(nearestETA - ourETA)} min faster`} color="#007AFF" bg="rgba(0,122,255,0.08)" border="rgba(0,122,255,0.2)" />
      </div>

      <div className="card p-5 flex-1" style={{ minHeight: 280 }}>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 24, right: 32, bottom: 20, left: 16 }}>
            <defs>
              <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#34C759" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#34C759" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" vertical={false} />
            <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#86868B', fontFamily: 'Inter' }} axisLine={false} tickLine={false}
              label={{ value: 'Time (minutes)', position: 'insideBottom', offset: -10, style: { fill: '#86868B', fontSize: 11 } }} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#86868B', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x={Math.round(ourETA)} stroke="#34C759" strokeWidth={2} strokeDasharray="5 3"
              label={{ value: `GoldenRoute ${Math.round(ourETA)}m`, position: 'top', style: { fill: '#34C759', fontSize: 11, fontWeight: 600, fontFamily: 'Inter' } }} />
            <ReferenceLine x={Math.round(nearestETA)} stroke="#FF3B30" strokeWidth={2} strokeDasharray="5 3"
              label={{ value: `Nearest ${Math.round(nearestETA)}m`, position: 'top', style: { fill: '#FF3B30', fontSize: 11, fontWeight: 600, fontFamily: 'Inter' } }} />
            <Area type="monotone" dataKey="survival" stroke="#34C759" strokeWidth={3} fill="url(#sg)" dot={false}
              activeDot={{ r: 5, fill: '#34C759', strokeWidth: 2, stroke: 'white' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 rounded-2xl px-4 py-3 flex items-center gap-3"
        style={{ background: 'linear-gradient(135deg, rgba(0,122,255,0.08), rgba(88,86,214,0.06))', border: '1px solid rgba(0,122,255,0.15)' }}>
        <span className="text-2xl">⚡</span>
        <p className="text-sm" style={{ color: '#3C3C43' }}>
          <strong style={{ color: '#007AFF' }}>GoldenRoute arrives {Math.round(nearestETA - ourETA)} minutes earlier</strong>
          {' '}— translating to a{' '}
          <strong style={{ color: '#34C759' }}>+{diff}% improvement in survival</strong>
          {' '}for {conditionLabel.toLowerCase()} patients.
        </p>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color, bg, border }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: bg, border: `1px solid ${border}` }}>
      <p className="text-xs font-medium mb-2" style={{ color: '#86868B' }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs mt-1 font-medium" style={{ color }}>{sub}</p>
    </div>
  )
}
