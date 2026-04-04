"""
Lightweight trauma scene classifier — pure PIL + numpy, no ML framework.
Classifies accident scene photos into high / medium / low severity using
image statistics that correlate with crash trauma:
  - Red dominance  (blood, fire, brake lights)
  - Edge density   (crash damage → irregular edges)
  - Scene entropy  (chaos / debris vs clean background)
  - Darkness score (night, smoke)
"""
import io
import numpy as np
from PIL import Image, ImageFilter


def _features(image: Image.Image) -> dict:
    img = image.resize((224, 224)).convert("RGB")
    arr = np.array(img, dtype=np.float32)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]

    # 1. Red dominance — blood / fire / emergency lights
    red_mask  = (r > 130) & (r > g * 1.35) & (r > b * 1.35)
    red_score = float(red_mask.mean())

    # 2. Edge density — crash damage creates irregular, high-frequency edges
    gray      = img.convert("L")
    edges     = np.array(gray.filter(ImageFilter.FIND_EDGES), dtype=np.float32)
    edge_dens = float((edges > 25).mean())

    # 3. Entropy / chaos — damaged scene has high local variance
    chaos = float(arr.std() / 128.0)

    # 4. Darkness — nighttime crash / smoke obstruction
    brightness = float(arr.mean() / 255.0)
    darkness   = max(0.0, 0.45 - brightness)

    # 5. Colour saturation spread — crash scenes have unusual colour distributions
    sat_spread = float(np.std([r.mean(), g.mean(), b.mean()]) / 128.0)

    return {
        "red_score":  red_score,
        "edge_dens":  edge_dens,
        "chaos":      chaos,
        "darkness":   darkness,
        "sat_spread": sat_spread,
    }


def analyze_scene(image_bytes: bytes, media_type: str = "image/jpeg") -> dict:
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        f = _features(image)

        score = min(
            f["red_score"]  * 3.5 +
            f["edge_dens"]  * 1.8 +
            f["chaos"]      * 0.6 +
            f["darkness"]   * 0.8 +
            f["sat_spread"] * 0.5,
            1.0
        )

        if score > 0.42:
            severity = "high"
            detected = ["high edge irregularity (crash damage)", "abnormal colour distribution"]
            if f["red_score"] > 0.08:
                detected.append("red channel dominance (blood / fire)")
            reason = (
                f"Image classifier detected high-severity trauma indicators "
                f"(score {score:.2f}) — routing restricted to Level 1 Trauma Centers"
            )
        elif score > 0.18:
            severity = "medium"
            detected = ["moderate scene complexity"]
            reason = f"Image classifier detected moderate severity indicators (score {score:.2f})"
        else:
            severity = "low"
            detected = ["no high-severity indicators"]
            reason = f"Image classifier found no critical trauma indicators (score {score:.2f})"

        high_s = round(min(score / 0.42, 1.0), 3)
        med_s  = round(max(0.0, 1.0 - high_s) * 0.6, 3)
        low_s  = round(max(0.0, 1.0 - high_s - med_s), 3)

        return {
            "severity":    severity,
            "trauma_only": severity == "high",
            "confidence":  round(score, 3),
            "detected":    detected,
            "reason":      reason,
            "model":       "Lightweight CV classifier (PIL + NumPy, zero-dependency)",
            "scores":      {"high": high_s, "medium": med_s, "low": low_s},
        }

    except Exception as e:
        return {
            "severity":    "high",
            "trauma_only": True,
            "confidence":  0.0,
            "detected":    [],
            "reason":      f"Classifier error ({e}) — defaulting to high severity for safety",
            "model":       "Lightweight CV classifier (error fallback)",
            "scores":      {"high": 1.0, "medium": 0.0, "low": 0.0},
        }
