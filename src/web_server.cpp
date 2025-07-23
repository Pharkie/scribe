#include "web_server.h"
#include "config.h"
#include <WiFi.h>
#include <ESPmDNS.h>
#include <LittleFS.h>
#include <ArduinoJson.h>

// External variable declarations
extern WebServer server;

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
    json += "}";

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
