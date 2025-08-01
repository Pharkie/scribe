/**
 * @file web_server.cpp
 * @brief Core web server setup and routing for Scribe ESP32-C3 Thermal Printer
 * @author Adam Knowles
 * @date 2025
 * @copyright Copyright (c) 2025 Adam Knowles. All rights reserved.
 * @license Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 *
 * This file is part of the Scribe ESP32-C3 Thermal Printer project.
 *
 * This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0
 * International License. To view a copy of this license, visit
 * http://creativecommons.org/licenses/by-nc-sa/4.0/ or send a letter to
 * Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
 *
 * Commercial use is prohibited without explicit written permission from the author.
 * For commercial licensing inquiries, please contact Adam Knowles.
 *
 * Based on the original Project Scribe by UrbanCircles.
 */

#include "web_server.h"
#include "validation.h"
#include "web_handlers.h"
#include "../content/content_handlers.h"
#include "api_handlers.h"
#include "../core/shared_types.h"
#include <LittleFS.h>

// External variable declarations
extern WebServer server;

// Global message storage for printing
Message currentMessage = {"", "", false};

void setupWebServerRoutes(int maxChars)
{
    // Store the maxChars value for validation
    setMaxCharacters(maxChars);

    // Static file handlers
    server.serveStatic("/", LittleFS, "/html/index.html");

    // Generic static file serving from LittleFS
    server.serveStatic("/css/", LittleFS, "/css/");
    server.serveStatic("/js/", LittleFS, "/js/");
    server.serveStatic("/html/", LittleFS, "/html/");
    server.serveStatic("/favicon.ico", LittleFS, "/favicon.ico");
    server.serveStatic("/diagnostics.html", LittleFS, "/html/diagnostics.html");

    // Configuration endpoint for JavaScript
    server.on("/config", HTTP_GET, handleConfig);

    // Form submission handlers
    server.on("/print-local", HTTP_POST, handleMessage);
    server.on("/print-local", HTTP_GET, handleMessage);
    server.on("/scribe-message", HTTP_POST, handleMessage);

    // Content generation endpoints
    server.on("/print-test", HTTP_POST, handlePrintTest);
    server.on("/riddle", HTTP_POST, handleRiddle);
    server.on("/joke", HTTP_POST, handleJoke);
    server.on("/quote", HTTP_POST, handleQuote);
    server.on("/quiz", HTTP_POST, handleQuiz);
    server.on("/unbidden-ink", HTTP_POST, handleUnbiddenInk);

    // API endpoints
    server.on("/status", HTTP_GET, handleStatus);
    server.on("/buttons", HTTP_GET, handleButtons);
    server.on("/mqtt-send", HTTP_POST, handleMQTTSend);
    server.on("/unbiddenink-settings", HTTP_GET, handleUnbiddenInkSettingsGet);
    server.on("/unbiddenink-settings", HTTP_POST, handleUnbiddenInkSettingsPost);

    // Handle 404
    server.onNotFound(handleNotFound);
}
