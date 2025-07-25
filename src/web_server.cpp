#include "web_server.h"
#include "config.h"
#include "logging.h"
#include <WiFi.h>
#include <ESPmDNS.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>

// External variable declarations
extern WebServer server;
extern PubSubClient mqttClient;

// External function declarations
extern String getFormattedDateTime();
extern String formatCustomDate(String customDate);
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
    server.on("/favicon.ico", HTTP_GET, handleFavicon);

    // Configuration endpoint for JavaScript
    server.on("/config", HTTP_GET, handleConfig);

    // Handle form submission
    server.on("/print-local", HTTP_POST, handleSubmit);

    // Also handle submission via URL
    server.on("/print-local", HTTP_GET, handleSubmit);

    // Test print endpoint (supports both local print and remote content modes)
    server.on("/test-print", HTTP_POST, handlePrintTest);

    // Riddle endpoint (supports both local print and remote content modes)
    server.on("/riddle", HTTP_POST, handleRiddle);

    // Joke endpoint (supports both local print and remote content modes)
    server.on("/joke", HTTP_POST, handleJoke);

    // Quote endpoint (supports both local print and remote content modes)
    server.on("/quote", HTTP_POST, handleQuote);

    // Quiz endpoint (supports both local print and remote content modes)
    server.on("/quiz", HTTP_POST, handleQuiz);

    // System status endpoint
    server.on("/status", HTTP_GET, handleStatus);

    // MQTT send endpoint for remote printing
    server.on("/mqtt-send", HTTP_POST, handleMQTTSend);

    // Handle 404
    server.onNotFound(handleNotFound);
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

void handleFavicon()
{
    serveFileFromLittleFS("/favicon.ico", "image/x-icon");
}

void handleConfig()
{
    DynamicJsonDocument doc(1024);

    // Set max receipt chars
    doc["maxReceiptChars"] = localMaxReceiptChars;

    // Create remote printers array
    JsonArray printers = doc.createNestedArray("remotePrinters");

    // Add local printer first (for self-sending)
    JsonObject localPrinter = printers.createNestedObject();
    localPrinter["name"] = String(::localPrinter[0]);
    localPrinter["topic"] = String(::localPrinter[1]);

    // Add other printers from config
    for (int i = 0; i < numOtherPrinters; i++)
    {
        JsonObject printer = printers.createNestedObject();
        printer["name"] = String(otherPrinters[i][0]);
        printer["topic"] = String(otherPrinters[i][1]);
    }

    // Serialize and send
    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
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
            LOG_VERBOSE("WEB", "Using custom date: %s", customDate.c_str());
        }
        else
        {
            currentReceipt.timestamp = getFormattedDateTime();
            LOG_VERBOSE("WEB", "Using current date");
        }

        currentReceipt.hasData = true;

        LOG_VERBOSE("WEB", "Scribing message: %s", currentReceipt.message.c_str());

        server.send(200, "text/plain", "Receipt received and sent to printer");
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

    DynamicJsonDocument doc(1024);

    // Network information
    doc["wifi_connected"] = (WiFi.status() == WL_CONNECTED);
    doc["ip_address"] = WiFi.localIP().toString();
    doc["mdns_hostname"] = String(mdnsHostname);
    doc["wifi_ssid"] = WiFi.SSID();

    // MQTT information
    doc["mqtt_connected"] = mqttClient.connected();
    doc["mqtt_server"] = String(mqttServer);
    doc["local_topic"] = String(localPrinter[1]);

    // System information
    doc["uptime"] = millis();
    doc["free_heap"] = ESP.getFreeHeap();
    doc["total_heap"] = ESP.getHeapSize();
    doc["chip_model"] = ESP.getChipModel();
    doc["cpu_freq"] = ESP.getCpuFreqMHz();

    // Flash storage information
    doc["flash_total"] = totalBytes;
    doc["flash_used"] = usedBytes;

    // Serialize and send
    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
}

String loadPrintTestContent()
{
    if (!LittleFS.begin())
    {
        return "Failed to mount LittleFS for print test";
    }

    File file = LittleFS.open("/print-test.txt", "r");
    if (!file)
    {
        return "ASCII: Hello World 123!@#\n\nFailed to load print test file";
    }

    String content = file.readString();
    file.close();
    return content;
}

