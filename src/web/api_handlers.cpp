/**
 * @file api_handlers.cpp
 * @brief Implementation of API endpoint handlers
 * @author Adam Knowles
 * @date 2025
 * @copyright Copyright (c) 2025 Adam Knowles. All rights reserved.
 * @license Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 */

#include "api_handlers.h"
#include "validation.h"
#include "../core/config.h"
#include "../core/config_utils.h"
#include "../core/logging.h"
#include "../hardware/hardware_buttons.h"
#include "../content/unbidden_ink.h"
#include <WebServer.h>
#include <WiFi.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <esp_system.h>

// External declarations
extern WebServer server;
extern PubSubClient mqttClient;

// ========================================
// API ENDPOINT HANDLERS
// ========================================

void handleStatus()
{
    // Get flash storage information
    size_t totalBytes = 0;
    size_t usedBytes = 0;
    totalBytes = LittleFS.totalBytes();
    usedBytes = LittleFS.usedBytes();

    DynamicJsonDocument doc(2048); // Large size for comprehensive data

    // Device configuration
    doc["device_owner"] = String(deviceOwner);
    doc["mdns_hostname"] = String(getMdnsHostname());

    // Get current printer config for timezone
    const PrinterConfig *currentConfig = findPrinterConfig(deviceOwner);
    if (currentConfig)
    {
        doc["timezone"] = String(currentConfig->timezone);
    }

    // Network information
    doc["wifi_connected"] = (WiFi.status() == WL_CONNECTED);
    doc["ip_address"] = WiFi.localIP().toString();
    doc["wifi_ssid"] = WiFi.SSID();
    doc["rssi"] = WiFi.RSSI(); // Signal strength
    doc["mac_address"] = WiFi.macAddress();
    doc["gateway"] = WiFi.gatewayIP().toString();
    doc["dns"] = WiFi.dnsIP().toString();

    // MQTT information
    doc["mqtt_connected"] = mqttClient.connected();
    doc["mqtt_server"] = String(mqttServer);
    doc["mqtt_port"] = mqttPort;
    doc["local_topic"] = String(getLocalPrinterTopic());

    // System information
    doc["uptime"] = millis();
    doc["free_heap"] = ESP.getFreeHeap();
    doc["total_heap"] = ESP.getHeapSize();
    doc["chip_model"] = ESP.getChipModel();
    doc["cpu_freq"] = ESP.getCpuFreqMHz();
    doc["chip_revision"] = ESP.getChipRevision();
    doc["sdk_version"] = ESP.getSdkVersion();

    // Reset reason
    esp_reset_reason_t resetReason = esp_reset_reason();
    const char *resetReasonStr = "Unknown";
    switch (resetReason)
    {
    case ESP_RST_POWERON:
        resetReasonStr = "Power-on";
        break;
    case ESP_RST_EXT:
        resetReasonStr = "External reset";
        break;
    case ESP_RST_SW:
        resetReasonStr = "Software reset";
        break;
    case ESP_RST_PANIC:
        resetReasonStr = "Panic/exception";
        break;
    case ESP_RST_INT_WDT:
        resetReasonStr = "Interrupt watchdog";
        break;
    case ESP_RST_TASK_WDT:
        resetReasonStr = "Task watchdog";
        break;
    case ESP_RST_WDT:
        resetReasonStr = "Other watchdog";
        break;
    case ESP_RST_DEEPSLEEP:
        resetReasonStr = "Deep sleep";
        break;
    case ESP_RST_BROWNOUT:
        resetReasonStr = "Brownout";
        break;
    case ESP_RST_SDIO:
        resetReasonStr = "SDIO reset";
        break;
    default:
        resetReasonStr = "Unknown";
        break;
    }
    doc["reset_reason"] = resetReasonStr;

    // Flash storage information
    doc["flash_total"] = totalBytes;
    doc["flash_used"] = usedBytes;
    doc["sketch_size"] = ESP.getSketchSize();
    doc["free_sketch_space"] = ESP.getFreeSketchSpace();

    // Unbidden Ink status
    JsonObject unbiddenInk = doc.createNestedObject("unbidden_ink");

    // Reload settings from file to ensure we have the latest values
    loadUnbiddenInkSettings();
    UnbiddenInkSettings settings = getCurrentUnbiddenInkSettings();

    unbiddenInk["enabled"] = settings.enabled;
    if (settings.enabled)
    {
        unbiddenInk["start_hour"] = settings.startHour;
        unbiddenInk["end_hour"] = settings.endHour;
        unbiddenInk["frequency_minutes"] = settings.frequencyMinutes;
        unbiddenInk["next_message_time"] = getNextUnbiddenInkTime();
    }

    // Configuration health
    JsonObject config = doc.createNestedObject("configuration");
    bool fileExists = LittleFS.exists("/unbidden_ink_settings.json");
    config["unbidden_ink_settings_file_exists"] = fileExists;

    // Add message configuration limits
    config["max_message_chars"] = maxCharacters;
    config["max_prompt_chars"] = maxPromptCharacters;

    if (fileExists)
    {
        File file = LittleFS.open("/unbidden_ink_settings.json", "r");
        if (file)
        {
            config["unbidden_ink_settings_file_size"] = file.size();

            // Read and include actual file contents
            String fileContents = file.readString();
            config["unbidden_ink_settings_file_contents"] = fileContents;

            file.close();
        }
        else
        {
            // File exists but can't be opened - indicate error
            config["unbidden_ink_settings_file_error"] = "File exists but cannot be opened";
        }
    }

    // Hardware buttons configuration
    JsonObject buttons = doc.createNestedObject("hardware_buttons");
    buttons["num_buttons"] = numHardwareButtons;
    buttons["debounce_ms"] = buttonDebounceMs;
    buttons["long_press_ms"] = buttonLongPressMs;
    buttons["active_low"] = buttonActiveLow;
    buttons["min_interval_ms"] = buttonMinInterval;
    buttons["max_per_minute"] = buttonMaxPerMinute;

    JsonArray buttonArray = buttons.createNestedArray("buttons");
    for (int i = 0; i < numHardwareButtons; i++)
    {
        JsonObject button = buttonArray.createNestedObject();
        button["gpio"] = hardwareButtons[i].gpio;
        button["short_endpoint"] = hardwareButtons[i].shortEndpoint;
        button["long_endpoint"] = hardwareButtons[i].longEndpoint;
    }

    // Logging configuration
    JsonObject logging = doc.createNestedObject("logging");
    logging["level"] = logLevel;
    logging["level_name"] = getLogLevelString(logLevel);
    logging["serial_enabled"] = enableSerialLogging;
    logging["file_enabled"] = enableFileLogging;
    logging["mqtt_enabled"] = enableMQTTLogging;
    logging["betterstack_enabled"] = enableBetterStackLogging;
    if (enableMQTTLogging)
    {
        logging["mqtt_topic"] = mqttLogTopic;
    }
    if (enableFileLogging)
    {
        logging["file_name"] = logFileName;
        logging["max_file_size"] = maxLogFileSize;
    }

// Temperature (if available)
#ifdef SOC_TEMP_SENSOR_SUPPORTED
    float temp = temperatureRead();
    if (!isnan(temp))
    {
        doc["temperature"] = temp;
    }
#endif

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
        DynamicJsonDocument errorResponse(256);
        errorResponse["success"] = false;
        errorResponse["error"] = "Too many requests. Please slow down.";

        String errorString;
        serializeJson(errorResponse, errorString);
        server.send(429, "application/json", errorString);
        return;
    }

    // Get button configuration from hardware_buttons module
    String buttonConfig = getButtonConfigJson();

    LOG_VERBOSE("WEB", "Button configuration requested");
    server.send(200, "application/json", buttonConfig);
}

