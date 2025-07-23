// Global variables - will be set by the server
let MAX_CHARS = 200; // Default value, will be updated by config endpoint

// Fetch configuration from server
async function loadConfig() {
  try {
    const response = await fetch('/config');
    const config = await response.json();
    MAX_CHARS = config.maxReceiptChars;
    
    // Set the maxlength attribute on the textarea
    const textarea = document.getElementById('message-textarea');
    textarea.setAttribute('maxlength', MAX_CHARS);
    
    // Update the character counter
    updateCharCounter(textarea);
  } catch (error) {
    console.error('Failed to load config:', error);
  }
}

function updateCharCounter(textarea) {
  const counter = document.getElementById('char-counter');
  const remaining = MAX_CHARS - textarea.value.length;
  counter.textContent = `${remaining} characters left`;
  counter.classList.toggle('text-red-500', remaining <= 20);
}

function handleInput(el) {
  updateCharCounter(el);
}

function showReceiptPrintedMessage() {
  const messageEl = document.getElementById('receipt-printed-message');
  messageEl.classList.remove('hidden');
  messageEl.classList.add('animate-fade-in');
  
  // Fade out after 3 seconds
  setTimeout(() => {
    messageEl.classList.add('animate-fade-out');
    setTimeout(() => {
      messageEl.classList.add('hidden');
      messageEl.classList.remove('animate-fade-in', 'animate-fade-out');
    }, 600); // Wait for fade-out animation to complete
  }, 3000);
}

function handleSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const textarea = document.querySelector('textarea[name="message"]');
  
  fetch('/submit', {
    method: 'POST',
    body: formData
  }).then(() => {
    // Clear the textarea and update counter
    textarea.value = '';
    updateCharCounter(textarea);
    
    // Show confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
    
    // Show temporary "Receipt printed" message
    showReceiptPrintedMessage();
    
    // Focus back on textarea for next message
    textarea.focus();
  });
}

function handleKeyPress(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const form = document.getElementById('receipt-form');
    
    // Always submit the form (no second screen logic needed)
    form.dispatchEvent(new Event('submit', { bubbles: true }));
  }
}

function printRandomRiddle() {
  console.log('printRandomRiddle() called');
  
  fetch('/riddle', {
    method: 'POST',
  })
  .then(response => {
    console.log('Response received:', response.status, response.statusText);
    return response.text().then(data => {
      if (!response.ok) {
        throw new Error(`Server error (${response.status}): ${data}`);
      }
      return data;
    });
  })
  .then(data => {
    console.log('Response data:', data);
    
    // Confetti effect
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
    
    // Show temporary "Receipt printed" message
    showReceiptPrintedMessage();
  })
  .catch(error => {
    console.error('Error occurred:', error);
    alert('Failed to print riddle. Please try again. Error: ' + error.message);
  });
}

function printCharacterTest() {
  fetch('/test', {
    method: 'GET'
  })
  .then(response => response.text())
  .then(data => {
    console.log('Character test response:', data);
    
    // Confetti effect
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#3b82f6', '#1e40af', '#60a5fa']
    });
    
    // Show temporary success message
    showReceiptPrintedMessage();
  })
  .catch(error => {
    console.error('Error occurred:', error);
    alert('Failed to print character test. Please try again. Error: ' + error.message);
  });
}

function showSystemStatus() {
  fetch('/status', {
    method: 'GET'
  })
  .then(response => response.json())
  .then(data => {
    console.log('System status:', data);
    
    // Format uptime
    const uptimeMs = data.uptime;
    const uptimeMinutes = Math.floor(uptimeMs / 60000);
    const uptimeHours = Math.floor(uptimeMinutes / 60);
    const uptimeDays = Math.floor(uptimeHours / 24);
    
    let uptimeStr = '';
    if (uptimeDays > 0) uptimeStr += `${uptimeDays}d `;
    if (uptimeHours % 24 > 0) uptimeStr += `${uptimeHours % 24}h `;
    if (uptimeMinutes % 60 > 0) uptimeStr += `${uptimeMinutes % 60}m`;
    if (!uptimeStr) uptimeStr = '<1m';
    
    // Format free heap
    const freeHeapKB = Math.round(data.free_heap / 1024);
    
    const statusMessage = `🌐 WiFi: ${data.wifi_connected ? 'Connected' : 'Disconnected'}\n` +
                         `📡 IP: ${data.ip_address}\n` +
                         `🏷️ Hostname: ${data.mdns_hostname}\n` +
                         `⏱️ Uptime: ${uptimeStr}\n` +
                         `💾 Free RAM: ${freeHeapKB}KB`;
    
    alert(statusMessage);
  })
  .catch(error => {
    console.error('Error occurred:', error);
    alert('Failed to get system status. Please try again. Error: ' + error.message);
  });
}

function setupEventListeners() {
  // Add keypress listener to document to catch Enter key globally
  document.removeEventListener('keypress', handleKeyPress);
  document.addEventListener('keypress', handleKeyPress);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  loadConfig().then(() => {
    const textarea = document.querySelector('textarea[name="message"]');
    updateCharCounter(textarea);
    setupEventListeners();
  });
});
