import React, { useState, useEffect, useRef } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import { SIMULATION_DATA } from '../data/mockData'
import { Play, Pause, RotateCcw, Zap, Users, TrendingUp, Activity } from 'lucide-react'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="px-3 py-3 rounded-xl text-sm"
        style={{
          background: 'rgba(29,29,31,0.93)',
          color: 'white',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
            <span style={{ color: '#86868B', fontSize: 11 }}>{p.name}:</span>
            <span className="font-bold" style={{ color: p.color }}>{p.value}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function SimulationView() {
  const [currentHour, setCurrentHour] = useState(12)
  const [isPlaying, setIsPlaying] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentHour((h) => {
          if (h >= 24) {
            setIsPlaying(false)
            return 24
          }
          return h + 1
        })
      }, 600)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [isPlaying])

  const visibleData = SIMULATION_DATA.slice(0, currentHour + 1)
  const currentData = SIMULATION_DATA[currentHour] || SIMULATION_DATA[SIMULATION_DATA.length - 1]
  const finalData   = SIMULATION_DATA[24]

  const tradTotal  = currentData?.traditional || 0
  const aiTotal    = currentData?.ai || 0
  const livesSaved = Math.round((aiTotal - tradTotal) * 10) / 10

  return (
    <div className="flex flex-col h-full gap-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#1D1D1F' }}>City-Wide Simulation</h2>
          <p className="text-sm mt-1" style={{ color: '#86868B' }}>
            24-hour comparison: Traditional dispatch vs GoldenRoute AI across all Pune emergencies
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all"
            style={{
              background: '#F5F5F7',
              color: '#1D1D1F',
              border: '1px solid #E5E5EA',
            }}
            onClick={() => { setCurrentHour(0); setIsPlaying(false) }}
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <button
            className="flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm transition-all"
            style={{
              background: isPlaying
                ? 'rgba(255,59,48,0.1)'
                : 'linear-gradient(135deg, #007AFF, #5856D6)',
              color: isPlaying ? '#FF3B30' : 'white',
              border: isPlaying ? '1px solid rgba(255,59,48,0.2)' : 'none',
              boxShadow: isPlaying ? 'none' : '0 4px 16px rgba(0,122,255,0.3)',
            }}
            onClick={() => setIsPlaying((p) => !p)}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            {isPlaying ? 'Pause' : 'Run Simulation'}
          </button>
        </div>
      </div>

      {/* Timeline scrubber */}
      <div className="card px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <p className="label">Timeline</p>
          <span className="text-sm font-bold" style={{ color: '#007AFF' }}>
            {String(currentHour).padStart(2, '0')}:00
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={24}
          value={currentHour}
          onChange={(e) => { setCurrentHour(Number(e.target.value)); setIsPlaying(false) }}
          className="slider-input w-full"
          style={{
            background: `linear-gradient(to right, #007AFF ${(currentHour / 24) * 100}%, #E5E5EA ${(currentHour / 24) * 100}%)`,
          }}
        />
        <div className="flex justify-between mt-1">
          {[0, 4, 8, 12, 16, 20, 24].map((h) => (
            <span key={h} className="text-xs" style={{ color: '#86868B' }}>{h}:00</span>
          ))}
        </div>
      </div>

      {/* Split stats */}
      <div className="grid grid-cols-2 gap-4">
        {/* Traditional */}
        <div
          className="card p-4"
          style={{ borderLeft: '4px solid #FF3B30' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: '#FF3B30' }} />
              <p className="text-sm font-bold" style={{ color: '#1D1D1F' }}>Traditional Dispatch</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(255,59,48,0.08)', color: '#FF3B30', fontWeight: 600 }}>
              Nearest-first
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Survivors" value={Math.round(tradTotal)} color="#FF3B30" />
            <MiniStat label="Avg Survival" value={`${(68 + (currentHour / 24) * 4).toFixed(1)}%`} color="#FF9500" />
            <MiniStat label="Emergencies" value={currentHour * 5 + 3} color="#86868B" />
          </div>
        </div>

        {/* AI */}
        <div
          className="card p-4"
          style={{ borderLeft: '4px solid #34C759' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: '#34C759' }} />
              <p className="text-sm font-bold" style={{ color: '#1D1D1F' }}>GoldenRoute AI</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(52,199,89,0.1)', color: '#34C759', fontWeight: 600 }}>
              Survival-optimized
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Survivors" value={Math.round(aiTotal)} color="#34C759" />
            <MiniStat label="Avg Survival" value={`${(84 + (currentHour / 24) * 3).toFixed(1)}%`} color="#34C759" />
            <MiniStat label="Emergencies" value={currentHour * 5 + 3} color="#86868B" />
          </div>
        </div>
      </div>

      {/* Lives saved banner */}
      <div
        className="rounded-2xl p-4 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)', boxShadow: '0 8px 24px rgba(0,122,255,0.3)' }}
      >
        <div className="flex items-center gap-3">
          <Zap size={20} color="white" />
          <div>
            <p className="text-sm font-semibold text-white opacity-80">Additional lives saved by GoldenRoute</p>
            <p className="text-xs text-white opacity-60">at current simulation time ({currentHour}:00)</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl font-black text-white">+{livesSaved}</p>
          <p className="text-xs text-white opacity-70">projected survivors</p>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 card p-5" style={{ minHeight: 260 }}>
        <p className="label mb-4">Cumulative Survivors Over Time</p>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visibleData} margin={{ top: 8, right: 24, bottom: 16, left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#86868B', fontFamily: 'Inter' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#86868B', fontFamily: 'Inter' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontFamily: 'Inter', fontSize: 12, paddingTop: 8 }}
              formatter={(value) => (
                <span style={{ color: '#1D1D1F', fontWeight: 500 }}>
                  {value === 'traditional' ? 'Traditional' : 'GoldenRoute AI'}
                </span>
              )}
            />
            <Line
              type="monotone"
              dataKey="traditional"
              stroke="#FF3B30"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: '#FF3B30', strokeWidth: 2, stroke: 'white' }}
              name="traditional"
            />
            <Line
              type="monotone"
              dataKey="ai"
              stroke="#34C759"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 4, fill: '#34C759', strokeWidth: 2, stroke: 'white' }}
              name="ai"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <div className="text-center">
      <p className="text-xl font-bold tabular-nums" style={{ color }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: '#86868B' }}>{label}</p>
    </div>
  )
}
