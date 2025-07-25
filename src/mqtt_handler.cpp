#include "mqtt_handler.h"
#include "time_utils.h"
#include "printer.h"
#include "logging.h"
#include <WiFi.h>
#include <esp_task_wdt.h>

// MQTT objects
WiFiClientSecure wifiSecureClient;
PubSubClient mqttClient(wifiSecureClient);
unsigned long lastMQTTReconnectAttempt = 0;
const unsigned long mqttReconnectInterval = 5000; // 5 seconds

// === MQTT Functions ===
void setupMQTT()
{
    // Configure TLS for anonymous/insecure connection (no certificate verification)
    wifiSecureClient.setInsecure(); // This allows TLS without certificate verification

    // Feed watchdog after TLS configuration
    esp_task_wdt_reset();

    mqttClient.setServer(mqttServer, mqttPort);
    mqttClient.setCallback(mqttCallback);

    // Set buffer size for larger messages
    mqttClient.setBufferSize(4096);

    // Feed watchdog before TLS connection attempt
    esp_task_wdt_reset();

    // Initial connection attempt
    connectToMQTT();

    LOG_VERBOSE("MQTT", "MQTT server configured: %s:%d | Inbox topic: %s | TLS mode: Insecure (no certificate verification) | Buffer size: 4096 bytes", mqttServer, mqttPort, localPrinter[1]);
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

    // Feed watchdog before potentially blocking MQTT connection
    esp_task_wdt_reset();

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

    // Feed watchdog again after connection attempt
    esp_task_wdt_reset();

    if (connected)
    {
        // Subscribe to the inbox topic
        if (mqttClient.subscribe(localPrinter[1]))
        {
            LOG_VERBOSE("MQTT", "MQTT connected. Subscribed to topic: %s", localPrinter[1]);
        }
        else
        {
            LOG_ERROR("MQTT", "MQTT connected. Failed to subscribe to topic: %s", localPrinter[1]);
        }
    }
    else
    {
        LOG_WARNING("MQTT", "MQTT connection failed, state: %d - Will retry in %d seconds", mqttClient.state(), mqttReconnectInterval / 1000);
    }
}

void mqttCallback(char *topic, byte *payload, unsigned int length)
{
    LOG_VERBOSE("MQTT", "MQTT message received on topic: %s", topic);

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
    DynamicJsonDocument doc(4096); // Increased to match MQTT buffer size
    DeserializationError error = deserializeJson(doc, message);

    if (error)
    {
        Serial.println("Failed to parse MQTT JSON: " + String(error.c_str()));
        return;
    }

    // Extract message from JSON
    if (doc.containsKey("message"))
    {
        String printMessage = doc["message"].as<String>();
        String timestamp = getFormattedDateTime();

        // Print immediately using the existing printWithHeader function
        printWithHeader(timestamp, printMessage);
    }
    else
    {
        Serial.println("MQTT JSON missing 'message' field");
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
