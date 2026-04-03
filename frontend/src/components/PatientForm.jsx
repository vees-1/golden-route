import React, { useState, useRef } from 'react'
import { Activity, Heart, Wind, Brain, User, Mic, MicOff, Loader } from 'lucide-react'
import { SYMPTOMS, PICKUP_LOCATIONS } from '../data/mockData'

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

export default function PatientForm({ onAnalyze, isLoading }) {
  const [vitals, setVitals] = useState(
    Object.fromEntries(VITAL_CONFIG.map((v) => [v.id, v.default]))
  )
  const [symptoms, setSymptoms] = useState([])
  const [location, setLocation] = useState(PICKUP_LOCATIONS[0])

  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [transcription, setTranscription] = useState('')
  const mediaRef = useRef(null)
  const chunksRef = useRef([])

  function toggleSymptom(id) {
    setSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  function handleSubmit(e) {
    e.preventDefault()
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

      // auto-fill vitals
      const updates = {}
      if (data.age) updates.age = data.age
      if (data.heart_rate) updates.hr = data.heart_rate
      if (data.bp_systolic) updates.bp = data.bp_systolic
      if (data.spo2) updates.spo2 = data.spo2
      if (data.gcs) updates.gcs = data.gcs
      if (data.respiratory_rate) updates.rr = data.respiratory_rate
      if (Object.keys(updates).length) setVitals((prev) => ({ ...prev, ...updates }))

      // auto-fill symptoms
      if (data.symptoms) {
        const extracted = data.symptoms.split('|').filter(Boolean)
        if (extracted.length) setSymptoms(extracted)
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
      <div className="mb-4">
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

      {/* Vitals */}
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

      {/* Pickup location */}
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

      {/* Symptoms */}
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
