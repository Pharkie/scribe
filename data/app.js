// Global variables - will be set by the server
let MAX_CHARS = 200; // Default value, will be updated by config endpoint
let PRINTERS = []; // Will store all available printers

// Default prompts - keep in sync with C++ constants
const DEFAULT_MOTIVATION_PROMPT = "Generate a short, encouraging motivational message to help me stay focused and positive. Keep it brief, uplifting, and practical.";

// Fetch configuration from server
async function loadConfig() {
  try {
    const response = await fetch('/config');
    const config = await response.json();
    MAX_CHARS = config.maxMessageChars;
    
    // Set the maxlength attribute on textarea
    const textarea = document.getElementById('message-textarea');
    textarea.setAttribute('maxlength', MAX_CHARS);
    
    // Populate printer dropdown
    const printerSelect = document.getElementById('printer-target');
    printerSelect.innerHTML = ''; // Clear existing options
    
    // Store printer data for later use
    PRINTERS = config.remotePrinters;
    
    // Add local direct option (using first printer's name)
    const localDirectOption = document.createElement('option');
    localDirectOption.value = 'local-direct';
    localDirectOption.textContent = `${config.remotePrinters[0].name} (local, direct)`;
    printerSelect.appendChild(localDirectOption);
    
    // Add local via MQTT and other printers
    config.remotePrinters.forEach((printer, index) => {
      const option = document.createElement('option');
      option.value = printer.topic;
      // First printer is local via MQTT, others are remote
      option.textContent = index === 0 
        ? `${printer.name} (local, via MQTT)` 
        : `📡 ${printer.name} (remote via MQTT)`;
      printerSelect.appendChild(option);
    });
    
    // Update character counter
    updateCharCounter();
  } catch (error) {
    console.error('Failed to load config:', error);
  }
}

function updateCharCounter() {
  const textarea = document.getElementById('message-textarea');
  const counter = document.getElementById('char-counter');
  const remaining = MAX_CHARS - textarea.value.length;
  counter.textContent = `${remaining} characters left`;
  counter.classList.toggle('text-red-500', remaining <= 20);
}

function handleInput(el) {
  updateCharCounter();
}

// Unified form submission handler
function handleSubmit(event) {
  event.preventDefault();
  
  const printerTarget = document.getElementById('printer-target').value;
  const message = document.getElementById('message-textarea').value;
  
  if (!message.trim()) {
    alert('Please enter a message');
    return;
  }
  
  // Use unified message endpoint for all text messages
  sendMessage(printerTarget, message);
}

// Helper function to get action colors and name
function getActionConfig(action) {
  switch (action) {
    case 'riddle':
      return { colors: ['#a855f7', '#7c3aed', '#c084fc'], name: 'Riddle' }; // Purple
    case 'joke':
      return { colors: ['#f97316', '#ea580c', '#fb923c'], name: 'Joke' }; // Orange
    case 'test-print':
      return { colors: ['#6b7280', '#4b5563', '#9ca3af'], name: 'Test print' }; // Gray
    case 'quote':
      return { colors: ['#14b8a6', '#0f766e', '#5eead4'], name: 'Quote' }; // Teal
    case 'quiz':
      return { colors: ['#eab308', '#ca8a04', '#fde047'], name: 'Quiz' }; // Yellow
    case 'unbidden-ink':
      return { colors: ['#8b5cf6', '#7c3aed', '#a78bfa'], name: 'Unbidden Ink' }; // Purple
    default:
      return { colors: ['#3b82f6', '#1e40af', '#60a5fa'], name: 'Message' }; // Blue (default)
  }
}

// Send message using unified endpoint
function sendMessage(printerTarget, message, action = null) {
  // Determine source parameter based on printer target
  let source;
  if (printerTarget === 'local-direct') {
    source = 'local-direct';
  } else {
    source = printerTarget; // Use the MQTT topic as the source
  }

  const formData = new FormData();
  formData.append('message', message);
  formData.append('source', source);
  
  fetch('/message', {
    method: 'POST',
    body: formData
  })
  .then(response => {
    if (!response.ok) {
      // Handle HTTP error responses (like 500)
      return response.text().then(errorText => {
        throw new Error(errorText || `HTTP ${response.status}`);
      });
    }
    return response.text();
  })
  .then(data => {
    console.log('Message response:', data);
    
    // Get action-specific confetti colors and name
    const actionConfig = getActionConfig(action);
    
    // Confetti effect
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: actionConfig.colors
    });
    
    // Show success message
    const printerName = printerTarget === 'local-direct' ? 'local printer' : getPrinterName(printerTarget);
    showSuccessMessage(`${actionConfig.name} scribed to ${printerName}`);
    
    // Clear the form
    document.getElementById('message-textarea').value = '';
    updateCharCounter();
  })
  .catch(error => {
    console.error('Error occurred:', error);
    alert(`Failed to send message. Please try again.\n\nError: ${error.message}`);
  });
}

