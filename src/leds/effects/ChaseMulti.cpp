/**
 * @file ChaChaseMulti::ChaseMulti(const ChaseMultiConfig &effectConfig)
    : config(effectConfig), targetCycles(1), frameCounter(0)Multi.cpp
 * @brief Implementation of multi-color chase effect with autonomous configuration
 * @author Adam Knowles
 * @date 2025
 * @copyright Copyright (c) 2025 Adam Knowles. All rights reserved.
 * @license Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 */

#include "ChaseMulti.h"

#ifdef ENABLE_LEDS

#include "../../core/logging.h"
#include "../../utils/color_utils.h"

ChaseMulti::ChaseMulti(const ChaseMultiConfig &effectConfig)
    : config(effectConfig), targetCycles(1), frameCounter(0)
{
}

bool ChaseMulti::update(CRGB *leds, int ledCount, int &effectStep, int &effectDirection,
                        float &effectPhase, CRGB color1, CRGB color2, CRGB color3,
                        int &completedCycles)
{
    clearAllLEDs(leds, ledCount);

    // Cycle-based: run from start to end, then wait for trail to completely exit
    // Add spacing between colors so they follow each other
    int colorSpacing = config.trailLength + config.colorSpacing;       // Space colors apart by trail length + gap
    int totalSteps = ledCount + colorSpacing * 2 + config.trailLength; // Include space for all colors and trails
    int currentPosition = effectStep;

    // Draw color1 (main/first color)
    if (currentPosition >= 0 && currentPosition < ledCount)
    {
        leds[currentPosition] = color1;
    }

    // Add color1 trail
    for (int i = 1; i <= config.trailLength; i++)
    {
        int trailPos = currentPosition - i;
        if (trailPos >= 0 && trailPos < ledCount)
        {
            CRGB trailColor = color1;
            trailColor.fadeToBlackBy(i * config.trailFade);
            leds[trailPos] = trailColor;
        }
    }

    // Draw color2 (second color, following behind)
    int color2Position = currentPosition - colorSpacing;
    if (color2Position >= 0 && color2Position < ledCount)
    {
        leds[color2Position] = color2;
    }

    // Add color2 trail
    for (int i = 1; i <= config.trailLength; i++)
    {
        int trailPos = color2Position - i;
        if (trailPos >= 0 && trailPos < ledCount)
        {
            CRGB trailColor = color2;
            trailColor.fadeToBlackBy(i * config.trailFade);
            leds[trailPos] = trailColor;
        }
    }

    // Draw color3 (third color, following behind color2)
    int color3Position = currentPosition - (colorSpacing * 2);
    if (color3Position >= 0 && color3Position < ledCount)
    {
        leds[color3Position] = color3;
    }

    // Add color3 trail
    for (int i = 1; i <= config.trailLength; i++)
    {
        int trailPos = color3Position - i;
        if (trailPos >= 0 && trailPos < ledCount)
        {
            CRGB trailColor = color3;
            trailColor.fadeToBlackBy(i * config.trailFade);
            leds[trailPos] = trailColor;
        }
    }

    // Use frame counter for speed control (higher config.speed = slower movement)
    frameCounter++;
    if (frameCounter >= config.speed)
    {
        frameCounter = 0;
        effectStep++; // Only advance position when frame counter reaches speed threshold
    }

    // Check if we've completed a cycle (all colors + trails have exited the strip)
    if (effectStep >= totalSteps)
    {
        completedCycles++;
        effectStep = 0;   // Reset for next cycle
        frameCounter = 0; // Reset frame counter
        LOG_VERBOSE("LEDS", "Chase multi completed cycle %d/%d", completedCycles, targetCycles);

        // Return false if we've completed all requested cycles
        return completedCycles < targetCycles;
    }

    return true; // Continue running
}

void ChaseMulti::reset()
{
    // Reset state variables - will be set by the effect manager
    frameCounter = 0;
}

void ChaseMulti::clearAllLEDs(CRGB *leds, int ledCount)
{
    for (int i = 0; i < ledCount; i++)
    {
        leds[i] = CRGB::Black;
    }
}

#endif // ENABLE_LEDS