void handleMQTTSend()
{
    // Check rate limiting first
    if (isRateLimited())
    {
        DynamicJsonDocument errorResponse(256);
        errorResponse["success"] = false;
        errorResponse["error"] = "Rate limit exceeded. Please wait before sending another request.";

        String errorString;
        serializeJson(errorResponse, errorString);
        server.send(429, "application/json", errorString);
        return;
    }

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
    deserializeJson(doc, body);

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
        server.send(200, "application/json", "{\"status\":\"success\",\"message\":\"Message sent successfully!\"}");
    }
    else
    {
        LOG_ERROR("WEB", "Failed to send MQTT message to topic: %s", topic.c_str());
        server.send(500, "application/json", "{\"status\":\"error\",\"message\":\"Failed to send MQTT message - broker error\"}");
    }
}

void handleUnbiddenInkSettingsGet()
{
    // Check rate limiting
    if (isRateLimited())
    {
        DynamicJsonDocument errorResponse(256);
        errorResponse["success"] = false;
        errorResponse["error"] = "Rate limit exceeded. Please wait before making another request.";

        String errorString;
        serializeJson(errorResponse, errorString);
        server.send(429, "application/json", errorString);
        return;
    }

    DynamicJsonDocument doc(1024); // Increased size for prompt field

    // Read current settings from config or LittleFS
    File settingsFile = LittleFS.open("/unbidden_ink_settings.json", "r");
    if (settingsFile)
    {
        DeserializationError error = deserializeJson(doc, settingsFile);
        settingsFile.close();

        if (error)
        {
            LOG_WARNING("WEB", "Failed to parse Unbidden Ink settings file: %s", error.c_str());
            // Fall back to defaults
        }
    }

    // Set defaults if file doesn't exist or parsing failed
    if (!doc.containsKey("enabled"))
    {
        doc["enabled"] = enableUnbiddenInk;
        doc["prompt"] = getUnbiddenInkPrompt();
        doc["startHour"] = unbiddenInkStartHour;
        doc["endHour"] = unbiddenInkEndHour;
        doc["frequencyMinutes"] = unbiddenInkFrequencyMinutes;
    }

    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
}

