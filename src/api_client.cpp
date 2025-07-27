#include "api_client.h"
#include "config.h"
#include "logging.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

String fetchFromAPI(const String &url, const String &userAgent, int timeoutMs)
{
    if (WiFi.status() != WL_CONNECTED)
    {
        LOG_WARNING("API", "API fetch failed - WiFi not connected");
        return "";
    }

    LOG_VERBOSE("API", "Fetching from API: %s", url.c_str());

    WiFiClientSecure client;
    client.setInsecure(); // Skip SSL certificate verification for simplicity
    HTTPClient http;

    // Explicitly specify HTTPS connection
    if (!http.begin(client, url))
    {
        LOG_ERROR("API", "Failed to begin HTTPS connection");
        return "";
    }

    http.addHeader("Accept", "application/json");
    http.addHeader("User-Agent", userAgent);
    http.setTimeout(timeoutMs);

    int httpResponseCode = http.GET();
    String response = "";

    if (httpResponseCode == 200)
    {
        response = http.getString();
    }
    else if (httpResponseCode == 301 || httpResponseCode == 302)
    {
        // Log redirect information for debugging
        String location = http.getLocation();
        LOG_WARNING("API", "Unexpected redirect to: %s", location.c_str());
        LOG_WARNING("API", "Original URL: %s", url.c_str());
    }
    else
    {
        LOG_WARNING("API", "API request failed with code: %d", httpResponseCode);
    }

    http.end();
    return response;
}

String replaceTemplate(String templateStr, const String &placeholder, const String &value)
{
    String marker = "{{" + placeholder + "}}";
    templateStr.replace(marker, value);
    return templateStr;
}

String reverseString(const String &str)
{
    String reversed = "";
    for (int i = str.length() - 1; i >= 0; i--)
    {
        reversed += str[i];
    }
    return reversed;
}
