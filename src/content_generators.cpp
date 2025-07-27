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
#include <LittleFS.h>
#include <ArduinoJson.h>

String generateRiddleContent()
{
    if (!LittleFS.begin())
    {
        return "Failed to mount LittleFS for riddles";
    }

    // Open the riddles.ndjson file
    File file = LittleFS.open("/riddles.ndjson", "r");
    if (!file)
    {
        return "Failed to open riddles file";
    }

    // Pick a random riddle
    int target = random(0, totalRiddles);
    int current = 0;
    String riddleText = "What gets wetter the more it dries?"; // fallback
    String riddleAnswer = "A towel";                           // fallback answer

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

    String fullContent = "RIDDLE #" + String(target + 1) + "\n\n" + riddleText + "\n\n\n\n\n\n";
    fullContent += "Answer: " + reverseString(riddleAnswer);

    return fullContent;
}

String generateJokeContent()
{
    String jokeText = "Why don't scientists trust atoms? Because they make up everything!"; // fallback

    // Try to fetch from API
    String response = fetchFromAPI(dadJokeAPI, apiUserAgent);

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
                jokeText = apiJoke;
            }
        }
    }

    String fullContent = "JOKE\n\n" + jokeText;
    return fullContent;
}

String generateQuoteContent()
{
    String quote = "\"Your mind is for having ideas, not holding them.\"\n– David Allen";

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
                    quote = "\"" + quoteText + "\"\n– " + author;
                }
            }
        }
    }

    String fullContent = "QUOTE\n\n" + quote;
    return fullContent;
}

String generateQuizContent()
{
    // Randomize the fallback quiz answer position
    int correctPosition = random(0, 4);
    String options[4] = {"London", "Berlin", "Paris", "Madrid"};
    String correctAnswer = "Paris";
    String positionLabels[4] = {"A", "B", "C", "D"};

    // Swap the correct answer to the random position
    if (correctPosition != 2)
    { // Paris is at index 2
        String temp = options[correctPosition];
        options[correctPosition] = correctAnswer;
        options[2] = temp;
    }

    String quiz = "QUIZ\n\nWhat is the capital of France?\n";
    quiz += "A) " + options[0] + "\n";
    quiz += "B) " + options[1] + "\n";
    quiz += "C) " + options[2] + "\n";
    quiz += "D) " + options[3] + "\n\n\n\n";
    quiz += "Answer: " + reverseString(correctAnswer);

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

                    quiz = "QUIZ\n\n" + question + "\n";
                    quiz += "A) " + options[0] + "\n";
                    quiz += "B) " + options[1] + "\n";
                    quiz += "C) " + options[2] + "\n";
                    quiz += "D) " + options[3] + "\n\n\n\n";
                    quiz += "Answer: " + reverseString(correctAnswer);
                }
            }
        }
    }

    return quiz;
}