// Helper function to get printer name from topic
function getPrinterName(topic) {
  const printer = PRINTERS.find(p => p.topic === topic);
  return printer ? printer.name : 'remote printer';
}

// Handle quick actions (riddle, dad joke, character test)
function sendQuickAction(action) {
  const printerTarget = document.getElementById('printer-target').value;
  
  // Map action to endpoint - fail explicitly for unknown actions
  let endpoint;
  switch (action) {
    case 'riddle':
      endpoint = '/riddle';
      break;
    case 'joke':
      endpoint = '/joke';
      break;
    case 'test-print':
      endpoint = '/test-print';
      break;
    case 'quote':
      endpoint = '/quote';
      break;
    case 'quiz':
      endpoint = '/quiz';
      break;
    case 'unbidden-ink':
      endpoint = '/unbidden-ink';
      break;
    default:
      console.error('Unknown action:', action);
      alert('Unknown action: ' + action);
      return;
  }
  
  // Determine source parameter based on printer target
  let source;
  if (printerTarget === 'local-direct') {
    source = 'local-direct';  // Hardware buttons and web local-direct use "local-direct"
  } else {
    source = printerTarget; // Use the MQTT topic as the source
  }
  
  // Single unified call - processEndpoint handles everything
  fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `source=${encodeURIComponent(source)}`
  })
  .then(response => {
    if (!response.ok) {
      // Handle HTTP error responses (like 500)
      return response.text().then(errorText => {
        throw new Error(errorText || `HTTP ${response.status}`);
      });
    }
    return response.text();
  })
  .then(content => {
    console.log('Response:', content);
    
    // Get action-specific confetti colors and name
    const actionConfig = getActionConfig(action);
    
    // Confetti effect
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: actionConfig.colors
    });
    
    // Show success message
    showSuccessMessage(`${actionConfig.name} scribed`);
  })
  .catch(error => {
    console.error('Error occurred:', error);
    const actionConfig = getActionConfig(action);
    alert(`Failed to get ${actionConfig.name.toLowerCase()} content. Please try again.\n\nError: ${error.message}`);
  });
}

// Show success message
function showSuccessMessage(message) {
  const messageEl = document.getElementById('success-message');
  messageEl.textContent = '✅ ' + message;
  messageEl.classList.remove('opacity-0');
  messageEl.classList.add('opacity-100', 'animate-fade-in');
  
  // Fade out after 3 seconds
  setTimeout(() => {
    messageEl.classList.remove('opacity-100', 'animate-fade-in');
    messageEl.classList.add('opacity-0', 'animate-fade-out');
    setTimeout(() => {
      messageEl.classList.remove('animate-fade-out');
    }, 600);
  }, 3000);
}

