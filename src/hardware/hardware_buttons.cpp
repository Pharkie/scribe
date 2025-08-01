#include "hardware_buttons.h"
#include "../web/web_server.h"
#include "printer.h"
#include "../content/content_handlers.h"
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
        buttonStates[i].longPressTriggered = false;
        buttonStates[i].lastDebounceTime = 0;
        buttonStates[i].pressStartTime = 0;
        buttonStates[i].lastPressTime = 0;
        buttonStates[i].pressCount = 0;
        buttonStates[i].windowStartTime = 0;

        LOG_VERBOSE("BUTTONS", "Button %d: GPIO %d -> %s (short), %s (long)",
                    i, hardwareButtons[i].gpio, hardwareButtons[i].shortEndpoint, hardwareButtons[i].longEndpoint);
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
                    buttonStates[i].longPressTriggered = false;
                    buttonStates[i].pressStartTime = currentTime;

                    LOG_VERBOSE("BUTTONS", "Button %d pressed: %s", i, hardwareButtons[i].shortEndpoint);
                }
                else if (!isPressed && buttonStates[i].pressed)
                {
                    // Button released
                    buttonStates[i].pressed = false;
                    unsigned long pressDuration = currentTime - buttonStates[i].pressStartTime;

                    // Only trigger short press if long press wasn't already triggered
                    if (!buttonStates[i].longPressTriggered)
                    {
                        if (pressDuration < buttonLongPressMs)
                        {
                            LOG_NOTICE("BUTTONS", "Button %d short press: %s", i, hardwareButtons[i].shortEndpoint);
                            handleButtonPress(i);
                        }
                    }

                    LOG_VERBOSE("BUTTONS", "Button %d released after %lu ms", i, pressDuration);
                }
            }
        }

        // Check for long press while button is held down
        if (buttonStates[i].pressed && !buttonStates[i].longPressTriggered)
        {
            unsigned long pressDuration = currentTime - buttonStates[i].pressStartTime;
            if (pressDuration >= buttonLongPressMs)
            {
                buttonStates[i].longPressTriggered = true;
                LOG_NOTICE("BUTTONS", "Button %d long press: %s", i, hardwareButtons[i].longEndpoint);
                handleButtonLongPress(i);
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

    LOG_VERBOSE("BUTTONS", "Triggering short press endpoint: %s", button.shortEndpoint);
    triggerEndpointFromButton(button.shortEndpoint);
}

void handleButtonLongPress(int buttonIndex)
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

    LOG_VERBOSE("BUTTONS", "Triggering long press endpoint: %s", button.longEndpoint);
    triggerEndpointFromButton(button.longEndpoint);
}

void triggerEndpointFromButton(const char *endpoint)
{
    // Map endpoint strings to handler functions
    LOG_VERBOSE("BUTTONS", "Hardware button triggered: %s", endpoint);

    if (strcmp(endpoint, "/riddle") == 0)
    {
        handleRiddle();
    }
    else if (strcmp(endpoint, "/joke") == 0)
    {
        handleJoke();
    }
    else if (strcmp(endpoint, "/quote") == 0)
    {
        handleQuote();
    }
    else if (strcmp(endpoint, "/quiz") == 0)
    {
        handleQuiz();
    }
    else if (strcmp(endpoint, "/print-test") == 0)
    {
        handlePrintTest();
    }
    else if (strcmp(endpoint, "/unbidden-ink") == 0)
    {
        handleUnbiddenInk();
    }
    else if (strcmp(endpoint, "/keep-going") == 0)
    {
        // Keep-going endpoint - generate random content
        // For now, let's default to joke
        handleJoke();
    }
    else if (strlen(endpoint) == 0)
    {
        // Empty endpoint - do nothing
        LOG_VERBOSE("BUTTONS", "Empty endpoint - no action");
    }
    else
    {
        LOG_ERROR("BUTTONS", "Unknown endpoint: %s", endpoint);
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
        button["shortEndpoint"] = hardwareButtons[i].shortEndpoint;
        button["longEndpoint"] = hardwareButtons[i].longEndpoint;

        button["currentState"] = buttonStates[i].currentState;
        button["pressed"] = buttonStates[i].pressed;
        button["longPressTriggered"] = buttonStates[i].longPressTriggered;
    }

    doc["activeLow"] = buttonActiveLow;
    doc["debounceMs"] = buttonDebounceMs;
    doc["longPressMs"] = buttonLongPressMs;

    String result;
    serializeJson(doc, result);
    return result;
}
