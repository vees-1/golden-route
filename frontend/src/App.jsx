import React, { useState, lazy, Suspense } from 'react'
import { Activity, Users, Hospital } from 'lucide-react'
import PatientForm from './components/PatientForm'
import EMTAssistant from './components/EMTAssistant'
import SeverityGauge from './components/SeverityGauge'
import SurvivalCard from './components/SurvivalCard'
import HospitalCard from './components/HospitalCard'
import RejectedList from './components/RejectedList'
import AIReasoningPanel from './components/AIReasoningPanel'
import MassCasualtyView from './components/MassCasualtyView'
import HospitalStatusView from './components/HospitalStatusView'
import { PICKUP_LOCATIONS } from './data/mockData'

const MapView = lazy(() => import('./components/MapView'))

const TABS = [
  { id: 'dispatch', label: 'Dispatch',        icon: Activity },
  { id: 'mass',     label: 'Mass Casualty',   icon: Users },
  { id: 'network',  label: 'Hospital Network', icon: Hospital },
]

// Map real API response → component-friendly shape
function normalizeResult(data) {
  if (!data?.severity) return null
  const sev = data.severity
  const surv = data.survival
  const routing = data.routing
  const comp = data.comparison

  const optimal = routing?.recommended?.[0]
  const nearestName = routing?.nearest_hospital
  const allHospitals = [...(routing?.recommended ?? []), ...(routing?.infeasible ?? [])]
  const nearestHosp = allHospitals.find((h) => h.name === nearestName)

  const severityLabel = sev.severity_label?.toLowerCase() ?? 'moderate'
  const labelMap = { minor: 'stable', moderate: 'moderate', serious: 'severe', critical: 'critical', 'life-threatening': 'critical' }

  return {
    // for SeverityGauge
    severity: labelMap[severityLabel] ?? 'moderate',
    severityScore: Math.round(sev.confidence * 100),
    severityLabel: sev.severity_label,
    triageTag: sev.triage_tag,

    // for SurvivalCard
    survivalProbability: (comp?.optimal_survival_pct ?? surv?.base_survival_pct ?? 0) / 100,
    nearestSurvivalProbability: (comp?.nearest_survival_pct ?? surv?.base_survival_pct ?? 0) / 100,
    survivalGain: (comp?.survival_gain_pct ?? 0) / 100,

    // for FeatureImportanceChart
    featureImportance: (sev.top_features ?? []).map((f, i) => ({
      feature: f.feature === 'max_symptom_weight' ? 'symptom severity'
             : f.feature === 'symptom_count'      ? 'symptom count'
             : f.feature.replace(/_/g, ' '),
      value: f.importance,
      color: i === 0 ? '#FF3B30' : i === 1 ? '#FF9500' : '#007AFF',
    })),

    // for HospitalCard
    selectedHospital: optimal ? {
      id: optimal.id,
      name: optimal.name,
      icuBeds: optimal.icu_available + 5,
      icuAvailable: optimal.icu_available,
      ventilators: optimal.vent_available + 3,
      ventsAvailable: optimal.vent_available,
      specialties: optimal.specialists?.map((s) => s.replace(/_/g, ' ')) ?? [],
      eta: optimal.est_travel_minutes,
      distance: optimal.dist_km,
      survivalRate: Math.round((comp?.optimal_survival_pct ?? 85)),
      lat: optimal.lat,
      lng: optimal.lng,
    } : null,

    nearestHospital: nearestHosp ? { name: nearestHosp.name, eta: nearestHosp.est_travel_minutes } : null,

    // for AIReasoningPanel
    aiExplanation: data.explanation ?? '',

    // pass raw for GoldenHour + map route
    _raw: data,

    // route for map
    route: optimal ? [
      [routing?.recommended?.[0]?.lat ?? 18.52, routing?.recommended?.[0]?.lng ?? 73.856],
    ] : null,
  }
}

export default function App() {
  const [activeTab, setActiveTab]       = useState('dispatch')
  const [result, setResult]             = useState(null)
  const [rawResult, setRawResult]       = useState(null)
  const [isLoading, setIsLoading]       = useState(false)
  const [pickupLocation, setPickupLocation] = useState(PICKUP_LOCATIONS[0])
  const [vitalsFromAI, setVitalsFromAI] = useState(null)

  async function handleAnalyze({ vitals, symptoms, location }) {
    setPickupLocation(location)
    setIsLoading(true)
    try {
      const payload = {
        lat: location.lat,
        lng: location.lng,
        age: vitals.age,
        heart_rate: vitals.hr,
        bp_systolic: vitals.bp,
        bp_diastolic: Math.round(vitals.bp * 0.65),
        spo2: vitals.spo2,
        gcs: vitals.gcs,
        respiratory_rate: vitals.rr,
        spo2_trend_per_min: 0,
        hr_trend_per_min: 0,
        symptoms: symptoms.join('|'),
      }
      const res = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const data = await res.json()
        setRawResult(data)
        setResult(normalizeResult(data))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F5F5F7' }}>
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-0"
        style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.07)', height: 56, position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#FF3B30,#FF6B35)' }}>
            <span style={{ fontSize: 16 }}>🚑</span>
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: '#1D1D1F', lineHeight: 1.2 }}>GoldenRoute</h1>
            <p className="text-xs" style={{ color: '#86868B', lineHeight: 1.2 }}>Emergency Routing AI</p>
          </div>
        </div>

        <nav className="flex items-center gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isActive ? 'tab-active' : 'tab-inactive'}`}>
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}
        </nav>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(52,199,89,0.1)', border: '1px solid rgba(52,199,89,0.25)' }}>
          <span className="w-2 h-2 rounded-full animate-pulse-slow" style={{ background: '#34C759' }} />
          <span className="text-xs font-semibold" style={{ color: '#34C759' }}>System Live</span>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {activeTab === 'dispatch' && (
          <DispatchView result={result} isLoading={isLoading} pickupLocation={pickupLocation} onAnalyze={handleAnalyze} vitalsFromAI={vitalsFromAI} onVitalsExtracted={setVitalsFromAI} />
        )}
        {activeTab === 'mass' && (
          <div className="p-6 overflow-y-auto animate-fade-in" style={{ height: 'calc(100vh - 56px)' }}>
            <MassCasualtyView />
          </div>
        )}
        {activeTab === 'network' && (
          <div className="p-6 overflow-y-auto animate-fade-in" style={{ height: 'calc(100vh - 56px)' }}>
            <HospitalStatusView lastResult={rawResult} />
          </div>
        )}
      </main>
    </div>
  )
}

