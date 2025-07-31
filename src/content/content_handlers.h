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
 * @brief Handle unified message endpoint (supports both local printing and MQTT routing)
 */
void handleMessage();

// ========================================
// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * @brief Load print test content from filesystem
 * @return String containing the test content
 */
String loadPrintTestContent();

#endif // CONTENT_HANDLERS_H
