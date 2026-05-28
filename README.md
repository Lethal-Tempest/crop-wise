# 🌾 CropWise

**CropWise** is an intelligent Agritech platform designed to empower Indian farmers. It bridges the gap between precision agriculture and fair-trade market access by combining real-time IoT soil monitoring, Machine Learning-based crop prediction, an AI agronomy chatbot, and a live real-time auction marketplace for selling crops directly to wholesalers.

**Created by:** Daksh Arora  
**Live Demo:** [https://crop-wise-two.vercel.app/](https://crop-wise-two.vercel.app/)

---

## ✨ Key Features

* **📡 Real-Time IoT Monitoring:** Integrated NodeMCU (ESP8266) system using DHT11 (air temperature/humidity), DS18B20 (soil temperature), and soil moisture sensors to continuously monitor farm conditions.
* **🧠 ML Crop Prediction:** A custom Neural Network (built with PyTorch) predicts the most suitable crops based on real-time sensor data, seasonality, and live rainfall data fetched dynamically via the NASA POWER API.
* **💬 Gemini AI Agronomist:** An integrated chat assistant powered by Google's Gemini AI, trained to provide instant, practical advice on crops, weather, fertilizers, and Minimum Support Prices (MSP).
* **⚖️ Live Bidding Marketplace:** A real-time WebSocket (Socket.io) powered auction system where farmers can list their harvest and wholesalers can place live bids. 
* **✉️ Automated Deal Closures:** Automatically closes expired auctions and utilizes Nodemailer to instantly connect farmers with the top 3 highest bidders via email.
* **🔐 Role-Based Authentication:** Secure JWT access controlling distinct dashboards and capabilities for *Farmers* and *Wholesalers*.

---

## 🛠 Tech Stack

**Frontend (Client):**
* React.js (Vite)
* Tailwind CSS
* Socket.IO-client

**Backend (API & WebSockets):**
* Node.js & Express.js
* MongoDB & Mongoose
* Socket.IO (Real-time bidding)
* Google Generative AI SDK (Gemini)
* JWT & Bcrypt (Auth)
* Nodemailer (Email notifications)

**Machine Learning & Data Processing:**
* Python
* PyTorch (Deep Learning Model)
* Scikit-Learn (Data scaling and baseline model comparisons)
* Pandas & NumPy

**Hardware / IoT:**
* NodeMCU ESP8266
* C++ (Arduino Framework)
* Sensors: DHT11 (Air), DS18B20 (Soil Temp), Analog Moisture Sensor

---

## 🏗 Architecture & Data Flow

1. **IoT Edge:** The NodeMCU reads farm metrics and sends a JSON payload to the Express backend every 15 seconds.
2. **Backend Aggregation:** The backend intercepts the data, validates it, and fetches live regional rainfall from the NASA API using the farmer's GPS coordinates.
3. **ML Microservice:** The complete payload is forwarded to a Python endpoint where the PyTorch model runs inference and returns the optimum crop recommendation.
4. **Marketplace:** Farmers list their approved crops. Wholesalers connect via Socket.io to a live bidding room. Upon timer expiration, the backend calculates the winners and dispatches emails to facilitate the trade.

---

## 🚀 Local Development Setup

### 1. Clone the repository
```bash
git clone [https://github.com/Lethal-Tempest/crop-wise.git](https://github.com/Lethal-Tempest/crop-wise.git)
cd crop-wise
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a .env file in the /backend directory:
```bash
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password
GEMINI_API_KEY=your_gemini_api_key
ML_API_URL=http://localhost:5000  # URL for the Python ML microservice
```

Run the backend:
```bash
npm run dev
```

### 3. ML Microservice Setup
```bash
cd data_processing
pip install -r requirements.txt
python ml_api.py # Run your prediction server
```

4. Frontend Setup
```bash
cd frontend
npm install
```

## Create a .env file in the /frontend directory:
```bash
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

## Run the frontend:
```bash
npm run dev
```

# 🔌 Hardware Setup (Arduino)
To run the physical sensor node, flash the code located in arduino/NodeMCU_Sensor/NodeMCU_Sensor.ino to a NodeMCU ESP8266.

**Wiring connections:**

* DHT11 (Air Temp/Humidity): Data pin to D1 (GPIO 5)

* DS18B20 (Soil Temp): Data pin to D2 (GPIO 4) with a 4.7k pull-up resistor to 3.3V

* Soil Moisture: Analog pin to A0

Note: Ensure you update the WiFi credentials and the BACKEND_URL in the .ino file to point to your hosted backend before uploading.

# 📝 License
This project is open-source and created for educational and demonstration purposes.
