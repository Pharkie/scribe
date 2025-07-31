/**
 * @file settings.js
 * @brief Unbidden Ink settings panel functionality
 */

/**
 * Toggle settings panel visibility
 */
function toggleSettings() {
  const panel = document.getElementById('settings-panel');
  panel.classList.toggle('hidden');
  
  if (!panel.classList.contains('hidden')) {
    loadSettings();
  }
}

/**
 * Load current Unbidden Ink settings from the server
 */
async function loadSettings() {
  try {
    const response = await fetch('/unbidden-ink/settings');
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
  const settings = {
    enabled: document.getElementById('enable-unbidden-ink').checked,
    prompt: document.getElementById('custom-prompt').value,
    startHour: parseInt(document.getElementById('start-hour').value),
    endHour: parseInt(document.getElementById('end-hour').value),
    frequencyMinutes: parseInt(document.getElementById('frequency').value)
  };
  
  try {
    const response = await fetch('/unbidden-ink/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings)
    });
    
    if (response.ok) {
      const message = await response.text();
      showSuccessMessage('Unbidden Ink settings saved successfully');
      // Reload config to reflect changes
      loadConfig();
    } else {
      const errorMessage = await response.text();
      showErrorMessage(errorMessage || 'Failed to save Unbidden Ink settings');
    }
  } catch (error) {
    console.error('Error saving Unbidden Ink settings:', error);
    showErrorMessage('Failed to save Unbidden Ink settings');
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
    motivation: "Write a short, uplifting message to motivate someone during their workday. Keep it under 100 characters and focus on positivity and encouragement.",
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