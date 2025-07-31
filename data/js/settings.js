/**
 * @file settings.js
 * @brief Settings panel functionality
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
 * Load current settings from the server
 */
async function loadSettings() {
  try {
    const response = await fetch('/api/settings');
    const data = await response.json();
    
    if (data.success) {
      // Populate form fields
      document.getElementById('device-name').value = data.settings.device_name || '';
      document.getElementById('max-chars').value = data.settings.max_characters || '';
      document.getElementById('printer-type').value = data.settings.printer_type || '';
      document.getElementById('baud-rate').value = data.settings.baud_rate || '';
      
      // Network settings
      document.getElementById('wifi-ssid').value = data.settings.wifi_ssid || '';
      document.getElementById('wifi-password').value = data.settings.wifi_password || '';
      
      // MQTT settings
      document.getElementById('mqtt-enabled').checked = data.settings.mqtt_enabled || false;
      document.getElementById('mqtt-server').value = data.settings.mqtt_server || '';
      document.getElementById('mqtt-port').value = data.settings.mqtt_port || '';
      document.getElementById('mqtt-username').value = data.settings.mqtt_username || '';
      document.getElementById('mqtt-password').value = data.settings.mqtt_password || '';
      document.getElementById('mqtt-topic').value = data.settings.mqtt_topic || '';
      
      // API settings
      document.getElementById('api-enabled').checked = data.settings.api_enabled || false;
      document.getElementById('api-key').value = data.settings.api_key || '';
      
      // Logging settings
      document.getElementById('log-level').value = data.settings.log_level || '';
      document.getElementById('log-to-serial').checked = data.settings.log_to_serial || false;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    showErrorMessage('Failed to load settings');
  }
}

/**
 * Save settings to the server
 */
async function saveSettings(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const settings = {};
  
  // Convert FormData to object
  for (const [key, value] of formData.entries()) {
    if (key.includes('enabled') || key.includes('serial')) {
      settings[key] = true; // Checkbox values
    } else {
      settings[key] = value;
    }
  }
  
  // Handle unchecked checkboxes
  const checkboxes = ['mqtt_enabled', 'api_enabled', 'log_to_serial'];
  checkboxes.forEach(checkbox => {
    if (!formData.has(checkbox)) {
      settings[checkbox] = false;
    }
  });
  
  try {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings)
    });
    
    const data = await response.json();
    
    if (data.success) {
      showSuccessMessage('Settings saved successfully');
      // Reload config to reflect changes
      loadConfig();
    } else {
      showErrorMessage(data.message || 'Failed to save settings');
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    showErrorMessage('Failed to save settings');
  }
}

/**
 * Reset settings to defaults
 */
async function resetSettings() {
  if (!confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
    return;
  }
  
  try {
    const response = await fetch('/api/settings/reset', {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (data.success) {
      showSuccessMessage('Settings reset to defaults');
      loadSettings(); // Reload the form
      loadConfig(); // Reload the main config
    } else {
      showErrorMessage(data.message || 'Failed to reset settings');
    }
  } catch (error) {
    console.error('Error resetting settings:', error);
    showErrorMessage('Failed to reset settings');
  }
}

/**
 * Export settings as JSON file
 */
async function exportSettings() {
  try {
    const response = await fetch('/api/settings/export');
    const data = await response.json();
    
    if (data.success) {
      const blob = new Blob([JSON.stringify(data.settings, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'scribe-settings.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showSuccessMessage('Settings exported successfully');
    } else {
      showErrorMessage(data.message || 'Failed to export settings');
    }
  } catch (error) {
    console.error('Error exporting settings:', error);
    showErrorMessage('Failed to export settings');
  }
}

/**
 * Import settings from JSON file
 */
function importSettings() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const settings = JSON.parse(text);
      
      const response = await fetch('/api/settings/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings)
      });
      
      const data = await response.json();
      
      if (data.success) {
        showSuccessMessage('Settings imported successfully');
        loadSettings(); // Reload the form
        loadConfig(); // Reload the main config
      } else {
        showErrorMessage(data.message || 'Failed to import settings');
      }
    } catch (error) {
      console.error('Error importing settings:', error);
      showErrorMessage('Invalid settings file or import failed');
    }
  };
  input.click();
}
