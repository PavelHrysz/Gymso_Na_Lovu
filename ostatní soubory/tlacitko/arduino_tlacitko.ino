#include <ESP8266WiFi.h>
#include <WiFiUdp.h>
#include <ESP8266HTTPClient.h>

// --- KONFIGURACE ---
const int arduinoID = 1; 
const char* ssid = "Na Lovu";
const char* password = "gymsolov";
const int buttonPin = D5; 
const int ledPin = D6;

// --- ČASOVÉ KONSTANTY ---
const int sendInterval = 1500; 
const long ledDuration = 10000; // 10 vteřin

unsigned long lastSendTime = 0;   
unsigned long ledStartTime = 0;
bool ledActive = false;         // Stav LED
int lastButtonState = LOW;     

WiFiUDP udp;
IPAddress serverIP;
bool serverNalezen = false;
const int udpPort = 41234;

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  pinMode(buttonPin, INPUT_PULLUP); 
  pinMode(ledPin, OUTPUT);
  digitalWrite(ledPin, LOW);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  udp.begin(udpPort);
  Serial.println("\nSystem pripraven + LED aktivni");
}

void loop() {
  // --- 1. Hledání serveru ---
  if (!serverNalezen) {
    static unsigned long lastUdpMs = 0;
    if (millis() - lastUdpMs > 2000) {
      udp.beginPacket(IPAddress(255, 255, 255, 255), udpPort);
      udp.write("KDE_JE_SERVER");
      udp.endPacket();
      lastUdpMs = millis();
    }
    int packetSize = udp.parsePacket();
    if (packetSize) {
      char reply[20];
      int len = udp.read(reply, 20);
      if (len > 0) reply[len] = 0;
      if (strstr(reply, "TADY_JE_SERVER")) {
        serverIP = udp.remoteIP();
        serverNalezen = true;
      }
    }
  }

  // --- 2. Logika stisku a rozsvícení LED ---
  int currentState = digitalRead(buttonPin);

  if (currentState == HIGH && lastButtonState == LOW) {
    if (millis() - lastSendTime > sendInterval) {
      delay(10); 
      if (digitalRead(buttonPin) == HIGH) {
        if (serverNalezen) {
          lastSendTime = millis();
          
          // ROZSVÍCENÍ LED
          digitalWrite(ledPin, HIGH);
          ledStartTime = millis();
          ledActive = true;
          Serial.println(">>> LED ON na 10s");

          WiFiClient client;
          HTTPClient http;
          String url = "http://" + serverIP.toString() + "/arduino?prikaz=tlacitko&hodnota=" + String(arduinoID);
          
          if (http.begin(client, url)) {
            http.GET();
            http.end();
          }
        }
      }
    }
  }
  lastButtonState = currentState;

  // --- 3. Automatické zhasnutí LED po 10 vteřinách ---
  if (ledActive && (millis() - ledStartTime >= ledDuration)) {
    digitalWrite(ledPin, LOW);
    ledActive = false;
    Serial.println(">>> LED OFF");
  }

  yield();
}