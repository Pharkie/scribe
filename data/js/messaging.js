/**
 * @file messaging.js
 * @brief Message sending functionality and quick actions
 */

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
  
  // Check character limit
  if (message.length > MAX_CHARS) {
    alert(`Message is too long. Maximum ${MAX_CHARS} characters allowed, but your message is ${message.length} characters.`);
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
      return { colors: ['#8b5cf6', '#7c3aed', '#a78bfa'], name: 'Message' }; // Purple
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
    // Local printing - use print-local endpoint
    endpoint = '/print-local';
    payload = {
      message: message
    };
  } else {
    // MQTT printing (remote) - use mqtt-send endpoint
    endpoint = '/mqtt-send';
    payload = {
      topic: printerTarget,
      message: message
    };
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
    // For error responses, try to parse JSON to get better error messages
    return response.json().then(errorData => {
      const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }).catch(parseError => {
      // If JSON parsing fails, fall back to status text
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    });
  })
  .then(result => {
    // Show success message in a toast instead of full screen
    showSuccessToast(`${config.name} scribed`);
    
    // Clear the message input for non-action messages
    if (!action) {
      document.getElementById('message-textarea').value = '';
      updateCharacterCount('message-textarea', 'char-counter', MAX_CHARS);
    }
  })
  .catch(error => {
    console.error('Error occurred:', error);
    alert(`Failed to send message. Please try again.\n\nError: ${error.message}`);
  });
}

/**
 * Handle quick actions (riddle, joke, quote, quiz, test print, etc.)
 */
function sendQuickAction(action) {
  const printerTarget = document.getElementById('printer-target').value;
  
  // Map action to content endpoint
  let contentEndpoint;
  switch (action) {
    case 'riddle':
      contentEndpoint = '/riddle';
      break;
    case 'joke':
      contentEndpoint = '/joke';
      break;
    case 'quote':
      contentEndpoint = '/quote';
      break;
    case 'quiz':
      contentEndpoint = '/quiz';
      break;
    case 'print-test':
      contentEndpoint = '/print-test';
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

  // Step 1: Fetch content from content generation endpoint
  fetch(contentEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}) // Content endpoints no longer need printer parameter
  })
  .then(response => {
    if (response.ok) {
      return response.json();
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  })
  .then(contentResult => {
    if (!contentResult.content) {
      throw new Error('No content received from server');
    }
    
    // Step 2: Determine delivery endpoint based on printer target
    let deliveryEndpoint;
    let deliveryPayload;
    
    if (printerTarget === 'local-direct') {
      deliveryEndpoint = '/print-local';
      deliveryPayload = { message: contentResult.content };
    } else {
      deliveryEndpoint = '/mqtt-send';
      deliveryPayload = { 
        topic: printerTarget,
        message: contentResult.content
      };
    }
    
    // Step 3: Send content to delivery endpoint
    return fetch(deliveryEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deliveryPayload)
    });
  })
  .then(response => {
    if (response.ok) {
      return response.json();
    }
    // For error responses, try to parse JSON to get better error messages
    return response.json().then(errorData => {
      const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }).catch(parseError => {
      // If JSON parsing fails, fall back to status text
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    });
  })
  .then(result => {
    if (result.success || result.status === 'success') {
      // Show success message in a toast/notification instead of full screen
      showSuccessToast(`${config.name} scribed`);
    } else {
      throw new Error(result.error || result.message || 'Unknown error occurred');
    }
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
    // Detect if dark mode is active
    const isDarkMode = document.documentElement.classList.contains('dark') || 
                      window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Choose colors that work well in both light and dark modes
    const colors = isDarkMode 
      ? ['#fbbf24', '#34d399', '#a78bfa', '#f472b6', '#fb7185'] // Bright yellows, greens, purples, pinks for dark mode
      : ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']; // Blues, reds, greens, oranges, purples for light mode
    
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: colors
    });
  }
}

/**
 * Show a success toast notification
 */
function showSuccessToast(message) {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'fixed top-4 right-4 bg-green-500 dark:bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg dark:shadow-2xl z-50 transform translate-x-full transition-transform duration-300';
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
