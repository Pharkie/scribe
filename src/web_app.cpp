#include "web_app.h"

String getWebAppHTML(int maxReceiptChars)
{
    String html = R"rawliteral(
<!DOCTYPE html>
<html lang="en" class="bg-gray-50 text-gray-900">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Life Receipt</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
  <script defer>
    const MAX_CHARS = )rawliteral" +
                  String(maxReceiptChars) + R"rawliteral(; // Character limit from config
    
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
    
    function setupEventListeners() {
      // Add keypress listener to document to catch Enter key globally
      document.removeEventListener('keypress', handleKeyPress);
      document.addEventListener('keypress', handleKeyPress);
    }
  </script>
</head>
<body class="flex flex-col min-h-screen justify-between items-center py-12 px-4 font-sans">
  <main class="w-full max-w-md text-center">
    <h1 class="text-3xl font-semibold mb-10 text-gray-900 tracking-tight">Life Receipt</h1>
    <form id="receipt-form" onsubmit="handleSubmit(event)" action="/submit" method="post" class="bg-white shadow-2xl rounded-3xl p-8 space-y-6 border border-gray-100">
      <textarea
        name="message"
        maxlength=")rawliteral" +
                  String(maxReceiptChars) + R"rawliteral("
        oninput="handleInput(this)"
        placeholder="Type your receipt…"
        class="w-full p-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent resize-none text-gray-800 placeholder-gray-400"
        rows="4"
        required
        autofocus
      ></textarea>
      <div id="char-counter" class="text-sm text-gray-500 text-right"></div>
      <button type="submit" class="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
        Send
      </button>
    </form>
    <div id="receipt-printed-message" class="hidden text-green-600 font-semibold text-lg mt-4">
      ✅ Receipt printed!
    </div>
  </main>
  <footer class="text-sm text-gray-400 mt-16">
    Designed with love by <a href="https://urbancircles.club" target="_blank" class="text-gray-500 hover:text-gray-700 transition-colors duration-200 underline decoration-gray-300 hover:decoration-gray-500 underline-offset-2">Peter / Urban Circles</a>
  </footer>
  <style>
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fade-out {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(-8px); }
    }
    .animate-fade-in {
      animation: fade-in 0.6s ease-out forwards;
    }
    .animate-fade-out {
      animation: fade-out 0.6s ease-out forwards;
    }
  </style>
  <script>
    // Initialize character counter and event listeners on page load
    document.addEventListener('DOMContentLoaded', function() {
      const textarea = document.querySelector('textarea[name="message"]');
      updateCharCounter(textarea);
      setupEventListeners();
    });
  </script>
</body>
</html>
)rawliteral";

    return html;
}
