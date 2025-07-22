#include <WiFi.h>
#include <WebServer.h>
#include <WiFiUdp.h>
#include <HardwareSerial.h>
#include <ESPmDNS.h>
#include <esp_task_wdt.h>
#include <ezTime.h>
#include "config.h"

// **** YOU PROBABLY DON'T NEED TO CHANGE ANYTHING BELOW HERE *****

// === Function Declarations ===
void validateConfig();
void connectToWiFi();
void setupmDNS();
void setupWebServer();
void handleRoot();
void handleSubmit();
void handleStatus();
void handle404();
String getFormattedDateTime();
String formatCustomDate(String customDate);
bool isValidDate(int day, int month, int year);
int calculateDayOfWeek(int day, int month, int year);
void initializePrinter();
void printReceipt();
void printServerInfo();
void setInverse(bool enable);
void printLine(String line);
void advancePaper(int lines);
void printWrappedUpsideDown(String text);

// === Timezone ===
Timezone myTZ;

// === Web Server ===
WebServer server(80);

// === Printer Setup ===
HardwareSerial printer(1); // Use UART1 on ESP32-C3
const int maxCharsPerLine = 32;

// === Storage for form data ===
struct Receipt
{
  String message;
  String timestamp;
  bool hasData;
};

Receipt currentReceipt = {"", "", false};

// === WiFi Reconnection Variables ===
unsigned long lastReconnectAttempt = 0;
const unsigned long reconnectInterval = 30000; // 30 seconds

// === Memory Monitoring Variables ===
unsigned long lastMemCheck = 0;
const unsigned long memCheckInterval = 60000; // 60 seconds

void setup()
{
  Serial.begin(115200);
  Serial.println("\n=== Thermal Printer Server Starting ===");

  // Validate configuration
  validateConfig();

  // Enable watchdog timer (8 seconds)
  esp_task_wdt_init(8, true);
  esp_task_wdt_add(NULL);
  Serial.println("Watchdog timer enabled (8s timeout)");

  // Log initial memory status
  Serial.println("Free heap: " + String(ESP.getFreeHeap()) + " bytes");

  // Initialize printer
  initializePrinter();

  // Connect to WiFi
  connectToWiFi();

  // Setup mDNS
  setupmDNS();

  // Initialize timezone with automatic DST handling
  waitForSync();
  myTZ.setLocation(timezone);
  Serial.println("Timezone configured: " + String(timezone));
  Serial.println("Current time: " + myTZ.dateTime());

  // Setup web server routes
  setupWebServer();

  // Start the server
  server.begin();
  Serial.println("Web server started");

  // Print server info
  printServerInfo();

  Serial.println("=== Setup Complete ===");
}

void loop()
{
  // Feed the watchdog
  esp_task_wdt_reset();

  // Check WiFi connection and reconnect if needed
  if (WiFi.status() != WL_CONNECTED)
  {
    if (millis() - lastReconnectAttempt > reconnectInterval)
    {
      Serial.println("WiFi disconnected, attempting reconnection...");
      WiFi.begin(wifiSSID, wifiPassword);
      lastReconnectAttempt = millis();
    }
  }

  // Handle web server requests (only if WiFi is connected)
  if (WiFi.status() == WL_CONNECTED)
  {
    server.handleClient();
  }

  // ezTime handles NTP updates automatically

  // Check if we have a new receipt to print
  if (currentReceipt.hasData)
  {
    printReceipt();
    currentReceipt.hasData = false; // Reset flag
  }

  // Monitor memory usage periodically
  if (millis() - lastMemCheck > memCheckInterval)
  {
    Serial.println("Free heap: " + String(ESP.getFreeHeap()) + " bytes");
    lastMemCheck = millis();
  }

  delay(10); // Small delay to prevent excessive CPU usage
}

// === Configuration Validation ===
void validateConfig()
{
  Serial.println("Validating configuration...");

  if (strlen(wifiSSID) == 0)
  {
    Serial.println("ERROR: WiFi SSID not configured!");
  }

  if (strlen(mdnsHostname) == 0)
  {
    Serial.println("ERROR: mDNS hostname not configured!");
  }

  if (RX_PIN == TX_PIN)
  {
    Serial.println("ERROR: RX and TX pins cannot be the same!");
  }

  Serial.println("Configuration validation complete");
}

