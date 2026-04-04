# GoldenRoute

> **Route ambulances to the optimal hospital — not the nearest one.**

In a cardiac emergency, the nearest hospital is often the wrong hospital. GoldenRoute combines real-time patient severity prediction, constraint-based optimization, and live AI reasoning to dispatch ambulances to the hospital most likely to save the patient's life — factoring in ICU availability, specialist presence, ER load, trauma level, and travel time simultaneously.

---

## The Problem

Every minute in a medical emergency reduces survival probability. Current dispatch systems route to the nearest hospital. Nearest is not optimal — a closer hospital with no ICU beds, no cardiologist, or a 90% occupancy rate is worse than a slightly farther one that is perfectly equipped.

---

## What GoldenRoute Does

| Feature | How |
|---|---|
| **Severity Prediction** | XGBoost model trained on patient vitals + symptoms → triage tag (RED/YELLOW/GREEN), ICU/vent/specialist needs |
| **Hospital Optimizer** | Scores all 15 Pune hospitals on 5 weighted criteria simultaneously — not just distance |
| **Survival Comparison** | Shows survival % gain of optimal hospital vs nearest hospital |
| **AI Reasoning** | Claude Sonnet explains the dispatch decision in plain clinical language |
| **Mass Casualty Mode** | Routes multiple patients in parallel, distributes load across the hospital network |
| **Ethical Triage Engine** | When ICU beds are scarce, Claude applies utilitarian bioethics to allocate beds by survival probability |
| **ARIA Voice Co-pilot** | Paramedic speaks vitals aloud → Whisper transcribes → Claude extracts structured data + auto-fills form |
| **Scene Photo Triage** | Upload accident photo → lightweight CV classifier (PIL + NumPy) detects trauma severity → auto-restricts to Level 1 Trauma Centers |
| **Road Closure Simulation** | Close any Pune arterial → routing engine recalculates ETAs and re-routes in real time, with live map update |

---

## Innovation

**ARIA** — the world's first live EMT voice co-pilot. A paramedic in a moving ambulance cannot type. ARIA listens, understands clinical speech, extracts vitals, and simultaneously provides treatment guidance — all before the ambulance reaches the hospital.

**Survival delta, not just ETA** — the primary dispatch metric is not travel time, it's predicted survival probability at that hospital vs the nearest alternative. The system tells you exactly how many percentage points of survival you gain by choosing the optimal route.

**Ethical Triage under scarcity** — during mass casualty events where ICU beds are fewer than patients who need them, the system doesn't just rank. It generates a bioethics-grounded allocation decision with explicit acknowledgment of moral cost, built for real clinical use.

---

## Deliverables

- [x] Severity prediction model — XGBoost, triage tag, ICU/vent/specialist classification
- [x] Constraint-based optimization engine — 15 hospitals, 5-factor weighted scoring
- [x] Interactive map — real road routing via OSRM, live hospital status on markers
- [x] Explainability — Claude explains every dispatch decision
- [x] Batch mode — mass casualty multi-patient routing with load distribution
- [x] Scene photo triage — lightweight CV classifier, zero ML framework dependency
- [x] Dynamic re-routing — road closure simulation with live map reroute visualization
- [x] LLM innovation — ARIA live voice co-pilot (speech → vitals extraction → clinical guidance)

---

## Stack

```
Backend   FastAPI · XGBoost · scikit-learn · Claude Sonnet · OpenAI Whisper · PIL + NumPy
Frontend  React · Vite · Tailwind CSS · React-Leaflet · Recharts
Routing   OSRM (real road geometry) · OpenStreetMap tiles
Data      24 Pune hospitals · synthetic patient cohort · Kaplan-Meier survival curves
```

---

## Running Locally

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn api:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

Set `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` in your environment before starting the backend.

---

*Built for HC03 — Pune, 2025*
