# ──────────────────────────────────────────────
# NeuroSense ML Service — SHAP Explainer
# Caches a TreeExplainer and computes per-prediction
# SHAP values for model interpretability.
# ──────────────────────────────────────────────

from __future__ import annotations

import logging
import time
from typing import Any

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# ── In-memory explainer cache ───────────────────
_explainer_cache: dict[str, Any] = {}


def _get_or_create_explainer(model: Any) -> Any | None:
    """
    Create and cache a SHAP TreeExplainer for the given model.

    Returns None if SHAP is unavailable or the model is unsupported.
    """
    cache_key = str(id(model))

    if cache_key in _explainer_cache:
        return _explainer_cache[cache_key]

    try:
        import shap  # noqa: E402 — lazy import to keep startup fast

        explainer = shap.TreeExplainer(model)
        _explainer_cache[cache_key] = explainer
        logger.info("SHAP TreeExplainer created and cached for model %s", cache_key)
        return explainer
    except Exception:
        logger.warning(
            "Failed to create SHAP TreeExplainer — predictions will not include explanations",
            exc_info=True,
        )
        _explainer_cache[cache_key] = None
        return None


def compute_shap_explanation(
    model: Any,
    feature_df: pd.DataFrame,
    feature_names: list[str],
) -> dict | None:
    """
    Compute SHAP values for a single prediction.

    Parameters
    ----------
    model : trained sklearn model
        Must be compatible with SHAP TreeExplainer.
    feature_df : pd.DataFrame
        Single-row DataFrame with model features.
    feature_names : list[str]
        Ordered list of feature column names.

    Returns
    -------
    dict or None
        ``{base_value, shap_values: [{feature, value, contribution}, ...]}``
        Returns None if SHAP computation fails for any reason.
    """
    explainer = _get_or_create_explainer(model)
    if explainer is None:
        return None

    try:
        start_time = time.perf_counter()

        shap_values = explainer.shap_values(feature_df)

        # For binary classification, shap_values is a list of two arrays
        # (one per class). We want the positive-class (index 1) contributions.
        if isinstance(shap_values, list):
            # Binary classification: [class_0_shap, class_1_shap]
            values = shap_values[1][0]  # first (only) row, positive class
        else:
            values = shap_values[0]  # single row

        # Base value (expected value for positive class)
        base_value = explainer.expected_value
        if isinstance(base_value, (list, np.ndarray)):
            base_value = float(base_value[1])  # positive class
        else:
            base_value = float(base_value)

        feature_values = feature_df.iloc[0].tolist()

        shap_detail = []
        for i, name in enumerate(feature_names):
            shap_detail.append({
                "feature": name,
                "value": round(float(feature_values[i]), 4),
                "contribution": round(float(values[i]), 4),
            })

        # Sort by absolute contribution (largest impact first)
        shap_detail.sort(key=lambda x: abs(x["contribution"]), reverse=True)

        elapsed_ms = (time.perf_counter() - start_time) * 1000
        logger.info("SHAP computation completed in %.1f ms", elapsed_ms)

        return {
            "base_value": round(base_value, 4),
            "shap_values": shap_detail,
        }

    except Exception:
        logger.warning(
            "SHAP computation failed — returning prediction without explanation",
            exc_info=True,
        )
        return None
