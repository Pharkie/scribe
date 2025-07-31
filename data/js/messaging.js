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
    case 'dad-joke':
      return { colors: ['#10b981', '#059669', '#34d399'], name: 'Dad Joke' }; // Emerald
    case 'character-test':
      return { colors: ['#6366f1', '#4f46e5', '#818cf8'], name: 'Character Test' }; // Indigo
    case 'motivation':
      return { colors: ['#ef4444', '#dc2626', '#f87171'], name: 'Motivation' }; // Red
    case 'custom':
      return { colors: ['#8b5cf6', '#7c3aed', '#a78bfa'], name: 'Custom Message' }; // Purple
    case 'print-test':
      return { colors: ['#06b6d4', '#0891b2', '#67e8f9'], name: 'Print Test' }; // Cyan
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
  // Determine the appropriate endpoint and payload
  let endpoint = '/send';
  let payload = {
    printer: printerTarget,
    message: message
  };

  // If action is specified, include it
  if (action) {
    payload.action = action;
  }

  // Show loading state with action-specific styling
  const config = getActionConfig(action || 'custom');
  const overlay = showSuccessMessage(`Sending ${config.name}...`);
  
  // Apply action-specific gradient
  const gradient = `linear-gradient(135deg, ${config.colors[0]} 0%, ${config.colors[1]} 50%, ${config.colors[2]} 100%)`;
  overlay.style.background = gradient;

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
    const printerName = getPrinterName(printerTarget);
    overlay.querySelector('.font-bold').textContent = `${config.name} sent successfully to ${printerName}!`;
    
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
 * Handle quick actions (riddle, dad joke, character test)
 */
function sendQuickAction(action) {
  const printerTarget = document.getElementById('printer-target').value;
  
  // Map action to endpoint - fail explicitly for unknown actions
  let endpoint;
  switch (action) {
    case 'riddle':
      endpoint = '/riddle';
      break;
    case 'dad-joke':
      endpoint = '/dad-joke';
      break;
    case 'character-test':
      endpoint = '/character-test';
      break;
    case 'print-test':
      endpoint = '/print-test';
      break;
    case 'motivation':
      endpoint = '/motivation';
      break;
    default:
      console.error('Unknown action:', action);
      alert('Unknown action: ' + action);
      return;
  }

  // Show loading state with action-specific styling
  const config = getActionConfig(action);
  const overlay = showSuccessMessage(`Sending ${config.name}...`);
  
  // Apply action-specific gradient
  const gradient = `linear-gradient(135deg, ${config.colors[0]} 0%, ${config.colors[1]} 50%, ${config.colors[2]} 100%)`;
  overlay.style.background = gradient;

  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ printer: printerTarget })
  })
  .then(response => {
    if (response.ok) {
      return response.json();
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  })
  .then(result => {
    const printerName = getPrinterName(printerTarget);
    overlay.querySelector('.font-bold').textContent = `${config.name} sent successfully to ${printerName}!`;
  })
  .catch(error => {
    console.error(`Failed to send ${config.name.toLowerCase()}:`, error);
    
    // Hide the overlay and show error
    overlay.remove();
    alert(`Failed to send ${config.name.toLowerCase()}. Please try again.\n\nError: ${error.message}`);
  });
}

/**
 * Show success message with animated overlay
 */
function showSuccessMessage(message) {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-green-500 flex items-center justify-center z-50 transition-opacity duration-300';
  overlay.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 50%, #34d399 100%)';
  
  // Create message container
  const messageContainer = document.createElement('div');
  messageContainer.className = 'text-white text-center px-8 py-6 rounded-lg shadow-2xl transform transition-transform duration-300 scale-95';
  messageContainer.innerHTML = `
    <div class="text-2xl font-bold mb-2">${message}</div>
    <div class="text-lg opacity-90">Check your printer!</div>
  `;
  
  overlay.appendChild(messageContainer);
  document.body.appendChild(overlay);
  
  // Animate in
  setTimeout(() => {
    overlay.style.opacity = '1';
    messageContainer.style.transform = 'scale(1)';
  }, 10);
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 300);
  }, 3000);
  
  return overlay;
}
