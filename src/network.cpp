#include "network.h"
#include "logging.h"
#include "config_utils.h"

// Network status variables
unsigned long lastReconnectAttempt = 0;
const unsigned long reconnectInterval = 30000; // 30 seconds

// === Configuration Validation ===
void validateConfig()
{
    Serial.println("=== VALIDATING CONFIGURATION ===");

    // Check deviceOwner is set
    if (!deviceOwner || strlen(deviceOwner) == 0)
    {
        Serial.println("ERROR: deviceOwner not configured!");
        return;
    }

    Serial.print("Device owner: ");
    Serial.println(deviceOwner);

    // Check runtime variables are initialized (should be set by initializePrinterConfig)
    Serial.print("Checking wifiSSID... ");
    if (!wifiSSID)
    {
        Serial.println("ERROR: wifiSSID is NULL! Did initializePrinterConfig() run?");
        return;
    }
    else if (strlen(wifiSSID) == 0)
    {
        Serial.println("ERROR: wifiSSID is empty string!");
        return;
    }
    else
    {
        Serial.print("OK: ");
        Serial.println(wifiSSID);
    }

    Serial.print("Checking wifiPassword... ");
    if (!wifiPassword)
    {
        Serial.println("ERROR: wifiPassword is NULL!");
        return;
    }
    else if (strlen(wifiPassword) == 0)
    {
        Serial.println("ERROR: wifiPassword is empty string!");
        return;
    }
    else
    {
        Serial.print("OK: ");
        Serial.println(wifiPassword);
    }

    // Check local printer configuration
    if (!getLocalPrinterName() || strlen(getLocalPrinterName()) == 0)
    {
        Serial.println("ERROR: Local printer name not configured!");
        return;
    }

    if (!getLocalPrinterTopic() || strlen(getLocalPrinterTopic()) == 0)
    {
        Serial.println("ERROR: Local printer MQTT topic not configured!");
        return;
    }

    Serial.print("Local printer: ");
    Serial.print(getLocalPrinterName());
    Serial.print(" -> ");
    Serial.println(getLocalPrinterTopic()); // Check mDNS hostname
    if (!mdnsHostname || strlen(mdnsHostname) == 0)
    {
        Serial.println("ERROR: mDNS hostname not configured!");
        return;
    }

    Serial.print("mDNS hostname: ");
    Serial.println(mdnsHostname);

    Serial.println("=== CONFIGURATION VALIDATION COMPLETE - ALL OK ===");
} // === WiFi Connection ===
void connectToWiFi()
{
    Serial.print("Connecting to WiFi: ");
    Serial.println(wifiSSID);

    WiFi.begin(wifiSSID, wifiPassword);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30)
    {
        delay(1000);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED)
    {
        Serial.println();
        Serial.println("WiFi connected successfully!");
        Serial.print("IP address: ");
        Serial.println(WiFi.localIP());
    }
    else
    {
        Serial.println();
        Serial.println("Failed to connect to WiFi - continuing anyway");
        Serial.println("Will attempt reconnection every 30 seconds in main loop");
    }
}

// === mDNS Setup ===
void setupmDNS()
{
    if (MDNS.begin(mdnsHostname))
    {
        Serial.println("mDNS responder started");
        Serial.println("Access the form at: http://" + String(mdnsHostname) + ".local");

        // Add service to MDNS-SD
        MDNS.addService("http", "tcp", 80);
    }
    else
    {
        Serial.println("Error setting up mDNS responder!");
    }

    LOG_VERBOSE("NETWORK", "mDNS set up");
}

// === WiFi Reconnection Handler ===
void handleWiFiReconnection()
{
    // Check WiFi connection and reconnect if needed
    if (WiFi.status() != WL_CONNECTED)
    {
        if (millis() - lastReconnectAttempt > reconnectInterval)
        {
            Serial.println("WiFi disconnected, attempting reconnection...");
            WiFi.begin(wifiSSID, wifiPassword);
            lastReconnectAttempt = millis();
        }
    }
}
