#ifndef WEB_SERVER_H
#define WEB_SERVER_H

#include <WebServer.h>
#include <Arduino.h>
#include <LittleFS.h>

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
    bool hasData;
};

// Forward declarations
extern WebServer server;
extern Receipt currentReceipt;

/**
 * @brief Setup all web server routes and handlers
 * @param maxChars Maximum number of characters allowed in receipts
 */
void setupWebServerRoutes(int maxChars);

/**
 * @brief Handle requests to the root path "/"
 * Serves the main web form interface
 */
void handleRoot();

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
 * @brief Load character test content from filesystem
 * Loads the character test content from /character-test.txt file
 * @return String containing the test content
 */
String loadCharacterTestContent();

/**
 * @brief Helper function to reverse a string
 * @param str The string to reverse
 * @return String containing the reversed string
 */
String reverseString(const String &str);

/**
 * @brief Helper function to make HTTPS API calls with JSON response
 * @param url The API endpoint URL
 * @param userAgent User agent string for the request
 * @param timeoutMs Request timeout in milliseconds (default: 5000)
 * @return String containing the API response, or empty string on failure
 */
String fetchFromAPI(const String &url, const String &userAgent, int timeoutMs = 5000);

/**
 * @brief Handle requests to /test endpoint
 * Generates and returns character test content as plain text
 * Content should be sent to printer via /print-local or /mqtt-send endpoints
 */
void handleCharacterTest();

/**
 * @brief Handle requests to /riddle endpoint
 * Generates and returns random riddle content as plain text
 * Content should be sent to printer via /print-local or /mqtt-send endpoints
 */
void handleRiddle();

/**
 * @brief Handle requests to /dadjoke endpoint
 * Fetches and returns random dad joke content as plain text
 * Content should be sent to printer via /print-local or /mqtt-send endpoints
 */
void handleDadJoke();

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
