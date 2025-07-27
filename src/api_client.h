#ifndef API_CLIENT_H
#define API_CLIENT_H

#include <Arduino.h>

/**
 * @brief HTTP client utilities for external API communication
 *
 * This module provides functions for making HTTPS requests to external APIs
 * and processing template strings.
 */

/**
 * @brief Make HTTPS API calls with JSON response
 * @param url The API endpoint URL
 * @param userAgent User agent string for the request
 * @param timeoutMs Request timeout in milliseconds (default: 5000)
 * @return String containing the API response, or empty string on failure
 */
String fetchFromAPI(const String &url, const String &userAgent, int timeoutMs = 5000);

/**
 * @brief Simple template replacement function
 * @param templateStr The template string with {{PLACEHOLDER}} markers
 * @param placeholder The placeholder name (without braces)
 * @param value The value to replace the placeholder with
 * @return String with placeholder replaced
 */
String replaceTemplate(String templateStr, const String &placeholder, const String &value);

/**
 * @brief Reverse a string (utility function for answer obfuscation)
 * @param str String to reverse
 * @return Reversed string
 */
String reverseString(const String &str);

#endif // API_CLIENT_H
