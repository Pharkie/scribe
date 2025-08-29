(() => {
  var __defProp = Object.defineProperty;
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

  // multi-entry:multi-entry:src/js/settings-api.js,src/js/page-settings-mqtt.js
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
  function initializeMqttSettingsStore() {
    const store = {
      // ================== UTILITY FUNCTIONS ==================
      showErrorMessage(message) {
        window.showMessage(message, "error");
      },
      // ================== STATE MANAGEMENT ==================
      loading: true,
      error: null,
      saving: false,
      initialized: false,
      // Original configuration for change detection
      originalConfig: null,
      // MQTT test connection state
      mqttTesting: false,
      mqttTestResult: null,
      // { success: boolean, message: string }
      mqttTestPassed: false,
      // Track if test passed for save validation
      // Track if MQTT password field has been modified by user
      mqttPasswordModified: false,
      originalMaskedPassword: "",
      // Store original masked value
      // Configuration data (reactive) - MQTT section only
      config: {
        mqtt: {
          enabled: false,
          server: null,
          port: null,
          username: null,
          password: null
        }
      },
      // ================== COMPUTED PROPERTIES ==================
      get canSave() {
        if (this.config.mqtt.enabled) {
          const hasServer = this.config.mqtt.server && this.config.mqtt.server.trim();
          const hasPort = this.config.mqtt.port && this.config.mqtt.port > 0;
          const testPassed = this.mqttTestPassed;
          return hasServer && hasPort && testPassed && this.hasChanges();
        }
        return this.hasChanges();
      },
      // ================== CHANGE DETECTION ==================
      hasChanges() {
        if (!this.originalConfig) return false;
        return this.config.mqtt.enabled !== this.originalConfig.mqtt.enabled || this.config.mqtt.server !== this.originalConfig.mqtt.server || this.config.mqtt.port !== this.originalConfig.mqtt.port || this.config.mqtt.username !== this.originalConfig.mqtt.username || this.mqttPasswordModified;
      },
      // ================== PASSWORD HANDLING ==================
      trackMqttPasswordChange(newValue) {
        const isMasked = newValue && newValue.includes("\u25CF");
        const hasChanged = newValue !== this.originalMaskedPassword;
        this.mqttPasswordModified = hasChanged && !isMasked;
        if (this.mqttPasswordModified) {
          this.resetMqttTestState();
        }
      },
      // ================== MQTT TEST FUNCTIONALITY ==================
      async testMqttConnection() {
        this.mqttTesting = true;
        this.mqttTestResult = null;
        try {
          const testData = {
            server: this.config.mqtt.server,
            port: this.config.mqtt.port,
            username: this.config.mqtt.username
          };
          if (this.mqttPasswordModified && this.config.mqtt.password) {
            testData.password = this.config.mqtt.password;
          }
          const response = await fetch("/api/test-mqtt", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(testData)
          });
          const result = await response.json();
          if (response.ok) {
            this.mqttTestResult = {
              success: true,
              message: result.message || "Successfully connected to MQTT broker"
            };
            this.mqttTestPassed = true;
          } else {
            this.mqttTestResult = {
              success: false,
              message: result.error || "Connection test failed"
            };
            this.mqttTestPassed = false;
          }
        } catch (error) {
          console.error("MQTT test error:", error);
          this.mqttTestResult = {
            success: false,
            message: "Network error during connection test"
          };
          this.mqttTestPassed = false;
        } finally {
          this.mqttTesting = false;
        }
      },
      // Reset MQTT test state when configuration changes
      resetMqttTestState() {
        this.mqttTestPassed = false;
        this.mqttTestResult = null;
      },
      // ================== API CALLS ==================
      async init() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
        if (this.initialized) {
          console.log("\u{1F4E1} MQTT Settings: Already initialized, skipping");
          return;
        }
        this.initialized = true;
        this.loading = true;
        try {
          const response = await fetch("/api/config");
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const data = await response.json();
          this.config.mqtt = {
            enabled: (_b = (_a = data.mqtt) == null ? void 0 : _a.enabled) != null ? _b : false,
            server: (_d = (_c = data.mqtt) == null ? void 0 : _c.server) != null ? _d : "",
            port: (_f = (_e = data.mqtt) == null ? void 0 : _e.port) != null ? _f : 1883,
            username: (_h = (_g = data.mqtt) == null ? void 0 : _g.username) != null ? _h : "",
            password: (_j = (_i = data.mqtt) == null ? void 0 : _i.password) != null ? _j : ""
          };
          this.originalConfig = {
            mqtt: __spreadValues({}, this.config.mqtt)
          };
          this.originalMaskedPassword = this.config.mqtt.password;
          console.log("\u2705 MQTT Settings: Configuration loaded successfully");
        } catch (error) {
          console.error("Error loading MQTT config:", error);
          this.error = `Failed to load configuration: ${error.message}`;
        } finally {
          this.loading = false;
        }
      },
      async saveConfig() {
        if (!this.canSave) return;
        try {
          this.saving = true;
          const configUpdate = {};
          if (this.hasChanges()) {
            configUpdate.mqtt = {
              enabled: this.config.mqtt.enabled,
              server: this.config.mqtt.server,
              port: this.config.mqtt.port,
              username: this.config.mqtt.username
            };
            if (this.mqttPasswordModified && this.config.mqtt.password) {
              configUpdate.mqtt.password = this.config.mqtt.password;
            }
          }
          const response = await fetch("/api/config", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(configUpdate)
          });
          const result = await response.json();
          if (response.ok) {
            window.showMessage("MQTT settings saved successfully!", "success");
            window.location.href = "/settings.html?saved=mqtt";
          } else {
            throw new Error(result.error || "Unknown error occurred");
          }
        } catch (error) {
          console.error("Error saving MQTT config:", error);
          this.showErrorMessage(`Failed to save MQTT settings: ${error.message}`);
        } finally {
          this.saving = false;
        }
      },
      // Cancel configuration changes
      cancelConfiguration() {
        window.location.href = "/settings.html";
      }
    };
    return store;
  }
  document.addEventListener("alpine:init", () => {
    if (window.mqttStoreInstance) {
      console.log("\u{1F4E1} MQTT Settings: Store already exists, skipping alpine:init");
      return;
    }
    const mqttStore = initializeMqttSettingsStore();
    Alpine.store("settingsMqtt", mqttStore);
    window.mqttStoreInstance = mqttStore;
    mqttStore.init();
    Alpine.effect(() => {
      var _a, _b, _c, _d, _e, _f, _g, _h;
      if (((_b = (_a = mqttStore.config) == null ? void 0 : _a.mqtt) == null ? void 0 : _b.server) || ((_d = (_c = mqttStore.config) == null ? void 0 : _c.mqtt) == null ? void 0 : _d.port) || ((_f = (_e = mqttStore.config) == null ? void 0 : _e.mqtt) == null ? void 0 : _f.username)) {
        if (mqttStore.originalConfig) {
          const hasServerChange = mqttStore.config.mqtt.server !== mqttStore.originalConfig.mqtt.server;
          const hasPortChange = mqttStore.config.mqtt.port !== mqttStore.originalConfig.mqtt.port;
          const hasUsernameChange = mqttStore.config.mqtt.username !== mqttStore.originalConfig.mqtt.username;
          if (hasServerChange || hasPortChange || hasUsernameChange) {
            mqttStore.resetMqttTestState();
          }
        }
      }
      if (((_h = (_g = mqttStore.config) == null ? void 0 : _g.mqtt) == null ? void 0 : _h.enabled) === false) {
        mqttStore.resetMqttTestState();
      }
    });
    console.log("\u2705 MQTT Settings Store registered and initialized");
  });
})();
