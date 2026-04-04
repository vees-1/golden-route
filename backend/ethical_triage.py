import os
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()
_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """You are an AI Ethical Triage Advisor embedded in GoldenRoute Emergency AI.

During mass casualty resource scarcity, you apply the utilitarian bioethics framework: allocate scarce ICU resources to maximize total lives saved — prioritizing patients with the highest survival probability given treatment.

Your response must follow this exact structure:

## Ethical Framework Applied
One sentence: name the framework (utilitarian/maximize lives saved) and why it applies here.

## Allocation Decisions
For each patient (allocated first, then deferred), one bullet:
- **[Patient ID] — [ALLOCATED / DEFERRED]** (Survival: X%) — One sentence justification. For ALLOCATED: why their profile warrants the bed. For DEFERRED: acknowledge the difficulty honestly, state their survival odds without ICU, and note any alternative care possible.

## Ethical Cost Acknowledged
Briefly (2-3 sentences): recognize the moral weight of denying care. Do not minimize it. Name that deferred patients face worse outcomes and this decision is tragic but necessary.

## Recommendation
One sentence: what clinical staff should do next (palliative care for deferred, reassess if a bed opens, etc.)

Be direct, clinical, and honest. Do not use euphemisms. Use real patient IDs and exact survival percentages from the data."""


def run_ethical_triage(patients_data: list, icu_beds: int, vents: int) -> dict:
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent))
    from orchestrator import run_pipeline_fast

    processed = []
    for p in patients_data:
        d = dict(p)
        pid = d.pop("patient_id", f"P{len(processed)+1}")
        symptoms = d.get("symptoms", [])
        if isinstance(symptoms, list):
            d["symptoms"] = "|".join(symptoms)
        result = run_pipeline_fast(d)
        result["patient_id"] = pid
        processed.append(result)

    def survival_score(r):
        return r.get("comparison", {}).get("optimal_survival_pct", 0)

    ranked = sorted(processed, key=survival_score, reverse=True)

    allocated = []
    deferred = []
    for i, r in enumerate(ranked):
        if i < icu_beds:
            r["_allocation"] = "ALLOCATED"
            allocated.append(r)
        else:
            r["_allocation"] = "DEFERRED"
            deferred.append(r)

    lines = [
        f"RESOURCE CONSTRAINTS: {icu_beds} ICU bed(s) available, {vents} ventilator(s) available.",
        f"PATIENTS ({len(ranked)} total, ranked by survival probability):\n"
    ]
    for r in ranked:
        pid = r["patient_id"]
        alloc = r["_allocation"]
        sev = r.get("severity", {})
        comp = r.get("comparison", {})
        opt_pct = comp.get("optimal_survival_pct", 0)
        near_pct = comp.get("nearest_survival_pct", 0)
        tag = sev.get("triage_tag", "RED")
        label = sev.get("severity_label", "Critical")
        needs_icu = sev.get("needs_icu", True)
        needs_vent = sev.get("needs_ventilator", False)
        lines.append(
            f"- {pid} [{alloc}]: Triage={tag}, Severity={label}, "
            f"SurvivalWithICU={opt_pct:.1f}%, SurvivalWithoutICU≈{max(near_pct-15,5):.1f}%, "
            f"NeedsICU={needs_icu}, NeedsVent={needs_vent}"
        )

    user_prompt = "\n".join(lines)
    user_prompt += "\n\nProvide the ethical triage briefing."

    response = _client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=900,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    reasoning = response.content[0].text

    return {
        "ranked": ranked,
        "allocated": [r["patient_id"] for r in allocated],
        "deferred": [r["patient_id"] for r in deferred],
        "icu_beds": icu_beds,
        "vents": vents,
        "reasoning": reasoning,
    }
