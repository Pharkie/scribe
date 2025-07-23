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
#include "config.h"
#include "character_mapping.h"
#include "web_server.h"

// === Function Declarations ===
void validateConfig();
void connectToWiFi();
void setupmDNS();
void setupMQTT();
void connectToMQTT();
void mqttCallback(char *topic, byte *payload, unsigned int length);
void handleMQTTMessage(String message);
String getFormattedDateTime();
String formatCustomDate(String customDate);
void initializePrinter();
void printReceipt();
void printServerInfo();
void setInverse(bool enable);
void advancePaper(int lines);
void printWrapped(String text);
void printWithHeader(String headerText, String bodyText);
void printCharacterTest();

// === Timezone ===
Timezone myTZ;

// === Web Server ===
WebServer server(80);

// === MQTT Setup ===
WiFiClientSecure wifiSecureClient;
PubSubClient mqttClient(wifiSecureClient);
unsigned long lastMQTTReconnectAttempt = 0;
const unsigned long mqttReconnectInterval = 5000; // 5 seconds

// === Printer Setup ===
HardwareSerial printer(1); // Use UART1 on ESP32-C3
const int maxCharsPerLine = 32;

// === WiFi Reconnection Variables ===
unsigned long lastReconnectAttempt = 0;
const unsigned long reconnectInterval = 30000; // 30 seconds

// === Memory Monitoring Variables ===
unsigned long lastMemCheck = 0;
const unsigned long memCheckInterval = 60000; // 60 seconds

