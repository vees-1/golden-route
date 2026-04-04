import React, { useState } from 'react'
import { Scale, AlertTriangle, Loader, RefreshCw } from 'lucide-react'

const SAMPLE_PATIENTS = [
  { patient_id: 'P1', age: 45, heart_rate: 138, bp_systolic: 72, bp_diastolic: 38, spo2: 79, gcs: 5,  respiratory_rate: 38, spo2_trend_per_min: -0.7, hr_trend_per_min: 1.3, symptoms: ['blunt_trauma_head','severe_bleeding','cardiac_arrest'], lat: 18.5074, lng: 73.8073 },
  { patient_id: 'P2', age: 62, heart_rate: 125, bp_systolic: 82, bp_diastolic: 48, spo2: 83, gcs: 8,  respiratory_rate: 32, spo2_trend_per_min: -0.5, hr_trend_per_min: 0.9, symptoms: ['chest_pain','shortness_of_breath','stroke_symptoms'], lat: 18.5074, lng: 73.8073 },
  { patient_id: 'P3', age: 28, heart_rate: 110, bp_systolic: 95, bp_diastolic: 60, spo2: 88, gcs: 11, respiratory_rate: 28, spo2_trend_per_min: -0.3, hr_trend_per_min: 0.5, symptoms: ['blunt_trauma_chest','shortness_of_breath'], lat: 18.5074, lng: 73.8073 },
  { patient_id: 'P4', age: 71, heart_rate: 118, bp_systolic: 78, bp_diastolic: 42, spo2: 81, gcs: 6,  respiratory_rate: 35, spo2_trend_per_min: -0.6, hr_trend_per_min: 1.1, symptoms: ['cardiac_arrest','severe_bleeding'], lat: 18.5074, lng: 73.8073 },
  { patient_id: 'P5', age: 33, heart_rate: 105, bp_systolic: 92, bp_diastolic: 58, spo2: 90, gcs: 13, respiratory_rate: 24, spo2_trend_per_min: -0.2, hr_trend_per_min: 0.3, symptoms: ['blunt_trauma_chest','chest_pain'], lat: 18.5074, lng: 73.8073 },
]

const SECTION_COLORS = {
  'Ethical Framework': '#5856D6',
  'Allocation Decisions': '#FF9500',
  'Ethical Cost': '#FF3B30',
  'Recommendation': '#007AFF',
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

function parseSections(text) {
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

function PatientPreviewCard({ patient }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 14,
      padding: '12px 14px',
      border: '1px solid rgba(255,59,48,0.2)',
      boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
    }}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-sm" style={{ color: '#1D1D1F' }}>{patient.patient_id}</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,59,48,0.1)', color: '#FF3B30' }}>Critical</span>
      </div>
      <div className="flex gap-2 flex-wrap mb-2">
        <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: '#F5F5F7', color: '#1D1D1F' }}>HR {patient.heart_rate}</span>
        <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: '#F5F5F7', color: '#1D1D1F' }}>SpO₂ {patient.spo2}%</span>
        <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: '#F5F5F7', color: '#1D1D1F' }}>GCS {patient.gcs}</span>
        <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: '#F5F5F7', color: '#1D1D1F' }}>Age {patient.age}</span>
      </div>
      <p className="text-xs" style={{ color: '#86868B' }}>{patient.symptoms.length} symptom{patient.symptoms.length !== 1 ? 's' : ''}</p>
    </div>
  )
}

