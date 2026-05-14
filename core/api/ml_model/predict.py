from pathlib import Path
import joblib

# Use absolute path relative to this file — works regardless of where Django is run from
MODEL_PATH = Path(__file__).parent / 'saved_model.pkl'
model = joblib.load(MODEL_PATH)


def predict(data):
    """
    Predict freshness/expiry score for a food donation.

    Args:
        data: list of [quantity, temperature, humidity, time_since_cooked]

    Returns:
        float: predicted expiry score (higher = fresher / more time remaining)
    """
    return float(model.predict([data])[0])