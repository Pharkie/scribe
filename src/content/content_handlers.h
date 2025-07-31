/**
 * @file content_handlers.h
 * @brief Content generation request handlers (riddle, joke, quote, etc.)
 * @author Adam Knowles
 * @date 2025
 * @copyright Copyright (c) 2025 Adam Knowles. All rights reserved.
 * @license Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 */

#ifndef CONTENT_HANDLERS_H
#define CONTENT_HANDLERS_H

#include <Arduino.h>
#include <PubSubClient.h>
#include "../core/shared_types.h"

// External variable reference
extern Message currentMessage;

// ========================================
// CONTENT GENERATION HANDLERS
// ========================================

/**
 * @brief Handle riddle content generation request
 */
void handleRiddle();

/**
 * @brief Handle joke content generation request
 */
void handleJoke();

/**
 * @brief Handle quote content generation request
 */
void handleQuote();

/**
 * @brief Handle quiz content generation request
 */
void handleQuiz();

/**
 * @brief Handle Unbidden Ink content generation request
 */
void handleUnbiddenInk();

/**
 * @brief Handle print test request
 */
void handlePrintTest();

/**
 * @brief Handle form submission for custom messages
 */
void handleSubmit();

/**
 * @brief Handle unified message endpoint
 */
void handleMessage();

// ========================================
// UNIFIED PROCESSING FUNCTIONS
// ========================================

/**
 * @brief Process endpoint with unified source handling
 * @param endpoint The endpoint to process (e.g., "/riddle", "/joke")
 * @param destination The destination: "local-direct" for local printing, or MQTT topic for remote
 * @return True if content was generated and handled successfully
 */
bool processEndpoint(const char *endpoint, const char *destination);

/**
 * @brief Process custom message with unified routing
 * @param message The message content
 * @param timestamp The timestamp
 * @param destination The destination: "local-direct" for local printing, or MQTT topic for remote
 * @return True if message was processed successfully
 */
bool processCustomMessage(const String &message, const String &timestamp, const char *destination);

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * @brief Load print test content from filesystem
 * @return String containing the test content
 */
String loadPrintTestContent();

#endif // CONTENT_HANDLERS_H
