import pandas as pd
import random

data = []

for _ in range(300):
    quantity = random.randint(1, 20)
    temperature = random.randint(5, 40)
    humidity = random.randint(30, 90)
    time_since_cooked = random.randint(0, 10)

    expiry_time = (24 - time_since_cooked) - (temperature / 5)

    data.append([quantity, temperature, humidity, time_since_cooked, expiry_time])

df = pd.DataFrame(data, columns=[
    "quantity", "temperature", "humidity", "time_since_cooked", "expiry_time"
])

df.to_csv("food_data.csv", index=False)

print("Dataset created!")