#include "hardware_buttons.h"
#include "web_server.h"
#include "printer.h"
#include <ArduinoJson.h>
#include <esp_task_wdt.h>

// ========================================
// HARDWARE BUTTON IMPLEMENTATION
// ========================================

void initializeHardwareButtons()
{
    LOG_VERBOSE("BUTTONS", "Initializing %d hardware buttons", numHardwareButtons);

    for (int i = 0; i < numHardwareButtons; i++)
    {
        // Configure GPIO pin
        pinMode(hardwareButtons[i].gpio, buttonActiveLow ? INPUT_PULLUP : INPUT_PULLDOWN);

        // Initialize button state
        buttonStates[i].currentState = digitalRead(hardwareButtons[i].gpio);
        buttonStates[i].lastState = buttonStates[i].currentState;
        buttonStates[i].pressed = false;
        buttonStates[i].lastDebounceTime = 0;
        buttonStates[i].pressStartTime = 0;
        buttonStates[i].lastPressTime = 0;
        buttonStates[i].pressCount = 0;
        buttonStates[i].windowStartTime = 0;

        LOG_VERBOSE("BUTTONS", "Button %d: GPIO %d -> %s",
                    i, hardwareButtons[i].gpio, hardwareButtons[i].endpoint);
    }

    // Feed watchdog after hardware button initialization
    esp_task_wdt_reset();

    LOG_NOTICE("BUTTONS", "Hardware buttons initialized");
}

void checkHardwareButtons()
{
    unsigned long currentTime = millis();

    for (int i = 0; i < numHardwareButtons; i++)
    {
        // Read current state
        bool reading = digitalRead(hardwareButtons[i].gpio);

        // Check if state changed (for debouncing)
        if (reading != buttonStates[i].lastState)
        {
            buttonStates[i].lastDebounceTime = currentTime;
        }

        // If enough time has passed since last change, update current state
        if ((currentTime - buttonStates[i].lastDebounceTime) > buttonDebounceMs)
        {
            // If state has changed from last stable state
            if (reading != buttonStates[i].currentState)
            {
                buttonStates[i].currentState = reading;

                // Detect press (depends on buttonActiveLow setting)
                bool isPressed = buttonActiveLow ? (reading == LOW) : (reading == HIGH);

                if (isPressed && !buttonStates[i].pressed)
                {
                    // Button pressed
                    buttonStates[i].pressed = true;
                    buttonStates[i].pressStartTime = currentTime;

                    LOG_NOTICE("BUTTONS", "Button %d pressed: %s", i, hardwareButtons[i].endpoint);
                    handleButtonPress(i);
                }
                else if (!isPressed && buttonStates[i].pressed)
                {
                    // Button released
                    buttonStates[i].pressed = false;
                    unsigned long pressDuration = currentTime - buttonStates[i].pressStartTime;

                    LOG_VERBOSE("BUTTONS", "Button %d released after %lu ms", i, pressDuration);
                }
            }
        }

        buttonStates[i].lastState = reading;
    }
}

// Rate limiting check for hardware buttons
bool isButtonRateLimited(int buttonIndex, unsigned long currentTime)
{
    ButtonState &state = buttonStates[buttonIndex];

    // Check minimum interval since last press
    if ((currentTime - state.lastPressTime) < buttonMinInterval)
    {
        LOG_WARNING("BUTTONS", "Button %d rate limited: too soon (last press %lu ms ago)",
                    buttonIndex, currentTime - state.lastPressTime);
        return true;
    }

    // Reset window if it's been too long since window started
    if ((currentTime - state.windowStartTime) >= buttonRateLimitWindow)
    {
        state.windowStartTime = currentTime;
        state.pressCount = 0;
    }

    // Check if we've exceeded max presses per window
    if (state.pressCount >= buttonMaxPerMinute)
    {
        LOG_WARNING("BUTTONS", "Button %d rate limited: max presses reached (%d/%d in current window)",
                    buttonIndex, state.pressCount, buttonMaxPerMinute);
        return true;
    }

    // Update rate limiting state
    state.lastPressTime = currentTime;
    state.pressCount++;

    LOG_VERBOSE("BUTTONS", "Button %d rate check passed: %d/%d presses in window",
                buttonIndex, state.pressCount, buttonMaxPerMinute);
    return false;
}

void handleButtonPress(int buttonIndex)
{
    if (buttonIndex < 0 || buttonIndex >= numHardwareButtons)
    {
        LOG_ERROR("BUTTONS", "Invalid button index: %d", buttonIndex);
        return;
    }

    const ButtonConfig &button = hardwareButtons[buttonIndex];

    // Check rate limiting
    unsigned long currentTime = millis();
    if (isButtonRateLimited(buttonIndex, currentTime))
    {
        return; // Rate limited, ignore this press
    }

    LOG_NOTICE("BUTTONS", "Triggering endpoint: %s", button.endpoint);
    triggerEndpointFromButton(button.endpoint);
}

void triggerEndpointFromButton(const char *endpoint)
{
    // Use the shared endpoint processing function with local-direct destination
    LOG_VERBOSE("BUTTONS", "Hardware button triggered: %s", endpoint);

    if (!processEndpoint(endpoint, "local-direct"))
    {
        LOG_ERROR("BUTTONS", "Failed to process endpoint: %s", endpoint);
    }
}

String getButtonConfigJson()
{
    DynamicJsonDocument doc(jsonDocumentSize);
    JsonArray buttons = doc.createNestedArray("buttons");

    for (int i = 0; i < numHardwareButtons; i++)
    {
        JsonObject button = buttons.createNestedObject();
        button["index"] = i;
        button["gpio"] = hardwareButtons[i].gpio;
        button["endpoint"] = hardwareButtons[i].endpoint;

        button["currentState"] = buttonStates[i].currentState;
        button["pressed"] = buttonStates[i].pressed;
    }

    doc["activeLow"] = buttonActiveLow;
    doc["debounceMs"] = buttonDebounceMs;
    doc["longPressMs"] = buttonLongPressMs;

    String result;
    serializeJson(doc, result);
    return result;
}
