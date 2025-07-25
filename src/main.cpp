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
#include "logging.h"

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
  // Note: We can't use Log.notice() yet as logging isn't initialized
  Serial.println("\n=== Scribe Starting === (Pre-NTP sync)");

  // Validate configuration
  validateConfig();

  // Connect to WiFi FIRST (required for NTP sync)
  connectToWiFi();

  // Initialize logging system (before other components that use logging)
  setupLogging();

  // Log main startup message immediately after logging is ready
  LOG_NOTICE("BOOT", "=== Scribe Starting === (Pre-NTP sync)");

  // Log logging system configuration
  LOG_VERBOSE("BOOT", "Logging system initialized (Pre-NTP sync) - Level: %s, Serial: %s, File: %s, MQTT: %s, BetterStack: %s",
              getLogLevelString(logLevel).c_str(),
              logToSerial ? "ON" : "OFF",
              logToFile ? "ON" : "OFF",
              logToMQTT ? "ON" : "OFF",
              logToBetterStack ? "ON" : "OFF");

  // Enable watchdog timer
  esp_task_wdt_init(8, true);
  esp_task_wdt_add(NULL);
  LOG_VERBOSE("BOOT", "Watchdog timer enabled (8s timeout) (Pre-NTP sync)");

  // Initialize timezone with automatic DST handling (must be after WiFi for NTP sync)
  setupTimezone();

  // Feed watchdog after potentially slow timezone/NTP operations
  esp_task_wdt_reset();

  // Log initial memory status
  LOG_VERBOSE("BOOT", "Free heap: %d bytes", ESP.getFreeHeap());

  // Initialize LittleFS for file system access
  if (!LittleFS.begin(true)) // true = format if mount fails
  {
    LOG_ERROR("BOOT", "LittleFS Mount Failed");
  }
  else
  {
    LOG_VERBOSE("BOOT", "LittleFS mounted successfully");
  }

  // Initialize printer
  initializePrinter();

  // Setup mDNS
  setupmDNS();

  // Setup MQTT
  setupMQTT();

  // Setup web server routes
  setupWebServerRoutes(maxReceiptChars);

  // Start the server
  server.begin();
  LOG_VERBOSE("BOOT", "Web server started");

  // Print server info
  printServerInfo();

  LOG_NOTICE("BOOT", "=== Scribe Ready ===");
}

void loop()
{
  // Feed the watchdog
  esp_task_wdt_reset();

  // Process ezTime events (for timezone updates)
  events();

  // Check WiFi connection and reconnect if needed
  handleWiFiReconnection();

  // Handle web server requests (only if WiFi is connected)
  if (WiFi.status() == WL_CONNECTED)
  {
    server.handleClient();

    // Handle MQTT connection and messages
    handleMQTTConnection();
  }

  // Check if we have a new receipt to print
  if (currentReceipt.hasData)
  {
    printReceipt();
    currentReceipt.hasData = false; // Reset flag
  }

  // Monitor memory usage periodically
  if (millis() - lastMemCheck > memCheckInterval)
  {
    LOG_VERBOSE("SYSTEM", "Free heap: %d bytes", ESP.getFreeHeap());
    lastMemCheck = millis();
  }

  delay(10); // Small delay to prevent excessive CPU usage
}
