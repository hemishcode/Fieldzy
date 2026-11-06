
from dotenv import load_dotenv
from google import genai
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from evidence_engine import validate_evidence

import json
import io
import os
import traceback

import joblib
import librosa
import numpy as np
import tensorflow as tf
import tensorflow_hub as hub

from PIL import Image


# ==================================================
# ENVIRONMENT AND GEMINI SETUP
# ==================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

load_dotenv(os.path.join(BASE_DIR, ".env"))

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

gemini_client = (
    genai.Client(api_key=GEMINI_API_KEY)
    if GEMINI_API_KEY
    else None
)

# Use the Gemini model previously confirmed to work.
GEMINI_MODEL = "gemini-flash-lite-latest"


# ==================================================
# APP SETUP
# ==================================================

app = FastAPI(
    title="FIELDZY AI Backend",
    description="Agricultural intelligence and evidence validation",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://fieldzy-abxkl5rkg-hemishcode.vercel.app",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================================================
# CENTRAL EVIDENCE VALIDATION
# ==================================================

class EvidenceValidationRequest(BaseModel):
    feature: str
    model_result: dict = Field(default_factory=dict)
    context: dict = Field(default_factory=dict)
    evidence: list = Field(default_factory=list)


@app.post("/validate-evidence")
async def validate_field_evidence(
    request: EvidenceValidationRequest
):

    try:
        result = validate_evidence(
            feature=request.feature,
            model_result=request.model_result,
            context=request.context,
            evidence=request.evidence
        )

        return result

    except Exception as e:

        print(
            "EVIDENCE VALIDATION ERROR:",
            repr(e),
            flush=True
        )

        raise HTTPException(
            status_code=500,
            detail="Evidence validation failed."
        )


# ==================================================
# LOAD SOUND AI MODELS
# ==================================================

model = joblib.load(
    os.path.join(BASE_DIR, "fieldzy_sound_model.pkl")
)

yamnet = hub.load(
    "https://tfhub.dev/google/yamnet/1"
)


# ==================================================
# LOAD PLANT DISEASE MODEL
# ==================================================

plant_model = tf.saved_model.load(
    os.path.join(BASE_DIR, "fieldzy_savedmodel")
)

plant_predict = plant_model.signatures["serving_default"]

with open(
    os.path.join(BASE_DIR, "class_names.json"),
    "r"
) as f:

    plant_classes = json.load(f)

print(
    "FIELDZY Plant Disease Model Loaded!",
    flush=True
)

print(
    "FIELDZY Sound Analysis Model Loaded!",
    flush=True
)


# ==================================================
# HOME
# ==================================================

@app.get("/")
def home():

    return {
        "success": True,
        "message": "FIELDZY AI Backend is running!"
    }


# ==================================================
# SOUND ANALYSIS
# ==================================================

@app.post("/analyze")
async def analyze_sound(
    file: UploadFile = File(...)
):

    temp_path = os.path.join(
        BASE_DIR,
        "temp_audio.webm"
    )

    try:

        audio_bytes = await file.read()

        if not audio_bytes:

            raise HTTPException(
                status_code=400,
                detail="Empty audio file."
            )

        with open(temp_path, "wb") as f:
            f.write(audio_bytes)

        audio, sr = librosa.load(
            temp_path,
            sr=16000,
            mono=True
        )

        if len(audio) == 0:

            raise HTTPException(
                status_code=400,
                detail="Empty audio recording."
            )

        waveform = tf.convert_to_tensor(
            audio,
            dtype=tf.float32
        )

        scores, embeddings, spectrogram = yamnet(
            waveform
        )

        features = np.mean(
            embeddings.numpy(),
            axis=0
        ).reshape(1, -1)

        prediction = model.predict(features)[0]

        confidence = float(
            np.max(
                model.predict_proba(features)
            )
        )

        return {
            "success": True,
            "prediction": str(prediction),
            "confidence": round(confidence * 100, 2),
            "message": (
                "Prototype sound classification. "
                "Verify before drawing conclusions."
            )
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "SOUND AI ERROR:",
            repr(e),
            flush=True
        )

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail="Sound analysis failed."
        )

    finally:

        if os.path.exists(temp_path):
            os.remove(temp_path)


