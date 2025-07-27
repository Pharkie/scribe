#ifndef CONFIG_UTILS_H
#define CONFIG_UTILS_H

#include "config.h"
#include <string.h>
#include <stdio.h>
#include <ctype.h>
#include <Arduino.h>

// ========================================
// STRING BUILDING UTILITIES
// ========================================

// Global string buffers
// Static string buffers for efficiency
static char derivedMqttTopic[stringBufferSize];
static char derivedMdnsHostname[stringBufferSize];
static char otherTopics[maxOtherPrinters][topicBufferSize];

// String building functions
inline const char *buildMqttTopic(const char *key)
{
    snprintf(derivedMqttTopic, sizeof(derivedMqttTopic), "scribe/%s/inbox", key);
    return derivedMqttTopic;
}

inline const char *buildMdnsHostname(const char *key)
{
    snprintf(derivedMdnsHostname, sizeof(derivedMdnsHostname), "scribe-%s", key);
    // Convert to lowercase for URL compatibility
    for (int i = 0; derivedMdnsHostname[i]; i++)
    {
        derivedMdnsHostname[i] = tolower(derivedMdnsHostname[i]);
    }
    return derivedMdnsHostname;
}

inline const char *buildPersistentMqttTopic(int index, const char *key)
{
    if (index >= 0 && index < maxOtherPrinters)
    {
        snprintf(otherTopics[index], sizeof(otherTopics[index]), "scribe/%s/inbox", key);
        return otherTopics[index];
    }
    return "";
}

// ========================================
// CONFIGURATION VALIDATION FRAMEWORK
// ========================================
struct ValidationResult
{
    bool isValid;
    const char *errors[maxValidationErrors]; // Fixed array for embedded systems
    int errorCount;
    String errorMessage; // For simple cases

    ValidationResult() : isValid(true), errorCount(0) {}

    ValidationResult(bool valid, const char *message = "") : isValid(valid), errorCount(0)
    {
        if (!valid && message && strlen(message) > 0)
        {
            errorMessage = String(message);
            addError(message);
        }
    }

    ValidationResult(bool valid, const String &message) : isValid(valid), errorCount(0)
    {
        if (!valid && message.length() > 0)
        {
            errorMessage = message;
            addError(message.c_str());
        }
    }

    void addError(const char *error)
    {
        if (errorCount < maxValidationErrors)
        {
            errors[errorCount++] = error;
            isValid = false;
        }
    }
};

class ConfigValidator
{
private:
    static ValidationResult result;

public:
    static ValidationResult validatePrinterConfig(const PrinterConfig &config)
    {
        ValidationResult result;

        // Validate key
        if (!config.key || strlen(config.key) == 0)
        {
            result.addError("Printer key cannot be empty");
        }
        else if (strlen(config.key) > 32)
        {
            result.addError("Printer key too long (max 32 chars)");
        }

        // Validate WiFi SSID
        if (!config.wifiSSID || strlen(config.wifiSSID) == 0)
        {
            result.addError("WiFi SSID cannot be empty");
        }
        else if (strlen(config.wifiSSID) > 32)
        {
            result.addError("WiFi SSID too long (max 32 chars)");
        }

        // Validate WiFi password
        if (!config.wifiPassword || strlen(config.wifiPassword) == 0)
        {
            result.addError("WiFi password cannot be empty");
        }
        else if (strlen(config.wifiPassword) > maxWifiPasswordLength)
        {
            result.addError("WiFi password too long (max 64 chars)");
        }

        // Validate timezone
        if (!config.timezone || strlen(config.timezone) == 0)
        {
            result.addError("Timezone cannot be empty");
        }
        else if (strlen(config.timezone) > maxTimezoneLength)
        {
            result.addError("Timezone string too long (max 64 chars)");
        }

        return result;
    }

    static ValidationResult validateDeviceOwner()
    {
        ValidationResult result;

        if (!deviceOwner || strlen(deviceOwner) == 0)
        {
            result.addError("deviceOwner cannot be empty");
            return result;
        }

        // Check if deviceOwner exists in printer configs
        bool found = false;
        for (int i = 0; i < numPrinterConfigs; i++)
        {
            if (strcmp(printerConfigs[i].key, deviceOwner) == 0)
            {
                found = true;
                break;
            }
        }

        if (!found)
        {
            result.addError("deviceOwner not found in printer configurations");
        }

        return result;
    }

