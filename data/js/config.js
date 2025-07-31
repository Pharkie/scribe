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
    
    // Store printer data for later use
    PRINTERS = config.remotePrinters;
    
    // Initialize printer selection UI (if function exists)
    if (typeof initializeConfigDependentUI === 'function') {
      initializeConfigDependentUI();
    }
    
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
