/**
 * @file diagnostics.js
 * @brief System diagnostics and status display functionality
 */

/**
 * Load and display diagnostics data for the diagnostics page
 */
async function loadDiagnostics() {
  try {
    // Fetch diagnostics data
    const response = await fetch('/status');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    
    displayDiagnostics(data);
  } catch (error) {
    console.error('Failed to load diagnostics:', error);
    displayDiagnosticsError(error.message);
  }
}

/**
 * Format a timestamp to a readable date/time string
 * Handles millis() values from ESP32 (milliseconds since device boot)
 */
function formatTimestamp(timestamp) {
  if (!timestamp || timestamp == 0) return 'Not scheduled';
  
  // For ESP32 millis() values, show relative time
  if (timestamp < 946684800) { // Less than year 2000 in seconds - this is millis() since boot
    // Convert milliseconds to minutes/hours for display
    const minutes = Math.floor(timestamp / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `In ${days} day(s)`;
    } else if (hours > 0) {
      return `In ${hours} hour(s)`;
    } else if (minutes > 0) {
      return `In ${minutes} minute(s)`;
    } else {
      return 'Very soon';
    }
  }
  
  // For actual timestamps (epoch time)
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
}

/**
 * Helper function to populate data fields in an element
 */
function populateDataFields(element, data) {
  Object.keys(data).forEach(key => {
    const field = element.querySelector(`[data-field="${key}"]`);
    if (field) {
      if (key.includes('-bar')) {
        // Handle progress bars
        field.style.width = data[key];
      } else {
        // Handle text content
        field.textContent = data[key];
      }
    }
  });
}

/**
 * Display diagnostics data
 */
function displayDiagnostics(data) {
  // Hide loading indicator
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.classList.add('hidden');
  }

  // Calculate derived values
  const uptimeSeconds = Math.floor(data.uptime / 1000);
  const uptimeMinutes = Math.floor(uptimeSeconds / 60);
  const uptimeHours = Math.floor(uptimeMinutes / 60);
  
  const memoryUsedPercent = Math.round(((data.total_heap - data.free_heap) / data.total_heap) * 100);
  const flashUsedPercent = Math.round((data.flash_used / data.flash_total) * 100);
  const sketchUsedPercent = Math.round((data.sketch_size / (data.sketch_size + data.free_sketch_space)) * 100);
  
  // Show and populate device configuration section
  const deviceConfigSection = document.getElementById('device-config-section');
  if (deviceConfigSection) {
    populateDataFields(deviceConfigSection, {
      'device-owner': data.device_owner || 'Unknown',
      'timezone': data.timezone || 'Not configured',
      'mdns-hostname': data.mdns_hostname || 'Unknown'
    });
    deviceConfigSection.classList.remove('hidden');
  }
    
  // Show and populate network section
  const networkSection = document.getElementById('network-section');
  if (networkSection) {
    populateDataFields(networkSection, {
      'wifi-status': data.wifi_connected ? 'Connected' : 'Disconnected',
      'wifi-ssid': data.wifi_ssid || 'Not connected',
      'ip-address': data.ip_address || 'Not assigned',
      'signal-strength': data.rssi ? `${data.rssi} dBm` : 'Unknown',
      'mac-address': data.mac_address || 'Unknown',
      'gateway': data.gateway || 'Unknown',
      'dns': data.dns || 'Unknown'
    });
    networkSection.classList.remove('hidden');
  }
  
  // Show and populate MQTT section
  const mqttSection = document.getElementById('mqtt-section');
  if (mqttSection) {
    populateDataFields(mqttSection, {
      'mqtt-status': data.mqtt_connected ? 'Connected' : 'Disconnected',
      'mqtt-server': data.mqtt_server || 'Not configured',
      'mqtt-port': data.mqtt_port || 'Unknown',
      'mqtt-topic': data.local_topic || 'Not configured'
    });
    mqttSection.classList.remove('hidden');
  }
  
  // Show and populate Unbidden Ink section
  const unbiddenSection = document.getElementById('unbidden-ink-section');
  if (unbiddenSection) {
    const unbiddenInkData = data.unbidden_ink || {};
    const unbiddenInkEnabled = unbiddenInkData.enabled;
    
    populateDataFields(unbiddenSection, {
      'unbidden-ink-status': unbiddenInkEnabled ? 'Enabled' : 'Disabled',
      'working-hours': unbiddenInkData.start_hour && unbiddenInkData.end_hour ? 
        `${unbiddenInkData.start_hour}:00 - ${unbiddenInkData.end_hour}:00` : 'Not configured',
      'frequency': unbiddenInkData.frequency_minutes ? 
        `${unbiddenInkData.frequency_minutes} minutes` : 'Not configured',
      'next-scheduled': formatTimestamp(unbiddenInkData.next_execution_time),
      'settings-file-size': unbiddenInkData.settings_file_size ? 
        `${unbiddenInkData.settings_file_size} bytes` : 'Unknown'
    });
    
    // Populate file contents
    const fileContentsElement = document.getElementById('unbidden-ink-file-contents');
    if (fileContentsElement && unbiddenInkData.settings_file_contents) {
      fileContentsElement.textContent = unbiddenInkData.settings_file_contents;
    } else if (fileContentsElement) {
      fileContentsElement.textContent = 'No file data available';
    }
    
    unbiddenSection.classList.remove('hidden');
  }
  
  // Show and populate microcontroller section
  const microcontrollerSection = document.getElementById('microcontroller-section');
  if (microcontrollerSection) {
    populateDataFields(microcontrollerSection, {
      'chip-model': data.chip_model || 'Unknown',
      'cpu-frequency': data.cpu_freq ? `${data.cpu_freq} MHz` : 'Unknown',
      'temperature': data.temperature ? `${data.temperature}°C` : 'Unknown',
      'uptime': uptimeHours > 0 ? `${uptimeHours}h ${uptimeMinutes % 60}m` : `${uptimeMinutes}m`,
      'reset-reason': data.reset_reason || 'Unknown',
      'heap-usage': `${Math.round((data.total_heap - data.free_heap) / 1024)} KB / ${Math.round(data.total_heap / 1024)} KB (${memoryUsedPercent}%)`,
      'flash-usage': `${Math.round(data.flash_used / 1024)} KB / ${Math.round(data.flash_total / 1024)} KB (${flashUsedPercent}%)`,
      'sketch-usage': `${Math.round(data.sketch_size / 1024)} KB / ${Math.round((data.sketch_size + data.free_sketch_space) / 1024)} KB (${sketchUsedPercent}%)`,
      'heap-bar': `${memoryUsedPercent}%`,
      'flash-bar': `${flashUsedPercent}%`,
      'sketch-bar': `${sketchUsedPercent}%`
    });
    microcontrollerSection.classList.remove('hidden');
  }
  
  // Show and populate hardware buttons section
  const hardwareButtonsSection = document.getElementById('hardware-buttons-section');
  if (hardwareButtonsSection && data.hardware_buttons) {
    const buttonsContent = document.getElementById('hardware-buttons-content');
    if (buttonsContent) {
      buttonsContent.innerHTML = ''; // Clear existing content
      
      data.hardware_buttons.forEach(button => {
        const buttonEntry = document.createElement('div');
        buttonEntry.className = 'flex justify-between';
        buttonEntry.innerHTML = `
          <span class="text-gray-600 dark:text-gray-400">${button.label || `Pin ${button.pin}`}:</span>
          <span class="font-medium text-gray-900 dark:text-gray-100">${button.action || 'Not configured'}</span>
        `;
        buttonsContent.appendChild(buttonEntry);
      });
    }
    hardwareButtonsSection.classList.remove('hidden');
  }
  
  // Show and populate logging section
  const loggingSection = document.getElementById('logging-section');
  if (loggingSection) {
    populateDataFields(loggingSection, {
      'log-level': data.log_level || 'Unknown',
      'serial-logging': data.serial_logging ? 'Enabled' : 'Disabled',
      'file-logging': data.file_logging ? 'Enabled' : 'Disabled',
      'mqtt-logging': data.mqtt_logging ? 'Enabled' : 'Disabled',
      'betterstack-logging': data.betterstack_logging ? 'Enabled' : 'Disabled'
    });
    loggingSection.classList.remove('hidden');
  }
}

