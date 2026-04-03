import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from orchestrator import run_pipeline

app = FastAPI(title="GoldenRoute API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_methods=["*"],
    allow_headers=["*"],
)


class PatientInput(BaseModel):
    lat: float
    lng: float
    age: int
    heart_rate: int
    bp_systolic: int
    bp_diastolic: int
    spo2: float
    gcs: int
    respiratory_rate: int
    spo2_trend_per_min: float = 0.0
    hr_trend_per_min: float = 0.0
    symptoms: str  # pipe-separated: "chest_pain|shortness_of_breath"


@app.post("/analyze")
def analyze(patient: PatientInput):
    try:
        result = run_pipeline(patient.model_dump())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}
