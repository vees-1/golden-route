import React from 'react'

const RANK_STYLES = [
  { bar: 'linear-gradient(90deg, #FF3B30, #FF6B6B)', text: '#FF3B30', bg: 'rgba(255,59,48,0.08)' },
  { bar: 'linear-gradient(90deg, #FF9500, #FFCC00)', text: '#FF9500', bg: 'rgba(255,149,0,0.08)' },
  { bar: 'linear-gradient(90deg, #007AFF, #5856D6)', text: '#007AFF', bg: 'rgba(0,122,255,0.06)' },
  { bar: 'linear-gradient(90deg, #007AFF, #5856D6)', text: '#007AFF', bg: 'rgba(0,122,255,0.06)' },
  { bar: 'linear-gradient(90deg, #007AFF, #5856D6)', text: '#007AFF', bg: 'rgba(0,122,255,0.06)' },
]

export default function FeatureImportanceChart({ features = [] }) {
  if (!features.length) return null

  const max = Math.max(...features.map((f) => f.value), 0.01)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="label">Feature Importance</p>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: 'rgba(88,86,214,0.08)', color: '#5856D6' }}>SHAP</span>
      </div>

      <div className="space-y-2.5">
        {features.map((f, i) => {
          const style = RANK_STYLES[i] || RANK_STYLES[4]
          const pct = Math.max((f.value / max) * 100, 4)
          const displayPct = (f.value * 100).toFixed(0)

          return (
            <div key={f.feature} className="flex items-center gap-3">
              {/* Rank badge */}
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: style.bg }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: style.text }}>#{i + 1}</span>
              </div>

              {/* Feature name + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold capitalize" style={{ color: '#1D1D1F' }}>{f.feature}</span>
                  <span className="text-xs font-bold ml-2 flex-shrink-0" style={{ color: style.text }}>{displayPct}%</span>
                </div>
                <div className="rounded-full overflow-hidden" style={{ height: 6, background: '#F2F2F7' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: style.bar }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
