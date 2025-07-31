/**
 * @file unbiddenink.js
 * @brief Unbidden Ink settings panel functionality
 */

/**
 * Toggle settings panel visibility
 */
function toggleSettings() {
  const overlay = document.getElementById('settings-overlay');
  const panel = document.getElementById('settings-panel');
  
  if (overlay.classList.contains('hidden')) {
    // Show the overlay
    overlay.classList.remove('hidden');
    setTimeout(() => {
      overlay.classList.remove('opacity-0');
      panel.classList.remove('scale-95');
    }, 10);
    // Don't automatically load settings - let the user manually refresh if needed
  } else {
    // Hide the overlay
    overlay.classList.add('opacity-0');
    panel.classList.add('scale-95');
    setTimeout(() => {
      overlay.classList.add('hidden');
    }, 300);
  }
}

/**
 * Load current Unbidden Ink settings from the server
 */
async function loadSettings() {
  try {
    const response = await fetch('/unbiddenink-settings');
    const data = await response.json();
    
    // The API returns the settings directly as JSON
    document.getElementById('enable-unbidden-ink').checked = data.enabled || false;
    document.getElementById('custom-prompt').value = data.prompt || '';
    document.getElementById('start-hour').value = data.startHour || 9;
    document.getElementById('end-hour').value = data.endHour || 17;
    document.getElementById('frequency').value = data.frequencyMinutes || 60;
    
    // Update frequency display
    updateFrequencyDisplay();
    
    // Update settings visibility based on enabled state
    toggleUnbiddenInkSettings();
  } catch (error) {
    console.error('Error loading Unbidden Ink settings:', error);
    showErrorMessage('Failed to load Unbidden Ink settings');
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
  const enabled = document.getElementById('enable-unbidden-ink').checked;
  const settings = {
    enabled: enabled,
    prompt: document.getElementById('custom-prompt').value || (enabled ? 'Write a short, interesting message.' : ''),
    startHour: parseInt(document.getElementById('start-hour').value) || 9,
    endHour: parseInt(document.getElementById('end-hour').value) || 17,
    frequencyMinutes: parseInt(document.getElementById('frequency').value) || 60
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
      const errorMessage = await response.text();
      console.error('Server error response:', errorMessage);
      showErrorMessage(errorMessage || 'Failed to save Unbidden Ink settings');
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
  const settingsContainer = document.getElementById('unbidden-ink-settings');
  const enableCheckbox = document.getElementById('enable-unbidden-ink');
  
  if (enableCheckbox.checked) {
    settingsContainer.classList.remove('opacity-50', 'pointer-events-none');
  } else {
    settingsContainer.classList.add('opacity-50', 'pointer-events-none');
  }
  
  // Auto-save when the enable/disable state changes
  saveSettings();
}

/**
 * Update the frequency display text
 */
function updateFrequencyDisplay() {
  const frequency = document.getElementById('frequency').value;
  const display = document.getElementById('frequency-value');
  if (display) {
    display.textContent = frequency + ' min';
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
    updatePromptCharCount();
  }
}

/**
 * Update prompt character count
 */
function updatePromptCharCount() {
  const prompt = document.getElementById('custom-prompt').value;
  const counter = document.getElementById('prompt-char-count');
  if (counter) {
    counter.textContent = prompt.length + '/500';
    if (prompt.length > 450) {
      counter.classList.add('text-red-500');
    } else {
      counter.classList.remove('text-red-500');
    }
  }
}

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
