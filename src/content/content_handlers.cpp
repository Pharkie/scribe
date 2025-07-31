/**
 * @file content_handlers.cpp
 * @brief Implementation of content generation request handlers
 * @author Adam Knowles
 * @date 2025
 * @copyright Copyright (c) 2025 Adam Knowles. All rights reserved.
 * @license Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 */

#include "content_handlers.h"
#include "../web/validation.h"
#include "../core/config.h"
#include "../core/logging.h"
#include "../utils/time_utils.h"
#include "content_generators.h"
#include <WebServer.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <esp_task_wdt.h>

// External declarations
extern WebServer server;
extern PubSubClient mqttClient;
extern String getFormattedDateTime();
extern String formatCustomDate(String customDate);
extern String getMdnsHostname();

// ========================================
// CONTENT GENERATION HANDLERS
// ========================================

void handleRiddle()
{
    LOG_VERBOSE("WEB", "handleRiddle() called");

    // Get and parse JSON body
    String body = server.arg("plain");
    String source = "local-direct"; // Default value

    if (body.length() > 0)
    {
        DynamicJsonDocument doc(1024);
        DeserializationError error = deserializeJson(doc, body);
        if (!error && doc.containsKey("printer"))
        {
            source = doc["printer"].as<String>();
        }
    }

    // Use unified endpoint processing
    if (processEndpoint("/riddle", source.c_str()))
    {
        // Return consistent JSON response
        DynamicJsonDocument responseDoc(1024);
        responseDoc["success"] = true;
        responseDoc["message"] = currentMessage.message;
        responseDoc["timestamp"] = currentMessage.timestamp;

        String response;
        serializeJson(responseDoc, response);
        server.send(200, "application/json", response);
    }
    else
    {
        // Return consistent JSON error response
        DynamicJsonDocument errorDoc(512);
        errorDoc["success"] = false;
        errorDoc["error"] = "Failed to generate riddle content";

        String errorResponse;
        serializeJson(errorDoc, errorResponse);
        server.send(500, "application/json", errorResponse);
    }
}

void handleJoke()
{
    LOG_VERBOSE("WEB", "handleJoke() called");

    // Get and parse JSON body
    String body = server.arg("plain");
    String source = "local-direct"; // Default value

    if (body.length() > 0)
    {
        DynamicJsonDocument doc(1024);
        DeserializationError error = deserializeJson(doc, body);
        if (!error && doc.containsKey("printer"))
        {
            source = doc["printer"].as<String>();
        }
    }

    // Use unified endpoint processing
    if (processEndpoint("/joke", source.c_str()))
    {
        // Return consistent JSON response
        DynamicJsonDocument responseDoc(1024);
        responseDoc["success"] = true;
        responseDoc["message"] = currentMessage.message;
        responseDoc["timestamp"] = currentMessage.timestamp;

        String response;
        serializeJson(responseDoc, response);
        server.send(200, "application/json", response);
    }
    else
    {
        // Return consistent JSON error response
        DynamicJsonDocument errorDoc(512);
        errorDoc["success"] = false;
        errorDoc["error"] = "Failed to generate joke content";

        String errorResponse;
        serializeJson(errorDoc, errorResponse);
        server.send(500, "application/json", errorResponse);
    }
}

void handleQuote()
{
    LOG_VERBOSE("WEB", "handleQuote() called");

    // Get and parse JSON body
    String body = server.arg("plain");
    String source = "local-direct"; // Default value

    if (body.length() > 0)
    {
        DynamicJsonDocument doc(1024);
        DeserializationError error = deserializeJson(doc, body);
        if (!error && doc.containsKey("printer"))
        {
            source = doc["printer"].as<String>();
        }
    }

    // Use unified endpoint processing
    if (processEndpoint("/quote", source.c_str()))
    {
        // Return consistent JSON response
        DynamicJsonDocument responseDoc(1024);
        responseDoc["success"] = true;
        responseDoc["message"] = currentMessage.message;
        responseDoc["timestamp"] = currentMessage.timestamp;

        String response;
        serializeJson(responseDoc, response);
        server.send(200, "application/json", response);
    }
    else
    {
        // Return consistent JSON error response
        DynamicJsonDocument errorDoc(512);
        errorDoc["success"] = false;
        errorDoc["error"] = "Failed to generate quote content";

        String errorResponse;
        serializeJson(errorDoc, errorResponse);
        server.send(500, "application/json", errorResponse);
    }
}

