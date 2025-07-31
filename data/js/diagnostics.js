/**
 * @file diagnostics.js
 * @brief System diagnostics and status display functionality using HTML templates
 */

/**
 * Load and display diagnostics data for the diagnostics page
 */
async function loadDiagnostics() {
  try {
    // Load templates first - they must work
    const templates = await loadDiagnosticsTemplates();
    if (!templates) {
      throw new Error('Failed to load diagnostics templates');
    }
    
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
  
  // Handle proper timestamps (Unix epoch)
  let date;
  if (timestamp > 946684800000) { // Jan 1, 2000 in milliseconds since epoch
    date = new Date(timestamp);
  } else {
    date = new Date(timestamp * 1000); // Convert seconds to milliseconds
  }
  
  const now = new Date();
  
  // Check if it's today
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    // Check if it's tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    if (isTomorrow) {
      return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleString([], { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  }
}

// Global templates cache
let diagnosticsTemplates = null;

/**
 * Load diagnostic templates from the template file
 */
async function loadDiagnosticsTemplates() {
  if (diagnosticsTemplates) return diagnosticsTemplates;
  
  try {
    const response = await fetch('/html/diagnostics-templates.html');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch templates: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    
    if (html.length === 0) {
      throw new Error('Templates file is empty');
    }
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Check if parsing worked
    if (!doc) {
      throw new Error('Failed to parse HTML document');
    }
    
    // Try to find each template and give specific error messages
    const templateIds = [
      'device-config-section-template',
      'network-section-template', 
      'mqtt-section-template',
      'unbidden-ink-section-template',
      'microcontroller-section-template',
      'hardware-buttons-section-template',
      'logging-section-template',
      'settings-file-section-template',
      'loading-template',
      'error-template'
    ];
    
    const foundTemplates = {};
    const missingTemplates = [];
    
    templateIds.forEach(id => {
      const element = doc.getElementById(id);
      if (element && element.content) {
        foundTemplates[id] = element.content.cloneNode(true);
      } else {
        missingTemplates.push(id);
        console.error(`✗ Missing template: ${id}`);
      }
    });
    
    if (missingTemplates.length > 0) {
      throw new Error(`Missing templates: ${missingTemplates.join(', ')}`);
    }
    
    diagnosticsTemplates = {
      deviceConfig: foundTemplates['device-config-section-template'],
      network: foundTemplates['network-section-template'],
      mqtt: foundTemplates['mqtt-section-template'],
      unbiddenInk: foundTemplates['unbidden-ink-section-template'],
      microcontroller: foundTemplates['microcontroller-section-template'],
      hardwareButtons: foundTemplates['hardware-buttons-section-template'],
      logging: foundTemplates['logging-section-template'],
      settingsFile: foundTemplates['settings-file-section-template'],
      loading: foundTemplates['loading-template'],
      error: foundTemplates['error-template']
    };
    
    return diagnosticsTemplates;
  } catch (error) {
    console.error('Failed to load diagnostics templates:', error);
    return null;
  }
}

/**
 * Show system status modal with diagnostics information
 */
async function showSystemStatus() {
  const overlay = document.getElementById('diagnostics-overlay');
  if (!overlay) {
    console.error('Diagnostics overlay not found');
    return;
  }
  
  // Show the modal
  overlay.classList.remove('hidden');
  setTimeout(() => {
    overlay.classList.remove('opacity-0');
    const panel = overlay.querySelector('.bg-white');
    if (panel) {
      panel.classList.remove('scale-95');
    }
  }, 10);

  try {
    // Load templates if needed
    const templates = await loadDiagnosticsTemplates();
    if (!templates) {
      throw new Error('Failed to load diagnostics templates');
    }
    
    // Show loading state using template
    const content = document.getElementById('diagnostics-content');
    const loadingSection = diagnosticsTemplates.loading.cloneNode(true);
    content.innerHTML = '';
    content.appendChild(loadingSection);

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
 * Display diagnostics data using templates
 */
function displayDiagnostics(data) {
  const content = document.getElementById('diagnostics-content');
  if (!content) {
    console.error('Diagnostics content container not found');
    return;
  }
  
  // Clear content
  content.innerHTML = '';
  
  try {
    // Calculate derived values
    const uptimeSeconds = Math.floor(data.uptime / 1000);
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    const uptimeHours = Math.floor(uptimeMinutes / 60);
    
    const memoryUsedPercent = Math.round(((data.total_heap - data.free_heap) / data.total_heap) * 100);
    const flashUsedPercent = Math.round((data.flash_used / data.flash_total) * 100);
    const sketchUsedPercent = Math.round((data.sketch_size / (data.sketch_size + data.free_sketch_space)) * 100);
    
    // Create and populate device configuration section
    const deviceConfigSection = diagnosticsTemplates.deviceConfig.cloneNode(true);
    populateDataFields(deviceConfigSection, {
      'device-owner': data.device_owner || 'Unknown',
      'timezone': data.timezone || 'Not configured',
      'mdns-hostname': data.mdns_hostname || 'Unknown'
    });
    content.appendChild(deviceConfigSection);
      
    // Create and populate network section
    const networkSection = diagnosticsTemplates.network.cloneNode(true);
    populateDataFields(networkSection, {
      'wifi-status': data.wifi_connected ? 'Connected' : 'Disconnected',
      'wifi-ssid': data.wifi_ssid || 'Not connected',
      'ip-address': data.ip_address || 'Not assigned',
      'signal-strength': data.rssi ? `${data.rssi} dBm` : 'Unknown',
      'mac-address': data.mac_address || 'Unknown',
      'gateway': data.gateway || 'Unknown',
      'dns': data.dns || 'Unknown'
    });
    content.appendChild(networkSection);
    
    // Create and populate MQTT section
    const mqttSection = diagnosticsTemplates.mqtt.cloneNode(true);
    populateDataFields(mqttSection, {
      'mqtt-status': data.mqtt_connected ? 'Connected' : 'Disconnected',
      'mqtt-server': data.mqtt_server || 'Not configured',
      'mqtt-port': data.mqtt_port || 'Unknown',
      'mqtt-topic': data.local_topic || 'Not configured'
    });
    content.appendChild(mqttSection);
    
    // Create and populate Unbidden Ink section
    const unbiddenSection = diagnosticsTemplates.unbiddenInk.cloneNode(true);
    
    // Use the correct field from the JSON response
    const unbiddenInkData = data.unbidden_ink || {};
    const unbiddenInkEnabled = unbiddenInkData.enabled;
    
    populateDataFields(unbiddenSection, {
      'unbidden-ink-status': unbiddenInkEnabled ? 'Enabled' : 'Disabled',
      'working-hours': unbiddenInkData.start_hour !== undefined && unbiddenInkData.end_hour !== undefined 
        ? `${unbiddenInkData.start_hour}:00 - ${unbiddenInkData.end_hour}:00` 
        : 'Not configured',
      'frequency': unbiddenInkData.frequency_minutes ? `${unbiddenInkData.frequency_minutes} minutes` : 'Not configured',
      'next-scheduled': unbiddenInkData.next_message_time ? formatTimestamp(unbiddenInkData.next_message_time) : 'Not scheduled',
      'settings-file-size': (() => {
        if (data.configuration && data.configuration.settings_file_size !== undefined) {
          return `${data.configuration.settings_file_size} bytes`;
        } else if (data.configuration && data.configuration.settings_file_error) {
          return 'Error reading file';
        } else if (data.configuration && data.configuration.settings_file_exists === false) {
          return 'File does not exist';
        } else {
          return 'Unknown';
        }
      })()
    });
    
    // Add settings file content - handle both existing and missing file cases
    const fileContents = unbiddenSection.querySelector('#unbidden-ink-file-contents');
    if (fileContents) {
      if (data.configuration && data.configuration.settings_file_contents) {
        fileContents.textContent = data.configuration.settings_file_contents;
        fileContents.className = fileContents.className.replace(/text-gray-500|text-red-500|italic/g, '');
      } else if (data.configuration && data.configuration.settings_file_error) {
        fileContents.textContent = `Error: ${data.configuration.settings_file_error}`;
        fileContents.className += " text-red-500";
      } else if (data.configuration && data.configuration.settings_file_exists === false) {
        fileContents.textContent = "Settings file does not exist yet.\nFile will be created when Unbidden Ink settings are saved.";
        fileContents.className += " text-gray-500 italic";
      } else {
        fileContents.textContent = "Unable to read settings file.";
        fileContents.className += " text-red-500";
      }
    }
    
    content.appendChild(unbiddenSection);
    
    // Create and populate microcontroller section
    const microSection = diagnosticsTemplates.microcontroller.cloneNode(true);
    
    populateDataFields(microSection, {
      'chip-model': data.chip_model || 'Unknown',
      'cpu-frequency': data.cpu_freq ? `${data.cpu_freq} MHz` : 'Unknown',
      'temperature': data.temperature_celsius ? `${data.temperature_celsius.toFixed(1)}°C` : 'Not available',
      'uptime': `${uptimeHours}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s`,
      'reset-reason': data.reset_reason || 'Unknown',
      
      // Memory usage text
      'heap-usage': data.total_heap ? `${((data.total_heap - data.free_heap) / 1024).toFixed(1)} KB / ${(data.total_heap / 1024).toFixed(1)} KB (${memoryUsedPercent}%)` : 'Unknown',
      'flash-usage': data.flash_total ? `${(data.flash_used / 1024).toFixed(1)} KB / ${(data.flash_total / 1024).toFixed(1)} KB (${flashUsedPercent}%)` : 'Unknown',
      'sketch-usage': data.sketch_size ? `${(data.sketch_size / 1024).toFixed(1)} KB / ${((data.sketch_size + data.free_sketch_space) / 1024).toFixed(1)} KB (${sketchUsedPercent}%)` : 'Unknown'
    });
    
    // Set capacity bar widths
    const heapBar = microSection.querySelector('[data-field="heap-bar"]');
    const flashBar = microSection.querySelector('[data-field="flash-bar"]');
    const sketchBar = microSection.querySelector('[data-field="sketch-bar"]');
    
    if (heapBar) heapBar.style.width = `${memoryUsedPercent}%`;
    if (flashBar) flashBar.style.width = `${flashUsedPercent}%`;
    if (sketchBar) sketchBar.style.width = `${sketchUsedPercent}%`;
    
    content.appendChild(microSection);
    
    // Create and populate hardware buttons section
    const hardwareSection = diagnosticsTemplates.hardwareButtons.cloneNode(true);
    const hardwareData = data.hardware_buttons || {};
    populateDataFields(hardwareSection, {
      'num-buttons': hardwareData.num_buttons || '0',
      'debounce-time': hardwareData.debounce_ms ? `${hardwareData.debounce_ms} ms` : 'Default',
      'long-press-time': hardwareData.long_press_ms ? `${hardwareData.long_press_ms} ms` : 'Default',
      'active-state': hardwareData.active_low ? 'Active Low' : 'Active High'
    });

    // Populate button list
    const buttonsList = hardwareSection.querySelector('#buttons-list');
    if (buttonsList && hardwareData.buttons && hardwareData.buttons.length > 0) {
      buttonsList.innerHTML = '';
      hardwareData.buttons.forEach((button, index) => {
        const buttonDiv = document.createElement('div');
        buttonDiv.className = 'bg-blue-100 p-2 rounded text-xs';
        buttonDiv.innerHTML = `
          <div class="font-medium">Button ${index + 1} (GPIO ${button.gpio})</div>
          <div class="text-gray-600">Short: ${button.short_endpoint || 'None'}</div>
          <div class="text-gray-600">Long: ${button.long_endpoint || 'None'}</div>
        `;
        buttonsList.appendChild(buttonDiv);
      });
    } else if (buttonsList) {
      buttonsList.innerHTML = '<div class="text-gray-500 italic">No buttons configured</div>';
    }
    content.appendChild(hardwareSection);
    
    // Create and populate logging section
    const loggingSection = diagnosticsTemplates.logging.cloneNode(true);
    const loggingData = data.logging || {};
    populateDataFields(loggingSection, {
      'log-level': loggingData.level_name || 'Unknown',
      'serial-logging': loggingData.serial_enabled ? 'Enabled' : 'Disabled',
      'file-logging': loggingData.file_enabled ? 'Enabled' : 'Disabled',
      'mqtt-logging': loggingData.mqtt_enabled ? 'Enabled' : 'Disabled',
      'betterstack-logging': loggingData.betterstack_enabled ? 'Enabled' : 'Disabled'
    });
    content.appendChild(loggingSection);
  } catch (error) {
    console.error('Error displaying diagnostics:', error);
    displayDiagnosticsError(`Display error: ${error.message}`);
  }
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format uptime milliseconds to human readable format
 */
function formatUptime(millis) {
  const seconds = Math.floor(millis / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} days, ${hours % 24} hours, ${minutes % 60} minutes`;
  } else if (hours > 0) {
    return `${hours} hours, ${minutes % 60} minutes`;
  } else if (minutes > 0) {
    return `${minutes} minutes, ${seconds % 60} seconds`;
  } else {
    return `${seconds} seconds`;
  }
}

/**
 * Display error message
 */
function displayDiagnosticsError(message) {
  const content = document.getElementById('diagnostics-content');
  if (!content) return;
  
  // Create simple error display without templates
  content.innerHTML = `
    <div class="flex items-center justify-center py-8">
      <div class="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
        <div class="flex items-center space-x-3">
          <span class="text-red-500 text-xl">❌</span>
          <div>
            <h3 class="text-red-800 font-medium">Error Loading Diagnostics</h3>
            <p class="text-red-600 text-sm mt-1">${message}</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Populate data fields in a template
 */
function populateDataFields(template, data) {
  Object.entries(data).forEach(([field, value]) => {
    const element = template.querySelector(`[data-field="${field}"]`);
    if (element) {
      element.textContent = value;
    }
  });
}

/**
 * Close diagnostics modal
 */
function closeDiagnostics() {
  const overlay = document.getElementById('diagnostics-overlay');
  if (!overlay) return;
  
  overlay.classList.add('opacity-0');
  const panel = overlay.querySelector('.bg-white');
  if (panel) {
    panel.classList.add('scale-95');
  }
  
  // Hide after transition
  setTimeout(() => {
    overlay.classList.add('hidden');
  }, 300);
}