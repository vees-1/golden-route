import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

DATA_DIR = Path(__file__).parent.parent / "data"
MODEL_PATH = Path(__file__).parent / "severity_model.pkl"

with open(DATA_DIR / "symptoms_map.json") as f:
    SYMPTOM_MAP = json.load(f)["symptoms"]

ALL_SYMPTOMS = list(SYMPTOM_MAP.keys())

VITALS = [
    "age", "heart_rate", "bp_systolic", "bp_diastolic",
    "spo2", "gcs", "respiratory_rate",
    "spo2_trend_per_min", "hr_trend_per_min"
]

SEVERITY_LABELS = {
    1: "Minor",
    2: "Moderate",
    3: "Serious",
    4: "Critical",
    5: "Life-Threatening"
}

TRIAGE_TAG = {1: "GREEN", 2: "GREEN", 3: "YELLOW", 4: "RED", 5: "RED"}


def _build_features(symptoms, vitals: dict) -> np.ndarray:
    feats = [float(vitals.get(v, 0)) for v in VITALS]

    if isinstance(symptoms, str):
        active = set(symptoms.split("|"))
    else:
        active = set(symptoms)

    for sym in ALL_SYMPTOMS:
        feats.append(1.0 if sym in active else 0.0)

    weights = [SYMPTOM_MAP[s]["severity_weight"] for s in active if s in SYMPTOM_MAP]
    feats.append(max(weights) if weights else 0.0)
    feats.append(len(active))

    return np.array(feats, dtype=np.float32)


def train():
    df = pd.read_csv(DATA_DIR / "synthetic_patients.csv")

    X, y = [], []
    for _, row in df.iterrows():
        vitals = {v: row[v] for v in VITALS}
        X.append(_build_features(row["symptoms"], vitals))
        y.append(int(row["severity"]) - 1)

    X, y = np.array(X), np.array(y)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    model = XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.08,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="mlogloss",
        random_state=42,
        verbosity=0
    )
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    y_pred = model.predict(X_test)
    print(classification_report(y_test, y_pred, target_names=[SEVERITY_LABELS[i+1] for i in range(5)]))

    joblib.dump(model, MODEL_PATH)
    print(f"Saved → {MODEL_PATH}")
    return model


def _get_care_needs(symptoms: list) -> dict:
    needs_icu = False
    needs_ventilator = False
    specialists = set()
    equipment = set()

    for sym in symptoms:
        if sym not in SYMPTOM_MAP:
            continue
        info = SYMPTOM_MAP[sym]
        specialists.add(info["requires_specialist"])
        for eq in info["requires_equipment"]:
            if eq == "icu":
                needs_icu = True
            elif eq == "ventilator":
                needs_ventilator = True
            else:
                equipment.add(eq)

    primary = list(specialists)[0] if specialists else "general_surgeon"
    return {
        "needs_icu": needs_icu,
        "needs_ventilator": needs_ventilator,
        "primary_specialist": primary,
        "all_specialists": list(specialists),
        "equipment_needed": list(equipment)
    }


def predict(patient: dict) -> dict:
    """
    patient: dict with vitals (age, heart_rate, bp_systolic, bp_diastolic,
             spo2, gcs, respiratory_rate, spo2_trend_per_min, hr_trend_per_min)
             and symptoms (list or pipe-separated string)

    Returns severity, triage tag, care needs, confidence, top features.
    """
    if not MODEL_PATH.exists():
        raise FileNotFoundError("Model not trained. Run: python backend/severity_model.py")

    model = joblib.load(MODEL_PATH)

    symptoms = patient.get("symptoms", [])
    if isinstance(symptoms, str):
        symptoms = symptoms.split("|")

    feats = _build_features(symptoms, patient).reshape(1, -1)
    severity = int(model.predict(feats)[0]) + 1
    proba = model.predict_proba(feats)[0]
    confidence = round(float(proba[severity - 1]), 3)

    care = _get_care_needs(symptoms)

    # Severity-driven overrides
    if severity >= 4:
        care["needs_icu"] = True
    if severity == 5:
        spo2 = patient.get("spo2", 100)
        rr = patient.get("respiratory_rate", 0)
        if spo2 < 85 or rr > 30:
            care["needs_ventilator"] = True

    # Top contributing features for explainability
    importances = model.feature_importances_
    feature_names = VITALS + ALL_SYMPTOMS + ["max_symptom_weight", "symptom_count"]
    top = sorted(zip(feature_names, importances), key=lambda x: x[1], reverse=True)[:5]
    top_features = [{"feature": k, "importance": round(float(v), 4)} for k, v in top]

    return {
        "severity": severity,
        "severity_label": SEVERITY_LABELS[severity],
        "triage_tag": TRIAGE_TAG[severity],
        "confidence": confidence,
        "needs_icu": care["needs_icu"],
        "needs_ventilator": care["needs_ventilator"],
        "primary_specialist": care["primary_specialist"],
        "all_specialists": care["all_specialists"],
        "equipment_needed": care["equipment_needed"],
        "top_features": top_features
    }


if __name__ == "__main__":
    train()
