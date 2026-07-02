import pandas as pd
import numpy as np
from xgboost import XGBClassifier

print("Generating data...")
X = pd.DataFrame(np.random.rand(100, 8), columns=[
    "age", "mmse_score", "cdr_score", "moca_score", 
    "education_years", "speech_rate", "number_of_pauses", "pitch_variation"
])
y = np.random.randint(0, 2, 100)

print("Instantiating XGB...")
class PatchedXGBClassifier(XGBClassifier):
    _estimator_type = "classifier"

xgb = PatchedXGBClassifier(tree_method="hist", device="cpu", eval_metric="logloss")
from sklearn.base import clone
cloned = clone(xgb)
print("cloned type:", type(cloned))
print("cloned _estimator_type:", getattr(cloned, "_estimator_type", None))
print("cloned type:", type(cloned))
print("cloned _estimator_type:", getattr(cloned, "_estimator_type", None))

from sklearn.model_selection import GridSearchCV

print("GridSearchCV fitting...")
grid = GridSearchCV(xgb, {"n_estimators": [10, 20]}, cv=2, n_jobs=1, scoring="roc_auc")
try:
    grid.fit(X, y)
    print("GridSearchCV Fit successful!")
except Exception as e:
    import traceback
    traceback.print_exc()
    import traceback
    traceback.print_exc()
