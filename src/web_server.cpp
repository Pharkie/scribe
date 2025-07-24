#include "web_server.h"
#include "config.h"
#include <WiFi.h>
#include <ESPmDNS.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <HTTPClient.h>

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
    server.on("/print-local", HTTP_POST, handleSubmit);

    // Also handle submission via URL
    server.on("/print-local", HTTP_GET, handleSubmit);

    // Character test endpoint (supports both local print and remote content modes)
    server.on("/character-test", HTTP_POST, handleCharacterTest);

    // Riddle endpoint (supports both local print and remote content modes)
    server.on("/riddle", HTTP_POST, handleRiddle);

    // Dad joke endpoint (supports both local print and remote content modes)
    server.on("/dadjoke", HTTP_POST, handleDadJoke);

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
    // Get flash storage information
    size_t totalBytes = 0;
    size_t usedBytes = 0;
    if (LittleFS.begin())
    {
        totalBytes = LittleFS.totalBytes();
        usedBytes = LittleFS.usedBytes();
    }

    String json = "{";
    json += "\"wifi_connected\":" + String(WiFi.status() == WL_CONNECTED ? "true" : "false") + ",";
    json += "\"ip_address\":\"" + WiFi.localIP().toString() + "\",";
    json += "\"mdns_hostname\":\"" + String(mdnsHostname) + "\",";
    json += "\"uptime\":" + String(millis()) + ",";
    json += "\"free_heap\":" + String(ESP.getFreeHeap()) + ",";
    json += "\"mqtt_connected\":" + String(mqttClient.connected() ? "true" : "false") + ",";
    json += "\"mqtt_server\":\"" + String(mqttServer) + "\",";
    json += "\"wifi_ssid\":\"" + String(WiFi.SSID()) + "\",";
    json += "\"local_topic\":\"" + String(localPrinter[1]) + "\",";
    json += "\"total_heap\":" + String(ESP.getHeapSize()) + ",";
    json += "\"chip_model\":\"" + String(ESP.getChipModel()) + "\",";
    json += "\"cpu_freq\":" + String(ESP.getCpuFreqMHz()) + ",";
    json += "\"flash_total\":" + String(totalBytes) + ",";
    json += "\"flash_used\":" + String(usedBytes);
    json += "}";

    server.send(200, "application/json", json);
}

String generateCharacterTestContent()
{
    String testContent = "";

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

    return testContent;
}

void handleCharacterTest()
{
    // Generate character test content
    String testContent = generateCharacterTestContent();
    String fullContent = "CHARACTER TEST\n\n" + testContent;

    // Return the content as plain text
    server.send(200, "text/plain", fullContent);
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

    String fullContent = "RIDDLE #" + String(target + 1) + "\n\n" + riddleText;

    // Return the content as plain text
    server.send(200, "text/plain", fullContent);
}

void handleDadJoke()
{
    // Start with fallback joke
    String dadJoke = "Why don't scientists trust atoms? Because they make up everything!";

    // Try to fetch from API if WiFi is connected
    if (WiFi.status() == WL_CONNECTED)
    {
        WiFiClientSecure client;
        client.setInsecure(); // Skip SSL certificate verification for simplicity
        HTTPClient http;

        http.begin(client, "https://icanhazdadjoke.com/");
        http.addHeader("Accept", "application/json");
        http.addHeader("User-Agent", "Scribe Thermal Printer (https://github.com/Pharkie/scribe)");
        http.setTimeout(5000); // 5 second timeout

        int httpResponseCode = http.GET();

        if (httpResponseCode == 200)
        {
            String response = http.getString();

            // Parse JSON response
            DynamicJsonDocument doc(1024);
            DeserializationError error = deserializeJson(doc, response);

            if (!error && doc.containsKey("joke"))
            {
                String apiJoke = doc["joke"].as<String>();
                apiJoke.trim();
                if (apiJoke.length() > 10) // Ensure it's a real joke, not empty
                {
                    dadJoke = apiJoke;
                }
            }
        }

        http.end();
    }

    String fullContent = "DAD JOKE\n\n" + dadJoke;

    // Return the content as plain text
    server.send(200, "text/plain", fullContent);
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
    DynamicJsonDocument doc(4096); // Increased to match MQTT buffer size
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

    // Create the MQTT payload as JSON with proper escaping
    DynamicJsonDocument payloadDoc(4096); // Increased to match MQTT buffer size
    payloadDoc["message"] = message;      // ArduinoJson handles escaping automatically

    String payload;
    serializeJson(payloadDoc, payload);

    // Publish to MQTT
    if (mqttClient.publish(topic.c_str(), payload.c_str()))
    {
        Serial.println("MQTT message sent to topic: " + topic);
        server.send(200, "text/plain", "Message sent successfully!");
    }
    else
    {
        Serial.println("Failed to send MQTT message to topic: " + topic);
        server.send(500, "text/plain", "Failed to send MQTT message");
    }
}