// === WiFi Connection ===
void connectToWiFi()
{
  Serial.print("Connecting to WiFi: ");
  Serial.println(wifiSSID);

  WiFi.begin(wifiSSID, wifiPassword);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30)
  {
    delay(1000);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.println();
    Serial.println("WiFi connected successfully!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  }
  else
  {
    Serial.println();
    Serial.println("Failed to connect to WiFi - continuing anyway");
    Serial.println("Will attempt reconnection every 30 seconds in main loop");
  }
}

// === mDNS Setup ===
void setupmDNS()
{
  if (MDNS.begin(mdnsHostname))
  {
    Serial.println("mDNS responder started");
    Serial.println("Access the form at: http://" + String(mdnsHostname) + ".local");

    // Add service to MDNS-SD
    MDNS.addService("http", "tcp", 80);
  }
  else
  {
    Serial.println("Error setting up mDNS responder!");
  }
}

// === Web Server Setup ===
void setupWebServer()
{
  // Serve the main page
  server.on("/", HTTP_GET, handleRoot);

  // Handle form submission
  server.on("/submit", HTTP_POST, handleSubmit);

  // Also handle submission via URL
  server.on("/submit", HTTP_GET, handleSubmit);

  // System status endpoint
  server.on("/status", HTTP_GET, handleStatus);

  // Handle 404
  server.onNotFound(handle404);

  Serial.println("Web server routes configured");
}

// === Web Server Handlers ===
void handleRoot()
{
  String html = R"rawliteral(
<!DOCTYPE html>
<html lang="en" class="bg-gray-50 text-gray-900">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Life Receipt</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
  <script defer>
    const MAX_CHARS = )rawliteral" +
                String(maxReceiptChars) + R"rawliteral(; // Character limit from config
    
    function updateCharCounter(textarea) {
      const counter = document.getElementById('char-counter');
      const remaining = MAX_CHARS - textarea.value.length;
      counter.textContent = `${remaining} characters left`;
      counter.classList.toggle('text-red-500', remaining <= 20);
    }
    
    function handleInput(el) {
      updateCharCounter(el);
    }
    
    function handleSubmit(e) {
      e.preventDefault();
      const formData = new FormData(e.target);
      fetch('/submit', {
        method: 'POST',
        body: formData
      }).then(() => {
        const form = document.getElementById('receipt-form');
        const message = document.getElementById('thank-you');
        form.classList.add('hidden');
        message.classList.remove('hidden');
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      });
    }
    
    function handleKeyPress(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('receipt-form').dispatchEvent(new Event('submit'));
      }
    }
    
    function newReceipt() {
      const form = document.getElementById('receipt-form');
      const message = document.getElementById('thank-you');
      const textarea = document.querySelector('textarea[name="message"]');
      
      // Reset form
      textarea.value = '';
      updateCharCounter(textarea); // Use the same function for consistency
      
      // Show form, hide thank you message
      form.classList.remove('hidden');
      message.classList.add('hidden');
      
      // Focus on textarea
      textarea.focus();
    }
  </script>
</head>
<body class="flex flex-col min-h-screen justify-between items-center py-12 px-4 font-sans">
  <main class="w-full max-w-md text-center">
    <h1 class="text-3xl font-semibold mb-10 text-gray-900 tracking-tight">Life Receipt</h1>
    <form id="receipt-form" onsubmit="handleSubmit(event)" action="/submit" method="post" class="bg-white shadow-2xl rounded-3xl p-8 space-y-6 border border-gray-100">
      <textarea
        name="message"
        maxlength=")rawliteral" +
                String(maxReceiptChars) + R"rawliteral("
        oninput="handleInput(this)"
        onkeypress="handleKeyPress(event)"
        placeholder="Type your receipt…"
        class="w-full p-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent resize-none text-gray-800 placeholder-gray-400"
        rows="4"
        required
        autofocus
      ></textarea>
      <div id="char-counter" class="text-sm text-gray-500 text-right"></div>
      <button type="submit" class="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
        Send
      </button>
    </form>
    <div id="thank-you" class="hidden text-gray-700 font-semibold text-xl mt-8 animate-fade-in">
      🎉 Receipt submitted. You did it!
      <button onclick="newReceipt()" class="mt-4 w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
        New Receipt
      </button>
    </div>
  </main>
  <footer class="text-sm text-gray-400 mt-16">
    Designed with love by <a href="https://urbancircles.club" target="_blank" class="text-gray-500 hover:text-gray-700 transition-colors duration-200 underline decoration-gray-300 hover:decoration-gray-500 underline-offset-2">Peter / Urban Circles</a>
  </footer>
  <style>
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fade-in 0.6s ease-out forwards;
    }
  </style>
  <script>
    // Initialize character counter on page load
    document.addEventListener('DOMContentLoaded', function() {
      const textarea = document.querySelector('textarea[name="message"]');
      updateCharCounter(textarea);
    });
  </script>
