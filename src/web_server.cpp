#include "web_server.h"
#include "config.h"
#include <WiFi.h>
#include <ESPmDNS.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>

// External variable declarations
extern WebServer server;
extern PubSubClient mqttClient;

// External function declarations
extern String getFormattedDateTime();
extern String formatCustomDate(String customDate);
extern void printCharacterTest();
extern void printWithHeader(String headerText, String bodyText);

// Storage for form data
Receipt currentReceipt = {"", "", false};

// Static variable to store maxReceiptChars value
static int localMaxReceiptChars = 1000;

/**
 * @brief Helper function to serve files from LittleFS filesystem
 * @param path The file path to serve (e.g., "/index.html")
 * @param contentType The MIME content type (e.g., "text/html")
 * @return true if file was served successfully, false otherwise
 */
bool serveFileFromLittleFS(const String &path, const String &contentType)
{
    if (!LittleFS.begin())
    {
        server.send(500, "text/plain", "Failed to mount file system");
        return false;
    }

    File file = LittleFS.open(path, "r");
    if (!file)
    {
        server.send(404, "text/plain", path + " not found");
        return false;
    }

    String content = file.readString();
    file.close();

    server.send(200, contentType, content);
    return true;
}

void setupWebServerRoutes(int maxChars)
{
    // Store the maxChars value for use in handlers
    localMaxReceiptChars = maxChars;

    // Serve the main page from filesystem
    server.on("/", HTTP_GET, handleRoot);

    // Serve static files
    server.on("/styles.css", HTTP_GET, handleCSS);
    server.on("/app.js", HTTP_GET, handleJS);

    // Configuration endpoint for JavaScript
    server.on("/config", HTTP_GET, handleConfig);

    // Handle form submission
    server.on("/submit", HTTP_POST, handleSubmit);

    // Also handle submission via URL
    server.on("/submit", HTTP_GET, handleSubmit);

    // Character test endpoint
    server.on("/test", HTTP_GET, handleCharacterTest);

    // Riddle endpoint
    server.on("/riddle", HTTP_POST, handleRiddle);

    // System status endpoint
    server.on("/status", HTTP_GET, handleStatus);

    // MQTT send endpoint for remote printing
    server.on("/mqtt-send", HTTP_POST, handleMQTTSend);

    // Handle 404
    server.onNotFound(handleNotFound);

    Serial.println("Web server routes configured");
}

void handleRoot()
{
    serveFileFromLittleFS("/index.html", "text/html");
}

void handleCSS()
{
    serveFileFromLittleFS("/styles.css", "text/css");
}

void handleJS()
{
    serveFileFromLittleFS("/app.js", "application/javascript");
}

void handleConfig()
{
    String json = "{";
    json += "\"maxReceiptChars\":" + String(localMaxReceiptChars);
    json += ",\"remotePrinters\":[";

    // Add local printer first (for self-sending)
    json += "{";
    json += "\"name\":\"" + String(localPrinter[0]) + "\",";
    json += "\"topic\":\"" + String(localPrinter[1]) + "\"";
    json += "}";

    // Add other printers from config
    for (int i = 0; i < numOtherPrinters; i++)
    {
        json += ",{";
        json += "\"name\":\"" + String(otherPrinters[i][0]) + "\",";
        json += "\"topic\":\"" + String(otherPrinters[i][1]) + "\"";
        json += "}";
    }

    json += "]}";

    server.send(200, "application/json", json);
}

void handleSubmit()
{
    if (server.hasArg("message"))
    {
        currentReceipt.message = server.arg("message");

        // Check if a custom date was provided
        if (server.hasArg("date"))
        {
            String customDate = server.arg("date");
            currentReceipt.timestamp = formatCustomDate(customDate);
            Serial.println("Using custom date: " + customDate);
        }
        else
        {
            currentReceipt.timestamp = getFormattedDateTime();
            Serial.println("Using current date");
        }

        currentReceipt.hasData = true;

        Serial.println("=== New Receipt Received ===");
        Serial.println("Message: " + currentReceipt.message);
        Serial.println("Time: " + currentReceipt.timestamp);
        Serial.println("============================");

        server.send(200, "text/plain", "Receipt received and will be printed!");
    }
    else
    {
        server.send(400, "text/plain", "Missing message parameter");
    }
}

