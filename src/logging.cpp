#include "logging.h"
#include "time_utils.h"
#include <esp_task_wdt.h>

// Global instance of multi-output printer
MultiOutputPrint multiOutput;

// Buffer for accumulating MQTT and BetterStack messages
String mqttLogBuffer = "";
String betterStackLogBuffer = "";

size_t MultiOutputPrint::write(uint8_t c)
{
    String message = String((char)c);
    return write((const uint8_t *)message.c_str(), message.length());
}

size_t MultiOutputPrint::write(const uint8_t *buffer, size_t size)
{
    String message;
    for (size_t i = 0; i < size; i++)
    {
        message += (char)buffer[i];
    }

    // Output to Serial if enabled
    if (logToSerial)
    {
        Serial.print(message);
    }

    // Output to file if enabled
    if (logToFile && message.length() > 0)
    {
        logToFileSystem(message);
    }

    // Buffer for MQTT output (send complete lines)
    if (logToMQTT && message.length() > 0)
    {
        mqttLogBuffer += message;
        if (message.endsWith("\n") || message.endsWith("\r\n"))
        {
            mqttLogBuffer.trim();
            if (mqttLogBuffer.length() > 0)
            {
                // Feed watchdog before potentially slow network operation
                esp_task_wdt_reset();

                // Extract log level from the message if possible
                String level = "NOTICE";
                if (mqttLogBuffer.indexOf("[ERROR]") >= 0)
                    level = "ERROR";
                else if (mqttLogBuffer.indexOf("[WARNING]") >= 0)
                    level = "WARNING";
                else if (mqttLogBuffer.indexOf("[FATAL]") >= 0)
                    level = "FATAL";
                else if (mqttLogBuffer.indexOf("[VERBOSE]") >= 0)
                    level = "VERBOSE";
                else if (mqttLogBuffer.indexOf("[TRACE]") >= 0)
                    level = "TRACE";

                logToMQTTTopic(mqttLogBuffer, level);
                mqttLogBuffer = "";
            }
        }
    }

    // Buffer for BetterStack output (send complete lines)
    if (logToBetterStack && message.length() > 0)
    {
        betterStackLogBuffer += message;
        if (message.endsWith("\n") || message.endsWith("\r\n"))
        {
            betterStackLogBuffer.trim();
            if (betterStackLogBuffer.length() > 0)
            {
                // Feed watchdog before potentially slow network operation
                esp_task_wdt_reset();

                // Extract log level from the message if possible
                String level = "info";
                if (betterStackLogBuffer.indexOf("[ERROR]") >= 0)
                    level = "error";
                else if (betterStackLogBuffer.indexOf("[WARNING]") >= 0)
                    level = "warn";
                else if (betterStackLogBuffer.indexOf("[FATAL]") >= 0)
                    level = "fatal";
                else if (betterStackLogBuffer.indexOf("[VERBOSE]") >= 0)
                    level = "debug";
                else if (betterStackLogBuffer.indexOf("[TRACE]") >= 0)
                    level = "trace";

                logToBetterStackService(betterStackLogBuffer, level);
                betterStackLogBuffer = "";
            }
        }
    }

    return size;
}

void setupLogging()
{
    // Initialize ArduinoLog with our custom multi-output
    Log.begin(logLevel, &multiOutput);

    // Set prefixes and suffixes for clean formatting
    Log.setPrefix([](Print *_logOutput, int logLevel)
                  {
        String timestamp = getFormattedDateTime();
        String levelStr = getLogLevelString(logLevel);
        _logOutput->print("[");
        _logOutput->print(timestamp);
        _logOutput->print("] [");
        _logOutput->print(levelStr);
        _logOutput->print("] "); });

    Log.setSuffix([](Print *_logOutput, int logLevel)
                  {
        // Add newline at end of each log message
        _logOutput->println(); });

    // Create logs directory if logging to file
    if (logToFile)
    {
        if (LittleFS.begin())
        {
            LittleFS.mkdir("/logs");
        }
    }

    // Logging system is now ready - initialization message will be logged from main.cpp
}

void logToFileSystem(const String &message)
{
    if (!LittleFS.begin())
    {
        return;
    }

    // Check if log rotation is needed
    if (LittleFS.exists(logFileName))
    {
        File logFile = LittleFS.open(logFileName, "r");
        if (logFile && logFile.size() > maxLogFileSize)
        {
            logFile.close();
            rotateLogFile();
        }
        else if (logFile)
        {
            logFile.close();
        }
    }

    // Append to log file
    File logFile = LittleFS.open(logFileName, "a");
    if (logFile)
    {
        logFile.print(message);
        logFile.close();
    }
}

void logToMQTTTopic(const String &message, const String &level)
{
    if (mqttClient.connected() && message.length() > 0)
    {
        // Feed watchdog before potentially slow network operation
        esp_task_wdt_reset();

        String logTopic = "scribe/log";

        // Create JSON log entry
        DynamicJsonDocument doc(1024);
        doc["timestamp"] = getFormattedDateTime();
        doc["device"] = String(mdnsHostname);
        doc["level"] = level;
        doc["message"] = message;

        String payload;
        serializeJson(doc, payload);

        mqttClient.publish(logTopic.c_str(), payload.c_str());
    }
}

