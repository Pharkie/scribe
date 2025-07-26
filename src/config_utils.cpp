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
