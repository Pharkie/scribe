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

#endif // CONTENT_GENERATORS_H
