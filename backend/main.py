
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
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware


# --------------------------------------------------
# APP SETUP
# --------------------------------------------------

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# LOAD SOUND AI MODELS
# --------------------------------------------------

model = joblib.load(
    os.path.join(BASE_DIR, "fieldzy_sound_model.pkl")
)

yamnet = hub.load("https://tfhub.dev/google/yamnet/1")


# --------------------------------------------------
# LOAD PLANT DISEASE MODEL
# --------------------------------------------------

plant_model = tf.saved_model.load(
    os.path.join(BASE_DIR, "fieldzy_savedmodel")
)

plant_predict = plant_model.signatures["serving_default"]

with open(
    os.path.join(BASE_DIR, "class_names.json"),
    "r"
) as f:
    plant_classes = json.load(f)

print("FIELDZY Plant Disease Model Loaded!")
print("FIELDZY Sound Analysis Model Loaded!")


# --------------------------------------------------
# HOME
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "FIELDZY AI Backend is running!"
    }


# --------------------------------------------------
# SOUND ANALYSIS
# --------------------------------------------------

@app.post("/analyze")
async def analyze_sound(file: UploadFile = File(...)):

    temp_path = os.path.join(BASE_DIR, "temp_audio.webm")

    try:
        audio_bytes = await file.read()

        if not audio_bytes:
            raise HTTPException(
                status_code=400,
                detail="Empty audio file"
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
                detail="Empty audio recording"
            )

        waveform = tf.convert_to_tensor(
            audio,
            dtype=tf.float32
        )

        scores, embeddings, spectrogram = yamnet(waveform)

        features = np.mean(
            embeddings.numpy(),
            axis=0
        ).reshape(1, -1)

        prediction = model.predict(features)[0]

        confidence = float(
            np.max(model.predict_proba(features))
        )

        return {
            "prediction": str(prediction),
            "confidence": round(confidence * 100, 2),
            "message": "Prototype sound classification. Verify before drawing conclusions."
        }

    except HTTPException:
        raise

    except Exception as e:
        print("SOUND AI ERROR:", repr(e))
        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail="Sound analysis failed"
        )

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


# --------------------------------------------------
# ACOUSTIC INTELLIGENCE
# --------------------------------------------------

@app.post("/acoustic-intelligence")
async def acoustic_intelligence(file: UploadFile = File(...)):

    temp_path = os.path.join(BASE_DIR, "temp_acoustic.wav")

    try:
        audio_bytes = await file.read()

        if not audio_bytes:
            raise HTTPException(
                status_code=400,
                detail="Empty audio recording"
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
                detail="Empty audio recording"
            )

        waveform = tf.convert_to_tensor(
            audio,
            dtype=tf.float32
        )

        scores, embeddings, spectrogram = yamnet(waveform)

        features = np.mean(
            embeddings.numpy(),
            axis=0
        ).reshape(1, -1)

        prediction = model.predict(features)[0]

        confidence = float(
            np.max(model.predict_proba(features))
        )

        return {
            "prediction": str(prediction),
            "confidence": round(confidence * 100, 2),
            "source": "Acoustic Intelligence",
            "message": "Prototype sound classification. Verify before drawing conclusions."
        }

    except HTTPException:
        raise

    except Exception as e:
        print("ACOUSTIC AI ERROR:", repr(e))
        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail="Acoustic analysis failed"
        )

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


# --------------------------------------------------
# PLANT DISEASE DETECTION
# --------------------------------------------------

@app.post("/predict-plant")
async def predict_plant(file: UploadFile = File(...)):

    try:
        image_bytes = await file.read()

        if not image_bytes:
            raise HTTPException(
                status_code=400,
                detail="No image uploaded"
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

        predictions = result["output_0"].numpy()[0]

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
            "message": "Preliminary AI prediction. Field verification is recommended."
        }

    except HTTPException:
        raise

    except Exception as e:
        print("PLANT DETECTION ERROR:", repr(e))
        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail="Plant image analysis failed"
        )
