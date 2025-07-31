/**
 * @file api_handlers.h
 * @brief API endpoint handlers (status, MQTT, settings, etc.)
 * @author Adam Knowles
 * @date 2025
 * @copyright Copyright (c) 2025 Adam Knowles. All rights reserved.
 * @license Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 */

#ifndef API_HANDLERS_H
#define API_HANDLERS_H

#include <Arduino.h>

// ========================================
// API ENDPOINT HANDLERS
// ========================================

/**
 * @brief Handle system status request
 */
void handleStatus();

/**
 * @brief Handle hardware button configuration request
 */
void handleButtons();

/**
 * @brief Handle MQTT message sending request
 */
void handleMQTTSend();

/**
 * @brief Handle Unbidden Ink settings GET request
 */
void handleUnbiddenInkSettingsGet();

/**
 * @brief Handle Unbidden Ink settings POST request
 */
void handleUnbiddenInkSettingsPost();

#endif // API_HANDLERS_H
