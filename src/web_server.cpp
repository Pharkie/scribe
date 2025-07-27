#include "web_server.h"
#include "config.h"
#include "config_utils.h"
#include "logging.h"
#include "hardware_buttons.h"
#include "time_utils.h"
#include "printer.h"
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
static int localMaxReceiptChars = maxReceiptChars;

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * @brief URL decode a string (handle %XX encoding)
 * @param str String to decode
 * @return Decoded string
 */
String urlDecode(String str)
{
    String decoded = "";
    char temp[] = "00";
    unsigned int len = str.length();

    for (unsigned int i = 0; i < len; i++)
    {
        char decodedChar;
        if (str[i] == '%')
        {
            if (i + 2 < len)
            {
                temp[0] = str[i + 1];
                temp[1] = str[i + 2];
                decodedChar = (char)strtol(temp, NULL, 16);
                decoded += decodedChar;
                i += 2;
            }
            else
            {
                decoded += str[i]; // Invalid encoding, keep as-is
            }
        }
        else
        {
            decoded += str[i];
        }
    }
    return decoded;
}

// ========================================
// RATE LIMITING AND SECURITY
// ========================================

// Simple rate limiting state
static unsigned long lastRequestTime = 0;
static unsigned long requestCount = 0;
static unsigned long rateLimitWindow = 0;

/**
 * @brief Check if request should be rate limited
 * @return true if request should be blocked, false if allowed
 */
bool isRateLimited()
{
    unsigned long currentTime = millis();

    // Basic timing rate limit (prevent rapid-fire requests)
    if (currentTime - lastRequestTime < minRequestInterval)
    {
        return true;
    }

    // Reset rate limit window every minute
    if (currentTime - rateLimitWindow > rateLimitWindowMs)
    {
        rateLimitWindow = currentTime;
        requestCount = 0;
    }

    // Check requests per minute
    requestCount++;
    if (requestCount > maxRequestsPerMinute)
    {
        LOG_WARNING("WEB", "Rate limit exceeded: %lu requests in current window", requestCount);
        return true;
    }

    lastRequestTime = currentTime;
    return false;
}

// ========================================
// INPUT VALIDATION UTILITIES
// ========================================

/**
 * @brief Validate message content for printing
 * @param message The message to validate
 * @param maxLength Maximum allowed length
 * @return ValidationResult with validation status and error message
 */
ValidationResult validateMessage(const String &message, int maxLength = -1)
{
    if (maxLength == -1)
    {
        maxLength = localMaxReceiptChars;
    }

    // Check if message is empty
    if (message.length() == 0)
    {
        return ValidationResult(false, "Message cannot be empty");
    }

    // Check message length
    if (message.length() > maxLength)
    {
        return ValidationResult(false, "Message too long. Maximum " + String(maxLength) + " characters allowed, got " + String(message.length()));
    }

    // Check for null bytes WITHIN the message content (not the terminator)
    // We need to manually check each character instead of using indexOf
    for (unsigned int i = 0; i < message.length(); i++)
    {
        if (message.charAt(i) == '\0')
        {
            LOG_WARNING("WEB", "Found null byte at position %d in message content", i);
            return ValidationResult(false, "Message contains null bytes which are not allowed");
        }
    }

    // Check for excessive control characters (except common ones like \n, \r, \t)
    int controlCharCount = 0;
    for (unsigned int i = 0; i < message.length(); i++)
    {
        char c = message.charAt(i);
        if (c < 32 && c != '\n' && c != '\r' && c != '\t')
        {
            controlCharCount++;
        }
    }

    // Allow some control characters but not too many (might indicate binary data)
    if (controlCharCount > message.length() / maxControlCharPercent)
    {
        return ValidationResult(false, "Message contains too many control characters");
    }

    // Check for potential script injection attempts (basic XSS protection)
    String messageLower = message;
    messageLower.toLowerCase();
    if (messageLower.indexOf("<script") != -1 ||
        messageLower.indexOf("javascript:") != -1 ||
        messageLower.indexOf("onload=") != -1 ||
        messageLower.indexOf("onerror=") != -1)
    {
        return ValidationResult(false, "Message contains potentially malicious content");
    }

    // Check for excessively long lines (might cause formatting issues)
    int maxLineLengthFound = 0;
    int currentLineLength = 0;
    for (unsigned int i = 0; i < message.length(); i++)
    {
        if (message.charAt(i) == '\n' || message.charAt(i) == '\r')
        {
            if (currentLineLength > maxLineLengthFound)
            {
                maxLineLengthFound = currentLineLength;
            }
            currentLineLength = 0;
        }
        else
        {
            currentLineLength++;
        }
    }
    if (currentLineLength > maxLineLengthFound)
    {
        maxLineLengthFound = currentLineLength;
    }

    if (maxLineLengthFound > maxLineLength)
    { // Reasonable limit for thermal printer
        return ValidationResult(false, "Message contains lines that are too long (max " + String(maxLineLength) + " chars per line)");
    }

    return ValidationResult(true);
}