</body>
</html>
)rawliteral";

  server.send(200, "text/html", html);
}

void handleSubmit()
{
  if (server.hasArg("message"))
  {
    currentReceipt.message = server.arg("message");

    // Check if a custom date was provided
    if (server.hasArg("date"))
    {
      String customDate = server.arg("date");
      currentReceipt.timestamp = formatCustomDate(customDate);
      Serial.println("Using custom date: " + customDate);
    }
    else
    {
      currentReceipt.timestamp = getFormattedDateTime();
      Serial.println("Using current date");
    }

    currentReceipt.hasData = true;

    Serial.println("=== New Receipt Received ===");
    Serial.println("Message: " + currentReceipt.message);
    Serial.println("Time: " + currentReceipt.timestamp);
    Serial.println("============================");

    server.send(200, "text/plain", "Receipt received and will be printed!");
  }
  else
  {
    server.send(400, "text/plain", "Missing message parameter");
  }
}

void handleStatus()
{
  String json = "{";
  json += "\"wifi_connected\":" + String(WiFi.status() == WL_CONNECTED ? "true" : "false") + ",";
  json += "\"ip_address\":\"" + WiFi.localIP().toString() + "\",";
  json += "\"mdns_hostname\":\"" + String(mdnsHostname) + "\",";
  json += "\"uptime\":" + String(millis()) + ",";
  json += "\"free_heap\":" + String(ESP.getFreeHeap());
  json += "}";

  server.send(200, "application/json", json);
}

void handle404()
{
  String uri = server.uri();
  String method = (server.method() == HTTP_GET) ? "GET" : "POST";

  Serial.println("=== 404 Error ===");
  Serial.println("Method: " + method);
  Serial.println("URI: " + uri);
  Serial.println("Args: " + String(server.args()));
  for (int i = 0; i < server.args(); i++)
  {
    Serial.println("  " + server.argName(i) + ": " + server.arg(i));
  }
  Serial.println("================");

  server.send(404, "text/plain", "Page not found: " + method + " " + uri);
}

// === Time Utilities ===
String getFormattedDateTime()
{
  // Use ezTime for automatic timezone handling
  // Format: "Tue, 22 Jul 2025"
  return myTZ.dateTime("D, d M Y");
}

// === Date Validation ===
bool isValidDate(int day, int month, int year)
{
  if (year < 1900 || year > 2100)
    return false;
  if (month < 1 || month > 12)
    return false;
  if (day < 1)
    return false;

  // Days in month (handling leap years)
  int daysInMonth[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};

  // Check for leap year
  if (month == 2 && ((year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)))
  {
    daysInMonth[1] = 29;
  }

  if (day > daysInMonth[month - 1])
    return false;

  return true;
}

// === Day of Week Calculation ===
int calculateDayOfWeek(int day, int month, int year)
{
  // Zeller's Congruence algorithm for day of week calculation
  if (month < 3)
  {
    month += 12;
    year -= 1;
  }

  int k = year % 100;
  int j = year / 100;

  int h = (day + ((13 * (month + 1)) / 5) + k + (k / 4) + (j / 4) - 2 * j) % 7;

  // Convert to standard format (0=Sun, 1=Mon, etc.)
  return (h + 5) % 7;
}

