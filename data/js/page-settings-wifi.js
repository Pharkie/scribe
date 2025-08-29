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

  // multi-entry:multi-entry:src/js/settings-api.js,src/js/page-settings-wifi.js
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
  async function saveConfiguration(configData) {
    try {
      console.log("API: Sending config to server...");
      const response = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(configData)
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API: Server error response:", errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      const result = await response.json();
      console.log("API: Server response:", result);
      return result.message || "Configuration saved";
    } catch (error) {
      console.error("API: Failed to save configuration:", error);
      throw error;
    }
  }
  async function testUnbiddenInkGeneration(prompt) {
    try {
      const response = await fetch("/api/unbidden-ink", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        if (response.status === 500 && errorMessage.includes("Failed to generate")) {
          errorMessage = "Failed to generate content. Please check that your ChatGPT API Token is valid and you have sufficient API credits. You can check your account at https://platform.openai.com/account";
        }
        throw new Error(errorMessage);
      }
      return await response.json();
    } catch (error) {
      console.error("API: Failed to test Unbidden Ink:", error);
      throw error;
    }
  }
  async function printLocalContent(content) {
    try {
      const response = await fetch("/api/print-local", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: content })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Print failed: HTTP ${response.status}`);
      }
    } catch (error) {
      console.error("API: Failed to print content:", error);
      throw error;
    }
  }
  async function triggerLedEffect(effectName, duration = 1e4, settings = null) {
    try {
      let payload;
      if (typeof effectName === "object" && effectName.effect) {
        payload = effectName;
      } else if (typeof effectName === "string" && typeof duration === "object") {
        payload = __spreadValues({ effect: effectName }, duration);
      } else {
        payload = {
          effect: effectName,
          duration
        };
        if (settings && Object.keys(settings).length > 0) {
          payload.settings = settings;
        }
      }
      const response = await fetch("/api/led-effect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("API: Failed to trigger LED effect:", error);
      throw error;
    }
  }
  async function turnOffLeds() {
    try {
      const response = await fetch("/api/leds-off", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("API: Failed to turn off LEDs:", error);
      throw error;
    }
  }
  async function scanWiFiNetworks() {
    try {
      console.log("API: Scanning for WiFi networks...");
      const response = await fetch("/api/wifi-scan");
      if (!response.ok) {
        throw new Error(`WiFi scan failed: ${response.status} - ${response.statusText}`);
      }
      const result = await response.json();
      console.log("API: WiFi scan completed:", result);
      if (!result.networks || !Array.isArray(result.networks)) {
        throw new Error("WiFi scan failed - no networks array in response");
      }
      return result.networks;
    } catch (error) {
      console.error("API: Failed to scan WiFi networks:", error);
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
  async function saveMemos(memosData) {
    try {
      console.log("API: Sending memos to server...");
      const response = await fetch("/api/memos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(memosData)
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API: Server error response:", errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      const result = await response.text();
      console.log("API: Server response:", result);
      return result;
    } catch (error) {
      console.error("API: Failed to save memos:", error);
      throw error;
    }
  }
  window.SettingsAPI = {
    loadConfiguration,
    saveConfiguration,
    testUnbiddenInkGeneration,
    printLocalContent,
    triggerLedEffect,
    turnOffLeds,
    scanWiFiNetworks,
    loadMemos,
    saveMemos
  };
  function initializeWiFiSettingsStore() {
    const store = {
      // ================== UTILITY FUNCTIONS ==================
      // Simple utility function extracted from repeated showMessage patterns
      showErrorMessage(message) {
        window.showMessage(message, "error");
      },
      // ================== STATE MANAGEMENT ==================
      // Core state management
      loading: true,
      error: null,
      saving: false,
      initialized: false,
      apPrintStatus: "normal",
      // 'normal', 'scribing'
      // Computed property to check if save should be enabled
      get canSave() {
        if (this.loading || this.saving || this.error) {
          return false;
        }
        const selectedSSID = this.wifiScan.mode === "manual" ? this.wifiScan.manualSSID : this.wifiScan.selectedNetwork;
        const hasValidSSID = selectedSSID && selectedSSID.trim() !== "";
        if (this.wifiScan.mode === "scan") {
          return hasValidSSID && this.wifiScan.selectedNetwork;
        }
        if (this.wifiScan.mode === "manual") {
          return hasValidSSID;
        }
        return false;
      },
      // Configuration data (reactive) - WiFi section
      config: {
        device: {
          wifi: {
            ssid: null,
            password: null,
            connect_timeout: null,
            status: null,
            fallback_ap_ssid: null,
            fallback_ap_password: null
          },
          mdns: null
        }
      },
      // Password modification tracking for secure handling
      passwordsModified: {
        wifiPassword: false
      },
      originalMaskedValues: {
        wifiPassword: ""
      },
      // WiFi network scanning state using Alpine reactive patterns
      wifiScan: {
        // Core state
        networks: [],
        currentSSID: null,
        selectedNetwork: null,
        manualSSID: "",
        mode: "scan",
        // 'scan' or 'manual'
        isScanning: false,
        error: null,
        hasScanned: false,
        passwordVisible: false,
        // Computed properties (Alpine getters)
        get sortedNetworks() {
          if (!this.networks || this.networks.length === 0) return [];
          const networksWithSignal = this.networks.map((network, index) => __spreadProps(__spreadValues({}, network), {
            signal_strength: this.formatSignalStrength(network.rssi),
            signal_display: `${this.formatSignalStrength(network.rssi)} (${network.rssi} dBm)`,
            uniqueKey: `${network.ssid}-${network.rssi}-${index}`
            // Unique key for Alpine rendering
          }));
          return networksWithSignal;
        },
        // Format RSSI to signal strength description
        formatSignalStrength(rssi) {
          if (rssi > -30) return "Excellent";
          if (rssi > -50) return "Very Good";
          if (rssi > -60) return "Good";
          if (rssi > -70) return "Fair";
          return "Poor";
        }
      },
      // Validation state
      validation: {
        errors: {}
      },
      // Computed properties for complex UI states
      get apPrintButtonText() {
        return this.apPrintStatus === "scribing" ? "Scribing" : "Scribe WiFi Fallback AP";
      },
      get saveButtonText() {
        return this.saving ? "Saving..." : "Save";
      },
      // ================== WIFI CONFIGURATION API ==================
      // Initialize store with data from server
      async init() {
        if (this.initialized) {
          console.log("\u{1F4E1} WiFi Settings: Already initialized, skipping");
          return;
        }
        this.initialized = true;
        this.loading = true;
        try {
          const serverConfig = await window.SettingsAPI.loadConfiguration();
          this.mergeWiFiConfig(serverConfig);
          this.initializeWiFiState();
          this.initializePasswordTracking();
          console.log("Alpine WiFi Store: Configuration loaded successfully");
        } catch (error) {
          console.error("Alpine WiFi Store: Failed to load configuration:", error);
          this.error = error.message;
        } finally {
          this.loading = false;
        }
      },
      // Merge server config into reactive state (WiFi section only)
      mergeWiFiConfig(serverConfig) {
        console.log("\u{1F4E1} Merging WiFi config from server:", serverConfig);
        if (serverConfig.device && serverConfig.device.wifi) {
          this.config.device.wifi.ssid = serverConfig.device.wifi.ssid || "";
          this.config.device.wifi.password = serverConfig.device.wifi.password || "";
          this.config.device.wifi.connect_timeout = serverConfig.device.wifi.connect_timeout || 15e3;
          this.config.device.wifi.status = serverConfig.device.wifi.status || null;
          this.config.device.wifi.fallback_ap_ssid = serverConfig.device.wifi.fallback_ap_ssid || "";
          this.config.device.wifi.fallback_ap_password = serverConfig.device.wifi.fallback_ap_password || "";
          if (!serverConfig.device.wifi.ssid) {
            console.warn("\u26A0\uFE0F Missing device.wifi.ssid in config");
          }
        } else {
          console.error("\u274C Missing device.wifi section in config");
        }
        if (serverConfig.device) {
          this.config.device.mdns = serverConfig.device.mdns || "";
        }
        console.log("\u2705 WiFi config merge complete:", this.config);
      },
      // Initialize password tracking
      initializePasswordTracking() {
        this.originalMaskedValues.wifiPassword = this.config.device.wifi.password || "";
      },
      // Track password modifications (called from templates)
      trackWifiPasswordChange(newValue) {
        const isMasked = newValue && newValue.includes("\u25CF");
        const hasChanged = newValue !== this.originalMaskedValues.wifiPassword;
        this.passwordsModified.wifiPassword = hasChanged && !isMasked;
      },
      // Initialize WiFi state - simplified
      initializeWiFiState() {
        var _a, _b, _c;
        this.wifiScan.currentSSID = ((_c = (_b = (_a = this.config) == null ? void 0 : _a.device) == null ? void 0 : _b.wifi) == null ? void 0 : _c.ssid) || null;
        this.wifiScan.selectedNetwork = this.wifiScan.currentSSID;
        this.wifiScan.manualSSID = "";
        this.wifiScan.mode = "scan";
        this.wifiScan.networks = [];
        this.wifiScan.isScanning = false;
        this.wifiScan.hasScanned = false;
        this.wifiScan.error = null;
        this.wifiScan.passwordVisible = false;
      },
      // ================== WIFI API ==================
      // WiFi scanning - simplified with reactive updates
      async scanWiFiNetworks() {
        this.wifiScan.isScanning = true;
        this.wifiScan.error = null;
        try {
          const networks = await window.SettingsAPI.scanWiFiNetworks();
          const networksBySSID = {};
          networks.filter((network) => network.ssid && network.ssid.trim()).forEach((network) => {
            const ssid = network.ssid.trim();
            if (!networksBySSID[ssid] || network.rssi > networksBySSID[ssid].rssi) {
              networksBySSID[ssid] = network;
            }
          });
          const validNetworks = Object.values(networksBySSID).sort((a, b) => {
            if (b.rssi !== a.rssi) {
              return b.rssi - a.rssi;
            }
            return a.ssid.localeCompare(b.ssid);
          });
          this.wifiScan.networks = validNetworks;
          this.wifiScan.hasScanned = true;
          this.wifiScan.mode = "scan";
          if (this.wifiScan.currentSSID) {
            const currentNetwork = validNetworks.find((n) => n.ssid === this.wifiScan.currentSSID);
            if (currentNetwork) {
              this.wifiScan.selectedNetwork = this.wifiScan.currentSSID;
              console.log("Auto-reselected current network after scan:", this.wifiScan.currentSSID);
            }
          }
          console.log("WiFi scan completed:", validNetworks.length, "valid networks found from", networks.length, "total scanned");
        } catch (error) {
          console.error("WiFi scan failed:", error);
          this.wifiScan.error = error.message;
          this.showErrorMessage(`WiFi scan failed: ${error.message}`);
        } finally {
          this.wifiScan.isScanning = false;
        }
      },
      // Update SSID based on current mode and selection
      updateSSID() {
        const selectedSSID = this.wifiScan.mode === "manual" ? this.wifiScan.manualSSID : this.wifiScan.selectedNetwork;
        this.config.device.wifi.ssid = selectedSSID || "";
        if (this.validation.errors["wifi.ssid"] && selectedSSID) {
          delete this.validation.errors["wifi.ssid"];
        }
      },
      // Validate current configuration
      validateConfiguration() {
        const errors = {};
        const selectedSSID = this.wifiScan.mode === "manual" ? this.wifiScan.manualSSID : this.wifiScan.selectedNetwork;
        if (!selectedSSID || selectedSSID.trim() === "") {
          if (this.wifiScan.mode === "scan") {
            errors["wifi.ssid"] = "Please select a network";
          } else {
            errors["wifi.ssid"] = "Network name cannot be empty";
          }
        }
        const timeoutSeconds = Math.floor(this.config.device.wifi.connect_timeout / 1e3);
        if (timeoutSeconds < 5 || timeoutSeconds > 60) {
          errors["wifi.connect_timeout"] = "Timeout must be between 5-60 seconds";
        }
        this.validation.errors = errors;
        return Object.keys(errors).length === 0;
      },
      // Check if configuration has meaningful changes
      hasChanges() {
        const selectedSSID = this.wifiScan.mode === "manual" ? this.wifiScan.manualSSID : this.wifiScan.selectedNetwork;
        const currentSSID = this.wifiScan.currentSSID;
        if (selectedSSID !== currentSSID) {
          return true;
        }
        if (this.passwordsModified.wifiPassword) {
          return true;
        }
        const currentTimeoutSeconds = Math.floor(this.config.device.wifi.connect_timeout / 1e3);
        return false;
      },
      // Save WiFi configuration via API
      async saveConfiguration() {
        this.updateSSID();
        if (!this.validateConfiguration()) {
          this.showErrorMessage("Please fix the errors before saving");
          return;
        }
        if (!this.hasChanges()) {
          this.showErrorMessage("No changes to save");
          return;
        }
        this.saving = true;
        try {
          const partialConfig = {
            device: {
              wifi: {
                ssid: this.config.device.wifi.ssid,
                connect_timeout: this.config.device.wifi.connect_timeout
              }
            }
          };
          if (this.passwordsModified.wifiPassword) {
            partialConfig.device.wifi.password = this.config.device.wifi.password;
          }
          console.log("Saving partial WiFi configuration:", partialConfig);
          const message = await window.SettingsAPI.saveConfiguration(partialConfig);
          console.log("Alpine WiFi Store: Configuration saved successfully");
          window.location.href = "/settings.html?saved=wifi";
        } catch (error) {
          console.error("Alpine WiFi Store: Failed to save configuration:", error);
          this.showErrorMessage("Failed to save WiFi settings: " + error.message);
          this.saving = false;
        }
      },
      // Cancel configuration changes
      cancelConfiguration() {
        window.location.href = "/settings.html";
      },
      // ================== SYSTEM/PRINTING API ==================
      // Print AP details to thermal printer
      async printAPDetails() {
        var _a, _b, _c, _d, _e, _f;
        try {
          this.apPrintStatus = "scribing";
          const fallbackSSID = (_c = (_b = (_a = this.config) == null ? void 0 : _a.device) == null ? void 0 : _b.wifi) == null ? void 0 : _c.fallback_ap_ssid;
          const fallbackPassword = (_f = (_e = (_d = this.config) == null ? void 0 : _d.device) == null ? void 0 : _e.wifi) == null ? void 0 : _f.fallback_ap_password;
          if (!fallbackSSID || !fallbackPassword) {
            throw new Error("WiFi fallback AP credentials not configured");
          }
          const printRequest = {
            content_type: "memo",
            content: {
              title: "WiFi Fallback AP",
              text: `Network: ${fallbackSSID}
Password: ${fallbackPassword}

Connect to this network if device WiFi fails.

Device will be available at:
http://192.168.4.1

This memo printed from Settings \u2192 WiFi`
            }
          };
          const content = `WiFi Fallback AP
                
Network: ${fallbackSSID}
Password: ${fallbackPassword}

Connect to this network if device WiFi fails.

Device will be available at:
http://192.168.4.1

This memo printed from Settings \u2192 WiFi`;
          await window.SettingsAPI.printLocalContent(content);
          console.log("AP details print request submitted successfully");
          setTimeout(() => {
            this.apPrintStatus = "normal";
          }, 2e3);
        } catch (error) {
          console.error("Failed to print AP details:", error);
          this.apPrintStatus = "normal";
          if (typeof window.showMessage === "function") {
            window.showMessage(`Failed to print AP details: ${error.message}`, "error");
          } else {
            alert(`Failed to print AP details: ${error.message}`);
          }
        }
      }
    };
    return store;
  }
  document.addEventListener("alpine:init", () => {
    if (window.wifiStoreInstance) {
      console.log("\u{1F4E1} WiFi Settings: Store already exists, skipping alpine:init");
      return;
    }
    const wifiStore = initializeWiFiSettingsStore();
    Alpine.store("settingsWifi", wifiStore);
    window.wifiStoreInstance = wifiStore;
    wifiStore.init();
    Alpine.effect(() => {
      const mode = wifiStore.wifiScan.mode;
      const selectedNetwork = wifiStore.wifiScan.selectedNetwork;
      const manualSSID = wifiStore.wifiScan.manualSSID;
      wifiStore.updateSSID();
    });
    console.log("\u2705 WiFi Settings Store registered and initialized");
  });
})();
