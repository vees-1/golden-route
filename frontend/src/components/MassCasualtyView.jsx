import React, { useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet'
import L from 'leaflet'
import { HOSPITALS } from '../data/mockData'
import { Clock, Mic, MicOff, Loader, Upload, Play } from 'lucide-react'

const TRIAGE_CONFIG = {
  RED:    { color: '#FF3B30', bg: 'rgba(255,59,48,0.1)',  border: 'rgba(255,59,48,0.25)',  label: 'Immediate' },
  YELLOW: { color: '#FF9500', bg: 'rgba(255,149,0,0.1)', border: 'rgba(255,149,0,0.25)', label: 'Delayed' },
  GREEN:  { color: '#34C759', bg: 'rgba(52,199,89,0.1)', border: 'rgba(52,199,89,0.25)', label: 'Minor' },
}

const SAMPLE_EVENT = {
  event_id: "MCE_01",
  title: "Pune-Mumbai Expressway Pileup",
  location: { name: "Dehu Road Exit, Expressway", lat: 18.671, lng: 73.752 },
  patients: [
    { patient_id: "P1", age: 42, gender: "M", heart_rate: 138, bp_systolic: 72, bp_diastolic: 38, spo2: 79, gcs: 5, respiratory_rate: 38, spo2_trend_per_min: -0.7, hr_trend_per_min: 1.3, symptoms: ["blunt_trauma_head", "severe_bleeding", "loss_of_consciousness"] },
    { patient_id: "P2", age: 35, gender: "F", heart_rate: 125, bp_systolic: 82, bp_diastolic: 48, spo2: 83, gcs: 8, respiratory_rate: 32, spo2_trend_per_min: -0.5, hr_trend_per_min: 0.9, symptoms: ["blunt_trauma_abdomen", "severe_bleeding"] },
    { patient_id: "P3", age: 28, gender: "M", heart_rate: 110, bp_systolic: 95, bp_diastolic: 60, spo2: 88, gcs: 11, respiratory_rate: 28, spo2_trend_per_min: -0.3, hr_trend_per_min: 0.5, symptoms: ["blunt_trauma_chest", "shortness_of_breath"] },
  ]
}

function createPatientIcon(triage) {
  const c = TRIAGE_CONFIG[triage] || TRIAGE_CONFIG.GREEN
  const svg = `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="14" fill="${c.color}" stroke="white" stroke-width="2.5"/>
    <text x="16" y="20" text-anchor="middle" font-family="Inter" font-size="12" font-weight="800" fill="white">${triage[0]}</text>
  </svg>`
  return L.divIcon({ html: svg, className: '', iconSize: [32, 32], iconAnchor: [16, 16] })
}

function createHospIcon() {
  const svg = `<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
    <circle cx="15" cy="15" r="13" fill="#007AFF" stroke="white" stroke-width="2.5"/>
    <text x="15" y="19" text-anchor="middle" font-family="Inter" font-size="9" font-weight="700" fill="white">H</text>
  </svg>`
  return L.divIcon({ html: svg, className: '', iconSize: [30, 30], iconAnchor: [15, 15] })
}

function VitalPill({ label, value, unit }) {
  return (
    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md" style={{ background: '#F5F5F7' }}>
      <span style={{ fontSize: 9, color: '#86868B', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 10, color: '#1D1D1F', fontWeight: 700 }}>{value}{unit}</span>
    </div>
  )
}

export default function MassCasualtyView() {
  const [mode, setMode] = useState('input') // 'input' | 'results'
  const [jsonText, setJsonText] = useState(JSON.stringify(SAMPLE_EVENT, null, 2))
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const mediaRef = useRef(null)
  const chunksRef = useRef([])

  async function handleAnalyze() {
    setError('')
    setLoading(true)
    try {
      const payload = JSON.parse(jsonText)
      const res = await fetch('http://localhost:8000/mass-casualty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setResults(data)
      setMode('results')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mr = new MediaRecorder(stream)
    chunksRef.current = []
    mr.ondataavailable = (e) => chunksRef.current.push(e.data)
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      await transcribeEvent(blob)
    }
    mr.start()
    mediaRef.current = mr
    setRecording(true)
  }

  function stopRecording() {
    mediaRef.current?.stop()
    setRecording(false)
    setTranscribing(true)
  }

  async function transcribeEvent(blob) {
    const form = new FormData()
    form.append('file', blob, 'audio.webm')
    try {
      const res = await fetch('http://localhost:8000/transcribe', { method: 'POST', body: form })
      const data = await res.json()
      // voice fills a single patient — wrap into event format
      const patient = {
        patient_id: `P${Date.now()}`,
        age: data.age || 0,
        gender: 'M',
        heart_rate: data.heart_rate || 0,
        bp_systolic: data.bp_systolic || 0,
        bp_diastolic: data.bp_diastolic || 0,
        spo2: data.spo2 || 0,
        gcs: data.gcs || 0,
        respiratory_rate: data.respiratory_rate || 0,
        spo2_trend_per_min: data.spo2_trend_per_min || 0,
        hr_trend_per_min: data.hr_trend_per_min || 0,
        symptoms: (data.symptoms || '').split('|').filter(Boolean),
      }
      const current = JSON.parse(jsonText)
      current.patients = [...(current.patients || []), patient]
      setJsonText(JSON.stringify(current, null, 2))
    } catch (e) {
      setError('Voice transcription failed')
    } finally {
      setTranscribing(false)
    }
  }

  // derive stats from results
  const patients = results?.results || []
  const avgAI = patients.length
    ? (patients.reduce((s, p) => s + (p.comparison?.optimal_survival_pct || 0), 0) / patients.length).toFixed(1)
    : null
  const avgNearest = patients.length
    ? (patients.reduce((s, p) => s + (p.comparison?.nearest_survival_pct || 0), 0) / patients.length).toFixed(1)
    : null
  const livesSaved = avgAI && avgNearest
    ? ((parseFloat(avgAI) - parseFloat(avgNearest)) / 100 * patients.length).toFixed(1)
    : null

  const eventLocation = (() => { try { return JSON.parse(jsonText).location } catch { return null } })()

  if (mode === 'input') {
    return (
      <div className="flex gap-6 h-full animate-fade-in">
        {/* JSON input */}
        <div className="flex flex-col flex-1 gap-4">
          <div>
            <h2 className="text-xl font-bold mb-1" style={{ color: '#1D1D1F' }}>Mass Casualty Event</h2>
            <p className="text-sm" style={{ color: '#86868B' }}>Paste event JSON or dictate patients via voice</p>
          </div>

          {/* Voice add patient */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={transcribing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: recording ? 'linear-gradient(135deg,#FF3B30,#FF6B6B)' : transcribing ? '#E5E5EA' : 'linear-gradient(135deg,#007AFF,#5856D6)',
                color: transcribing ? '#86868B' : 'white',
              }}
            >
              {transcribing ? <><Loader size={14} className="animate-spin" />Transcribing...</> :
               recording    ? <><MicOff size={14} />Stop</> :
                              <><Mic size={14} />Add Patient by Voice</>}
            </button>
            <button
              type="button"
              onClick={() => setJsonText(JSON.stringify(SAMPLE_EVENT, null, 2))}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: '#F5F5F7', color: '#1D1D1F' }}
            >
              <Upload size={14} /> Load Sample
            </button>
          </div>

          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="flex-1 rounded-2xl p-4 text-xs font-mono resize-none focus:outline-none"
            style={{ background: '#F5F5F7', border: '1px solid #E5E5EA', color: '#1D1D1F', minHeight: 320 }}
            placeholder="Paste mass casualty event JSON here..."
          />

          {error && (
            <p className="text-xs px-3 py-2 rounded-xl" style={{ background: 'rgba(255,59,48,0.08)', color: '#FF3B30' }}>
              {error}
            </p>
          )}

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="btn-primary flex items-center justify-center gap-2"
          >
            {loading
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />Analyzing {(() => { try { return JSON.parse(jsonText).patients?.length } catch { return '' } })()} patients...</>
              : <><Play size={16} />Run Mass Casualty Analysis</>}
          </button>
        </div>
      </div>
    )
  }

  // Results view
  const red    = patients.filter((p) => p.severity?.triage_tag === 'RED')
  const yellow = patients.filter((p) => p.severity?.triage_tag === 'YELLOW')
  const green  = patients.filter((p) => p.severity?.triage_tag === 'GREEN')
  const sorted = [...red, ...yellow, ...green]

  return (
    <div className="flex flex-col h-full gap-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: '#1D1D1F' }}>{results?.title || 'Mass Casualty Results'}</h2>
          <p className="text-sm" style={{ color: '#86868B' }}>{patients.length} patients analyzed</p>
        </div>
        <button
          onClick={() => { setMode('input'); setResults(null) }}
          className="px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: '#F5F5F7', color: '#1D1D1F' }}
        >
          ← New Event
        </button>
      </div>

      <div className="flex gap-4" style={{ flex: 1, minHeight: 0 }}>
        {/* Patient list */}
        <div style={{ width: 280, flexShrink: 0, overflowY: 'auto' }}>
          <p className="label mb-2">
            Triage Queue
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(255,59,48,0.1)', color: '#FF3B30' }}>
              {patients.length} patients
            </span>
          </p>
          <div className="space-y-2">
            {sorted.map((p, i) => {
              const tag = p.severity?.triage_tag || 'GREEN'
              const tc = TRIAGE_CONFIG[tag]
              return (
                <div
                  key={p.patient_id}
                  onClick={() => setSelectedPatient(selectedPatient === i ? null : i)}
                  className="rounded-2xl p-3 cursor-pointer transition-all duration-200"
                  style={{
                    background: selectedPatient === i ? tc.bg : '#ffffff',
                    border: `1px solid ${selectedPatient === i ? tc.border : '#F2F2F7'}`,
                    boxShadow: selectedPatient === i ? `0 4px 16px ${tc.color}25` : '0 1px 6px rgba(0,0,0,0.04)',
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="px-2 py-0.5 rounded-md text-xs font-black" style={{ background: tc.color, color: 'white' }}>{tag}</span>
                    <span className="text-xs" style={{ color: '#86868B' }}>{p.patient_id}</span>
                  </div>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#1D1D1F' }}>{p.severity?.severity_label}</p>
                  <div className="flex gap-2">
                    <VitalPill label="SpO₂" value={`${p.survival?.base_survival_pct || '—'}`} unit="%" />
                    <VitalPill label="Surv" value={`${p.comparison?.optimal_survival_pct || '—'}`} unit="%" />
                  </div>
                  {selectedPatient === i && p.routing?.recommended?.[0] && (
                    <p className="mt-2 text-xs font-medium" style={{ color: '#007AFF' }}>
                      → {p.routing.recommended[0].name}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 rounded-2xl overflow-hidden" style={{ minHeight: 0 }}>
          <MapContainer
            center={eventLocation ? [eventLocation.lat, eventLocation.lng] : [18.52, 73.856]}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap contributors &copy; CARTO" />
            {eventLocation && (
              <Marker position={[eventLocation.lat, eventLocation.lng]} icon={createPatientIcon('RED')}>
                <Popup><div style={{ fontFamily: 'Inter', padding: 8 }}><p style={{ fontWeight: 700 }}>{eventLocation.name}</p></div></Popup>
              </Marker>
            )}
            {sorted.map((p) => {
              const hosp = p.routing?.recommended?.[0]
              if (!hosp || !eventLocation) return null
              const tag = p.severity?.triage_tag || 'GREEN'
              const tc = TRIAGE_CONFIG[tag]
              return (
                <React.Fragment key={p.patient_id}>
                  <Marker position={[hosp.lat, hosp.lng]} icon={createHospIcon()}>
                    <Popup><div style={{ fontFamily: 'Inter', padding: 8 }}><p style={{ fontWeight: 700, fontSize: 12 }}>{hosp.name}</p><p style={{ fontSize: 11, color: '#34C759' }}>ICU: {hosp.icu_available}</p></div></Popup>
                  </Marker>
                  <Polyline
                    positions={[[eventLocation.lat, eventLocation.lng], [hosp.lat, hosp.lng]]}
                    pathOptions={{ color: tc.color, weight: 2.5, opacity: 0.7, dashArray: '6 4' }}
                  />
                </React.Fragment>
              )
            })}
          </MapContainer>
        </div>

        {/* Comparison */}
        <div className="flex flex-col gap-3" style={{ width: 240, flexShrink: 0 }}>
          <p className="label">Routing Comparison</p>
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,59,48,0.05)', border: '1px solid rgba(255,59,48,0.15)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#86868B' }}>Naive Routing</p>
            <p className="text-3xl font-bold" style={{ color: '#FF3B30' }}>{avgNearest}%</p>
            <p className="text-xs mt-1" style={{ color: '#86868B' }}>avg survival rate</p>
            <div className="mt-2 h-1.5 rounded-full" style={{ background: '#FFE5E3' }}>
              <div className="h-full rounded-full" style={{ width: `${avgNearest}%`, background: '#FF3B30' }} />
            </div>
          </div>
          <div className="rounded-2xl p-4" style={{ background: 'rgba(52,199,89,0.08)', border: '1px solid rgba(52,199,89,0.25)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#86868B' }}>GoldenRoute AI</p>
            <p className="text-3xl font-bold" style={{ color: '#34C759' }}>{avgAI}%</p>
            <p className="text-xs mt-1" style={{ color: '#86868B' }}>avg survival rate</p>
            <div className="mt-2 h-1.5 rounded-full" style={{ background: '#E8F8EE' }}>
              <div className="h-full rounded-full" style={{ width: `${avgAI}%`, background: '#34C759' }} />
            </div>
          </div>
          <div className="rounded-2xl p-4 text-center" style={{ background: 'linear-gradient(135deg,#007AFF,#5856D6)' }}>
            <p className="text-xs font-semibold text-white opacity-80 mb-1">Lives Saved</p>
            <p className="text-4xl font-black text-white">+{livesSaved}</p>
            <p className="text-xs text-white opacity-70 mt-1">this incident</p>
          </div>
          <div className="rounded-2xl p-3" style={{ background: '#ffffff', border: '1px solid #F2F2F7' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: '#86868B' }}>Triage Summary</p>
            {Object.entries(TRIAGE_CONFIG).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: v.color }} />
                  <span className="text-xs font-medium" style={{ color: '#1D1D1F' }}>{v.label}</span>
                </div>
                <span className="text-xs font-bold" style={{ color: v.color }}>
                  {sorted.filter((p) => p.severity?.triage_tag === k).length}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Assignment table */}
      <div className="card p-4" style={{ flexShrink: 0 }}>
        <p className="label mb-3">Patient Assignment Table</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #F2F2F7' }}>
                {['Patient', 'Severity', 'Triage', 'Assigned Hospital', 'ETA', 'Survival Gain'].map((h) => (
                  <th key={h} className="text-left pb-2 pr-4" style={{ color: '#86868B', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => {
                const tag = p.severity?.triage_tag || 'GREEN'
                const tc = TRIAGE_CONFIG[tag]
                const hosp = p.routing?.recommended?.[0]
                return (
                  <tr key={p.patient_id} style={{ borderBottom: i < sorted.length - 1 ? '1px solid #F9F9F9' : 'none' }}>
                    <td className="py-2.5 pr-4">
                      <p className="font-semibold text-xs" style={{ color: '#1D1D1F' }}>{p.patient_id}</p>
                    </td>
                    <td className="py-2.5 pr-4 text-xs font-medium" style={{ color: '#3C3C43' }}>{p.severity?.severity_label}</td>
                    <td className="py-2.5 pr-4">
                      <span className="px-2 py-0.5 rounded-md text-xs font-bold" style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}>{tag}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-xs font-medium" style={{ color: '#1D1D1F' }}>{hosp?.name || '—'}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-1">
                        <Clock size={11} color="#007AFF" />
                        <span className="text-xs font-bold" style={{ color: '#007AFF' }}>{hosp?.est_travel_minutes || '—'} min</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-xs font-semibold" style={{ color: '#34C759' }}>
                      {p.comparison?.survival_gain_pct != null ? `+${p.comparison.survival_gain_pct}%` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
