import React, { useState } from 'react'
import { XCircle, ChevronDown, ChevronUp } from 'lucide-react'

const CONSTRAINT_LABELS = {
  no_icu:        'No ICU beds available',
  no_ventilator: 'No ventilator available',
}

function constraintLabel(c) {
  if (CONSTRAINT_LABELS[c]) return CONSTRAINT_LABELS[c]
  // no_pulmonologist → No pulmonologist available
  if (c.startsWith('no_')) return `No ${c.slice(3).replace(/_/g, ' ')} available`
  return c.replace(/_/g, ' ')
}

export default function RejectedList({ infeasibleHospitals = [] }) {
  const [expanded, setExpanded] = useState(false)

  if (infeasibleHospitals.length === 0) {
    return (
      <div>
        <p className="label mb-2">Hospitals Evaluated & Rejected</p>
        <p className="text-xs" style={{ color: '#86868B' }}>All evaluated hospitals met patient requirements.</p>
      </div>
    )
  }

  const shown = expanded ? infeasibleHospitals : infeasibleHospitals.slice(0, 4)

  return (
    <div>
      <p className="label mb-2">Hospitals Evaluated & Rejected</p>
      <div className="space-y-2">
        {shown.map((h) => (
          <div
            key={h.id}
            className="rounded-xl px-3 py-2.5"
            style={{ background: 'rgba(255,59,48,0.04)', border: '1px solid rgba(255,59,48,0.1)' }}
          >
            <div className="flex items-center gap-3">
              <XCircle size={14} color="#FF3B30" className="flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: '#1D1D1F' }}>{h.name}</p>
              </div>
              <span className="text-xs font-medium flex-shrink-0" style={{ color: '#86868B' }}>
                {Math.round(h.est_travel_minutes)}m away
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5 pl-5">
              {h.unmet_constraints.map((c) => (
                <span key={c} className="text-xs px-2 py-0.5 rounded-md font-medium"
                  style={{ background: 'rgba(255,59,48,0.1)', color: '#FF3B30' }}>
                  {constraintLabel(c)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      {infeasibleHospitals.length > 4 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-2 text-xs font-medium"
          style={{ color: '#86868B' }}
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Show less' : `${infeasibleHospitals.length - 4} more rejected`}
        </button>
      )}
    </div>
  )
}
