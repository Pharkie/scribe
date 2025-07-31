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
  
  // Load settings from server on page load (silently)
  if (typeof loadSettings === 'function') {
    loadSettings();
  }
  
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
  // Set initial character counter (only if elements exist)
  if (document.getElementById('message-textarea') && document.getElementById('char-counter')) {
    updateCharCounter();
  }
  
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

/**
 * Toggle Unbidden Ink section expand/collapse
 */
function toggleUnbiddenInkSection() {
  const content = document.getElementById('unbidden-ink-content');
  const arrow = document.getElementById('unbidden-ink-arrow');
  const button = document.getElementById('unbidden-ink-settings-button');
  
  // Don't toggle if button is disabled
  if (button && button.disabled) {
    return;
  }
  
  if (content && arrow) {
    if (content.classList.contains('hidden')) {
      content.classList.remove('hidden');
      arrow.style.transform = 'rotate(180deg)';
      // Settings are already loaded on page load, no need to reload
    } else {
      content.classList.add('hidden');
      arrow.style.transform = 'rotate(0deg)';
    }
  }
}

/**
 * Initialize printer selection UI with icons
 */
function initializePrinterSelection() {
  const container = document.getElementById('printer-selection');
  if (!container) return;
  
  // Clear existing content
  container.innerHTML = '';
  
  // Add local-direct printer option
  const localOption = createPrinterOption('local-direct', '🖨️', 'Local (direct)', true);
  container.appendChild(localOption);
  
  // Add other printers from PRINTERS config
  if (typeof PRINTERS !== 'undefined') {
    PRINTERS.forEach(printer => {
      const option = createPrinterOption(printer.topic, '📡', printer.name, false);
      container.appendChild(option);
    });
  }
}

/**
 * Create a printer option element
 */
function createPrinterOption(value, icon, name, isSelected = false) {
  const option = document.createElement('div');
  option.className = `printer-option cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 hover:shadow-md ${
    isSelected ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 dark:border-orange-600' : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
  }`;
  option.setAttribute('data-value', value);
  
  option.innerHTML = `
    <div class="flex items-center space-x-3">
      <span class="text-2xl">${icon}</span>
      <div>
        <div class="font-medium text-sm">${name}</div>
        ${value === 'local-direct' ? '<div class="text-xs text-gray-500 dark:text-gray-400">Direct connection</div>' : '<div class="text-xs text-gray-500 dark:text-gray-400">MQTT connection</div>'}
      </div>
    </div>
  `;
  
  option.addEventListener('click', () => selectPrinter(value, option));
  
  return option;
}

/**
 * Handle printer selection
 */
function selectPrinter(value, element) {
  // Remove selection from all options
  document.querySelectorAll('.printer-option').forEach(option => {
    option.className = option.className.replace(/border-orange-400|bg-orange-50|text-orange-700|dark:bg-orange-900\/20|dark:text-orange-300|dark:border-orange-600/g, '')
                                   .replace(/border-gray-200|bg-gray-50|text-gray-700|dark:border-gray-600|dark:bg-gray-700|dark:text-gray-300/g, '')
                        + ' border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500';
  });
  
  // Add selection to clicked option
  element.className = element.className.replace(/border-gray-200|bg-gray-50|text-gray-700|hover:border-gray-300|dark:border-gray-600|dark:bg-gray-700|dark:text-gray-300|dark:hover:border-gray-500/g, '')
                    + ' border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 dark:border-orange-600';
  
  // Update hidden input
  const hiddenInput = document.getElementById('printer-target');
  if (hiddenInput) {
    hiddenInput.value = value;
  }
}

/**
 * Initialize UI components that depend on config being loaded
 */
function initializeConfigDependentUI() {
  initializePrinterSelection();
}
