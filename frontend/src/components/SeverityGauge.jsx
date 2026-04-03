import React, { useEffect, useState } from 'react'

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', color: '#FF3B30', bg: 'rgba(255,59,48,0.08)', textColor: '#FF3B30' },
  severe:   { label: 'Severe',   color: '#FF9500', bg: 'rgba(255,149,0,0.08)', textColor: '#FF9500' },
  moderate: { label: 'Moderate', color: '#FFCC00', bg: 'rgba(255,204,0,0.08)', textColor: '#B8860B' },
  stable:   { label: 'Stable',   color: '#34C759', bg: 'rgba(52,199,89,0.08)', textColor: '#34C759' },
}

export default function SeverityGauge({ severity = 'critical', score = 87 }) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.critical

  useEffect(() => {
    setAnimatedScore(0)
    const start = performance.now()
    const duration = 1000
    const target = score

    const animate = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedScore(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [score, severity])

  const radius = 56
  const stroke = 10
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const dashOffset = circumference - (animatedScore / 100) * circumference * 0.75
  const startAngle = 135
  const endAngle = 135 + (animatedScore / 100) * 270

  const cx = radius, cy = radius
  const trackStart = polarToCartesian(cx, cy, normalizedRadius, 135)
  const trackEnd   = polarToCartesian(cx, cy, normalizedRadius, 405)
  const arcEnd     = polarToCartesian(cx, cy, normalizedRadius, endAngle)

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

  return (
    <div className="flex flex-col items-center py-2">
      <p className="label mb-3">Severity Assessment</p>
      <div className="relative" style={{ width: radius * 2, height: radius * 2 }}>
        <svg width={radius * 2} height={radius * 2}>
          {/* Track */}
          <path
            d={describeArc(cx, cy, normalizedRadius, 135, 405)}
            fill="none"
            stroke="#E5E5EA"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          {/* Progress */}
          {animatedScore > 0 && (
            <path
              d={describeArc(cx, cy, normalizedRadius, 135, Math.min(endAngle, 404))}
              fill="none"
              stroke={config.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              style={{
                filter: `drop-shadow(0 0 6px ${config.color}80)`,
                transition: 'none',
              }}
            />
          )}
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: 8 }}>
          <span className="text-3xl font-bold" style={{ color: config.color, lineHeight: 1 }}>
            {animatedScore}
          </span>
          <span className="text-xs font-medium" style={{ color: '#86868B' }}>/ 100</span>
        </div>
      </div>

      <div
        className="mt-3 px-4 py-1.5 rounded-full text-sm font-600"
        style={{ background: config.bg, color: config.textColor, fontWeight: 600 }}
      >
        {config.label}
      </div>

      {/* Severity ticks */}
      <div className="flex gap-1 mt-3">
        {['stable', 'moderate', 'severe', 'critical'].map((s) => (
          <div
            key={s}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: 20,
              background: severity === s ? SEVERITY_CONFIG[s].color : '#E5E5EA',
              transform: severity === s ? 'scaleY(1.5)' : 'scaleY(1)',
            }}
          />
        ))}
      </div>
    </div>
  )
}
