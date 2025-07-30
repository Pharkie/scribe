/**
 * @file config.cpp
 * @brief Configuration variable definitions for the Scribe ESP32-C3 Thermal Printer
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

#include "config.h"

// Unbidden Ink (Pipedream) API configuration
const bool enableUnbiddenInk = true;                                                                  // Enable/disable Unbidden Ink feature
const char *unbiddenInkApiToken = "8M8Qot@ajK!9y9_7ite7WH*eJGu*FsPDim.uh.y-fbCK9x_fh9BeAi3R*NGDChif"; // Pipedream API token (Bearer prefix added automatically)
const char *unbiddenInkApiEndpoint = "https://eo2t6oktjtgw69u.m.pipedream.net";                       // Pipedream Unbidden Ink API URL
const int unbiddenInkStartHour = 10;                                                                  // Working hours start (24-hour format)
const int unbiddenInkEndHour = 16;                                                                    // Working hours end (24-hour format)
const int unbiddenInkFrequencyMinutes = 60;                                                           // Frequency in minutes between Unbidden Ink messages
