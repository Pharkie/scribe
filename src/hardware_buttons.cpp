#include "hardware_buttons.h"
#include "web_server.h"
#include "printer.h"
#include <ArduinoJson.h>

// ========================================
// HARDWARE BUTTON IMPLEMENTATION
// ========================================

void initializeHardwareButtons()
{
    LOG_NOTICE("BUTTONS", "Initializing %d hardware buttons", numHardwareButtons);

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

    LOG_NOTICE("BUTTONS", "Triggering content type: %s", button.endpoint);
    generateContentFromButton(button.endpoint);
}

void generateContentFromButton(const char *contentType)
{
    // This function generates content directly from hardware button press,
    // bypassing the web server entirely

    LOG_NOTICE("BUTTONS", "Hardware button triggered: %s", contentType);

    if (strcmp(contentType, "riddle") == 0)
    {
        LOG_VERBOSE("BUTTONS", "Generating riddle from button press");
        handleButtonRiddle();
    }
    else if (strcmp(contentType, "joke") == 0)
    {
        LOG_VERBOSE("BUTTONS", "Generating joke from button press");
        handleButtonJoke();
    }
    else if (strcmp(contentType, "quote") == 0)
    {
        LOG_VERBOSE("BUTTONS", "Generating quote from button press");
        handleButtonQuote();
    }
    else if (strcmp(contentType, "quiz") == 0)
    {
        LOG_VERBOSE("BUTTONS", "Generating quiz from button press");
        handleButtonQuiz();
    }
    else if (strcmp(contentType, "print-test") == 0)
    {
        LOG_VERBOSE("BUTTONS", "Triggering print test from button press");
        handleButtonPrintTest();
    }
    else
    {
        LOG_WARNING("BUTTONS", "Unknown content type: %s", contentType);
    }
}

// Dedicated button handler functions that work without web server context
void handleButtonRiddle()
{
    // Generate riddle content and send to printer
    String riddle = generateRiddleContent();
    if (riddle.length() > 0)
    {
        currentReceipt.message = riddle;
        currentReceipt.timestamp = "";
        currentReceipt.hasData = true;
        LOG_NOTICE("BUTTONS", "Riddle queued for printing");
    }
    else
    {
        LOG_ERROR("BUTTONS", "Failed to generate riddle");
    }
}

void handleButtonJoke()
{
    // Generate joke content and send to printer
    String joke = generateJokeContent();
    if (joke.length() > 0)
    {
        currentReceipt.message = joke;
        currentReceipt.timestamp = "";
        currentReceipt.hasData = true;
        LOG_NOTICE("BUTTONS", "Joke queued for printing");
    }
    else
    {
        LOG_ERROR("BUTTONS", "Failed to generate joke");
    }
}

void handleButtonQuote()
{
    // Generate quote content and send to printer
    String quote = generateQuoteContent();
    if (quote.length() > 0)
    {
        currentReceipt.message = quote;
        currentReceipt.timestamp = "";
        currentReceipt.hasData = true;
        LOG_NOTICE("BUTTONS", "Quote queued for printing");
    }
    else
    {
        LOG_ERROR("BUTTONS", "Failed to generate quote");
    }
}

void handleButtonQuiz()
{
    // Generate quiz content and send to printer
    String quiz = generateQuizContent();
    if (quiz.length() > 0)
    {
        currentReceipt.message = quiz;
        currentReceipt.timestamp = "";
        currentReceipt.hasData = true;
        LOG_NOTICE("BUTTONS", "Quiz queued for printing");
    }
    else
    {
        LOG_ERROR("BUTTONS", "Failed to generate quiz");
    }
}

void handleButtonPrintTest()
{
    // Generate test content and send to printer
    String testContent = "Test Print from Hardware Button\n"
                         "Time: " +
                         String(millis()) + "ms\n"
                                            "GPIO Button Test Successful!\n";
    if (testContent.length() > 0)
    {
        currentReceipt.message = testContent;
        currentReceipt.timestamp = "";
        currentReceipt.hasData = true;
        LOG_NOTICE("BUTTONS", "Test print queued for printing");
    }
    else
    {
        LOG_ERROR("BUTTONS", "Failed to generate test content");
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