/**
 * @brief Validate JSON payload
 * @param jsonString The JSON string to validate
 * @param requiredFields Array of required field names
 * @param fieldCount Number of required fields
 * @return ValidationResult with validation status and error message
 */
ValidationResult validateJSON(const String &jsonString, const char *requiredFields[], int fieldCount)
{
    if (jsonString.length() == 0)
    {
        return ValidationResult(false, "JSON payload is empty");
    }

    if (jsonString.length() > maxJsonPayloadSize)
    { // Reasonable limit for our use case
        return ValidationResult(false, "JSON payload too large (max " + String(maxJsonPayloadSize / 1024) + "KB)");
    }

    // Parse JSON
    DynamicJsonDocument doc(maxJsonPayloadSize / 2); // Use half of max payload size for document buffer
    DeserializationError error = deserializeJson(doc, jsonString);

    if (error)
    {
        return ValidationResult(false, "Invalid JSON format: " + String(error.c_str()));
    }

    // Check required fields
    for (int i = 0; i < fieldCount; i++)
    {
        if (!doc.containsKey(requiredFields[i]))
        {
            return ValidationResult(false, "Missing required field: " + String(requiredFields[i]));
        }
    }

    return ValidationResult(true);
}

/**
 * @brief Validate MQTT topic format
 * @param topic The topic to validate
 * @return ValidationResult with validation status and error message
 */
ValidationResult validateMQTTTopic(const String &topic)
{
    if (topic.length() == 0)
    {
        return ValidationResult(false, "MQTT topic cannot be empty");
    }

    if (topic.length() > maxMqttTopicLength)
    { // MQTT topic length limit
        return ValidationResult(false, "MQTT topic too long (max " + String(maxMqttTopicLength) + " characters)");
    }

    // Check for valid MQTT topic characters
    for (unsigned int i = 0; i < topic.length(); i++)
    {
        char c = topic.charAt(i);
        if (c < 32 || c > 126)
        {
            return ValidationResult(false, "MQTT topic contains invalid characters");
        }
    }

    // Check for MQTT wildcards in publish topics (not allowed)
    if (topic.indexOf('+') != -1 || topic.indexOf('#') != -1)
    {
        return ValidationResult(false, "MQTT topic cannot contain wildcards (+, #) for publishing");
    }

    return ValidationResult(true);
}

/**
 * @brief Validate HTTP parameter
 * @param param The parameter value to validate
 * @param paramName The parameter name for error messages
 * @param maxLength Maximum allowed length
 * @param allowEmpty Whether empty values are allowed
 * @return ValidationResult with validation status and error message
 */
