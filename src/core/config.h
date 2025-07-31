/**
 * @file config.h
 * @brief Configuration settings for Scribe ESP32-C3 Thermal P// Hardware button configuration
struct ButtonConfig
{
    int gpio;                     // GPIO pin number (button connected to ground)
    const char *shortEndpoint;    // Web endpoint to trigger on short press (e.g., "/riddle", "/joke")
    const char *longEndpoint;     // Web endpoint to trigger on long press (empty string = do nothing)
}; * @author Adam Knowles
 * @date 2025
 * @copyright Copyright (c) 2025 Adam Knowles. All rights reserved.
 * @license Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 *
 * This file is part of the Scribe ESP32-C3 Thermal Printer project.
 *
 * This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0
 * International License. To view a copy of this license, visit
 * http://creativecommons.org/licenses/by-nc-sa/4.0/ or send a letter to
 * Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
 *
 * Commercial use is prohibited without explicit written permission from the author.
 * For commercial licensing inquiries, please contact Adam Knowles.
 *
 * Based on the original Project Scribe by UrbanCircles.
 */

#ifndef CONFIG_H
#define CONFIG_H

#include <ArduinoLog.h>

// ========================================
// PRINTER IDENTITY CONFIGURATION
// ========================================
// Set this to determine which printer this device is
// Available options: "Pharkie", "Riccy"
static const char *deviceOwner = "Pharkie"; // <-- SET TO YOUR PRINTER
// Should be set to the key of the printer configuration (below) you want to use

// Printer configuration structure
struct PrinterConfig
{
    const char *key;          // Unique identifier (used to derive MQTT topic and mDNS hostname)
    const char *wifiSSID;     // WiFi network name
    const char *wifiPassword; // WiFi password
    const char *timezone;     // Timezone (e.g., "Europe/London", "America/New_York")
};

// Printer configuration database - add new printers here
static const PrinterConfig printerConfigs[] = {
    // Key, WiFi SSID, WiFi Password, Timezone
    {"Pharkie", "MooseCave", "This7Muggles2%", "Europe/London"},
    {"Riccy", "MooseCave", "This7Muggles2%", "Europe/London"}
    // Add more: {"key", "WiFi_Name", "WiFi_Pass", "Timezone"}
    // MQTT topic will be: scribe/{key}/inbox
    // mDNS hostname will be: scribe-{key} (lowercase)
};

static const int numPrinterConfigs = sizeof(printerConfigs) / sizeof(printerConfigs[0]);

// ========================================
// LOGGING CONFIGURATION
// ========================================
// Log level: LOG_LEVEL_SILENT(0), LOG_LEVEL_FATAL(1), LOG_LEVEL_ERROR(2),
//           LOG_LEVEL_WARNING(3), LOG_LEVEL_NOTICE(4), LOG_LEVEL_TRACE(5), LOG_LEVEL_VERBOSE(6)
static const int logLevel = LOG_LEVEL_NOTICE;

// Log destinations (enable/disable as needed)
static const bool enableSerialLogging = true; // Serial console
// Note: initial boot messages are always sent to Serial before fancy logging is initialized
static const bool enableFileLogging = false;        // LittleFS file (untested)
static const bool enableMQTTLogging = false;        // MQTT topic
static const bool enableBetterStackLogging = false; // BetterStack (slow but useful for debugging)
// Using BetterStack with LOG_LEVEL_VERBOSE really slows down the system, due to repeated HTTP calls

// Log configuration details
static const char *mqttLogTopic = "scribe/log";
static const char *logFileName = "/logs/scribe.log";
static const size_t maxLogFileSize = 100000; // 100KB

// ========================================
// HARDWARE CONFIGURATION
// ========================================
// ESP32-C3 pin assignments
static const int TX_PIN = 21; // TX pin to printer RX (green wire)

// Thermal printer power settings (adjust for your printer model)
static const int heatingDots = 10;      // Heating dots (7-15, lower = less power)
static const int heatingTime = 150;     // Heating time (80-200ms)
static const int heatingInterval = 250; // Heating interval (200-250ms)

// Hardware button configuration
struct ButtonConfig
{
    int gpio;                  // GPIO pin number (button connected to ground)
    const char *shortEndpoint; // Web endpoint to trigger on short press (e.g., "/riddle", "/joke")
    const char *longEndpoint;  // Web endpoint to trigger on long press (empty string = do nothing)
};

// Hardware button mapping - customize for your setup
static const ButtonConfig hardwareButtons[] = {
    // GPIO, Short Press Endpoint, Long Press Endpoint (use "" for no long press action)
    {5, "/joke", "/keep-going"}, // GPIO 5 -> joke (short press), keep-going (long press)
    {6, "/riddle", ""},          // GPIO 6 -> riddle (short press only)
    {7, "/quote", ""},           // GPIO 7 -> quote (short press only)
    {8, "/quiz", ""},            // GPIO 8 -> quiz (short press only)
    // Examples with long press:
    // {9, "/print-test", "/quote"},  // GPIO 9 -> test print (short), quote (long)
    // {10, "/custom", "/status"},    // GPIO 10 -> custom (short), status (long)
};