void handleQuiz()
{
    LOG_VERBOSE("WEB", "handleQuiz() called");

    // Get and parse JSON body
    String body = server.arg("plain");
    String source = "local-direct"; // Default value

    if (body.length() > 0)
    {
        DynamicJsonDocument doc(1024);
        DeserializationError error = deserializeJson(doc, body);
        if (!error && doc.containsKey("printer"))
        {
            source = doc["printer"].as<String>();
        }
    }

    // Use unified endpoint processing
    if (processEndpoint("/quiz", source.c_str()))
    {
        // Return consistent JSON response
        DynamicJsonDocument responseDoc(1024);
        responseDoc["success"] = true;
        responseDoc["message"] = currentMessage.message;
        responseDoc["timestamp"] = currentMessage.timestamp;

        String response;
        serializeJson(responseDoc, response);
        server.send(200, "application/json", response);
    }
    else
    {
        // Return consistent JSON error response
        DynamicJsonDocument errorDoc(512);
        errorDoc["success"] = false;
        errorDoc["error"] = "Failed to generate quiz content";

        String errorResponse;
        serializeJson(errorDoc, errorResponse);
        server.send(500, "application/json", errorResponse);
    }
}

void handleUnbiddenInk()
{
    LOG_VERBOSE("WEB", "handleUnbiddenInk() called");

    // Unbidden Ink is always local-direct (called by internal scheduling system)
    String source = "local-direct";

    // Use unified endpoint processing
    if (processEndpoint("/unbidden-ink", source.c_str()))
    {
        // Return consistent JSON response
        DynamicJsonDocument responseDoc(1024);
        responseDoc["success"] = true;
        responseDoc["message"] = currentMessage.message;
        responseDoc["timestamp"] = currentMessage.timestamp;

        String response;
        serializeJson(responseDoc, response);
        server.send(200, "application/json", response);
    }
    else
    {
        // Return consistent JSON error response
        DynamicJsonDocument errorDoc(512);
        errorDoc["success"] = false;
        errorDoc["error"] = "Failed to generate Unbidden Ink content";

        String errorResponse;
        serializeJson(errorDoc, errorResponse);
        server.send(500, "application/json", errorResponse);
    }
}

void handlePrintTest()
{
    LOG_VERBOSE("WEB", "handlePrintTest() called");

    // Get and parse JSON body
    String body = server.arg("plain");
    String source = "local-direct"; // Default value

    if (body.length() > 0)
    {
        DynamicJsonDocument doc(1024);
        DeserializationError error = deserializeJson(doc, body);
        if (!error && doc.containsKey("printer"))
        {
            source = doc["printer"].as<String>();
        }
    }

    // Use unified endpoint processing
    if (processEndpoint("/print-test", source.c_str()))
    {
        // Return consistent JSON response
        DynamicJsonDocument responseDoc(1024);
        responseDoc["success"] = true;
        responseDoc["message"] = currentMessage.message;
        responseDoc["timestamp"] = currentMessage.timestamp;

        String response;
        serializeJson(responseDoc, response);
        server.send(200, "application/json", response);
    }
    else
    {
        // Return consistent JSON error response
        DynamicJsonDocument errorDoc(512);
        errorDoc["success"] = false;
        errorDoc["error"] = "Failed to generate print test content";

        String errorResponse;
        serializeJson(errorDoc, errorResponse);
        server.send(500, "application/json", errorResponse);
    }
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

    // Debug: Log message details
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

        currentMessage.timestamp = formatCustomDate(customDate);
        LOG_VERBOSE("WEB", "Using custom date: %s", customDate.c_str());
    }
    else
    {
        currentMessage.timestamp = getFormattedDateTime();
        LOG_VERBOSE("WEB", "Using current date");
    }

    // All validation passed, process the request
    currentMessage.message = message;
    currentMessage.shouldPrintLocally = true;

    LOG_VERBOSE("WEB", "Valid message received for printing: %d characters", message.length());

    server.send(200, "text/plain", "Message received and sent to printer");
}

