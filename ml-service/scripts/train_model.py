"""Train a dementia risk model on synthetic cognitive + acoustic data."""

from __future__ import annotations

import json
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from xgboost import XGBClassifier
from sklearn.utils._tags import get_tags

class PatchedXGBClassifier(XGBClassifier):
    def __sklearn_tags__(self):
        tags = super().__sklearn_tags__() if hasattr(super(), "__sklearn_tags__") else get_tags(self)
        tags.estimator_type = "classifier"
        return tags

from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import train_test_split, GridSearchCV
from typing import Any

FEATURE_COLUMNS = [
    "age",
    "mmse_score",
    "cdr_score",
    "moca_score",
    "education_years",
    "speech_rate",
    "number_of_pauses",
    "pitch_variation",
]
TARGET_COLUMN = "diagnosis"


def generate_synthetic_dataset(n_records: int = 2000, random_state: int = 42) -> pd.DataFrame:
    """Generate synthetic records for training and local development."""
    if n_records < 1500:
        raise ValueError("n_records must be at least 1500")

    rng = np.random.default_rng(random_state)

    severity = rng.beta(2.3, 2.0, n_records)

    age = np.clip(rng.normal(66 + 18 * severity, 6.5), 50, 95)
    mmse_score = np.clip(rng.normal(28 - 13 * severity, 2.8), 0, 30)
    cdr_score = np.clip(np.round(rng.normal(0.2 + 2.2 * severity, 0.35), 1), 0, 3)
    moca_score = np.clip(rng.normal(26 - 11 * severity, 3.0), 0, 30)
    education_years = np.clip(rng.normal(15 - 6 * severity, 2.2), 0, 24)

    speech_rate = np.clip(rng.normal(170 - 70 * severity, 18), 60, 240)
    number_of_pauses = np.clip(rng.poisson(2 + 11 * severity), 0, 60)
    pitch_variation = np.clip(rng.normal(90 - 40 * severity, 11), 8, 180)

    # Build a probabilistic diagnosis label with clinical + acoustic signal contribution.
    logit = (
        -2.8
        + 0.04 * (age - 65)
        + 0.25 * (24 - mmse_score)
        + 1.05 * cdr_score
        + 0.15 * (22 - moca_score)
        + 0.06 * (12 - education_years)
        + 0.013 * (140 - speech_rate)
        + 0.10 * (number_of_pauses - 4)
        + 0.012 * (70 - pitch_variation)
        + rng.normal(0, 0.65, n_records)
    )
    probability = 1.0 / (1.0 + np.exp(-logit))
    diagnosis = rng.binomial(1, np.clip(probability, 0.01, 0.99))

    data = pd.DataFrame(
        {
            "age": age,
            "mmse_score": mmse_score,
            "cdr_score": cdr_score,
            "moca_score": moca_score,
            "education_years": education_years,
            "speech_rate": speech_rate,
            "number_of_pauses": number_of_pauses,
            "pitch_variation": pitch_variation,
            TARGET_COLUMN: diagnosis.astype(int),
        }
    )

    return data


