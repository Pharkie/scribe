(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

  // multi-entry:multi-entry:src/js/diagnostics-alpine-store.js,src/js/diagnostics-api.js
  function initializeDiagnosticsStore() {
    const store = {
      // Core state
      loading: true,
      error: null,
      initialized: false,
      // Flag to prevent duplicate initialization
      diagnosticsData: {},
      configData: {},
      nvsData: {},
      routesData: {},
      // UI state
      currentSection: "microcontroller-section",
      progressReady: false,
      // Section definitions
      sections: [
        { id: "microcontroller-section", name: "Microcontroller", icon: "cpuChip", color: "orange" },
        { id: "logging-section", name: "Logging", icon: "clipboardDocumentList", color: "indigo" },
        { id: "pages-endpoints-section", name: "Routes", icon: "link", color: "teal" },
        { id: "config-file-section", name: "Runtime Configuration", icon: "cog6Tooth", color: "green" },
        { id: "nvs-storage-section", name: "NVS", icon: "saveFloppyDisk", color: "cyan" }
      ],
      // Initialize store
      async init() {
        if (this.initialized) {
          console.log("\u{1F6E0}\uFE0F Diagnostics: Already initialized, skipping");
          return;
        }
        this.initialized = true;
        console.log("\u{1F6E0}\uFE0F Diagnostics: Starting initialization...");
        await this.loadDiagnostics();
        console.log("\u{1F6E0}\uFE0F Diagnostics: Initialization complete, loading:", this.loading, "error:", this.error);
      },
      // Load all diagnostics data with proper error logging instead of silent fallbacks
      async loadDiagnostics() {
        this.loading = true;
        this.error = null;
        console.log("\u{1F6E0}\uFE0F Diagnostics: Loading data from APIs...");
        try {
          console.log("\u{1F6E0}\uFE0F Diagnostics: Making parallel API calls...");
          const [diagnosticsResponse, configResponse, nvsResponse, routesResponse] = await Promise.allSettled([
            window.DiagnosticsAPI.loadDiagnostics(),
            window.DiagnosticsAPI.loadConfiguration(),
            window.DiagnosticsAPI.loadNVSDump(),
            window.DiagnosticsAPI.loadRoutes()
          ]);
          console.log("\u{1F6E0}\uFE0F Diagnostics: API responses received:", {
            diagnostics: diagnosticsResponse.status === "fulfilled",
            config: configResponse.status === "fulfilled",
            nvs: nvsResponse.status === "fulfilled",
            routes: routesResponse.status === "fulfilled"
          });
          const anyApiSuccess = diagnosticsResponse.status === "fulfilled" || configResponse.status === "fulfilled" || nvsResponse.status === "fulfilled" || routesResponse.status === "fulfilled";
          if (!anyApiSuccess) {
            this.error = "All diagnostic APIs are unavailable. Please check the system.";
            this.loading = false;
            return;
          }
          if (diagnosticsResponse.status === "fulfilled") {
            this.diagnosticsData = diagnosticsResponse.value;
            console.log("\u2705 Diagnostics API data loaded:", Object.keys(this.diagnosticsData));
          } else {
            console.error("\u274C Diagnostics API failed - diagnostics data will be incomplete:", diagnosticsResponse.reason);
            this.diagnosticsData = {};
          }
          if (configResponse.status === "fulfilled") {
            this.configData = configResponse.value;
            console.log("\u2705 Config API data loaded:", Object.keys(this.configData));
          } else {
            console.error("\u274C Config API failed - configuration data will be incomplete:", configResponse.reason);
            this.configData = {};
          }
          if (nvsResponse.status === "fulfilled") {
            this.nvsData = nvsResponse.value;
            console.log("\u2705 NVS API data loaded:", Object.keys(this.nvsData));
          } else {
            console.error("\u274C NVS API failed - NVS storage data will be incomplete:", nvsResponse.reason);
            this.nvsData = {};
          }
          if (routesResponse.status === "fulfilled") {
            this.routesData = routesResponse.value;
            console.log("\u2705 Routes API data loaded:", Object.keys(this.routesData));
          } else {
            console.error("\u274C Routes API failed - routes data will be incomplete:", routesResponse.reason);
            this.routesData = {};
          }
          console.log("\u2705 Diagnostics loading complete:", {
            diagnosticsKeys: Object.keys(this.diagnosticsData).length,
            configKeys: Object.keys(this.configData).length,
            nvsKeys: this.nvsData.keys ? Object.keys(this.nvsData.keys).length : 0,
            routesKeys: Object.keys(this.routesData).length
          });
          this.error = null;
          this.loading = false;
        } catch (error) {
          console.error("\u{1F6E0}\uFE0F Diagnostics: Unexpected error loading diagnostics:", error);
          this.error = `Unexpected error loading diagnostics: ${error.message}`;
          this.loading = false;
        }
      },
      // Section management
      showSection(sectionId) {
        this.currentSection = sectionId;
      },
      // Trigger progress bar animations when content is ready
      triggerProgressAnimations() {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            this.progressReady = true;
          });
        });
      },
      getSectionClass(sectionId) {
        const section = this.sections.find((s) => s.id === sectionId);
        const baseClass = "section-nav-btn";
        const colorClass = `section-nav-btn-${(section == null ? void 0 : section.color) || "purple"}`;
        const activeClass = this.currentSection === sectionId ? "active" : "";
        return `${baseClass} ${colorClass} ${activeClass}`.trim();
      },
      // Microcontroller computed properties - show errors instead of silent fallbacks
      get microcontrollerInfo() {
        var _a;
        const microcontroller = this.diagnosticsData.microcontroller;
        if (!microcontroller) {
          console.error("\u274C Missing microcontroller data from diagnostics API");
          return {
            chipModel: "ERROR: Missing Data",
            cpuFrequency: "ERROR: Missing Data",
            flashSize: "ERROR: Missing Data",
            firmwareVersion: "ERROR: Missing Data",
            uptime: "ERROR: Missing Data",
            temperature: "ERROR: Missing Data"
          };
        }
        return {
          chipModel: microcontroller.chip_model || "ERROR: Missing chip_model",
          cpuFrequency: microcontroller.cpu_frequency_mhz ? `${microcontroller.cpu_frequency_mhz} MHz` : "ERROR: Missing frequency",
          flashSize: this.formatBytes((_a = microcontroller.flash) == null ? void 0 : _a.total_chip_size) || "ERROR: Missing flash size",
          firmwareVersion: microcontroller.sdk_version || "ERROR: Missing SDK version",
          uptime: microcontroller.uptime_ms ? this.formatUptime(microcontroller.uptime_ms / 1e3) : "ERROR: Missing uptime",
          temperature: this.formatTemperature(microcontroller.temperature) || "ERROR: Missing temperature"
        };
      },
      // Memory usage computed properties - show errors instead of silent fallbacks
      get memoryUsage() {
        var _a;
        const microcontroller = this.diagnosticsData.microcontroller;
        if (!microcontroller) {
          console.error("\u274C Missing microcontroller data for memory usage");
          return {
            flashUsageText: "ERROR: Missing Data",
            heapUsageText: "ERROR: Missing Data",
            flashUsagePercent: 0,
            heapUsagePercent: 0
          };
        }
        const flash = (_a = microcontroller.flash) == null ? void 0 : _a.app_partition;
        const memory = microcontroller.memory;
        if (!flash) {
          console.error("\u274C Missing flash data in microcontroller diagnostics");
        }
        if (!memory) {
          console.error("\u274C Missing memory data in microcontroller diagnostics");
        }
        const flashUsed = (flash == null ? void 0 : flash.total) ? (flash.used || 0) / flash.total * 100 : 0;
        const heapUsed = (memory == null ? void 0 : memory.total_heap) ? (memory.used_heap || 0) / memory.total_heap * 100 : 0;
        return {
          flashUsageText: flash ? `${this.formatBytes(flash.used || 0)} / ${this.formatBytes(flash.total || 0)} (${flashUsed.toFixed(0)}%)` : "ERROR: Missing flash data",
          heapUsageText: memory ? `${this.formatBytes(memory.used_heap || 0)} / ${this.formatBytes(memory.total_heap || 0)} (${heapUsed.toFixed(0)}%)` : "ERROR: Missing memory data",
          flashUsagePercent: flashUsed,
          heapUsagePercent: heapUsed
        };
      },
      // Logging computed properties - show errors instead of silent fallbacks
      get loggingInfo() {
        const logging = this.diagnosticsData.logging;
        if (!logging) {
          console.error("\u274C Missing logging data from diagnostics API");
          return {
            level: "ERROR: Missing Data",
            serialLogging: "ERROR: Missing Data",
            webLogging: "ERROR: Missing Data",
            fileLogging: "ERROR: Missing Data",
            mqttLogging: "ERROR: Missing Data"
          };
        }
        return {
          level: logging.level_name || "ERROR: Missing level_name",
          serialLogging: logging.serial_enabled !== void 0 ? logging.serial_enabled ? "Enabled" : "Disabled" : "ERROR: Missing serial_enabled",
          webLogging: logging.betterstack_enabled !== void 0 ? logging.betterstack_enabled ? "Enabled" : "Disabled" : "ERROR: Missing betterstack_enabled",
          fileLogging: logging.file_enabled !== void 0 ? logging.file_enabled ? "Enabled" : "Disabled" : "ERROR: Missing file_enabled",
          mqttLogging: logging.mqtt_enabled !== void 0 ? logging.mqtt_enabled ? "Enabled" : "Disabled" : "ERROR: Missing mqtt_enabled"
        };
      },
      // Web pages computed properties - show errors instead of silent fallbacks
      get sortedRoutes() {
        var _a;
        const routes = (_a = this.routesData) == null ? void 0 : _a.web_pages;
        if (!routes) {
          console.error("\u274C Missing web_pages data from routes API");
          return [{
            path: "ERROR: Missing Data",
            description: "Web pages data not available from routes API",
            isError: true
          }];
        }
        const htmlPages = [];
        const otherRoutes = [];
        routes.forEach((route) => {
          if (route.path.endsWith(".html") || route.path === "/") {
            htmlPages.push(__spreadProps(__spreadValues({}, route), {
              isHtmlPage: true,
              linkPath: route.path === "/" ? "/" : route.path
            }));
          } else if (route.path === "(unmatched routes)") {
            otherRoutes.push(__spreadProps(__spreadValues({}, route), {
              isUnmatched: true,
              linkPath: "/404",
              path: "*",
              description: "404 handler"
            }));
          } else {
            otherRoutes.push(__spreadProps(__spreadValues({}, route), {
              isHtmlPage: false
            }));
          }
        });
        htmlPages.sort((a, b) => {
          if (a.path === "/") return -1;
          if (b.path === "/") return 1;
          return a.path.localeCompare(b.path);
        });
        otherRoutes.sort((a, b) => {
          if (a.isUnmatched) return 1;
          if (b.isUnmatched) return -1;
          return a.path.localeCompare(b.path);
        });
        return [...htmlPages, ...otherRoutes];
      },
      // API endpoints computed properties - show errors instead of silent fallbacks
      get apiEndpoints() {
        var _a;
        const endpoints = (_a = this.routesData) == null ? void 0 : _a.api_endpoints;
        if (!endpoints) {
          console.error("\u274C Missing api_endpoints data from routes API");
          return {
            ERROR: [{
              path: "ERROR: Missing Data",
              description: "API endpoints data not available from routes API"
            }]
          };
        }
        const grouped = {};
        endpoints.forEach((endpoint) => {
          if (!grouped[endpoint.method]) {
            grouped[endpoint.method] = [];
          }
          grouped[endpoint.method].push(endpoint);
        });
        Object.keys(grouped).forEach((method) => {
          grouped[method].sort((a, b) => a.path.localeCompare(b.path));
        });
        return grouped;
      },
      // Config file formatted
      get configFileFormatted() {
        if (!this.configData || Object.keys(this.configData).length === 0) {
          return "Configuration not available";
        }
        const redacted = this.redactSecrets(this.configData);
        return JSON.stringify(redacted, null, 2);
      },
      // NVS data formatted
      get nvsDataFormatted() {
        var _a, _b, _c, _d;
        if (!this.nvsData || Object.keys(this.nvsData).length === 0) {
          console.error("\u274C Missing NVS data from nvs-dump API");
          return "ERROR: NVS data not available - API failed or returned empty data";
        }
        const missingFields = [];
        if (!this.nvsData.namespace) missingFields.push("namespace");
        if (!this.nvsData.timestamp) missingFields.push("timestamp");
        if (!this.nvsData.summary) missingFields.push("summary");
        if (this.nvsData.summary && this.nvsData.summary.totalKeys === void 0) missingFields.push("summary.totalKeys");
        if (this.nvsData.summary && this.nvsData.summary.validKeys === void 0) missingFields.push("summary.validKeys");
        if (this.nvsData.summary && this.nvsData.summary.correctedKeys === void 0) missingFields.push("summary.correctedKeys");
        if (this.nvsData.summary && this.nvsData.summary.invalidKeys === void 0) missingFields.push("summary.invalidKeys");
        if (missingFields.length > 0) {
          console.warn("\u26A0\uFE0F Missing optional NVS fields:", missingFields);
        }
        const formattedData = {
          namespace: this.nvsData.namespace || "ERROR: Missing namespace",
          timestamp: this.nvsData.timestamp || "ERROR: Missing timestamp",
          summary: {
            totalKeys: ((_a = this.nvsData.summary) == null ? void 0 : _a.totalKeys) !== void 0 ? this.nvsData.summary.totalKeys : "ERROR: Missing totalKeys",
            validKeys: ((_b = this.nvsData.summary) == null ? void 0 : _b.validKeys) !== void 0 ? this.nvsData.summary.validKeys : "ERROR: Missing validKeys",
            correctedKeys: ((_c = this.nvsData.summary) == null ? void 0 : _c.correctedKeys) !== void 0 ? this.nvsData.summary.correctedKeys : "ERROR: Missing correctedKeys",
            invalidKeys: ((_d = this.nvsData.summary) == null ? void 0 : _d.invalidKeys) !== void 0 ? this.nvsData.summary.invalidKeys : "ERROR: Missing invalidKeys"
          },
          keys: {}
        };
        if (this.nvsData.keys) {
          const sortedKeys = Object.keys(this.nvsData.keys).sort();
          sortedKeys.forEach((key) => {
            const keyData = this.nvsData.keys[key];
            formattedData.keys[key] = {
              type: keyData.type,
              description: keyData.description,
              exists: keyData.exists,
              value: keyData.value,
              validation: keyData.validation,
              status: keyData.status
            };
            if (keyData.originalValue !== void 0) {
              formattedData.keys[key].originalValue = keyData.originalValue;
            }
            if (keyData.note) {
              formattedData.keys[key].note = keyData.note;
            }
            if (keyData.length !== void 0) {
              formattedData.keys[key].length = keyData.length;
            }
          });
        }
        return JSON.stringify(formattedData, null, 2);
      },
      // Quick actions
      async handleQuickAction(action) {
        try {
          const contentResult = await window.DiagnosticsAPI.executeQuickAction(action);
          if (!contentResult.content) {
            console.error("No content received from server");
            return;
          }
          await window.DiagnosticsAPI.printLocalContent(contentResult.content);
          console.log(`${action} sent to printer successfully!`);
        } catch (error) {
          console.error("Error sending quick action:", error);
        }
      },
      // Utility functions
      formatBytes(bytes) {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(0)) + " " + sizes[i];
      },
      formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor(seconds % 86400 / 3600);
        const minutes = Math.floor(seconds % 3600 / 60);
        if (days > 0) return `${days}d ${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
      },
      formatTemperature(tempC) {
        if (!tempC || isNaN(tempC)) return "-";
        let status, color;
        if (tempC < 35) {
          status = "Cool";
          color = "#3b82f6";
        } else if (tempC < 50) {
          status = "Normal";
          color = "#10b981";
        } else if (tempC < 65) {
          status = "Warm";
          color = "#f59e0b";
        } else if (tempC < 80) {
          status = "Hot";
          color = "#ef4444";
        } else {
          status = "Critical";
          color = "#dc2626";
        }
        return `${tempC.toFixed(1)}\xB0C (${status})`;
      },
      getProgressBarClass(percentage) {
        if (percentage > 90) return "bg-red-500";
        if (percentage > 75) return "bg-orange-600";
        return "bg-orange-500";
      },
      redactSecrets(configData) {
        const redacted = JSON.parse(JSON.stringify(configData));
        const secretKeys = ["password", "pass", "secret", "token", "key", "apikey", "api_key", "auth", "credential", "cert", "private", "bearer", "oauth"];
        function redactObject(obj) {
          if (typeof obj !== "object" || obj === null) return obj;
          for (const [key, value] of Object.entries(obj)) {
            const lowerKey = key.toLowerCase();
            const shouldRedact = secretKeys.some((secretKey) => lowerKey.includes(secretKey));
            if (shouldRedact && typeof value === "string" && value.length > 0) {
              obj[key] = value.length > 8 ? value.substring(0, 2) + "\u25CF\u25CF\u25CF\u25CF\u25CF\u25CF\u25CF\u25CF" + value.substring(value.length - 2) : "\u25CF\u25CF\u25CF\u25CF\u25CF\u25CF\u25CF\u25CF";
            } else if (typeof value === "object" && value !== null) {
              redactObject(value);
            }
          }
        }
        redactObject(redacted);
        return redacted;
      },
      // JSON syntax highlighting function
      highlightJSON(jsonString) {
        if (!jsonString || jsonString === "Configuration not available" || jsonString.startsWith("ERROR:")) {
          return `<span class="text-gray-400">${jsonString}</span>`;
        }
        return jsonString.replace(/"([^"]+)"(\s*:)/g, '<span class="json-key">"$1"</span><span class="json-punctuation">$2</span>').replace(/:\s*"([^"]*)"/g, ': <span class="json-string">"$1"</span>').replace(/:\s*(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g, ': <span class="json-number">$1</span>').replace(/:\s*(true|false)/g, ': <span class="json-boolean">$1</span>').replace(/:\s*(null)/g, ': <span class="json-null">$1</span>').replace(/([{}[\],])/g, '<span class="json-punctuation">$1</span>').replace(/<span class="json-punctuation">(<span class="json-punctuation">)/g, "$1").replace(/(<\/span>)<\/span>/g, "$1");
      },
      // Navigation
      goBack() {
        window.goBack();
      }
    };
    return store;
  }
  document.addEventListener("alpine:init", () => {
    if (window.diagnosticsStoreInstance) {
      console.log("\u{1F6E0}\uFE0F Diagnostics: Store already exists, skipping alpine:init");
      return;
    }
    const diagnosticsStore = initializeDiagnosticsStore();
    Alpine.store("diagnostics", diagnosticsStore);
    window.diagnosticsStoreInstance = diagnosticsStore;
    diagnosticsStore.init();
    Alpine.store("diagnosticsPartials", {
      cache: {},
      loading: {},
      load(name) {
        if (this.cache[name]) return this.cache[name];
        if (this.loading[name]) return '<div class="p-4 text-center text-gray-500">Loading...</div>';
        this.loading[name] = true;
        fetch(`/html/partials/diagnostics/${name}.html`).then((response) => {
          if (!response.ok) throw new Error(`Failed to load partial: ${name}`);
          return response.text();
        }).then((html) => {
          this.loading[name] = false;
          this.cache[name] = html;
          Alpine.store("diagnosticsPartials", __spreadValues({}, this));
        }).catch((error) => {
          console.error("Error loading partial:", error);
          this.cache[name] = `<div class="p-4 text-center text-red-500">Error loading ${name}</div>`;
          this.loading[name] = false;
          Alpine.store("diagnosticsPartials", __spreadValues({}, this));
        });
        return '<div class="p-4 text-center text-gray-500">Loading...</div>';
      }
    });
  });
  async function loadDiagnostics() {
    try {
      console.log("API: Loading diagnostics from server...");
      const response = await fetch("/api/diagnostics");
      if (!response.ok) {
        throw new Error(`Diagnostics API returned ${response.status}: ${response.statusText}`);
      }
      const diagnostics = await response.json();
      console.log("API: Diagnostics loaded successfully");
      return diagnostics;
    } catch (error) {
      console.error("API: Failed to load diagnostics:", error);
      throw error;
    }
  }
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
  async function loadNVSDump() {
    try {
      console.log("API: Loading NVS dump from server...");
      const response = await fetch("/api/nvs-dump");
      if (!response.ok) {
        throw new Error(`NVS dump API returned ${response.status}: ${response.statusText}`);
      }
      const nvs = await response.json();
      console.log("API: NVS dump loaded successfully");
      return nvs;
    } catch (error) {
      console.error("API: Failed to load NVS dump:", error);
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
        throw new Error(`Quick action '${action}' failed: ${response.status} - ${errorData}`);
      }
      const result = await response.json();
      console.log(`API: Quick action '${action}' completed successfully`);
      return result;
    } catch (error) {
      console.error(`API: Failed to execute quick action '${action}':`, error);
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Print failed: HTTP ${response.status}`);
      }
      console.log("API: Content sent to printer successfully");
    } catch (error) {
      console.error("API: Failed to print content:", error);
      throw error;
    }
  }
  async function loadRoutes() {
    try {
      console.log("API: Loading routes from server...");
      const response = await fetch("/api/routes");
      if (!response.ok) {
        throw new Error(`Routes API returned ${response.status}: ${response.statusText}`);
      }
      const routes = await response.json();
      console.log("API: Routes loaded successfully");
      return routes;
    } catch (error) {
      console.error("API: Failed to load routes:", error);
      throw error;
    }
  }
  window.DiagnosticsAPI = {
    loadDiagnostics,
    loadConfiguration,
    loadNVSDump,
    executeQuickAction,
    printLocalContent,
    loadRoutes
  };
})();
