/**
 * @file config_utils.cpp
 * @brief Implementation of configuration validation and utilities
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

#include "config_utils.h"
#include "config.h"

// Function implementations
const char *getDeviceOwnerKey()
{
    return deviceOwner;
}

const PrinterConfig *getCurrentPrinterConfig()
{
    for (int i = 0; i < sizeof(printerConfigs) / sizeof(printerConfigs[0]); i++)
    {
        if (strcmp(printerConfigs[i].key, deviceOwner) == 0)
        {
            return &printerConfigs[i];
        }
    }
    return nullptr;
}

const char *getWiFiSSID()
{
    const PrinterConfig *config = getCurrentPrinterConfig();
    return config ? config->wifiSSID : "";
}

const char *getWiFiPassword()
{
    const PrinterConfig *config = getCurrentPrinterConfig();
    return config ? config->wifiPassword : "";
}