/**
 * @brief Helper function to make HTTPS API calls with JSON response
 * @param url The API endpoint URL
 * @param userAgent User agent string for the request
 * @param timeoutMs Request timeout in milliseconds
 * @return String containing the API response, or empty string on failure
 */
String fetchFromAPI(const String &url, const String &userAgent, int timeoutMs)
{
    if (WiFi.status() != WL_CONNECTED)
    {
        LOG_WARNING("WEB", "API fetch failed - WiFi not connected");
        return "";
    }

    LOG_VERBOSE("WEB", "Fetching from API: %s", url.c_str());

    WiFiClientSecure client;
    client.setInsecure(); // Skip SSL certificate verification for simplicity
    HTTPClient http;

    // Explicitly specify HTTPS connection
    if (!http.begin(client, url))
    {
        LOG_ERROR("WEB", "Failed to begin HTTPS connection");
        return "";
    }

    http.addHeader("Accept", "application/json");
    http.addHeader("User-Agent", userAgent);
    http.setTimeout(timeoutMs);

    int httpResponseCode = http.GET();
    String response = "";

    if (httpResponseCode == 200)
    {
        response = http.getString();
    }
    else if (httpResponseCode == 301 || httpResponseCode == 302)
    {
        // Log redirect information for debugging
        String location = http.getLocation();
        LOG_WARNING("WEB", "Unexpected redirect to: %s", location.c_str());
        LOG_WARNING("WEB", "Original URL: %s", url.c_str());
    }
    else
    {
        LOG_WARNING("WEB", "API request failed with code: %d", httpResponseCode);
    }

    http.end();
    return response;
}

/**
 * @brief Simple template replacement function
 * @param templateStr The template string with {{PLACEHOLDER}} markers
 * @param placeholder The placeholder name (without braces)
 * @param value The value to replace the placeholder with
 * @return String with placeholder replaced
 */
String replaceTemplate(String templateStr, const String &placeholder, const String &value)
{
    String marker = "{{" + placeholder + "}}";
    templateStr.replace(marker, value);
    return templateStr;
}

void handlePrintTest()
{
    // Load print test content from file
    String testContent = loadPrintTestContent();
    String fullContent = "PRINT TEST\n\n" + testContent + "\n\n";

    // Return the content as plain text
    server.send(200, "text/plain", fullContent);
}

void handleNotFound()
{
    String uri = server.uri();
    String method = (server.method() == HTTP_GET) ? "GET" : "POST";

    // Build comprehensive 404 error message for logging
    String errorDetails = "=== 404 Error === | Method: " + method + " | URI: " + uri + " | Args: " + String(server.args());
    for (int i = 0; i < server.args(); i++)
    {
        errorDetails += " | " + server.argName(i) + ": " + server.arg(i);
    }
    errorDetails += " | ================";

    LOG_WARNING("WEB", "%s", errorDetails.c_str());

    // Load 404 template from LittleFS
    if (!LittleFS.begin())
    {
        server.send(404, "text/plain", "404 - Page not found (template error)");
        return;
    }

    File templateFile = LittleFS.open("/404.html", "r");
    if (!templateFile)
    {
        // Fallback if template file doesn't exist
        server.send(404, "text/plain", "404 - Page not found: " + method + " " + uri);
        return;
    }

    String template404 = templateFile.readString();
    templateFile.close();

    // Replace template placeholders with dynamic content
    template404 = replaceTemplate(template404, "METHOD", method);
    template404 = replaceTemplate(template404, "URI", uri);
    template404 = replaceTemplate(template404, "HOSTNAME", String(mdnsHostname));

    server.send(404, "text/html; charset=UTF-8", template404);
}

String reverseString(const String &str)
{
    String reversed = "";
    for (int i = str.length() - 1; i >= 0; i--)
    {
        reversed += str[i];
    }
    return reversed;
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
    String riddleAnswer = "A towel";                           // fallback answer

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

                // Also extract the answer if available
                if (doc.containsKey("answer"))
                {
                    String extractedAnswer = doc["answer"].as<String>();
                    if (extractedAnswer.length() > 0)
                    {
                        riddleAnswer = extractedAnswer;
                    }
                }
            }
            break;
        }
        current++;
    }

    file.close();

    String fullContent = "RIDDLE #" + String(target + 1) + "\n\n" + riddleText + "\n\n\n\n\n\n";
    fullContent += "Answer: " + reverseString(riddleAnswer);

    // Return the content as plain text
    server.send(200, "text/plain", fullContent);
}

