/**
 * @file keep_going.h
 * @brief Keep Going feature for automated motivational messages
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

#ifndef KEEP_GOING_H
#define KEEP_GOING_H

#include <Arduino.h>

/**
 * @brief Keep Going feature for automated motivational messages
 *
 * This module handles the automated printing of motivational messages from
 * the Pipedream Keep Going API during configured working hours.
 *
 * Features:
 * - Working hours scheduling (configurable start/end times)
 * - Random timing within frequency windows for natural feel
 * - Pipedream API integration with Bearer token authentication
 * - Automatic fallback to default motivational messages
 * - Integration with existing printing and logging systems
 */

/**
 * @brief Initialize the Keep Going system and schedule first message
 * Should be called during system setup after WiFi and time sync
 */
void initializeKeepGoing();

/**
 * @brief Check if Keep Going message should be sent
 * Should be called regularly from main loop when WiFi is connected
 */
void checkKeepGoing();

/**
 * @brief Check if current time is within configured working hours
 * @return true if within working hours and Keep Going is enabled
 */
bool isInWorkingHours();

/**
 * @brief Schedule the next Keep Going message at random time within frequency window
 * Called automatically after each message is sent
 */
void scheduleNextKeepGoing();

#endif // KEEP_GOING_H