void handleUnbiddenInkSettingsPost()
{
    // Check rate limiting
    if (isRateLimited())
    {
        DynamicJsonDocument errorResponse(256);
        errorResponse["success"] = false;
        errorResponse["error"] = "Rate limit exceeded. Please wait before making another request.";

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
    DynamicJsonDocument doc(1024); // Increased size for prompt field
    DeserializationError error = deserializeJson(doc, body);
    if (error)
    {
        sendValidationError(ValidationResult(false, "Invalid JSON format: " + String(error.c_str())));
        return;
    }

    // Validate required fields
    if (!doc.containsKey("enabled") || !doc.containsKey("startHour") ||
        !doc.containsKey("endHour") || !doc.containsKey("frequencyMinutes"))
    {
        sendValidationError(ValidationResult(false, "Missing required fields"));
        return;
    }

    // Validate field types and ranges
    if (!doc["enabled"].is<bool>())
    {
        sendValidationError(ValidationResult(false, "enabled must be boolean"));
        return;
    }

    int startHour = doc["startHour"];
    int endHour = doc["endHour"];
    int frequency = doc["frequencyMinutes"];

    if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23)
    {
        sendValidationError(ValidationResult(false, "Hours must be between 0 and 23"));
        return;
    }

    if (startHour >= endHour)
    {
        sendValidationError(ValidationResult(false, "Start hour must be before end hour"));
        return;
    }

    if (frequency < 15 || frequency > 480)
    {
        sendValidationError(ValidationResult(false, "Frequency must be between 15 minutes and 8 hours"));
        return;
    }

    // If enabled, validate prompt
    if (doc["enabled"].as<bool>())
    {
        if (!doc.containsKey("prompt"))
        {
            sendValidationError(ValidationResult(false, "Prompt required when enabled"));
            return;
        }

        String prompt = doc["prompt"];

        if (prompt.length() == 0)
        {
            sendValidationError(ValidationResult(false, "Prompt cannot be empty when enabled"));
            return;
        }

        if (prompt.length() > maxPromptCharacters)
        {
            sendValidationError(ValidationResult(false, "Prompt must be less than " + String(maxPromptCharacters) + " characters"));
            return;
        }
    }

    // Save settings to LittleFS
    File settingsFile = LittleFS.open("/unbidden_ink_settings.json", "w");
    if (!settingsFile)
    {
        LOG_ERROR("WEB", "Failed to open Unbidden Ink settings file for writing");

        // Return JSON error response
        DynamicJsonDocument errorResponse(256);
        errorResponse["success"] = false;
        errorResponse["error"] = "Failed to save settings";

        String errorString;
        serializeJson(errorResponse, errorString);
        server.send(500, "application/json", errorString);
        return;
    }

    serializeJson(doc, settingsFile);
    settingsFile.close();

    LOG_VERBOSE("WEB", "Unbidden Ink settings saved successfully");

    // Return JSON response
    DynamicJsonDocument response(256);
    response["success"] = true;
    response["message"] = "Settings saved successfully";

    String responseString;
    serializeJson(response, responseString);
    server.send(200, "application/json", responseString);
}