    static ValidationResult validateAllPrinterConfigs()
    {
        ValidationResult result;

        if (numPrinterConfigs == 0)
        {
            result.addError("No printer configurations defined");
            return result;
        }

        // Validate each printer config
        for (int i = 0; i < numPrinterConfigs; i++)
        {
            ValidationResult configResult = validatePrinterConfig(printerConfigs[i]);
            if (!configResult.isValid)
            {
                // Combine errors (simplified for embedded)
                for (int j = 0; j < configResult.errorCount && result.errorCount < maxValidationErrors; j++)
                {
                    result.addError(configResult.errors[j]);
                }
            }
        }

        // Check for duplicate keys
        for (int i = 0; i < numPrinterConfigs; i++)
        {
            for (int j = i + 1; j < numPrinterConfigs; j++)
            {
                if (strcmp(printerConfigs[i].key, printerConfigs[j].key) == 0)
                {
                    result.addError("Duplicate printer keys found");
                    break;
                }
            }
        }

        return result;
    }

    static ValidationResult validateComplete()
    {
        ValidationResult result;

        // Validate all printer configs
        ValidationResult configsResult = validateAllPrinterConfigs();
        if (!configsResult.isValid)
        {
            for (int i = 0; i < configsResult.errorCount && result.errorCount < 10; i++)
            {
                result.addError(configsResult.errors[i]);
            }
        }

        // Validate device owner
        ValidationResult ownerResult = validateDeviceOwner();
        if (!ownerResult.isValid)
        {
            for (int i = 0; i < ownerResult.errorCount && result.errorCount < 10; i++)
            {
                result.addError(ownerResult.errors[i]);
            }
        }

        return result;
    }
};

// Helper functions to get configuration values dynamically
inline const PrinterConfig *findPrinterConfig(const char *key)
{
    for (int i = 0; i < numPrinterConfigs; i++)
    {
        if (strcmp(printerConfigs[i].key, key) == 0)
        {
            return &printerConfigs[i];
        }
    }
    return nullptr;
}

// Function declarations
const char *getDeviceOwnerKey();

inline const char *getWifiSSID()
{
    const PrinterConfig *config = findPrinterConfig(deviceOwner);
    return config ? config->wifiSSID : "INVALID_SSID";
}

inline const char *getWifiPassword()
{
    const PrinterConfig *config = findPrinterConfig(deviceOwner);
    return config ? config->wifiPassword : "INVALID_PASSWORD";
}

inline const char *getLocalPrinterName()
{
    const PrinterConfig *config = findPrinterConfig(deviceOwner);
    return config ? config->key : "INVALID_PRINTER";
}

inline const char *getLocalPrinterTopic()
{
    const PrinterConfig *config = findPrinterConfig(deviceOwner);
    if (config)
    {
        return buildMqttTopic(config->key);
    }
    return "scribe/invalid/inbox";
}

inline const char *getMdnsHostname()
{
    const PrinterConfig *config = findPrinterConfig(deviceOwner);
    if (config)
    {
        return buildMdnsHostname(config->key);
    }
    return "scribe-invalid";
}

inline const char *getTimezone()
{
    const PrinterConfig *config = findPrinterConfig(deviceOwner);
    return config ? config->timezone : "UTC";
}

// Function to get other printers (all except current deviceOwner)
inline int getOtherPrinters(const char *otherPrinters[][2], int maxPrinters)
{
    int count = 0;
    for (int i = 0; i < numPrinterConfigs && count < maxPrinters; i++)
    {
        if (strcmp(printerConfigs[i].key, deviceOwner) != 0)
        {
            // Use key directly as the name
            otherPrinters[count][0] = printerConfigs[i].key;
            // Use persistent buffer for MQTT topic
            otherPrinters[count][1] = buildPersistentMqttTopic(count, printerConfigs[i].key);
            count++;
        }
    }
    return count;
}

// Simple initialization function
inline void initializePrinterConfig()
{
    Serial.begin(115200);
    delay(100);
    Serial.println("=== PRINTER CONFIG INITIALIZED ===");
    Serial.print("Device owner: ");
    Serial.println(deviceOwner);
    Serial.print("WiFi SSID: ");
    Serial.println(getWifiSSID());
    Serial.print("Local printer: ");
    Serial.println(getLocalPrinterName());
    Serial.print(" -> Topic: ");
    Serial.println(getLocalPrinterTopic());

    // Show other printers
    const char *others[10][2]; // Max 10 other printers
    int numOthers = getOtherPrinters(others, 10);
    Serial.print("Other printers: ");
    Serial.println(numOthers);
    for (int i = 0; i < numOthers; i++)
    {
        Serial.print("  - ");
        Serial.print(others[i][0]);
        Serial.print(" -> ");
        Serial.println(others[i][1]);
    }
    Serial.println("=== CONFIG COMPLETE ===");
}

#endif
