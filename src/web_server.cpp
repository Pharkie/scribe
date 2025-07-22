#include "web_server.h"
#include "web_app.h"
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

void setupWebServerRoutes(int maxChars)
{
    // Store the maxChars value for use in handlers
    localMaxReceiptChars = maxChars;

    // Serve the main page
    server.on("/", HTTP_GET, handleRoot);

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
    String html = getWebAppHTML(localMaxReceiptChars);
    server.send(200, "text/html", html);
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
    // Initialize LittleFS if not already done
    if (!LittleFS.begin())
    {
        server.send(500, "text/plain", "Failed to mount file system");
        return;
    }

    // Read the riddles.json file
    File file = LittleFS.open("/riddles.json", "r");
    if (!file)
    {
        server.send(500, "text/plain", "Failed to open riddles file");
        return;
    }

    size_t fileSize = file.size();
    if (fileSize == 0)
    {
        file.close();
        server.send(500, "text/plain", "Riddles file is empty");
        return;
    }

    // Memory-efficient approach for large (135kb) JSON file: seek
    // to random position and find a riddle
    size_t maxPos = fileSize > 2048 ? fileSize - 2048 : 0;
    size_t randomPos = random(maxPos);

    file.seek(randomPos);

    // Find the next complete riddle object
    String buffer = "";
    String riddle = "";
    String answer = "";
    bool foundRiddle = false;
    bool foundAnswer = false;

    // Read character by character to find a complete riddle
    while (file.available() && (!foundRiddle || !foundAnswer))
    {
        char c = file.read();
        buffer += c;

        // Look for riddle field
        if (!foundRiddle && buffer.indexOf("\"riddle\":") != -1)
        {
            int startQuote = buffer.indexOf("\"riddle\":") + 9;
            startQuote = buffer.indexOf("\"", startQuote) + 1; // Find opening quote
            int endQuote = buffer.indexOf("\"", startQuote);

            if (endQuote != -1)
            {
                riddle = buffer.substring(startQuote, endQuote);
                foundRiddle = true;
            }
        }

        // Look for answer field after we found riddle
        if (foundRiddle && !foundAnswer && buffer.indexOf("\"answer\":") != -1)
        {
            int startQuote = buffer.indexOf("\"answer\":") + 9;
            startQuote = buffer.indexOf("\"", startQuote) + 1; // Find opening quote
            int endQuote = buffer.indexOf("\"", startQuote);

            if (endQuote != -1)
            {
                answer = buffer.substring(startQuote, endQuote);
                foundAnswer = true;
            }
        }

        // Keep buffer manageable to prevent memory issues
        if (buffer.length() > 1000)
        {
            buffer = buffer.substring(500); // Keep last 500 chars
        }
    }

    file.close();

    // Fallback if we couldn't find a complete riddle
    if (!foundRiddle || riddle.length() == 0)
    {
        riddle = "What gets wetter the more it dries?";
        answer = "Greta";
    }

    // Format the riddle for printing
    String riddleText = "RIDDLE:\n\n" + riddle + "\n\n";
    // riddleText += "ANSWER:\n\n" + answer;

    // Print the riddle
    String timestamp = getFormattedDateTime();
    printWithHeader("RIDDLE " + timestamp, riddleText);

    server.send(200, "text/plain", "Riddle printed successfully!");
}
