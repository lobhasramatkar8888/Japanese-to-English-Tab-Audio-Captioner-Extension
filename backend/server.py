import io
import os
import tempfile
import threading
import time
from typing import Any

import whisper
from flask import Flask, jsonify, request
from deep_translator import GoogleTranslator

app = Flask(__name__)

model = whisper.load_model("tiny")
lock = threading.Lock()


def translate_text(text: str, source_lang: str = "ja", target_lang: str = "en") -> str:
    try:
        translated = GoogleTranslator(source=source_lang, target=target_lang).translate(text)
        return translated or text
    except Exception:
        return text


@app.route("/transcribe", methods=["POST"])
def transcribe():
    try:
        if "audio" not in request.files:
            return jsonify({"error": "No audio file provided"}), 400

        audio_file = request.files["audio"]
        source_lang = request.form.get("source_lang", "ja")
        target_lang = request.form.get("target_lang", "en")

        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
            audio_file.save(tmp.name)
            temp_path = tmp.name

        result = model.transcribe(temp_path, fp16=False, language=source_lang)
        os.unlink(temp_path)

        text = result.get("text", "").strip()
        if not text:
            return jsonify({"text": "", "translated": ""})

        translated = translate_text(text, source_lang=source_lang, target_lang=target_lang)
        return jsonify({"text": text, "translated": translated})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
