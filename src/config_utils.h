#ifndef CONFIG_UTILS_H
#define CONFIG_UTILS_H

#include "config.h"
#include <string.h>

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
    return config ? config->printerName : "INVALID_PRINTER";
}

inline const char *getLocalPrinterTopic()
{
    const PrinterConfig *config = findPrinterConfig(deviceOwner);
    return config ? config->mqttTopic : "INVALID_TOPIC";
}

// Function to get other printers (all except current deviceOwner)
inline int getOtherPrinters(const char *otherPrinters[][2], int maxPrinters)
{
    int count = 0;
    for (int i = 0; i < numPrinterConfigs && count < maxPrinters; i++)
    {
        if (strcmp(printerConfigs[i].key, deviceOwner) != 0)
        {
            otherPrinters[count][0] = printerConfigs[i].printerName;
            otherPrinters[count][1] = printerConfigs[i].mqttTopic;
            count++;
        }
    }
    return count;
}

// For compatibility with existing code - these return the dynamic values
#define wifiSSID getWifiSSID()
#define wifiPassword getWifiPassword()

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
