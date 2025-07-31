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
function copySection(sectionId) {
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
  
  navigator.clipboard.writeText(textContent).then(() => {
    // Brief visual feedback
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = '✅';
    setTimeout(() => {
      button.textContent = originalText;
    }, 1000);
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

/**
 * Copy file contents to clipboard
 */
function copyFileContents() {
  const fileContents = document.getElementById('file-contents');
  if (!fileContents) return;
  
  navigator.clipboard.writeText(fileContents.textContent).then(() => {
    // Brief visual feedback
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = '✅';
    setTimeout(() => {
      button.textContent = originalText;
    }, 1000);
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
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
  
  navigator.clipboard.writeText(textContent).then(() => {
    // Brief visual feedback
    const originalText = buttonElement.textContent;
    buttonElement.textContent = '✅';
    setTimeout(() => {
      buttonElement.textContent = originalText;
    }, 1000);
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}
