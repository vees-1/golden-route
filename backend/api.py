import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from orchestrator import run_pipeline
from voice import transcribe_and_extract

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


class MCPatient(BaseModel):
    patient_id: str
    age: int
    gender: str
    heart_rate: int
    bp_systolic: int
    bp_diastolic: int
    spo2: float
    gcs: int
    respiratory_rate: int
    spo2_trend_per_min: float = 0.0
    hr_trend_per_min: float = 0.0
    symptoms: List[str]


class MCELocation(BaseModel):
    name: str
    lat: float
    lng: float


class MasscasualtyEvent(BaseModel):
    event_id: str
    title: str
    location: MCELocation
    patients: List[MCPatient]


@app.post("/mass-casualty")
def mass_casualty(event: MasscasualtyEvent):
    try:
        results = []
        for p in event.patients:
            patient_dict = p.model_dump()
            patient_dict["lat"] = event.location.lat
            patient_dict["lng"] = event.location.lng
            patient_dict["symptoms"] = "|".join(p.symptoms)
            result = run_pipeline(patient_dict)
            result["patient_id"] = p.patient_id
            results.append(result)
        return {"event_id": event.event_id, "title": event.title, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    try:
        audio_bytes = await file.read()
        result = transcribe_and_extract(audio_bytes, file.filename)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}
