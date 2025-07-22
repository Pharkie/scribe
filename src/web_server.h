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
    bool hasData;
};

// Forward declarations
extern WebServer server;
extern Receipt currentReceipt;
extern const char *mdnsHostname;

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
 * @brief Handle requests to /character-test endpoint
 * Prints a comprehensive character test to the thermal printer
 */
void handleCharacterTest();

/**
 * @brief Handle 404 errors for unmatched routes
 */
void handleNotFound();

#endif // WEB_SERVER_H