void handleStatus()
{
    String json = "{";
    json += "\"wifi_connected\":" + String(WiFi.status() == WL_CONNECTED ? "true" : "false") + ",";
    json += "\"ip_address\":\"" + WiFi.localIP().toString() + "\",";
    json += "\"mdns_hostname\":\"" + String(mdnsHostname) + "\",";
    json += "\"uptime\":" + String(millis()) + ",";
    json += "\"free_heap\":" + String(ESP.getFreeHeap());
    json += "}";

    server.send(200, "application/json", json);
}

void handleCharacterTest()
{
    printCharacterTest();
    server.send(200, "text/plain", "Character test printed to thermal printer!");
}

void handleNotFound()
{
    String uri = server.uri();
    String method = (server.method() == HTTP_GET) ? "GET" : "POST";

    Serial.println("=== 404 Error ===");
    Serial.println("Method: " + method);
    Serial.println("URI: " + uri);
    Serial.println("Args: " + String(server.args()));
    for (int i = 0; i < server.args(); i++)
    {
        Serial.println("  " + server.argName(i) + ": " + server.arg(i));
    }
    Serial.println("================");

    server.send(404, "text/plain", "Page not found: " + method + " " + uri);
}

void handleRiddle()
{
    // Ensure LittleFS is mounted
    if (!LittleFS.begin())
    {
        server.send(500, "text/plain", "Failed to mount LittleFS");
        return;
    }

    // Open the riddles.ndjson file
    File file = LittleFS.open("/riddles.ndjson", "r");
    if (!file)
    {
        server.send(500, "text/plain", "Failed to open riddles file");
        return;
    }

    // Pick a random riddle
    int target = random(0, totalRiddles);
    int current = 0;
    String riddleText = "What gets wetter the more it dries?"; // fallback

    while (file.available() && current <= target)
    {
        String line = file.readStringUntil('\n');
        line.trim();

        if (current == target)
        {
            DynamicJsonDocument doc(1024);
            DeserializationError error = deserializeJson(doc, line);

            if (!error && doc.containsKey("riddle"))
            {
                String extracted = doc["riddle"].as<String>();
                if (extracted.length() > 0)
                {
                    riddleText = extracted;
                }
            }
            break;
        }
        current++;
    }

    file.close();

    // Print the riddle
    printWithHeader("RIDDLE #" + String(target + 1), riddleText);
    server.send(200, "text/plain", "Riddle printed successfully!");
}

void handleMQTTSend()
{
    if (!mqttClient.connected())
    {
        server.send(503, "text/plain", "MQTT client not connected");
        return;
    }

    // Parse JSON body
    String body = server.arg("plain");
    if (body.length() == 0)
    {
        server.send(400, "text/plain", "No JSON body provided");
        return;
    }

    // Parse the JSON
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, body);

    if (error)
    {
        server.send(400, "text/plain", "Invalid JSON: " + String(error.c_str()));
        return;
    }

    // Extract topic and message
    if (!doc.containsKey("topic") || !doc.containsKey("message"))
    {
        server.send(400, "text/plain", "JSON must contain 'topic' and 'message' fields");
        return;
    }

    String topic = doc["topic"].as<String>();
    String message = doc["message"].as<String>();

    // Create the MQTT payload as JSON
    DynamicJsonDocument payloadDoc(512);
    payloadDoc["message"] = message;

    String payload;
    serializeJson(payloadDoc, payload);

    // Publish to MQTT
    if (mqttClient.publish(topic.c_str(), payload.c_str()))
    {
        Serial.println("MQTT message sent to topic: " + topic);
        Serial.println("Payload: " + payload);
        server.send(200, "text/plain", "Message sent successfully!");
    }
    else
    {
        Serial.println("Failed to send MQTT message to topic: " + topic);
        server.send(500, "text/plain", "Failed to send MQTT message");
    }
}