def train_model(data: pd.DataFrame, random_state: int = 42) -> tuple[Any, dict]:
    """Train multiple models, compare them, and return the best one along with evaluation metrics."""
    X = data[FEATURE_COLUMNS]
    y = data[TARGET_COLUMN]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=random_state,
        stratify=y,
    )

    models = {
        "RandomForest": (
            RandomForestClassifier(random_state=random_state, class_weight="balanced_subsample"),
            {
                "n_estimators": [100, 200, 350],
                "max_depth": [10, 14, 20],
                "min_samples_leaf": [2, 5]
            }
        ),
        "XGBoost": (
            PatchedXGBClassifier(random_state=random_state, eval_metric="logloss", objective="binary:logistic", tree_method="hist", device="cpu"),
            {
                "n_estimators": [100, 200],
                "max_depth": [3, 6, 10],
                "learning_rate": [0.01, 0.1, 0.2]
            }
        ),
        "LogisticRegression": (
            LogisticRegression(random_state=random_state, class_weight="balanced", max_iter=1000),
            {
                "C": [0.1, 1.0, 10.0]
            }
        )
    }

    best_model = None
    best_auc = 0.0
    best_model_name = ""

    print("Starting Model Comparison Pipeline...")
    for name, (estimator, param_grid) in models.items():
        print(f"Training and tuning {name}...")
        grid = GridSearchCV(estimator, param_grid, scoring="roc_auc", cv=3, n_jobs=-1)
        grid.fit(X_train, y_train)
        
        y_score = grid.predict_proba(X_test)[:, 1]
        auc = roc_auc_score(y_test, y_score)
        print(f"{name} Best Params: {grid.best_params_} | AUC: {auc:.4f}")
        
        if auc > best_auc:
            best_auc = auc
            best_model = grid.best_estimator_
            best_model_name = name

    print(f"\nBest Model Selected: {best_model_name} with AUC: {best_auc:.4f}")
    model = best_model

    if not hasattr(model, "predict_proba"):
        raise RuntimeError("Trained model does not support predict_proba")

    # ── Predictions ─────────────────────────────
    y_pred = model.predict(X_test)
    y_score = model.predict_proba(X_test)[:, 1]

    # ── Core metrics ────────────────────────────
    auc = roc_auc_score(y_test, y_score)
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)

    print(f"Validation ROC-AUC: {auc:.4f}")
    print(f"Accuracy: {accuracy:.4f}  Precision: {precision:.4f}  Recall: {recall:.4f}  F1: {f1:.4f}")

    # ── Confusion matrix ────────────────────────
    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()

    # ── ROC curve data ──────────────────────────
    fpr, tpr, thresholds = roc_curve(y_test, y_score)
    # Downsample ROC curve to max 100 points for JSON efficiency
    if len(fpr) > 100:
        indices = np.linspace(0, len(fpr) - 1, 100, dtype=int)
        fpr = fpr[indices]
        tpr = tpr[indices]
        thresholds = thresholds[np.minimum(indices, len(thresholds) - 1)]

    # ── Per-class report ────────────────────────
    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)

    # ── Feature importances ─────────────────────
    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
    elif hasattr(model, "coef_"):
        importances = np.abs(model.coef_[0])
    else:
        importances = np.zeros(len(FEATURE_COLUMNS))

    feature_importances = [
        {"feature": name, "importance": round(float(imp), 4)}
        for name, imp in sorted(
            zip(FEATURE_COLUMNS, importances),
            key=lambda x: x[1],
            reverse=True,
        )
    ]

    evaluation = {
        "model_version": f"1.1.0-{best_model_name.lower()}-synth",
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "feature_columns": FEATURE_COLUMNS,
        "metrics": {
            "accuracy": round(accuracy, 4),
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(auc, 4),
        },
        "confusion_matrix": {
            "true_negatives": int(tn),
            "false_positives": int(fp),
            "false_negatives": int(fn),
            "true_positives": int(tp),
            "labels": ["No Dementia", "Dementia"],
        },
        "roc_curve": {
            "fpr": [round(float(x), 4) for x in fpr],
            "tpr": [round(float(x), 4) for x in tpr],
        },
        "per_class_report": {
            "0": {
                "label": "No Dementia",
                "precision": round(report["0"]["precision"], 4),
                "recall": round(report["0"]["recall"], 4),
                "f1_score": round(report["0"]["f1-score"], 4),
                "support": int(report["0"]["support"]),
            },
            "1": {
                "label": "Dementia",
                "precision": round(report["1"]["precision"], 4),
                "recall": round(report["1"]["recall"], 4),
                "f1_score": round(report["1"]["f1-score"], 4),
                "support": int(report["1"]["support"]),
            },
        },
        "feature_importances": feature_importances,
    }

    return model, evaluation


def save_model(model: Any, output_path: Path) -> None:
    """Serialize trained model to the configured output path."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("wb") as model_file:
        pickle.dump(model, model_file)


def save_evaluation(evaluation: dict, output_path: Path) -> None:
    """Save evaluation metrics as JSON alongside the model."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(evaluation, f, indent=2)


def main() -> None:
    project_root = Path(__file__).resolve().parents[1]
    model_path = project_root / "trained_models" / "dementia_model.pkl"
    eval_path = project_root / "trained_models" / "model_evaluation.json"

    data = generate_synthetic_dataset(n_records=2000, random_state=42)
    model, evaluation = train_model(data, random_state=42)
    save_model(model, model_path)
    save_evaluation(evaluation, eval_path)

    print(f"\nSaved model to: {model_path}")
    print(f"Saved evaluation to: {eval_path}")
    print(f"Training rows: {len(data)}")
    print(f"Feature columns: {', '.join(FEATURE_COLUMNS)}")


if __name__ == "__main__":
    main()
