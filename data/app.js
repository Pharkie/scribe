// Global variables - will be set by the server
let MAX_CHARS = 200; // Default value, will be updated by config endpoint
let PRINTERS = []; // Will store all available printers

// Fetch configuration from server
async function loadConfig() {
  try {
    const response = await fetch('/config');
    const config = await response.json();
    MAX_CHARS = config.maxReceiptChars;
    
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
  
  if (printerTarget === 'local-direct') {
    // Print directly to local printer
    printLocalMessage(message);
  } else {
    // Send via MQTT to selected printer
    sendMQTTMessage(printerTarget, message);
  }
}

// Helper function to get action colors and name
function getActionConfig(action) {
  switch (action) {
    case 'riddle':
      return { colors: ['#a855f7', '#7c3aed', '#c084fc'], name: 'Riddle' }; // Purple
    case 'joke':
      return { colors: ['#f97316', '#ea580c', '#fb923c'], name: 'Joke' }; // Orange
    case 'test-print':
      return { colors: ['#22c55e', '#16a34a', '#4ade80'], name: 'Test print' }; // Green
    case 'quote':
      return { colors: ['#14b8a6', '#0f766e', '#5eead4'], name: 'Quote' }; // Teal
    case 'quiz':
      return { colors: ['#eab308', '#ca8a04', '#fde047'], name: 'Quiz' }; // Yellow
    default:
      return { colors: ['#3b82f6', '#1e40af', '#60a5fa'], name: 'Message' }; // Blue (default)
  }
}

// Print message to local printer
function printLocalMessage(message, action = null) {
  const formData = new FormData();
  formData.append('message', message);
  
  fetch('/print-local', {
    method: 'POST',
    body: formData
  })
  .then(response => response.text())
  .then(data => {
    console.log('Local print response:', data);
    
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
    
    // Clear the form
    document.getElementById('message-textarea').value = '';
    updateCharCounter();
  })
  .catch(error => {
    console.error('Error occurred:', error);
    alert('Failed to print message. Please try again. Error: ' + error.message);
  });
}

// Send message via MQTT
function sendMQTTMessage(topic, message, action = null) {
  const payload = {
    topic: topic,
    message: message
  };

  fetch('/mqtt-send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  })
  .then(response => response.text())
  .then(data => {
    // Get action-specific confetti colors and name
    const actionConfig = getActionConfig(action);
    
    // Confetti effect
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: actionConfig.colors
    });
    
    // Show success message
    const printerName = getPrinterName(topic);
    showSuccessMessage(`${actionConfig.name} scribed`);
    
    // Clear the form
    document.getElementById('message-textarea').value = '';
    updateCharCounter();
  })
  .catch(error => {
    console.error('Error occurred:', error);
    alert('Failed to send message. Please try again. Error: ' + error.message);
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
    default:
      console.error('Unknown action:', action);
      alert('Unknown action: ' + action);
      return;
  }
  
  // Step 1: Get content from the content endpoint
  fetch(endpoint, {
    method: 'POST'
  })
  .then(response => response.text())
  .then(content => {
    // Step 2: Send content via appropriate channel with action type
    if (printerTarget === 'local-direct') {
      // Send to local printer with action type for correct colors
      printLocalMessage(content, action);
    } else {
      // Send via MQTT with action type for correct colors
      sendMQTTMessage(printerTarget, content, action);
    }
  })
  .catch(error => {
    console.error('Error occurred:', error);
    const actionConfig = getActionConfig(action);
    alert(`Failed to get ${actionConfig.name.toLowerCase()} content. Please try again. Error: ` + error.message);
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
  fetch('/status')
    .then(response => response.json())
    .then(data => {
      const uptimeHours = Math.floor(data.uptime / (1000 * 60 * 60));
      const uptimeMinutes = Math.floor((data.uptime % (1000 * 60 * 60)) / (1000 * 60));
      const memoryUsedPercent = Math.round((1 - (data.free_heap / data.total_heap)) * 100);
      const flashUsedPercent = data.flash_total > 0 ? Math.round((data.flash_used / data.flash_total) * 100) : 0;
      const flashFree = data.flash_total - data.flash_used;
      
      const status = `📊 Scribe Printer Diagnostics

🌐 Network Status:
• WiFi: ${data.wifi_connected ? '✅ Connected' : '❌ Disconnected'}
• Network: ${data.wifi_ssid || 'Unknown'}
• IP Address: ${data.ip_address}
• Hostname: ${data.mdns_hostname}.local

📡 MQTT Status:
• Broker: ${data.mqtt_connected ? '✅ Connected' : '❌ Disconnected'}
• Server: ${data.mqtt_server}
• Topic: ${data.local_topic}

💾 System Resources:
• RAM: ${Math.round(data.free_heap / 1024)}KB free / ${Math.round(data.total_heap / 1024)}KB total (${memoryUsedPercent}% used)
• Flash: ${Math.round(flashFree / 1024)}KB free / ${Math.round(data.flash_total / 1024)}KB total (${flashUsedPercent}% used)
• Uptime: ${uptimeHours}h ${uptimeMinutes}m
• Chip: ${data.chip_model}
• CPU: ${data.cpu_freq}MHz`;
      
      alert(status);
    })
    .catch(error => {
      console.error('Error fetching status:', error);
      alert('Failed to fetch system diagnostics');
    });
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
  
  // Add keyboard shortcut listener to the textarea
  const textarea = document.getElementById('message-textarea');
  if (textarea) {
    textarea.addEventListener('keydown', handleKeyPress);
  }
});
