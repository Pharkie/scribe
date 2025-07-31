/**
 * @file main.js
 * @brief Main application initialization and event handling
 */

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
  // Load initial configuration
  loadConfig();
  
  // Add keyboard event listeners
  document.addEventListener('keydown', handleKeyPress);
  
  // Add form event listeners
  const messageForm = document.getElementById('printer-form');
  if (messageForm) {
    messageForm.addEventListener('submit', function(event) {
      event.preventDefault();
      
      const messageInput = document.getElementById('message-textarea');
      const printerSelect = document.getElementById('printer-target');
      
      if (messageInput && printerSelect) {
        sendMessage(messageInput.value, printerSelect.value);
      }
    });
  }
  
  // Update character counter on input
  const messageInput = document.getElementById('message-textarea');
  if (messageInput) {
    messageInput.addEventListener('input', updateCharCounter);
  }
  
  // Initialize any other UI elements
  initializeUI();
  
  // Initialize Unbidden Ink settings
  initializeUnbiddenInkSettings();
});

/**
 * Initialize Unbidden Ink settings form
 */
function initializeUnbiddenInkSettings() {
  // Populate hour select options
  populateHourSelects();
  
  // Add event listeners for settings form
  const promptTextarea = document.getElementById('custom-prompt');
  if (promptTextarea) {
    promptTextarea.addEventListener('input', updatePromptCharCount);
  }
  
  const frequencySlider = document.getElementById('frequency');
  if (frequencySlider) {
    frequencySlider.addEventListener('input', updateFrequencyDisplay);
  }
  
  // Prevent any form submission on the settings form
  const settingsForm = document.getElementById('unbiddeninksettings-form');
  if (settingsForm) {
    settingsForm.addEventListener('submit', function(event) {
      console.log('Settings form submission prevented');
      event.preventDefault();
      return false;
    });
  }
  
  // Initialize character count display
  updatePromptCharCount();
  updateFrequencyDisplay();
  
  // Load current settings from server on page load
  loadSettings();
}

/**
 * Populate hour select dropdowns with 0-23 options
 */
function populateHourSelects() {
  const startHourSelect = document.getElementById('start-hour');
  const endHourSelect = document.getElementById('end-hour');
  
  if (startHourSelect && endHourSelect) {
    for (let hour = 0; hour < 24; hour++) {
      const displayHour = hour === 0 ? '12 AM' : 
                         hour < 12 ? hour + ' AM' : 
                         hour === 12 ? '12 PM' : 
                         (hour - 12) + ' PM';
      
      const startOption = document.createElement('option');
      startOption.value = hour;
      startOption.textContent = displayHour;
      startHourSelect.appendChild(startOption);
      
      const endOption = document.createElement('option');
      endOption.value = hour;
      endOption.textContent = displayHour;
      endHourSelect.appendChild(endOption);
    }
    
    // Set default values
    startHourSelect.value = 9;  // 9 AM
    endHourSelect.value = 17;   // 5 PM
  }
}

/**
 * Initialize UI elements and state
 */
function initializeUI() {
  // Set initial character counter
  updateCharCounter();
  
  // Hide loading states
  const loadingElements = document.querySelectorAll('.loading');
  loadingElements.forEach(el => el.classList.add('hidden'));
  
  // Initialize any tooltips or interactive elements
  initializeTooltips();
  
  // Check for any startup messages
  checkStartupMessages();
}

/**
 * Initialize tooltips and help text
 */
function initializeTooltips() {
  // Add hover effects for info icons
  const infoIcons = document.querySelectorAll('.info-icon');
  infoIcons.forEach(icon => {
    icon.addEventListener('mouseenter', function() {
      // Show tooltip logic here if needed
    });
  });
}

/**
 * Check for any startup messages or notifications
 */
function checkStartupMessages() {
  // Check URL parameters for any messages
  const urlParams = new URLSearchParams(window.location.search);
  const message = urlParams.get('message');
  const type = urlParams.get('type');
  
  if (message) {
    if (type === 'success') {
      showSuccessMessage(decodeURIComponent(message));
    } else if (type === 'error') {
      showErrorMessage(decodeURIComponent(message));
    }
    
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

/**
 * Show error message to user
 */
function showErrorMessage(message) {
  const container = document.getElementById('message-container') || document.body;
  
  const errorDiv = document.createElement('div');
  errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
  errorDiv.textContent = message;
  
  container.appendChild(errorDiv);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
  }, 5000);
}

/**
 * Show success message to user
 */
function showSuccessMessage(message) {
  const container = document.getElementById('message-container') || document.body;
  
  const successDiv = document.createElement('div');
  successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
  successDiv.textContent = message;
  
  container.appendChild(successDiv);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (successDiv.parentNode) {
      successDiv.parentNode.removeChild(successDiv);
    }
  }, 3000);
}
