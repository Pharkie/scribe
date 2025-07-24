#include <WiFi.h>
#include <WebServer.h>
#include <WiFiUdp.h>
#include <HardwareSerial.h>
#include <ESPmDNS.h>
#include <esp_task_wdt.h>
#include <ezTime.h>
#include <vector>
#include <LittleFS.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <WiFiClientSecure.h>

// Local module includes
#include "config.h"
#include "character_mapping.h"
#include "web_server.h"
#include "network.h"
#include "printer.h"
#include "mqtt_handler.h"
#include "time_utils.h"

// === Web Server ===
WebServer server(80);

// === Memory Monitoring Variables ===
unsigned long lastMemCheck = 0;
const unsigned long memCheckInterval = 60000; // 60 seconds

void setup()
{
  // Stabilize printer pin as early as possible
  stabilizePrinterPin();

  Serial.begin(115200);
  Serial.println("\n=== Thermal Printer Server Starting ===");

  // Validate configuration
  validateConfig();

  // Enable watchdog timer (8 seconds)
  esp_task_wdt_init(8, true);
  esp_task_wdt_add(NULL);
  Serial.println("Watchdog timer enabled (8s timeout)");

  // Log initial memory status
  Serial.println("Free heap: " + String(ESP.getFreeHeap()) + " bytes");

  // Initialize LittleFS for file system access
  if (!LittleFS.begin(true)) // true = format if mount fails
  {
    Serial.println("LittleFS Mount Failed - continuing without file system");
  }
  else
  {
    Serial.println("LittleFS mounted successfully");
  }

  // Initialize printer
  initializePrinter();

  // Connect to WiFi
  connectToWiFi();

  // Setup mDNS
  setupmDNS();

  // Setup MQTT
  setupMQTT();

  // Initialize timezone with automatic DST handling
  setupTimezone();

  // Setup web server routes
  setupWebServerRoutes(maxReceiptChars);

  // Start the server
  server.begin();
  Serial.println("Web server started");

  // Print server info
  printServerInfo();

  Serial.println("=== Setup Complete ===");
}

void loop()
{
  // Feed the watchdog
  esp_task_wdt_reset();

  // Check WiFi connection and reconnect if needed
  handleWiFiReconnection();

  // Handle web server requests (only if WiFi is connected)
  if (WiFi.status() == WL_CONNECTED)
  {
    server.handleClient();

    // Handle MQTT connection and messages
    handleMQTTConnection();
  }

  // ezTime handles NTP updates automatically

  // Check if we have a new receipt to print
  if (currentReceipt.hasData)
  {
    printReceipt();
    currentReceipt.hasData = false; // Reset flag
  }

  // Monitor memory usage periodically
  if (millis() - lastMemCheck > memCheckInterval)
  {
    Serial.println("Free heap: " + String(ESP.getFreeHeap()) + " bytes");
    lastMemCheck = millis();
  }

  delay(10); // Small delay to prevent excessive CPU usage
}
