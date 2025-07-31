/**
 * @file messaging.js
 * @brief Message sending functionality and quick actions
 */

/**
 * Handle input events for form elements
 */
function handleInput(el) {
  updateCharCounter();
}

/**
 * Unified form submission handler
 */
function handleSubmit(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const printerTarget = formData.get('printer-target');
  const message = formData.get('message');
  
  if (!message.trim()) {
    alert('Please enter a message');
    return;
  }
  
  sendMessage(printerTarget, message);
}

/**
 * Helper function to get action colors and name
 */
function getActionConfig(action) {
  switch (action) {
    case 'riddle':
      return { colors: ['#f59e0b', '#d97706', '#fbbf24'], name: 'Riddle' }; // Amber
    case 'joke':
      return { colors: ['#10b981', '#059669', '#34d399'], name: 'Joke' }; // Emerald
    case 'quote':
      return { colors: ['#8b5cf6', '#7c3aed', '#a78bfa'], name: 'Quote' }; // Purple
    case 'quiz':
      return { colors: ['#f59e0b', '#d97706', '#fbbf24'], name: 'Quiz' }; // Amber
    case 'print-test':
      return { colors: ['#6b7280', '#4b5563', '#9ca3af'], name: 'Print Test' }; // Gray
    case 'scribe-message':
      return { colors: ['#8b5cf6', '#7c3aed', '#a78bfa'], name: 'Scribed' }; // Purple
    case 'unbidden-ink':
      return { colors: ['#8b5cf6', '#7c3aed', '#a78bfa'], name: 'Unbidden Ink' }; // Purple
    default:
      return { colors: ['#6b7280', '#4b5563', '#9ca3af'], name: 'Unknown' }; // Gray
  }
}

/**
 * Send message using unified endpoint
 */
function sendMessage(printerTarget, message, action = null) {
  // Determine the appropriate endpoint and payload based on printer target
  let endpoint, payload;
  
  if (printerTarget === 'local-direct') {
    // Local direct printing - use scribe-message endpoint
    endpoint = '/scribe-message';
    payload = {
      printer: printerTarget,
      message: message
    };
  } else {
    // MQTT printing (local via MQTT or remote) - use mqtt-send endpoint
    endpoint = '/mqtt-send';
    payload = {
      topic: printerTarget,
      message: message
    };
  }

  // If action is specified, include it
  if (action) {
    payload.action = action;
  }

  // Get action config for display
  const config = getActionConfig(action || 'scribe-message');
  
  // Show confetti immediately
  triggerConfetti();

  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(response => {
    if (response.ok) {
      return response.json();
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  })
  .then(result => {
    // Show success message in a toast instead of full screen
    showSuccessToast(`${config.name} scribed`);
    
    // Clear the message input for non-action messages
    if (!action) {
      document.getElementById('message-textarea').value = '';
      updateCharCounter();
    }
  })
  .catch(error => {
    console.error('Error occurred:', error);
    alert(`Failed to send message. Please try again.\n\nError: ${error.message}`);
  });
}

/**
 * Helper function to get printer name from topic
 */
function getPrinterName(topic) {
  const printer = PRINTERS.find(p => p.topic === topic);
  return printer ? printer.name : 'remote printer';
}

/**
 * Handle quick actions (riddle, joke, quote, quiz, test print, etc.)
 */
function sendQuickAction(action) {
  const printerTarget = document.getElementById('printer-target').value;
  
  // Map action to endpoint
  let endpoint;
  switch (action) {
    case 'riddle':
      endpoint = '/riddle';
      break;
    case 'joke':
      endpoint = '/joke';
      break;
    case 'quote':
      endpoint = '/quote';
      break;
    case 'quiz':
      endpoint = '/quiz';
      break;
    case 'print-test':
      endpoint = '/print-test';
      break;
    default:
      console.error('Unknown action:', action);
      alert('Unknown action: ' + action);
      return;
  }

  // Get action config for display
  const config = getActionConfig(action);
  
  // Show confetti immediately
  triggerConfetti();

  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ printer: printerTarget })
  })
  .then(response => {
    if (response.ok) {
      return response.text(); // These endpoints return plain text, not JSON
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  })
  .then(result => {
    // Show success message in a toast/notification instead of full screen
    showSuccessToast(`${config.name} scribed`);
  })
  .catch(error => {
    console.error(`Failed to send ${config.name.toLowerCase()}:`, error);
    alert(`Failed to send ${config.name.toLowerCase()}. Please try again.\n\nError: ${error.message}`);
  });
}

/**
 * Trigger confetti animation
 */
function triggerConfetti() {
  if (typeof confetti !== 'undefined') {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }
}

/**
 * Show a success toast notification
 */
function showSuccessToast(message) {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.classList.remove('translate-x-full');
  }, 10);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.classList.add('translate-x-full');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}