// System status modal functionality
function showSystemStatus() {
  // Show the overlay
  const overlay = document.getElementById('diagnostics-overlay');
  overlay.classList.remove('hidden');
  setTimeout(() => {
    overlay.classList.remove('opacity-0');
    overlay.querySelector('.transform').classList.remove('scale-95');
  }, 10);

  // Fetch and display the data
  fetch('/status')
    .then(response => response.json())
    .then(data => {
      const uptimeHours = Math.floor(data.uptime / (1000 * 60 * 60));
      const uptimeMinutes = Math.floor((data.uptime % (1000 * 60 * 60)) / (1000 * 60));
      const memoryUsedPercent = Math.round((1 - (data.free_heap / data.total_heap)) * 100);
      const flashUsedPercent = data.flash_total > 0 ? Math.round((data.flash_used / data.flash_total) * 100) : 0;
      const flashFree = data.flash_total - data.flash_used;
      const sketchUsedPercent = data.free_sketch_space > 0 ? Math.round((data.sketch_size / (data.sketch_size + data.free_sketch_space)) * 100) : 0;
      
      let content = `
        <!-- Network Status -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 class="font-semibold text-blue-800 mb-3 flex items-center">
            <span class="text-lg mr-2">🌐</span> Network Status
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">WiFi:</span>
              <span class="font-medium ${data.wifi_connected ? 'text-green-600' : 'text-red-600'}">
                ${data.wifi_connected ? '✅ Connected' : '❌ Disconnected'}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Network:</span>
              <span class="font-medium">${data.wifi_ssid || 'Unknown'}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">IP Address:</span>
              <span class="font-medium font-mono">${data.ip_address}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Hostname:</span>
              <span class="font-medium font-mono">${data.mdns_hostname}.local</span>
            </div>
          </div>
        </div>

        <!-- MQTT Status -->
        <div class="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 class="font-semibold text-green-800 mb-3 flex items-center">
            <span class="text-lg mr-2">📡</span> MQTT Status
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">Broker:</span>
              <span class="font-medium ${data.mqtt_connected ? 'text-green-600' : 'text-red-600'}">
                ${data.mqtt_connected ? '✅ Connected' : '❌ Disconnected'}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Server:</span>
              <span class="font-medium font-mono">${data.mqtt_server}</span>
            </div>
            <div class="flex justify-between col-span-1 md:col-span-2">
              <span class="text-gray-600">Topic:</span>
              <span class="font-medium font-mono">${data.local_topic}</span>
            </div>
          </div>
        </div>

        <!-- Unbidden Ink Status -->
        <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 class="font-semibold text-purple-800 mb-3 flex items-center">
            <span class="text-lg mr-2">✨</span> Unbidden Ink Status
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">Feature:</span>
              <span class="font-medium ${data.unbidden_ink?.enabled ? 'text-green-600' : 'text-red-600'}">
                ${data.unbidden_ink?.enabled ? '✅ Enabled' : '❌ Disabled'}
              </span>
            </div>`;

      if (data.unbidden_ink?.enabled) {
        const nextMessage = calculateNextMessage(data.unbidden_ink);
        content += `
            <div class="flex justify-between">
              <span class="text-gray-600">Schedule:</span>
              <span class="font-medium">${data.unbidden_ink.start_hour}:00 - ${data.unbidden_ink.end_hour}:00</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Frequency:</span>
              <span class="font-medium">Every ${data.unbidden_ink.frequency_minutes} minutes</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Next Message:</span>
              <span class="font-medium">${nextMessage}</span>
            </div>`;
      }

      content += `
          </div>
        </div>

        <!-- System Resources -->
        <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h4 class="font-semibold text-orange-800 mb-3 flex items-center">
            <span class="text-lg mr-2">💾</span> System Resources
          </h4>
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-gray-600">RAM Usage:</span>
              <div class="flex items-center space-x-2">
                <div class="w-24 bg-gray-200 rounded-full h-2">
                  <div class="bg-orange-500 h-2 rounded-full" style="width: ${memoryUsedPercent}%"></div>
                </div>
                <span class="font-medium text-sm">${memoryUsedPercent}%</span>
              </div>
            </div>
            <div class="text-xs text-gray-500 text-right">
              ${Math.round(data.free_heap / 1024)}KB free / ${Math.round(data.total_heap / 1024)}KB total
            </div>
            
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Flash Usage:</span>
              <div class="flex items-center space-x-2">
                <div class="w-24 bg-gray-200 rounded-full h-2">
                  <div class="bg-orange-500 h-2 rounded-full" style="width: ${flashUsedPercent}%"></div>
                </div>
                <span class="font-medium text-sm">${flashUsedPercent}%</span>
              </div>
            </div>
            <div class="text-xs text-gray-500 text-right">
              ${Math.round(flashFree / 1024)}KB free / ${Math.round(data.flash_total / 1024)}KB total
            </div>
            
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Sketch Usage:</span>
              <div class="flex items-center space-x-2">
                <div class="w-24 bg-gray-200 rounded-full h-2">
                  <div class="bg-orange-500 h-2 rounded-full" style="width: ${sketchUsedPercent}%"></div>
                </div>
                <span class="font-medium text-sm">${sketchUsedPercent}%</span>
              </div>
            </div>
            <div class="text-xs text-gray-500 text-right">
              ${Math.round(data.sketch_size / 1024)}KB used / ${Math.round(data.free_sketch_space / 1024)}KB free
            </div>
            
            <div class="flex justify-between">
              <span class="text-gray-600">Uptime:</span>
              <span class="font-medium">${uptimeHours}h ${uptimeMinutes}m</span>
            </div>
          </div>
        </div>

        <!-- Configuration -->
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 class="font-semibold text-gray-800 mb-3 flex items-center">
            <span class="text-lg mr-2">🔧</span> Configuration
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">Settings File:</span>
              <span class="font-medium ${data.configuration?.settings_file_exists ? 'text-green-600' : 'text-red-600'}">
                ${data.configuration?.settings_file_exists ? '✅ Present' : '❌ Missing'}
              </span>
            </div>`;

      if (data.configuration?.settings_file_size) {
        content += `
            <div class="flex justify-between">
              <span class="text-gray-600">File Size:</span>
              <span class="font-medium">${data.configuration.settings_file_size} bytes</span>
            </div>`;
      }

      content += `
          </div>
        </div>

        <!-- Hardware Info -->
        <div class="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h4 class="font-semibold text-slate-800 mb-3 flex items-center">
            <span class="text-lg mr-2">💻</span> Hardware Info
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">Chip:</span>
              <span class="font-medium">${data.chip_model} Rev ${data.chip_revision || 'Unknown'}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">CPU:</span>
              <span class="font-medium">${data.cpu_freq}MHz</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">SDK:</span>
              <span class="font-medium">${data.sdk_version || 'Unknown'}</span>
            </div>`;

      if (data.temperature_celsius) {
        content += `
            <div class="flex justify-between">
              <span class="text-gray-600">Temperature:</span>
              <span class="font-medium">${Math.round(data.temperature_celsius)}°C</span>
            </div>`;
      }

      content += `
          </div>
        </div>

        <!-- Hardware Buttons Configuration -->
        <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <h4 class="font-semibold text-indigo-800 mb-3 flex items-center">
            <span class="text-lg mr-2">🔘</span> Hardware Buttons
          </h4>
          <div class="space-y-3">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">Button Count:</span>
                <span class="font-medium">${data.hardware_buttons?.num_buttons || 0}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Debounce:</span>
                <span class="font-medium">${data.hardware_buttons?.debounce_ms || 0}ms</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Long Press:</span>
                <span class="font-medium">${data.hardware_buttons?.long_press_ms || 0}ms</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Active Low:</span>
                <span class="font-medium ${data.hardware_buttons?.active_low ? 'text-green-600' : 'text-red-600'}">
                  ${data.hardware_buttons?.active_low ? '✅ Yes' : '❌ No'}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Min Interval:</span>
                <span class="font-medium">${data.hardware_buttons?.min_interval_ms || 0}ms</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Max/Minute:</span>
                <span class="font-medium">${data.hardware_buttons?.max_per_minute || 0}</span>
              </div>
            </div>`;

      if (data.hardware_buttons?.buttons && data.hardware_buttons.buttons.length > 0) {
        content += `
            <div class="mt-4">
              <h5 class="font-medium text-indigo-700 mb-2">Button Mapping:</h5>
              <div class="bg-white rounded border overflow-hidden">
                <table class="w-full text-xs">
                  <thead class="bg-indigo-100">
                    <tr>
                      <th class="px-2 py-1 text-left">GPIO</th>
                      <th class="px-2 py-1 text-left">Short Press</th>
                      <th class="px-2 py-1 text-left">Long Press</th>
                    </tr>
                  </thead>
                  <tbody>`;
        
        data.hardware_buttons.buttons.forEach((button, index) => {
          content += `
                    <tr class="${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}">
                      <td class="px-2 py-1 font-mono font-medium">${button.gpio}</td>
                      <td class="px-2 py-1 font-mono text-blue-600">${button.short_endpoint}</td>
                      <td class="px-2 py-1 font-mono ${button.long_endpoint ? 'text-green-600' : 'text-gray-400'}">${button.long_endpoint || 'None'}</td>
                    </tr>`;
        });
        
        content += `
                  </tbody>
                </table>
              </div>
            </div>`;
      }

      content += `
          </div>
        </div>

        <!-- Logging Configuration -->
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 class="font-semibold text-yellow-800 mb-3 flex items-center">
            <span class="text-lg mr-2">📝</span> Logging Configuration
          </h4>
          <div class="space-y-3">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">Log Level:</span>
                <span class="font-medium">${data.logging?.level_name || 'Unknown'} (${data.logging?.level || 'N/A'})</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Serial:</span>
                <span class="font-medium ${data.logging?.serial_enabled ? 'text-green-600' : 'text-red-600'}">
                  ${data.logging?.serial_enabled ? '✅ Enabled' : '❌ Disabled'}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">File Logging:</span>
                <span class="font-medium ${data.logging?.file_enabled ? 'text-green-600' : 'text-red-600'}">
                  ${data.logging?.file_enabled ? '✅ Enabled' : '❌ Disabled'}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">MQTT Logging:</span>
                <span class="font-medium ${data.logging?.mqtt_enabled ? 'text-green-600' : 'text-red-600'}">
                  ${data.logging?.mqtt_enabled ? '✅ Enabled' : '❌ Disabled'}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">BetterStack:</span>
                <span class="font-medium ${data.logging?.betterstack_enabled ? 'text-green-600' : 'text-red-600'}">
                  ${data.logging?.betterstack_enabled ? '✅ Enabled' : '❌ Disabled'}
                </span>
              </div>
            </div>`;

      if (data.logging?.file_enabled && data.logging?.file_name) {
        content += `
            <div class="mt-3 p-2 bg-yellow-100 rounded text-xs">
              <div class="flex justify-between">
                <span class="text-gray-600">Log File:</span>
                <span class="font-mono">${data.logging.file_name}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Max Size:</span>
                <span class="font-medium">${Math.round(data.logging.max_file_size / 1024)}KB</span>
              </div>
            </div>`;
      }

      if (data.logging?.mqtt_enabled && data.logging?.mqtt_topic) {
        content += `
            <div class="mt-3 p-2 bg-yellow-100 rounded text-xs">
              <div class="flex justify-between">
                <span class="text-gray-600">MQTT Topic:</span>
                <span class="font-mono">${data.logging.mqtt_topic}</span>
              </div>
            </div>`;
      }

      content += `
          </div>
        </div>`;
      
      document.getElementById('diagnostics-content').innerHTML = content;
    })
    .catch(error => {
      console.error('Error fetching status:', error);
      document.getElementById('diagnostics-content').innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <span class="text-red-600 font-medium">Failed to fetch system diagnostics</span>
          <p class="text-red-500 text-sm mt-2">${error.message}</p>
        </div>`;
    });
}

function closeDiagnostics() {
  const overlay = document.getElementById('diagnostics-overlay');
  overlay.classList.add('opacity-0');
  overlay.querySelector('.transform').classList.add('scale-95');
  setTimeout(() => {
    overlay.classList.add('hidden');
  }, 300);
}

// Helper function to calculate next Unbidden Ink message time
function calculateNextMessage(unbiddenInkData) {
  if (!unbiddenInkData.enabled) return 'N/A';
  
  const now = new Date();
  const currentHour = now.getHours();
  
  // If outside active hours
  if (currentHour < unbiddenInkData.start_hour || currentHour >= unbiddenInkData.end_hour) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(unbiddenInkData.start_hour, 0, 0, 0);
    return `Tomorrow at ${unbiddenInkData.start_hour}:00`;
  }
  
  // For active hours, show a simpler status
  if (unbiddenInkData.next_message_time && unbiddenInkData.next_message_time > 0) {
    return 'Scheduled (within frequency window)';
  }
  
  return 'Ready to send';
}

// Keyboard shortcut handling
function handleKeyPress(event) {
  const textarea = document.getElementById('message-textarea');
  
  // Only handle if the textarea is focused
  if (document.activeElement !== textarea) {
    return;
  }
  
  // Enter key without Shift = Send message
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault(); // Prevent default newline behavior
    
    // Trigger form submission
    const form = document.getElementById('printer-form');
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submitEvent);
  }
  
  // Shift+Enter = Allow default newline behavior (do nothing special)
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  loadConfig();
  loadSettings();
  initializeSettingsPanel();
  
  // Add keyboard shortcut listener to the textarea
  const textarea = document.getElementById('message-textarea');
  if (textarea) {
    textarea.addEventListener('keydown', handleKeyPress);
  }
});

// ========================================
// SETTINGS FUNCTIONALITY
// ========================================

// Settings state
let settingsVisible = false;

// Initialize settings panel
function initializeSettingsPanel() {
  // Populate hour dropdowns
  const startHourSelect = document.getElementById('start-hour');
  const endHourSelect = document.getElementById('end-hour');
  
  for (let i = 0; i < 24; i++) {
    const startOption = document.createElement('option');
    startOption.value = i;
    startOption.textContent = `${i.toString().padStart(2, '0')}:00`;
    startHourSelect.appendChild(startOption);
    
    const endOption = document.createElement('option');
    endOption.value = i;
    endOption.textContent = `${i.toString().padStart(2, '0')}:00`;
    endHourSelect.appendChild(endOption);
  }
  
  // Initialize frequency slider
  const frequencySlider = document.getElementById('frequency');
  const frequencyValue = document.getElementById('frequency-value');
  
  frequencySlider.addEventListener('input', function() {
    frequencyValue.textContent = `${this.value} min`;
  });
  
  // Close settings when clicking overlay
  document.getElementById('settings-overlay').addEventListener('click', function(e) {
    if (e.target === this) {
      toggleSettings();
    }
  });
}

// Toggle settings panel visibility
function toggleSettings() {
  const overlay = document.getElementById('settings-overlay');
  const panel = document.getElementById('settings-panel');
  
  if (settingsVisible) {
    // Hide settings
    overlay.classList.remove('settings-show');
    setTimeout(() => {
      overlay.classList.add('hidden');
    }, 300);
    settingsVisible = false;
  } else {
    // Show settings
    overlay.classList.remove('hidden');
    setTimeout(() => {
      overlay.classList.add('settings-show');
    }, 10);
    settingsVisible = true;
    
    // Load current settings when opening
    loadSettings();
  }
}

// Load current settings from server
async function loadSettings() {
  try {
    const response = await fetch('/unbidden-ink/settings');
    if (response.ok) {
      const settings = await response.json();
      
      // Update form fields
      document.getElementById('enable-unbidden-ink').checked = settings.enabled;
      document.getElementById('custom-prompt').value = settings.prompt || DEFAULT_MOTIVATION_PROMPT;
      document.getElementById('start-hour').value = settings.startHour;
      document.getElementById('end-hour').value = settings.endHour;
      document.getElementById('frequency').value = settings.frequencyMinutes;
      
      // Update frequency display
      document.getElementById('frequency-value').textContent = `${settings.frequencyMinutes} min`;
      
      // Update character count
      updatePromptCharCount();
      
      // Update settings container state based on enabled status
      toggleUnbiddenInkSettings();
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
    showSettingsStatus('Failed to load settings', 'error');
  }
}

// Save settings to server
async function saveSettings() {
  const settings = {
    enabled: document.getElementById('enable-unbidden-ink').checked,
    prompt: document.getElementById('custom-prompt').value,
    startHour: parseInt(document.getElementById('start-hour').value),
    endHour: parseInt(document.getElementById('end-hour').value),
    frequencyMinutes: parseInt(document.getElementById('frequency').value)
  };
  
  // Basic validation
  if (settings.enabled) {
    if (!settings.prompt.trim()) {
      showSettingsStatus('Prompt is required when Unbidden Ink is enabled', 'error');
      return;
    }
    if (settings.startHour >= settings.endHour) {
      showSettingsStatus('Start hour must be before end hour', 'error');
      return;
    }
  }
  
  try {
    showSettingsStatus('Saving...', 'info');
    
    const response = await fetch('/unbidden-ink/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    });
    
    if (response.ok) {
      showSettingsStatus('Settings saved successfully! 💾', 'success');
      
      // Close settings panel after a delay
      setTimeout(() => {
        toggleSettings();
      }, 1500);
    } else {
      const errorText = await response.text();
      showSettingsStatus(`Failed to save: ${errorText}`, 'error');
    }
  } catch (error) {
    console.error('Failed to save settings:', error);
    showSettingsStatus('Failed to save settings', 'error');
  }
}

// Save settings quietly (for auto-save when disabling)
async function saveSettingsQuietly() {
  const settings = {
    enabled: document.getElementById('enable-unbidden-ink').checked,
    prompt: document.getElementById('custom-prompt').value,
    startHour: parseInt(document.getElementById('start-hour').value),
    endHour: parseInt(document.getElementById('end-hour').value),
    frequencyMinutes: parseInt(document.getElementById('frequency').value)
  };
  
  try {
    await fetch('/unbidden-ink/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    });
    // Silent save - no status messages
  } catch (error) {
    console.error('Failed to auto-save settings:', error);
    // Silent failure - don't show error to user for auto-save
  }
}

// Test Unbidden Ink functionality
async function testUnbiddenInk() {
  try {
    showSettingsStatus('Sending test message...', 'info');
    
    const response = await fetch('/unbidden-ink', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'source=local-direct'
    });
    
    if (response.ok) {
      showSettingsStatus('Test message sent! 🧪', 'success');
      
      // Add confetti effect
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } else {
      const errorText = await response.text();
      showSettingsStatus(`Test failed: ${errorText}`, 'error');
    }
  } catch (error) {
    console.error('Failed to test Unbidden Ink:', error);
    showSettingsStatus('Test failed', 'error');
  }
}

// Show status message in settings panel
function showSettingsStatus(message, type) {
  const statusElement = document.getElementById('settings-status');
  
  // Set content and styling based on type
  statusElement.textContent = message;
  statusElement.className = `text-center text-sm min-h-[1.5rem] flex items-center justify-center transition-opacity duration-200 ${
    type === 'success' ? 'text-green-600' :
    type === 'error' ? 'text-red-600' :
    'text-blue-600'
  }`;
  
  // Show message
  statusElement.style.opacity = '1';
  
  // Auto-hide after delay (except for info messages)
  if (type !== 'info') {
    setTimeout(() => {
      statusElement.style.opacity = '0';
    }, type === 'success' ? 3000 : 5000);
  }
}

// Load prompt presets
function loadPromptPreset(presetType) {
  const prompts = {
    motivation: DEFAULT_MOTIVATION_PROMPT,
    doctorwho: "Share an interesting and lesser-known fact about Doctor Who - the characters, episodes, behind-the-scenes trivia, or science fiction concepts from the show. Make it engaging and fun for a fan.",
    wonderful: "Tell me about something wonderful happening in the world today - a scientific breakthrough, human kindness, environmental progress, or cultural achievement. Focus on positive, uplifting news.",
    creative: "Give me a creative writing prompt, art inspiration, or imaginative idea to spark my creativity. Something unique and thought-provoking that could lead to an interesting project or story."
  };
  
  const promptTextarea = document.getElementById('custom-prompt');
  if (promptTextarea && prompts[presetType]) {
    promptTextarea.value = prompts[presetType];
    updatePromptCharCount();
    
    // Add visual feedback
    promptTextarea.focus();
    promptTextarea.style.borderColor = '#8b5cf6';
    setTimeout(() => {
      promptTextarea.style.borderColor = '';
    }, 1000);
  }
}

// Toggle Unbidden Ink settings visibility and state
function toggleUnbiddenInkSettings() {
  const enableCheckbox = document.getElementById('enable-unbidden-ink');
  const settingsContainer = document.getElementById('unbidden-ink-settings');
  
  if (enableCheckbox.checked) {
    // Enable settings
    settingsContainer.style.opacity = '1';
    settingsContainer.style.pointerEvents = 'auto';
    
    // Enable all form elements within the container (including action buttons)
    const formElements = settingsContainer.querySelectorAll('input, select, textarea, button');
    formElements.forEach(element => {
      element.disabled = false;
    });
  } else {
    // Disable settings
    settingsContainer.style.opacity = '0.5';
    settingsContainer.style.pointerEvents = 'none';
    
    // Disable all form elements within the container (including action buttons)
    const formElements = settingsContainer.querySelectorAll('input, select, textarea, button');
    formElements.forEach(element => {
      element.disabled = true;
    });
    
    // Immediately save the disabled state
    saveSettingsQuietly();
  }
}

// Update character count for prompt
function updatePromptCharCount() {
  const promptTextarea = document.getElementById('custom-prompt');
  const charCountElement = document.getElementById('prompt-char-count');
  
  if (promptTextarea && charCountElement) {
    const currentLength = promptTextarea.value.length;
    const maxLength = 500;
    charCountElement.textContent = `${currentLength}/${maxLength}`;
    
    // Change color based on usage
    if (currentLength > maxLength * 0.9) {
      charCountElement.className = 'text-xs text-red-500';
    } else if (currentLength > maxLength * 0.7) {
      charCountElement.className = 'text-xs text-orange-500';
    } else {
      charCountElement.className = 'text-xs text-gray-400';
    }
  }
}

// Initialize character counter when page loads
document.addEventListener('DOMContentLoaded', function() {
  const promptTextarea = document.getElementById('custom-prompt');
  if (promptTextarea) {
    promptTextarea.addEventListener('input', updatePromptCharCount);
    updatePromptCharCount(); // Initial count
  }
});