# ==================================================
# ACOUSTIC INTELLIGENCE
# ==================================================

@app.post("/acoustic-intelligence")
async def acoustic_intelligence(
    file: UploadFile = File(...)
):

    temp_path = os.path.join(
        BASE_DIR,
        "temp_acoustic.webm"
    )

    try:

        audio_bytes = await file.read()

        if not audio_bytes:

            raise HTTPException(
                status_code=400,
                detail="Empty audio recording."
            )

        with open(temp_path, "wb") as f:
            f.write(audio_bytes)

        audio, sr = librosa.load(
            temp_path,
            sr=16000,
            mono=True
        )

        if len(audio) == 0:

            raise HTTPException(
                status_code=400,
                detail="Empty audio recording."
            )

        waveform = tf.convert_to_tensor(
            audio,
            dtype=tf.float32
        )

        scores, embeddings, spectrogram = yamnet(
            waveform
        )

        features = np.mean(
            embeddings.numpy(),
            axis=0
        ).reshape(1, -1)

        prediction = model.predict(features)[0]

        confidence = float(
            np.max(
                model.predict_proba(features)
            )
        )

        return {
            "success": True,
            "prediction": str(prediction),
            "confidence": round(confidence * 100, 2),
            "source": "Acoustic Intelligence",
            "message": (
                "Prototype sound classification. "
                "Verify before drawing conclusions."
            )
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "ACOUSTIC AI ERROR:",
            repr(e),
            flush=True
        )

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail="Acoustic analysis failed."
        )

    finally:

        if os.path.exists(temp_path):
            os.remove(temp_path)


# ==================================================
# PLANT DISEASE DETECTION
# ==================================================

@app.post("/predict-plant")
async def predict_plant(
    file: UploadFile = File(...)
):

    try:

        image_bytes = await file.read()

        if not image_bytes:

            raise HTTPException(
                status_code=400,
                detail="No image uploaded."
            )

        image = Image.open(
            io.BytesIO(image_bytes)
        ).convert("RGB")

        image = image.resize((160, 160))

        image_array = np.array(
            image,
            dtype=np.float32
        ) / 255.0

        image_array = np.expand_dims(
            image_array,
            axis=0
        )

        input_tensor = tf.convert_to_tensor(
            image_array,
            dtype=tf.float32
        )

        result = plant_predict(
            input_layer_1=input_tensor
        )

        predictions = result[
            "output_0"
        ].numpy()[0]

        top_indices = np.argsort(
            predictions
        )[-3:][::-1]

        top_predictions = [
            {
                "disease": plant_classes[int(i)],
                "confidence": round(
                    float(predictions[i]) * 100,
                    2
                )
            }
            for i in top_indices
        ]

        best = top_predictions[0]

        return {
            "success": True,
            "prediction": best["disease"],
            "confidence": best["confidence"],
            "top_predictions": top_predictions,
            "message": (
                "Preliminary AI prediction. "
                "Field verification is recommended."
            )
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "PLANT DETECTION ERROR:",
            repr(e),
            flush=True
        )

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail="Plant image analysis failed."
        )


# ==================================================
# FIELD HEALTH SUMMARY REQUEST
# ==================================================

class FieldHealthSummaryRequest(BaseModel):

    fields: list[dict] = Field(
        default_factory=list
    )

    observations: list[dict] = Field(
        default_factory=list
    )

    evidence_debt: dict = Field(
        default_factory=dict
    )

    feature_evidence: list[dict] = Field(
        default_factory=list
    )


# ==================================================
# JSON EXTRACTION AND VALIDATION
# ==================================================

