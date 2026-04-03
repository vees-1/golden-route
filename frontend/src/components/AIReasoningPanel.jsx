import React from 'react'
import { Brain, Zap, Shield, AlertTriangle } from 'lucide-react'

export default function AIReasoningPanel({ explanation, hospital }) {
  if (!explanation || !hospital) return null

  return (
    <div className="animate-fade-in space-y-3">
      <p className="label">AI Decision Reasoning</p>

      {/* Main explanation */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'linear-gradient(135deg, rgba(0,122,255,0.06), rgba(88,86,214,0.04))',
          border: '1px solid rgba(0,122,255,0.15)',
        }}
      >
        <div className="flex gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}
          >
            <Brain size={14} color="white" />
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#3C3C43' }}>
            {explanation}
          </p>
        </div>
      </div>

      {/* Key factors */}
      <div className="grid grid-cols-1 gap-2">
        <FactorRow
          icon={<Zap size={12} color="#34C759" />}
          label="Response Time Advantage"
          value={`${hospital.eta} min`}
          color="#34C759"
          bg="rgba(52,199,89,0.08)"
        />
        <FactorRow
          icon={<Shield size={12} color="#007AFF" />}
          label="Specialist Availability"
          value={hospital.specialties.slice(0, 2).join(', ')}
          color="#007AFF"
          bg="rgba(0,122,255,0.06)"
        />
        <FactorRow
          icon={<AlertTriangle size={12} color="#FF9500" />}
          label="ICU Capacity"
          value={`${hospital.icuAvailable} beds free`}
          color="#FF9500"
          bg="rgba(255,149,0,0.08)"
        />
      </div>
    </div>
  )
}

function FactorRow({ icon, label, value, color, bg }) {
  return (
    <div
      className="flex items-center justify-between rounded-xl px-3 py-2"
      style={{ background: bg }}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium" style={{ color: '#86868B' }}>{label}</span>
      </div>
      <span className="text-xs font-bold" style={{ color }}>{value}</span>
    </div>
  )
}
