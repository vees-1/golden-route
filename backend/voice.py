import os
import json
import anthropic
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

_whisper = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
_claude = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

_SYMPTOMS = [
    "chest_pain", "chest_pain_radiating_left_arm", "shortness_of_breath",
    "severe_breathing_difficulty", "headache_severe", "sudden_weakness_one_side",
    "slurred_speech", "loss_of_consciousness", "seizure", "blunt_trauma_head",
    "blunt_trauma_chest", "blunt_trauma_abdomen", "fracture_open", "fracture_closed",
    "severe_bleeding", "burns_major", "burns_minor", "abdominal_pain_severe",
    "vomiting_blood", "diabetic_emergency", "allergic_reaction_severe",
    "drowning", "cardiac_arrest", "stroke_symptoms", "spinal_injury",
]

_EXTRACT_PROMPT = """You are a medical data extraction assistant. Extract patient vitals from the paramedic's speech transcription and return ONLY a valid JSON object.

Valid symptoms list: {symptoms}

Transcription: "{transcription}"

Return JSON with these exact keys (use 0 for anything not mentioned):
{{
  "age": <int>,
  "heart_rate": <int>,
  "bp_systolic": <int>,
  "bp_diastolic": <int>,
  "spo2": <float>,
  "gcs": <int>,
  "respiratory_rate": <int>,
  "spo2_trend_per_min": <float>,
  "hr_trend_per_min": <float>,
  "symptoms": "<pipe-separated from valid list only>"
}}

Return only the JSON, no explanation."""


def transcribe_and_extract(audio_bytes: bytes, filename: str = "audio.webm") -> dict:
    import tempfile, pathlib

    with tempfile.NamedTemporaryFile(suffix=pathlib.Path(filename).suffix, delete=False) as f:
        f.write(audio_bytes)
        tmp_path = f.name

    with open(tmp_path, "rb") as f:
        transcription = _whisper.audio.transcriptions.create(
            model="whisper-1",
            file=(filename, f, "audio/webm"),
        ).text

    os.unlink(tmp_path)

    prompt = _EXTRACT_PROMPT.format(
        symptoms=", ".join(_SYMPTOMS),
        transcription=transcription,
    )

    response = _claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}],
    )

    extracted = json.loads(response.content[0].text)
    extracted["transcription"] = transcription
    return extracted