/**
 * Display an error message when diagnostics fail to load
 */
function displayDiagnosticsError(message) {
  // Hide loading indicator
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.classList.add('hidden');
  }

  // Show error container
  const errorContainer = document.getElementById('error-container');
  const errorMessage = document.getElementById('error-message');
  
  if (errorContainer && errorMessage) {
    errorMessage.textContent = message;
    errorContainer.classList.remove('hidden');
  }
}

/**
 * Copy section content to clipboard
 */
function copySection(sectionId, button) {
  const section = document.getElementById(`${sectionId}-section`);
  if (!section) return;
  
  let content = '';
  const dataFields = section.querySelectorAll('[data-field]');
  dataFields.forEach(field => {
    const label = field.closest('.flex')?.querySelector('.text-gray-600, .text-gray-400')?.textContent;
    if (label && field.textContent) {
      content += `${label} ${field.textContent}\n`;
    }
  });
  
  navigator.clipboard.writeText(content).then(() => {
    // Visual feedback
    const originalText = button.innerHTML;
    button.innerHTML = '✓';
    button.disabled = true;
    setTimeout(() => {
      button.innerHTML = originalText;
      button.disabled = false;
    }, 1000);
  });
}

/**
 * Copy generic section content to clipboard
 */
function copyGenericSection(sectionName, button) {
  const section = button.closest('.bg-purple-50, .bg-blue-50, .bg-green-50, .bg-orange-50, .bg-yellow-50');
  if (!section) return;
  
  let content = `${sectionName}:\n`;
  const dataFields = section.querySelectorAll('[data-field]');
  dataFields.forEach(field => {
    const label = field.closest('.flex')?.querySelector('.text-gray-600, .text-gray-400')?.textContent;
    if (label && field.textContent) {
      content += `${label} ${field.textContent}\n`;
    }
  });
  
  navigator.clipboard.writeText(content).then(() => {
    // Visual feedback
    const originalText = button.innerHTML;
    button.innerHTML = '✓';
    button.disabled = true;
    setTimeout(() => {
      button.innerHTML = originalText;
      button.disabled = false;
    }, 1000);
  });
}

/**
 * Copy file contents to clipboard
 */
function copyFileContents(button) {
  const fileContents = document.getElementById('unbidden-ink-file-contents');
  if (!fileContents) return;
  
  navigator.clipboard.writeText(fileContents.textContent).then(() => {
    // Visual feedback
    const originalText = button.innerHTML;
    button.innerHTML = '✓';
    button.disabled = true;
    setTimeout(() => {
      button.innerHTML = originalText;
      button.disabled = false;
    }, 1000);
  });
}