void handleJoke()
{
    // Start with fallback joke
    String dadJoke = "Why don't scientists trust atoms? Because they make up everything!";

    // Try to fetch from API
    String response = fetchFromAPI("https://icanhazdadjoke.com/", apiUserAgent);

    if (response.length() > 0)
    {
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

    String fullContent = "JOKE\n\n" + dadJoke;

    // Return the content as plain text
    server.send(200, "text/plain", fullContent);
}

void handleQuote()
{
    // Start with fallback quote
    String quote = "\"Your mind is for having ideas, not holding them.\"\n– David Allen";

    // Try to fetch from API
    String response = fetchFromAPI("https://zenquotes.io/api/random", apiUserAgent);

    if (response.length() > 0)
    {
        // Parse JSON response (expecting array format)
        DynamicJsonDocument doc(2048);
        DeserializationError error = deserializeJson(doc, response);

        if (!error && doc.is<JsonArray>() && doc.size() > 0)
        {
            JsonObject quoteObj = doc[0];
            if (quoteObj.containsKey("q") && quoteObj.containsKey("a"))
            {
                String quoteText = quoteObj["q"].as<String>();
                String author = quoteObj["a"].as<String>();

                quoteText.trim();
                author.trim();

                if (quoteText.length() > 5 && author.length() > 0) // Ensure valid quote
                {
                    quote = "\"" + quoteText + "\"\n– " + author;
                }
            }
        }
    }

    String fullContent = "QUOTE\n\n" + quote;

    // Return the content as plain text
    server.send(200, "text/plain", fullContent);
}

void handleQuiz()
{
    // Start with fallback quiz question
    String question = "What is the largest planet in our solar system?";
    String correctAnswer = "Jupiter";
    String answers[4] = {"Mars", "Jupiter", "Saturn", "Earth"};

    // Try to fetch from API
    String response = fetchFromAPI("https://the-trivia-api.com/api/questions?categories=general_knowledge&difficulty=medium&limit=1", apiUserAgent);

    if (response.length() > 0)
    {
        // Parse JSON response (expecting array format)
        DynamicJsonDocument doc(2048);
        DeserializationError error = deserializeJson(doc, response);

        if (!error && doc.is<JsonArray>() && doc.size() > 0)
        {
            JsonObject quizObj = doc[0];
            if (quizObj.containsKey("question") && quizObj.containsKey("correctAnswer") && quizObj.containsKey("incorrectAnswers"))
            {
                String apiQuestion = quizObj["question"].as<String>();
                String apiCorrectAnswer = quizObj["correctAnswer"].as<String>();
                JsonArray incorrectAnswers = quizObj["incorrectAnswers"];

                apiQuestion.trim();
                apiCorrectAnswer.trim();

                if (apiQuestion.length() > 5 && apiCorrectAnswer.length() > 0 && incorrectAnswers.size() >= 3)
                {
                    question = apiQuestion;
                    correctAnswer = apiCorrectAnswer;

                    // Create answer array with correct answer in random position
                    int correctPosition = random(0, 4);
                    answers[correctPosition] = correctAnswer;

                    // Fill other positions with incorrect answers
                    int incorrectIndex = 0;
                    for (int i = 0; i < 4; i++)
                    {
                        if (i != correctPosition && incorrectIndex < incorrectAnswers.size())
                        {
                            String incorrectAnswer = incorrectAnswers[incorrectIndex].as<String>();
                            incorrectAnswer.trim();
                            answers[i] = incorrectAnswer;
                            incorrectIndex++;
                        }
                    }
                }
            }
        }
    }

    // Format the quiz content
    String fullContent = "QUIZ\n\n";
    fullContent += "Question:\n";
    fullContent += question + "\n\n";

    fullContent += "[ ] " + answers[0] + "\n";
    fullContent += "[ ] " + answers[1] + "\n";
    fullContent += "[ ] " + answers[2] + "\n";
    fullContent += "[ ] " + answers[3] + "\n\n\n\n\n\n";

    fullContent += "Correct answer: " + reverseString(correctAnswer);

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
        LOG_VERBOSE("WEB", "MQTT message sent to topic: %s", topic.c_str());
        server.send(200, "text/plain", "Message sent successfully!");
    }
    else
    {
        LOG_ERROR("WEB", "Failed to send MQTT message to topic: %s", topic.c_str());
        server.send(500, "text/plain", "Failed to send MQTT message");
    }
}
