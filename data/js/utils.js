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
  const fileContents = document.getElementById('file-contents');
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
