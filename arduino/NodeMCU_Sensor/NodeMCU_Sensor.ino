#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>

#include <DHT.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#define WIFI_SSID     "Galaxy S23 Ultra 672B"
#define WIFI_PASSWORD "apnanetkharid"

#define BACKEND_URL "http://10.248.101.143:3000/data"

#define FARM_LAT 28.6139
#define FARM_LON 77.2090

#define DHTPIN 5         
#define DHTTYPE DHT11

#define ONE_WIRE_BUS 4    
#define SOIL_MOISTURE_PIN A0

DHT dht(DHTPIN, DHTTYPE);

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

const unsigned long SEND_INTERVAL_MS = 15000UL;

unsigned long lastSendTime = 0;

void ensureWiFiConnected() {

  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.println();
  Serial.print("[WiFi] Connecting to ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startAttemptTime = millis();

  while (
    WiFi.status() != WL_CONNECTED &&
    millis() - startAttemptTime < 15000UL
  ) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {

    Serial.println("[WiFi] Connected!");
    Serial.print("[WiFi] IP Address: ");
    Serial.println(WiFi.localIP());

  } else {

    Serial.println("[WiFi] Connection FAILED");
  }
}

void setup() {

  Serial.begin(115200);

  Serial.println();
  Serial.println();
  Serial.println("=================================");
  Serial.println("CropWise Debug Mode Starting...");
  Serial.println("=================================");

  dht.begin();
  delay(2000);   
  sensors.begin();

  WiFi.mode(WIFI_STA);

  ensureWiFiConnected();
}

void loop() {

  if (millis() - lastSendTime < SEND_INTERVAL_MS) {
    return;
  }

  lastSendTime = millis();

  Serial.println();
  Serial.println("--- Starting Hardware Diagnostic ---");

  float airTemp = dht.readTemperature();
  float airHumidity = dht.readHumidity();

  bool dhtValid =
    !isnan(airTemp) &&
    !isnan(airHumidity);

  if (!dhtValid) {

    Serial.println("[CHECK] DHT11: FAILED");

    airTemp = 0.0;
    airHumidity = 0.0;

  } else {

    Serial.printf(
      "[CHECK] DHT11: OK (Temp: %.2f C, Humidity: %.2f%%)\n",
      airTemp,
      airHumidity
    );
  }

  sensors.requestTemperatures();

  float soilTemp = sensors.getTempCByIndex(0);

  bool soilTempValid =
    (soilTemp != DEVICE_DISCONNECTED_C);

  if (!soilTempValid) {

    Serial.println("[CHECK] DS18B20: FAILED");

    soilTemp = 0.0;

  } else {

    Serial.printf(
      "[CHECK] DS18B20: OK (Soil Temp: %.2f C)\n",
      soilTemp
    );
  }

  int rawADC = analogRead(SOIL_MOISTURE_PIN);

  float soilMoisturePct =
    (1.0f - ((float)rawADC / 1023.0f)) * 100.0f;

  soilMoisturePct =
    constrain(soilMoisturePct, 0.0f, 100.0f);

  Serial.printf(
    "[CHECK] Moisture: OK (Raw ADC: %d, Mapped: %.2f%%)\n",
    rawADC,
    soilMoisturePct
  );

  String payload =
    "{"
    "\"temperature_c\":" + String(airTemp, 2) + ","
    "\"air_humidity_pct\":" + String(airHumidity, 2) + ","
    "\"soil_temperature_c\":" + String(soilTemp, 2) + ","
    "\"soil_moisture_pct\":" + String(soilMoisturePct, 2) + ","
    "\"lat\":" + String(FARM_LAT, 6) + ","
    "\"lon\":" + String(FARM_LON, 6) +
    "}";

  Serial.println("[DEBUG] JSON Payload:");
  Serial.println(payload);

  ensureWiFiConnected();

  if (WiFi.status() != WL_CONNECTED) {

    Serial.println("[ERROR] WiFi disconnected");
    Serial.println("--- Cycle Complete ---");

    return;
  }

  WiFiClient client;

  HTTPClient http;

  http.useHTTP10(true);

  Serial.println("[HTTP] Connecting to backend...");

  bool beginSuccess =
    http.begin(client, BACKEND_URL);

  if (!beginSuccess) {

    Serial.println("[HTTP] begin() FAILED");

    Serial.println("--- Cycle Complete ---");

    return;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("User-Agent", "ESP8266");

  http.setTimeout(10000);

  Serial.println("[HTTP] Sending POST request...");

  int httpCode = http.POST(payload);

  if (httpCode > 0) {

    Serial.printf(
      "[HTTP] Success! Response Code: %d\n",
      httpCode
    );

    String response = http.getString();

    Serial.println("[HTTP] Server Response:");
    Serial.println(response);

  } else {

    Serial.printf(
      "[HTTP] FAILED! Error: %s\n",
      http.errorToString(httpCode).c_str()
    );
  }

  http.end();

  Serial.println("--- Cycle Complete ---");
}