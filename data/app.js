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
    
    // Add local direct option (always first)
    const localDirectOption = document.createElement('option');
    localDirectOption.value = 'local-direct';
    localDirectOption.textContent = '🖨️ Local (direct)';
    printerSelect.appendChild(localDirectOption);
    
    // Store printer data for later use
    PRINTERS = config.remotePrinters;
    
    // Add local via MQTT and other printers
    config.remotePrinters.forEach((printer, index) => {
      const option = document.createElement('option');
      option.value = printer.topic;
      // First printer is local via MQTT, others are remote
      option.textContent = index === 0 
        ? `🖨️ ${printer.name} (local via MQTT)` 
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

// Print message to local printer
function printLocalMessage(message) {
  const formData = new FormData();
  formData.append('message', message);
  
  fetch('/print-local', {
    method: 'POST',
    body: formData
  })
  .then(response => response.text())
  .then(data => {
    console.log('Local print response:', data);
    
    // Confetti effect
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#3b82f6', '#1e40af', '#60a5fa']
    });
    
    // Show success message
    showSuccessMessage('Message printed locally!');
    
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
function sendMQTTMessage(topic, message) {
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
    console.log('MQTT send response:', data);
    
    // Confetti effect
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f97316', '#ea580c', '#fb923c']
    });
    
    // Show success message
    const printerName = getPrinterName(topic);
    showSuccessMessage(`Message sent to ${printerName}!`);
    
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
  if (action === 'riddle') {
    endpoint = '/riddle';
  } else if (action === 'dadjoke') {
    endpoint = '/dadjoke';
  } else if (action === 'chartest') {
    endpoint = '/character-test';
  } else {
    console.error('Unknown action:', action);
    alert('Unknown action: ' + action);
    return;
  }
  
  if (printerTarget === 'local-direct') {
    // Print directly to local printer
    fetch(endpoint, {
      method: action === 'chartest' ? 'GET' : 'POST'
    })
    .then(response => response.text())
    .then(data => {
      console.log(`Local ${action} response:`, data);
      
      // Confetti effect
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: action === 'riddle' ? ['#a855f7', '#7c3aed', '#c084fc'] : 
               action === 'dadjoke' ? ['#f97316', '#ea580c', '#fb923c'] :
               ['#22c55e', '#16a34a', '#4ade80'] // Green colors for character test
      });
      
      const actionName = action === 'riddle' ? 'Riddle' : 
                        action === 'dadjoke' ? 'Dad joke' : 'Character test';
      showSuccessMessage(`${actionName} printed locally!`);
    })
    .catch(error => {
      console.error('Error occurred:', error);
      alert(`Failed to print ${action}. Please try again. Error: ` + error.message);
    });
  } else {
    // Get content and send via MQTT
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'mode=remote'
    })
    .then(response => response.json())
    .then(contentData => {
      console.log(`${action} content received:`, contentData);
      
      // Send via MQTT
      return sendMQTTMessage(printerTarget, contentData.content);
    })
    .catch(error => {
      console.error('Error occurred:', error);
      const actionName = action === 'riddle' ? 'riddle' : 
                        action === 'dadjoke' ? 'dad joke' : 'character test';
      alert(`Failed to send ${actionName}. Please try again. Error: ` + error.message);
    });
  }
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
      
      const status = `System Status:

WiFi Connected: ${data.wifi_connected ? 'Yes' : 'No'}
IP Address: ${data.ip_address}
Hostname: ${data.mdns_hostname}.local
Uptime: ${uptimeHours}h ${uptimeMinutes}m
Free Memory: ${Math.round(data.free_heap / 1024)}KB`;
      
      alert(status);
    })
    .catch(error => {
      console.error('Error fetching status:', error);
      alert('Failed to fetch system status');
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

// Add CSS animations for fade effects
const style = document.createElement('style');
style.textContent = `
  .animate-fade-in {
    animation: fadeIn 0.6s ease-in-out;
  }
  
  .animate-fade-out {
    animation: fadeOut 0.6s ease-in-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(-10px); }
  }
`;
document.head.appendChild(style);
