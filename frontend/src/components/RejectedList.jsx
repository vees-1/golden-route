import React from 'react'
import { XCircle } from 'lucide-react'
import { HOSPITALS } from '../data/mockData'

const REJECTION_REASONS = [
  'No ICU beds available',
  'Ventilator unavailable',
  'No cardiac specialist on duty',
  'High patient load (>95%)',
  'Trauma team not available',
  'Excessive travel time (+18 min)',
  'No neurosurgery capability',
]

export default function RejectedList({ selectedId }) {
  const rejected = HOSPITALS.filter((h) => h.id !== selectedId).slice(0, 4)

  return (
    <div>
      <p className="label mb-2">Hospitals Evaluated & Rejected</p>
      <div className="space-y-2">
        {rejected.map((h, i) => (
          <div
            key={h.id}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5"
            style={{ background: 'rgba(255,59,48,0.04)', border: '1px solid rgba(255,59,48,0.1)' }}
          >
            <XCircle size={14} color="#FF3B30" className="flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: '#1D1D1F' }}>{h.name}</p>
              <p className="text-xs truncate" style={{ color: '#86868B' }}>
                {REJECTION_REASONS[i % REJECTION_REASONS.length]}
              </p>
            </div>
            <span className="text-xs font-medium flex-shrink-0" style={{ color: '#FF9500' }}>
              {h.eta}m
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
