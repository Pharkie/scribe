#include "printer.h"
#include "time_utils.h"
#include "logging.h"
#include <WiFi.h>
#include <esp_task_wdt.h>

// Printer object and configuration
HardwareSerial printer(1); // Use UART1 on ESP32-C3
const int maxCharsPerLine = 32;

// === Printer Functions ===
void stabilizePrinterPin()
{
    // Configure TX pin as output and set to idle state (HIGH) as early as possible
    pinMode(TX_PIN, OUTPUT);
    digitalWrite(TX_PIN, HIGH); // UART idle state is HIGH
    // Note: Using Serial.println here since logging isn't initialized yet
    Serial.println("Printer TX pin stabilized to HIGH (idle state)");
}

void initializePrinter()
{
    // Initialize UART1 for TX only (one-way communication to printer)
    printer.begin(9600, SERIAL_8N1, -1, TX_PIN); // baud, config, RX pin (-1 = not used), TX pin
    delay(500);

    // Initialise
    printer.write(0x1B);
    printer.write('@'); // ESC @
    delay(50);

    // Set printer heating parameters from config
    printer.write(0x1B);
    printer.write('7');
    printer.write(heatingDots);     // Heating dots from config
    printer.write(heatingTime);     // Heating time from config
    printer.write(heatingInterval); // Heating interval from config

    // Enable 180° rotation (which also reverses the line order)
    printer.write(0x1B);
    printer.write('{');
    printer.write(0x01); // ESC { 1

    LOG_VERBOSE("PRINTER", "Printer initialized");
}

void printReceipt()
{
    LOG_VERBOSE("PRINTER", "Printing receipt...");

    printWithHeader(currentReceipt.timestamp, currentReceipt.message);

    LOG_VERBOSE("PRINTER", "Receipt printed successfully");
}

void printServerInfo()
{
    // Feed watchdog after first log (network logging can be slow)
    esp_task_wdt_reset();

    String serverInfo = "Web interface: " + String(mdnsHostname) + ".local or " + WiFi.localIP().toString();

    // Feed watchdog before thermal printing (can be slow)
    esp_task_wdt_reset();

    LOG_VERBOSE("PRINTER", "Printing startup message");

    advancePaper(1);

    // Feed watchdog before the actual printing
    esp_task_wdt_reset();

    printWithHeader("SCRIBE READY", serverInfo);

    // Feed watchdog after thermal printing completes
    esp_task_wdt_reset();
}

void setInverse(bool enable)
{
    printer.write(0x1D);
    printer.write('B');
    printer.write(enable ? 1 : 0); // GS B n
}

void advancePaper(int lines)
{
    for (int i = 0; i < lines; i++)
    {
        printer.write(0x0A); // LF
    }
}

void printWrapped(String text)
{
    std::vector<String> lines;
    lines.reserve(20); // Reserve space to avoid frequent reallocations

    int startPos = 0;
    int textLength = text.length();

    // Process text character by character to handle newlines efficiently
    while (startPos < textLength)
    {
        // Find next newline or end of string
        int newlinePos = text.indexOf('\n', startPos);
        if (newlinePos == -1)
            newlinePos = textLength;

        // Extract current line (may be empty)
        String currentLine = text.substring(startPos, newlinePos);

        // Word wrap the current line if needed
        if (currentLine.length() == 0)
        {
            // Empty line - preserve it for spacing
            lines.push_back("");
        }
        else
        {
            // Process line with word wrapping
            int lineStart = 0;
            while (lineStart < currentLine.length())
            {
                int lineEnd = lineStart + maxCharsPerLine;

                if (lineEnd >= currentLine.length())
                {
                    // Rest of line fits
                    lines.push_back(currentLine.substring(lineStart));
                    break;
                }

                // Find word boundary to break at
                int breakPoint = currentLine.lastIndexOf(' ', lineEnd);
                if (breakPoint <= lineStart)
                {
                    // No space found - break at character limit
                    breakPoint = lineEnd;
                }

                lines.push_back(currentLine.substring(lineStart, breakPoint));

                // Skip any leading spaces on next line
                lineStart = breakPoint;
                while (lineStart < currentLine.length() && currentLine.charAt(lineStart) == ' ')
                {
                    lineStart++;
                }
            }
        }

        // Move to next line
        startPos = newlinePos + 1;
    }

    // Print lines in reverse order to compensate for 180° printer rotation
    for (int i = lines.size() - 1; i >= 0; i--)
    {
        printer.println(lines[i]);
    }
}

void printWithHeader(String headerText, String bodyText)
{
    // Clean both header and body text before printing
    String cleanHeaderText = cleanString(headerText);
    String cleanBodyText = cleanString(bodyText);

    // Feed watchdog before starting thermal printing
    esp_task_wdt_reset();

    // Print body text first (appears at bottom after rotation)
    printWrapped(cleanBodyText);

    // Feed watchdog between body and header printing
    esp_task_wdt_reset();

    // Print header last (appears at top after rotation)
    setInverse(true);
    printWrapped(cleanHeaderText);
    setInverse(false);

    advancePaper(2);

    // Feed watchdog after printing completes
    esp_task_wdt_reset();
}
