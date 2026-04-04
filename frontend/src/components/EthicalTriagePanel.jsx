import React, { useState } from 'react'
import { Scale, Loader, AlertTriangle } from 'lucide-react'

const SECTION_COLORS = {
  'Ethical Framework':    '#5856D6',
  'Allocation Decisions': '#FF9500',
  'Ethical Cost':         '#FF3B30',
  'Recommendation':       '#007AFF',
}

function getSectionColor(heading) {
  for (const [key, color] of Object.entries(SECTION_COLORS)) {
    if (heading.includes(key)) return color
  }
  return '#86868B'
}

function inlineFormat(text) {
  const parts = []
  const regex = /\*\*(.+?)\*\*/g
  let last = 0, match, i = 0
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(<span key={i++}>{text.slice(last, match.index)}</span>)
    parts.push(<strong key={i++} style={{ color: '#1D1D1F' }}>{match[1]}</strong>)
    last = regex.lastIndex
  }
  if (last < text.length) parts.push(<span key={i++}>{text.slice(last)}</span>)
  return parts.length ? parts : text
}

function parseSections(text) {
  const sections = []
  let current = null
  for (const line of text.split('\n')) {
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
  return lines.filter(l => l.trim()).map((line, i) => {
    if (line.startsWith('- ') || line.startsWith('• ')) {
      return (
        <div key={i} className="flex gap-2 mb-1">
          <span style={{ color: '#86868B', flexShrink: 0, marginTop: 1 }}>•</span>
          <span style={{ fontSize: 12, color: '#3C3C43', lineHeight: 1.6 }}>{inlineFormat(line.slice(2))}</span>
        </div>
      )
    }
    return <p key={i} style={{ fontSize: 12, color: '#3C3C43', lineHeight: 1.6, marginBottom: 4 }}>{inlineFormat(line)}</p>
  })
}

export default function EthicalTriagePanel({ results }) {
  const [icuBeds, setIcuBeds] = useState(2)
  const [triageResult, setTriageResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const patients = results?.results ?? []
  const redIcuPatients = patients.filter(p => p.severity?.triage_tag === 'RED' && p.severity?.needs_icu)

  // Only show if there's actual resource scarcity (more ICU-needing RED patients than beds)
  if (redIcuPatients.length <= icuBeds && !triageResult) {
    return null
  }

  async function runTriage() {
    setLoading(true)
    setError('')
    setTriageResult(null)
    try {
      const payload = {
        patients: patients.map(p => ({
          patient_id:          p.patient_id,
          triage_tag:          p.severity?.triage_tag ?? 'RED',
          severity_label:      p.severity?.severity_label ?? 'Critical',
          needs_icu:           p.severity?.needs_icu ?? true,
          needs_ventilator:    p.severity?.needs_ventilator ?? false,
          optimal_survival_pct: p.comparison?.optimal_survival_pct ?? 0,
          nearest_survival_pct: p.comparison?.nearest_survival_pct ?? 0,
          hospital_name:       p.routing?.recommended?.[0]?.name ?? '—',
          eta:                 p.routing?.recommended?.[0]?.est_travel_minutes ?? 0,
          icu_available:       p.routing?.recommended?.[0]?.icu_available ?? 0,
        })),
        icu_beds: icuBeds,
      }
      const res = await fetch('http://localhost:8000/ethical-triage-from-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await res.text())
      setTriageResult(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const allocated = triageResult?.allocated ?? []
  const deferred  = triageResult?.deferred  ?? []
  const ranked    = triageResult?.ranked    ?? []

  return (
    <div className="card p-4 animate-fade-in" style={{ border: '1.5px solid rgba(255,59,48,0.2)', background: 'rgba(255,59,48,0.02)' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#FF3B30,#FF9500)' }}>
            <Scale size={14} color="white" />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: '#1D1D1F' }}>Ethical Triage Required</p>
            <p className="text-xs" style={{ color: '#86868B' }}>
              {redIcuPatients.length} critical ICU-needing patients — resource scarcity detected
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: '#86868B' }}>ICU Beds Available</p>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(n => (
                <button key={n} type="button" onClick={() => { setIcuBeds(n); setTriageResult(null) }}
                  className="w-7 h-7 rounded-lg text-xs font-bold transition-all"
                  style={{ background: icuBeds === n ? '#FF3B30' : '#F5F5F7', color: icuBeds === n ? 'white' : '#86868B' }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <button onClick={runTriage} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: loading ? '#E5E5EA' : 'linear-gradient(135deg,#FF3B30,#FF6B35)', color: loading ? '#86868B' : 'white' }}>
            {loading ? <><Loader size={13} className="animate-spin" />Running…</> : <><Scale size={13} />Run Ethical Triage</>}
          </button>
        </div>
      </div>

      {error && <p className="text-xs mb-3 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,59,48,0.08)', color: '#FF3B30' }}>{error}</p>}

      {/* Results */}
      {triageResult && (
        <div className="flex gap-4">
          {/* Ranked patient list */}
          <div style={{ width: 280, flexShrink: 0 }}>
            <p className="label mb-2">Allocation Ranking</p>
            <div className="flex flex-col gap-2">
              {ranked.map((p, i) => {
                const isAllocated = allocated.includes(p.patient_id)
                const surv = p.comparison?.optimal_survival_pct ?? p.optimal_survival_pct ?? 0
                return (
                  <div key={p.patient_id} className="rounded-xl p-3 flex items-center gap-3"
                    style={{ background: isAllocated ? 'rgba(52,199,89,0.06)' : 'rgba(255,59,48,0.05)', border: `1px solid ${isAllocated ? 'rgba(52,199,89,0.2)' : 'rgba(255,59,48,0.15)'}` }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                      style={{ background: isAllocated ? '#34C759' : '#FF3B30', color: 'white' }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold" style={{ color: '#1D1D1F' }}>{p.patient_id}</span>
                        <span className="text-xs font-bold" style={{ color: isAllocated ? '#34C759' : '#FF3B30' }}>
                          {Math.round(surv)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-xs" style={{ color: '#86868B' }}>{p.severity?.severity_label ?? '—'}</span>
                        <span className="px-1.5 py-0.5 rounded-md text-xs font-bold"
                          style={{ background: isAllocated ? 'rgba(52,199,89,0.12)' : 'rgba(255,59,48,0.1)', color: isAllocated ? '#34C759' : '#FF3B30' }}>
                          {isAllocated ? 'ICU' : 'DEFERRED'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* AI Reasoning */}
          <div className="flex-1 min-w-0">
            <p className="label mb-2">AI Ethical Reasoning</p>
            <div className="flex flex-col gap-2">
              {parseSections(triageResult.reasoning).map((sec, i) => {
                const color = getSectionColor(sec.heading)
                return (
                  <div key={i} className="rounded-xl p-3" style={{ background: '#F5F5F7', borderLeft: `3px solid ${color}` }}>
                    <p className="text-xs font-bold mb-1.5" style={{ color }}>{sec.heading}</p>
                    {renderLines(sec.lines)}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
