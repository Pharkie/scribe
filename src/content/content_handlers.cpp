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

// Content type enumeration for unified handler
enum ContentType
{
    RIDDLE,
    JOKE,
    QUOTE,
    QUIZ,
    PRINT_TEST
};

/**
 * @brief Unified content generation handler
 * @param contentType The type of content to generate
 */
void handleContentGeneration(ContentType contentType)
{
    // Determine content type name for logging
    const char *typeName;
    switch (contentType)
    {
    case RIDDLE:
        typeName = "riddle";
        break;
    case JOKE:
        typeName = "joke";
        break;
    case QUOTE:
        typeName = "quote";
        break;
    case QUIZ:
        typeName = "quiz";
        break;
    case PRINT_TEST:
        typeName = "print test";
        break;
    default:
        typeName = "unknown";
        break;
    }

    LOG_VERBOSE("WEB", "handle%s() called", typeName);

    // Note: Content generation endpoints are exempt from rate limiting
    // since they only generate content and don't perform actions.
    // Rate limiting is applied to the actual delivery endpoints (/print-local, /mqtt-send)

    // Generate content based on type
    String content;
    switch (contentType)
    {
    case RIDDLE:
        content = generateRiddleContent();
        break;
    case JOKE:
        content = generateJokeContent();
        break;
    case QUOTE:
        content = generateQuoteContent();
        break;
    case QUIZ:
        content = generateQuizContent();
        break;
    case PRINT_TEST:
    {
        String testContent = loadPrintTestContent();
        content = "TEST PRINT\n\n" + testContent + "\n\n";
    }
    break;
    }

    if (content.length() > 0)
    {
        // Return JSON with content only
        DynamicJsonDocument doc(2048);
        doc["content"] = content;

        String response;
        serializeJson(doc, response);

        server.send(200, "application/json", response);
        LOG_VERBOSE("WEB", "%s content generated successfully", typeName);
    }
    else
    {
        DynamicJsonDocument errorResponse(256);
        errorResponse["error"] = String("Failed to generate ") + typeName + " content";

        String errorString;
        serializeJson(errorResponse, errorString);
        server.send(500, "application/json", errorString);
        LOG_ERROR("WEB", "Failed to generate %s content", typeName);
    }
}

// Individual handler functions (simple wrappers)
void handleRiddle() { handleContentGeneration(RIDDLE); }
void handleJoke() { handleContentGeneration(JOKE); }
void handleQuote() { handleContentGeneration(QUOTE); }
void handleQuiz() { handleContentGeneration(QUIZ); }
void handlePrintTest() { handleContentGeneration(PRINT_TEST); }

void handleUnbiddenInk()
{
    LOG_VERBOSE("WEB", "handleUnbiddenInk() called");

    // Generate unbidden ink content only (same as other content endpoints)
    String content = generateUnbiddenInkContent();

    if (content.length() > 0)
    {
        // Set up message for local printing (Unbidden Ink is always local-direct)
        currentMessage.message = content;
        currentMessage.timestamp = getFormattedDateTime();
        currentMessage.shouldPrintLocally = true;

        LOG_VERBOSE("WEB", "Unbidden Ink content queued for local direct printing");

        // Return JSON response
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
        // Return JSON error response
        DynamicJsonDocument errorDoc(512);
        errorDoc["success"] = false;
        errorDoc["error"] = "Failed to generate Unbidden Ink content";

        String errorResponse;
        serializeJson(errorDoc, errorResponse);
        server.send(500, "application/json", errorResponse);
        LOG_ERROR("WEB", "Failed to generate Unbidden Ink content");
    }
}

void handleMessage()
{
    // Check rate limiting first
    if (isRateLimited())
    {
        DynamicJsonDocument errorResponse(256);
        errorResponse["success"] = false;
        errorResponse["error"] = getRateLimitReason();

        String errorString;
        serializeJson(errorResponse, errorString);
        server.send(429, "application/json", errorString);
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

    // Set up message data
    currentMessage.message = message;
    currentMessage.timestamp = getFormattedDateTime();

    // Handle routing based on source
    bool isLocalDirect = (strcmp(source.c_str(), "local-direct") == 0);

    if (isLocalDirect)
    {
        // Local direct printing: queue for local printer
        currentMessage.shouldPrintLocally = true;
        LOG_VERBOSE("WEB", "Custom message queued for local direct printing");

        server.send(200, "application/json", "{\"success\":true,\"message\":\"Message processed successfully\"}");
    }
    else
    {
        // MQTT: send via MQTT, don't print locally
        currentMessage.shouldPrintLocally = false;
        LOG_VERBOSE("WEB", "Custom message will be sent via MQTT to topic: %s", source.c_str());

        // Check MQTT connection
        if (!mqttClient.connected())
        {
            DynamicJsonDocument errorResponse(256);
            errorResponse["success"] = false;
            errorResponse["error"] = "MQTT client not connected";

            String errorString;
            serializeJson(errorResponse, errorString);
            server.send(503, "application/json", errorString);
            return;
        }

        // Create JSON payload for MQTT
        DynamicJsonDocument payloadDoc(jsonDocumentSize);
        payloadDoc["message"] = message;
        payloadDoc["timestamp"] = currentMessage.timestamp;
        payloadDoc["sender"] = getMdnsHostname();

        String payload;
        serializeJson(payloadDoc, payload);

        // Send via MQTT
        if (mqttClient.publish(source.c_str(), payload.c_str()))
        {
            LOG_VERBOSE("WEB", "Custom message successfully sent via MQTT");
            server.send(200, "application/json", "{\"success\":true,\"message\":\"Message processed successfully\"}");
        }
        else
        {
            LOG_ERROR("WEB", "Failed to send custom message via MQTT");
            server.send(500, "application/json", "{\"success\":false,\"message\":\"Failed to process message\"}");
        }
    }
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
