import os
import re
from pathlib import Path

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

import joblib
import numpy as np
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.preprocessing.text import tokenizer_from_json


BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "frontend"
MODEL_DIR = BASE_DIR / "model"

MAXLEN_L1 = 300
MAXLEN_L2 = 300
MIN_INPUT_CHARS = 10
HAM_THRESHOLD = 0.40


app = Flask(
    __name__,
    static_folder=str(FRONTEND_DIR),
    static_url_path=""
)

CORS(app)


URL_RE = re.compile(r"https?://\S+|www\.\S+")
PUNCT_RE = re.compile(r"[^\w\s]")
NUM_RE = re.compile(r"\d+")


def clean_text(text: str) -> str:
    text = text.lower().strip()
    text = URL_RE.sub(" ", text)
    text = NUM_RE.sub(" ", text)
    text = PUNCT_RE.sub(" ", text)
    return re.sub(r"\s+", " ", text)


def artifact_path(filename: str) -> Path:
    path = MODEL_DIR / filename

    if path.exists():
        return path

    fallback = BASE_DIR / filename

    if fallback.exists():
        return fallback

    raise FileNotFoundError(
        f"Missing required artifact: {filename}. "
        f"Expected it inside '{MODEL_DIR}' or project root."
    )


def load_tokenizer(filename: str):
    path = artifact_path(filename)

    with open(path, "r", encoding="utf-8") as file:
        return tokenizer_from_json(file.read())


def load_artifacts():
    artifacts = {}

    artifacts["label_encoder_l1"] = joblib.load(
        artifact_path("label_encoder_L1.joblib")
    )
    artifacts["label_encoder_l2"] = joblib.load(
        artifact_path("label_encoder_L2.joblib")
    )

    artifacts["tokenizer_l1"] = load_tokenizer("tokenizer_L1.json")
    artifacts["tokenizer_l2"] = load_tokenizer("tokenizer_L2.json")

    artifacts["model_l1"] = load_model(
        artifact_path("cnn_L1.keras")
    )
    artifacts["model_l2"] = load_model(
        artifact_path("cnn_L2.keras")
    )

    return artifacts


try:
    ARTIFACTS = load_artifacts()
    MODEL_READY = True
    MODEL_ERROR = None
except Exception as error:
    ARTIFACTS = {}
    MODEL_READY = False
    MODEL_ERROR = str(error)


def get_probability(probabilities, labels, target_label):
    labels = [label.lower() for label in labels]

    if target_label not in labels:
        return 0.0

    return float(probabilities[labels.index(target_label)])


def make_prediction(text: str) -> dict:
    cleaned_text = clean_text(text)

    le1 = ARTIFACTS["label_encoder_l1"]
    le2 = ARTIFACTS["label_encoder_l2"]
    tok1 = ARTIFACTS["tokenizer_l1"]
    tok2 = ARTIFACTS["tokenizer_l2"]
    model1 = ARTIFACTS["model_l1"]
    model2 = ARTIFACTS["model_l2"]

    x1 = pad_sequences(
        tok1.texts_to_sequences([cleaned_text]),
        maxlen=MAXLEN_L1
    )

    layer1_probs = model1.predict(x1, verbose=0)[0]
    layer1_labels = [label.lower() for label in le1.classes_]

    ham_probability = get_probability(
        layer1_probs,
        layer1_labels,
        "ham"
    )

    if ham_probability >= HAM_THRESHOLD:
        return {
            "prediction": "ham",
            "probabilities": {
                "ham": ham_probability,
                "spam": 0.0,
                "phishing": 0.0,
                "promotion": 0.0
            },
            "layer": "L1",
            "input_length": len(text)
        }

    x2 = pad_sequences(
        tok2.texts_to_sequences([cleaned_text]),
        maxlen=MAXLEN_L2
    )

    layer2_probs = model2.predict(x2, verbose=0)[0]
    layer2_labels = [label.lower() for label in le2.classes_]

    prediction_index = int(np.argmax(layer2_probs))
    prediction_label = layer2_labels[prediction_index]

    final_probabilities = {
        "ham": 0.0,
        "spam": 0.0,
        "phishing": 0.0,
        "promotion": 0.0
    }

    for label, probability in zip(layer2_labels, layer2_probs):
        final_probabilities[label] = float(probability)

    return {
        "prediction": prediction_label,
        "probabilities": final_probabilities,
        "layer": "L2",
        "input_length": len(text)
    }


@app.route("/")
def home():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model_ready": MODEL_READY,
        "model_error": MODEL_ERROR
    })


@app.route("/metadata", methods=["GET"])
def metadata():
    return jsonify({
        "project": "Multiclass Email Security Detection",
        "classes": ["ham", "spam", "phishing", "promotion"],
        "architecture": "Two-layer email classification pipeline",
        "layer_1": "Ham vs suspicious email",
        "layer_2": "Spam vs phishing vs promotion",
        "model_ready": MODEL_READY
    })


@app.route("/predict", methods=["POST"])
def predict():
    if not MODEL_READY:
        return jsonify({
            "error": "Model artifacts are not loaded.",
            "details": MODEL_ERROR
        }), 500

    data = request.get_json(silent=True) or {}
    text = data.get("text", "").strip()

    if len(text) < MIN_INPUT_CHARS:
        return jsonify({
            "error": "Text too short for analysis."
        }), 400

    try:
        result = make_prediction(text)
        return jsonify(result)

    except Exception as error:
        return jsonify({
            "error": "Prediction failed.",
            "details": str(error)
        }), 500


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=8000,
        debug=True
    )