static const int numHardwareButtons = sizeof(hardwareButtons) / sizeof(hardwareButtons[0]);

// Button hardware settings
static const unsigned long buttonDebounceMs = 50;    // Debounce time in milliseconds
static const unsigned long buttonLongPressMs = 2000; // Long press threshold in milliseconds
static const bool buttonActiveLow = true;            // true = button pulls to ground, false = button pulls to VCC

// Button rate limiting (separate from debouncing)
static const unsigned long buttonMinInterval = 3000;      // 3 seconds minimum between button presses
static const unsigned long buttonMaxPerMinute = 20;       // 20 button presses per minute max
static const unsigned long buttonRateLimitWindow = 60000; // 1 minute rate limit window

// ========================================
// MQTT CONFIGURATION
// ========================================
// MQTT broker (HiveMQ Cloud)
static const char *mqttServer = "a0829e28cf7842e9ba6f1e9830cdab3c.s1.eu.hivemq.cloud";
static const int mqttPort = 8883; // TLS port
static const char *mqttUsername = "adammain";
static const char *mqttPassword = "wqk*uwv5KMX4cwd7pxy";

// ========================================
// API CONFIGURATION
// ========================================
// External API endpoints
static const char *jokeAPI = "https://icanhazdadjoke.com/";
static const char *quoteAPI = "https://zenquotes.io/api/random";
static const char *triviaAPI = "https://the-trivia-api.com/api/questions?categories=general_knowledge&difficulty=medium&limit=1";

// BetterStack configuration
static const char *betterStackToken = "EDCC9W5Byogu6jS7mf1iL2mr";
static const char *betterStackEndpoint = "https://s1451477.eu-nbg-2.betterstackdata.com/";

// Unbidden Ink (Pipedream) API configuration
extern const bool enableUnbiddenInk;          // Enable/disable Unbidden Ink feature
extern const char *unbiddenInkApiToken;       // Pipedream API token (Bearer prefix added automatically)
extern const char *unbiddenInkApiEndpoint;    // Pipedream Unbidden Ink API URL
extern const int unbiddenInkStartHour;        // Working hours start (24-hour format)
extern const int unbiddenInkEndHour;          // Working hours end (24-hour format)
extern const int unbiddenInkFrequencyMinutes; // Send 1 message in every X minute window

// ========================================
// APPLICATION SETTINGS
// ========================================
static const int maxCharacters = 1000; // Max characters per message (single source of truth)
static const int totalRiddles = 545;   // Total riddles in riddles.ndjson
static const char *apiUserAgent = "Scribe Thermal Printer (https://github.com/Pharkie/scribe)";

// ========================================
// SYSTEM PERFORMANCE SETTINGS
// ========================================
// Memory monitoring
static const unsigned long memCheckInterval = 60000; // 60 seconds (memory check frequency)

// Web server configuration
static const int webServerPort = 80; // HTTP port for web server

// Watchdog configuration
const int watchdogTimeoutSeconds = 8; // Watchdog timeout in seconds

// ========================================
// INPUT VALIDATION LIMITS
// ========================================
// Rate limiting configuration
static const unsigned long minRequestInterval = 100;  // 100ms minimum between requests
static const unsigned long maxRequestsPerMinute = 60; // 60 requests per minute
static const unsigned long rateLimitWindowMs = 60000; // 1 minute rate limit window

// Message validation limits
static const int maxControlCharPercent = 10; // Max control characters as percentage of message length

// JSON and payload limits
static const int maxJsonPayloadSize = 8192;      // 8KB max JSON payload size
static const int maxMqttTopicLength = 128;       // Max MQTT topic length
static const int maxParameterLength = 1000;      // Default max parameter length
static const int maxRemoteParameterLength = 100; // Max length for remote parameter
static const int maxUriDisplayLength = 200;      // Max URI length for display (truncated after this)

// Document buffer sizes for JSON processing
static const int jsonDocumentSize = 1024;      // Standard JSON document buffer size
static const int largeJsonDocumentSize = 2048; // Large JSON document buffer size

// Array size limits for embedded constraints
static const int maxValidationErrors = 10; // Max validation errors to store
static const int maxOtherPrinters = 10;    // Max other printers to track
static const int stringBufferSize = 64;    // Standard string buffer size
static const int topicBufferSize = 64;     // MQTT topic buffer size

// Configuration validation limits
static const int maxWifiPasswordLength = 64; // Max WiFi password length
static const int maxTimezoneLength = 64;     // Max timezone string length

// Content validation thresholds
static const int minJokeLength = 10; // Minimum joke length to be considered valid

#endif