function DispatchView({ result, isLoading, pickupLocation, onAnalyze, vitalsFromAI, onVitalsExtracted }) {
  const hasAnalyzed = !!result

  return (
    <div className="flex gap-0 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
      <aside className="flex-shrink-0 flex flex-col p-4 overflow-y-auto"
        style={{ width: 280, borderRight: '1px solid rgba(0,0,0,0.06)', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)' }}>
        <PatientForm onAnalyze={onAnalyze} isLoading={isLoading} prefillVitals={vitalsFromAI} />
        <EMTAssistant onVitalsExtracted={onVitalsExtracted} />
      </aside>

      <div className="flex-1 relative" style={{ minWidth: 0 }}>
        <Suspense fallback={<div className="w-full h-full flex items-center justify-center" style={{ background: '#F5F5F7' }}><p className="text-sm" style={{ color: '#86868B' }}>Loading map…</p></div>}>
          <MapView result={result} pickupLocation={pickupLocation} />
        </Suspense>

        {!hasAnalyzed && (
          <div className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none" style={{ zIndex: 10 }}>
            <div className="px-5 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
              <p className="text-sm font-medium" style={{ color: '#86868B' }}>
                Fill in patient vitals and click <strong style={{ color: '#007AFF' }}>Find Optimal Hospital</strong>
              </p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(245,245,247,0.7)', backdropFilter: 'blur(8px)', zIndex: 20 }}>
            <div className="px-8 py-6 rounded-3xl text-center" style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 16px 48px rgba(0,0,0,0.15)' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg,#007AFF,#5856D6)' }}>
                <span className="text-2xl">🧠</span>
              </div>
              <p className="font-bold text-base mb-1" style={{ color: '#1D1D1F' }}>Analyzing patient…</p>
              <p className="text-sm" style={{ color: '#86868B' }}>Evaluating 15 hospitals in Pune</p>
            </div>
          </div>
        )}
      </div>

      <aside className="flex-shrink-0 flex flex-col overflow-y-auto"
        style={{ width: 320, borderLeft: '1px solid rgba(0,0,0,0.06)', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)' }}>
        {!hasAnalyzed ? <EmptyRightPanel /> : <ResultPanel result={result} />}
      </aside>
    </div>
  )
}

function EmptyRightPanel() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
      <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,rgba(0,122,255,0.1),rgba(88,86,214,0.08))' }}>
        <Activity size={28} color="#007AFF" />
      </div>
      <div>
        <p className="font-semibold text-base mb-1" style={{ color: '#1D1D1F' }}>Ready to Analyze</p>
        <p className="text-sm leading-relaxed" style={{ color: '#86868B' }}>Enter patient vitals and click Analyze to see AI-optimized routing results.</p>
      </div>
      <div className="w-full space-y-3 mt-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl" style={{ height: 56, background: 'linear-gradient(90deg,#F2F2F7,#E5E5EA,#F2F2F7)', backgroundSize: '200% 100%', animation: `shimmer 1.8s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
    </div>
  )
}

function ResultPanel({ result }) {
  if (!result) return null
  return (
    <div className="flex flex-col gap-4 p-4 animate-fade-in">
      <div className="card p-4">
        <SeverityGauge
          severity={result.severity}
          score={result.severityScore}
          needsICU={result._raw?.severity?.needs_icu}
          needsVentilator={result._raw?.severity?.needs_ventilator}
          primarySpecialist={result._raw?.severity?.primary_specialist}
          triageTag={result._raw?.severity?.triage_tag}
          allSpecialists={result._raw?.severity?.all_specialists}
        />
      </div>
      <div className="card p-4">
        <SurvivalCard survival={result.survivalProbability} nearestSurvival={result.nearestSurvivalProbability} gain={result.survivalGain} />
      </div>
      {result.selectedHospital && (
        <div>
          <p className="label mb-2">Recommended Hospital</p>
          <HospitalCard hospital={result.selectedHospital} isSelected />
        </div>
      )}
      <div className="card p-4">
        <AIReasoningPanel explanation={result.aiExplanation} hospital={result.selectedHospital} />
      </div>
      <div className="card p-4">
        <RejectedList infeasibleHospitals={result._raw?.routing?.infeasible ?? []} />
      </div>
    </div>
  )
}
