from severity_model import predict
from survival_engine import compute_survival, compare_routes
from routing import rank_hospitals
from explainer import explain


def run_pipeline(patient: dict) -> dict:
    severity = predict(patient)
    survival = compute_survival(severity, patient)
    routing = rank_hospitals(patient["lat"], patient["lng"], severity)

    optimal = routing["recommended"][0] if routing["recommended"] else None
    nearest_h = next((h for h in routing["recommended"] + routing["infeasible"]
                      if h["name"] == routing["nearest_hospital"]), None)

    if optimal and nearest_h:
        comparison = compare_routes(
            survival["condition"],
            optimal["est_travel_minutes"],
            nearest_h["est_travel_minutes"],
        )
    else:
        comparison = None

    explanation = explain(patient, severity, survival, routing, comparison)

    return {
        "severity":   severity,
        "survival":   survival,
        "routing":    routing,
        "comparison": comparison,
        "explanation": explanation,
    }
