import React, { useEffect, useState } from 'react'
import { TrendingUp, Target } from 'lucide-react'

export default function SurvivalCard({ survival = 0.847, nearestSurvival = 0.712, gain = 0.135 }) {
  const [displayed, setDisplayed] = useState(0)
  const [displayedNearest, setDisplayedNearest] = useState(0)

  useEffect(() => {
    animateValue(survival * 100, setDisplayed)
    animateValue(nearestSurvival * 100, setDisplayedNearest)
  }, [survival, nearestSurvival])

  function animateValue(target, setter) {
    const start = performance.now()
    const duration = 1200
    const animate = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 4)
      setter(Math.round(eased * target * 10) / 10)
      if (p < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }

  const gainPct = Math.round(gain * 100)

  return (
    <div className="space-y-3 animate-fade-in">
      <p className="label">Survival Probability</p>

      {/* Main survival big number */}
      <div
        className="rounded-2xl p-4 text-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(52,199,89,0.12), rgba(48,209,88,0.06))',
          border: '1px solid rgba(52,199,89,0.25)',
        }}
      >
        {/* Background glow */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(52,199,89,0.2) 0%, transparent 70%)',
          }}
        />
        <div className="relative">
          <div className="flex items-end justify-center gap-1">
            <span
              className="font-bold"
              style={{ fontSize: 52, lineHeight: 1, color: '#34C759' }}
            >
              {displayed.toFixed(1)}
            </span>
            <span className="text-2xl font-semibold mb-1" style={{ color: '#34C759' }}>%</span>
          </div>
          <p className="text-xs mt-1" style={{ color: '#86868B' }}>AI-Optimized Survival</p>
        </div>
      </div>

      {/* Gain badge */}
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2.5"
        style={{ background: 'rgba(0,122,255,0.06)', border: '1px solid rgba(0,122,255,0.15)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}
        >
          <TrendingUp size={14} color="white" />
        </div>
        <div>
          <p className="text-xs font-medium" style={{ color: '#86868B' }}>vs Nearest Hospital</p>
          <p className="text-sm font-bold" style={{ color: '#007AFF' }}>
            +{gainPct}% survival gain
          </p>
        </div>
      </div>

      {/* Comparison bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: '#86868B' }}>Nearest Hospital</span>
          <span className="text-xs font-bold" style={{ color: '#FF9500' }}>
            {displayedNearest.toFixed(1)}%
          </span>
        </div>
        <div className="relative h-2 rounded-full overflow-hidden" style={{ background: '#E5E5EA' }}>
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000"
            style={{
              width: `${displayedNearest}%`,
              background: 'linear-gradient(90deg, #FF9500, #FFCC00)',
            }}
          />
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000"
            style={{
              width: `${displayed}%`,
              background: 'linear-gradient(90deg, #34C759, #30D158)',
              opacity: 0.4,
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: '#86868B' }}>AI Optimal</span>
          <span className="text-xs font-bold" style={{ color: '#34C759' }}>
            {displayed.toFixed(1)}%
          </span>
        </div>
        <div className="relative h-2 rounded-full overflow-hidden" style={{ background: '#E5E5EA' }}>
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000"
            style={{
              width: `${displayed}%`,
              background: 'linear-gradient(90deg, #34C759, #30D158)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
