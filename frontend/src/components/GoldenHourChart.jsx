import React, { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart, Label,
} from 'recharts'
import { GOLDEN_HOUR_DATA } from '../data/mockData'

const CONDITIONS = [
  { id: 'cardiac_arrest', label: 'Cardiac Arrest', ourETA: 8, nearestETA: 13 },
  { id: 'stroke',         label: 'Stroke',          ourETA: 12, nearestETA: 22 },
  { id: 'trauma',         label: 'Severe Trauma',    ourETA: 10, nearestETA: 18 },
  { id: 'respiratory',   label: 'Respiratory',       ourETA: 9, nearestETA: 16 },
]

function interpolate(data, t) {
  for (let i = 0; i < data.length - 1; i++) {
    if (t >= data[i].time && t <= data[i + 1].time) {
      const ratio = (t - data[i].time) / (data[i + 1].time - data[i].time)
      return data[i].survival + ratio * (data[i + 1].survival - data[i].survival)
    }
  }
  return data[data.length - 1].survival
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="px-3 py-2 rounded-xl text-sm"
        style={{
          background: 'rgba(29,29,31,0.92)',
          color: 'white',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <p className="font-semibold mb-1">t = {label} min</p>
        <p style={{ color: '#34C759' }}>Survival: {payload[0]?.value?.toFixed(1)}%</p>
      </div>
    )
  }
  return null
}

export default function GoldenHourChart() {
  const [conditionId, setConditionId] = useState('cardiac_arrest')
  const condition = CONDITIONS.find((c) => c.id === conditionId)
  const data = GOLDEN_HOUR_DATA[conditionId]

  const ourSurvival     = Math.round(interpolate(data, condition.ourETA))
  const nearestSurvival = Math.round(interpolate(data, condition.nearestETA))
  const diff = ourSurvival - nearestSurvival

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#1D1D1F' }}>Golden Hour Analysis</h2>
          <p className="text-sm mt-1" style={{ color: '#86868B' }}>
            Survival probability drops every minute. Our routing wins the race.
          </p>
        </div>
        <select
          className="custom-select"
          value={conditionId}
          onChange={(e) => setConditionId(e.target.value)}
        >
          {CONDITIONS.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard
          label="GoldenRoute ETA"
          value={`${condition.ourETA} min`}
          sub={`${ourSurvival}% survival`}
          color="#34C759"
          bg="rgba(52,199,89,0.08)"
          border="rgba(52,199,89,0.2)"
        />
        <StatCard
          label="Nearest Hospital ETA"
          value={`${condition.nearestETA} min`}
          sub={`${nearestSurvival}% survival`}
          color="#FF3B30"
          bg="rgba(255,59,48,0.06)"
          border="rgba(255,59,48,0.15)"
        />
        <StatCard
          label="Survival Advantage"
          value={`+${diff}%`}
          sub={`${condition.nearestETA - condition.ourETA} min faster`}
          color="#007AFF"
          bg="rgba(0,122,255,0.08)"
          border="rgba(0,122,255,0.2)"
        />
      </div>

      {/* Chart */}
      <div className="flex-1 card p-5" style={{ minHeight: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 32, bottom: 20, left: 16 }}>
            <defs>
              <linearGradient id="survivalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34C759" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#34C759" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: '#86868B', fontFamily: 'Inter' }}
              axisLine={false}
              tickLine={false}
              label={{
                value: 'Time (minutes)',
                position: 'insideBottom',
                offset: -10,
                style: { fill: '#86868B', fontSize: 11, fontFamily: 'Inter' },
              }}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11, fill: '#86868B', fontFamily: 'Inter' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* GoldenRoute ETA line */}
            <ReferenceLine
              x={condition.ourETA}
              stroke="#34C759"
              strokeWidth={2}
              strokeDasharray="5 3"
              label={{
                value: `GoldenRoute ${condition.ourETA}m`,
                position: 'top',
                style: { fill: '#34C759', fontSize: 11, fontWeight: 600, fontFamily: 'Inter' },
              }}
            />

            {/* Nearest hospital ETA line */}
            <ReferenceLine
              x={condition.nearestETA}
              stroke="#FF3B30"
              strokeWidth={2}
              strokeDasharray="5 3"
              label={{
                value: `Nearest ${condition.nearestETA}m`,
                position: 'top',
                style: { fill: '#FF3B30', fontSize: 11, fontWeight: 600, fontFamily: 'Inter' },
              }}
            />

            <Area
              type="monotone"
              dataKey="survival"
              stroke="#34C759"
              strokeWidth={3}
              fill="url(#survivalGradient)"
              dot={false}
              activeDot={{ r: 5, fill: '#34C759', strokeWidth: 2, stroke: 'white' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Annotation */}
      <div
        className="mt-4 rounded-2xl px-4 py-3 flex items-center gap-3"
        style={{
          background: 'linear-gradient(135deg, rgba(0,122,255,0.08), rgba(88,86,214,0.06))',
          border: '1px solid rgba(0,122,255,0.15)',
        }}
      >
        <span className="text-2xl">⚡</span>
        <p className="text-sm" style={{ color: '#3C3C43' }}>
          <strong style={{ color: '#007AFF' }}>GoldenRoute arrives {condition.nearestETA - condition.ourETA} minutes earlier</strong>
          {' '}— translating to a{' '}
          <strong style={{ color: '#34C759' }}>+{diff}% improvement in survival</strong>
          {' '}for {condition.label.toLowerCase()} patients.
        </p>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color, bg, border }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <p className="text-xs font-medium mb-2" style={{ color: '#86868B' }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs mt-1 font-medium" style={{ color }}>{sub}</p>
    </div>
  )
}
