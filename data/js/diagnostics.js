/**
 * @file diagnostics.js
 * @brief System diagnostics and status display functionality using HTML templates
 */

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
      network: doc.getElementById('network-section-template').content.cloneNode(true),
      mqtt: doc.getElementById('mqtt-section-template').content.cloneNode(true),
      unbiddenInk: doc.getElementById('unbidden-ink-section-template').content.cloneNode(true),
      microcontroller: doc.getElementById('microcontroller-section-template').content.cloneNode(true),
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
    
  // Create and populate network section
  console.log('Creating network section...');
  const networkSection = diagnosticsTemplates.network.cloneNode(true);
  populateDataFields(networkSection, {
    'wifi-status': data.wifi_connected ? 'Connected ✅' : 'Disconnected ❌',
    'wifi-ssid': data.wifi_ssid || 'Not connected',
    'ip-address': data.ip_address || 'Not assigned',
    'signal-strength': data.rssi ? `${data.rssi} dBm` : 'Unknown',
    'mac-address': data.mac_address || 'Unknown'
  });
  content.appendChild(networkSection);
  
  // Create and populate MQTT section
  const mqttSection = diagnosticsTemplates.mqtt.cloneNode(true);
  populateDataFields(mqttSection, {
    'mqtt-status': data.mqtt_connected ? 'Connected ✅' : 'Disconnected ❌',
    'mqtt-server': data.mqtt_server || 'Not configured',
    'mqtt-port': data.mqtt_port || 'Not configured',
    'mqtt-client-id': data.mqtt_client_id || 'Not configured',
    'mqtt-topic': data.local_topic || 'Not configured',
    'mqtt-error': data.mqtt_error || 'None'
  });
  content.appendChild(mqttSection);  // Create and populate Unbidden Ink section
  const unbiddenSection = diagnosticsTemplates.unbiddenInk.cloneNode(true);
  
  // Use the correct field from the JSON response
  const unbiddenInkEnabled = data.unbidden_ink && data.unbidden_ink.enabled;
  
  populateDataFields(unbiddenSection, {
    'unbidden-enabled': unbiddenInkEnabled ? 'Enabled ✅' : 'Disabled ❌',
    'api-key-status': data.api_key_configured ? 'Configured ✅' : 'Not configured ❌',
    'last-check': data.last_unbidden_check || 'Never',
    'total-messages': data.unbidden_message_count || '0'
  });
  content.appendChild(unbiddenSection);
  
  // Create and populate microcontroller section
  const microSection = diagnosticsTemplates.microcontroller.cloneNode(true);
  populateDataFields(microSection, {
    'chip-model': data.chip_model || 'Unknown',
    'cpu-frequency': data.cpu_freq ? `${data.cpu_freq} MHz` : 'Unknown',
    'flash-size': data.flash_total ? `${(data.flash_total / 1024).toFixed(1)} KB` : 'Unknown',
    'free-heap': data.free_heap ? `${(data.free_heap / 1024).toFixed(1)} KB` : 'Unknown',
    'uptime': `${uptimeHours}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s`,
    'reset-reason': data.reset_reason || 'Unknown',
    'temperature': data.temperature_celsius ? `${data.temperature_celsius.toFixed(1)}°C` : 'Not available'
  });
  content.appendChild(microSection);
  
  // Create and populate logging section
  const loggingSection = diagnosticsTemplates.logging.cloneNode(true);
  populateDataFields(loggingSection, {
    'log-level': data.logging ? data.logging.level_name || 'Unknown' : 'Unknown',
    'serial-logging': data.logging ? (data.logging.serial_enabled ? 'Enabled ✅' : 'Disabled ❌') : 'Unknown'
  });
  content.appendChild(loggingSection);
  
  // Create and populate settings file section if config data exists
  if (data.configuration && data.configuration.settings_file_contents) {
    const settingsSection = diagnosticsTemplates.settingsFile.cloneNode(true);
    const fileContents = settingsSection.querySelector('#file-contents');
    if (fileContents) {
      fileContents.textContent = data.configuration.settings_file_contents;
    }
    content.appendChild(settingsSection);
  }
  
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
