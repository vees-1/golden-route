import React, { useState } from 'react'
import { Brain, Loader } from 'lucide-react'

const SECTION_COLORS = {
  'Incident Overview': '#007AFF',
  'Patient Distribution': '#FF9500',
  'Load Balance': '#34C759',
  'Critical Alerts': '#FF3B30',
  'Coordinator Recommendation': '#5856D6',
}

function getSectionColor(heading) {
  for (const [key, color] of Object.entries(SECTION_COLORS)) {
    if (heading.includes(key)) return color
  }
  return '#007AFF'
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

function parseBriefing(text) {
  const sections = []
  const lines = text.split('\n')
  let current = null

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (current) sections.push(current)
      current = { heading: line.slice(3).trim(), lines: [] }
    } else if (current) {
      current.lines.push(line)
    }
  }
  if (current) sections.push(current)
  return sections
}

function renderLines(lines) {
  const elements = []
  let key = 0
  for (const line of lines) {
    if (!line.trim()) {
      elements.push(<div key={key++} style={{ height: 4 }} />)
      continue
    }
    if (line.trimStart().startsWith('- ')) {
      const content = line.trimStart().slice(2)
      elements.push(
        <div key={key++} className="flex gap-2 items-start" style={{ marginBottom: 4 }}>
          <span style={{ color: '#86868B', marginTop: 2, flexShrink: 0 }}>•</span>
          <p className="text-xs leading-relaxed" style={{ color: '#3C3C43' }}>{inlineFormat(content)}</p>
        </div>
      )
      continue
    }
    elements.push(
      <p key={key++} className="text-xs leading-relaxed" style={{ color: '#3C3C43', marginBottom: 2 }}>
        {inlineFormat(line)}
      </p>
    )
  }
  return elements
}

export default function MCICoordinator({ results }) {
  const [briefing, setBriefing] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('http://localhost:8000/mci-coordinate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: results.title, results: results.results }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Request failed')
      }
      const data = await res.json()
      setBriefing(data.briefing)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const sections = briefing ? parseBriefing(briefing) : []

  return (
    <div className="card p-4" style={{ flexShrink: 0 }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1D1D1F,#3C3C43)' }}>
            <Brain size={13} color="white" />
          </div>
          <p className="text-sm font-bold" style={{ color: '#1D1D1F' }}>AI Coordinator Brief</p>
        </div>
        {!briefing && (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: loading ? '#E5E5EA' : 'linear-gradient(135deg,#1D1D1F,#3C3C43)',
              color: loading ? '#86868B' : 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading
              ? <><Loader size={13} className="animate-spin" />Generating...</>
              : <><Brain size={13} />Generate Coordination Brief</>
            }
          </button>
        )}
        {briefing && (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium"
            style={{ background: '#F5F5F7', color: '#86868B', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? <><Loader size={11} className="animate-spin" />Refreshing...</> : 'Refresh'}
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs px-3 py-2 rounded-xl mb-3" style={{ background: 'rgba(255,59,48,0.08)', color: '#FF3B30' }}>{error}</p>
      )}

      {loading && !briefing && (
        <div className="flex items-center justify-center py-8 gap-3">
          <Loader size={16} className="animate-spin" style={{ color: '#007AFF' }} />
          <p className="text-sm" style={{ color: '#86868B' }}>Analyzing incident data...</p>
        </div>
      )}

      {sections.length > 0 && (
        <div className="flex flex-col gap-2">
          {sections.map((section, i) => {
            const color = getSectionColor(section.heading)
            return (
              <div
                key={i}
                style={{
                  background: '#F5F5F7',
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 8,
                  borderLeft: `3px solid ${color}`,
                }}
              >
                <p className="text-xs font-bold mb-2" style={{ color }}>{section.heading}</p>
                {renderLines(section.lines)}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
