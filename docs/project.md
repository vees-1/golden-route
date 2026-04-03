# GoldenRoute — HC03

Route ambulances to the optimal hospital, not the nearest one.

---

**Stack**

Backend: XGBoost, scikit-learn, Anthropic Claude, FastAPI, Python
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
  api.py
frontend/
  src/
    App.jsx
    components/
      PatientForm.jsx
      ResultPanel.jsx
      SurvivalChart.jsx
      MapView.jsx
data/
  hospitals.json
  mass_casualty_events.json
  synthetic_patients.csv
  survival_curves.json
  symptoms_map.json
```

---

**Build Order**

- [x] Project structure + data
- [x] Step 1: XGBoost severity model
- [x] Step 2: Constraint-based optimizer
- [x] Step 3: Survival curve engine
- [x] Step 4: Claude explainer
- [x] Step 5: FastAPI backend
- [ ] Step 6: React frontend scaffold
- [ ] Step 7: PatientForm + ResultPanel
- [ ] Step 8: SurvivalChart (Recharts)
- [ ] Step 9: MapView (React-Leaflet)
- [ ] Step 10: Batch / mass casualty mode
- [ ] Step 11: Polish + demo