String formatCustomDate(String customDate)
{
  // Parse common date formats and return formatted string
  // Supported formats: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, MM/DD/YYYY

  String dayNames[] = {"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"};
  String monthNames[] = {"Jan", "Feb", "Mar", "Apr", "May", "Jun",
                         "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};

  int day = 0, month = 0, year = 0;
  bool parsed = false;

  // Remove any whitespace
  customDate.trim();

  // Try multiple date formats
  if (customDate.indexOf('-') != -1)
  {
    // Handle YYYY-MM-DD or DD-MM-YYYY
    int firstDash = customDate.indexOf('-');
    int secondDash = customDate.indexOf('-', firstDash + 1);

    if (firstDash > 0 && secondDash > firstDash + 1)
    {
      String part1 = customDate.substring(0, firstDash);
      String part2 = customDate.substring(firstDash + 1, secondDash);
      String part3 = customDate.substring(secondDash + 1);

      if (part1.length() == 4)
      {
        // YYYY-MM-DD format
        year = part1.toInt();
        month = part2.toInt();
        day = part3.toInt();
      }
      else
      {
        // DD-MM-YYYY format
        day = part1.toInt();
        month = part2.toInt();
        year = part3.toInt();
      }
      parsed = true;
    }
  }
  else if (customDate.indexOf('/') != -1)
  {
    // Handle DD/MM/YYYY or MM/DD/YYYY
    int firstSlash = customDate.indexOf('/');
    int secondSlash = customDate.indexOf('/', firstSlash + 1);

    if (firstSlash > 0 && secondSlash > firstSlash + 1)
    {
      int part1 = customDate.substring(0, firstSlash).toInt();
      int part2 = customDate.substring(firstSlash + 1, secondSlash).toInt();
      int part3 = customDate.substring(secondSlash + 1).toInt();

      // Try DD/MM/YYYY first, then MM/DD/YYYY if validation fails
      day = part1;
      month = part2;
      year = part3;

      // If DD/MM/YYYY doesn't validate, try MM/DD/YYYY
      if (!isValidDate(day, month, year))
      {
        month = part1;
        day = part2;
        year = part3;
      }

      parsed = true;
    }
  }

  // Validate parsed values
  if (!parsed || !isValidDate(day, month, year))
  {
    Serial.println("Invalid date format: '" + customDate + "', using current date");
    Serial.println("Supported formats: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, MM/DD/YYYY");
    return getFormattedDateTime();
  }

  // Calculate actual day of week
  int dayOfWeek = calculateDayOfWeek(day, month, year);

  // Format: "Sat, 06 Jun 2025"
  String formatted = dayNames[dayOfWeek] + ", ";
  formatted += String(day < 10 ? "0" : "") + String(day) + " ";
  formatted += monthNames[month - 1] + " ";
  formatted += String(year);

  Serial.println("Parsed date: " + formatted + " (from input: " + customDate + ")");
  return formatted;
}

// === Printer Functions ===
void initializePrinter()
{
  // Initialize UART1 with user-configurable pins
  printer.begin(9600, SERIAL_8N1, RX_PIN, TX_PIN); // baud, config, RX pin, TX pin
  delay(500);

  // Initialise
  printer.write(0x1B);
  printer.write('@'); // ESC @
  delay(50);

  // Set stronger black fill (print density/heat)
  printer.write(0x1B);
  printer.write('7');
  printer.write(15);  // Heating dots (max 15)
  printer.write(150); // Heating time
  printer.write(250); // Heating interval

  // Enable 180° rotation (which also reverses the line order)
  printer.write(0x1B);
  printer.write('{');
  printer.write(0x01); // ESC { 1

  Serial.println("Printer initialized");
}

void printReceipt()
{
  Serial.println("Printing receipt...");

  // Print wrapped message first (appears at bottom after rotation)
  printWrappedUpsideDown(currentReceipt.message);

  // Print header last (appears at top after rotation)
  setInverse(true);
  printLine(currentReceipt.timestamp);
  setInverse(false);

  // Advance paper
  advancePaper(2);

  Serial.println("Receipt printed successfully");
}

void printServerInfo()
{
  Serial.println("=== Server Info ===");
  Serial.print("Local IP: ");
  Serial.println(WiFi.localIP());
  Serial.println("Access the form at: http://" + WiFi.localIP().toString() + " or http://" + String(mdnsHostname) + ".local");
  Serial.println("==================");

  // Also print server info on the thermal printer
  Serial.println("Printing server info on thermal printer...");

  String serverInfo = "Server: " + String(mdnsHostname) + ".local or " + WiFi.localIP().toString();
  printWrappedUpsideDown(serverInfo);

  setInverse(true);
  printLine("PRINTER SERVER READY");
  setInverse(false);

  advancePaper(3);
}

// === Original Printer Helper Functions ===
void setInverse(bool enable)
{
  printer.write(0x1D);
  printer.write('B');
  printer.write(enable ? 1 : 0); // GS B n
}

void printLine(String line)
{
  printer.println(line);
}

void advancePaper(int lines)
{
  for (int i = 0; i < lines; i++)
  {
    printer.write(0x0A); // LF
  }
}

void printWrappedUpsideDown(String text)
{
  String lines[100];
  int lineCount = 0;

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
        lines[lineCount++] = currentLine;
        break;
      }

      int lastSpace = currentLine.lastIndexOf(' ', maxCharsPerLine);
      if (lastSpace == -1)
        lastSpace = maxCharsPerLine;

      lines[lineCount++] = currentLine.substring(0, lastSpace);
      currentLine = currentLine.substring(lastSpace);
      currentLine.trim();
    }
  }

  // Print lines in reverse order (upside down)
  for (int i = lineCount - 1; i >= 0; i--)
  {
    printLine(lines[i]);
  }
}
