import torch

import torch.nn as nn

import torch.optim as optim

from torch.utils.data import DataLoader, TensorDataset

import pandas as pd

import numpy as np

from sklearn.model_selection import train_test_split

from sklearn.preprocessing import StandardScaler

import joblib

import time

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

print(f"🚀 Training on: {device}")

if torch.cuda.is_available():

    print(f"🎸 GPU detected: {torch.cuda.get_device_name(0)}")

print("📊 Loading dataset...")

df = pd.read_csv('dataset.csv')


features = [

    'air_temp', 'soil_temp', 'humidity', 'moisture', 'rainfall', 

    'season_encoded', 'query_season_encoded', 'is_correct_season'

]



X = df[features].values



df['crop_encoded'] = df['crop'].astype('category').cat.codes

y = df['crop_encoded'].values



label_mapping = dict(enumerate(df['crop'].astype('category').cat.categories))

joblib.dump(label_mapping, "label_mapping.joblib")



scaler = StandardScaler()

X_scaled = scaler.fit_transform(X)

joblib.dump(scaler, "scaler.joblib")


X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)



X_train_t = torch.FloatTensor(X_train)

y_train_t = torch.LongTensor(y_train)

X_test_t = torch.FloatTensor(X_test).to(device)

y_test_t = torch.LongTensor(y_test).to(device)



train_loader = DataLoader(

    TensorDataset(X_train_t, y_train_t), 

    batch_size=1024, 

    shuffle=True

)


class CropNet(nn.Module):

    def __init__(self, input_size, num_classes):

        super(CropNet, self).__init__()

        self.network = nn.Sequential(

            nn.Linear(input_size, 256),

            nn.ReLU(),

            nn.Dropout(0.2), 

            nn.Linear(256, 128),

            nn.ReLU(),

            nn.Linear(128, 64),

            nn.ReLU(),

            nn.Linear(64, num_classes)

        )



    def forward(self, x):

        return self.network(x)



model = CropNet(len(features), len(label_mapping)).to(device)



criterion = nn.CrossEntropyLoss()

optimizer = optim.Adam(model.parameters(), lr=0.001)



print(f"🏋️ Starting training with {len(features)} features...")

start_time = time.time()



for epoch in range(100):

    model.train()

    total_loss = 0

    

    for batch_X, batch_y in train_loader:


        batch_X, batch_y = batch_X.to(device), batch_y.to(device)

        

        optimizer.zero_grad()

        outputs = model(batch_X)

        loss = criterion(outputs, batch_y)

        loss.backward()

        optimizer.step()

        total_loss += loss.item()

    

    if (epoch + 1) % 10 == 0:

        model.eval()

        with torch.no_grad():

            test_preds = model(X_test_t)

            _, predicted = torch.max(test_preds, 1)

            accuracy = (predicted == y_test_t).sum().item() / y_test_t.size(0)

        

        avg_loss = total_loss / len(train_loader)

        print(f"Epoch {epoch+1:3d} | Loss: {avg_loss:.4f} | Accuracy: {accuracy*100:.2f}%")

torch.save(model.to('cpu').state_dict(), "crop_nn.pth")
print("💾 All assets (model, scaler, mapping) saved successfully!")