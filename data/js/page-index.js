(() => {
  // multi-entry:multi-entry:src/js/index-alpine-store.js,src/js/index-api.js
  function initializeIndexStore() {
    const store = {
      // Core state
      config: {},
      loading: true,
      error: null,
      initialized: false,
      // Flag to prevent duplicate initialization
      // Form state
      message: "",
      selectedPrinter: "local-direct",
      submitting: false,
      buttonTextOverride: null,
      // Printer state
      printers: [],
      localPrinterName: "Unknown",
      // UI state
      overlayVisible: false,
      overlayPrinterData: null,
      overlayPrinterName: "",
      overlayPrinterType: "mqtt",
      // Settings stashed indicator
      settingsStashed: false,
      // Toast state
      toasts: [],
      // Active quick action (only one can be active at a time)
      activeQuickAction: null,
      // Memo state
      memoModalVisible: false,
      memos: [],
      memosLoading: false,
      memosLoaded: false,
      printing: false,
      // Character limits - updated path for new structure
      get maxChars() {
        var _a, _b;
        if (!((_b = (_a = this.config) == null ? void 0 : _a.device) == null ? void 0 : _b.maxCharacters)) {
          throw new Error("Maximum characters configuration is missing from server");
        }
        return this.config.device.maxCharacters;
      },
      get charCount() {
        return this.message.length;
      },
      get charCountText() {
        const count = this.charCount;
        const max = this.maxChars;
        if (count > max) {
          const over = count - max;
          return `${count}/${max} characters (${over} over limit)`;
        }
        return `${count}/${max} characters`;
      },
      get charCountClass() {
        const count = this.charCount;
        const max = this.maxChars;
        const percentage = count / max;
        if (count > max) {
          return "text-red-600 dark:text-red-400 font-semibold";
        } else if (percentage >= 0.9) {
          return "text-yellow-700 dark:text-yellow-300 font-medium";
        } else {
          return "text-gray-500 dark:text-gray-400";
        }
      },
      get canSubmit() {
        return this.message.trim().length > 0 && this.charCount <= this.maxChars && !this.isLoading;
      },
      get isConfigReady() {
        return !this.loading && !this.error && this.config && this.config.device && this.config.device.maxCharacters;
      },
      // Initialize store
      async init() {
        var _a;
        if (this.initialized) {
          console.log("\u{1F4CB} Index: Already initialized, skipping");
          return;
        }
        this.initialized = true;
        console.log("\u{1F4CB} Index: Starting initialization...");
        this.checkForSettingsSuccess();
        try {
          await this.loadConfig();
          if ((_a = this.config.mqtt) == null ? void 0 : _a.enabled) {
            console.log("\u{1F4CB} Index: MQTT enabled, initializing printer discovery");
            this.initializePrinterDiscovery();
          } else {
            console.log("\u{1F4CB} Index: MQTT disabled, skipping printer discovery");
          }
        } catch (error) {
          console.error("\u{1F4CB} Index: Config loading failed:", error);
          this.error = error.message;
          this.loading = false;
        }
        this.setupEventListeners();
        console.log("\u{1F4CB} Index: Initialization complete");
      },
      // Load configuration
      async loadConfig() {
        var _a, _b, _c, _d, _e;
        try {
          console.log("\u{1F4CB} Index: Loading configuration from API...");
          this.config = await window.IndexAPI.loadConfiguration();
          console.log("\u{1F4CB} Index: Raw config received:", this.config);
          console.log("\u{1F4CB} Index: Config keys:", Object.keys(this.config));
          if (((_b = (_a = this.config) == null ? void 0 : _a.device) == null ? void 0 : _b.printer_name) === void 0) {
            throw new Error("Printer name configuration is missing from server");
          }
          if (((_d = (_c = this.config) == null ? void 0 : _c.device) == null ? void 0 : _d.maxCharacters) === void 0) {
            throw new Error("Maximum characters validation configuration is missing from server");
          }
          if (((_e = this.config) == null ? void 0 : _e.device) === void 0) {
            throw new Error("Device configuration is missing from server");
          }
          this.localPrinterName = this.config.device.printer_name;
          console.log("\u{1F4CB} Index: Config loaded successfully, printer name:", this.localPrinterName);
          await this.loadMemosFromAPI();
          this.error = null;
          this.loading = false;
          return this.config;
        } catch (error) {
          console.error("\u{1F4CB} Index: Failed to load config:", error);
          this.error = error.message;
          this.loading = false;
          throw error;
        }
      },
      // Initialize printer discovery
      initializePrinterDiscovery() {
        this.setupSSEConnection();
        this.updatePrinterList();
      },
      // Update printer list from discovered printers
      updatePrinterList(discoveredPrinters = []) {
        this.printers = [
          {
            value: "local-direct",
            icon: "home",
            name: "Local direct",
            isLocal: true,
            selected: this.selectedPrinter === "local-direct"
          }
        ];
        discoveredPrinters.forEach((printer) => {
          const topic = `scribe/${printer.name}/print`;
          this.printers.push({
            value: topic,
            icon: "megaphone",
            name: printer.name,
            isLocal: false,
            data: printer,
            selected: this.selectedPrinter === topic
          });
        });
      },
      // Setup event listeners
      setupEventListeners() {
        document.addEventListener("printersUpdated", (event) => {
          console.log("\u{1F504} Printers updated, refreshing index page printer selection");
          this.updatePrinterList(event.detail.printers || []);
        });
      },
      // Select printer
      selectPrinter(value) {
        this.selectedPrinter = value;
        this.printers.forEach((printer) => {
          printer.selected = printer.value === value;
        });
      },
      // Submit form
      async handleSubmit(event) {
        if (event) event.preventDefault();
        if (!this.canSubmit) return;
        this.submitting = true;
        try {
          const message = this.message.trim();
          const contentResult = await window.IndexAPI.generateUserMessage(message, this.selectedPrinter);
          if (!contentResult.content) {
            throw new Error("Failed to generate message content");
          }
          if (this.selectedPrinter === "local-direct") {
            await window.IndexAPI.printLocalContent(contentResult.content);
          } else {
            await window.IndexAPI.printMQTTContent(contentResult.content, this.selectedPrinter);
          }
          this.triggerSubmitCelebration();
          this.message = "";
        } catch (error) {
          console.error("Submit error:", error);
          this.showToast(`Error: ${error.message}`, "error");
        } finally {
          this.submitting = false;
        }
      },
      // Quick actions
      async sendQuickAction(action) {
        if (this.activeQuickAction) {
          return;
        }
        try {
          this.activeQuickAction = action;
          const contentResult = await window.IndexAPI.executeQuickAction(action);
          if (!contentResult.content) {
            this.showToast("No content received from server", "error");
            return;
          }
          if (this.selectedPrinter === "local-direct") {
            await window.IndexAPI.printLocalContent(contentResult.content);
          } else {
            await window.IndexAPI.printMQTTContent(contentResult.content, this.selectedPrinter);
          }
          this.triggerQuickActionCelebration(action);
        } catch (error) {
          console.error("Error sending quick action:", error);
          this.showToast(`Network error: ${error.message}`, "error");
        } finally {
          setTimeout(() => {
            this.activeQuickAction = null;
          }, 2e3);
        }
      },
      // Handle textarea keydown
      handleTextareaKeydown(event) {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          if (this.canSubmit) {
            this.handleSubmit(event);
          }
        }
      },
      // Printer info overlay
      showLocalPrinterInfo() {
        var _a;
        if (!((_a = this.config) == null ? void 0 : _a.device)) {
          throw new Error("Device configuration is missing from server");
        }
        const deviceConfig = this.config.device;
        const localPrinterData = {
          name: deviceConfig.printer_name || deviceConfig.owner,
          ip_address: deviceConfig.ip_address,
          mdns: deviceConfig.mdns,
          status: "online",
          firmware_version: deviceConfig.firmware_version,
          timezone: deviceConfig.timezone,
          last_power_on: deviceConfig.boot_time
        };
        this.showPrinterOverlay(localPrinterData, localPrinterData.name, "local");
      },
      showPrinterOverlay(printerData, printerName, printerType = "mqtt") {
        this.overlayPrinterData = printerData;
        this.overlayPrinterName = printerName;
        this.overlayPrinterType = printerType;
        this.overlayVisible = true;
      },
      closePrinterOverlay() {
        this.overlayVisible = false;
        this.overlayPrinterData = null;
      },
      // Get formatted printer overlay data
      get overlayData() {
        if (!this.overlayPrinterData) return null;
        const printerData = this.overlayPrinterData;
        const printerType = this.overlayPrinterType;
        const topic = printerType === "mqtt" ? `scribe/${this.overlayPrinterName}/print` : null;
        const ipAddress = printerData.ip_address;
        const mdns = printerData.mdns;
        const firmwareVersion = printerData.firmware_version;
        const printerIcon = printerType === "local" ? window.getIcon("home", "w-6 h-6") : window.getIcon("megaphone", "w-6 h-6");
        let lastPowerOnText = "Not available";
        if (printerData.last_power_on) {
          try {
            let powerOnTime;
            if (typeof printerData.last_power_on === "string") {
              powerOnTime = new Date(printerData.last_power_on);
            } else if (typeof printerData.last_power_on === "number") {
              const timestamp = printerData.last_power_on < 1e10 ? printerData.last_power_on * 1e3 : printerData.last_power_on;
              powerOnTime = new Date(timestamp);
            } else {
              powerOnTime = new Date(printerData.last_power_on);
            }
            const now = /* @__PURE__ */ new Date();
            const diffMs = now.getTime() - powerOnTime.getTime();
            const lastPowerOnRelative = this.formatTimeDifference(diffMs);
            const lastPowerOnAbsolute = powerOnTime.toLocaleString(void 0, {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false
            });
            lastPowerOnText = `${lastPowerOnRelative}${lastPowerOnAbsolute ? ` (${lastPowerOnAbsolute})` : ""}`;
          } catch (e) {
            lastPowerOnText = "Invalid date";
          }
        }
        const timezone = printerData.timezone;
        return {
          topic,
          ipAddress,
          mdns,
          firmwareVersion,
          printerIcon,
          lastPowerOnText,
          timezone
        };
      },
      // Copy topic to clipboard
      async copyTopic(topic) {
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(topic);
          } else {
            const textarea = document.createElement("textarea");
            textarea.value = topic;
            textarea.style.position = "fixed";
            textarea.style.left = "-999999px";
            textarea.style.top = "-999999px";
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
          }
        } catch (error) {
          console.error("Failed to copy:", error);
          this.showToast("Failed to copy topic", "error");
        }
      },
      // Format time difference
      formatTimeDifference(diffMs) {
        const diffSeconds = Math.floor(diffMs / 1e3);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays > 0) {
          return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
        } else if (diffHours > 0) {
          return `about ${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
        } else if (diffMinutes >= 2) {
          return `${diffMinutes} mins ago`;
        } else if (diffMinutes === 1) {
          return "A minute ago";
        } else if (diffSeconds > 30) {
          return "30 seconds ago";
        } else {
          return "Just now";
        }
      },
      // Toast management
      showToast(message, type = "info") {
        const id = Date.now();
        const toast = { id, message, type };
        this.toasts.push(toast);
        setTimeout(() => {
          this.removeToast(id);
        }, 4e3);
      },
      removeToast(id) {
        this.toasts = this.toasts.filter((toast) => toast.id !== id);
      },
      // Check for settings success
      checkForSettingsSuccess() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("settings") === "stashed") {
          this.settingsStashed = true;
          setTimeout(() => {
            this.settingsStashed = false;
          }, 3e3);
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        } else if (urlParams.get("settings_saved") === "true") {
          this.showToast("\u{1F4BE} Settings saved", "success");
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      },
      // Confetti Celebration Methods
      triggerQuickActionCelebration(action) {
        if (typeof confetti !== "undefined") {
          const buttonElement = document.querySelector(`[data-action="${action}"]`);
          const buttonRect = buttonElement == null ? void 0 : buttonElement.getBoundingClientRect();
          switch (action) {
            case "riddle":
              confetti({
                particleCount: 100,
                spread: 70,
                origin: buttonRect ? {
                  x: (buttonRect.left + buttonRect.width / 2) / window.innerWidth,
                  y: (buttonRect.top + buttonRect.height / 2) / window.innerHeight
                } : { y: 0.6 },
                colors: ["#f59e0b", "#eab308", "#facc15", "#fde047"],
                // Yellow tones
                shapes: ["square"]
              });
              break;
            case "joke":
              confetti({
                particleCount: 150,
                spread: 90,
                origin: buttonRect ? {
                  x: (buttonRect.left + buttonRect.width / 2) / window.innerWidth,
                  y: (buttonRect.top + buttonRect.height / 2) / window.innerHeight
                } : { y: 0.6 },
                colors: ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0"],
                // Emerald tones
                scalar: 1.2
              });
              break;
            case "quote":
              confetti({
                particleCount: 80,
                spread: 45,
                origin: buttonRect ? {
                  x: (buttonRect.left + buttonRect.width / 2) / window.innerWidth,
                  y: (buttonRect.top + buttonRect.height / 2) / window.innerHeight
                } : { y: 0.6 },
                colors: ["#8b5cf6", "#a78bfa", "#c4b5fd", "#e0e7ff"],
                // Purple tones
                scalar: 0.8,
                shapes: ["star"]
              });
              break;
            case "quiz":
              confetti({
                particleCount: 120,
                spread: 360,
                origin: buttonRect ? {
                  x: (buttonRect.left + buttonRect.width / 2) / window.innerWidth,
                  y: (buttonRect.top + buttonRect.height / 2) / window.innerHeight
                } : { y: 0.6 },
                colors: ["#06b6d4", "#67e8f9", "#a5f3fc", "#cffafe"],
                // Cyan tones
                startVelocity: 45,
                decay: 0.85
              });
              break;
            case "news":
              confetti({
                particleCount: 120,
                spread: 80,
                origin: buttonRect ? {
                  x: (buttonRect.left + buttonRect.width / 2) / window.innerWidth,
                  y: (buttonRect.top + buttonRect.height / 2) / window.innerHeight
                } : { y: 0.6 },
                colors: ["#6b7280", "#9ca3af", "#d1d5db", "#f3f4f6"],
                // Gray tones to match gray button
                shapes: ["square"],
                scalar: 1.1,
                gravity: 0.9,
                drift: 0.05
              });
              break;
            case "memo":
              confetti({
                particleCount: 100,
                spread: 60,
                origin: buttonRect ? {
                  x: (buttonRect.left + buttonRect.width / 2) / window.innerWidth,
                  y: (buttonRect.top + buttonRect.height / 2) / window.innerHeight
                } : { y: 0.6 },
                colors: ["#ec4899", "#f472b6", "#f9a8d4", "#fce7f3"],
                // Pink tones to match pink button
                scalar: 0.9,
                startVelocity: 30
              });
              break;
            default:
              confetti({
                particleCount: 100,
                spread: 70,
                origin: buttonRect ? {
                  x: (buttonRect.left + buttonRect.width / 2) / window.innerWidth,
                  y: (buttonRect.top + buttonRect.height / 2) / window.innerHeight
                } : { y: 0.6 }
              });
          }
        }
      },
      triggerSubmitCelebration() {
        if (typeof confetti !== "undefined") {
          const submitButton = document.querySelector("#main-submit-btn");
          const buttonRect = submitButton == null ? void 0 : submitButton.getBoundingClientRect();
          const origin = buttonRect ? {
            x: (buttonRect.left + buttonRect.width / 2) / window.innerWidth,
            y: (buttonRect.top + buttonRect.height / 2) / window.innerHeight
          } : { y: 0.6 };
          confetti({
            particleCount: 200,
            spread: 100,
            origin,
            colors: ["#3b82f6", "#60a5fa", "#93c5fd", "#dbeafe"],
            // Blue tones only
            scalar: 1.5
          });
        }
      },
      // Navigation
      goToSettings() {
        window.location.href = "/settings.html";
      },
      // === Memo Functions ===
      async loadMemosFromAPI() {
        if (this.memosLoaded) return;
        console.log("\u{1F4DD} Loading memos from API...");
        try {
          const memosData = await window.IndexAPI.loadMemos();
          this.memos = [
            { id: 1, content: memosData.memo1 || "" },
            { id: 2, content: memosData.memo2 || "" },
            { id: 3, content: memosData.memo3 || "" },
            { id: 4, content: memosData.memo4 || "" }
          ];
          this.memosLoaded = true;
          console.log("\u{1F4DD} Memos loaded from API:", this.memos);
        } catch (error) {
          console.error("\u{1F4DD} Failed to load memos:", error);
          this.memos = [
            { id: 1, content: "" },
            { id: 2, content: "" },
            { id: 3, content: "" },
            { id: 4, content: "" }
          ];
          this.memosLoaded = true;
        }
      },
      async showMemoModal() {
        console.log("\u{1F4DD} Opening memo modal");
        this.memoModalVisible = true;
        if (!this.memosLoaded) {
          await this.loadMemosFromAPI();
        }
      },
      closeMemoModal() {
        console.log("\u{1F4DD} Closing memo modal");
        this.memoModalVisible = false;
      },
      async printMemo(memoId) {
        if (this.printing) return;
        try {
          this.printing = true;
          console.log(`\u{1F4DD} Printing memo ${memoId}...`);
          const response = await fetch(`/api/memo/${memoId}`);
          if (!response.ok) {
            throw new Error(`Failed to get memo: ${response.status}`);
          }
          const memoData = await response.json();
          if (!memoData.content) {
            throw new Error("No memo content received");
          }
          console.log(`\u{1F4DD} Memo ${memoId} retrieved: ${memoData.content}`);
          let printResponse;
          if (this.selectedPrinter === "local-direct") {
            printResponse = await window.IndexAPI.printLocalContent(memoData.content);
          } else {
            printResponse = await window.IndexAPI.printMQTTContent(memoData.content, this.selectedPrinter);
          }
          this.activeQuickAction = "memo";
          this.closeMemoModal();
          if (window.confetti) {
            confetti({
              colors: ["#ec4899", "#f472b6", "#f9a8d4", "#fce7f3"],
              // Pink tones to match pink button
              startVelocity: 30,
              spread: 360,
              ticks: 60,
              zIndex: 0
            });
          }
          setTimeout(() => {
            this.activeQuickAction = null;
          }, 2e3);
        } catch (error) {
          console.error(`\u{1F4DD} Failed to print memo ${memoId}:`, error);
          this.showToast(`Failed to print memo: ${error.message}`, "error");
        } finally {
          this.printing = false;
        }
      },
      // Setup SSE connection for printer discovery
      setupSSEConnection() {
        console.log("\u{1F50C} Initializing real-time printer discovery (SSE)");
        let eventSource = null;
        const connectSSE = () => {
          if (eventSource) {
            eventSource.close();
          }
          eventSource = new EventSource("/events");
          eventSource.addEventListener("printer-update", (event) => {
            try {
              console.log("\u{1F5A8}\uFE0F Real-time printer update received");
              const data = JSON.parse(event.data);
              this.updatePrintersFromData(data);
            } catch (error) {
              console.error("Error parsing printer update:", error);
            }
          });
          eventSource.addEventListener("system-status", (event) => {
            try {
              const data = JSON.parse(event.data);
              console.log(`\u{1F4E1} System status: ${data.status} - ${data.message}`);
              this.showSystemNotification(data.status, data.message);
            } catch (error) {
              console.error("Error parsing system status:", error);
            }
          });
          eventSource.onerror = (error) => {
            console.error("SSE connection error:", error);
            setTimeout(() => {
              console.log("\u{1F504} Attempting to reconnect SSE...");
              connectSSE();
            }, 5e3);
          };
          eventSource.onopen = (event) => {
            console.log("\u2705 Real-time updates connected");
          };
        };
        connectSSE();
        window.addEventListener("beforeunload", () => {
          if (eventSource) {
            eventSource.close();
          }
        });
      },
      updatePrintersFromData(data) {
        if (data && data.discovered_printers) {
          this.printers = data.discovered_printers;
          const event = new CustomEvent("printersUpdated", {
            detail: {
              printers: data.discovered_printers
            }
          });
          document.dispatchEvent(event);
        }
      },
      showSystemNotification(status, message) {
        if (!["connected", "error", "reconnecting"].includes(status)) {
          return;
        }
        const notification = document.createElement("div");
        notification.className = `notification notification-${status}`;
        notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 15px;
        border-radius: 4px;
        color: white;
        font-size: 14px;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
      `;
        switch (status) {
          case "connected":
            notification.style.backgroundColor = "#10b981";
            break;
          case "error":
            notification.style.backgroundColor = "#ef4444";
            break;
          case "reconnecting":
            notification.style.backgroundColor = "#f59e0b";
            break;
        }
        notification.textContent = message;
        document.body.appendChild(notification);
        requestAnimationFrame(() => {
          notification.style.opacity = "1";
        });
        setTimeout(() => {
          notification.style.opacity = "0";
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 300);
        }, 3e3);
      }
    };
    return store;
  }
  document.addEventListener("alpine:init", () => {
    if (window.indexStoreInstance) {
      console.log("\u{1F3E0} Index: Store already exists, skipping alpine:init");
      return;
    }
    const indexStore = initializeIndexStore();
    Alpine.store("index", indexStore);
    window.indexStoreInstance = indexStore;
    indexStore.init();
  });
  async function loadConfiguration() {
    try {
      console.log("API: Loading configuration from server...");
      const response = await fetch("/api/config");
      if (!response.ok) {
        throw new Error(`Config API returned ${response.status}: ${response.statusText}`);
      }
      const config = await response.json();
      console.log("API: Configuration loaded successfully");
      return config;
    } catch (error) {
      console.error("API: Failed to load configuration:", error);
      throw error;
    }
  }
  async function printLocalContent(content) {
    try {
      console.log("API: Sending content to local printer...");
      const response = await fetch("/api/print-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content })
      });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Print failed: ${errorData}`);
      }
      const result = await response.json();
      console.log("API: Content sent to local printer successfully");
      return result;
    } catch (error) {
      console.error("API: Failed to print local content:", error);
      throw error;
    }
  }
  async function printMQTTContent(content, topic) {
    try {
      console.log(`API: Sending content to MQTT printer on topic: ${topic}`);
      const response = await fetch("/api/print-mqtt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          topic
        })
      });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`MQTT print failed: ${errorData}`);
      }
      const result = await response.json();
      console.log("API: Content sent to MQTT printer successfully");
      return result;
    } catch (error) {
      console.error("API: Failed to print MQTT content:", error);
      throw error;
    }
  }
  async function executeQuickAction(action) {
    try {
      console.log(`API: Executing quick action: ${action}`);
      const response = await fetch(`/api/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Quick action '${action}' failed: ${errorData}`);
      }
      const result = await response.json();
      console.log(`API: Quick action '${action}' completed successfully`);
      return result;
    } catch (error) {
      console.error(`API: Failed to execute quick action '${action}':`, error);
      throw error;
    }
  }
  async function generateUserMessage(message, target = "local-direct") {
    try {
      console.log("API: Generating user message content...");
      const payload = { message };
      if (target !== "local-direct") {
        payload.target = target;
      }
      const response = await fetch("/api/user-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      console.log("API: User message content generated successfully");
      return result;
    } catch (error) {
      console.error("API: Failed to generate user message content:", error);
      throw error;
    }
  }
  async function loadMemos() {
    try {
      console.log("API: Loading memos from server...");
      const response = await fetch("/api/memos");
      if (!response.ok) {
        throw new Error(`Memos API returned ${response.status}: ${response.statusText}`);
      }
      const memos = await response.json();
      console.log("API: Memos loaded successfully");
      return memos;
    } catch (error) {
      console.error("API: Failed to load memos:", error);
      throw error;
    }
  }
  window.IndexAPI = {
    loadConfiguration,
    printLocalContent,
    printMQTTContent,
    executeQuickAction,
    generateUserMessage,
    loadMemos
  };
})();
