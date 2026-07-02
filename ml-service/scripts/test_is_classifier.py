from sklearn.utils._tags import get_tags
from xgboost import XGBClassifier

class PatchedXGBClassifier(XGBClassifier):
    def __sklearn_tags__(self):
        tags = super().__sklearn_tags__() if hasattr(super(), "__sklearn_tags__") else get_tags(self)
        tags.estimator_type = "classifier"
        return tags

xgb = PatchedXGBClassifier(tree_method="hist", device="cpu", eval_metric="logloss")
from sklearn.base import is_classifier
print("p is_classifier:", is_classifier(xgb))
