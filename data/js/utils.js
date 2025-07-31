/**
 * @file utils.js
 * @brief Utility functions and helpers
 */

/**
 * Keyboard shortcut handling
 */
function handleKeyPress(event) {
  // Ctrl/Cmd + Enter to submit form
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    const form = document.querySelector('form');
    if (form) {
      form.dispatchEvent(new Event('submit'));
    }
  }
  
  // Esc to close modals
  if (event.key === 'Escape') {
    closeDiagnostics();
    const settingsPanel = document.getElementById('settings-panel');
    if (settingsPanel && !settingsPanel.classList.contains('hidden')) {
      toggleSettings();
    }
  }
}

/**
 * Handle textarea keydown events for Enter/Shift+Enter behavior
 */
function handleTextareaKeydown(event) {
  // Enter to submit form (unless Shift is held)
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    const form = document.getElementById('printer-form');
    if (form) {
      // Create a proper submit event that won't cause double submission
      const submitEvent = new Event('submit', { 
        bubbles: false,  // Don't bubble to prevent duplicate handlers
        cancelable: true 
      });
      Object.defineProperty(submitEvent, 'target', {
        value: form,
        enumerable: true
      });
      handleSubmit(submitEvent);
    }
  }
  // Shift+Enter allows normal line break (default behavior)
}

/**
 * Copy section content to clipboard
 */
function copySection(sectionId, buttonElement) {
  const content = document.getElementById(sectionId + '-content');
  if (!content) return;
  
  // Create a plain text version for copying
  let textContent = '🪄 Unbidden Ink\n\n';
  
  const items = content.querySelectorAll('.flex.justify-between');
  items.forEach(item => {
    const label = item.querySelector('.text-gray-600');
    const value = item.querySelector('.font-medium');
    if (label && value) {
      textContent += `${label.textContent.trim()}: ${value.textContent.trim()}\n`;
    }
  });
  
  // Add file contents if present
  const fileContents = document.getElementById('file-contents');
  if (fileContents) {
    textContent += '\nSettings File Contents:\n';
    textContent += fileContents.textContent;
  }
  
  copyToClipboard(textContent, buttonElement);
}

/**
 * Copy file contents to clipboard
 */
function copyFileContents(buttonElement) {
  // Look for the new integrated file contents in Unbidden Ink section
  const fileContents = document.getElementById('unbidden-ink-file-contents') || document.getElementById('file-contents');
  if (!fileContents) return;
  
  copyToClipboard(fileContents.textContent, buttonElement);
}

/**
 * Copy generic section content to clipboard
 */
function copyGenericSection(sectionName, buttonElement) {
  // Find the parent section
  const section = buttonElement.closest('.rounded-lg');
  if (!section) return;
  
  let textContent = `${sectionName}\n\n`;
  
  // Get all data rows
  const dataRows = section.querySelectorAll('.flex.justify-between');
  dataRows.forEach(row => {
    const label = row.querySelector('.text-gray-600');
    const value = row.querySelector('.font-medium');
    if (label && value) {
      // Clean up the text content
      const labelText = label.textContent.trim().replace(':', '');
      const valueText = value.textContent.trim();
      textContent += `${labelText}: ${valueText}\n`;
    }
  });
  
  copyToClipboard(textContent, buttonElement);
}

/**
 * Universal clipboard copy function with fallback support
 */
function copyToClipboard(text, buttonElement) {
  // Modern browsers with clipboard API support
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      showCopyFeedback(buttonElement);
    }).catch(() => {
      // Fallback if clipboard API fails
      fallbackCopyToClipboard(text, buttonElement);
    });
  } else {
    // Fallback for older browsers or non-HTTPS contexts
    fallbackCopyToClipboard(text, buttonElement);
  }
}

/**
 * Fallback clipboard copy using textarea selection
 */
function fallbackCopyToClipboard(text, buttonElement) {
  // Create a temporary textarea
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  
  try {
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    if (successful) {
      showCopyFeedback(buttonElement);
    } else {
      console.error('Failed to copy text');
      showErrorMessage('Copy failed - please select and copy manually');
    }
  } catch (err) {
    console.error('Failed to copy:', err);
    showErrorMessage('Copy not supported - please select and copy manually');
  } finally {
    document.body.removeChild(textArea);
  }
}

/**
 * Show visual feedback for successful copy
 */
function showCopyFeedback(buttonElement) {
  if (!buttonElement) return;
  
  const originalContent = buttonElement.innerHTML;
  buttonElement.innerHTML = '✅';
  buttonElement.disabled = true;
  
  setTimeout(() => {
    buttonElement.innerHTML = originalContent;
    buttonElement.disabled = false;
  }, 1500);
}

/**
 * Generic character counter function
 * @param {string} textareaId - ID of the textarea element
 * @param {string} counterId - ID of the counter element  
 * @param {number} defaultMaxLength - Default max length if not set on textarea
 */
function updateCharacterCount(textareaId, counterId, defaultMaxLength = 1000) {
  const textarea = document.getElementById(textareaId);
  const counter = document.getElementById(counterId);
  
  if (textarea && counter) {
    const length = textarea.value.length;
    const maxLength = textarea.maxLength || defaultMaxLength;
    counter.textContent = `${length}/${maxLength} characters`;
    
    // Update styling based on character count
    if (length > maxLength) {
      counter.className = 'text-red-600 dark:text-red-400';
    } else if (length >= maxLength * 0.9) {
      counter.className = 'text-yellow-600 dark:text-yellow-400';
    } else {
      counter.className = 'text-gray-600 dark:text-gray-400';
    }
  }
}

/**
 * Update character counter for main message textarea
 */
function updateCharCounter() {
  updateCharacterCount('message-textarea', 'char-counter', 1000);
}

/**
 * Update character counter for Unbidden Ink prompt textarea
 */
function updatePromptCharCount() {
  updateCharacterCount('prompt-textarea', 'prompt-char-count', 500);
}