void handleMessage()
{
    // Check rate limiting first
    if (isRateLimited())
    {
        server.send(429, "text/plain", "Rate limit exceeded. Please wait before sending another request.");
        return;
    }

    // Get and validate JSON body
    String body = server.arg("plain");
    if (body.length() == 0)
    {
        sendValidationError(ValidationResult(false, "No JSON body provided"));
        return;
    }

    // Parse JSON
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, body);
    if (error)
    {
        sendValidationError(ValidationResult(false, "Invalid JSON format: " + String(error.c_str())));
        return;
    }

    // Validate required message field
    if (!doc.containsKey("message"))
    {
        sendValidationError(ValidationResult(false, "Missing required field 'message' in JSON"));
        return;
    }

    String message = doc["message"].as<String>();
    String source = doc.containsKey("source") ? doc["source"].as<String>() : "local-direct";

    // Debug: Log message details
    LOG_VERBOSE("WEB", "Received message: length=%d, content: '%.50s'", message.length(), message.c_str());

    // Validate message content
    ValidationResult messageValidation = validateMessage(message);
    if (!messageValidation.isValid)
    {
        LOG_WARNING("WEB", "Message validation failed: %s", messageValidation.errorMessage.c_str());
        sendValidationError(messageValidation);
        return;
    }

    // Use current timestamp (no custom date support in JSON API)
    String timestamp = getFormattedDateTime();

    // Process the message using unified routing
    if (processCustomMessage(message, timestamp, source.c_str()))
    {
        server.send(200, "application/json", "{\"success\":true,\"message\":\"Message processed successfully\"}");
    }
    else
    {
        server.send(500, "application/json", "{\"success\":false,\"message\":\"Failed to process message\"}");
    }
}

// ========================================
// UNIFIED PROCESSING FUNCTIONS
// ========================================

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
        content = generateJokeContent(); // Uses default 5000ms timeout
        success = (content.length() > 0);
    }
    else if (strcmp(endpoint, "/quote") == 0)
    {
        content = generateQuoteContent(); // Uses default 5000ms timeout
        success = (content.length() > 0);
    }
    else if (strcmp(endpoint, "/quiz") == 0)
    {
        content = generateQuizContent(); // Uses default 5000ms timeout
        success = (content.length() > 0);
    }
    else if (strcmp(endpoint, "/unbidden-ink") == 0)
    {
        content = generateUnbiddenInkContent();
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

    LOG_VERBOSE("WEB", "Generated content for %s: length=%d, preview='%.50s'", endpoint, content.length(), content.c_str());

    // Set up message data
    currentMessage.message = content;
    currentMessage.timestamp = getFormattedDateTime();

    // Handle routing based on destination
    if (isLocalDirect)
    {
        // Local direct printing: queue for local printer
        currentMessage.shouldPrintLocally = true;
        LOG_VERBOSE("WEB", "Content queued for local direct printing");
    }
    else
    {
        // MQTT: send via MQTT, don't print locally
        currentMessage.shouldPrintLocally = false;
        LOG_VERBOSE("WEB", "Content will be sent via MQTT to topic: %s", destination);

        // Feed watchdog before potentially slow operations
        esp_task_wdt_reset();

        // Create JSON payload for MQTT
        DynamicJsonDocument payloadDoc(jsonDocumentSize);
        payloadDoc["message"] = content;
        payloadDoc["timestamp"] = getFormattedDateTime();
        payloadDoc["sender"] = getMdnsHostname();

        String payload;
        serializeJson(payloadDoc, payload);

        LOG_VERBOSE("WEB", "MQTT payload: %s", payload.c_str());

        // Feed watchdog before MQTT publish
        esp_task_wdt_reset();

        // Check MQTT connection before publishing
        if (!mqttClient.connected())
        {
            LOG_WARNING("WEB", "MQTT not connected, attempting to reconnect...");
            // Don't block here - just fail gracefully
            LOG_ERROR("WEB", "MQTT not available for publishing");
            return false;
        }

        // Send via MQTT with timeout protection
        bool publishSuccess = mqttClient.publish(destination, payload.c_str());

        // Feed watchdog after MQTT operation
        esp_task_wdt_reset();

        if (publishSuccess)
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

    // Set up message data
    currentMessage.message = message;
    currentMessage.timestamp = timestamp;

    // Handle routing based on destination
    if (isLocalDirect)
    {
        // Local direct printing: queue for local printer
        currentMessage.shouldPrintLocally = true;
        LOG_VERBOSE("WEB", "Custom message queued for local direct printing");
    }
    else
    {
        // MQTT: send via MQTT, don't print locally
        currentMessage.shouldPrintLocally = false;
        LOG_VERBOSE("WEB", "Custom message will be sent via MQTT to topic: %s", destination);

        // Create JSON payload for MQTT
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

// ========================================
// UTILITY FUNCTIONS
// ========================================

String loadPrintTestContent()
{
    File file = LittleFS.open("/resources/print-test.txt", "r");
    if (!file)
    {
        return "ASCII: Hello World 123!@#\n\nFailed to load print test file";
    }

    String content = file.readString();
    file.close();
    return content;
}
