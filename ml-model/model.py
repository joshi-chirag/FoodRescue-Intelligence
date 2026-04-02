import pickle

model = pickle.load(open("saved_model.pkl", "rb"))

def predict_expiry(data):
    prediction = model.predict([data])
    return prediction[0]