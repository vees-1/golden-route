import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from concurrent.futures import ThreadPoolExecutor
from orchestrator import run_pipeline
from orchestrator import run_pipeline_fast
from voice import transcribe_and_extract
from emt_assistant import chat as emt_chat_fn
from scene_analyzer import analyze_scene

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
    symptoms: str
    trauma_only: bool = False
    closed_roads: List[str] = []


@app.post("/analyze")
def analyze(patient: PatientInput):
    try:
        d = patient.model_dump()
        trauma_only = d.pop("trauma_only", False)
        closed_roads = d.pop("closed_roads", [])
        result = run_pipeline(d, trauma_only=trauma_only, closed_roads=closed_roads)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze-scene")
async def analyze_scene_endpoint(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        media_type = file.content_type or "image/jpeg"
        result = analyze_scene(image_bytes, media_type)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class RoadClosureRequest(BaseModel):
    patient: PatientInput
    closed_roads: List[str]


@app.post("/road-closure")
def road_closure(req: RoadClosureRequest):
    try:
        d = req.patient.model_dump()
        d.pop("trauma_only", None)
        d.pop("closed_roads", None)
        result = run_pipeline_fast(d, closed_roads=req.closed_roads)
        result["closed_roads"] = req.closed_roads
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
        def process(p):
            patient_dict = p.model_dump()
            patient_dict["lat"] = event.location.lat
            patient_dict["lng"] = event.location.lng
            patient_dict["symptoms"] = "|".join(p.symptoms)
            result = run_pipeline_fast(patient_dict)  # no Claude explanation in batch
            result["patient_id"] = p.patient_id
            return result

        with ThreadPoolExecutor(max_workers=8) as ex:
            results = list(ex.map(process, event.patients))

        return {"event_id": event.event_id, "title": event.title, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class EMTMessage(BaseModel):
    role: str
    content: str


class EMTChatRequest(BaseModel):
    messages: List[EMTMessage]


@app.post("/emt-chat")
def emt_chat(req: EMTChatRequest):
    try:
        result = emt_chat_fn([m.model_dump() for m in req.messages])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class MCICoordinateRequest(BaseModel):
    title: str
    results: list


@app.post("/mci-coordinate")
def mci_coordinate(req: MCICoordinateRequest):
    from mci_coordinator import coordinate
    try:
        result = coordinate({"title": req.title, "results": req.results})
        return {"briefing": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class EthicalTriagePatient(BaseModel):
    patient_id: str
    lat: float = 18.5074
    lng: float = 73.8073
    age: int
    heart_rate: int
    bp_systolic: int
    bp_diastolic: int
    spo2: float
    gcs: int
    respiratory_rate: int
    spo2_trend_per_min: float = 0.0
    hr_trend_per_min: float = 0.0
    symptoms: List[str] = []


class EthicalTriageRequest(BaseModel):
    patients: List[EthicalTriagePatient]
    icu_beds: int = 2
    vents: int = 2


@app.post("/ethical-triage")
def ethical_triage(req: EthicalTriageRequest):
    from ethical_triage import run_ethical_triage
    try:
        patients_data = [p.model_dump() for p in req.patients]
        result = run_ethical_triage(patients_data, req.icu_beds, req.vents)
        return result
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
