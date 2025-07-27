#ifndef WEB_SERVER_H
#define WEB_SERVER_H

#include <WebServer.h>
#include <Arduino.h>

/**
 * @file web_server.h
 * @brief Web server handling for Life Receipt thermal printer
 *
 * Contains all the HTTP request handlers and routing logic for the thermal
 * printer web interface. Separates web server concerns from main application logic.
 *
 * Features:
 * - Root page serving
 * - Form submission handling
 * - System status API
 * - Character test endpoint
 * - 404 error handling
 */

// Receipt structure definition
struct Receipt
{
    String message;
    String timestamp;
    bool queuedForPrint;
};

// Forward declarations
extern WebServer server;
extern Receipt currentReceipt;

/**
 * @brief Setup all web server routes and handlers
 */
void setupWebServerRoutes(int maxChars);

void handleRoot();

/**
 * @brief Process endpoint and generate content (shared by web and hardware buttons)
 * @param destination "local-direct" for direct local printing, or MQTT topic for MQTT routing
 */
bool processEndpoint(const char *endpoint, const char *destination = "local-direct");

/**
 * @brief Process custom message content with unified routing
 */
bool processCustomMessage(const String &message, const String &timestamp, const char *destination);

void handleSubmit();
void handleStatus();

String loadPrintTestContent();
String reverseString(const String &str);

/**
 * @brief Make HTTPS API calls with JSON response
 */
String fetchFromAPI(const String &url, const String &userAgent, int timeoutMs = 5000);

void handlePrintTest();
void handleRiddle();
void handleJoke();
void handleQuote();
void handleQuiz();

/**
 * @brief Handle form submission from the web interface
 * Processes the text input and queues it for printing
 */
void handleSubmit();

/**
 * @brief Handle requests to /status endpoint
 * Returns JSON status information about the printer
 */
void handleStatus();

/**
 * @brief Load print test content from filesystem
 * Loads the print test content from /print-test.txt file
 * @return String containing the test content
 */
String loadPrintTestContent();

/**
 * @brief Helper function to reverse a string
 * @param str The string to reverse
 * @return String containing the reversed string
 */
String reverseString(const String &str);

void handlePrintTest();

/**
 * @brief Handle requests to /riddle endpoint
 * Generates and returns random riddle content as plain text
 * Content should be sent to printer via /print-local or /mqtt-send endpoints
 */
void handleRiddle();

/**
 * @brief Handle requests to /joke endpoint
 * Fetches and returns random dad joke content as plain text
 * Content should be sent to printer via /print-local or /mqtt-send endpoints
 */
void handleJoke();

/**
 * @brief Handle requests to /quote endpoint
 * Fetches and returns random inspirational quote content as plain text
 * Content should be sent to printer via /print-local or /mqtt-send endpoints
 */
void handleQuote();

/**
 * @brief Handle requests to /quiz endpoint
 * Fetches and returns trivia quiz question with multiple choice answers as plain text
 * Content should be sent to printer via /print-local or /mqtt-send endpoints
 */
void handleQuiz();

/**
 * @brief Handle requests to /message endpoint
 * Unified text message handling that works with source parameter routing
 */
void handleMessage();

/**
 * @brief Handle requests to /buttons endpoint
 * Returns hardware button configuration and status as JSON
 */
void handleButtons();

// ========================================
// CONTENT GENERATION FUNCTIONS
// ========================================
// These functions generate content without web server context
// Can be called from hardware buttons or web handlers

/**
 * @brief Generate riddle content for printing
 * @return String containing formatted riddle content
 */
String generateRiddleContent();

/**
 * @brief Generate joke content for printing
 * @return String containing formatted joke content
 */
String generateJokeContent();

/**
 * @brief Generate quote content for printing
 * @return String containing formatted quote content
 */
String generateQuoteContent();

/**
 * @brief Generate quiz content for printing
 * @return String containing formatted quiz content
 */
String generateQuizContent();

/**
 * @brief Load print test content from filesystem
 * @return String containing print test content
 */
String loadPrintTestContent();

/**
 * @brief Handle requests to /styles.css endpoint
 * Serves the CSS stylesheet from filesystem
 */
void handleCSS();

/**
 * @brief Handle requests to /app.js endpoint
 * Serves the JavaScript file from filesystem
 */
void handleJS();

/**
 * @brief Handle requests to /favicon.ico endpoint
 * Serves the favicon file from filesystem
 */
void handleFavicon();

/**
 * @brief Handle requests to /config endpoint
 * Returns JSON configuration including maxReceiptChars
 */
void handleConfig();

/**
 * @brief Handle 404 errors for unmatched routes
 */
void handleNotFound();

/**
 * @brief Handle MQTT send requests from the web interface
 * Publishes JSON messages to specified MQTT topics for remote printing
 */
void handleMQTTSend();

// Helper functions for file operations
/**
 * @brief Helper function to serve files from LittleFS filesystem
 * @param path The file path to serve (e.g., "/index.html")
 * @param contentType The MIME content type (e.g., "text/html")
 * @return true if file was served successfully, false otherwise
 */
bool serveFileFromLittleFS(const String &path, const String &contentType);

#endif // WEB_SERVER_H
