import os
import anthropic
from dotenv import load_dotenv

load_dotenv()

_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def _build_prompt(patient: dict, severity: dict, survival: dict, routing: dict, comparison: dict) -> str:
    optimal = routing["recommended"][0] if routing["recommended"] else None
    nearest = routing["nearest_hospital"]

    symptoms = patient.get("symptoms", "")
    if isinstance(symptoms, list):
        symptoms = ", ".join(symptoms)
    else:
        symptoms = symptoms.replace("|", ", ")

    lines = [
        "You are a medical routing AI assistant. Explain the ambulance routing decision to a paramedic in plain English.",
        "Be concise, clinical, and direct. 3-4 sentences max.",
        "",
        f"Patient: {patient.get('age', '?')}yo | Symptoms: {symptoms}",
        f"Severity: {severity['severity_label']} ({severity['triage_tag']}) | Confidence: {severity['confidence']*100:.0f}%",
        f"Needs ICU: {severity['needs_icu']} | Ventilator: {severity['needs_ventilator']} | Specialist: {severity['primary_specialist']}",
        f"Condition mapped: {survival['condition']} | Critical window: {survival['critical_window_minutes']} min",
        f"Nearest hospital: {nearest}",
    ]

    if optimal:
        lines.append(f"Recommended hospital: {optimal['name']} ({optimal['est_travel_minutes']} min away)")
        lines.append(f"Score: {optimal['score']} | ICU beds: {optimal['icu_available']} | Ventilators: {optimal['vent_available']}")

    if comparison:
        lines += [
            f"Survival at recommended: {comparison['optimal_survival_pct']}%",
            f"Survival at nearest: {comparison['nearest_survival_pct']}%",
            f"Survival gain from routing correctly: +{comparison['survival_gain_pct']}%",
        ]

    if routing["same_as_nearest"]:
        lines.append("Note: The nearest hospital is also the optimal choice here.")

    lines += [
        "",
        "Explain why this hospital was chosen over the nearest one, what the patient needs, and the urgency.",
    ]

    return "\n".join(lines)


def explain(patient: dict, severity: dict, survival: dict, routing: dict, comparison: dict) -> str:
    prompt = _build_prompt(patient, severity, survival, routing, comparison)

    message = _client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}],
    )

    return message.content[0].text


if __name__ == "__main__":
    from severity_model import predict
    from survival_engine import compute_survival, compare_routes
    from routing import rank_hospitals

    patient = {
        "age": 54, "heart_rate": 118, "bp_systolic": 88, "bp_diastolic": 60,
        "spo2": 91, "gcs": 12, "respiratory_rate": 24,
        "spo2_trend_per_min": -0.5, "hr_trend_per_min": 1.2,
        "symptoms": "chest_pain|shortness_of_breath|hypotension",
        "lat": 18.52, "lng": 73.856,
    }

    severity = predict(patient)
    survival = compute_survival(severity, patient)
    routing = rank_hospitals(patient["lat"], patient["lng"], severity)

    optimal = routing["recommended"][0]
    nearest_h = next(h for h in routing["recommended"] + routing["infeasible"]
                     if h["name"] == routing["nearest_hospital"])
    comparison = compare_routes(survival["condition"], optimal["est_travel_minutes"], nearest_h["est_travel_minutes"])

    text = explain(patient, severity, survival, routing, comparison)
    print(text)
