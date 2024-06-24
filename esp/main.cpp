#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <HTTPClient.h>

// WiFi credentials
const char* ssid = "your_SSID";
const char* password = "your_PASSWORD";

// Server URL
const char* serverUrl = "http://yourserver.com/endpoint";

// Define the LCD address and dimensions
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Encoder pins
const int encoderCLK = 32;
const int encoderDT = 33;
const int encoderSW = 25;

// Relay pin
const int relayPin = 26;

// Charging detection pin
const int chargePin = 27;

// Variables for encoder
int lastCLK = HIGH;
int lastButtonState = HIGH;

// Variable to track charging state
bool isCharging = false;

void setup() {
  // Initialize serial communication
  Serial.begin(115200);

  // Initialize LCD
  lcd.begin();
  lcd.backlight();
  lcd.print("Initializing...");

  // Initialize WiFi
  connectToWiFi();

  // Initialize encoder pins
  pinMode(encoderCLK, INPUT);
  pinMode(encoderDT, INPUT);
  pinMode(encoderSW, INPUT_PULLUP);

  // Initialize relay pin
  pinMode(relayPin, OUTPUT);
  digitalWrite(relayPin, LOW);

  // Initialize charge detection pin
  pinMode(chargePin, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(chargePin), chargingStateChanged, CHANGE);

  // Clear LCD
  lcd.clear();
  lcd.print("Ready");
}

void loop() {
  // Handle rotary encoder
  handleEncoder();

  // Other logic can go here...

  delay(100); // Small delay to debounce encoder
}

void handleEncoder() {
  int clkState = digitalRead(encoderCLK);
  int dtState = digitalRead(encoderDT);

  // Detect rotation
  if (clkState != lastCLK) {
    if (dtState != clkState) {
      Serial.println("Encoder turned right");
      lcd.clear();
      lcd.print("Right turn");
    } else {
      Serial.println("Encoder turned left");
      lcd.clear();
      lcd.print("Left turn");
    }
  }
  lastCLK = clkState;

  // Detect button press
  int buttonState = digitalRead(encoderSW);
  if (buttonState == LOW && lastButtonState == HIGH) {
    Serial.println("Encoder button pressed");
    lcd.clear();
    lcd.print("Button Pressed");
    // Add your button press handling code here
  }
  lastButtonState = buttonState;
}

void chargingStateChanged() {
  bool newState = digitalRead(chargePin) == LOW;
  if (newState != isCharging) {
    isCharging = newState;
    if (isCharging) {
      Serial.println("Charging started");
      lcd.clear();
      lcd.print("Charging...");
      digitalWrite(relayPin, HIGH); // Turn on relay
      sendHttpRequest("start");
    } else {
      Serial.println("Charging stopped");
      lcd.clear();
      lcd.print("Charging stopped");
      digitalWrite(relayPin, LOW); // Turn off relay
      sendHttpRequest("stop");
    }
  }
}

void sendHttpRequest(const char* event) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(serverUrl) + "?event=" + event;
    http.begin(url);
    int httpCode = http.GET();
    if (httpCode > 0) {
      String payload = http.getString();
      Serial.println("HTTP Response code: " + String(httpCode));
      Serial.println("Payload: " + payload);
    } else {
      Serial.println("HTTP GET request failed");
    }
    http.end();
  } else {
    Serial.println("WiFi not connected");
  }
}

void connectToWiFi() {
  lcd.clear();
  lcd.print("Connecting...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    lcd.print(".");
  }
  Serial.println("Connected to WiFi");
  lcd.clear();
  lcd.print("WiFi Connected");
}