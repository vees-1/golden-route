# HC03 - Golden-Hour Emergency Triage & Constraint-Based Hospital Routing

## Problem
Route ambulances to optimal hospital (not nearest) based on: patient severity, care needs, hospital capacity, specialist availability, transit time.

## Key Deliverables
1. Severity prediction model (XGBoost) → outputs care needs: ICU/ventilator/specialist
2. Constraint-based optimization engine → scores hospitals against all constraints
3. Interactive map dashboard (Streamlit + Folium)
4. Explainability panel (Claude LLM) → why hospital A over B
5. Batch mode → mass casualty multi-patient routing

## Stack
- ML: XGBoost, scikit-learn
- Routing: Haversine distance, mocked road data
- LLM: Anthropic Claude API
- UI: Streamlit + Folium (maps) + Plotly
- Data: Mocked hospitals JSON, synthetic patient CSV

## File Structure
```
backend/severity_model.py
backend/survival_engine.py
backend/routing.py
frontend/app.py
data/hospitals.json
docs/project.md
requirements.txt
```

## Build Order
- [x] Project structure + plan
- [ ] Step 1: Generate synthetic data + train XGBoost model
- [ ] Step 2: Build constraint-based optimizer
- [ ] Step 3: Survival curve + golden hour logic
- [ ] Step 4: Claude LLM explainer
- [ ] Step 5: Streamlit UI (single patient)
- [ ] Step 6: Add map (Folium)
- [ ] Step 7: Batch/mass casualty mode
- [ ] Step 8: Dynamic re-routing (capacity change simulation)
- [ ] Step 9: Polish + demo prep

## Status
Starting Step 1 next.
