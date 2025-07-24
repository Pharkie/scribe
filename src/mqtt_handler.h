#ifndef MQTT_HANDLER_H
#define MQTT_HANDLER_H

#include <Arduino.h>
#include <PubSubClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include "config.h"

// External MQTT objects
extern WiFiClientSecure wifiSecureClient;
extern PubSubClient mqttClient;
extern unsigned long lastMQTTReconnectAttempt;
extern const unsigned long mqttReconnectInterval;

// Function declarations
void setupMQTT();
void connectToMQTT();
void mqttCallback(char *topic, byte *payload, unsigned int length);
void handleMQTTMessage(String message);
void handleMQTTConnection();

#endif // MQTT_HANDLER_H
