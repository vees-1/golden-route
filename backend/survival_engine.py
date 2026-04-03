import json
import math
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"

with open(DATA_DIR / "survival_curves.json") as f:
    _data = json.load(f)
    CURVES = _data["conditions"]

# symptom → condition key in survival_curves.json
_SYMPTOM_CONDITION = {
    "cardiac_arrest":           "cardiac_arrest",
    "chest_pain_radiating_left_arm": "STEMI",
    "chest_pain":               "chest_pain_unstable_angina",
    "stroke_symptoms":          "acute_stroke",
    "sudden_weakness_one_side": "acute_stroke",
    "slurred_speech":           "acute_stroke",
    "severe_breathing_difficulty": "respiratory_failure",
    "shortness_of_breath":      "respiratory_failure",
    "blunt_trauma_head":        "severe_trauma",
    "blunt_trauma_chest":       "severe_trauma",
    "blunt_trauma_abdomen":     "abdominal_emergency",
    "severe_bleeding":          "severe_trauma",
    "fracture_open":            "moderate_trauma",
    "fracture_closed":          "minor_fracture",
    "burns_major":              "severe_trauma",
    "burns_minor":              "minor_fracture",
    "abdominal_pain_severe":    "abdominal_emergency",
    "vomiting_blood":           "abdominal_emergency",
    "diabetic_emergency":       "diabetic_crisis",
    "allergic_reaction_severe": "allergic_anaphylaxis",
    "drowning":                 "drowning",
    "seizure":                  "seizure_episode",
    "spinal_injury":            "spinal_injury",
    "loss_of_consciousness":    "severe_trauma",
    "headache_severe":          "acute_stroke",
}

_SEVERITY_FALLBACK = {
    5: "cardiac_arrest",
    4: "severe_trauma",
    3: "moderate_trauma",
    2: "chest_pain_unstable_angina",
    1: "minor_fracture",
}


def _resolve_condition(severity_result: dict, patient: dict) -> str:
    symptoms = patient.get("symptoms", [])
    if isinstance(symptoms, str):
        symptoms = symptoms.split("|")

    # pick highest-priority condition from active symptoms
    priority = list(_SYMPTOM_CONDITION.keys())
    for sym in priority:
        if sym in symptoms:
            return _SYMPTOM_CONDITION[sym]

    return _SEVERITY_FALLBACK[severity_result["severity"]]


def survival_at(condition: str, delay_minutes: float) -> float:
    c = CURVES[condition]
    effective_delay = max(0.0, delay_minutes - c["grace_period_minutes"])
    return round(c["base_survival"] * math.exp(-c["decay_rate"] * effective_delay), 4)


def compute_survival(severity_result: dict, patient: dict) -> dict:
    condition = _resolve_condition(severity_result, patient)
    c = CURVES[condition]

    checkpoints = [0, 5, 10, 15, 20, 30, 45, 60]
    curve = {t: round(survival_at(condition, t) * 100, 1) for t in checkpoints}

    # minutes until survival drops below 50%
    critical_min = None
    for t in range(0, 121):
        if survival_at(condition, t) < 0.5:
            critical_min = t
            break

    return {
        "condition":             condition,
        "base_survival_pct":     round(c["base_survival"] * 100, 1),
        "grace_period_minutes":  c["grace_period_minutes"],
        "critical_window_minutes": c["critical_window_minutes"],
        "survival_curve":        curve,
        "critical_at_minutes":   critical_min,
    }


def compare_routes(condition: str, optimal_minutes: float, nearest_minutes: float) -> dict:
    s_optimal = survival_at(condition, optimal_minutes)
    s_nearest = survival_at(condition, nearest_minutes)
    gain = round((s_optimal - s_nearest) * 100, 1)

    return {
        "optimal_survival_pct": round(s_optimal * 100, 1),
        "nearest_survival_pct": round(s_nearest * 100, 1),
        "survival_gain_pct":    gain,
        "lives_saved_per_100":  abs(gain),
    }


if __name__ == "__main__":
    from severity_model import predict

    patient = {
        "age": 54, "heart_rate": 118, "bp_systolic": 88, "bp_diastolic": 60,
        "spo2": 91, "gcs": 12, "respiratory_rate": 24,
        "spo2_trend_per_min": -0.5, "hr_trend_per_min": 1.2,
        "symptoms": "chest_pain|shortness_of_breath|hypotension",
        "lat": 18.52, "lng": 73.856,
    }

    sev = predict(patient)
    result = compute_survival(sev, patient)

    print(f"Condition     : {result['condition']}")
    print(f"Base survival : {result['base_survival_pct']}%")
    print(f"Grace period  : {result['grace_period_minutes']} min")
    print(f"Critical at   : {result['critical_at_minutes']} min")
    print(f"Curve         : {result['survival_curve']}")
    print()
    comp = compare_routes(result["condition"], optimal_minutes=14, nearest_minutes=6)
    print(f"Optimal route : {comp['optimal_survival_pct']}% survival (14 min)")
    print(f"Nearest route : {comp['nearest_survival_pct']}% survival (6 min)")
    print(f"Survival gain : +{comp['survival_gain_pct']}%")
