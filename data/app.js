// Global variables - will be set by the server
let MAX_CHARS = 200; // Default value, will be updated by config endpoint

// Fetch configuration from server
async function loadConfig() {
  try {
    const response = await fetch('/config');
    const config = await response.json();
    MAX_CHARS = config.maxReceiptChars;
    
    // Set the maxlength attribute on both textareas
    const localTextarea = document.getElementById('local-textarea');
    const remoteTextarea = document.getElementById('remote-textarea');
    localTextarea.setAttribute('maxlength', MAX_CHARS);
    remoteTextarea.setAttribute('maxlength', MAX_CHARS);
    
    // Populate remote printer dropdown
    const topicSelect = document.getElementById('remote-topic');
    topicSelect.innerHTML = ''; // Clear existing options
    
    config.remotePrinters.forEach((printer, index) => {
      const option = document.createElement('option');
      option.value = printer.topic;
      // Add "(local)" to the first printer name
      option.textContent = index === 0 ? `${printer.name} (local)` : printer.name;
      topicSelect.appendChild(option);
    });
    
    // Update both character counters
    updateCharCounter(localTextarea, 'local-char-counter');
    updateCharCounter(remoteTextarea, 'remote-char-counter');
  } catch (error) {
    console.error('Failed to load config:', error);
  }
}

function updateCharCounter(textarea, counterId) {
  const counter = document.getElementById(counterId);
  const remaining = MAX_CHARS - textarea.value.length;
  counter.textContent = `${remaining} characters left`;
  counter.classList.toggle('text-red-500', remaining <= 20);
}

function handleLocalInput(el) {
  updateCharCounter(el, 'local-char-counter');
}

function handleRemoteInput(el) {
  updateCharCounter(el, 'remote-char-counter');
}

function showLocalPrintedMessage() {
  const messageEl = document.getElementById('local-printed-message');
  messageEl.classList.remove('hidden');
  messageEl.classList.add('animate-fade-in');
  
  // Fade out after 3 seconds
  setTimeout(() => {
    messageEl.classList.add('animate-fade-out');
    setTimeout(() => {
      messageEl.classList.add('hidden');
      messageEl.classList.remove('animate-fade-in', 'animate-fade-out');
    }, 600);
  }, 3000);
}

function showRemoteSentMessage() {
  const messageEl = document.getElementById('remote-sent-message');
  messageEl.classList.remove('hidden');
  messageEl.classList.add('animate-fade-in');
  
  // Fade out after 3 seconds
  setTimeout(() => {
    messageEl.classList.add('animate-fade-out');
    setTimeout(() => {
      messageEl.classList.add('hidden');
      messageEl.classList.remove('animate-fade-in', 'animate-fade-out');
    }, 600);
  }, 3000);
}

function handleLocalSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const textarea = document.querySelector('#local-textarea');
  
  fetch('/submit', {
    method: 'POST',
    body: formData
  }).then(() => {
    // Clear the textarea and update counter
    textarea.value = '';
    updateCharCounter(textarea, 'local-char-counter');
    
    // Show confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#2563eb', '#1d4ed8', '#3b82f6']
    });
    
    // Show temporary "Receipt printed" message
    showLocalPrintedMessage();
    
    // Focus back on textarea for next message
    textarea.focus();
  }).catch(error => {
    console.error('Error occurred:', error);
  });
}

function handleRemoteSubmit(e) {
  e.preventDefault();
  const textarea = document.querySelector('#remote-textarea');
  const topicSelect = document.querySelector('#remote-topic');
  const message = textarea.value;
  const topic = topicSelect.value;
  
  fetch('/mqtt-send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic: topic,
      message: message
    })
  }).then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.text();
  }).then(() => {
    // Clear the textarea and update counter
    textarea.value = '';
    updateCharCounter(textarea, 'remote-char-counter');
    
    // Show confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ea580c', '#dc2626', '#f97316']
    });
    
    // Show temporary "Message sent" message
    showRemoteSentMessage();
    
    // Focus back on textarea for next message
    textarea.focus();
  }).catch(error => {
    console.error('Error sending remote message:', error);
    alert('Failed to send remote message. Please try again. Error: ' + error.message);
  });
}

function handleKeyPress(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    
    // Determine which form to submit based on the focused element
    const activeElement = document.activeElement;
    if (activeElement.id === 'local-textarea') {
      const localForm = document.getElementById('local-form');
      localForm.dispatchEvent(new Event('submit', { bubbles: true }));
    } else if (activeElement.id === 'remote-textarea') {
      const remoteForm = document.getElementById('remote-form');
      remoteForm.dispatchEvent(new Event('submit', { bubbles: true }));
    }
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
    showLocalPrintedMessage();
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
    showLocalPrintedMessage();
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
    const localTextarea = document.getElementById('local-textarea');
    const remoteTextarea = document.getElementById('remote-textarea');
    updateCharCounter(localTextarea, 'local-char-counter');
    updateCharCounter(remoteTextarea, 'remote-char-counter');
    setupEventListeners();
    
    // Focus on local textarea by default
    localTextarea.focus();
  });
});
