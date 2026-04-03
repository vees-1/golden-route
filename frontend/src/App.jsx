import React, { useState, lazy, Suspense } from 'react'
import { Activity, Clock, Users, BarChart2, AlertTriangle } from 'lucide-react'
import PatientForm from './components/PatientForm'
import SeverityGauge from './components/SeverityGauge'
import SurvivalCard from './components/SurvivalCard'
import FeatureImportanceChart from './components/FeatureImportanceChart'
import HospitalCard from './components/HospitalCard'
import RejectedList from './components/RejectedList'
import AIReasoningPanel from './components/AIReasoningPanel'
import GoldenHourChart from './components/GoldenHourChart'
import MassCasualtyView from './components/MassCasualtyView'
import SimulationView from './components/SimulationView'
import { MOCK_RESULT, PICKUP_LOCATIONS } from './data/mockData'

const MapView = lazy(() => import('./components/MapView'))

const TABS = [
  { id: 'dispatch',    label: 'Dispatch',         icon: Activity },
  { id: 'golden',     label: 'Golden Hour',       icon: Clock },
  { id: 'mass',       label: 'Mass Casualty',     icon: Users },
  { id: 'simulation', label: 'City Simulation',   icon: BarChart2 },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('dispatch')
  const [result, setResult]       = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [pickupLocation, setPickupLocation] = useState(PICKUP_LOCATIONS[0])
  const [hasAnalyzed, setHasAnalyzed] = useState(false)

  async function handleAnalyze({ vitals, symptoms, location }) {
    setPickupLocation(location)
    setIsLoading(true)

    try {
      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vitals, symptoms, location }),
        signal: AbortSignal.timeout(5000),
      })
      if (response.ok) {
        const data = await response.json()
        setResult(data)
        setHasAnalyzed(true)
        return
      }
    } catch {
      // Fall through to mock data
    }

    // Simulate processing delay then use mock data
    await new Promise((r) => setTimeout(r, 1200))

    // Adjust mock result based on vitals for a bit of dynamism
    const severityScore = Math.min(100, Math.round(
      (vitals.hr > 120 ? 20 : vitals.hr < 50 ? 25 : 5) +
      (vitals.spo2 < 88 ? 30 : vitals.spo2 < 94 ? 15 : 0) +
      (vitals.gcs < 8 ? 25 : vitals.gcs < 12 ? 15 : 0) +
      (symptoms.includes('cardiac_arrest') ? 30 : 0) +
      (symptoms.includes('stroke_symptoms') ? 20 : 0) +
      (symptoms.includes('severe_bleeding') ? 15 : 0) +
      (vitals.age > 65 ? 5 : 0)
    ))

    const severity =
      severityScore >= 70 ? 'critical'
      : severityScore >= 45 ? 'severe'
      : severityScore >= 20 ? 'moderate'
      : 'stable'

    setResult({ ...MOCK_RESULT, severityScore, severity })
    setHasAnalyzed(true)
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F5F5F7' }}>
      {/* Top navbar */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-6 py-0"
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
          height: 56,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #FF3B30, #FF6B35)' }}
          >
            <span style={{ fontSize: 16 }}>🚑</span>
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: '#1D1D1F', lineHeight: 1.2 }}>
              GoldenRoute
            </h1>
            <p className="text-xs" style={{ color: '#86868B', lineHeight: 1.2 }}>
              Emergency Routing AI
            </p>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex items-center gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isActive ? 'tab-active' : 'tab-inactive'}`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}
        </nav>

        {/* Status pill */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(52,199,89,0.1)', border: '1px solid rgba(52,199,89,0.25)' }}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse-slow"
            style={{ background: '#34C759' }}
          />
          <span className="text-xs font-semibold" style={{ color: '#34C759' }}>System Live</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'dispatch' && (
          <DispatchView
            result={result}
            isLoading={isLoading}
            hasAnalyzed={hasAnalyzed}
            pickupLocation={pickupLocation}
            onAnalyze={handleAnalyze}
            onLoadingChange={setIsLoading}
          />
        )}

        {activeTab === 'golden' && (
          <div className="p-6 h-full overflow-y-auto animate-fade-in">
            <GoldenHourChart />
          </div>
        )}

        {activeTab === 'mass' && (
          <div
            className="p-6 overflow-y-auto animate-fade-in"
            style={{ height: 'calc(100vh - 56px)' }}
          >
            <div className="mb-4">
              <h2 className="text-2xl font-bold" style={{ color: '#1D1D1F' }}>Mass Casualty Management</h2>
              <p className="text-sm mt-1" style={{ color: '#86868B' }}>
                Multi-patient triage and optimal hospital assignment across the city
              </p>
            </div>
            <div style={{ height: 'calc(100% - 72px)' }}>
              <MassCasualtyView />
            </div>
          </div>
        )}

        {activeTab === 'simulation' && (
          <div
            className="p-6 overflow-y-auto animate-fade-in"
            style={{ height: 'calc(100vh - 56px)' }}
          >
            <SimulationView />
          </div>
        )}
      </main>
    </div>
  )
}

function DispatchView({ result, isLoading, hasAnalyzed, pickupLocation, onAnalyze, onLoadingChange }) {
  return (
    <div
      className="flex gap-0 overflow-hidden"
      style={{ height: 'calc(100vh - 56px)' }}
    >
      {/* LEFT SIDEBAR */}
      <aside
        className="flex-shrink-0 flex flex-col p-4 overflow-y-auto"
        style={{
          width: 280,
          borderRight: '1px solid rgba(0,0,0,0.06)',
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <PatientForm onAnalyze={onAnalyze} isLoading={isLoading} />
      </aside>

      {/* CENTER MAP */}
      <div className="flex-1 relative" style={{ minWidth: 0 }}>
        <Suspense
          fallback={
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: '#F5F5F7' }}
            >
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"
                  style={{ borderWidth: 3, borderColor: '#007AFF', borderTopColor: 'transparent' }}
                />
                <p className="text-sm" style={{ color: '#86868B' }}>Loading map…</p>
              </div>
            </div>
          }
        >
          <MapView result={result} pickupLocation={pickupLocation} />
        </Suspense>

        {/* Empty state overlay when not analyzed */}
        {!hasAnalyzed && (
          <div
            className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none"
            style={{ zIndex: 10 }}
          >
            <div
              className="px-5 py-3 rounded-2xl"
              style={{
                background: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.8)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              }}
            >
              <p className="text-sm font-medium" style={{ color: '#86868B' }}>
                Fill in patient vitals and click <strong style={{ color: '#007AFF' }}>Find Optimal Hospital</strong>
              </p>
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'rgba(245,245,247,0.7)', backdropFilter: 'blur(8px)', zIndex: 20 }}
          >
            <div
              className="px-8 py-6 rounded-3xl text-center"
              style={{
                background: 'rgba(255,255,255,0.95)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
              }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}
              >
                <span className="text-2xl">🧠</span>
              </div>
              <p className="font-bold text-base mb-1" style={{ color: '#1D1D1F' }}>
                Analyzing patient…
              </p>
              <p className="text-sm" style={{ color: '#86868B' }}>
                Evaluating {11} hospitals in Pune
              </p>
              <div
                className="mt-4 h-1 rounded-full overflow-hidden"
                style={{ background: '#E5E5EA', width: 160 }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #007AFF, #5856D6)',
                    animation: 'progressBar 1.2s ease-out forwards',
                    width: '0%',
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL */}
      <aside
        className="flex-shrink-0 flex flex-col overflow-y-auto"
        style={{
          width: 320,
          borderLeft: '1px solid rgba(0,0,0,0.06)',
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {!hasAnalyzed ? (
          <EmptyRightPanel />
        ) : result ? (
          <ResultPanel result={result} />
        ) : null}
      </aside>
    </div>
  )
}

function EmptyRightPanel() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
      <div
        className="w-16 h-16 rounded-3xl flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, rgba(0,122,255,0.1), rgba(88,86,214,0.08))' }}
      >
        <Activity size={28} color="#007AFF" />
      </div>
      <div>
        <p className="font-semibold text-base mb-1" style={{ color: '#1D1D1F' }}>
          Ready to Analyze
        </p>
        <p className="text-sm leading-relaxed" style={{ color: '#86868B' }}>
          Enter patient vitals on the left and click Analyze to see AI-optimized routing results.
        </p>
      </div>

      {/* Preview cards as skeleton */}
      <div className="w-full space-y-3 mt-2">
        {[100, 80, 120].map((w, i) => (
          <div
            key={i}
            className="rounded-2xl"
            style={{
              height: 56,
              background: 'linear-gradient(90deg, #F2F2F7, #E5E5EA, #F2F2F7)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.8s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

function ResultPanel({ result }) {
  return (
    <div className="flex flex-col gap-4 p-4 animate-fade-in">
      {/* Severity gauge */}
      <div className="card p-4 stagger-1 animate-fade-in">
        <SeverityGauge severity={result.severity} score={result.severityScore} />
      </div>

      {/* Survival card */}
      <div className="card p-4 stagger-2 animate-fade-in">
        <SurvivalCard
          survival={result.survivalProbability}
          nearestSurvival={result.nearestSurvivalProbability}
          gain={result.survivalGain}
        />
      </div>

      {/* SHAP feature importance */}
      <div className="card p-4 stagger-3 animate-fade-in">
        <FeatureImportanceChart features={result.featureImportance} />
      </div>

      {/* Selected hospital card */}
      <div className="stagger-4 animate-fade-in">
        <p className="label mb-2">Recommended Hospital</p>
        <HospitalCard hospital={result.selectedHospital} isSelected />
      </div>

      {/* AI reasoning */}
      <div className="card p-4 stagger-5 animate-fade-in">
        <AIReasoningPanel
          explanation={result.aiExplanation}
          hospital={result.selectedHospital}
        />
      </div>

      {/* Rejected hospitals */}
      <div className="card p-4 animate-fade-in">
        <RejectedList selectedId={result.selectedHospital?.id} />
      </div>
    </div>
  )
}
