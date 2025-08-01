/**
 * @file config_utils.h
 * @brief Configuration validation and utilities for Scribe ESP32-C3 Thermal Printer
 * @author Adam Knowles
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

#ifndef CONFIG_UTILS_H
#define CONFIG_UTILS_H

#include "config.h"
#include <string.h>
#include <stdio.h>
#include <ctype.h>
#include <Arduino.h>
#include "../web/validation.h"

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
// SIMPLIFIED CONFIGURATION VALIDATION
// ========================================

// Unified string validation helper
inline bool isValidString(const char *str, int maxLen, const char *fieldName, String &error)
{
    if (!str || strlen(str) == 0)
    {
        error = String(fieldName) + " cannot be empty";
        return false;
    }
    if (strlen(str) > maxLen)
    {
        error = String(fieldName) + " too long (max " + String(maxLen) + " chars)";
        return false;
    }
    return true;
}

// Simple validation functions
inline ValidationResult validateDeviceConfig()
{
    String error;

    // Validate deviceOwner
    if (!isValidString(deviceOwner, 32, "Device owner", error))
    {
        return ValidationResult(false, error.c_str());
    }

    // Check if we have printer configs
    if (numPrinterConfigs == 0)
    {
        return ValidationResult(false, "No printer configurations defined");
    }

    // Find matching printer config and validate it
    const PrinterConfig *config = nullptr;
    for (int i = 0; i < numPrinterConfigs; i++)
    {
        if (strcmp(printerConfigs[i].key, deviceOwner) == 0)
        {
            config = &printerConfigs[i];
            break;
        }
    }

    if (!config)
    {
        return ValidationResult(false, "Device owner not found in printer configurations");
    }

    // Validate current printer config
    if (!isValidString(config->wifiSSID, 32, "WiFi SSID", error) ||
        !isValidString(config->wifiPassword, maxWifiPasswordLength, "WiFi password", error) ||
        !isValidString(config->timezone, maxTimezoneLength, "Timezone", error))
    {
        return ValidationResult(false, error.c_str());
    }

    return ValidationResult(true);
}

// ========================================
// CONFIGURATION ACCESS FUNCTIONS
// ========================================
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
