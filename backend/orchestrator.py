from severity_model import predict
from survival_engine import compute_survival, compare_routes
from routing import rank_hospitals
from explainer import explain


def _core(patient: dict, trauma_only: bool = False, closed_roads: list = None) -> tuple:
    severity = predict(patient)
    survival = compute_survival(severity, patient)
    routing = rank_hospitals(patient["lat"], patient["lng"], severity,
                             trauma_only=trauma_only, closed_roads=closed_roads or [])
    optimal = routing["recommended"][0] if routing["recommended"] else None
    nearest_h = next((h for h in routing["recommended"] + routing["infeasible"]
                      if h["name"] == routing["nearest_hospital"]), None)
    comparison = compare_routes(
        survival["condition"],
        optimal["est_travel_minutes"],
        nearest_h["est_travel_minutes"],
    ) if optimal and nearest_h else None
    return severity, survival, routing, comparison


def run_pipeline_fast(patient: dict, trauma_only: bool = False, closed_roads: list = None) -> dict:
    severity, survival, routing, comparison = _core(patient, trauma_only, closed_roads)
    return {"severity": severity, "survival": survival, "routing": routing, "comparison": comparison, "explanation": None}


def run_pipeline(patient: dict, trauma_only: bool = False, closed_roads: list = None) -> dict:
    severity, survival, routing, comparison = _core(patient, trauma_only, closed_roads)
    explanation = explain(patient, severity, survival, routing, comparison)
    return {"severity": severity, "survival": survival, "routing": routing, "comparison": comparison, "explanation": explanation}