def parse_gemini_assessment(response_text):

    if not response_text:

        raise ValueError(
            "Gemini returned an empty assessment."
        )

    try:

        assessment = json.loads(response_text)

    except json.JSONDecodeError as e:

        print(
            "GEMINI JSON PARSING ERROR:",
            repr(e),
            flush=True
        )

        raise ValueError(
            "Gemini returned an invalid JSON response."
        )

    if not isinstance(assessment, dict):

        raise ValueError(
            "Gemini assessment must be a JSON object."
        )

    required_sections = [
        "overall",
        "field_assessments",
        "cross_field_findings",
        "evidence_review",
        "limitations"
    ]

    for section in required_sections:

        if section not in assessment:

            raise ValueError(
                f"Gemini assessment is missing: {section}"
            )

    if not isinstance(
        assessment["field_assessments"],
        list
    ):

        raise ValueError(
            "field_assessments must be a list."
        )

    return assessment


# ==================================================
# UNIFIED FIELD HEALTH SUMMARY - GEMINI
# ==================================================


@app.post("/field-health-summary")
async def field_health_summary(request: FieldHealthSummaryRequest):

    if not (request.fields or request.observations or request.feature_evidence):
        raise HTTPException(
            status_code=400,
            detail="No agricultural information available."
        )

    def as_dict(item):
        if isinstance(item, dict):
            return item
        if hasattr(item, "model_dump"):
            return item.model_dump()
        if hasattr(item, "dict"):
            return item.dict()
        return {}

    fields = [as_dict(x) for x in (request.fields or [])]
    observations = [as_dict(x) for x in (request.observations or [])]
    feature_evidence = [
        as_dict(x) for x in (request.feature_evidence or [])
    ]

    assessments = []
    missing_evidence = []
    conflicting_evidence = []
    unverified_evidence = []

    for field in fields:

        field_id = str(field.get("id", ""))
        field_name = field.get("name") or "Unnamed field"
        crop = field.get("crop_type") or field.get("crop") or None

        related = [
            o for o in observations
            if str(o.get("field_id", "")) == field_id
        ]

        related_features = [
            e for e in feature_evidence
            if str(e.get("field_id", "")) == field_id
        ]

        records = related + related_features

        predictions = []
        soil_readings = []
        findings = []
        recommendations = []

        for record in records:

            status = str(record.get("status", "Unverified"))

            if status.lower() in [
                "unverified", "conflicting", "inconclusive"
            ]:
                unverified_evidence.append({
                    "field": field_name,
                    "record": record.get("title") or record.get("type") or "Evidence record",
                    "status": status
                })

            gaps = record.get("evidenceGaps", [])
            if not isinstance(gaps, list):
                gaps = []

            for gap in gaps:
                gap = as_dict(gap)
                if not gap.get("resolved", False):
                    missing_evidence.append({
                        "field": field_name,
                        "description": gap.get(
                            "description", "Evidence gap requires review"
                        )
                    })

            evidence_items = record.get("evidence", [])
            if isinstance(evidence_items, dict):
                evidence_items = [evidence_items]

            if not isinstance(evidence_items, list):
                evidence_items = []

            # Include a feature record itself when it contains a prediction.
            candidates = evidence_items + [record]

            for evidence in candidates:
                evidence = as_dict(evidence)

                prediction = evidence.get("prediction")
                if prediction:
                    predictions.append({
                        "prediction": prediction,
                        "confidence": evidence.get("confidence"),
                        "source": evidence.get("source") or evidence.get("type"),
                        "verification_status": evidence.get(
                            "verificationStatus", "Unverified"
                        )
                    })

                evidence_type = str(
                    evidence.get("type", "")
                ).lower()

                if "soil" in evidence_type or "moisture" in evidence_type:
                    value = evidence.get("value")
                    if value is None:
                        value = evidence.get("measurement")

                    if value is not None:
                        soil_readings.append({
                            "value": value,
                            "unit": evidence.get("unit", "%"),
                            "source": evidence.get("source"),
                            "simulated": (
                                evidence.get("simulated", False)
                                or evidence.get("measurement_source") == "simulated"
                            )
                        })

        crop_health = {
            "prediction": None,
            "confidence": None,
            "prediction_source": None,
            "verification_status": "Unverified",
            "crop_mismatch": False,
            "explanation": "No plant model prediction was found in the supplied records."
        }

        if predictions:
            prediction = predictions[0]
            predicted_name = str(prediction["prediction"])

            crop_health.update({
                "prediction": predicted_name,
                "confidence": prediction["confidence"],
                "prediction_source": prediction["source"],
                "verification_status": prediction["verification_status"],
                "explanation": (
                    "This is an unverified model prediction, not a confirmed diagnosis."
                )
            })

            if crop and crop.lower() not in predicted_name.lower():
                crop_health["crop_mismatch"] = True
                crop_health["explanation"] = (
                    "The model prediction appears inconsistent with the registered crop. "
                    "Manual verification is required."
                )

                conflicting_evidence.append({
                    "field": field_name,
                    "registered_crop": crop,
                    "model_prediction": predicted_name
                })

                findings.append(
                    "The plant model prediction may not match the registered crop."
                )

                recommendations.append(
                    "Verify the plant identity and upload a representative image."
                )

        soil = {
            "moisture": None,
            "unit": "%",
            "source": None,
            "is_simulated": False,
            "explanation": "No soil moisture measurement was supplied."
        }

        if soil_readings:
            reading = soil_readings[-1]
            soil.update({
                "moisture": reading["value"],
                "unit": reading["unit"],
                "source": reading["source"],
                "is_simulated": reading["simulated"],
                "explanation": (
                    "Simulated reading; no physical sensor measurement is available."
                    if reading["simulated"]
                    else "Measurement supplied in the records. Independent verification is not established."
                )
            })

            if reading["simulated"]:
                findings.append("Soil moisture value is simulated, not sensor-verified.")
                recommendations.append(
                    "Collect a physical soil moisture measurement before making irrigation decisions."
                )

        if not records:
            findings.append("No observations are linked to this field.")
            recommendations.append(
                "Add field observations and supporting evidence."
            )

        assessments.append({
            "field_id": field.get("id"),
            "field_name": field_name,
            "crop_type": crop,
            "status": "Needs review",
            "crop_health": crop_health,
            "soil": soil,
            "findings": findings,
            "recommendations": recommendations
        })

    # Include observations that do not match a registered field.
    known_ids = {str(f.get("id", "")) for f in fields}

    for observation in observations:
        linked_id = str(observation.get("field_id", ""))
        if linked_id and linked_id not in known_ids:
            missing_evidence.append({
                "field": "Unmatched field",
                "description": (
                    "Observation is linked to an unknown field ID: "
                    + linked_id
                )
            })

    overall_status = (
        "Needs review" if observations or feature_evidence
        else "Insufficient information"
    )

    assessment = {
        "overall": {
            "status": overall_status,
            "explanation": (
                "This local assessment summarizes supplied records only. "
                "It does not independently diagnose crop disease or verify measurements."
            )
        },
        "field_assessments": assessments,
        "cross_field_findings": [],
        "evidence_review": {
            "missing_evidence": missing_evidence,
            "conflicting_evidence": conflicting_evidence,
            "unverified_evidence": unverified_evidence
        },
        "limitations": [
            "This is a local evidence summary, not a Gemini-generated assessment.",
            "Model predictions are not confirmed diagnoses.",
            "Simulated measurements are not physical sensor readings.",
            "No independent expert verification has been performed.",
            "Recommendations are limited by the information supplied."
        ]
    }

    official_evidence_debt = as_dict(request.evidence_debt)

    return {
        "success": True,
        "assessment": assessment,
        "summary": json.dumps(assessment, ensure_ascii=False, indent=2),
        "evidence_debt": official_evidence_debt,
        "model": "FIELDZY_LOCAL_EVIDENCE_ENGINE",
        "assessment_type": "local_fallback"
    }
