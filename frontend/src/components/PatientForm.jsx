import React, { useState, useRef, useEffect } from 'react'
import { Activity, Heart, Wind, Brain, User, Mic, MicOff, Loader, FileText, Sliders } from 'lucide-react'
import { SYMPTOMS, PICKUP_LOCATIONS } from '../data/mockData'

const DISPATCH_JSON_PLACEHOLDER = `{
  "age": 45,
  "heart_rate": 120,
  "bp_systolic": 85,
  "bp_diastolic": 55,
  "spo2": 88,
  "gcs": 10,
  "respiratory_rate": 28,
  "spo2_trend_per_min": -0.5,
  "hr_trend_per_min": 1.2,
  "symptoms": ["chest_pain", "shortness_of_breath"]
}`

const VITAL_CONFIG = [
  {
    id: 'hr',
    label: 'Heart Rate',
    unit: 'bpm',
    min: 30,
    max: 200,
    default: 82,
    icon: Heart,
    danger: (v) => v < 50 || v > 120,
    warn: (v) => v < 60 || v > 100,
    color: '#FF3B30',
  },
  {
    id: 'bp',
    label: 'Systolic BP',
    unit: 'mmHg',
    min: 60,
    max: 200,
    default: 118,
    icon: Activity,
    danger: (v) => v < 80 || v > 180,
    warn: (v) => v < 90 || v > 140,
    color: '#FF9500',
  },
  {
    id: 'spo2',
    label: 'SpO₂',
    unit: '%',
    min: 60,
    max: 100,
    default: 97,
    icon: Wind,
    danger: (v) => v < 88,
    warn: (v) => v < 94,
    color: '#007AFF',
  },
  {
    id: 'gcs',
    label: 'GCS',
    unit: '/15',
    min: 3,
    max: 15,
    default: 14,
    icon: Brain,
    danger: (v) => v < 8,
    warn: (v) => v < 12,
    color: '#5856D6',
  },
  {
    id: 'rr',
    label: 'Resp. Rate',
    unit: '/min',
    min: 6,
    max: 40,
    default: 16,
    icon: Wind,
    danger: (v) => v < 8 || v > 30,
    warn: (v) => v < 12 || v > 20,
    color: '#34C759',
  },
  {
    id: 'age',
    label: 'Age',
    unit: 'yrs',
    min: 1,
    max: 100,
    default: 45,
    icon: User,
    danger: () => false,
    warn: (v) => v > 65,
    color: '#86868B',
  },
]

const VITAL_KEY_MAP = { hr: 'heart_rate', bp: 'bp_systolic', spo2: 'spo2', gcs: 'gcs', rr: 'respiratory_rate', age: 'age' }