ValidationResult validateParameter(const String &param, const String &paramName, int maxLength = maxParameterLength, bool allowEmpty = false)
{
    if (!allowEmpty && param.length() == 0)
    {
        return ValidationResult(false, "Parameter '" + paramName + "' cannot be empty");
    }

    if (param.length() > maxLength)
    {
        return ValidationResult(false, "Parameter '" + paramName + "' too long (max " + String(maxLength) + " characters)");
    }

    return ValidationResult(true);
}

/**
 * @brief Send validation error response
 * @param result The validation result containing the error
 * @param statusCode HTTP status code to send (default 400)
 */
void sendValidationError(const ValidationResult &result, int statusCode = 400)
{
    LOG_WARNING("WEB", "Validation error: %s", result.errorMessage.c_str());
    server.send(statusCode, "text/plain", "Validation Error: " + result.errorMessage);
}

/**
 * @brief Validate optional remote parameter (for MQTT sending)
 * @return ValidationResult with validation status and error message
 */
ValidationResult validateRemoteParameter()
{
    if (server.hasArg("remote"))
    {
        String remote = server.arg("remote");
        ValidationResult paramValidation = validateParameter(remote, "remote", maxRemoteParameterLength, false);
        if (!paramValidation.isValid)
        {
            return paramValidation;
        }
        // Could add additional validation for known printer names here
    }
    return ValidationResult(true);
}

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

    // Test print endpoint - prints locally and returns content
    server.on("/test-print", HTTP_POST, handlePrintTest);

    // Riddle endpoint - prints locally and returns content
    server.on("/riddle", HTTP_POST, handleRiddle);

    // Joke endpoint - prints locally and returns content
    server.on("/joke", HTTP_POST, handleJoke);

    // Quote endpoint - prints locally and returns content
    server.on("/quote", HTTP_POST, handleQuote);

    // Quiz endpoint - prints locally and returns content
    server.on("/quiz", HTTP_POST, handleQuiz);

    // Message endpoint - unified text message handling
    server.on("/message", HTTP_POST, handleMessage);

    // System status endpoint
    server.on("/status", HTTP_GET, handleStatus);

    // Hardware button configuration endpoint
    server.on("/buttons", HTTP_GET, handleButtons);

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
    DynamicJsonDocument doc(jsonDocumentSize);

    // Set max receipt chars
    doc["maxReceiptChars"] = localMaxReceiptChars;

    // Create remote printers array
    JsonArray printers = doc.createNestedArray("remotePrinters");

    // Add local printer first (for self-sending)
    JsonObject localPrinter = printers.createNestedObject();
    localPrinter["name"] = String(getLocalPrinterName());
    localPrinter["topic"] = String(getLocalPrinterTopic());

    // Add other printers from config
    const char *others[maxOtherPrinters][2]; // Max other printers from config
    int numOthers = getOtherPrinters(others, maxOtherPrinters);
    for (int i = 0; i < numOthers; i++)
    {
        JsonObject printer = printers.createNestedObject();
        printer["name"] = String(others[i][0]);
        printer["topic"] = String(others[i][1]);
    }

    // Serialize and send
    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
}

