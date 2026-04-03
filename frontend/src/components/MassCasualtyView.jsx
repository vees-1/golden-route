import React, { useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet'
import L from 'leaflet'
import { HOSPITALS, SYMPTOMS } from '../data/mockData'
import { Clock, Mic, MicOff, Loader, Upload, Play, Plus, Trash2, FileText, Sliders, UserPlus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const FORM_VITALS = [
  { id: 'heart_rate',       label: 'Heart Rate',   unit: 'bpm',  min: 30,  max: 200, default: 80 },
  { id: 'bp_systolic',      label: 'Systolic BP',  unit: 'mmHg', min: 60,  max: 200, default: 120 },
  { id: 'spo2',             label: 'SpO₂',         unit: '%',    min: 60,  max: 100, default: 97 },
  { id: 'gcs',              label: 'GCS',           unit: '/15',  min: 3,   max: 15,  default: 14 },
  { id: 'respiratory_rate', label: 'Resp. Rate',   unit: '/min', min: 6,   max: 40,  default: 16 },
  { id: 'age',              label: 'Age',           unit: 'yrs',  min: 1,   max: 100, default: 40 },
]

function vitalColor(id, val) {
  if (id === 'heart_rate')       return val < 50 || val > 120 ? '#FF3B30' : val > 100 ? '#FF9500' : '#34C759'
  if (id === 'bp_systolic')      return val < 80 || val > 180 ? '#FF3B30' : val > 140 ? '#FF9500' : '#34C759'
  if (id === 'spo2')             return val < 88 ? '#FF3B30' : val < 94 ? '#FF9500' : '#34C759'
  if (id === 'gcs')              return val < 8  ? '#FF3B30' : val < 12 ? '#FF9500' : '#34C759'
  if (id === 'respiratory_rate') return val < 8  || val > 30 ? '#FF3B30' : val > 20 ? '#FF9500' : '#34C759'
  return '#86868B'
}

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
  const [inputTab, setInputTab] = useState('json') // 'json' | 'form'
  const [jsonText, setJsonText] = useState(JSON.stringify(SAMPLE_EVENT, null, 2))
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const mediaRef = useRef(null)
  const chunksRef = useRef([])

  // Form-based patient builder state
  const [eventTitle, setEventTitle]   = useState('Mass Casualty Event')
  const [eventLat, setEventLat]       = useState(18.52)
  const [eventLng, setEventLng]       = useState(73.856)
  const [formVitals, setFormVitals]   = useState(Object.fromEntries(FORM_VITALS.map((v) => [v.id, v.default])))
  const [formSymptoms, setFormSymptoms] = useState([])
  const [builtPatients, setBuiltPatients] = useState([])

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
      const syms = (data.symptoms || '').split('|').filter(Boolean)

      if (inputTab === 'form') {
        // Auto-fill the form sliders
        const updates = {}
        if (data.age)              updates.age              = data.age
        if (data.heart_rate)       updates.heart_rate       = data.heart_rate
        if (data.bp_systolic)      updates.bp_systolic      = data.bp_systolic
        if (data.spo2)             updates.spo2             = data.spo2
        if (data.gcs)              updates.gcs              = data.gcs
        if (data.respiratory_rate) updates.respiratory_rate = data.respiratory_rate
        if (Object.keys(updates).length) setFormVitals((prev) => ({ ...prev, ...updates }))
        if (syms.length) setFormSymptoms(syms)
      } else {
        // voice fills JSON textarea
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
          symptoms: syms,
        }
        try {
          const current = JSON.parse(jsonText)
          current.patients = [...(current.patients || []), patient]
          setJsonText(JSON.stringify(current, null, 2))
        } catch { setError('Invalid JSON in textarea') }
      }
    } catch (e) {
      setError('Voice transcription failed')
    } finally {
      setTranscribing(false)
    }
  }

  function addFormPatient() {
    const id = `P${builtPatients.length + 1}`
    setBuiltPatients((prev) => [...prev, {
      patient_id: id,
      gender: 'M',
      spo2_trend_per_min: 0,
      hr_trend_per_min: 0,
      bp_diastolic: Math.round(formVitals.bp_systolic * 0.65),
      ...formVitals,
      symptoms: [...formSymptoms],
    }])
    setFormVitals(Object.fromEntries(FORM_VITALS.map((v) => [v.id, v.default])))
    setFormSymptoms([])
  }

  async function handleAnalyzeForm() {
    if (builtPatients.length === 0) { setError('Add at least one patient'); return }
    setError('')
    setLoading(true)
    try {
      const payload = {
        event_id: 'MCE_FORM',
        title: eventTitle,
        location: { name: 'Custom Event', lat: eventLat, lng: eventLng },
        patients: builtPatients,
      }
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
      <div className="flex flex-col gap-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-0.5" style={{ color: '#1D1D1F' }}>Mass Casualty Event</h2>
            <p className="text-sm" style={{ color: '#86868B' }}>Add patients via form or paste raw JSON</p>
          </div>
          {/* Tab toggle */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#F5F5F7' }}>
            {[{ id: 'form', icon: Sliders, label: 'Form' }, { id: 'json', icon: FileText, label: 'JSON' }].map(({ id, icon: Icon, label }) => (
              <button key={id} type="button" onClick={() => setInputTab(id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ background: inputTab === id ? 'white' : 'transparent', color: inputTab === id ? '#007AFF' : '#86868B', boxShadow: inputTab === id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
                <Icon size={12} />{label}
              </button>
            ))}
          </div>
        </div>

        {/* Voice button — works in both modes */}
        <div className="flex gap-2">
          <button type="button" onClick={recording ? stopRecording : startRecording} disabled={transcribing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: recording ? 'linear-gradient(135deg,#FF3B30,#FF6B6B)' : transcribing ? '#E5E5EA' : 'linear-gradient(135deg,#007AFF,#5856D6)', color: transcribing ? '#86868B' : 'white' }}>
            {transcribing ? <><Loader size={14} className="animate-spin" />Transcribing...</> : recording ? <><MicOff size={14} />Stop</> : <><Mic size={14} />{inputTab === 'form' ? 'Speak to fill form' : 'Add Patient by Voice'}</>}
          </button>
          {inputTab === 'json' && (
            <button type="button" onClick={() => setJsonText(JSON.stringify(SAMPLE_EVENT, null, 2))}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: '#F5F5F7', color: '#1D1D1F' }}>
              <Upload size={14} /> Load Sample
            </button>
          )}
        </div>

        {/* JSON tab */}
        {inputTab === 'json' && (
          <div className="flex flex-col gap-3">
            <textarea value={jsonText} onChange={(e) => setJsonText(e.target.value)}
              className="rounded-2xl p-4 text-xs font-mono resize-none focus:outline-none"
              style={{ background: '#F5F5F7', border: '1px solid #E5E5EA', color: '#1D1D1F', minHeight: 340 }}
              placeholder="Paste mass casualty event JSON here..." />
            {error && <p className="text-xs px-3 py-2 rounded-xl" style={{ background: 'rgba(255,59,48,0.08)', color: '#FF3B30' }}>{error}</p>}
            <button onClick={handleAnalyze} disabled={loading} className="btn-primary flex items-center justify-center gap-2">
              {loading
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />Analyzing {(() => { try { return JSON.parse(jsonText).patients?.length } catch { return '' } })()} patients...</>
                : <><Play size={16} />Run Mass Casualty Analysis</>}
            </button>
          </div>
        )}

        {/* Form tab */}
        {inputTab === 'form' && (
          <div className="flex gap-6">
            {/* Left: vital sliders + symptoms */}
            <div className="flex-1 flex flex-col gap-4">
              {/* Event info */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <p className="label mb-1">Event Title</p>
                  <input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none"
                    style={{ background: '#F5F5F7', border: '1px solid #E5E5EA', color: '#1D1D1F' }} />
                </div>
                <div>
                  <p className="label mb-1">Lat</p>
                  <input type="number" value={eventLat} onChange={(e) => setEventLat(parseFloat(e.target.value))}
                    className="w-24 px-3 py-2 rounded-xl text-sm focus:outline-none"
                    style={{ background: '#F5F5F7', border: '1px solid #E5E5EA', color: '#1D1D1F' }} />
                </div>
                <div>
                  <p className="label mb-1">Lng</p>
                  <input type="number" value={eventLng} onChange={(e) => setEventLng(parseFloat(e.target.value))}
                    className="w-24 px-3 py-2 rounded-xl text-sm focus:outline-none"
                    style={{ background: '#F5F5F7', border: '1px solid #E5E5EA', color: '#1D1D1F' }} />
                </div>
              </div>

              <p className="label">Patient Vitals</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {FORM_VITALS.map((cfg) => {
                  const val = formVitals[cfg.id]
                  const col = vitalColor(cfg.id, val)
                  const pct = ((val - cfg.min) / (cfg.max - cfg.min)) * 100
                  return (
                    <div key={cfg.id}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-medium" style={{ color: '#1D1D1F' }}>{cfg.label}</span>
                        <span className="text-xs font-bold tabular-nums" style={{ color: col }}>{val}<span className="font-normal ml-0.5" style={{ color: '#86868B' }}>{cfg.unit}</span></span>
                      </div>
                      <input type="range" min={cfg.min} max={cfg.max} value={val}
                        onChange={(e) => setFormVitals((p) => ({ ...p, [cfg.id]: Number(e.target.value) }))}
                        className="slider-input w-full"
                        style={{ background: `linear-gradient(to right, ${col} ${pct}%, #E5E5EA ${pct}%)` }} />
                    </div>
                  )
                })}
              </div>

              <div>
                <p className="label mb-2">Symptoms {formSymptoms.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(0,122,255,0.1)', color: '#007AFF' }}>{formSymptoms.length}</span>}</p>
                <div className="flex flex-wrap gap-1.5">
                  {SYMPTOMS.map((sym) => (
                    <button key={sym.id} type="button"
                      onClick={() => setFormSymptoms((p) => p.includes(sym.id) ? p.filter((s) => s !== sym.id) : [...p, sym.id])}
                      className={`pill ${formSymptoms.includes(sym.id) ? 'pill-selected' : 'pill-unselected'}`}>
                      {formSymptoms.includes(sym.id) && <span style={{ fontSize: 10 }}>✓</span>}{sym.label}
                    </button>
                  ))}
                </div>
              </div>

              <button type="button" onClick={addFormPatient}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'rgba(0,122,255,0.1)', color: '#007AFF' }}>
                <UserPlus size={15} /> Add Patient to Queue
              </button>
            </div>

            {/* Right: patient queue */}
            <div style={{ width: 260, flexShrink: 0 }}>
              <p className="label mb-2">Patient Queue <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(255,59,48,0.1)', color: '#FF3B30' }}>{builtPatients.length}</span></p>
              {builtPatients.length === 0 && (
                <p className="text-xs" style={{ color: '#86868B' }}>No patients added yet. Fill vitals and click "Add Patient".</p>
              )}
              <div className="space-y-2" style={{ maxHeight: 360, overflowY: 'auto' }}>
                {builtPatients.map((p, i) => (
                  <div key={p.patient_id} className="flex items-center justify-between rounded-xl px-3 py-2"
                    style={{ background: '#F5F5F7', border: '1px solid #E5E5EA' }}>
                    <div>
                      <p className="text-xs font-bold" style={{ color: '#1D1D1F' }}>{p.patient_id}</p>
                      <p className="text-xs" style={{ color: '#86868B' }}>HR {p.heart_rate} · SpO₂ {p.spo2}% · GCS {p.gcs}</p>
                      {p.symptoms.length > 0 && <p className="text-xs mt-0.5" style={{ color: '#007AFF' }}>{p.symptoms.length} symptom{p.symptoms.length !== 1 ? 's' : ''}</p>}
                    </div>
                    <button type="button" onClick={() => setBuiltPatients((prev) => prev.filter((_, j) => j !== i))}
                      style={{ color: '#FF3B30', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {builtPatients.length > 0 && (
                <button onClick={handleAnalyzeForm} disabled={loading}
                  className="mt-3 w-full btn-primary flex items-center justify-center gap-2">
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />Analyzing...</>
                    : <><Play size={15} />Analyze {builtPatients.length} Patient{builtPatients.length !== 1 ? 's' : ''}</>}
                </button>
              )}
              {error && <p className="mt-2 text-xs px-2 py-1.5 rounded-lg" style={{ background: 'rgba(255,59,48,0.08)', color: '#FF3B30' }}>{error}</p>}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Results view
  const red    = patients.filter((p) => p.severity?.triage_tag === 'RED')
  const yellow = patients.filter((p) => p.severity?.triage_tag === 'YELLOW')
  const green  = patients.filter((p) => p.severity?.triage_tag === 'GREEN')
  const sorted = [...red, ...yellow, ...green]

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
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

      <div className="flex gap-4" style={{ minHeight: 420 }}>
        {/* Patient list */}
        <div style={{ width: 280, flexShrink: 0, overflowY: 'auto', maxHeight: 480 }}>
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
        <div className="flex-1 rounded-2xl overflow-hidden" style={{ minHeight: 420 }}>
          <MapContainer
            center={eventLocation ? [eventLocation.lat, eventLocation.lng] : [18.52, 73.856]}
            zoom={12}
            style={{ height: 420, width: '100%' }}
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

      {/* Load distribution chart */}
      {(() => {
        const hospCounts = {}
        sorted.forEach((p) => {
          const name = p.routing?.recommended?.[0]?.name
          if (name) hospCounts[name] = (hospCounts[name] || 0) + 1
        })
        const chartData = Object.entries(hospCounts)
          .map(([name, count]) => ({ name: name.replace(' Hospital', '').replace(' Clinic', ''), count }))
          .sort((a, b) => b.count - a.count)
        const maxCount = Math.max(...chartData.map((d) => d.count))
        return (
          <div className="card p-4" style={{ flexShrink: 0 }}>
            <p className="label mb-1">Hospital Load Distribution</p>
            <p className="text-xs mb-3" style={{ color: '#86868B' }}>Patients routed to each facility — ensures no single hospital is overloaded</p>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#86868B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#86868B' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #E5E5EA', fontSize: 12, fontFamily: 'Inter' }}
                  formatter={(v) => [`${v} patient${v !== 1 ? 's' : ''}`, 'Assigned']}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.count === maxCount ? '#FF9500' : '#007AFF'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )
      })()}

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
