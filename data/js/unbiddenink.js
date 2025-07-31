/**
 * @file unbiddenink.js
 * @brief Unbidden Ink settings panel functionality
 */

// Flag to prevent auto-saving during initial load
let isInitialLoad = true;

/**
 * Load current Unbidden Ink settings from the server
 */
async function loadSettings(showToast = false) {
  try {
    const response = await fetch('/unbiddenink-settings');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // The API returns the settings directly as JSON
    document.getElementById('unbidden-ink-enabled').checked = data.enabled || false;
    document.getElementById('custom-prompt').value = data.prompt || '';
    document.getElementById('start-hour').value = data.startHour || 9;
    document.getElementById('end-hour').value = data.endHour || 17;
    
    // Set frequency using the new mapping function
    setFrequencyFromValue(data.frequencyMinutes || 60);
    
    // Update character count
    updateCharacterCount('custom-prompt', 'prompt-char-count', MAX_PROMPT_CHARS);
    
    // Update settings visibility based on enabled state
    toggleUnbiddenInkSettings();
    
    // Clear the initial load flag after first load
    isInitialLoad = false;
    
    if (showToast) {
      console.log('Unbidden Ink settings loaded successfully:', data);
    }
  } catch (error) {
    console.error('Error loading Unbidden Ink settings:', error);
    if (showToast) {
      showErrorMessage('Failed to load Unbidden Ink settings: ' + error.message);
    }
  }
}

/**
 * Save Unbidden Ink settings to the server
 */
async function saveSettings(event) {
  if (event) {
    event.preventDefault();
  }
  
  // Collect settings from form elements directly
  const enabled = document.getElementById('unbidden-ink-enabled').checked;
  const settings = {
    enabled: enabled,
    prompt: document.getElementById('custom-prompt').value || (enabled ? 'Write a short, interesting message.' : ''),
    startHour: parseInt(document.getElementById('start-hour').value) || 9,
    endHour: parseInt(document.getElementById('end-hour').value) || 17,
    frequencyMinutes: getFrequencyValue() // Use the new mapping function
  };
  
  // Validate settings before sending
  if (enabled && !settings.prompt.trim()) {
    showErrorMessage('Prompt is required when Unbidden Ink is enabled');
    return;
  }
  
  if (settings.startHour >= settings.endHour) {
    showErrorMessage('Start hour must be before end hour');
    return;
  }
  
  console.log('Saving Unbidden Ink settings:', settings);
  
  try {
    const response = await fetch('/unbiddenink-settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings)
    });
    
    if (response.ok) {
      const message = await response.text();
      console.log('Server response:', message);
      showSuccessMessage('Unbidden Ink settings saved');
    } else {
      // Try to parse as JSON first, fall back to text if that fails
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || 'Failed to save Unbidden Ink settings';
      } catch (parseError) {
        errorMessage = await response.text() || 'Failed to save Unbidden Ink settings';
      }
      console.error('Server error response:', errorMessage);
      showErrorMessage(errorMessage);
    }
  } catch (error) {
    console.error('Error saving Unbidden Ink settings:', error);
    showErrorMessage('Failed to save Unbidden Ink settings: ' + error.message);
  }
}

/**
 * Toggle visibility of Unbidden Ink settings based on enabled state
 */
function toggleUnbiddenInkSettings() {
  const enableCheckbox = document.getElementById('unbidden-ink-enabled');
  const settingsContainer = document.getElementById('unbidden-ink-details');
  const settingsButton = document.getElementById('unbidden-ink-settings-button');
  
  if (enableCheckbox && settingsContainer && settingsButton) {
    if (enableCheckbox.checked) {
      settingsContainer.classList.remove('hidden');
      settingsButton.disabled = false;
    } else {
      settingsContainer.classList.add('hidden');
      settingsButton.disabled = true;
      // Close the settings panel if it's open when disabled
      const content = document.getElementById('unbidden-ink-content');
      const arrow = document.getElementById('unbidden-ink-arrow');
      if (content && !content.classList.contains('hidden')) {
        content.classList.add('hidden');
        if (arrow) {
          arrow.style.transform = 'rotate(0deg)';
        }
      }
      // Only auto-save when disabled by user interaction, not during initial load
      if (!isInitialLoad) {
        saveSettings();
      }
    }
  }
}

