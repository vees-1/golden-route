import os
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """You are an AI Mass Casualty Incident (MCI) Coordinator embedded in the GoldenRoute Emergency Routing System. You brief incident commanders with clinical precision and authority.

Your briefing must follow this exact structure:

## Incident Overview
One paragraph: total patients, triage breakdown (RED/YELLOW/GREEN counts), overall survival outlook vs naive nearest-hospital routing.

## Patient Distribution Rationale
For each patient (in RED → YELLOW → GREEN order), one bullet:
- **[Patient ID] → [Hospital Name]** (ETA: Xmin) — Clinical reason why this specific hospital. Mention the key constraint matched (ICU availability, specialist, load, cath lab, etc.) and why the nearest hospital was suboptimal.

## Load Balance Assessment
How patients were spread across hospitals. Flag if any hospital received >2 patients (surge risk). Note hospitals deliberately avoided due to load.

## Critical Alerts
Any RED-tag patients with survival <60%, extreme vitals, or ETA >20min. Be direct.

## Coordinator Recommendation
1-2 sentences: what the incident commander should do next (pre-alert hospitals, stage resources, etc.)

Be concise, clinical, and authoritative. No hedging language. Use real hospital names and patient IDs from the data."""


def _build_user_prompt(data: dict) -> str:
    title = data.get("title", "Unknown Incident")
    results = data.get("results", [])

    triage_order = {"RED": 0, "YELLOW": 1, "GREEN": 2}
    sorted_results = sorted(
        results,
        key=lambda p: triage_order.get(p.get("severity", {}).get("triage_tag", "GREEN"), 2)
    )

    lines = [f"Incident: {title}", f"Total patients: {len(results)}", ""]

    for p in sorted_results:
        pid = p.get("patient_id", "?")
        sev = p.get("severity", {})
        tag = sev.get("triage_tag", "GREEN")
        label = sev.get("severity_label", "")

        routing = p.get("routing", {})
        recommended = routing.get("recommended", [])
        rejected = routing.get("rejected", [])
        assigned = recommended[0] if recommended else {}

        hosp_name = assigned.get("name", "Unknown")
        eta = assigned.get("est_travel_minutes", "?")
        icu = assigned.get("icu_available", "?")

        comparison = p.get("comparison", {})
        survival_optimal = comparison.get("survival_optimal_pct", "?")
        survival_nearest = comparison.get("survival_nearest_pct", "?")
        survival_gain = comparison.get("survival_gain_pct", "?")

        lines.append(f"Patient {pid} [{tag}] — {label}")
        lines.append(f"  Assigned: {hosp_name} | ETA: {eta}min | ICU available: {icu}")
        lines.append(f"  Survival optimal: {survival_optimal}% | Nearest hospital: {survival_nearest}% | Gain: +{survival_gain}%")

        if rejected:
            unmet = []
            for r in rejected:
                reason = r.get("rejection_reason", "")
                rname = r.get("name", "")
                if reason:
                    unmet.append(f"{rname} ({reason})")
            if unmet:
                lines.append(f"  Rejected: {', '.join(unmet)}")

        lines.append("")

    return "\n".join(lines)


def coordinate(results: dict) -> str:
    user_prompt = _build_user_prompt(results)
    response = _client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1200,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return response.content[0].text
