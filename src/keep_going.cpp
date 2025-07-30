/**
 * @file keep_going.cpp
 * @brief Implementation of Keep Going feature for automated motivational messages
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

#include "keep_going.h"
#include "config.h"
#include "time_utils.h"
#include "logging.h"
#include "web_server.h"

// Keep Going timing variables
static unsigned long nextKeepGoingTime = 0;

void initializeKeepGoing()
{
    if (!enableKeepGoing)
    {
        return;
    }

    scheduleNextKeepGoing();
    LOG_NOTICE("KEEPGOING", "Keep Going feature enabled - Working hours: %02d:00-%02d:00, Frequency: %d minutes",
               keepGoingStartHour, keepGoingEndHour, keepGoingFrequencyMinutes);
}

bool isInWorkingHours()
{
    if (!enableKeepGoing)
    {
        return false;
    }

    // Get current time from ezTime
    int currentHour = myTZ.hour();

    // Check if current hour is within working hours
    return (currentHour >= keepGoingStartHour && currentHour < keepGoingEndHour);
}

void scheduleNextKeepGoing()
{
    if (!enableKeepGoing)
    {
        return;
    }

    // Calculate random time within the next frequency window
    unsigned long frequencyMs = keepGoingFrequencyMinutes * 60 * 1000; // Convert to milliseconds
    unsigned long randomOffset = random(0, frequencyMs);               // Random time within the window
    nextKeepGoingTime = millis() + randomOffset;

    LOG_VERBOSE("KEEPGOING", "Next Keep Going message scheduled in %lu minutes", randomOffset / (60 * 1000));
}

void checkKeepGoing()
{
    if (!enableKeepGoing)
    {
        return;
    }

    unsigned long currentTime = millis();

    // Check if it's time for a Keep Going message
    if (currentTime >= nextKeepGoingTime && isInWorkingHours())
    {
        LOG_NOTICE("KEEPGOING", "Triggering Keep Going message");
        LOG_VERBOSE("KEEPGOING", "API endpoint: %s", keepGoingApiEndpoint);
        LOG_VERBOSE("KEEPGOING", "Token starts with: %.10s...", keepGoingApiToken);

        // Use the unified endpoint processing to generate and print Keep Going content
        if (processEndpoint("/keep-going", "local-direct"))
        {
            LOG_NOTICE("KEEPGOING", "Keep Going message queued for printing");
        }
        else
        {
            LOG_ERROR("KEEPGOING", "Failed to generate Keep Going content");
        }

        // Schedule the next Keep Going message
        scheduleNextKeepGoing();
    }
}
