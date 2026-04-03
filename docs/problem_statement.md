HC03 — Golden-Hour Emergency Triage & Constraint-Based Hospital Routing System

THE PROBLEM

During medical emergencies, ambulances are routinely dispatched to the nearest hospital — only to arrive and discover that the required ventilator is occupied, the relevant specialist is off-duty, or the ICU is at capacity. This reactive routing wastes the most critical minutes of a patient's 'golden hour.' The problem compounds during mass casualty events: a major accident can simultaneously flood a single trauma center while other capable facilities nearby sit underutilized. What is needed is a system that predicts what a patient will need before arrival and routes the ambulance to the nearest hospital that is actually capable of treating them right now.

CORE TECHNICAL COMPLEXITY

The system must combine two hard problems in real-time. First, a severity prediction model must ingest initial EMT-reported vitals and symptom data to predict the patient's likely critical care requirements — ICU bed, ventilator, neurosurgeon, cardiac catheterization lab. Second, a constraint-based optimization engine must simultaneously evaluate a live grid of regional hospitals against multiple competing constraints: predicted care requirements, equipment availability, current hospital load, specialist on-duty status, and estimated transit time — then output the optimal routing decision and explain it. During a mass casualty event, the engine must switch to batch optimization across dozens of simultaneous patients without concentrating all assignments on a single facility.

EXPECTED OUTCOME

A centralized emergency dispatch dashboard that accepts EMT-reported patient data, predicts critical care needs, and routes the ambulance to the optimal hospital in real-time — displaying the routing rationale, estimated arrival time, and dynamically recalculating if a hospital reaches capacity or if road closures change the route mid-journey.

EXACT DELIVERABLES

- A severity prediction model that takes initial vitals and symptom inputs and outputs predicted care requirements (ICU, ventilator, specialist type).
- A constraint-based optimization engine routing to the optimal hospital given equipment availability, load, specialist availability, and transit time simultaneously.
- An interactive map dashboard simulating ambulance routing with real-time hospital status updates.
- An explainability panel stating exactly why a specific hospital was chosen over alternatives.
- A batch-optimization mode that handles simultaneous multi-patient routing during a mass casualty event without overloading a single facility.

RECOMMENDED TECH APPROACH

Use a gradient boosting model for severity and care-needs prediction. Use a constraint-based optimization library for the hospital routing engine. Use a routing or maps API for real-time transit time estimation. Build an interactive map-based dashboard for the dispatch UI.

TWIST 1
Before the EMT enters any vital signs, they photograph the accident scene — a crushed vehicle, a
visible wound. Add a lightweight image classification model that instantly estimates trauma severity
from the scene photograph alone. If a high-severity scene is detected, the system must automatically
filter the hospital list to Level 1 Trauma Centers only, overriding the standard routing before the EMT
completes the vitals form.

TWIST 2
Three major arterial roads close suddenly mid-journey due to an emergency road block. The routing
engine must detect the closure, recalculate ETAs in real-time, and re-route any ambulance currently en
route if a better hospital is now reachable — without requiring dispatcher intervention.