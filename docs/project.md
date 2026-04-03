GoldenRoute — HC03 Hackathon

Route ambulances to the optimal hospital, not the nearest one.

Stack
- XGBoost (severity + care needs prediction)
- Constraint-based optimizer (capacity, specialists, transit time)
- Anthropic Claude API (explainability)
- Streamlit + Folium + Plotly (dashboard)

Files
backend/severity_model.py
backend/survival_engine.py
backend/routing.py
frontend/app.py
data/hospitals.json
data/mass_casualty_events.json
data/synthetic_patients.csv
data/survival_curves.json
data/symptoms_map.json

Build Order
[x] Project structure + data
[ ] Step 1: XGBoost severity model
[ ] Step 2: Constraint-based optimizer
[ ] Step 3: Survival curve engine
[ ] Step 4: Claude explainer
[ ] Step 5: Streamlit UI
[ ] Step 6: Folium map
[ ] Step 7: Batch / mass casualty mode
[ ] Step 8: Dynamic re-routing
[ ] Step 9: Polish + demo
