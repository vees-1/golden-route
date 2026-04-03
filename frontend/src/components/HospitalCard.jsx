import React from 'react'
import { MapPin, Clock, Wind, Activity, Star } from 'lucide-react'

const AVAILABILITY_COLORS = {
  high: '#34C759',
  medium: '#FF9500',
  low: '#FF3B30',
}

function getAvailabilityLevel(available, total) {
  const ratio = available / total
  if (ratio > 0.4) return 'high'
  if (ratio > 0.15) return 'medium'
  return 'low'
}

export default function HospitalCard({ hospital, isSelected = false, onSelect }) {
  if (!hospital) return null

  const icuLevel = getAvailabilityLevel(hospital.icuAvailable, hospital.icuBeds)
  const ventLevel = getAvailabilityLevel(hospital.ventsAvailable, hospital.ventilators)

  return (
    <div
      className={`rounded-2xl p-4 cursor-pointer transition-all duration-300 ${isSelected ? 'ring-2' : ''}`}
      style={{
        background: isSelected
          ? 'linear-gradient(135deg, rgba(0,122,255,0.08), rgba(88,86,214,0.06))'
          : '#ffffff',
        border: isSelected ? '1px solid rgba(0,122,255,0.3)' : '1px solid #F2F2F7',
        boxShadow: isSelected ? '0 4px 20px rgba(0,122,255,0.12)' : '0 2px 12px rgba(0,0,0,0.05)',
        ringColor: '#007AFF',
      }}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold" style={{ color: '#1D1D1F' }}>
              {hospital.name}
            </h3>
            {isSelected && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)', color: 'white' }}
              >
                Selected
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <MapPin size={11} color="#86868B" />
            <span className="text-xs" style={{ color: '#86868B' }}>{hospital.distance} km away</span>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1">
            <Star size={11} fill="#FFCC00" color="#FFCC00" />
            <span className="text-xs font-bold" style={{ color: '#1D1D1F' }}>{hospital.survivalRate}%</span>
          </div>
          <p className="text-xs" style={{ color: '#86868B' }}>survival</p>
        </div>
      </div>

      {/* ETA */}
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3"
        style={{ background: 'rgba(0,122,255,0.06)' }}
      >
        <Clock size={13} color="#007AFF" />
        <span className="text-sm font-semibold" style={{ color: '#007AFF' }}>
          {hospital.eta} min ETA
        </span>
      </div>

      {/* ICU & Vent stats */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div
          className="rounded-xl p-2.5 text-center"
          style={{
            background: `rgba(${icuLevel === 'high' ? '52,199,89' : icuLevel === 'medium' ? '255,149,0' : '255,59,48'}, 0.08)`,
          }}
        >
          <p className="text-xs font-medium mb-0.5" style={{ color: '#86868B' }}>ICU Beds</p>
          <p className="text-base font-bold" style={{ color: AVAILABILITY_COLORS[icuLevel] }}>
            {hospital.icuAvailable}
            <span className="text-xs font-normal text-textSecondary">/{hospital.icuBeds}</span>
          </p>
        </div>
        <div
          className="rounded-xl p-2.5 text-center"
          style={{
            background: `rgba(${ventLevel === 'high' ? '52,199,89' : ventLevel === 'medium' ? '255,149,0' : '255,59,48'}, 0.08)`,
          }}
        >
          <p className="text-xs font-medium mb-0.5" style={{ color: '#86868B' }}>Ventilators</p>
          <p className="text-base font-bold" style={{ color: AVAILABILITY_COLORS[ventLevel] }}>
            {hospital.ventsAvailable}
            <span className="text-xs font-normal text-textSecondary">/{hospital.ventilators}</span>
          </p>
        </div>
      </div>

      {/* Specialties */}
      <div className="flex flex-wrap gap-1">
        {hospital.specialties.map((spec) => (
          <span
            key={spec}
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: '#F2F2F7', color: '#86868B' }}
          >
            {spec}
          </span>
        ))}
      </div>
    </div>
  )
}
