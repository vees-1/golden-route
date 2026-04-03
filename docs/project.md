# GoldenRoute — HC03

Route ambulances to the optimal hospital, not the nearest one.

---

**Stack**

Backend: XGBoost, scikit-learn, Anthropic Claude, OpenAI Whisper, FastAPI, Python
Frontend: Vite, React, Tailwind CSS, Recharts, React-Leaflet

---

**Files**

```
backend/
  severity_model.py
  survival_engine.py
  routing.py
  explainer.py
  orchestrator.py
  voice.py
  api.py
  scene_analyzer.py
  emt_assistant.py
frontend/
  src/
    App.jsx
    components/
      PatientForm.jsx
      MapView.jsx
      SeverityGauge.jsx
      SurvivalCard.jsx
      HospitalCard.jsx
      RejectedList.jsx
      AIReasoningPanel.jsx
      MassCasualtyView.jsx
      HospitalStatusView.jsx
      SceneUpload.jsx
      RoadClosureAlert.jsx
      EMTAssistant.jsx
    data/
      mockData.js
data/
  hospitals.json
  mass_casualty_events.json
  demo_patients.json
  synthetic_patients.csv
  survival_curves.json
  symptoms_map.json
```

---

**Deliverables Checklist (from problem statement)**

- [x] Severity prediction model — XGBoost predicts severity 1–5, triage tag, ICU/vent/specialist needs
      → Visible: Dispatch tab → right panel (severity gauge, triage tag, confidence, care needs)

- [x] Constraint-based optimization engine — scores all 15 hospitals on equipment, load, specialist, transit time
      → Visible: Dispatch tab → recommended hospital card + rejected hospitals accordion

- [x] Interactive map dashboard with real-time hospital status updates
      → Visible: Dispatch tab → map with route polyline + live ICU/load on markers

- [x] Explainability panel — Claude explains exactly why this hospital over alternatives
      → Visible: Dispatch tab → AI Reasoning panel

- [x] Batch-optimization mode — multi-patient routing without overloading one facility
      → Visible: Mass Casualty tab → load distribution bar chart + patient assignment table

- [x] Twist 1 — Scene photo triage before vitals entry
      → Claude Vision classifies trauma severity from scene photo; high severity auto-filters to Level 1 Trauma Centers only

- [x] Twist 2 — Dynamic re-routing on road closure
      → Simulate 3 Pune arterial closures; routing engine recalculates ETAs and re-routes if a better hospital is now reachable

- [x] LLM Innovation — ARIA live EMT voice co-pilot
      → Web Speech API + Claude Sonnet; paramedic speaks vitals, ARIA responds with clinical guidance and auto-fills the patient form

---

**Build Order**

- [x] Project structure + data
- [x] Step 1: XGBoost severity model
- [x] Step 2: Constraint-based optimizer
- [x] Step 3: Survival curve engine
- [x] Step 4: Claude explainer
- [x] Step 5: FastAPI backend
- [x] Step 6: React frontend
- [x] Step 7: Voice transcription (Whisper + GPT-4o-mini)
- [x] Step 8: Mass casualty endpoint + frontend
- [x] Step 9: Hospital network status tab
- [x] Step 10: Real-time hospital status on map markers
- [x] Step 11: Mass casualty load distribution visualization
- [x] Step 12: Golden Hour tab removed (replaced by survival data in Dispatch tab)
- [x] Step 13: Twist 1 — Scene photo triage (Claude Vision → trauma severity → Level 1 filter)
- [x] Step 14: Twist 2 — Road closure simulation (3 Pune arterials → dynamic re-routing)
- [x] Step 15: ARIA live EMT voice co-pilot (Web Speech API + Claude + TTS)
- [ ] Step 16: Polish + demo
