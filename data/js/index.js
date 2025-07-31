/**
 * @file index.js
 * @brief Index page specific functionality
 */

/**
 * Initialize index page when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
  // Initialize index-specific UI
  initializeIndexUI();
  
  // Initialize Unbidden Ink settings
  initializeUnbiddenInkSettings();
  
  // Initialize printer selection
  initializeConfigDependentUI();
});

/**
 * Initialize index page specific UI elements
 */
function initializeIndexUI() {
  // Update character counter on input for main message textarea
  const messageInput = document.getElementById('message-textarea');
  if (messageInput) {
    messageInput.addEventListener('input', () => updateCharacterCount('message-textarea', 'char-counter', MAX_CHARS));
    // Set initial character counter
    updateCharacterCount('message-textarea', 'char-counter', MAX_CHARS);
  }
}

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
  updateCharacterCount('custom-prompt', 'prompt-char-count', MAX_PROMPT_CHARS);
  
  // Initialize frequency display
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

/**
 * Generic character counter function
 * @param {string} textareaId - ID of the textarea element
 * @param {string} counterId - ID of the counter element  
 * @param {number} defaultMaxLength - Default max length if not set on textarea
 */
function updateCharacterCount(textareaId, counterId, defaultMaxLength = 1000) {
  const textarea = document.getElementById(textareaId);
  const counter = document.getElementById(counterId);
  
  if (textarea && counter) {
    const length = textarea.value.length;
    const maxLength = defaultMaxLength; // Always use the provided limit, not HTML maxlength
    counter.textContent = `${length}/${maxLength} characters`;
    
    // Get the parent div that contains the styling
    const parentDiv = counter.parentElement;
    if (parentDiv) {
      // Remove existing color classes from parent
      parentDiv.classList.remove('text-gray-500', 'text-yellow-700', 'text-red-600', 'dark:text-gray-400', 'dark:text-yellow-300', 'dark:text-red-400');
      
      // Update styling based on character count
      if (length > maxLength) {
        parentDiv.classList.add('text-red-600', 'dark:text-red-400');
      } else if (length >= maxLength * 0.8) {
        parentDiv.classList.add('text-yellow-700', 'dark:text-yellow-300');
      } else {
        parentDiv.classList.add('text-gray-500', 'dark:text-gray-400');
      }
    }
  }
}
