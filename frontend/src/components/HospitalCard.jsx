import React from 'react'
import { MapPin, Clock, Star } from 'lucide-react'

function AvailBar({ label, available, total }) {
  const pct = total > 0 ? (available / total) * 100 : 0
  const color = pct > 40 ? '#34C759' : pct > 15 ? '#FF9500' : '#FF3B30'
  return (
    <div className="flex-1 rounded-xl p-2.5" style={{ background: '#F5F5F7' }}>
      <p className="text-xs font-medium mb-1.5" style={{ color: '#86868B' }}>{label}</p>
      <div className="flex items-end gap-1.5 mb-1.5">
        <span className="text-xl font-black leading-none" style={{ color }}>{available}</span>
        <span className="text-xs font-medium mb-0.5" style={{ color: '#C7C7CC' }}>/ {total}</span>
      </div>
      <div className="rounded-full overflow-hidden" style={{ height: 4, background: '#E5E5EA' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default function HospitalCard({ hospital, isSelected = false }) {
  if (!hospital) return null

  const etaMin = typeof hospital.eta === 'number' ? hospital.eta.toFixed(1) : hospital.eta

  return (
    <div className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        border: '1px solid #F2F2F7',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        background: '#ffffff',
      }}>

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold" style={{ color: '#1D1D1F' }}>{hospital.name}</h3>
              {isSelected && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)', color: 'white' }}>
                  Top Pick
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={10} color="#C7C7CC" />
              <span className="text-xs" style={{ color: '#C7C7CC' }}>{hospital.distance} km away</span>
            </div>
          </div>

          {/* Survival rate */}
          <div className="flex-shrink-0 text-right ml-3">
            <div className="flex items-center gap-1 justify-end">
              <Star size={13} fill="#FFCC00" color="#FFCC00" />
              <span className="text-xl font-black" style={{ color: '#1D1D1F' }}>{hospital.survivalRate}%</span>
            </div>
            <p className="text-xs" style={{ color: '#86868B' }}>survival</p>
          </div>
        </div>

        {/* ETA — prominent */}
        <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 mb-3"
          style={{ background: '#F5F5F7', border: '1px solid #E5E5EA' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: '#E5E5EA' }}>
            <Clock size={13} color="#86868B" />
          </div>
          <div>
            <span className="text-lg font-black" style={{ color: '#1D1D1F' }}>{etaMin} min</span>
            <span className="text-xs font-medium ml-1.5" style={{ color: '#86868B' }}>ETA</span>
          </div>
        </div>

        {/* ICU + Vents */}
        <div className="flex gap-2 mb-3">
          <AvailBar label="ICU Beds" available={hospital.icuAvailable} total={hospital.icuBeds} />
          <AvailBar label="Ventilators" available={hospital.ventsAvailable} total={hospital.ventilators} />
        </div>

        {/* Specialists */}
        {hospital.specialties?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {hospital.specialties.map((spec) => (
              <span key={spec} className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: 'rgba(88,86,214,0.08)', color: '#5856D6' }}>
                {spec}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
