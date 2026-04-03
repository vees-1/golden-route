import os
import base64
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

_PROMPT = """You are an emergency trauma triage AI analyzing an accident scene photograph.

Assess the scene and return ONLY a JSON object with this exact structure:
{
  "severity": "low" | "medium" | "high",
  "trauma_only": true | false,
  "confidence": 0.0-1.0,
  "detected": ["list of observed hazards or injuries"],
  "reason": "one sentence explanation"
}

Rules:
- severity=high and trauma_only=true if you see: major vehicle deformation, visible severe injuries, blood, unconscious victims, entrapment, fire, or multiple casualties
- severity=medium if you see: minor vehicle damage, ambulatory injured persons, single patient
- severity=low if scene appears minor or image is unclear
- trauma_only=true ONLY for high severity — this overrides routing to Level 1 Trauma Centers only
- Be conservative: when uncertain, prefer higher severity

Return only the JSON, no explanation."""


def analyze_scene(image_bytes: bytes, media_type: str = "image/jpeg") -> dict:
    b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

    response = _client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=300,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {"type": "base64", "media_type": media_type, "data": b64},
                },
                {"type": "text", "text": _PROMPT},
            ],
        }],
    )

    import json
    text = response.content[0].text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())