function RankedPatientCard({ result, rank, allocated }) {
  const comp = result.comparison || {}
  const sev = result.severity || {}
  const survPct = comp.optimal_survival_pct || 0
  const label = sev.severity_label || 'Critical'
  const tag = sev.triage_tag || 'RED'

  const rankColors = ['#FF3B30', '#FF9500', '#007AFF', '#5856D6', '#34C759']
  const rankColor = rankColors[(rank - 1) % rankColors.length]

  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      padding: '14px 16px',
      border: allocated ? '1px solid rgba(52,199,89,0.25)' : '1px solid rgba(255,59,48,0.15)',
      boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
    }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm text-white"
          style={{ background: rankColor }}>
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm" style={{ color: '#1D1D1F' }}>{result.patient_id}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: allocated ? 'rgba(52,199,89,0.12)' : 'rgba(255,59,48,0.1)',
                color: allocated ? '#34C759' : '#FF3B30',
              }}>
              {allocated ? 'ALLOCATED' : 'DEFERRED'}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: '#86868B' }}>{label} — Triage {tag}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold" style={{ color: allocated ? '#34C759' : '#FF3B30', lineHeight: 1 }}>
            {survPct.toFixed(1)}%
          </p>
          <p className="text-xs" style={{ color: '#86868B' }}>survival</p>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {[
          ['HR', result.severity?.heart_rate ?? '—'],
          ['SpO₂', result.severity?.spo2 ? `${result.severity.spo2}%` : '—'],
          ['GCS', result.severity?.gcs ?? '—'],
          ['ICU', sev.needs_icu ? 'Yes' : 'No'],
          ['Vent', sev.needs_ventilator ? 'Yes' : 'No'],
        ].map(([k, v]) => (
          <span key={k} className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: '#F5F5F7', color: '#1D1D1F' }}>
            {k} {v}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function EthicalTriageView() {
  const [patients] = useState(SAMPLE_PATIENTS)
  const [icuBeds, setIcuBeds] = useState(2)
  const [vents, setVents] = useState(2)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRunTriage() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/ethical-triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patients, icu_beds: icuBeds, vents }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Request failed')
      }
      const data = await res.json()
      setResults(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const ranked = results?.ranked || []
  const allocatedIds = new Set(results?.allocated || [])
  const allocatedResults = ranked.filter(r => allocatedIds.has(r.patient_id))
  const deferredResults = ranked.filter(r => !allocatedIds.has(r.patient_id))

  const avgAllocated = allocatedResults.length
    ? (allocatedResults.reduce((s, r) => s + (r.comparison?.optimal_survival_pct || 0), 0) / allocatedResults.length).toFixed(1)
    : null
  const avgDeferred = deferredResults.length
    ? (deferredResults.reduce((s, r) => s + (r.comparison?.optimal_survival_pct || 0), 0) / deferredResults.length).toFixed(1)
    : null

  const sections = results?.reasoning ? parseSections(results.reasoning) : []

  return (
    <div className="flex flex-col gap-5 animate-fade-in" style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1D1D1F' }}>Ethical Triage Engine</h1>
          <p className="text-sm mt-0.5" style={{ color: '#86868B' }}>Utilitarian allocation — highest survival probability prioritized</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(255,149,0,0.1)', border: '1px solid rgba(255,149,0,0.25)' }}>
          <AlertTriangle size={12} color="#FF9500" />
          <span className="text-xs font-semibold" style={{ color: '#FF9500' }}>AI-assisted decision support only</span>
        </div>
      </div>

      {/* Resource constraints + run button */}
      <div className="flex items-center gap-6 p-4 rounded-2xl" style={{ background: 'white', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: '#86868B' }}>ICU Beds Available</p>
          <div className="flex gap-1">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setIcuBeds(n)}
                className="w-8 h-8 rounded-lg text-sm font-bold transition-all"
                style={{
                  background: icuBeds === n ? 'linear-gradient(135deg,#FF3B30,#FF6B35)' : '#F5F5F7',
                  color: icuBeds === n ? 'white' : '#1D1D1F',
                }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: '#86868B' }}>Ventilators Available</p>
          <div className="flex gap-1">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setVents(n)}
                className="w-8 h-8 rounded-lg text-sm font-bold transition-all"
                style={{
                  background: vents === n ? 'linear-gradient(135deg,#FF3B30,#FF6B35)' : '#F5F5F7',
                  color: vents === n ? 'white' : '#1D1D1F',
                }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1" />

        {results ? (
          <button onClick={() => setResults(null)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: '#F5F5F7', color: '#86868B' }}>
            <RefreshCw size={14} />
            Re-run with different constraints
          </button>
        ) : (
          <button onClick={handleRunTriage} disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: loading ? '#E5E5EA' : 'linear-gradient(135deg,#FF3B30,#FF6B35)',
              color: loading ? '#86868B' : 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 14px rgba(255,59,48,0.35)',
            }}>
            {loading ? <Loader size={14} className="animate-spin" /> : <Scale size={14} />}
            {loading ? 'Running Triage…' : 'Run Triage'}
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs px-4 py-3 rounded-xl" style={{ background: 'rgba(255,59,48,0.08)', color: '#FF3B30' }}>{error}</p>
      )}

      {/* Before results: patient preview grid */}
      {!results && !loading && (
        <div>
          <p className="text-xs font-semibold mb-3" style={{ color: '#86868B' }}>5 Critical Patients — Pending Triage</p>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {patients.map(p => <PatientPreviewCard key={p.patient_id} patient={p} />)}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#FF3B30,#FF6B35)' }}>
            <Scale size={24} color="white" />
          </div>
          <div className="text-center">
            <p className="font-bold text-base" style={{ color: '#1D1D1F' }}>Running Ethical Triage…</p>
            <p className="text-sm mt-1" style={{ color: '#86868B' }}>Analyzing survival probabilities and allocating resources</p>
          </div>
          <Loader size={20} className="animate-spin" style={{ color: '#FF3B30' }} />
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="flex gap-5 animate-fade-in" style={{ alignItems: 'flex-start' }}>
          {/* Left: ranked patient list */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <p className="text-xs font-semibold" style={{ color: '#86868B' }}>Patients ranked by survival probability</p>
            {ranked.map((r, i) => (
              <RankedPatientCard
                key={r.patient_id}
                result={r}
                rank={i + 1}
                allocated={allocatedIds.has(r.patient_id)}
              />
            ))}
          </div>

          {/* Right: reasoning panel */}
          <div style={{ width: 400, flexShrink: 0 }}>
            <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#1D1D1F' }}>
                <Scale size={14} color="white" />
                <p className="text-sm font-bold text-white">Ethical Reasoning</p>
              </div>
              <div className="p-4 flex flex-col gap-3">
                {sections.map((section, i) => {
                  const color = getSectionColor(section.heading)
                  return (
                    <div key={i} style={{
                      background: '#F5F5F7',
                      borderRadius: 12,
                      padding: 12,
                      borderLeft: `3px solid ${color}`,
                    }}>
                      <p className="text-xs font-bold mb-2" style={{ color }}>{section.heading}</p>
                      {renderLines(section.lines)}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom stats bar */}
      {results && (
        <div className="flex gap-4 p-4 rounded-2xl animate-fade-in"
          style={{ background: 'white', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
          {[
            { label: 'Patients allocated', value: `${results.allocated.length} of ${ranked.length}` },
            { label: 'Avg survival (allocated)', value: avgAllocated ? `${avgAllocated}%` : '—', color: '#34C759' },
            { label: 'Avg survival (deferred)', value: avgDeferred ? `${avgDeferred}%` : '—', color: '#FF3B30' },
            { label: 'Lives at risk (deferred)', value: deferredResults.length, color: '#FF9500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex-1 text-center">
              <p className="text-xs" style={{ color: '#86868B' }}>{label}</p>
              <p className="text-lg font-bold mt-0.5" style={{ color: color || '#1D1D1F' }}>{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
