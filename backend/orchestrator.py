from severity_model import predict
from survival_engine import compute_survival
from routing import rank_hospitals
from explainer import explain


def run_pipeline(patient: dict) -> dict:
    severity = predict(patient)
    survival = compute_survival(severity, patient)
    routing = rank_hospitals(patient["lat"], patient["lng"], severity)
    explanation = explain(patient, severity, survival, routing)

    return {
        "severity":    severity,
        "survival":    survival,
        "routing":     routing,
        "explanation": explanation,
    }