void handleSubmit()
{
    // Check rate limiting first
    if (isRateLimited())
    {
        server.send(429, "text/plain", "Rate limit exceeded. Please wait before sending another request.");
        return;
    }

    // Validate message parameter exists
    if (!server.hasArg("message"))
    {
        sendValidationError(ValidationResult(false, "Missing required parameter 'message'"));
        return;
    }

    String message = server.arg("message");

    // URL decode the message (handles %20 for spaces, etc.)
    message.replace("+", " "); // Handle + as space in URL encoding
    message = urlDecode(message);

    // Debug: Log message details (can be removed after testing)
    LOG_VERBOSE("WEB", "Received message: length=%d, content: '%.50s'", message.length(), message.c_str());

    // Validate message content
    ValidationResult messageValidation = validateMessage(message);
    if (!messageValidation.isValid)
    {
        LOG_WARNING("WEB", "Message validation failed: %s", messageValidation.errorMessage.c_str());
        sendValidationError(messageValidation);
        return;
    }

    // Validate custom date if provided
    if (server.hasArg("date"))
    {
        String customDate = server.arg("date");
        ValidationResult dateValidation = validateParameter(customDate, "date", 50, false);
        if (!dateValidation.isValid)
        {
            sendValidationError(dateValidation);
            return;
        }

        currentReceipt.timestamp = formatCustomDate(customDate);
        LOG_VERBOSE("WEB", "Using custom date: %s", customDate.c_str());
    }
    else
    {
        currentReceipt.timestamp = getFormattedDateTime();
        LOG_VERBOSE("WEB", "Using current date");
    }

    // All validation passed, process the request
    currentReceipt.message = message;
    currentReceipt.queuedForPrint = true;

    LOG_VERBOSE("WEB", "Valid message received for printing: %d characters", message.length());

    server.send(200, "text/plain", "Receipt received and sent to printer");
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
    doc["mdns_hostname"] = String(getMdnsHostname());
    doc["wifi_ssid"] = WiFi.SSID();

    // MQTT information
    doc["mqtt_connected"] = mqttClient.connected();
    doc["mqtt_server"] = String(mqttServer);
    doc["local_topic"] = String(getLocalPrinterTopic());

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

void handleButtons()
{
    // Check rate limiting
    if (isRateLimited())
    {
        server.send(429, "text/plain", "Too many requests. Please slow down.");
        return;
    }

    // Get button configuration from hardware_buttons module
    String buttonConfig = getButtonConfigJson();

    LOG_VERBOSE("WEB", "Button configuration requested");
    server.send(200, "application/json", buttonConfig);
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
 * @brief Process endpoint with unified source handling (shared by hardware buttons and web interface)
 * @param endpoint The endpoint to process (e.g., "/riddle", "/joke")
 * @param destination The destination: "local-direct" for direct local printing, or MQTT topic name for MQTT routing
 * @return True if content was generated and handled successfully
 */
bool processEndpoint(const char *endpoint, const char *destination)
{
    if (!endpoint || !destination)
    {
        LOG_ERROR("WEB", "Null endpoint or destination provided");
        return false;
    }

    bool isLocalDirect = (strcmp(destination, "local-direct") == 0);

    LOG_VERBOSE("WEB", "Processing endpoint: %s (destination: %s)", endpoint, destination);

    String content;
    bool success = false;

    // Generate content based on endpoint
    if (strcmp(endpoint, "/riddle") == 0)
    {
        content = generateRiddleContent();
        success = (content.length() > 0);
    }
    else if (strcmp(endpoint, "/joke") == 0)
    {
        content = generateJokeContent();
        success = (content.length() > 0);
    }
    else if (strcmp(endpoint, "/quote") == 0)
    {
        content = generateQuoteContent();
        success = (content.length() > 0);
    }
    else if (strcmp(endpoint, "/quiz") == 0)
    {
        content = generateQuizContent();
        success = (content.length() > 0);
    }
    else if (strcmp(endpoint, "/print-test") == 0)
    {
        String testContent = loadPrintTestContent();
        content = "TEST PRINT\n\n" + testContent + "\n\n";
        success = true;
    }
    else
    {
        LOG_WARNING("WEB", "Unknown endpoint: %s", endpoint);
        return false;
    }

    if (!success)
    {
        LOG_ERROR("WEB", "Failed to generate content for %s", endpoint);
        return false;
    }

    // Set up receipt data
    currentReceipt.message = content;
    currentReceipt.timestamp = getFormattedDateTime();

    // Handle routing based on destination
    if (isLocalDirect)
    {
        // Local direct printing: queue for local printer
        currentReceipt.queuedForPrint = true;
        LOG_VERBOSE("WEB", "Content queued for local direct printing");
    }
    else
    {
        // MQTT: send via MQTT, don't print locally
        currentReceipt.queuedForPrint = false;
        LOG_VERBOSE("WEB", "Content will be sent via MQTT to topic: %s", destination);

        // Create JSON payload for MQTT (same format as handleMQTTSend)
        DynamicJsonDocument payloadDoc(jsonDocumentSize);
        payloadDoc["message"] = content;
        payloadDoc["timestamp"] = getFormattedDateTime();
        payloadDoc["sender"] = getMdnsHostname();

        String payload;
        serializeJson(payloadDoc, payload);

        // Send via MQTT
        if (mqttClient.publish(destination, payload.c_str()))
        {
            LOG_VERBOSE("WEB", "Content successfully sent via MQTT");
        }
        else
        {
            LOG_ERROR("WEB", "Failed to send content via MQTT");
            return false;
        }
    }

    return true;
}

bool processCustomMessage(const String &message, const String &timestamp, const char *destination)
{
    if (!destination)
    {
        LOG_ERROR("WEB", "Null destination provided");
        return false;
    }

    bool isLocalDirect = (strcmp(destination, "local-direct") == 0);

    LOG_VERBOSE("WEB", "Processing custom message (destination: %s)", destination);

    // Set up receipt data
    currentReceipt.message = message;
    currentReceipt.timestamp = timestamp;

    // Handle routing based on destination
    if (isLocalDirect)
    {
        // Local direct printing: queue for local printer
        currentReceipt.queuedForPrint = true;
        LOG_VERBOSE("WEB", "Custom message queued for local direct printing");
    }
    else
    {
        // MQTT: send via MQTT, don't print locally
        currentReceipt.queuedForPrint = false;
        LOG_VERBOSE("WEB", "Custom message will be sent via MQTT to topic: %s", destination);

        // Create JSON payload for MQTT (same format as handleMQTTSend)
        DynamicJsonDocument payloadDoc(jsonDocumentSize);
        payloadDoc["message"] = message;
        payloadDoc["timestamp"] = timestamp;
        payloadDoc["sender"] = getMdnsHostname();

        String payload;
        serializeJson(payloadDoc, payload);

        // Send via MQTT
        if (mqttClient.publish(destination, payload.c_str()))
        {
            LOG_VERBOSE("WEB", "Custom message successfully sent via MQTT");
        }
        else
        {
            LOG_ERROR("WEB", "Failed to send custom message via MQTT");
            return false;
        }
    }

    return true;
}

String generateRiddleContent()
{
    if (!LittleFS.begin())
    {
        return "Failed to mount LittleFS for riddles";
    }

    // Open the riddles.ndjson file
    File file = LittleFS.open("/riddles.ndjson", "r");
    if (!file)
    {
        return "Failed to open riddles file";
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
            DynamicJsonDocument doc(jsonDocumentSize);
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

    return fullContent;
}

String generateJokeContent()
{
    String dadJoke = "Why don't scientists trust atoms? Because they make up everything!"; // fallback

    // Try to fetch from API
    String response = fetchFromAPI(dadJokeAPI, apiUserAgent);

    if (response.length() > 0)
    {
        DynamicJsonDocument doc(jsonDocumentSize);
        DeserializationError error = deserializeJson(doc, response);

        if (!error && doc.containsKey("joke"))
        {
            String apiJoke = doc["joke"].as<String>();
            apiJoke.trim();
            if (apiJoke.length() > minJokeLength) // Ensure it's a real joke, not empty
            {
                dadJoke = apiJoke;
            }
        }
    }

    String fullContent = "JOKE\n\n" + dadJoke;
    return fullContent;
}

String generateQuoteContent()
{
    String quote = "\"Your mind is for having ideas, not holding them.\"\n– David Allen";

    // Try to fetch from API
    String response = fetchFromAPI(quoteAPI, apiUserAgent);

    if (response.length() > 0)
    {
        // Parse JSON response (expecting array format)
        DynamicJsonDocument doc(largeJsonDocumentSize);
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

                if (quoteText.length() > 0 && author.length() > 0)
                {
                    quote = "\"" + quoteText + "\"\n– " + author;
                }
            }
        }
    }

    String fullContent = "QUOTE\n\n" + quote;
    return fullContent;
}

String generateQuizContent()
{
    // Randomize the fallback quiz answer position
    int correctPosition = random(0, 4);
    String options[4] = {"London", "Berlin", "Paris", "Madrid"};
    String correctAnswer = "Paris";
    String positionLabels[4] = {"A", "B", "C", "D"};

    // Swap the correct answer to the random position
    if (correctPosition != 2)
    { // Paris is at index 2
        String temp = options[correctPosition];
        options[correctPosition] = correctAnswer;
        options[2] = temp;
    }

    String quiz = "QUIZ\n\nWhat is the capital of France?\n";
    quiz += "A) " + options[0] + "\n";
    quiz += "B) " + options[1] + "\n";
    quiz += "C) " + options[2] + "\n";
    quiz += "D) " + options[3] + "\n\n\n\n";
    quiz += "Answer: " + reverseString(correctAnswer);

    // Try to fetch from API
    String response = fetchFromAPI(triviaAPI, apiUserAgent);

    if (response.length() > 0)
    {
        DynamicJsonDocument doc(largeJsonDocumentSize);
        DeserializationError error = deserializeJson(doc, response);

        if (!error && doc.is<JsonArray>() && doc.size() > 0)
        {
            JsonObject questionObj = doc[0];
            if (questionObj.containsKey("question") &&
                questionObj.containsKey("correctAnswer") &&
                questionObj.containsKey("incorrectAnswers"))
            {
                String question = questionObj["question"].as<String>();
                String correctAnswer = questionObj["correctAnswer"].as<String>();
                JsonArray incorrectAnswers = questionObj["incorrectAnswers"];

                question.trim();
                correctAnswer.trim();

                if (question.length() > 0 && correctAnswer.length() > 0 && incorrectAnswers.size() >= 3)
                {
                    // Randomize the position of the correct answer (A, B, C, or D)
                    int correctPosition = random(0, 4);
                    String options[4];
                    String positionLabels[4] = {"A", "B", "C", "D"};

                    // Fill with incorrect answers first
                    int incorrectIndex = 0;
                    for (int i = 0; i < 4; i++)
                    {
                        if (i == correctPosition)
                        {
                            options[i] = correctAnswer;
                        }
                        else
                        {
                            options[i] = incorrectAnswers[incorrectIndex].as<String>();
                            incorrectIndex++;
                        }
                    }

                    quiz = "QUIZ\n\n" + question + "\n";
                    quiz += "A) " + options[0] + "\n";
                    quiz += "B) " + options[1] + "\n";
                    quiz += "C) " + options[2] + "\n";
                    quiz += "D) " + options[3] + "\n\n\n\n";
                    quiz += "Answer: " + reverseString(correctAnswer);
                }
            }
        }
    }

    return quiz;
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
    // Validate optional parameters
    ValidationResult remoteValidation = validateRemoteParameter();
    if (!remoteValidation.isValid)
    {
        sendValidationError(remoteValidation);
        return;
    }

    // Check for source parameter - determines routing
    String source = server.hasArg("source") ? server.arg("source") : "local-direct";

    // Use unified endpoint processing
    if (processEndpoint("/print-test", source.c_str()))
    {
        // Return the content as plain text
        server.send(200, "text/plain", currentReceipt.message);
    }
    else
    {
        server.send(500, "text/plain", "Failed to generate print test content");
    }
}

void handleNotFound()
{
    // Rate limit 404 requests to prevent abuse
    if (isRateLimited())
    {
        server.send(429, "text/plain", "Rate limit exceeded");
        return;
    }

    String uri = server.uri();
    String method = (server.method() == HTTP_GET) ? "GET" : "POST";

    // Validate URI to prevent log injection
    if (uri.length() > maxUriDisplayLength)
    {
        uri = uri.substring(0, maxUriDisplayLength) + "..."; // Truncate very long URIs
    }

    // Remove any potential log injection characters
    uri.replace('\n', ' ');
    uri.replace('\r', ' ');

    // Build comprehensive 404 error message for logging
    String errorDetails = "=== 404 Error === | Method: " + method + " | URI: " + uri + " | Args: " + String(server.args());

    // Limit argument logging to prevent log flooding
    int maxArgs = min(server.args(), 5);
    for (int i = 0; i < maxArgs; i++)
    {
        String argName = server.argName(i);
        String argValue = server.arg(i);

        // Sanitize and truncate arguments
        if (argName.length() > 50)
            argName = argName.substring(0, 50) + "...";
        if (argValue.length() > 100)
            argValue = argValue.substring(0, 100) + "...";
        argName.replace('\n', ' ');
        argName.replace('\r', ' ');
        argValue.replace('\n', ' ');
        argValue.replace('\r', ' ');

        errorDetails += " | " + argName + ": " + argValue;
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
    template404 = replaceTemplate(template404, "HOSTNAME", String(getMdnsHostname()));

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
    LOG_VERBOSE("WEB", "handleRiddle() called");

    // Validate optional parameters
    ValidationResult remoteValidation = validateRemoteParameter();
    if (!remoteValidation.isValid)
    {
        sendValidationError(remoteValidation);
        return;
    }

    // Check for source parameter - determines routing
    String source = server.hasArg("source") ? server.arg("source") : "local-direct";

    // Use unified endpoint processing
    if (processEndpoint("/riddle", source.c_str()))
    {
        // Return the content as plain text
        server.send(200, "text/plain", currentReceipt.message);
    }
    else
    {
        server.send(500, "text/plain", "Failed to generate riddle content");
    }
}

void handleJoke()
{
    // Validate optional parameters
    ValidationResult remoteValidation = validateRemoteParameter();
    if (!remoteValidation.isValid)
    {
        sendValidationError(remoteValidation);
        return;
    }

    // Check for source parameter - determines routing
    String source = server.hasArg("source") ? server.arg("source") : "local-direct";

    // Use unified endpoint processing
    if (processEndpoint("/joke", source.c_str()))
    {
        // Return the content as plain text
        server.send(200, "text/plain", currentReceipt.message);
    }
    else
    {
        server.send(500, "text/plain", "Failed to generate joke content");
    }
}

void handleQuote()
{
    // Validate optional parameters
    ValidationResult remoteValidation = validateRemoteParameter();
    if (!remoteValidation.isValid)
    {
        sendValidationError(remoteValidation);
        return;
    }

    // Check for source parameter - determines routing
    String source = server.hasArg("source") ? server.arg("source") : "local-direct";

    // Use unified endpoint processing
    if (processEndpoint("/quote", source.c_str()))
    {
        // Return the content as plain text
        server.send(200, "text/plain", currentReceipt.message);
    }
    else
    {
        server.send(500, "text/plain", "Failed to generate quote content");
    }
}

void handleQuiz()
{
    // Validate optional parameters
    ValidationResult remoteValidation = validateRemoteParameter();
    if (!remoteValidation.isValid)
    {
        sendValidationError(remoteValidation);
        return;
    }

    // Check for source parameter - determines routing
    String source = server.hasArg("source") ? server.arg("source") : "local-direct";

    // Use unified endpoint processing
    if (processEndpoint("/quiz", source.c_str()))
    {
        // Return the content as plain text
        server.send(200, "text/plain", currentReceipt.message);
    }
    else
    {
        server.send(500, "text/plain", "Failed to generate quiz content");
    }
}

void handleMessage()
{
    // Check rate limiting first
    if (isRateLimited())
    {
        server.send(429, "text/plain", "Rate limit exceeded. Please wait before sending another request.");
        return;
    }

    // Validate message parameter exists
    if (!server.hasArg("message"))
    {
        sendValidationError(ValidationResult(false, "Missing required parameter 'message'"));
        return;
    }

    String message = server.arg("message");

    // URL decode the message (handles %20 for spaces, etc.)
    message.replace("+", " "); // Handle + as space in URL encoding
    message = urlDecode(message);

    // Debug: Log message details (can be removed after testing)
    LOG_VERBOSE("WEB", "Received message: length=%d, content: '%.50s'", message.length(), message.c_str());

    // Validate message content
    ValidationResult messageValidation = validateMessage(message);
    if (!messageValidation.isValid)
    {
        LOG_WARNING("WEB", "Message validation failed: %s", messageValidation.errorMessage.c_str());
        sendValidationError(messageValidation);
        return;
    }

    // Check for source parameter - determines routing
    String source = server.hasArg("source") ? server.arg("source") : "local-direct";

    // Validate custom date if provided
    String timestamp;
    if (server.hasArg("date"))
    {
        String customDate = server.arg("date");
        ValidationResult dateValidation = validateParameter(customDate, "date", 50, false);
        if (!dateValidation.isValid)
        {
            sendValidationError(dateValidation);
            return;
        }
        timestamp = formatCustomDate(customDate);
        LOG_VERBOSE("WEB", "Using custom date: %s", customDate.c_str());
    }
    else
    {
        timestamp = getFormattedDateTime();
        LOG_VERBOSE("WEB", "Using current date");
    }

    // Process the message using unified routing
    if (processCustomMessage(message, timestamp, source.c_str()))
    {
        // Return success response
        server.send(200, "text/plain", "Message processed successfully");
    }
    else
    {
        server.send(500, "text/plain", "Failed to process message");
    }
}

void handleMQTTSend()
{
    // Check rate limiting first
    if (isRateLimited())
    {
        server.send(429, "text/plain", "Rate limit exceeded. Please wait before sending another request.");
        return;
    }

    if (!mqttClient.connected())
    {
        server.send(503, "text/plain", "MQTT client not connected");
        return;
    }

    // Get and validate JSON body
    String body = server.arg("plain");
    if (body.length() == 0)
    {
        sendValidationError(ValidationResult(false, "No JSON body provided"));
        return;
    }

    // Validate JSON structure
    const char *requiredFields[] = {"topic", "message"};
    ValidationResult jsonValidation = validateJSON(body, requiredFields, 2);
    if (!jsonValidation.isValid)
    {
        sendValidationError(jsonValidation);
        return;
    }

    // Parse the JSON (we know it's valid now)
    DynamicJsonDocument doc(4096);
    deserializeJson(doc, body); // No need to check error again

    String topic = doc["topic"].as<String>();
    String message = doc["message"].as<String>();

    // Validate MQTT topic
    ValidationResult topicValidation = validateMQTTTopic(topic);
    if (!topicValidation.isValid)
    {
        sendValidationError(topicValidation);
        return;
    }

    // Validate message content
    ValidationResult messageValidation = validateMessage(message);
    if (!messageValidation.isValid)
    {
        sendValidationError(messageValidation);
        return;
    }

    // Create the MQTT payload as JSON with proper escaping
    DynamicJsonDocument payloadDoc(4096);
    payloadDoc["message"] = message; // ArduinoJson handles escaping automatically

    String payload;
    serializeJson(payloadDoc, payload);

    // Publish to MQTT
    if (mqttClient.publish(topic.c_str(), payload.c_str()))
    {
        LOG_VERBOSE("WEB", "MQTT message sent to topic: %s (%d characters)", topic.c_str(), message.length());
        server.send(200, "text/plain", "Message sent successfully!");
    }
    else
    {
        LOG_ERROR("WEB", "Failed to send MQTT message to topic: %s", topic.c_str());
        server.send(500, "text/plain", "Failed to send MQTT message - broker error");
    }
}
