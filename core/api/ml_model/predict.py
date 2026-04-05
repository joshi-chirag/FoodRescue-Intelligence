import joblib

model = joblib.load('api/ml_model/saved_model.pkl')

def predict(data):
    return model.predict([data])[0]