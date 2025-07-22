#include "web_server.h"
#include "web_app.h"
#include <WiFi.h>
#include <ESPmDNS.h>

// External function declarations
extern String getFormattedDateTime();
extern String formatCustomDate(String customDate);
extern void printCharacterTest();

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
