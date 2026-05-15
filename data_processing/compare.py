import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import GaussianNB
from sklearn.metrics import accuracy_score
import joblib
import time

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"🚀 Training on: {device}")

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
    batch_size=512, # Smaller batch size for more frequent weight updates
    shuffle=True
)

class CropNet(nn.Module):
    def __init__(self, input_size, num_classes):
        super(CropNet, self).__init__()
        self.network = nn.Sequential(
            nn.Linear(input_size, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(0.1), 
            nn.Linear(64, 32),
            nn.BatchNorm1d(32),
            nn.ReLU(),
            nn.Linear(32, num_classes)
        )

    def forward(self, x):
        return self.network(x)

model = CropNet(len(features), len(label_mapping)).to(device)

criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=0.01, weight_decay=1e-5)
scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, 'min', patience=5, factor=0.5)

print(f"🏋️ Starting NN training with {len(features)} features...")
nn_final_accuracy = 0

for epoch in range(80): 
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
    
    avg_loss = total_loss / len(train_loader)
    scheduler.step(avg_loss) 
    
    if (epoch + 1) % 10 == 0:
        model.eval()
        with torch.no_grad():
            test_preds = model(X_test_t)
            _, predicted = torch.max(test_preds, 1)
            nn_final_accuracy = (predicted == y_test_t).sum().item() / y_test_t.size(0)
        
        print(f"Epoch {epoch+1:3d} | Loss: {avg_loss:.4f} | Accuracy: {nn_final_accuracy*100:.2f}%")

torch.save(model.to('cpu').state_dict(), "crop_nn.pth")

print("\n🤖 Training standard ML models for comparison...")

rf_model = RandomForestClassifier(n_estimators=50, max_depth=6, random_state=42)
rf_model.fit(X_train, y_train)
rf_preds = rf_model.predict(X_test)
rf_accuracy = accuracy_score(y_test, rf_preds)

lr_model = LogisticRegression(max_iter=1000)
lr_model.fit(X_train, y_train)
lr_preds = lr_model.predict(X_test)
lr_accuracy = accuracy_score(y_test, lr_preds)

nb_model = GaussianNB()
nb_model.fit(X_train, y_train)
nb_preds = nb_model.predict(X_test)
nb_accuracy = accuracy_score(y_test, nb_preds)

print("\n🏆 --- FINAL LEADERBOARD ---")
print(f"🥇 Neural Network:      {nn_final_accuracy*100:.2f}%")
print(f"🥈 Random Forest (Cap): {rf_accuracy*100:.2f}%")
print(f"🥉 Logistic Regression: {lr_accuracy*100:.2f}%")
print(f"🏅 Naive Bayes:         {nb_accuracy*100:.2f}%")