void logToBetterStackService(const String &message, const String &level)
{
    if (strlen(betterStackToken) == 0 || WiFi.status() != WL_CONNECTED)
    {
        return;
    }

    // Feed watchdog before potentially slow network operation
    esp_task_wdt_reset();

    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;

    http.begin(client, betterStackEndpoint);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", "Bearer " + String(betterStackToken));

    // Extract component tag from message if present (format: [COMPONENT] message)
    String cleanMessage = message;
    String component = "";

    if (message.startsWith("[") && message.indexOf("] ") > 0)
    {
        int endBracket = message.indexOf("] ");
        component = message.substring(1, endBracket);
        cleanMessage = message.substring(endBracket + 2);
    }

    // Create BetterStack log entry with structured tags
    DynamicJsonDocument doc(1024);
    doc["message"] = cleanMessage;
    doc["level"] = level;
    doc["timestamp"] = getFormattedDateTime();
    doc["hostname"] = String(mdnsHostname);
    doc["service"] = "scribe-printer";

    // Add component as a structured tag if present
    if (component.length() > 0)
    {
        doc["component"] = component;
        // Also add component-specific tags for better filtering
        String lowerComponent = component;
        lowerComponent.toLowerCase();
        doc["tags"] = lowerComponent;
    }

    String payload;
    serializeJson(doc, payload);

    http.POST(payload);
    http.end();

    // Small delay to allow network operation to complete before continuing
    delay(10);
}

void logToMQTTWithComponent(const String &message, const String &level, const String &component)
{
    if (mqttClient.connected() && message.length() > 0)
    {
        String logTopic = "scribe/log";

        // Create JSON log entry with structured component
        DynamicJsonDocument doc(1024);
        doc["timestamp"] = getFormattedDateTime();
        doc["device"] = String(mdnsHostname);
        doc["level"] = level;
        doc["message"] = message;
        doc["component"] = component;

        String payload;
        serializeJson(doc, payload);

        mqttClient.publish(logTopic.c_str(), payload.c_str());
    }
}

void logToBetterStackWithComponent(const String &message, const String &level, const String &component)
{
    if (strlen(betterStackToken) == 0 || WiFi.status() != WL_CONNECTED)
    {
        return;
    }

    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;

    http.begin(client, betterStackEndpoint);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", "Bearer " + String(betterStackToken));

    // Create BetterStack log entry with proper structured logging
    DynamicJsonDocument doc(1024);
    doc["message"] = message;
    doc["level"] = level;
    doc["timestamp"] = getFormattedDateTime();
    doc["hostname"] = String(mdnsHostname);
    doc["service"] = "scribe-printer";
    doc["component"] = component;

    String payload;
    serializeJson(doc, payload);

    http.POST(payload);
    http.end();
}

void rotateLogFile()
{
    if (!LittleFS.begin())
    {
        return;
    }

    // Remove old backup if it exists
    String backupName = String(logFileName) + ".old";
    if (LittleFS.exists(backupName))
    {
        LittleFS.remove(backupName);
    }

    // Rename current log to backup
    if (LittleFS.exists(logFileName))
    {
        LittleFS.rename(logFileName, backupName);
    }
}

String getLogLevelString(int level)
{
    switch (level)
    {
    case LOG_LEVEL_SILENT:
        return "SILENT";
    case LOG_LEVEL_FATAL:
        return "FATAL";
    case LOG_LEVEL_ERROR:
        return "ERROR";
    case LOG_LEVEL_WARNING:
        return "WARNING";
    case LOG_LEVEL_NOTICE:
        return "NOTICE";
    case LOG_LEVEL_TRACE:
        return "TRACE";
    case LOG_LEVEL_VERBOSE:
        return "VERBOSE";
    default:
        return "UNKNOWN";
    }
}

void logWithComponent(const char *component, int level, const char *format, ...)
{
    // Check if this log level should be processed
    if (level > logLevel)
    {
        return; // Skip logging if level is higher than configured threshold
    }

    // Format the message
    va_list args;
    va_start(args, format);
    char buffer[512];
    vsnprintf(buffer, sizeof(buffer), format, args);
    va_end(args);

    String message = String(buffer);
    String levelStr = getLogLevelString(level);

    // Log to Serial/File with component tag (if enabled)
    if (logToSerial || logToFile)
    {
        String formattedMessage = "[" + String(component) + "] " + message;

        // Use ArduinoLog for Serial/File outputs
        switch (level)
        {
        case LOG_LEVEL_ERROR:
            Log.error(formattedMessage.c_str());
            break;
        case LOG_LEVEL_WARNING:
            Log.warning(formattedMessage.c_str());
            break;
        case LOG_LEVEL_VERBOSE:
            Log.verbose(formattedMessage.c_str());
            break;
        default:
            Log.notice(formattedMessage.c_str());
            break;
        }
    }

    // Send structured logs directly to MQTT/BetterStack (without component prefix)
    if (logToMQTT && mqttClient.connected())
    {
        logToMQTTWithComponent(message, levelStr, component);
    }

    if (logToBetterStack && WiFi.status() == WL_CONNECTED)
    {
        logToBetterStackWithComponent(message, levelStr, component);
    }
}
