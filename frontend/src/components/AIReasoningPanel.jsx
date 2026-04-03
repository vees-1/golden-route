import React from 'react'
import { Brain, Zap, Shield, AlertTriangle } from 'lucide-react'

function renderMarkdown(text) {
  const lines = text.split('\n')
  const elements = []
  let key = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (!line.trim()) {
      elements.push(<div key={key++} style={{ height: 8 }} />)
      continue
    }

    if (line.startsWith('## ')) {
      elements.push(
        <p key={key++} className="text-sm font-bold mt-1" style={{ color: '#1D1D1F' }}>
          {inlineFormat(line.slice(3))}
        </p>
      )
      continue
    }

    if (line.startsWith('# ')) {
      elements.push(
        <p key={key++} className="text-sm font-bold" style={{ color: '#1D1D1F' }}>
          {inlineFormat(line.slice(2))}
        </p>
      )
      continue
    }

    if (line.startsWith('> ')) {
      elements.push(
        <div key={key++} className="pl-3 my-1" style={{ borderLeft: '3px solid #FF9500' }}>
          <p className="text-xs italic" style={{ color: '#86868B' }}>{inlineFormat(line.slice(2))}</p>
        </div>
      )
      continue
    }

    elements.push(
      <p key={key++} className="text-sm leading-relaxed" style={{ color: '#3C3C43' }}>
        {inlineFormat(line)}
      </p>
    )
  }

  return elements
}

function inlineFormat(text) {
  const parts = []
  const regex = /\*\*(.+?)\*\*/g
  let last = 0
  let match
  let i = 0

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(<span key={i++}>{text.slice(last, match.index)}</span>)
    parts.push(<strong key={i++} style={{ color: '#1D1D1F', fontWeight: 700 }}>{match[1]}</strong>)
    last = regex.lastIndex
  }

  if (last < text.length) parts.push(<span key={i++}>{text.slice(last)}</span>)
  return parts.length > 0 ? parts : text
}

export default function AIReasoningPanel({ explanation, hospital }) {
  if (!explanation || !hospital) return null

  return (
    <div className="animate-fade-in space-y-3">
      <p className="label">AI Decision Reasoning</p>

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
          <div className="flex-1 space-y-1">
            {renderMarkdown(explanation)}
          </div>
        </div>
      </div>

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
