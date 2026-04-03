import React, { useEffect, useState } from 'react'

const SEVERITY_CONFIG = {
  critical: { label: 'Critical',  color: '#FF3B30', bg: 'rgba(255,59,48,0.08)',  textColor: '#FF3B30' },
  severe:   { label: 'Severe',    color: '#FF9500', bg: 'rgba(255,149,0,0.08)',  textColor: '#FF9500' },
  moderate: { label: 'Moderate',  color: '#FFCC00', bg: 'rgba(255,204,0,0.08)',  textColor: '#B8860B' },
  stable:   { label: 'Stable',    color: '#34C759', bg: 'rgba(52,199,89,0.08)',  textColor: '#34C759' },
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function describeArc(cx, cy, r, startDeg, endDeg) {
  const start = polarToCartesian(cx, cy, r, startDeg)
  const end   = polarToCartesian(cx, cy, r, endDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`
}

export default function SeverityGauge({ severity = 'critical', score = 87, needsICU, needsVentilator, primarySpecialist, triageTag, allSpecialists }) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.critical

  useEffect(() => {
    setAnimatedScore(0)
    const start = performance.now()
    const animate = (now) => {
      const progress = Math.min((now - start) / 1000, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedScore(Math.round(eased * score))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [score, severity])

  const radius = 56
  const stroke = 10
  const nr = radius - stroke / 2
  const endAngle = 135 + (animatedScore / 100) * 270

  return (
    <div className="flex flex-col">
      <p className="label mb-3">Severity Assessment</p>

      {/* Gauge + triage tag row */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-shrink-0" style={{ width: radius * 2, height: radius * 2 }}>
          <svg width={radius * 2} height={radius * 2}>
            <path d={describeArc(radius, radius, nr, 135, 405)} fill="none" stroke="#E5E5EA" strokeWidth={stroke} strokeLinecap="round" />
            {animatedScore > 0 && (
              <path d={describeArc(radius, radius, nr, 135, Math.min(endAngle, 404))} fill="none" stroke={config.color} strokeWidth={stroke} strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 6px ${config.color}80)` }} />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: 8 }}>
            <span className="text-3xl font-bold" style={{ color: config.color, lineHeight: 1 }}>{animatedScore}</span>
            <span className="text-xs font-medium" style={{ color: '#86868B' }}>/ 100</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {/* Severity label */}
          <div className="px-3 py-1.5 rounded-full text-sm font-semibold w-fit" style={{ background: config.bg, color: config.textColor }}>
            {config.label}
          </div>
          {/* Triage tag */}
          {triageTag && (
            <div className="px-3 py-1.5 rounded-full text-sm font-black w-fit"
              style={{
                background: triageTag === 'RED' ? '#FF3B30' : triageTag === 'YELLOW' ? '#FF9500' : '#34C759',
                color: 'white',
                letterSpacing: 1,
              }}>
              ◉ {triageTag} TRIAGE
            </div>
          )}
        </div>
      </div>

      {/* Care requirements — the key output of the severity model */}
      <div className="rounded-xl p-3 mb-3" style={{ background: '#F5F5F7', border: '1px solid #E5E5EA' }}>
        <p className="text-xs font-semibold mb-2" style={{ color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          Predicted Care Requirements
        </p>
        <div className="flex flex-col gap-1.5">
          <CareRow label="ICU Bed" needed={needsICU} />
          <CareRow label="Ventilator" needed={needsVentilator} />
          <CareRow label={primarySpecialist ? primarySpecialist.replace(/_/g, ' ') : 'Specialist'} needed={!!primarySpecialist} isSpecialist />
        </div>
      </div>

      {/* All specialists needed */}
      {allSpecialists?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {allSpecialists.map((s) => (
            <span key={s} className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: 'rgba(88,86,214,0.08)', color: '#5856D6' }}>
              {s.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function CareRow({ label, needed, isSpecialist }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium capitalize" style={{ color: '#3C3C43' }}>{label}</span>
      <span className="text-xs font-bold px-2 py-0.5 rounded-md"
        style={{
          background: needed ? 'rgba(52,199,89,0.1)' : 'rgba(142,142,147,0.1)',
          color: needed ? '#34C759' : '#8E8E93',
        }}>
        {needed ? '✓ Required' : '✕ Not needed'}
      </span>
    </div>
  )
}
