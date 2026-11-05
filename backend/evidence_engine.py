
from datetime import datetime, timezone


# --------------------------------------------------
# FIELDZY CENTRAL EVIDENCE VALIDATION ENGINE
# --------------------------------------------------

FEATURE_REQUIREMENTS = {
    "plant": [
        {
            "key": "crop_type",
            "question": "Which crop is affected?"
        },
        {
            "key": "symptom_duration",
            "question": "How long have these symptoms been visible?"
        },
        {
            "key": "affected_parts",
            "question": "Which parts of the plant are affected?"
        },
        {
            "key": "spread",
            "question": "Are nearby plants showing similar symptoms?"
        },
    ],

    "acoustic": [
        {
            "key": "recording_quality",
            "question": "Is the audio recording clear and usable?"
        },
        {
            "key": "field_context",
            "question": "What activity or conditions were present when recording?"
        },
        {
            "key": "baseline_available",
            "question": "Is a comparable baseline recording available?"
        },
    ],

    "soil": [
        {
            "key": "measurement_source",
            "question": "Was this reading measured by a real sensor or entered manually?"
        },
        {
            "key": "measurement_location",
            "question": "Where in the field was the measurement taken?"
        },
        {
            "key": "measurement_time",
            "question": "When was the measurement taken?"
        },
    ],

    "observation": [
        {
            "key": "description",
            "question": "Can you provide more details about the observation?"
        },
        {
            "key": "independent_evidence",
            "question": "Is there any additional evidence supporting this observation?"
        },
    ],
}


def has_value(value):
    if value is None:
        return False

    if isinstance(value, str):
        return bool(value.strip())

    return True


def validate_evidence(
    feature,
    model_result=None,
    context=None,
    evidence=None
):
    """
    Checks evidence completeness and produces a preliminary
    assessment.

    This engine checks information quality and completeness.
    It does NOT scientifically verify a disease or threat.
    """

    feature = str(feature or "observation").lower()

    model_result = model_result or {}
    context = context or {}
    evidence = evidence or []

    if not isinstance(context, dict):
        context = {}

    if not isinstance(model_result, dict):
        model_result = {}

    if not isinstance(evidence, list):
        evidence = []

    requirements = FEATURE_REQUIREMENTS.get(
        feature,
        FEATURE_REQUIREMENTS["observation"]
    )

    missing_evidence = []

    for requirement in requirements:
        key = requirement["key"]

        value = context.get(key)

        # Explicit evidence can also satisfy certain requirements.
        if key == "independent_evidence":
            value = value or evidence

        if not has_value(value):
            missing_evidence.append({
                "key": key,
                "question": requirement["question"],
                "resolved": False
            })

    # --------------------------------------------------
    # SOURCE RELIABILITY CHECK
    # --------------------------------------------------

    source_warning = None

    if feature == "soil":
        source = str(
            context.get("measurement_source", "")
        ).lower()

        if source in ("simulated", "demo", "mock"):
            source_warning = (
                "This is simulated data, not a real field measurement."
            )

    # --------------------------------------------------
    # RECORD MODEL INFORMATION
    # --------------------------------------------------

    prediction = model_result.get("prediction")

    confidence = model_result.get("confidence")

    # A model score is recorded, but never treated as proof.
    if confidence is not None:
        try:
            confidence = float(confidence)
            confidence = max(0, min(100, confidence))
        except (ValueError, TypeError):
            confidence = None

    # --------------------------------------------------
    # VALIDATION STATUS
    # --------------------------------------------------

    if source_warning:
        status = "insufficient"
    elif missing_evidence:
        status = "insufficient"
    elif not prediction and feature in ("plant", "acoustic"):
        status = "insufficient"
    else:
        status = "preliminary"

    # --------------------------------------------------
    # REASONING
    # --------------------------------------------------

    if status == "insufficient":
        reasoning = (
            "FIELDZY does not have enough information for a "
            "well-supported preliminary assessment. The missing "
            "information listed below should be collected first."
        )
    else:
        reasoning = (
            "The available information meets the basic completeness "
            "checks for a preliminary assessment. This does not "
            "establish that the model prediction is correct."
        )

    if source_warning:
        reasoning = source_warning

    # --------------------------------------------------
    # SUGGESTED NEXT ACTION
    # --------------------------------------------------

    if missing_evidence:
        next_action = (
            "Collect the missing information before relying on "
            "the assessment."
        )
    elif source_warning:
        next_action = (
            "Obtain a real field measurement before drawing "
            "conclusions about soil conditions."
        )
    else:
        next_action = (
            "Review the available information and seek field "
            "or agricultural expert verification where needed."
        )

    # --------------------------------------------------
    # FINAL RESPONSE
    # --------------------------------------------------

    return {
        "success": True,
        "feature": feature,
        "status": status,
        "prediction": prediction,
        "model_confidence": confidence,
        "missing_evidence": missing_evidence,
        "missing_count": len(missing_evidence),
        "evidence_count": len(evidence),
        "reasoning": reasoning,
        "next_action": next_action,
        "source_warning": source_warning,
        "expert_confirmed": False,
        "validation_source": "FIELDZY rule-based validation",
        "validated_at": datetime.now(
            timezone.utc
        ).isoformat()
    }
