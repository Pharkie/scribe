#include "printer.h"
#include "time_utils.h"
#include <WiFi.h>

// Printer object and configuration
HardwareSerial printer(1); // Use UART1 on ESP32-C3
const int maxCharsPerLine = 32;

// === Printer Functions ===
void stabilizePrinterPin()
{
    // Configure TX pin as output and set to idle state (HIGH) as early as possible
    pinMode(TX_PIN, OUTPUT);
    digitalWrite(TX_PIN, HIGH); // UART idle state is HIGH
    Serial.println("Printer TX pin stabilized to HIGH (idle state)");
}

void initializePrinter()
{
    delay(500); // Wait for printer to stabilize before sending commands on TX
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

    Serial.println("Printer initialized");
}

void printReceipt()
{
    Serial.println("Printing receipt...");

    printWithHeader(currentReceipt.timestamp, currentReceipt.message);

    Serial.println("Receipt printed successfully");
}

void printServerInfo()
{
    Serial.println("=== Server Info ===");
    Serial.print("Local IP: ");
    Serial.println(WiFi.localIP());
    Serial.println("Access the form at: http://" + WiFi.localIP().toString() + " or http://" + String(mdnsHostname) + ".local");
    Serial.println("==================");

    Serial.println("Printing server info on thermal printer...");

    String serverInfo = "Server: " + String(mdnsHostname) + ".local or " + WiFi.localIP().toString();
    advancePaper(1);
    printWithHeader("SCRIBE READY", serverInfo);
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

    // Split text by newlines first
    while (text.length() > 0)
    {
        int newlineIndex = text.indexOf('\n');
        String currentLine;

        if (newlineIndex != -1)
        {
            // Found a newline - extract line up to newline
            currentLine = text.substring(0, newlineIndex);
            text = text.substring(newlineIndex + 1);
        }
        else
        {
            // No more newlines - process remaining text
            currentLine = text;
            text = "";
        }

        // Process current line with word wrapping
        while (currentLine.length() > 0)
        {
            if (currentLine.length() <= maxCharsPerLine)
            {
                lines.push_back(currentLine);
                break;
            }

            int lastSpace = currentLine.lastIndexOf(' ', maxCharsPerLine);
            if (lastSpace == -1)
                lastSpace = maxCharsPerLine;

            lines.push_back(currentLine.substring(0, lastSpace));
            currentLine = currentLine.substring(lastSpace);
            currentLine.trim();
        }
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

    // Print body text first (appears at bottom after rotation)
    printWrapped(cleanBodyText);

    // Print header last (appears at top after rotation)
    setInverse(true);
    printWrapped(cleanHeaderText);
    setInverse(false);

    advancePaper(2);
}

void printCharacterTest()
{
    Serial.println("Printing character test...");

    String testContent = "CHARACTER TEST\n\n";

    // Basic ASCII test
    testContent += "ASCII: Hello World 123!@#\n\n";

    // Accented vowels
    testContent += "A variants: À Á Â Ã Ä Å\n";
    testContent += "a variants: à á â ã ä å\n";
    testContent += "E variants: È É Ê Ë\n";
    testContent += "e variants: è é ê ë\n";
    testContent += "I variants: Ì Í Î Ï\n";
    testContent += "i variants: ì í î ï\n";
    testContent += "O variants: Ò Ó Ô Õ Ö\n";
    testContent += "o variants: ò ó ô õ ö\n";
    testContent += "U variants: Ù Ú Û Ü\n";
    testContent += "u variants: ù ú û ü\n\n";

    // Special characters
    testContent += "Special: Ñ ñ Ç ç\n";
    testContent += "Nordic: Æ æ Ø ø Å å\n";
    testContent += "German: ß Ü ü Ö ö Ä ä\n";
    testContent += "French: É é È è Ê ê\n\n";

    // Punctuation variants
    testContent += "Quotes: \"double\" and 'single' quotes\n";
    testContent += "Dashes: en–dash em—dash\n";
    testContent += "Apostrophes: don't won't\n\n";

    // Real-world examples
    testContent += "Examples:\n";
    testContent += "* Za'atar (Arabic spice)\n";
    testContent += "* Café au lait\n";
    testContent += "* Naïve approach\n";
    testContent += "* Piñata party\n";
    testContent += "* Müller family\n";
    testContent += "* Björk concert\n";
    testContent += "* Señorita María\n";
    testContent += "* Crème brûlée\n";
    testContent += "* Jalapeño peppers\n";
    testContent += "* São Paulo\n";

    printWithHeader("CHARACTER TEST", testContent);

    Serial.println("Character test printed successfully");
}
