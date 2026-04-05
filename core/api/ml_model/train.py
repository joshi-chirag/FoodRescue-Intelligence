import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
import pickle

# Load data
df = pd.read_csv("food_data.csv")

# Features & target
X = df[['quantity', 'temperature', 'humidity', 'time_since_cooked']]
y = df['expiry_time']

# Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# Train model
model = RandomForestRegressor()
model.fit(X_train, y_train)

# Save model
pickle.dump(model, open("saved_model.pkl", "wb"))

print("Model trained and saved!")