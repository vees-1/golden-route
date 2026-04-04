import json
import math
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"

with open(DATA_DIR / "hospitals.json") as f:
    HOSPITALS = json.load(f)

WEIGHTS = {
    "travel_time": 0.35,
    "capacity":    0.25,
    "load":        0.20,
    "specialist":  0.12,
    "trauma":      0.08,
}

# urban Pune estimate
AVG_SPEED_KMH = 30.0


def _haversine_km(lat1, lng1, lat2, lng2) -> float:
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = math.sin(d_lat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lng / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def _travel_minutes(dist_km: float) -> float:
    return (dist_km / AVG_SPEED_KMH) * 60


def _check_constraints(hospital: dict, severity_result: dict) -> list[str]:
    unmet = []
    if severity_result.get("needs_icu") and hospital["icu_beds_available"] == 0:
        unmet.append("no_icu")
    if severity_result.get("needs_ventilator") and hospital["ventilators_available"] == 0:
        unmet.append("no_ventilator")
    specialist = severity_result.get("primary_specialist")
    if specialist and specialist not in hospital["specialists_on_duty"]:
        unmet.append(f"no_{specialist}")
    return unmet


def _score(hospital: dict, dist_km: float, severity_result: dict, max_dist_km: float) -> dict:
    travel_min = _travel_minutes(dist_km)
    travel_score = max(0.0, 1.0 - dist_km / max(max_dist_km, 1.0))  # normalised against farthest hospital

    icu_ratio = hospital["icu_beds_available"] / max(hospital["icu_beds_total"], 1)
    vent_ratio = hospital["ventilators_available"] / max(hospital["ventilators_total"], 1)
    capacity_score = (icu_ratio + vent_ratio) / 2

    load_score = max(0.0, 1.0 - hospital["current_load_pct"])
    wait_score = max(0.0, 1.0 - hospital["avg_er_wait_minutes"] / 60.0)  # 60 min wait = score 0
    combined_load = (load_score + wait_score) / 2

    all_specialists = severity_result.get("all_specialists", [])
    if all_specialists:
        on_duty = set(hospital["specialists_on_duty"])
        specialist_score = len(on_duty & set(all_specialists)) / len(all_specialists)  # fraction of needed specialists present
    else:
        specialist_score = 1.0

    trauma_score = max(0.0, (4 - hospital["trauma_center_level"]) / 3)  # level 1 = best

    total = (
        WEIGHTS["travel_time"] * travel_score
        + WEIGHTS["capacity"]   * capacity_score
        + WEIGHTS["load"]       * combined_load
        + WEIGHTS["specialist"] * specialist_score
        + WEIGHTS["trauma"]     * trauma_score
    )

    return {
        "total": round(total, 4),
        "breakdown": {
            "travel":     round(travel_score, 3),
            "capacity":   round(capacity_score, 3),
            "load":       round(combined_load, 3),
            "specialist": round(specialist_score, 3),
            "trauma":     round(trauma_score, 3),
        },
        "est_travel_minutes": round(travel_min, 1),
        "dist_km": round(dist_km, 2),
    }


# Road closure definitions: each closure adds penalty_minutes to hospitals that route via that road
# Affected hospital IDs derived from geographic proximity to each arterial
ROAD_CLOSURES = {
    "expressway": {
        "name": "Pune-Mumbai Expressway",
        "affected_hospital_ids": ["H07", "H08", "H13"],  # Hinjewadi / Wakad side
        "penalty_minutes": 18,
    },
    "fc_road": {
        "name": "FC Road / Ganeshkhind Road",
        "affected_hospital_ids": ["H02", "H03", "H05"],  # North Pune
        "penalty_minutes": 14,
    },
    "sh60": {
        "name": "SH-60 Solapur Road",
        "affected_hospital_ids": ["H10", "H11", "H14"],  # East Pune
        "penalty_minutes": 16,
    },
}


def rank_hospitals(
    patient_lat: float,
    patient_lng: float,
    severity_result: dict,
    top_n: int = 5,
    trauma_only: bool = False,
    closed_roads: list = None,
) -> dict:
    hospital_pool = HOSPITALS
    if trauma_only:
        hospital_pool = [h for h in HOSPITALS if h.get("trauma_center_level") == 1]
        if not hospital_pool:
            hospital_pool = HOSPITALS  # fallback if no Level 1 exists

    distances = {
        h["id"]: _haversine_km(patient_lat, patient_lng, h["lat"], h["lng"])
        for h in hospital_pool
    }
    max_dist = max(distances.values())
    nearest_id = min(distances, key=distances.get)

    # Build per-hospital road closure penalty map
    closure_penalties = {}
    for road_key in (closed_roads or []):
        road = ROAD_CLOSURES.get(road_key)
        if not road:
            continue
        for hid in road["affected_hospital_ids"]:
            closure_penalties[hid] = closure_penalties.get(hid, 0) + road["penalty_minutes"]

    # Re-compute max_dist accounting for road closure effective distances
    effective_distances = {}
    for h in hospital_pool:
        extra_min = closure_penalties.get(h["id"], 0)
        effective_distances[h["id"]] = distances[h["id"]] + (extra_min / 60) * AVG_SPEED_KMH
    effective_max_dist = max(effective_distances.values())

    scored = []
    for h in hospital_pool:
        dist = distances[h["id"]]
        unmet = _check_constraints(h, severity_result)
        extra_minutes = closure_penalties.get(h["id"], 0)

        # Score using effective distance so road closure properly re-normalises travel score
        eff_dist = effective_distances[h["id"]]
        sc = _score(h, eff_dist, severity_result, effective_max_dist)
        sc["est_travel_minutes"] = round(_travel_minutes(dist) + extra_minutes, 1)
        sc["road_closure_penalty_min"] = extra_minutes

        if unmet:
            sc["total"] = max(0.0, sc["total"] - 0.5)  # hard penalty, not exclusion

        scored.append({
            "id":                h["id"],
            "name":              h["name"],
            "area":              h["area"],
            "lat":               h["lat"],
            "lng":               h["lng"],
            "type":              h["type"],
            "icu_available":     h["icu_beds_available"],
            "vent_available":    h["ventilators_available"],
            "specialists":       h["specialists_on_duty"],
            "load_pct":          h["current_load_pct"],
            "er_wait_min":       h["avg_er_wait_minutes"],
            "trauma_level":      h["trauma_center_level"],
            "score":             sc["total"],
            "score_breakdown":   sc["breakdown"],
            "est_travel_minutes": sc["est_travel_minutes"],
            "dist_km":           sc["dist_km"],
            "unmet_constraints":        unmet,
            "is_feasible":              len(unmet) == 0,
            "road_closure_penalty_min": sc["road_closure_penalty_min"],
        })

    scored.sort(key=lambda x: x["score"], reverse=True)

    feasible   = [h for h in scored if h["is_feasible"]]
    infeasible = [h for h in scored if not h["is_feasible"]]

    nearest_name = next(h["name"] for h in HOSPITALS if h["id"] == nearest_id)
    optimal = feasible[0] if feasible else scored[0]

    return {
        "recommended":      feasible[:top_n],
        "infeasible":       infeasible,
        "nearest_hospital": nearest_name,
        "optimal_hospital": optimal["name"],
        "same_as_nearest":  nearest_id == optimal["id"],
        "trauma_only":      trauma_only,
        "closed_roads":     closed_roads or [],
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
    print("Severity:", sev["severity_label"], "| Triage:", sev["triage_tag"])
    print("Needs ICU:", sev["needs_icu"], "| Ventilator:", sev["needs_ventilator"])
    print("Specialist:", sev["primary_specialist"])
    print()

    result = rank_hospitals(patient["lat"], patient["lng"], sev)
    print(f"Nearest  : {result['nearest_hospital']}")
    print(f"Optimal  : {result['optimal_hospital']}")
    print(f"Same?    : {result['same_as_nearest']}")
    print()
    for i, h in enumerate(result["recommended"], 1):
        print(f"  {i}. [{h['score']:.3f}] {h['name']} — {h['est_travel_minutes']}min | "
              f"ICU:{h['icu_available']} Vent:{h['vent_available']}")