export default function PatientForm({ onAnalyze, isLoading, prefillVitals }) {
  const [inputMode, setInputMode] = useState('json') // 'form' | 'json'
  const [vitals, setVitals] = useState(
    Object.fromEntries(VITAL_CONFIG.map((v) => [v.id, v.default]))
  )
  const [symptoms, setSymptoms] = useState([])
  const [location, setLocation] = useState(PICKUP_LOCATIONS[0])
  const [jsonText, setJsonText] = useState('')
  const [jsonError, setJsonError] = useState('')

  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [transcription, setTranscription] = useState('')
  const mediaRef = useRef(null)
  const chunksRef = useRef([])

  useEffect(() => {
    if (!prefillVitals) return
    const jsonPatient = {
      age:              prefillVitals.age              || 0,
      heart_rate:       prefillVitals.heart_rate       || 0,
      bp_systolic:      prefillVitals.bp_systolic      || 0,
      bp_diastolic:     prefillVitals.bp_diastolic     || 0,
      spo2:             prefillVitals.spo2             || 0,
      gcs:              prefillVitals.gcs              || 0,
      respiratory_rate: prefillVitals.respiratory_rate || 0,
      spo2_trend_per_min: 0,
      hr_trend_per_min: 0,
      symptoms: Array.isArray(prefillVitals.symptoms) ? prefillVitals.symptoms : [],
    }
    setInputMode('json')
    setJsonText(JSON.stringify(jsonPatient, null, 2))
  }, [prefillVitals])

  function toggleSymptom(id) {
    setSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (inputMode === 'json') {
      setJsonError('')
      try {
        const parsed = JSON.parse(jsonText)
        // Convert JSON patient format → form shape expected by onAnalyze
        const v = {
          hr:   parsed.heart_rate       ?? vitals.hr,
          bp:   parsed.bp_systolic      ?? vitals.bp,
          spo2: parsed.spo2             ?? vitals.spo2,
          gcs:  parsed.gcs              ?? vitals.gcs,
          rr:   parsed.respiratory_rate ?? vitals.rr,
          age:  parsed.age              ?? vitals.age,
        }
        const sym = Array.isArray(parsed.symptoms) ? parsed.symptoms : []
        const loc = parsed.lat && parsed.lng
          ? { lat: parsed.lat, lng: parsed.lng, name: 'JSON Location' }
          : location
        onAnalyze({ vitals: v, symptoms: sym, location: loc })
      } catch {
        setJsonError('Invalid JSON — check formatting and try again')
      }
      return
    }
    onAnalyze({ vitals, symptoms, location })
  }

  function getVitalColor(config, value) {
    if (config.danger(value)) return '#FF3B30'
    if (config.warn(value)) return '#FF9500'
    return '#34C759'
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mr = new MediaRecorder(stream)
    chunksRef.current = []
    mr.ondataavailable = (e) => chunksRef.current.push(e.data)
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      await sendAudio(blob)
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

  async function sendAudio(blob) {
    const form = new FormData()
    form.append('file', blob, 'audio.webm')
    try {
      const res = await fetch('http://localhost:8000/transcribe', { method: 'POST', body: form })
      const data = await res.json()
      setTranscription(data.transcription || '')

      const syms = data.symptoms ? data.symptoms.split('|').filter(Boolean) : []

      if (inputMode === 'json') {
        // Fill JSON textarea with extracted data
        const jsonPatient = {
          age:                  data.age              || 0,
          heart_rate:           data.heart_rate       || 0,
          bp_systolic:          data.bp_systolic      || 0,
          bp_diastolic:         data.bp_diastolic     || 0,
          spo2:                 data.spo2             || 0,
          gcs:                  data.gcs              || 0,
          respiratory_rate:     data.respiratory_rate || 0,
          spo2_trend_per_min:   data.spo2_trend_per_min || 0,
          hr_trend_per_min:     data.hr_trend_per_min   || 0,
          symptoms:             syms,
        }
        setJsonText(JSON.stringify(jsonPatient, null, 2))
      } else {
        // auto-fill sliders
        const updates = {}
        if (data.age)              updates.age  = data.age
        if (data.heart_rate)       updates.hr   = data.heart_rate
        if (data.bp_systolic)      updates.bp   = data.bp_systolic
        if (data.spo2)             updates.spo2 = data.spo2
        if (data.gcs)              updates.gcs  = data.gcs
        if (data.respiratory_rate) updates.rr   = data.respiratory_rate
        if (Object.keys(updates).length) setVitals((prev) => ({ ...prev, ...updates }))
        if (syms.length) setSymptoms(syms)
      }
    } catch (err) {
      console.error('Transcription failed', err)
    } finally {
      setTranscribing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">

      {/* Voice input */}
      <div className="mb-3">
        <p className="label mb-2">Voice Input</p>
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={transcribing}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all"
          style={{
            background: recording
              ? 'linear-gradient(135deg, #FF3B30, #FF6B6B)'
              : transcribing
              ? '#E5E5EA'
              : 'linear-gradient(135deg, #007AFF, #5856D6)',
            color: transcribing ? '#86868B' : 'white',
          }}
        >
          {transcribing ? (
            <><Loader size={15} className="animate-spin" /> Transcribing...</>
          ) : recording ? (
            <><MicOff size={15} /> Stop Recording</>
          ) : (
            <><Mic size={15} /> Speak Vitals</>
          )}
        </button>
        {transcription && (
          <p className="mt-2 text-xs px-2 py-1.5 rounded-lg" style={{ background: '#F5F5F7', color: '#86868B' }}>
            "{transcription}"
          </p>
        )}
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 p-1 rounded-xl mb-4" style={{ background: '#F5F5F7' }}>
        {[{ id: 'form', icon: Sliders, label: 'Sliders' }, { id: 'json', icon: FileText, label: 'JSON' }].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setInputMode(id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: inputMode === id ? 'white' : 'transparent',
              color: inputMode === id ? '#007AFF' : '#86868B',
              boxShadow: inputMode === id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            <Icon size={12} />{label}
          </button>
        ))}
      </div>

      {/* JSON input mode */}
      {inputMode === 'json' && (
        <div className="mb-4 flex flex-col gap-2">
          <p className="label">Patient JSON</p>
          <p className="text-xs" style={{ color: '#86868B' }}>Paste patient data or use voice to auto-fill</p>
          <textarea
            value={jsonText}
            onChange={(e) => { setJsonText(e.target.value); setJsonError('') }}
            placeholder={DISPATCH_JSON_PLACEHOLDER}
            className="rounded-xl p-3 text-xs font-mono resize-none focus:outline-none"
            style={{ background: '#F5F5F7', border: `1px solid ${jsonError ? '#FF3B30' : '#E5E5EA'}`, color: '#1D1D1F', minHeight: 220 }}
          />
          {jsonError && <p className="text-xs px-2 py-1.5 rounded-lg" style={{ background: 'rgba(255,59,48,0.08)', color: '#FF3B30' }}>{jsonError}</p>}
          {/* Pickup location still needed */}
          <p className="label mt-1">Pickup Location</p>
          <select className="custom-select w-full" value={location.name} onChange={(e) => { const loc = PICKUP_LOCATIONS.find((l) => l.name === e.target.value); if (loc) setLocation(loc) }}>
            {PICKUP_LOCATIONS.map((loc) => <option key={loc.name} value={loc.name}>{loc.name}</option>)}
          </select>
        </div>
      )}

      {/* Sliders + location + symptoms (form mode) */}
      {inputMode === 'form' && <>
      <div className="mb-4">
        <p className="label mb-3">Patient Vitals</p>
        <div className="space-y-4">
          {VITAL_CONFIG.map((config) => {
            const val = vitals[config.id]
            const vitalColor = getVitalColor(config, val)
            const pct = ((val - config.min) / (config.max - config.min)) * 100

            return (
              <div key={config.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <config.icon size={12} color={config.color} />
                    <span className="text-xs font-medium" style={{ color: '#1D1D1F' }}>
                      {config.label}
                    </span>
                  </div>
                  <span className="text-sm font-bold tabular-nums" style={{ color: vitalColor }}>
                    {val}
                    <span className="text-xs font-normal ml-0.5" style={{ color: '#86868B' }}>
                      {config.unit}
                    </span>
                  </span>
                </div>
                <input
                  type="range"
                  min={config.min}
                  max={config.max}
                  value={val}
                  onChange={(e) =>
                    setVitals((prev) => ({ ...prev, [config.id]: Number(e.target.value) }))
                  }
                  className="slider-input w-full"
                  style={{
                    background: `linear-gradient(to right, ${vitalColor} ${pct}%, #E5E5EA ${pct}%)`,
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>

      <div className="mb-4">
        <p className="label mb-2">Pickup Location</p>
        <select
          className="custom-select w-full"
          value={location.name}
          onChange={(e) => {
            const loc = PICKUP_LOCATIONS.find((l) => l.name === e.target.value)
            if (loc) setLocation(loc)
          }}
        >
          {PICKUP_LOCATIONS.map((loc) => (
            <option key={loc.name} value={loc.name}>{loc.name}</option>
          ))}
        </select>
      </div>

      <div className="mb-5 flex-1">
        <p className="label mb-2">
          Symptoms
          {symptoms.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(0,122,255,0.1)', color: '#007AFF' }}>
              {symptoms.length}
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SYMPTOMS.map((sym) => (
            <button
              key={sym.id}
              type="button"
              onClick={() => toggleSymptom(sym.id)}
              className={`pill ${symptoms.includes(sym.id) ? 'pill-selected' : 'pill-unselected'}`}
            >
              {symptoms.includes(sym.id) && <span style={{ fontSize: 10 }}>✓</span>}
              {sym.label}
            </button>
          ))}
        </div>
      </div>
      </>}

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Analyzing...</>
        ) : (
          <><Activity size={16} />Find Optimal Hospital</>
        )}
      </button>
    </form>
  )
}
