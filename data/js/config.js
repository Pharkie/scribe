/**
 * @file config.js
 * @brief Configuration management and global variables
 */

// Global variables - will be set by the server
let MAX_CHARS; // Will be set by config endpoint - no default to ensure server provides it
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
    
    // Set the maxlength attribute on textarea (only if it exists)
    const textarea = document.getElementById('message-textarea');
    if (textarea) {
      textarea.setAttribute('maxlength', MAX_CHARS);
    }
    
    // Store printer data for later use
    PRINTERS = config.remotePrinters;
    
    // Initialize printer selection UI (if function exists)
    if (typeof initializeConfigDependentUI === 'function') {
      initializeConfigDependentUI();
    }
    
    // Update character counter (only if elements exist)
    updateCharacterCount('message-textarea', 'char-counter', MAX_CHARS);
  } catch (error) {
    console.error('Failed to load config:', error);
  }
}
