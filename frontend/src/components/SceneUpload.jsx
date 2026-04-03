import React, { useState, useRef } from 'react'
import { Camera, Loader, AlertTriangle, CheckCircle } from 'lucide-react'

const SEVERITY_STYLE = {
  high:   { color: '#FF3B30', bg: 'rgba(255,59,48,0.08)', border: 'rgba(255,59,48,0.2)', label: 'HIGH SEVERITY' },
  medium: { color: '#FF9500', bg: 'rgba(255,149,0,0.08)',  border: 'rgba(255,149,0,0.2)',  label: 'MEDIUM SEVERITY' },
  low:    { color: '#34C759', bg: 'rgba(52,199,89,0.08)',  border: 'rgba(52,199,89,0.2)',  label: 'LOW SEVERITY' },
}

export default function SceneUpload({ onSceneAnalyzed }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [preview, setPreview] = useState(null)
  const inputRef = useRef(null)

  async function handleFile(file) {
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setLoading(true)
    setResult(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('http://localhost:8000/analyze-scene', { method: 'POST', body: form })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setResult(data)
      onSceneAnalyzed?.(data)
    } catch (e) {
      setResult({ error: 'Analysis failed. Proceed with manual vitals.' })
    } finally {
      setLoading(false)
    }
  }

  const sty = result && !result.error ? SEVERITY_STYLE[result.severity] : null

  return (
    <div className="mb-4">
      <p className="label mb-2">Scene Photo <span className="ml-1 text-xs font-normal" style={{ color: '#86868B' }}>Twist 1</span></p>

      {/* Upload area */}
      <div
        onClick={() => inputRef.current?.click()}
        className="rounded-xl flex items-center justify-center cursor-pointer transition-all"
        style={{
          height: preview ? 'auto' : 56,
          border: `1px dashed ${sty ? sty.border : '#D1D1D6'}`,
          background: sty ? sty.bg : '#F5F5F7',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div className="flex items-center gap-2 py-3">
            <Loader size={14} className="animate-spin" style={{ color: '#86868B' }} />
            <span className="text-xs" style={{ color: '#86868B' }}>Analyzing scene…</span>
          </div>
        ) : preview ? (
          <img src={preview} alt="scene" style={{ width: '100%', maxHeight: 120, objectFit: 'cover' }} />
        ) : (
          <div className="flex items-center gap-2">
            <Camera size={14} style={{ color: '#86868B' }} />
            <span className="text-xs" style={{ color: '#86868B' }}>Upload scene photo</span>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />

      {/* Result */}
      {result && !result.error && sty && (
        <div className="mt-2 rounded-xl p-2.5" style={{ background: sty.bg, border: `1px solid ${sty.border}` }}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={12} style={{ color: sty.color }} />
            <span className="text-xs font-bold" style={{ color: sty.color }}>{sty.label}</span>
            <span className="text-xs ml-auto" style={{ color: '#86868B' }}>{Math.round(result.confidence * 100)}% conf.</span>
          </div>
          <p className="text-xs" style={{ color: '#3C3C43' }}>{result.reason}</p>
          {result.trauma_only && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <AlertTriangle size={11} style={{ color: '#FF3B30' }} />
              <span className="text-xs font-semibold" style={{ color: '#FF3B30' }}>Level 1 Trauma Centers only — routing overridden</span>
            </div>
          )}
          {result.detected?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {result.detected.map((d) => (
                <span key={d} className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(0,0,0,0.06)', color: '#3C3C43' }}>{d}</span>
              ))}
            </div>
          )}
        </div>
      )}
      {result?.error && (
        <p className="mt-1 text-xs" style={{ color: '#86868B' }}>{result.error}</p>
      )}
    </div>
  )
}
