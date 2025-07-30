/**
 * @file content_generators.cpp
 * @brief Implementation of content generation functions for entertainment endpoints
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

#include "content_generators.h"
#include "api_client.h"
#include "config.h"
#include "logging.h"
#include "unbidden_ink.h"
#include <LittleFS.h>
#include <ArduinoJson.h>

String generateRiddleContent()
{
    // LittleFS is already mounted in main.cpp, no need to call begin() again

    // Open the riddles.ndjson file
    File file = LittleFS.open("/riddles.ndjson", "r");
    if (!file)
    {
        return "Failed to open riddles file";
    }

    // Pick a random riddle
    int target = random(0, totalRiddles);
    int current = 0;
    String riddleText = "";
    String riddleAnswer = "";

    while (file.available() && current <= target)
    {
        String line = file.readStringUntil('\n');
        line.trim();

        if (current == target)
        {
            DynamicJsonDocument doc(jsonDocumentSize);
            DeserializationError error = deserializeJson(doc, line);

            if (!error && doc.containsKey("riddle"))
            {
                String extracted = doc["riddle"].as<String>();
                if (extracted.length() > 0)
                {
                    riddleText = extracted;
                }

                // Also extract the answer if available
                if (doc.containsKey("answer"))
                {
                    String extractedAnswer = doc["answer"].as<String>();
                    if (extractedAnswer.length() > 0)
                    {
                        riddleAnswer = extractedAnswer;
                    }
                }
            }
            break;
        }
        current++;
    }

    file.close();

    // Return empty string if no riddle was found
    if (riddleText.length() == 0 || riddleAnswer.length() == 0)
    {
        LOG_ERROR("RIDDLE", "Failed to load riddle from file");
        return "";
    }

    String fullContent = "RIDDLE #" + String(target + 1) + "\n\n" + riddleText + "\n\n\n\n\n\n";
    fullContent += "Answer: " + reverseString(riddleAnswer);

    return fullContent;
}

String generateJokeContent()
{
    // Try to fetch from API
    String response = fetchFromAPI(jokeAPI, apiUserAgent);

    if (response.length() > 0)
    {
        DynamicJsonDocument doc(jsonDocumentSize);
        DeserializationError error = deserializeJson(doc, response);

        if (!error && doc.containsKey("joke"))
        {
            String apiJoke = doc["joke"].as<String>();
            apiJoke.trim();
            if (apiJoke.length() > minJokeLength) // Ensure it's a real joke, not empty
            {
                String fullContent = "JOKE\n\n" + apiJoke;
                return fullContent;
            }
        }
    }

    LOG_ERROR("JOKE", "Failed to fetch joke from API");
    return ""; // Return empty string to indicate failure
}

String generateQuoteContent()
{
    // Try to fetch from API
    String response = fetchFromAPI(quoteAPI, apiUserAgent);

    if (response.length() > 0)
    {
        // Parse JSON response (expecting array format)
        DynamicJsonDocument doc(largeJsonDocumentSize);
        DeserializationError error = deserializeJson(doc, response);

        if (!error && doc.is<JsonArray>() && doc.size() > 0)
        {
            JsonObject quoteObj = doc[0];
            if (quoteObj.containsKey("q") && quoteObj.containsKey("a"))
            {
                String quoteText = quoteObj["q"].as<String>();
                String author = quoteObj["a"].as<String>();

                quoteText.trim();
                author.trim();

                if (quoteText.length() > 0 && author.length() > 0)
                {
                    String quote = "\"" + quoteText + "\"\n– " + author;
                    String fullContent = "QUOTE\n\n" + quote;
                    return fullContent;
                }
            }
        }
    }

    LOG_ERROR("QUOTE", "Failed to fetch quote from API");
    return ""; // Return empty string to indicate failure
}

String generateQuizContent()
{
    // Try to fetch from API
    String response = fetchFromAPI(triviaAPI, apiUserAgent);

    if (response.length() > 0)
    {
        DynamicJsonDocument doc(largeJsonDocumentSize);
        DeserializationError error = deserializeJson(doc, response);

        if (!error && doc.is<JsonArray>() && doc.size() > 0)
        {
            JsonObject questionObj = doc[0];
            if (questionObj.containsKey("question") &&
                questionObj.containsKey("correctAnswer") &&
                questionObj.containsKey("incorrectAnswers"))
            {
                String question = questionObj["question"].as<String>();
                String correctAnswer = questionObj["correctAnswer"].as<String>();
                JsonArray incorrectAnswers = questionObj["incorrectAnswers"];

                question.trim();
                correctAnswer.trim();

                if (question.length() > 0 && correctAnswer.length() > 0 && incorrectAnswers.size() >= 3)
                {
                    // Randomize the position of the correct answer (A, B, C, or D)
                    int correctPosition = random(0, 4);
                    String options[4];
                    String positionLabels[4] = {"A", "B", "C", "D"};

                    // Fill with incorrect answers first
                    int incorrectIndex = 0;
                    for (int i = 0; i < 4; i++)
                    {
                        if (i == correctPosition)
                        {
                            options[i] = correctAnswer;
                        }
                        else
                        {
                            options[i] = incorrectAnswers[incorrectIndex].as<String>();
                            incorrectIndex++;
                        }
                    }

                    String quiz = "QUIZ\n\n" + question + "\n";
                    quiz += "A) " + options[0] + "\n";
                    quiz += "B) " + options[1] + "\n";
                    quiz += "C) " + options[2] + "\n";
                    quiz += "D) " + options[3] + "\n\n\n\n";
                    quiz += "Answer: " + reverseString(correctAnswer);
                    return quiz;
                }
            }
        }
    }

    LOG_ERROR("QUIZ", "Failed to fetch quiz from API");
    return ""; // Return empty string to indicate failure
}

String generateUnbiddenInkContent()
{
    // Get token, endpoint, and prompt from config and dynamic settings
    String apiToken = unbiddenInkApiToken;
    String apiEndpoint = unbiddenInkApiEndpoint;
    String prompt = getUnbiddenInkPrompt();

    // Build Bearer token with automatic prefix
    String bearerToken = "Bearer " + apiToken;

    LOG_VERBOSE("UNBIDDENINK", "Calling Unbidden Ink API: %s", apiEndpoint.c_str());
    LOG_VERBOSE("UNBIDDENINK", "Using prompt: %s", prompt.c_str());

    // Build JSON payload with the prompt
    DynamicJsonDocument payloadDoc(1024);
    payloadDoc["prompt"] = prompt;
    String jsonPayload;
    serializeJson(payloadDoc, jsonPayload);

    // Try to POST to Pipedream API with Bearer token and prompt
    String response = postToAPIWithBearer(apiEndpoint, bearerToken, jsonPayload, apiUserAgent);

    if (response.length() > 0)
    {
        LOG_VERBOSE("UNBIDDENINK", "API response received: %s", response.c_str());

        // Parse JSON response expecting a "message" field
        DynamicJsonDocument doc(largeJsonDocumentSize);
        DeserializationError error = deserializeJson(doc, response);

        if (!error && doc.containsKey("message"))
        {
            String apiMessage = doc["message"].as<String>();
            apiMessage.trim();
            if (apiMessage.length() > 0)
            {
                LOG_VERBOSE("UNBIDDENINK", "Using API message: %s", apiMessage.c_str());
                String fullContent = "UNBIDDEN INK\n\n" + apiMessage;
                return fullContent;
            }
            else
            {
                LOG_ERROR("UNBIDDENINK", "API returned empty message");
                return ""; // Return empty string to indicate failure
            }
        }
        else
        {
            LOG_ERROR("UNBIDDENINK", "API response parsing failed or no 'message' field found");
            return ""; // Return empty string to indicate failure
        }
    }
    else
    {
        LOG_ERROR("UNBIDDENINK", "No response from Unbidden Ink API");
        return ""; // Return empty string to indicate failure
    }
}
