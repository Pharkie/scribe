#include "network.h"
#include "logging.h"

// Network status variables
unsigned long lastReconnectAttempt = 0;
const unsigned long reconnectInterval = 30000; // 30 seconds

// === Configuration Validation ===
void validateConfig()
{
    Serial.println("Validating configuration...");

    if (strlen(wifiSSID) == 0)
    {
        Serial.println("ERROR: WiFi SSID not configured!");
    }

    if (strlen(mdnsHostname) == 0)
    {
        Serial.println("ERROR: mDNS hostname not configured!");
    }

    Serial.println("Configuration validation complete");
}

// === WiFi Connection ===
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
