/**
 * @file diagnostics.js
 * @brief System diagnostics and status display functionality using HTML templates
 */

/**
 * Format a timestamp (in seconds since epoch) to a readable date/time string
 */
function formatTimestamp(timestamp) {
  if (!timestamp || timestamp == 0) return 'Not scheduled';
  
  // Convert to milliseconds for JavaScript Date
  const date = new Date(timestamp * 1000);
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
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    diagnosticsTemplates = {
      deviceConfig: doc.getElementById('device-config-section-template').content.cloneNode(true),
      network: doc.getElementById('network-section-template').content.cloneNode(true),
      mqtt: doc.getElementById('mqtt-section-template').content.cloneNode(true),
      unbiddenInk: doc.getElementById('unbidden-ink-section-template').content.cloneNode(true),
      microcontroller: doc.getElementById('microcontroller-section-template').content.cloneNode(true),
      hardwareButtons: doc.getElementById('hardware-buttons-section-template').content.cloneNode(true),
      logging: doc.getElementById('logging-section-template').content.cloneNode(true),
      settingsFile: doc.getElementById('settings-file-section-template').content.cloneNode(true),
      loading: doc.getElementById('loading-template').content.cloneNode(true),
      error: doc.getElementById('error-template').content.cloneNode(true)
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
    console.log('Loading diagnostics templates...');
    const templates = await loadDiagnosticsTemplates();
    if (!templates) {
      throw new Error('Failed to load diagnostics templates');
    }
    console.log('Templates loaded successfully');
    
    // Show loading state using template
    const content = document.getElementById('diagnostics-content');
    const loadingSection = diagnosticsTemplates.loading.cloneNode(true);
    content.innerHTML = '';
    content.appendChild(loadingSection);

    // Fetch diagnostics data
    console.log('Fetching diagnostics data...');
    const response = await fetch('/status');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    console.log('Diagnostics data received:', data);
    
    displayDiagnostics(data);
  } catch (error) {
    console.error('Failed to load diagnostics:', error);
    displayDiagnosticsError(error.message);
  }
}

/**
 * Display diagnostics data using templates and DOM manipulation
 */
function displayDiagnostics(data) {
  const content = document.getElementById('diagnostics-content');
  if (!content) {
    console.error('Diagnostics content container not found');
    return;
  }
  
  console.log('Displaying diagnostics with data:', data);
  
  // Clear content
  content.innerHTML = '';
  
  try {
    // Calculate derived values
    const uptimeSeconds = Math.floor(data.uptime / 1000);
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    const uptimeHours = Math.floor(uptimeMinutes / 60);
    
    const memoryUsedPercent = Math.round(((data.total_heap - data.free_heap) / data.total_heap) * 100);
    const flashUsedPercent = Math.round((data.flash_used / data.flash_total) * 100);
    const flashFree = data.flash_total - data.flash_used;
    const sketchUsedPercent = Math.round((data.sketch_size / (data.sketch_size + data.free_sketch_space)) * 100);
    
  // Create and populate device configuration section
  console.log('Creating device configuration section...');
  const deviceConfigSection = diagnosticsTemplates.deviceConfig.cloneNode(true);
  populateDataFields(deviceConfigSection, {
    'device-owner': data.device_owner || 'Unknown',
    'timezone': data.timezone || 'Not configured',
    'mdns-hostname': data.mdns_hostname || 'Unknown'
  });
  content.appendChild(deviceConfigSection);
    
  // Create and populate network section
  console.log('Creating network section...');
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
  content.appendChild(mqttSection);  // Create and populate Unbidden Ink section
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
    'settings-file-size': data.configuration && data.configuration.settings_file_size 
      ? `${data.configuration.settings_file_size} bytes` 
      : 'Not available'
  });
  
  // Add settings file content if available
  if (data.configuration && data.configuration.settings_file_contents) {
    const fileContents = unbiddenSection.querySelector('#unbidden-ink-file-contents');
    if (fileContents) {
      fileContents.textContent = data.configuration.settings_file_contents;
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
  
  console.log('Diagnostics display completed successfully');
  } catch (error) {
    console.error('Error displaying diagnostics:', error);
    displayDiagnosticsError(`Display error: ${error.message}`);
  }
}

/**
 * Display error message
 */
function displayDiagnosticsError(message) {
  const content = document.getElementById('diagnostics-content');
  if (!content) return;
  
  // Use the error template from diagnostics-templates.html
  const errorSection = diagnosticsTemplates.error.cloneNode(true);
  const errorMessage = errorSection.querySelector('[data-field="error-message"]');
  if (errorMessage) {
    errorMessage.textContent = message;
  }
  
  content.innerHTML = '';
  content.appendChild(errorSection);
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
