/**
 * @file config.js
 * @brief Configuration management and global variables
 */

// Global variables - will be set by the server
let MAX_CHARS = 200; // Default value, will be updated by config endpoint
let PRINTERS = []; // Will store all available printers

// Default prompts - keep in sync with C++ constants
const DEFAULT_MOTIVATION_PROMPT = "Generate a short, encouraging motivational message to help me stay focused and positive. Keep it brief, uplifting, and practical.";

/**
 * Load configuration from server and populate UI elements
 */
async function loadConfig() {
  try {
    const response = await fetch('/config');
    const config = await response.json();
    MAX_CHARS = config.maxMessageChars;
    
    // Set the maxlength attribute on textarea
    const textarea = document.getElementById('message-textarea');
    textarea.setAttribute('maxlength', MAX_CHARS);
    
    // Populate printer dropdown
    const printerSelect = document.getElementById('printer-target');
    printerSelect.innerHTML = ''; // Clear existing options
    
    // Store printer data for later use
    PRINTERS = config.remotePrinters;
    
    // Add local direct option (using first printer's name)
    const localDirectOption = document.createElement('option');
    localDirectOption.value = 'local-direct';
    localDirectOption.textContent = `${config.remotePrinters[0].name} (local, direct)`;
    printerSelect.appendChild(localDirectOption);
    
    // Add local via MQTT and other printers
    config.remotePrinters.forEach((printer, index) => {
      const option = document.createElement('option');
      option.value = printer.topic;
      // First printer is local via MQTT, others are remote
      option.textContent = index === 0 
        ? `${printer.name} (local, via MQTT)` 
        : `📡 ${printer.name} (remote via MQTT)`;
      printerSelect.appendChild(option);
    });
    
    // Update character counter
    updateCharCounter();
  } catch (error) {
    console.error('Failed to load config:', error);
  }
}

/**
 * Update character counter display
 */
function updateCharCounter() {
  const textarea = document.getElementById('message-textarea');
  const counter = document.getElementById('char-counter');
  const remaining = MAX_CHARS - textarea.value.length;
  counter.textContent = `${remaining} characters remaining`;
  counter.className = remaining < 20 ? 'text-red-500 text-sm' : 'text-gray-500 text-sm';
}
