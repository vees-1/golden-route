import React, { useState } from 'react'
import { FileText, Loader } from 'lucide-react'

function pad(n) { return String(n).padStart(2, '0') }

function incidentId() {
  const now = new Date()
  return `GR-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

function formatTime(d) {
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}  ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function sevColor(sev) {
  return sev === 'critical' ? '#FF3B30'
    : sev === 'severe'    ? '#FF6B35'
    : sev === 'moderate'  ? '#FF9500'
    : '#34C759'
}

function buildReport(result, lastPayload, pickupLocation) {
  const now = new Date()
  const id  = incidentId()
  const raw = result._raw ?? {}
  const sev = raw.severity ?? {}
  const routing = raw.routing ?? {}
  const comp = raw.comparison ?? {}
  const hosp = result.selectedHospital
  const infeasible = routing.infeasible ?? []

  const vitals = lastPayload ? [
    ['Age',            `${lastPayload.age} yrs`],
    ['Heart Rate',     `${lastPayload.heart_rate} bpm`],
    ['BP (Systolic)',  `${lastPayload.bp_systolic} mmHg`],
    ['BP (Diastolic)', `${lastPayload.bp_diastolic} mmHg`],
    ['SpO₂',          `${lastPayload.spo2}%`],
    ['GCS',            `${lastPayload.gcs} / 15`],
    ['Resp. Rate',     `${lastPayload.respiratory_rate} /min`],
  ] : []

  const symptomsRaw = lastPayload?.symptoms ?? ''
  const symptoms = symptomsRaw ? symptomsRaw.split('|').map(s => s.replace(/_/g, ' ')).join(', ') : '—'

  const triageColors = { RED: '#FF3B30', YELLOW: '#FF9500', GREEN: '#34C759', BLACK: '#1D1D1F' }
  const triageTag = sev.triage_tag ?? '—'
  const triageCol = triageColors[triageTag] ?? '#86868B'

  const constraintLabel = (c) => ({
    no_icu: 'No ICU beds',
    no_vent: 'No ventilators',
    no_specialist: 'Missing specialist',
    overloaded: 'Overloaded (>95%)',
    no_ct: 'No CT scanner',
    no_cath_lab: 'No cath lab',
  }[c] ?? c)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Emergency Report — ${id}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color:#1D1D1F; background:#fff; font-size:11px; }
  .page { max-width:780px; margin:0 auto; padding:32px 36px; }
  /* Header */
  .header { display:flex; align-items:center; justify-content:space-between; padding-bottom:16px; border-bottom:2.5px solid #FF3B30; margin-bottom:20px; }
  .brand { display:flex; align-items:center; gap:10px; }
  .brand-icon { width:36px; height:36px; background:linear-gradient(135deg,#FF3B30,#FF6B35); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px; }
  .brand-name { font-size:17px; font-weight:800; color:#1D1D1F; }
  .brand-sub  { font-size:10px; color:#86868B; margin-top:1px; }
  .header-meta { text-align:right; }
  .incident-id { font-size:14px; font-weight:700; color:#FF3B30; font-family:monospace; }
  .header-meta p { font-size:10px; color:#86868B; margin-top:3px; }
  /* Section */
  .section { margin-bottom:18px; }
  .section-title { font-size:10px; font-weight:700; color:#86868B; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:8px; padding-bottom:4px; border-bottom:1px solid #E5E5EA; }
  /* Grid */
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; }
  /* Card */
  .card { background:#F5F5F7; border-radius:10px; padding:10px 12px; }
  .card-label { font-size:9px; color:#86868B; margin-bottom:3px; text-transform:uppercase; letter-spacing:0.5px; }
  .card-value { font-size:14px; font-weight:700; color:#1D1D1F; }
  .card-sub   { font-size:9px; color:#86868B; margin-top:2px; }
  /* Vitals table */
  table { width:100%; border-collapse:collapse; }
  td, th { padding:5px 8px; text-align:left; }
  th { font-size:9px; color:#86868B; text-transform:uppercase; letter-spacing:0.5px; font-weight:600; border-bottom:1px solid #E5E5EA; }
  tr:nth-child(even) td { background:#F5F5F7; }
  td { font-size:11px; }
  td.val { font-weight:700; }
  /* Triage badge */
  .badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:10px; font-weight:800; letter-spacing:0.5px; color:white; }
  /* Hospital box */
  .hosp-box { border:2px solid #007AFF; border-radius:12px; padding:12px 14px; position:relative; }
  .hosp-name { font-size:14px; font-weight:800; color:#1D1D1F; margin-bottom:6px; }
  .hosp-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-top:8px; }
  /* Rejected */
  .rejected-row { display:flex; align-items:flex-start; gap:8px; padding:6px 0; border-bottom:1px solid #F2F2F7; }
  .rejected-name { font-weight:600; min-width:160px; }
  .pill { display:inline-block; background:#FFE5E5; color:#FF3B30; border-radius:4px; padding:1px 6px; font-size:9px; font-weight:600; margin:1px; }
  /* Reasoning */
  .reasoning { background:#F5F5F7; border-radius:10px; padding:12px; font-size:11px; line-height:1.7; color:#3C3C43; white-space:pre-wrap; }
  /* Footer */
  .footer { margin-top:24px; padding-top:12px; border-top:1px solid #E5E5EA; display:flex; justify-content:space-between; align-items:center; }
  .footer p { font-size:9px; color:#86868B; }
  .confidential { font-size:9px; font-weight:700; color:#FF3B30; }
  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .page { padding:20px 24px; }
    .no-print { display:none; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="brand">
      <div class="brand-icon">🚑</div>
      <div>
        <div class="brand-name">GoldenRoute</div>
        <div class="brand-sub">Emergency Routing AI — Pune</div>
      </div>
    </div>
    <div class="header-meta">
      <div class="incident-id">${id}</div>
      <p>Generated: ${formatTime(now)}</p>
      <p>Pickup: ${pickupLocation?.name ?? '—'} (${pickupLocation?.lat?.toFixed(4) ?? '—'}, ${pickupLocation?.lng?.toFixed(4) ?? '—'})</p>
    </div>
  </div>

  <!-- Severity + Triage -->
  <div class="section">
    <div class="section-title">Severity Assessment</div>
    <div class="grid3">
      <div class="card">
        <div class="card-label">Severity Level</div>
        <div class="card-value" style="color:${sevColor(result.severity)};text-transform:capitalize">${sev.severity_label ?? result.severity}</div>
        <div class="card-sub">Confidence: ${Math.round((sev.confidence ?? 0) * 100)}%</div>
      </div>
      <div class="card">
        <div class="card-label">Triage Tag</div>
        <div style="margin-top:4px"><span class="badge" style="background:${triageCol}">${triageTag}</span></div>
        <div class="card-sub">START protocol</div>
      </div>
      <div class="card">
        <div class="card-label">Care Requirements</div>
        <div class="card-value" style="font-size:11px;margin-top:2px">
          ${sev.needs_icu ? '✓ ICU' : '✗ ICU'} &nbsp;
          ${sev.needs_ventilator ? '✓ Ventilator' : '✗ Ventilator'}
        </div>
        <div class="card-sub">${sev.primary_specialist ? sev.primary_specialist.replace(/_/g,' ') : 'No specialist flagged'}</div>
      </div>
    </div>
  </div>

  <!-- Patient Vitals -->
  <div class="section">
    <div class="section-title">Patient Vitals</div>
    <table>
      <thead><tr>${vitals.map(([l]) => `<th>${l}</th>`).join('')}</tr></thead>
      <tbody><tr>${vitals.map(([,v]) => `<td class="val">${v}</td>`).join('')}</tr></tbody>
    </table>
    ${symptoms !== '—' ? `<div style="margin-top:8px;font-size:10px;color:#3C3C43"><span style="color:#86868B;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;font-size:9px">Symptoms: </span>${symptoms}</div>` : ''}
  </div>

  <!-- Dispatch Decision -->
  <div class="section">
    <div class="section-title">Dispatch Decision</div>
    ${hosp ? `
    <div class="hosp-box">
      <div style="position:absolute;top:10px;right:12px;background:linear-gradient(135deg,#007AFF,#5856D6);color:white;border-radius:6px;padding:2px 8px;font-size:9px;font-weight:700">AI OPTIMAL</div>
      <div class="hosp-name">${hosp.name}</div>
      <div class="hosp-grid">
        <div class="card" style="background:#EBF5FF">
          <div class="card-label">ETA</div>
          <div class="card-value" style="color:#007AFF">${Math.round(hosp.eta ?? 0)} min</div>
        </div>
        <div class="card" style="background:#EBF5FF">
          <div class="card-label">Distance</div>
          <div class="card-value" style="color:#007AFF">${hosp.distance?.toFixed(1) ?? '—'} km</div>
        </div>
        <div class="card">
          <div class="card-label">ICU Beds Free</div>
          <div class="card-value" style="color:${(hosp.icuAvailable??0)>0?'#34C759':'#FF3B30'}">${hosp.icuAvailable ?? 0}</div>
        </div>
        <div class="card">
          <div class="card-label">Survival Est.</div>
          <div class="card-value" style="color:#34C759">${Math.round((result.survivalProbability??0)*100)}%</div>
        </div>
      </div>
      ${hosp.specialties?.length ? `<div style="margin-top:8px;font-size:10px;color:#86868B">Specialties on duty: <strong style="color:#1D1D1F">${hosp.specialties.join(', ')}</strong></div>` : ''}
    </div>` : '<p style="color:#86868B">No hospital selected</p>'}
  </div>

  <!-- Survival Comparison -->
  ${result.nearestHospital ? `
  <div class="section">
    <div class="section-title">Survival Comparison</div>
    <div class="grid2">
      <div class="card" style="border:1.5px solid #34C759">
        <div class="card-label">Optimal Hospital (AI Pick)</div>
        <div class="card-value" style="color:#34C759;font-size:22px">${Math.round((result.survivalProbability??0)*100)}%</div>
        <div class="card-sub">${hosp?.name ?? '—'}</div>
      </div>
      <div class="card">
        <div class="card-label">Nearest Hospital</div>
        <div class="card-value" style="font-size:22px">${Math.round((result.nearestSurvivalProbability??0)*100)}%</div>
        <div class="card-sub">${result.nearestHospital.name}</div>
      </div>
    </div>
    ${(result.survivalGain??0) > 0 ? `
    <div style="margin-top:8px;padding:8px 12px;background:rgba(52,199,89,0.08);border-radius:8px;border:1px solid rgba(52,199,89,0.25)">
      <span style="font-weight:700;color:#34C759">+${Math.round((result.survivalGain??0)*100)}% survival gain</span>
      <span style="color:#86868B;font-size:10px"> by choosing optimal over nearest hospital</span>
    </div>` : ''}
  </div>` : ''}

  <!-- AI Reasoning -->
  ${result.aiExplanation ? `
  <div class="section">
    <div class="section-title">AI Clinical Reasoning</div>
    <div class="reasoning">${result.aiExplanation.replace(/\*\*/g,'').replace(/##[^\n]*/g,'').replace(/>/g,'').trim()}</div>
  </div>` : ''}

  <!-- Rejected Hospitals -->
  ${infeasible.length ? `
  <div class="section">
    <div class="section-title">Hospitals Considered & Rejected (${infeasible.length})</div>
    ${infeasible.map(h => `
    <div class="rejected-row">
      <span class="rejected-name">${h.name}</span>
      <span>${(h.unmet_constraints??[]).map(c=>`<span class="pill">${constraintLabel(c)}</span>`).join(' ')}</span>
    </div>`).join('')}
  </div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <div>
      <p class="confidential">CONFIDENTIAL — Emergency Use Only</p>
      <p>GoldenRoute Emergency Routing AI &bull; Pune Emergency Services</p>
    </div>
    <div style="text-align:right">
      <p>Report ID: ${id}</p>
      <p>${formatTime(now)}</p>
    </div>
  </div>

</div>
<script>window.onload=()=>window.print()</script>
</body>
</html>`
}

export default function ReportGenerator({ result, lastPayload, pickupLocation }) {
  const [generating, setGenerating] = useState(false)

  function generate() {
    setGenerating(true)
    setTimeout(() => {
      const html = buildReport(result, lastPayload, pickupLocation)
      const win = window.open('', '_blank')
      win.document.write(html)
      win.document.close()
      setGenerating(false)
    }, 80)
  }

  return (
    <button
      onClick={generate}
      disabled={generating}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
      style={{
        background: generating ? '#E5E5EA' : 'linear-gradient(135deg,#1D1D1F,#3C3C43)',
        color: generating ? '#86868B' : 'white',
        border: 'none',
        cursor: generating ? 'default' : 'pointer',
      }}
    >
      {generating
        ? <><Loader size={14} className="animate-spin" />Generating…</>
        : <><FileText size={14} />Generate Emergency Report</>}
    </button>
  )
}
