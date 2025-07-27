#ifndef HARDWARE_BUTTONS_H
#define HARDWARE_BUTTONS_H

#include "config.h"
#include "logging.h"
#include <Arduino.h>

// ========================================
// HARDWARE BUTTON MANAGEMENT
// ========================================

// Button state tracking
struct ButtonState
{
    bool currentState;              // Current GPIO reading
    bool lastState;                 // Previous GPIO reading
    bool pressed;                   // Debounced press detected
    unsigned long lastDebounceTime; // Last time the output pin toggled
    unsigned long pressStartTime;   // When press started (for long press)
    unsigned long lastPressTime;    // Last successful press time (for rate limiting)
    unsigned int pressCount;        // Presses within current rate limit window
    unsigned long windowStartTime;  // Start of current rate limit window
};

// Global button state array
static ButtonState buttonStates[numHardwareButtons];

/**
 * @brief Initialize hardware buttons
 * Sets up GPIO pins and initial state
 */
void initializeHardwareButtons();

/**
 * @brief Check all hardware buttons for presses
 * Should be called frequently in main loop
 */
void checkHardwareButtons();

/**
 * @brief Check if a button press should be rate limited
 * @param buttonIndex Index into hardwareButtons array
 * @param currentTime Current time in milliseconds
 * @return true if rate limited, false if allowed
 */
bool isButtonRateLimited(int buttonIndex, unsigned long currentTime);

/**
 * @brief Handle a button press for a specific button index
 * @param buttonIndex Index into hardwareButtons array
 */
void handleButtonPress(int buttonIndex);

/**
 * @brief Trigger an endpoint from hardware button press
 * @param endpoint The endpoint to trigger (e.g., "/riddle", "/joke")
 */
void triggerEndpointFromButton(const char *endpoint);

/**
 * @brief Get button configuration info as JSON string
 * @return JSON string with button configuration
 */
String getButtonConfigJson();

#endif
