#ifndef PRINTER_H
#define PRINTER_H

#include <Arduino.h>
#include <HardwareSerial.h>
#include <vector>
#include "config.h"
#include "character_mapping.h"
#include "web_server.h"

// External printer object and configuration
extern HardwareSerial printer;
extern const int maxCharsPerLine;

// Function declarations
void stabilizePrinterPin();
void initializePrinter();
void printReceipt();
void printServerInfo();
void setInverse(bool enable);
void advancePaper(int lines);
void printWrapped(String text);
void printWithHeader(String headerText, String bodyText);
void printCharacterTest();

#endif // PRINTER_H
