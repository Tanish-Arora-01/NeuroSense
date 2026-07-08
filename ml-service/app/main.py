# ──────────────────────────────────────────────
# NeuroSense ML Service — FastAPI Entry Point
# ──────────────────────────────────────────────

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routes.model_info import router as model_info_router
from app.routes.screening import router as screening_router
from app.routes.users import router as users_router

# ── Logging ─────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s │ %(levelname)-8s │ %(name)s │ %(message)s",
)
logging.getLogger("numba").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)
logging.getLogger("multipart").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)

# ── App ─────────────────────────────────────────
app = FastAPI(
    title="NeuroSense ML Service",
    description=(
        "AI-powered dementia screening microservice. "
        "Called by the main Node.js backend to run ML inference."
    ),
    version="0.1.0",
)

# ── CORS (allow Node.js backend & frontend) ─────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ─────────────────────────────────────
app.include_router(screening_router)
app.include_router(users_router)
app.include_router(model_info_router)


# ── Root health check ───────────────────────────
@app.get("/")
async def root():
    return {"status": "ok", "service": "neurosense-ml"}


# ── Startup event ───────────────────────────────
@app.on_event("startup")
async def on_startup():
    logger.info(
        "🧠 NeuroSense ML Service starting on port %s (debug=%s)",
        settings.ml_service_port,
        settings.debug,
    )
    
    # Warmup to prevent first-request timeouts
    logger.info("Warming up ML models and JIT compilers...")
    
    # 1. Tabular model & SHAP explainer
    try:
        from app.models.ml_model import predict as ml_predict
        ml_predict({"age": 65, "mmse_score": 28, "cdr_score": 0.5})
        logger.info("Tabular model warmup complete.")
    except Exception as e:
        logger.warning(f"Tabular model warmup failed: {e}")

    # 2. Vosk model & Librosa (Numba JIT)
    try:
        from app.core.audio_processor import _load_vosk_model, analyze_speech
        import tempfile
        import wave
        import os
        
        _load_vosk_model()
        
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            dummy_path = f.name
            with wave.open(dummy_path, "wb") as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(16000)
                wav_file.writeframes(b"\x00\x00" * 16000)  # 1 second of silence
                
        try:
            analyze_speech(dummy_path)
            logger.info("Audio model (Vosk + Librosa) warmup complete.")
        finally:
            os.unlink(dummy_path)
            
    except Exception as e:
        logger.warning(f"Audio model warmup failed: {e}")
