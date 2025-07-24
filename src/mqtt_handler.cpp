#include "mqtt_handler.h"
#include "time_utils.h"
#include "printer.h"
#include <WiFi.h>

// MQTT objects
WiFiClientSecure wifiSecureClient;
PubSubClient mqttClient(wifiSecureClient);
unsigned long lastMQTTReconnectAttempt = 0;
const unsigned long mqttReconnectInterval = 5000; // 5 seconds

// === MQTT Functions ===
void setupMQTT()
{
    Serial.println("Setting up MQTT...");

    // Configure TLS for anonymous/insecure connection (no certificate verification)
    wifiSecureClient.setInsecure(); // This allows TLS without certificate verification

    mqttClient.setServer(mqttServer, mqttPort);
    mqttClient.setCallback(mqttCallback);

    Serial.println("MQTT server configured: " + String(mqttServer) + ":" + String(mqttPort));
    Serial.println("MQTT inbox topic: " + String(localPrinter[1]));
    Serial.println("TLS mode: Insecure (no certificate verification)");

    // Initial connection attempt
    connectToMQTT();
}

void connectToMQTT()
{
    if (WiFi.status() != WL_CONNECTED)
    {
        Serial.println("WiFi not connected, skipping MQTT connection");
        return;
    }

    String clientId = "ScribePrinter-" + String(random(0xffff), HEX);

    Serial.print("Attempting MQTT connection as client: ");
    Serial.println(clientId);

    bool connected = false;

    // Try connection with or without credentials
    if (strlen(mqttUsername) > 0 && strlen(mqttPassword) > 0)
    {
        connected = mqttClient.connect(clientId.c_str(), mqttUsername, mqttPassword);
    }
    else
    {
        connected = mqttClient.connect(clientId.c_str());
    }

    if (connected)
    {
        Serial.println("MQTT connected successfully!");

        // Subscribe to the inbox topic
        if (mqttClient.subscribe(localPrinter[1]))
        {
            Serial.println("Subscribed to topic: " + String(localPrinter[1]));
        }
        else
        {
            Serial.println("Failed to subscribe to topic: " + String(localPrinter[1]));
        }
    }
    else
    {
        Serial.print("MQTT connection failed, state: ");
        Serial.println(mqttClient.state());
        Serial.println("Will retry in " + String(mqttReconnectInterval / 1000) + " seconds");
    }
}

void mqttCallback(char *topic, byte *payload, unsigned int length)
{
    Serial.println("MQTT message received on topic: " + String(topic));

    // Convert payload to string
    String message = "";
    for (unsigned int i = 0; i < length; i++)
    {
        message += (char)payload[i];
    }

    Serial.println("MQTT payload: " + message);

    // Handle the MQTT message
    handleMQTTMessage(message);
}

void handleMQTTMessage(String message)
{
    // Parse JSON message
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, message);

    if (error)
    {
        Serial.println("Failed to parse MQTT JSON: " + String(error.c_str()));
        Serial.println("Raw message: " + message);
        return;
    }

    // Extract message from JSON
    if (doc.containsKey("message"))
    {
        String printMessage = doc["message"].as<String>();
        String timestamp = getFormattedDateTime();

        Serial.println("Printing MQTT message: " + printMessage);

        // Print immediately using the existing printWithHeader function
        printWithHeader(timestamp, printMessage);

        Serial.println("MQTT message printed successfully");
    }
    else
    {
        Serial.println("MQTT JSON missing 'message' field");
        Serial.println("Expected format: {\"message\": \"Your message here\"}");
    }
}

// === MQTT Connection Handler ===
void handleMQTTConnection()
{
    // Handle MQTT connection and messages
    if (!mqttClient.connected())
    {
        if (millis() - lastMQTTReconnectAttempt > mqttReconnectInterval)
        {
            Serial.println("MQTT disconnected, attempting reconnection...");
            connectToMQTT();
            lastMQTTReconnectAttempt = millis();
        }
    }
    else
    {
        mqttClient.loop(); // Handle incoming MQTT messages
    }
}
