/**
 * @file darkmode.js
 * @brief Dark mode functionality with three-state system preference (system/light/dark)
 */

// Theme constants
const THEME = {
  SYSTEM: 'system',
  LIGHT: 'light',
  DARK: 'dark'
};

/**
 * Get current system preference
 */
function getSystemPreference() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Initialize dark mode based on saved setting or system preference
 */
function initializeDarkMode() {
  // Check for saved theme preference
  const savedTheme = localStorage.getItem('theme') || THEME.SYSTEM;
  
  // Apply the theme
  applyTheme(savedTheme);
  updateThemeUI(savedTheme);
}

/**
 * Apply theme to the document
 */
function applyTheme(theme) {
  const html = document.documentElement;
  
  let shouldBeDark;
  if (theme === THEME.SYSTEM) {
    shouldBeDark = getSystemPreference() === 'dark';
  } else {
    shouldBeDark = theme === THEME.DARK;
  }
  
  if (shouldBeDark) {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
}

/**
 * Update the UI controls to reflect current theme
 */
function updateThemeUI(theme) {
  // Update three-state selector if it exists
  const themeSelector = document.getElementById('theme-selector');
  if (themeSelector) {
    themeSelector.value = theme;
  }
  
  // Update legacy binary toggle if it exists (for backwards compatibility)
  const darkModeToggle = document.getElementById('dark-mode-toggle') || document.getElementById('darkModeToggle');
  if (darkModeToggle) {
    if (theme === THEME.SYSTEM) {
      darkModeToggle.checked = getSystemPreference() === 'dark';
    } else {
      darkModeToggle.checked = theme === THEME.DARK;
    }
  }
}

/**
 * Set theme and save preference
 */
function setTheme(newTheme) {
  localStorage.setItem('theme', newTheme);
  applyTheme(newTheme);
  updateThemeUI(newTheme);
}

/**
 * Handle theme selector change
 */
function handleThemeChange(event) {
  const selectedTheme = event.target.value;
  setTheme(selectedTheme);
}

/**
 * Toggle dark mode (legacy function for binary toggle compatibility)
 */
function toggleDarkMode() {
  const currentTheme = localStorage.getItem('theme') || THEME.SYSTEM;
  let newTheme;
  
  if (currentTheme === THEME.SYSTEM) {
    // If system, toggle to opposite of current system preference
    newTheme = getSystemPreference() === 'dark' ? THEME.LIGHT : THEME.DARK;
  } else if (currentTheme === THEME.LIGHT) {
    newTheme = THEME.DARK;
  } else {
    newTheme = THEME.LIGHT;
  }
  
  setTheme(newTheme);
}

/**
 * Listen for system theme changes
 */
function watchSystemTheme() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  mediaQuery.addEventListener('change', () => {
    const currentTheme = localStorage.getItem('theme') || THEME.SYSTEM;
    // Only update if user is using system preference
    if (currentTheme === THEME.SYSTEM) {
      applyTheme(THEME.SYSTEM);
    }
  });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initializeDarkMode();
  watchSystemTheme();
  
  // Add event listener to three-state selector
  const themeSelector = document.getElementById('theme-selector');
  if (themeSelector) {
    themeSelector.addEventListener('change', handleThemeChange);
  }
  
  // Add event listener to legacy binary toggle (backwards compatibility)
  const darkModeToggle = document.getElementById('dark-mode-toggle') || document.getElementById('darkModeToggle');
  if (darkModeToggle) {
    darkModeToggle.addEventListener('change', toggleDarkMode);
  }
});