/**
 * Get the actual frequency value in minutes from the slider
 */
function getFrequencyValue() {
  const frequencySlider = document.getElementById('frequency');
  if (frequencySlider) {
    const frequencyMap = [15, 30, 60, 120, 180, 240, 300, 360, 420, 480];
    const position = parseInt(frequencySlider.value);
    return frequencyMap[position] || 60; // default to 1 hour
  }
  return 60;
}

/**
 * Update the frequency display text for Unbidden Ink frequency slider
 */
function updateFrequencyDisplay() {
  const frequencySlider = document.getElementById('frequency');
  const display = document.getElementById('frequency-display');
  if (display && frequencySlider) {
    // Map slider positions to specific frequency values
    const frequencyMap = [
      { value: 15, text: "Every 15 minutes" },    // position 0
      { value: 30, text: "Every 30 minutes" },    // position 1
      { value: 60, text: "Every 1 hour" },        // position 2
      { value: 120, text: "Every 2 hours" },      // position 3
      { value: 180, text: "Every 3 hours" },      // position 4
      { value: 240, text: "Every 4 hours" },      // position 5
      { value: 300, text: "Every 5 hours" },      // position 6
      { value: 360, text: "Every 6 hours" },      // position 7
      { value: 420, text: "Every 7 hours" },      // position 8
      { value: 480, text: "Every 8 hours" }       // position 9
    ];
    
    const position = parseInt(frequencySlider.value);
    if (position >= 0 && position < frequencyMap.length) {
      display.textContent = frequencyMap[position].text;
      // Store the actual frequency value as a data attribute for saving
      frequencySlider.setAttribute('data-frequency-minutes', frequencyMap[position].value);
    }
  }
}

/**
 * Set the slider position based on frequency value in minutes
 */
function setFrequencyFromValue(frequencyMinutes) {
  const frequencySlider = document.getElementById('frequency');
  if (frequencySlider) {
    const frequencyMap = [15, 30, 60, 120, 180, 240, 300, 360, 420, 480];
    const position = frequencyMap.indexOf(frequencyMinutes);
    if (position !== -1) {
      frequencySlider.value = position;
    } else {
      // Default to 1 hour if value not found
      frequencySlider.value = 2;
    }
    updateFrequencyDisplay();
  }
}

/**
 * Load a prompt preset
 */
function loadPromptPreset(type) {
  const promptTextarea = document.getElementById('custom-prompt');
  const prompts = {
    motivation: "Generate a short, encouraging motivational message to help me stay focused and positive. Keep it brief, uplifting, and practical.",
    doctorwho: "Share an interesting fact about Doctor Who - could be about the show, characters, or science fiction concepts from the series. Keep it under 150 characters.",
    wonderful: "Write about something wonderful in the world - could be nature, science, human achievement, or something beautiful. Keep it positive and under 120 characters.",
    creative: "Generate a creative writing prompt or artistic inspiration. Something to spark imagination and creativity. Keep it under 100 characters."
  };
  
  if (prompts[type]) {
    promptTextarea.value = prompts[type];
    updateCharacterCount('custom-prompt', 'prompt-char-count', MAX_PROMPT_CHARS);
  }
}

/**
 * Update prompt character count
 */
/**
 * Test Unbidden Ink by triggering a sample message
 */
async function testUnbiddenInk() {
  try {
    const response = await fetch('/unbidden-ink', {
      method: 'POST'
    });
    
    if (response.ok) {
      showSuccessMessage('Test message sent to printer!');
    } else {
      showErrorMessage('Failed to send test message');
    }
  } catch (error) {
    console.error('Error testing Unbidden Ink:', error);
    showErrorMessage('Failed to send test message');
  }
}

/**
 * Alias for saveSettings to match button onclick
 */
function saveUnbiddenInkSettings() {
  saveSettings();
}