void setup()
{
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
  waitForSync();
  myTZ.setLocation(timezone);
  Serial.println("Timezone configured: " + String(timezone));
  Serial.println("Current time: " + myTZ.dateTime());

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
  if (WiFi.status() != WL_CONNECTED)
  {
    if (millis() - lastReconnectAttempt > reconnectInterval)
    {
      Serial.println("WiFi disconnected, attempting reconnection...");
      WiFi.begin(wifiSSID, wifiPassword);
      lastReconnectAttempt = millis();
    }
  }

  // Handle web server requests (only if WiFi is connected)
  if (WiFi.status() == WL_CONNECTED)
  {
    server.handleClient();

    // Handle MQTT connection and messages
    if (!mqttClient.connected())
    {
      if (millis() - lastMQTTReconnectAttempt > mqttReconnectInterval)
      {
        Serial.println("MQTT disconnected, attempting reconnection...");
        connectToMQTT();
        lastMQTTReconnectAttempt = millis();
      }
    }
    else
    {
      mqttClient.loop(); // Handle incoming MQTT messages
    }
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

// === Configuration Validation ===
void validateConfig()
{
  Serial.println("Validating configuration...");

  if (strlen(wifiSSID) == 0)
  {
    Serial.println("ERROR: WiFi SSID not configured!");
  }

  if (strlen(mdnsHostname) == 0)
  {
    Serial.println("ERROR: mDNS hostname not configured!");
  }

  Serial.println("Configuration validation complete");
}

// === WiFi Connection ===
void connectToWiFi()
{
  Serial.print("Connecting to WiFi: ");
  Serial.println(wifiSSID);

  WiFi.begin(wifiSSID, wifiPassword);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30)
  {
    delay(1000);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.println();
    Serial.println("WiFi connected successfully!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  }
  else
  {
    Serial.println();
    Serial.println("Failed to connect to WiFi - continuing anyway");
    Serial.println("Will attempt reconnection every 30 seconds in main loop");
  }
}

// === mDNS Setup ===
void setupmDNS()
{
  if (MDNS.begin(mdnsHostname))
  {
    Serial.println("mDNS responder started");
    Serial.println("Access the form at: http://" + String(mdnsHostname) + ".local");

    // Add service to MDNS-SD
    MDNS.addService("http", "tcp", 80);
  }
  else
  {
    Serial.println("Error setting up mDNS responder!");
  }
}

// === Time Utilities ===
String getFormattedDateTime()
{
  // Use ezTime for automatic timezone handling
  // Format: "Tue 22 Jul 2025 14:30"
  String dateTime = myTZ.dateTime("D d M Y H:i");
  return dateTime;
}

String formatCustomDate(String customDate)
{
  // Use ezTime's makeTime for robust date parsing with minimal custom logic
  customDate.trim();

  int year = 0, month = 0, day = 0;
  bool parsed = false;

  // Try different date formats in order of preference
  if (sscanf(customDate.c_str(), "%d-%d-%d", &year, &month, &day) == 3)
  {
    // ISO format: YYYY-MM-DD or DD-MM-YYYY
    parsed = true;
  }
  else if (sscanf(customDate.c_str(), "%d/%d/%d", &day, &month, &year) == 3)
  {
    // European format: DD/MM/YYYY
    parsed = true;
  }

  if (parsed)
  {
    // Handle 2-digit years sensibly: 69 and below = 2069+, 70+ = 1970+
    if (year < 100)
    {
      year += (year <= 69) ? 2000 : 1900;
    }

    // Try the parsed format first
    time_t parsedTime = makeTime(0, 0, 0, day, month, year);
    if (parsedTime != 0) // makeTime returns 0 for invalid dates
    {
      String formatted = myTZ.dateTime(parsedTime, "D d M Y H:i");
      Serial.println("Parsed date: " + formatted + " (from input: " + customDate + ")");
      return formatted;
    }

    // If European format failed and day <= 12, try US format (MM/DD/YYYY)
    if (day <= 12 && month <= 31 && day != month)
    {
      parsedTime = makeTime(0, 0, 0, month, day, year);
      if (parsedTime != 0)
      {
        String formatted = myTZ.dateTime(parsedTime, "D d M Y H:i");
        Serial.println("Parsed date: " + formatted + " (from input: " + customDate + " - US format)");
        return formatted;
      }
    }
  }

  // If all parsing failed, fall back to current time
  Serial.println("Invalid date format: '" + customDate + "', using current date");
  Serial.println("Supported formats: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY");
  return getFormattedDateTime();
}

// === Printer Functions ===
void initializePrinter()
{
  // Initialize UART1 for TX only (one-way communication to printer)
  printer.begin(9600, SERIAL_8N1, -1, TX_PIN); // baud, config, RX pin (-1 = not used), TX pin
  delay(500);

  // Initialise
  printer.write(0x1B);
  printer.write('@'); // ESC @
  delay(50);

  // Set printer heating parameters from config
  printer.write(0x1B);
  printer.write('7');
  printer.write(heatingDots);     // Heating dots from config
  printer.write(heatingTime);     // Heating time from config
  printer.write(heatingInterval); // Heating interval from config

  // Enable 180° rotation (which also reverses the line order)
  printer.write(0x1B);
  printer.write('{');
  printer.write(0x01); // ESC { 1

  Serial.println("Printer initialized");
}

void printReceipt()
{
  Serial.println("Printing receipt...");

  printWithHeader(currentReceipt.timestamp, currentReceipt.message);

  Serial.println("Receipt printed successfully");
}

void printServerInfo()
{
  Serial.println("=== Server Info ===");
  Serial.print("Local IP: ");
  Serial.println(WiFi.localIP());
  Serial.println("Access the form at: http://" + WiFi.localIP().toString() + " or http://" + String(mdnsHostname) + ".local");
  Serial.println("==================");

  Serial.println("Printing server info on thermal printer...");

  String serverInfo = "Server: " + String(mdnsHostname) + ".local or " + WiFi.localIP().toString();
  advancePaper(1);
  printWithHeader("SCRIBE READY", serverInfo);
}

void setInverse(bool enable)
{
  printer.write(0x1D);
  printer.write('B');
  printer.write(enable ? 1 : 0); // GS B n
}

void advancePaper(int lines)
{
  for (int i = 0; i < lines; i++)
  {
    printer.write(0x0A); // LF
  }
}

void printWrapped(String text)
{
  std::vector<String> lines;

  // Split text by newlines first
  while (text.length() > 0)
  {
    int newlineIndex = text.indexOf('\n');
    String currentLine;

    if (newlineIndex != -1)
    {
      // Found a newline - extract line up to newline
      currentLine = text.substring(0, newlineIndex);
      text = text.substring(newlineIndex + 1);
    }
    else
    {
      // No more newlines - process remaining text
      currentLine = text;
      text = "";
    }

    // Process current line with word wrapping
    while (currentLine.length() > 0)
    {
      if (currentLine.length() <= maxCharsPerLine)
      {
        lines.push_back(currentLine);
        break;
      }

      int lastSpace = currentLine.lastIndexOf(' ', maxCharsPerLine);
      if (lastSpace == -1)
        lastSpace = maxCharsPerLine;

      lines.push_back(currentLine.substring(0, lastSpace));
      currentLine = currentLine.substring(lastSpace);
      currentLine.trim();
    }
  }

  // Print lines in reverse order to compensate for 180° printer rotation
  for (int i = lines.size() - 1; i >= 0; i--)
  {
    printer.println(lines[i]);
  }
}

void printWithHeader(String headerText, String bodyText)
{
  // Clean both header and body text before printing
  String cleanHeaderText = cleanString(headerText);
  String cleanBodyText = cleanString(bodyText);

  // Print body text first (appears at bottom after rotation)
  printWrapped(cleanBodyText);

  // Print header last (appears at top after rotation)
  setInverse(true);
  printWrapped(cleanHeaderText);
  setInverse(false);

  advancePaper(2);
}

void printCharacterTest()
{
  Serial.println("Printing character test...");

  String testContent = "CHARACTER TEST\n\n";

  // Basic ASCII test
  testContent += "ASCII: Hello World 123!@#\n\n";

  // Accented vowels
  testContent += "A variants: À Á Â Ã Ä Å\n";
  testContent += "a variants: à á â ã ä å\n";
  testContent += "E variants: È É Ê Ë\n";
  testContent += "e variants: è é ê ë\n";
  testContent += "I variants: Ì Í Î Ï\n";
  testContent += "i variants: ì í î ï\n";
  testContent += "O variants: Ò Ó Ô Õ Ö\n";
  testContent += "o variants: ò ó ô õ ö\n";
  testContent += "U variants: Ù Ú Û Ü\n";
  testContent += "u variants: ù ú û ü\n\n";

  // Special characters
  testContent += "Special: Ñ ñ Ç ç\n";
  testContent += "Nordic: Æ æ Ø ø Å å\n";
  testContent += "German: ß Ü ü Ö ö Ä ä\n";
  testContent += "French: É é È è Ê ê\n\n";

  // Punctuation variants
  testContent += "Quotes: \"double\" and 'single' quotes\n";
  testContent += "Dashes: en–dash em—dash\n";
  testContent += "Apostrophes: don't won't\n\n";

  // Real-world examples
  testContent += "Examples:\n";
  testContent += "* Za'atar (Arabic spice)\n";
  testContent += "* Café au lait\n";
  testContent += "* Naïve approach\n";
  testContent += "* Piñata party\n";
  testContent += "* Müller family\n";
  testContent += "* Björk concert\n";
  testContent += "* Señorita María\n";
  testContent += "* Crème brûlée\n";
  testContent += "* Jalapeño peppers\n";
  testContent += "* São Paulo\n";

  printWithHeader("CHARACTER TEST", testContent);

  Serial.println("Character test printed successfully");
}

// === MQTT Functions ===
void setupMQTT()
{
  Serial.println("Setting up MQTT...");

  // Configure TLS for anonymous/insecure connection (no certificate verification)
  wifiSecureClient.setInsecure(); // This allows TLS without certificate verification

  mqttClient.setServer(mqttServer, mqttPort);
  mqttClient.setCallback(mqttCallback);

  Serial.println("MQTT server configured: " + String(mqttServer) + ":" + String(mqttPort));
  Serial.println("MQTT inbox topic: " + String(localPrinter[1]));
  Serial.println("TLS mode: Insecure (no certificate verification)");

  // Initial connection attempt
  connectToMQTT();
}

void connectToMQTT()
{
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("WiFi not connected, skipping MQTT connection");
    return;
  }

  String clientId = "ScribePrinter-" + String(random(0xffff), HEX);

  Serial.print("Attempting MQTT connection as client: ");
  Serial.println(clientId);

  bool connected = false;

  // Try connection with or without credentials
  if (strlen(mqttUsername) > 0 && strlen(mqttPassword) > 0)
  {
    connected = mqttClient.connect(clientId.c_str(), mqttUsername, mqttPassword);
  }
  else
  {
    connected = mqttClient.connect(clientId.c_str());
  }

  if (connected)
  {
    Serial.println("MQTT connected successfully!");

    // Subscribe to the inbox topic
    if (mqttClient.subscribe(localPrinter[1]))
    {
      Serial.println("Subscribed to topic: " + String(localPrinter[1]));
    }
    else
    {
      Serial.println("Failed to subscribe to topic: " + String(localPrinter[1]));
    }
  }
  else
  {
    Serial.print("MQTT connection failed, state: ");
    Serial.println(mqttClient.state());
    Serial.println("Will retry in " + String(mqttReconnectInterval / 1000) + " seconds");
  }
}

void mqttCallback(char *topic, byte *payload, unsigned int length)
{
  Serial.println("MQTT message received on topic: " + String(topic));

  // Convert payload to string
  String message = "";
  for (unsigned int i = 0; i < length; i++)
  {
    message += (char)payload[i];
  }

  Serial.println("MQTT payload: " + message);

  // Handle the MQTT message
  handleMQTTMessage(message);
}

void handleMQTTMessage(String message)
{
  // Parse JSON message
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, message);

  if (error)
  {
    Serial.println("Failed to parse MQTT JSON: " + String(error.c_str()));
    Serial.println("Raw message: " + message);
    return;
  }

  // Extract message from JSON
  if (doc.containsKey("message"))
  {
    String printMessage = doc["message"].as<String>();
    String timestamp = getFormattedDateTime();

    Serial.println("Printing MQTT message: " + printMessage);

    // Print immediately using the existing printWithHeader function
    printWithHeader(timestamp, printMessage);

    Serial.println("MQTT message printed successfully");
  }
  else
  {
    Serial.println("MQTT JSON missing 'message' field");
    Serial.println("Expected format: {\"message\": \"Your message here\"}");
  }
}
