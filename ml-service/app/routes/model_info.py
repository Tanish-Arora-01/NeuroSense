# ──────────────────────────────────────────────
# NeuroSense ML Service — Model Info & Evaluation Routes
# Serves model metadata and saved evaluation metrics.
# ──────────────────────────────────────────────

from __future__ import annotations

import json
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

from app.core.config import settings
from app.core.security import require_screening_api_key
from app.models.ml_model import MODEL_FEATURE_ORDER, MODEL_VERSION, load_model

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/model", tags=["Model Info"])

EVAL_PATH = Path(settings.model_path).parent / "model_evaluation.json"


@router.get(
    "/info",
    dependencies=[Depends(require_screening_api_key)],
)
async def model_info():
    """Return basic model metadata and feature importances."""
    model = load_model()

    response = {
        "model_version": MODEL_VERSION,
        "feature_names": MODEL_FEATURE_ORDER,
        "model_loaded": model is not None,
    }

    if model is not None and hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
        response["feature_importances"] = [
            {"feature": name, "importance": round(float(imp), 4)}
            for name, imp in sorted(
                zip(MODEL_FEATURE_ORDER, importances),
                key=lambda x: x[1],
                reverse=True,
            )
        ]

    return response


@router.get(
    "/evaluation",
    dependencies=[Depends(require_screening_api_key)],
)
async def model_evaluation():
    """Return saved evaluation metrics (confusion matrix, ROC, etc.)."""
    if not EVAL_PATH.is_file():
        raise HTTPException(
            status_code=404,
            detail=(
                "Model evaluation data not found. "
                "Run train_model.py to generate evaluation metrics."
            ),
        )

    try:
        with EVAL_PATH.open("r", encoding="utf-8") as f:
            evaluation = json.load(f)
        return evaluation
    except (json.JSONDecodeError, OSError) as exc:
        logger.error("Failed to read evaluation file: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Failed to read model evaluation data.",
        ) from exc
