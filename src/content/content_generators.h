/**
 * @file content_generators.h
 * @brief Content generation functions for entertainment endpoints
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

#ifndef CONTENT_GENERATORS_H
#define CONTENT_GENERATORS_H

#include <Arduino.h>

/**
 * @brief Content generation functions for entertainment endpoints
 *
 * This module handles the generation of content for riddles, jokes, quotes,
 * and quiz questions. Content is sourced from local files and external APIs.
 */

/**
 * @brief Generate riddle content from local NDJSON file
 * @return String containing formatted riddle with answer
 */
String generateRiddleContent();

/**
 * @brief Generate joke content from external API with fallback
 * @return String containing formatted joke
 */
String generateJokeContent();

/**
 * @brief Generate quote content from external API with fallback
 * @return String containing formatted quote with attribution
 */
String generateQuoteContent();

/**
 * @brief Generate quiz content from external API with fallback
 * @return String containing formatted multiple choice question with answer
 */
String generateQuizContent();

/**
 * @brief Generate AI content from Unbidden Ink API
 * @return String containing formatted Unbidden Ink content
 */
String generateUnbiddenInkContent();

#endif // CONTENT_GENERATORS_H
