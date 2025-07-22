#ifndef WEB_APP_H
#define WEB_APP_H

#include <Arduino.h>

/**
 * @file web_app.h
 * @brief Web application interface for Life Receipt thermal printer
 *
 * Contains the HTML, CSS, and JavaScript for the web interface that allows
 * users to submit messages for printing on the thermal printer.
 *
 * Features:
 * - Modern responsive design using Tailwind CSS
 * - Character counter with visual feedback
 * - Confetti animation on successful submission
 * - Enter key submission support
 * - Real-time feedback messages
 */

/**
 * @brief Get the complete HTML content for the web application
 * @param maxReceiptChars Maximum number of characters allowed in a receipt
 * @return String containing the complete HTML page
 */
String getWebAppHTML(int maxReceiptChars);

#endif // WEB_APP_H
