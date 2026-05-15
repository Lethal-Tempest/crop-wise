from fastapi import FastAPI
from pydantic import BaseModel
import torch
import torch.nn as nn
import joblib
import numpy as np

app = FastAPI()

class CropNet(nn.Module):
    def __init__(self, input_size, num_classes):
        super(CropNet, self).__init__()
        self.network = nn.Sequential(
            nn.Linear(input_size, 256), nn.ReLU(), nn.Dropout(0.2),
            nn.Linear(256, 128), nn.ReLU(),
            nn.Linear(128, 64), nn.ReLU(),
            nn.Linear(64, num_classes)
        )
    def forward(self, x): return self.network(x)

label_mapping = joblib.load("label_mapping.joblib")
scaler = joblib.load("scaler.joblib")

input_features = 8 # Based on your training script
model = CropNet(input_features, len(label_mapping))
model.load_state_dict(torch.load("crop_nn.pth", map_location=torch.device('cpu')))
model.eval()

class SensorData(BaseModel):
    air_temp: float
    soil_temp: float
    humidity: float
    moisture: float
    rainfall: float
    season_encoded: int
    query_season_encoded: int
    is_correct_season: int

@app.post("/predict")
def predict_crop(data: SensorData):
    features = np.array([[
        data.air_temp, data.soil_temp, data.humidity, data.moisture, 
        data.rainfall, data.season_encoded, data.query_season_encoded, data.is_correct_season
    ]])
    
    features_scaled = scaler.transform(features)
    tensor_data = torch.FloatTensor(features_scaled)
    
    with torch.no_grad():
        outputs = model(tensor_data)
        
        temperature = 2.5 
        scaled_outputs = outputs / temperature
        
        probabilities = torch.nn.functional.softmax(scaled_outputs, dim=1)
        confidence, predicted_idx = torch.max(probabilities, 1)
        
    predicted_crop = label_mapping[predicted_idx.item()]
    
    return {
        "crop": predicted_crop,
        "confidence": f"{confidence.item() * 100:.2f}%"
    }

