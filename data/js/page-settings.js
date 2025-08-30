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

  // multi-entry:multi-entry:src/js/settings-alpine-store.js,src/js/settings-api.js
  function initializeSettingsStore() {
    const store = {
      // ================== UTILITY FUNCTIONS ==================
      // Simple utility function extracted from repeated showMessage patterns
      // Step 2.2: Extract ONE HTTP utility pattern (internal function)
      showErrorMessage(message) {
        window.showMessage(message, "error");
      },
      // Core state management
      loading: true,
      error: null,
      saving: false,
      initialized: false,
      // Flag to prevent duplicate initialization
      apPrintStatus: "normal",
      // 'normal', 'scribing'
      // MQTT test connection state
      mqttTesting: false,
      mqttTestResult: null,
      // { success: boolean, message: string }
      mqttTestPassed: false,
      // Track if test passed for save validation
      // Track which password fields have been modified by user
      passwordsModified: {
        wifiPassword: false,
        mqttPassword: false,
        chatgptApiToken: false
      },
      // Store original masked values to detect changes
      originalMaskedValues: {
        wifiPassword: "",
        mqttPassword: "",
        chatgptApiToken: ""
      },
      // GPIO information from backend
      gpio: {
        availablePins: [],
        safePins: [],
        pinDescriptions: {}
      },
      // Configuration data (reactive) - matching backend API structure
      config: {
        device: {
          owner: null,
          // Will be set from backend
          timezone: null,
          // Will be set from backend
          maxCharacters: null,
          // Will be set from backend
          mqtt_topic: null,
          // Will be set from backend
          mdns: null,
          // Will be set from backend
          printerTxPin: null,
          // Will be set from backend
          // WiFi nested under device
          wifi: {
            ssid: null,
            // Will be set from backend
            password: null,
            // Will be set from backend
            connect_timeout: null,
            // Will be set from backend
            fallback_ap_ssid: null,
            // Will be set from backend
            fallback_ap_password: null,
            // Will be set from backend
            fallback_ap_mdns: null,
            // Will be set from backend
            fallback_ap_ip: null,
            // Will be set from backend
            status: {
              connected: null,
              // Will be set from backend
              ap_mode: null,
              // Will be set from backend
              ip_address: null,
              // Will be set from backend
              mac_address: null,
              // Will be set from backend
              gateway: null,
              // Will be set from backend
              dns: null,
              // Will be set from backend
              signal_strength: null
              // Will be set from backend
            }
          }
        },
        mqtt: {
          enabled: null,
          // Will be set from backend
          server: null,
          // Will be set from backend
          port: null,
          // Will be set from backend
          username: null,
          // Will be set from backend
          password: null,
          // Will be set from backend
          connected: null
          // Will be set from backend
        },
        unbiddenInk: {
          enabled: null,
          // Will be set from backend
          startHour: null,
          // Will be set from backend
          endHour: null,
          // Will be set from backend
          frequencyMinutes: null,
          // Will be set from backend
          prompt: null,
          // Will be set from backend
          chatgptApiToken: null,
          // Will be set from backend
          promptPresets: null
          // Will be set from backend
        },
        memos: {
          memo1: "",
          memo2: "",
          memo3: "",
          memo4: ""
        },
        buttons: {
          // Hardware configuration
          count: null,
          debounce_time: null,
          long_press_time: null,
          active_low: null,
          min_interval: null,
          max_per_minute: null,
          // Individual button configurations
          button1: {
            gpio: null,
            // Will be populated from API
            shortAction: null,
            // Will be set from backend
            longAction: null,
            // Will be set from backend
            shortMqttTopic: null,
            // Will be set from backend
            longMqttTopic: null,
            // Will be set from backend
            shortLedEffect: null,
            // Will be set from backend
            longLedEffect: null
            // Will be set from backend
          },
          button2: {
            gpio: null,
            // Will be populated from API
            shortAction: null,
            // Will be set from backend
            longAction: null,
            // Will be set from backend
            shortMqttTopic: null,
            // Will be set from backend
            longMqttTopic: null,
            // Will be set from backend
            shortLedEffect: null,
            // Will be set from backend
            longLedEffect: null
            // Will be set from backend
          },
          button3: {
            gpio: null,
            // Will be populated from API
            shortAction: null,
            // Will be set from backend
            longAction: null,
            // Will be set from backend
            shortMqttTopic: null,
            // Will be set from backend
            longMqttTopic: null,
            // Will be set from backend
            shortLedEffect: null,
            // Will be set from backend
            longLedEffect: null
            // Will be set from backend
          },
          button4: {
            gpio: null,
            // Will be populated from API
            shortAction: null,
            // Will be set from backend
            longAction: null,
            // Will be set from backend
            shortMqttTopic: null,
            // Will be set from backend
            longMqttTopic: null,
            // Will be set from backend
            shortLedEffect: null,
            // Will be set from backend
            longLedEffect: null
            // Will be set from backend
          }
        },
        leds: {
          pin: null,
          // Will be set from backend
          count: null,
          brightness: null,
          refreshRate: null
        }
      },
      // Form validation states
      validation: {
        errors: {},
        touched: {},
        isValid: true
      },
      // UI state management
      activeSection: "device",
      showValidationFeedback: false,
      // LED Effect Parameters (WLED-style unified interface)
      selectedEffect: "chase_single",
      testingEffect: false,
      effectParams: {
        speed: 50,
        intensity: 50,
        cycles: 3,
        colors: ["#0066FF", "#00FF00", "#FF0000"],
        // Array of colors
        custom1: 10,
        custom2: 5,
        custom3: 1
      },
      // Color preset swatches (6 vibrant colors)
      colorPresets: [
        "#FF0000",
        // Bright Red
        "#0066FF",
        // Electric Blue  
        "#00FF00",
        // Bright Green
        "#FFFF00",
        // Bright Yellow
        "#FF6600",
        // Orange
        "#9900FF"
        // Purple
      ],
      // Track whether each color is using preset or custom
      colorTypes: ["preset", "preset", "preset"],
      // WiFi network scanning state using Alpine reactive patterns
      wifiScan: {
        // Core state
        networks: [],
        currentSSID: null,
        selectedNetwork: null,
        isScanning: false,
        error: null,
        hasScanned: false,
        // Computed properties (Alpine getters)
        get dropdownDisabled() {
          return this.isScanning;
        },
        get showManualEntry() {
          return this.selectedNetwork === "manual";
        },
        get scanLabel() {
          return this.hasScanned ? "Rescan networks" : "Scan networks for more";
        },
        // Reactive options
        get options() {
          const options = [];
          const getNetworkSignalStrength = (ssid) => {
            const network = this.networks.find((n) => n.ssid === ssid);
            return network ? network.signal_strength : null;
          };
          if (this.currentSSID) {
            const currentSignalStrength = getNetworkSignalStrength(this.currentSSID);
            const currentLabel = currentSignalStrength ? `${this.currentSSID} (${currentSignalStrength}) \u2190 active` : `${this.currentSSID} \u2190 active`;
            options.push({
              value: this.currentSSID,
              label: currentLabel,
              disabled: false
            });
          }
          if (this.hasScanned) {
            const formatNetworkDisplay = (network) => {
              return `${network.ssid} (${network.signal_strength})`;
            };
            this.networks.filter((network) => network.ssid !== this.currentSSID).forEach((network) => {
              options.push({
                value: network.ssid,
                label: formatNetworkDisplay(network),
                disabled: false
              });
            });
          }
          options.push({
            value: "manual",
            label: "Type It Out (Manual entry)",
            disabled: false
          });
          if (this.isScanning) {
            options.push({
              value: "_scanning",
              label: "Scanning the airwaves...",
              disabled: true
            });
          } else {
            options.push({
              value: "_scan",
              label: `${this.scanLabel}`,
              disabled: false
            });
          }
          return options;
        }
      },
      // Computed property for section definitions (dynamic based on LED support)
      get sections() {
        var _a, _b;
        const baseSections = [
          { id: "device", name: "Device", icon: "cpuChip", color: "blue" },
          { id: "wifi", name: "WiFi", icon: "wifi", color: "green" },
          { id: "memos", name: "Memos", icon: "pencil", color: "pink" },
          { id: "mqtt", name: "MQTT", icon: "signal", color: "yellow" },
          { id: "unbidden", name: "Unbidden Ink", icon: "sparkles", color: "indigo" },
          { id: "buttons", name: "Buttons", icon: "arrowDownCircle", color: "teal" }
        ];
        if (((_b = (_a = this.config) == null ? void 0 : _a.leds) == null ? void 0 : _b.enabled) === true) {
          baseSections.push({ id: "leds", name: "LEDs", icon: "lightBulb", color: "purple" });
        }
        return baseSections;
      },
      // Computed properties for complex UI states
      get apPrintButtonText() {
        return this.apPrintStatus === "scribing" ? "Scribing" : "Scribe Wifi Fallback AP";
      },
      get timeRangeDisplay() {
        var _a, _b, _c, _d, _e, _f;
        const start = (_c = (_b = (_a = this.config) == null ? void 0 : _a.unbiddenInk) == null ? void 0 : _b.startHour) != null ? _c : 0;
        const end = (_f = (_e = (_d = this.config) == null ? void 0 : _d.unbiddenInk) == null ? void 0 : _e.endHour) != null ? _f : 24;
        if (start === 0 && (end === 0 || end === 24)) {
          return "All Day";
        }
        return `${this.formatHour(start)} - ${this.formatHour(end)}`;
      },
      get frequencyDisplay() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _i;
        const minutes = (_c = (_b = (_a = this.config) == null ? void 0 : _a.unbiddenInk) == null ? void 0 : _b.frequencyMinutes) != null ? _c : 120;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const start = (_f = (_e = (_d = this.config) == null ? void 0 : _d.unbiddenInk) == null ? void 0 : _e.startHour) != null ? _f : 0;
        const end = (_i = (_h = (_g = this.config) == null ? void 0 : _g.unbiddenInk) == null ? void 0 : _h.endHour) != null ? _i : 24;
        let timeText = "";
        if (start === 0 && (end === 0 || end === 24)) {
          timeText = "all day long";
        } else {
          const startAmPm = this.formatHour12(start);
          const endAmPm = this.formatHour12(end);
          timeText = `from ${startAmPm} to ${endAmPm}`;
        }
        if (hours > 0 && mins > 0) {
          return `Every ${hours}h ${mins}m ${timeText}`;
        } else if (hours > 0) {
          return `Every ${hours}h ${timeText}`;
        } else {
          return `Every ${mins}m ${timeText}`;
        }
      },
      get timeRangeStyle() {
        var _a, _b, _c, _d, _e, _f;
        const start = (_c = (_b = (_a = this.config) == null ? void 0 : _a.unbiddenInk) == null ? void 0 : _b.startHour) != null ? _c : 0;
        const end = (_f = (_e = (_d = this.config) == null ? void 0 : _d.unbiddenInk) == null ? void 0 : _e.endHour) != null ? _f : 24;
        if (start === 0 && (end === 0 || end === 24)) {
          return { left: "0%", width: "100%" };
        }
        const startPercent = start / 24 * 100;
        const endPercent = end / 24 * 100;
        return {
          left: `${Math.min(startPercent, endPercent)}%`,
          width: `${Math.abs(endPercent - startPercent)}%`
        };
      },
      // ================== DEVICE CONFIGURATION API ==================
      // Initialize store with data from server
      async init() {
        if (this.initialized) {
          console.log("\u2699\uFE0F Settings: Already initialized, skipping");
          return;
        }
        this.initialized = true;
        this.loading = true;
        try {
          const [serverConfig, memos] = await Promise.all([
            window.SettingsAPI.loadConfiguration(),
            window.SettingsAPI.loadMemos()
          ]);
          this.mergeConfig(serverConfig);
          this.loadMemos(memos);
          this.initializeWiFiState();
          this.setupPasswordWatchers();
          this.initEffectParams();
          console.log("Alpine Store: Configuration and memos loaded successfully");
        } catch (error) {
          console.error("Alpine Store: Failed to load configuration:", error);
          this.error = error.message;
        } finally {
          this.loading = false;
        }
      },
      // Load memos into reactive state
      loadMemos(memosData) {
        console.log("\u{1F527} Loading memos:", memosData);
        if (memosData) {
          this.config.memos.memo1 = memosData.memo1 || "";
          this.config.memos.memo2 = memosData.memo2 || "";
          this.config.memos.memo3 = memosData.memo3 || "";
          this.config.memos.memo4 = memosData.memo4 || "";
          console.log("\u2705 Memos loaded successfully");
        } else {
          console.warn("\u26A0\uFE0F No memos data provided");
        }
      },
      // Setup watchers for password field changes - implemented without $watch
      setupPasswordWatchers() {
        this.originalMaskedValues.wifiPassword = this.config.device.wifi.password || "";
        this.originalMaskedValues.mqttPassword = this.config.mqtt.password || "";
        this.originalMaskedValues.chatgptApiToken = this.config.unbiddenInk.chatgptApiToken || "";
      },
      // Methods to track password modifications (called from templates)
      trackWifiPasswordChange(newValue) {
        const isMasked = newValue && newValue.includes("\u25CF");
        const hasChanged = newValue !== this.originalMaskedValues.wifiPassword;
        this.passwordsModified.wifiPassword = hasChanged && !isMasked;
      },
      trackMqttPasswordChange(newValue) {
        const isMasked = newValue && newValue.includes("\u25CF");
        const hasChanged = newValue !== this.originalMaskedValues.mqttPassword;
        this.passwordsModified.mqttPassword = hasChanged && !isMasked;
      },
      trackChatgptTokenChange(newValue) {
        const isMasked = newValue && newValue.includes("\u25CF");
        const hasChanged = newValue !== this.originalMaskedValues.chatgptApiToken;
        this.passwordsModified.chatgptApiToken = hasChanged && !isMasked;
      },
      // Initialize WiFi state - simplified
      initializeWiFiState() {
        var _a, _b, _c;
        this.wifiScan.currentSSID = ((_c = (_b = (_a = this.config) == null ? void 0 : _a.device) == null ? void 0 : _b.wifi) == null ? void 0 : _c.ssid) || null;
        this.wifiScan.selectedNetwork = this.wifiScan.currentSSID;
        this.wifiScan.networks = [];
        this.wifiScan.isScanning = false;
        this.wifiScan.hasScanned = false;
        this.wifiScan.error = null;
      },
      // ================== WIFI API ==================
      // WiFi scanning - simplified with reactive updates
      async scanWiFiNetworks() {
        this.wifiScan.isScanning = true;
        this.wifiScan.error = null;
        try {
          const networks = await window.SettingsAPI.scanWiFiNetworks();
          const uniqueNetworks = [];
          const seenSSIDs = /* @__PURE__ */ new Set();
          networks.sort((a, b) => b.rssi - a.rssi).forEach((network) => {
            if (!seenSSIDs.has(network.ssid)) {
              seenSSIDs.add(network.ssid);
              uniqueNetworks.push(network);
            }
          });
          this.wifiScan.networks = uniqueNetworks;
          this.wifiScan.hasScanned = true;
          if (this.wifiScan.currentSSID) {
            const currentNetwork = uniqueNetworks.find((n) => n.ssid === this.wifiScan.currentSSID);
            if (currentNetwork) {
              this.wifiScan.selectedNetwork = this.wifiScan.currentSSID;
              console.log("Auto-reselected current network after scan:", this.wifiScan.currentSSID);
            }
          }
          console.log("WiFi scan completed:", uniqueNetworks.length, "unique networks found from", networks.length, "total scanned");
        } catch (error) {
          console.error("WiFi scan failed:", error);
          this.wifiScan.error = error.message;
          this.showErrorMessage(`WiFi scan failed: ${error.message}`);
        } finally {
          this.wifiScan.isScanning = false;
        }
      },
      // Handle network selection from dropdown - State machine transitions
      // Simplified network selection - let Alpine reactivity handle state
      selectNetwork(value) {
        if (value === "_scan") {
          this.scanWiFiNetworks();
          return;
        }
        if (value === "_scanning") {
          return;
        }
        this.wifiScan.selectedNetwork = value;
        if (value === "manual") {
          this.config.device.wifi.ssid = "";
        } else if (value && value !== "") {
          this.config.device.wifi.ssid = value;
        }
        if (this.validation.errors["wifi.ssid"]) {
          delete this.validation.errors["wifi.ssid"];
        }
      },
      // Get formatted network display string
      formatNetworkDisplay(network) {
        const securityIcon = network.secure ? getIcon("lockClosed") : getIcon("wifi");
        const signalIcon = this.getSignalIcon(network.signal_percent);
        return `${securityIcon} ${network.ssid} ${signalIcon} (${network.signal_percent}%)`;
      },
      // Get signal strength icon
      getSignalIcon(signalPercent) {
        if (signalPercent >= 75) return getIcon("signal", "scribe-icon text-red-500");
        if (signalPercent >= 50) return getIcon("signal", "scribe-icon text-yellow-500");
        if (signalPercent >= 25) return getIcon("signal", "scribe-icon text-green-500");
        return getIcon("signal", "scribe-icon text-gray-300");
      },
      // Create a clean config object without read-only fields for server submission
      createCleanConfig() {
        const cleanConfig = {
          device: {
            owner: this.config.device.owner,
            timezone: this.config.device.timezone,
            printerTxPin: this.config.device.printerTxPin,
            // Include WiFi nested under device
            wifi: {
              ssid: this.config.device.wifi.ssid,
              connect_timeout: this.config.device.wifi.connect_timeout
              // Only include password if it was modified by user
            }
            // Exclude mqtt_topic as it's read-only
          },
          mqtt: {
            enabled: this.config.mqtt.enabled,
            server: this.config.mqtt.server,
            port: this.config.mqtt.port,
            username: this.config.mqtt.username
            // Only include password if it was modified by user
          },
          unbiddenInk: {
            enabled: this.config.unbiddenInk.enabled,
            startHour: this.config.unbiddenInk.startHour,
            endHour: this.config.unbiddenInk.endHour,
            frequencyMinutes: this.config.unbiddenInk.frequencyMinutes,
            prompt: this.config.unbiddenInk.prompt
            // Only include chatgptApiToken if it was modified by user
          },
          buttons: {
            // Include individual button configurations
            button1: this.config.buttons.button1,
            button2: this.config.buttons.button2,
            button3: this.config.buttons.button3,
            button4: this.config.buttons.button4
            // Exclude hardware config as it's read-only
          },
          leds: {
            pin: this.config.leds.pin,
            count: this.config.leds.count,
            brightness: this.config.leds.brightness,
            refreshRate: this.config.leds.refreshRate
          }
        };
        if (this.passwordsModified.wifiPassword) {
          cleanConfig.device.wifi.password = this.config.device.wifi.password;
          console.log("Including modified WiFi password in config submission");
        }
        if (this.passwordsModified.mqttPassword) {
          cleanConfig.mqtt.password = this.config.mqtt.password;
          console.log("Including modified MQTT password in config submission");
        }
        if (this.passwordsModified.chatgptApiToken) {
          cleanConfig.unbiddenInk.chatgptApiToken = this.config.unbiddenInk.chatgptApiToken;
          console.log("Including modified ChatGPT API token in config submission");
        }
        console.log("Alpine Store: Created clean config for server:", cleanConfig);
        console.log("Password modification status:", this.passwordsModified);
        return cleanConfig;
      },
      // Create a clean memos object for server submission
      createCleanMemos() {
        const cleanMemos = {
          memo1: this.config.memos.memo1,
          memo2: this.config.memos.memo2,
          memo3: this.config.memos.memo3,
          memo4: this.config.memos.memo4
        };
        console.log("Alpine Store: Created clean memos for server:", cleanMemos);
        return cleanMemos;
      },
      // Save configuration to server
      // Save configuration and memos via API
      async saveConfiguration() {
        if (this.config.mqtt.enabled && !this.mqttTestPassed) {
          window.showMessage("Please test MQTT connection before saving", "error");
          return false;
        }
        if (!this.validateForm()) {
          this.showValidationFeedback = true;
          const errorFields = Object.keys(this.validation.errors);
          if (errorFields.length > 0) {
            const firstError = this.validation.errors[errorFields[0]];
            window.showMessage(`Validation error: ${firstError}`, "error");
          } else {
            window.showMessage("Please check all required fields before saving", "error");
          }
          return;
        }
        this.saving = true;
        try {
          const cleanConfig = this.createCleanConfig();
          const cleanMemos = this.createCleanMemos();
          console.log("Saving configuration first...");
          const configMessage = await window.SettingsAPI.saveConfiguration(cleanConfig);
          console.log("Configuration saved, now saving memos...");
          const memosMessage = await window.SettingsAPI.saveMemos(cleanMemos);
          this.showValidationFeedback = false;
          console.log("Alpine Store: Configuration and memos saved successfully");
          window.location.href = "/?settings=stashed";
        } catch (error) {
          console.error("Alpine Store: Failed to save configuration:", error);
          window.showMessage("Failed to save configuration: " + error.message, "error");
          this.saving = false;
        }
      },
      // Cancel configuration changes and return to index
      cancelConfiguration() {
        window.location.href = "/";
      },
      // ================== SYSTEM/PRINTING API ==================
      // Print AP details to thermal printer
      async printAPDetails() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
        try {
          this.apPrintStatus = "scribing";
          const fallbackSSID = (_c = (_b = (_a = this.config) == null ? void 0 : _a.device) == null ? void 0 : _b.wifi) == null ? void 0 : _c.fallback_ap_ssid;
          const fallbackPassword = (_f = (_e = (_d = this.config) == null ? void 0 : _d.device) == null ? void 0 : _e.wifi) == null ? void 0 : _f.fallback_ap_password;
          const fallbackMDNS = (_i = (_h = (_g = this.config) == null ? void 0 : _g.device) == null ? void 0 : _h.wifi) == null ? void 0 : _i.fallback_ap_mdns;
          const fallbackIP = (_l = (_k = (_j = this.config) == null ? void 0 : _j.device) == null ? void 0 : _k.wifi) == null ? void 0 : _l.fallback_ap_ip;
          if (!fallbackSSID || !fallbackPassword) {
            throw new Error("Fallback AP credentials not available from backend");
          }
          let urlLine = "";
          if (fallbackIP) {
            urlLine = `http://${fallbackIP}`;
          } else {
            throw new Error("No AP access URL available from backend");
          }
          const apDetails = `Scribe Evolution Setup (Fallback) Network
================================

Network: ${fallbackSSID}
Password: ${fallbackPassword}

If WiFi connection fails, connect to the above network, then visit:

${urlLine}`;
          await window.SettingsAPI.printLocalContent(apDetails);
          setTimeout(() => {
            this.apPrintStatus = "normal";
          }, 2e3);
        } catch (error) {
          console.error("Failed to print AP details:", error);
          this.apPrintStatus = "normal";
          if (typeof window.showMessage === "function") {
            window.showMessage(`Failed to print AP details: ${error.message}`, "error");
          } else {
            console.error("\u274C Failed to print AP details:", error.message);
            alert(`Failed to print AP details: ${error.message}`);
          }
        }
      },
      // Helper methods
      formatHour(hour) {
        if (hour === 0) return "00:00";
        if (hour === 24) return "24:00";
        return hour.toString().padStart(2, "0") + ":00";
      },
      formatHour12(hour) {
        if (hour === 0 || hour === 24) return "12 am";
        if (hour === 12) return "12 pm";
        if (hour < 12) return `${hour} am`;
        return `${hour - 12} pm`;
      },
      // Deep merge server config into reactive state with error logging
      mergeConfig(serverConfig) {
        var _a;
        console.log("\u{1F527} Merging server config:", serverConfig);
        if (serverConfig.gpio) {
          this.gpio.availablePins = serverConfig.gpio.availablePins || [];
          this.gpio.safePins = serverConfig.gpio.safePins || [];
          this.gpio.pinDescriptions = serverConfig.gpio.pinDescriptions || {};
          console.log("\u{1F50C} GPIO info loaded:", this.gpio.availablePins.length, "pins available");
          console.log("\u{1F50C} Available pins:", this.gpio.availablePins);
          console.log("\u{1F50C} Safe pins:", this.gpio.safePins);
        } else {
          console.warn("\u26A0\uFE0F Missing GPIO section in config");
        }
        if (serverConfig.device) {
          this.config.device.owner = serverConfig.device.owner;
          this.config.device.timezone = serverConfig.device.timezone;
          this.config.device.mqtt_topic = serverConfig.device.mqtt_topic;
          this.config.device.mdns = serverConfig.device.mdns;
          this.config.device.maxCharacters = serverConfig.device.maxCharacters;
          this.config.device.printerTxPin = serverConfig.device.printerTxPin;
          if (!serverConfig.device.owner) {
            console.warn("\u26A0\uFE0F Missing device.owner in config");
          }
          if (!serverConfig.device.timezone) {
            console.warn("\u26A0\uFE0F Missing device.timezone in config");
          }
        } else {
          console.error("\u274C Missing device section in config");
        }
        if ((_a = serverConfig.device) == null ? void 0 : _a.wifi) {
          this.config.device.wifi.ssid = serverConfig.device.wifi.ssid || "";
          this.config.device.wifi.password = serverConfig.device.wifi.password || "";
          this.config.device.wifi.connect_timeout = serverConfig.device.wifi.connect_timeout;
          this.originalMaskedValues.wifiPassword = serverConfig.device.wifi.password || "";
          this.config.device.wifi.fallback_ap_ssid = serverConfig.device.wifi.fallback_ap_ssid || "";
          this.config.device.wifi.fallback_ap_password = serverConfig.device.wifi.fallback_ap_password || "";
          this.config.device.wifi.fallback_ap_mdns = serverConfig.device.wifi.fallback_ap_mdns || "";
          this.config.device.wifi.fallback_ap_ip = serverConfig.device.wifi.fallback_ap_ip || "";
          if (!serverConfig.device.wifi.ssid) {
            console.warn("\u26A0\uFE0F Missing device.wifi.ssid in config");
          }
          if (serverConfig.device.wifi.status) {
            this.config.device.wifi.status.connected = serverConfig.device.wifi.status.connected || false;
            this.config.device.wifi.status.ap_mode = serverConfig.device.wifi.status.ap_mode || false;
            this.config.device.wifi.status.ip_address = serverConfig.device.wifi.status.ip_address || "";
            this.config.device.wifi.status.mac_address = serverConfig.device.wifi.status.mac_address || "";
            this.config.device.wifi.status.gateway = serverConfig.device.wifi.status.gateway || "";
            this.config.device.wifi.status.dns = serverConfig.device.wifi.status.dns || "";
            this.config.device.wifi.status.signal_strength = serverConfig.device.wifi.status.signal_strength || "";
          } else {
            console.warn("\u26A0\uFE0F Missing device.wifi.status in config");
          }
        } else {
          console.error("\u274C Missing device.wifi section in config");
        }
        if (serverConfig.mqtt) {
          this.config.mqtt.server = serverConfig.mqtt.server || "";
          this.config.mqtt.port = serverConfig.mqtt.port;
          this.config.mqtt.username = serverConfig.mqtt.username || "";
          this.config.mqtt.password = serverConfig.mqtt.password || "";
          this.config.mqtt.connected = serverConfig.mqtt.connected || false;
          this.originalMaskedValues.mqttPassword = serverConfig.mqtt.password || "";
          if (!serverConfig.mqtt.server) {
            console.warn("\u26A0\uFE0F Missing mqtt.server in config");
          }
        } else {
          console.warn("\u26A0\uFE0F Missing mqtt section in config");
        }
        if (serverConfig.unbiddenInk) {
          this.config.unbiddenInk.enabled = serverConfig.unbiddenInk.enabled || false;
          this.config.unbiddenInk.startHour = serverConfig.unbiddenInk.startHour;
          this.config.unbiddenInk.endHour = serverConfig.unbiddenInk.endHour;
          this.config.unbiddenInk.frequencyMinutes = serverConfig.unbiddenInk.frequencyMinutes;
          this.config.unbiddenInk.prompt = serverConfig.unbiddenInk.prompt || "";
          this.config.unbiddenInk.chatgptApiToken = serverConfig.unbiddenInk.chatgptApiToken || "";
          this.config.unbiddenInk.promptPresets = serverConfig.unbiddenInk.promptPresets || {};
          this.originalMaskedValues.chatgptApiToken = serverConfig.unbiddenInk.chatgptApiToken || "";
          console.log("\u{1F3AD} Unbidden Ink prompts loaded:", Object.keys(this.config.unbiddenInk.promptPresets).length, "presets");
        } else {
          console.warn("\u26A0\uFE0F Missing unbiddenInk section in config");
        }
        if (serverConfig.buttons) {
          this.config.buttons.count = serverConfig.buttons.count || null;
          this.config.buttons.debounce_time = serverConfig.buttons.debounce_time || null;
          this.config.buttons.long_press_time = serverConfig.buttons.long_press_time || null;
          this.config.buttons.active_low = serverConfig.buttons.active_low || null;
          this.config.buttons.min_interval = serverConfig.buttons.min_interval || null;
          this.config.buttons.max_per_minute = serverConfig.buttons.max_per_minute || null;
          for (let i = 1; i <= 4; i++) {
            const buttonKey = `button${i}`;
            if (serverConfig.buttons[buttonKey]) {
              this.config.buttons[buttonKey] = {
                gpio: serverConfig.buttons[buttonKey].gpio || null,
                shortAction: serverConfig.buttons[buttonKey].shortAction || "",
                longAction: serverConfig.buttons[buttonKey].longAction || "",
                shortMqttTopic: serverConfig.buttons[buttonKey].shortMqttTopic || "",
                longMqttTopic: serverConfig.buttons[buttonKey].longMqttTopic || "",
                shortLedEffect: serverConfig.buttons[buttonKey].shortLedEffect || "chase_single",
                longLedEffect: serverConfig.buttons[buttonKey].longLedEffect || "chase_single"
              };
            } else {
              console.warn(`\u26A0\uFE0F Missing buttons.${buttonKey} config`);
            }
          }
        } else {
          console.warn("\u26A0\uFE0F Missing buttons section in config");
        }
        if (serverConfig.leds) {
          this.config.leds.enabled = serverConfig.leds.enabled;
          this.config.leds.pin = Number(serverConfig.leds.pin);
          this.config.leds.count = serverConfig.leds.count;
          this.config.leds.brightness = serverConfig.leds.brightness;
          this.config.leds.refreshRate = serverConfig.leds.refreshRate;
          this.config.leds.effectDefaults = serverConfig.leds.effectDefaults;
          if (!this.config.leds.pin || this.config.leds.pin === 0) {
            console.error("\u274C Invalid LED pin from backend:", serverConfig.leds.pin);
          }
          if (!this.config.leds.count) {
            console.error("\u274C Missing LED count from backend");
          }
          if (this.config.leds.brightness === void 0 || this.config.leds.brightness === null) {
            console.error("\u274C Missing LED brightness from backend");
          }
          if (!this.config.leds.refreshRate) {
            console.error("\u274C Missing LED refresh rate from backend");
          }
        } else {
          console.warn("\u26A0\uFE0F Missing leds section in config");
        }
        console.log("\u2705 Config merge complete, final config:", this.config);
      },
      // Message display (delegates to existing system)
      // Form validation
      validateField(fieldName, value) {
        this.validation.touched[fieldName] = true;
        if (this.validation.errors[fieldName]) {
          delete this.validation.errors[fieldName];
        }
        const requiredFields = ["device.owner", "device.wifi.ssid"];
        if (this.config.unbiddenInk.enabled) {
          requiredFields.push("unbiddenInk.chatgptApiToken");
        }
        if (requiredFields.includes(fieldName)) {
          if (!value || typeof value === "string" && value.trim() === "") {
            this.validation.errors[fieldName] = "This field is required";
            this.validation.isValid = false;
            console.log(`Required field validation failed for ${fieldName}:`, value);
            return false;
          }
        }
        switch (fieldName) {
          case "device.wifi.connect_timeout":
            const timeout = typeof value === "number" ? Math.floor(value / 1e3) : parseInt(value);
            if (isNaN(timeout) || timeout < 5 || timeout > 60) {
              this.validation.errors[fieldName] = "Timeout must be between 5 and 60 seconds";
              this.validation.isValid = false;
              return false;
            }
            break;
          case "mqtt.port":
            const port = parseInt(value);
            if (isNaN(port) || port < 1 || port > 65535) {
              this.validation.errors[fieldName] = "Port must be between 1 and 65535";
              this.validation.isValid = false;
              return false;
            }
            break;
        }
        return true;
      },
      // Validate all fields
      validateForm() {
        this.validation.errors = {};
        this.validation.isValid = true;
        const fieldsToValidate = [
          "device.owner",
          "device.wifi.ssid",
          "device.wifi.connect_timeout",
          "mqtt.port"
        ];
        if (this.config.unbiddenInk.enabled) {
          fieldsToValidate.push("unbiddenInk.chatgptApiToken");
        }
        fieldsToValidate.forEach((fieldName) => {
          const value = this.getNestedValue(fieldName);
          console.log(`Validating ${fieldName}:`, value);
          this.validateField(fieldName, value);
        });
        if (!this.canSaveAllMemos) {
          const overLimitMemos = [1, 2, 3, 4].filter((memoNum) => !this.canSaveMemo(memoNum));
          this.validation.errors["memos"] = `Memo ${overLimitMemos.join(", ")} ${overLimitMemos.length === 1 ? "is" : "are"} over the character limit`;
          this.validation.isValid = false;
        }
        console.log("Validation errors:", this.validation.errors);
        console.log("Form is valid:", this.validation.isValid);
        return this.validation.isValid;
      },
      // Helper to get nested object values
      getNestedValue(fieldName) {
        return fieldName.split(".").reduce((obj, key) => obj && obj[key], this.config);
      },
      // Memo character counting functions - Alpine reactive getters
      getMemoCharacterCount(memoNum) {
        var _a;
        const memoKey = `memo${memoNum}`;
        return ((_a = this.config.memos[memoKey]) == null ? void 0 : _a.length) || 0;
      },
      getMemoCharacterText(memoNum) {
        const count = this.getMemoCharacterCount(memoNum);
        const limit = 500;
        if (count > limit) {
          const over = count - limit;
          return `${count}/${limit} (${over} over limit)`;
        }
        return `${count}/${limit}`;
      },
      getMemoCharacterClass(memoNum) {
        const count = this.getMemoCharacterCount(memoNum);
        const limit = 500;
        const percentage = count / limit;
        if (count > limit) {
          return "text-red-600 dark:text-red-400 font-semibold";
        } else if (percentage >= 0.9) {
          return "text-yellow-700 dark:text-yellow-300 font-medium";
        } else {
          return "text-gray-500 dark:text-gray-400";
        }
      },
      // Reactive getters for individual memos to trigger Alpine reactivity
      get memo1CharacterCount() {
        var _a;
        return ((_a = this.config.memos.memo1) == null ? void 0 : _a.length) || 0;
      },
      get memo1CharacterText() {
        const count = this.memo1CharacterCount;
        const limit = 500;
        if (count > limit) {
          const over = count - limit;
          return `${count}/${limit} (${over} over limit)`;
        }
        return `${count}/${limit}`;
      },
      get memo1CharacterClass() {
        const count = this.memo1CharacterCount;
        const limit = 500;
        const percentage = count / limit;
        if (count > limit) {
          return "text-red-600 dark:text-red-400 font-semibold";
        } else if (percentage >= 0.9) {
          return "text-yellow-700 dark:text-yellow-300 font-medium";
        } else {
          return "text-gray-500 dark:text-gray-400";
        }
      },
      get memo2CharacterCount() {
        var _a;
        return ((_a = this.config.memos.memo2) == null ? void 0 : _a.length) || 0;
      },
      get memo2CharacterText() {
        const count = this.memo2CharacterCount;
        const limit = 500;
        if (count > limit) {
          const over = count - limit;
          return `${count}/${limit} (${over} over limit)`;
        }
        return `${count}/${limit}`;
      },
      get memo2CharacterClass() {
        const count = this.memo2CharacterCount;
        const limit = 500;
        const percentage = count / limit;
        if (count > limit) {
          return "text-red-600 dark:text-red-400 font-semibold";
        } else if (percentage >= 0.9) {
          return "text-yellow-700 dark:text-yellow-300 font-medium";
        } else {
          return "text-gray-500 dark:text-gray-400";
        }
      },
      get memo3CharacterCount() {
        var _a;
        return ((_a = this.config.memos.memo3) == null ? void 0 : _a.length) || 0;
      },
      get memo3CharacterText() {
        const count = this.memo3CharacterCount;
        const limit = 500;
        if (count > limit) {
          const over = count - limit;
          return `${count}/${limit} (${over} over limit)`;
        }
        return `${count}/${limit}`;
      },
      get memo3CharacterClass() {
        const count = this.memo3CharacterCount;
        const limit = 500;
        const percentage = count / limit;
        if (count > limit) {
          return "text-red-600 dark:text-red-400 font-semibold";
        } else if (percentage >= 0.9) {
          return "text-yellow-700 dark:text-yellow-300 font-medium";
        } else {
          return "text-gray-500 dark:text-gray-400";
        }
      },
      get memo4CharacterCount() {
        var _a;
        return ((_a = this.config.memos.memo4) == null ? void 0 : _a.length) || 0;
      },
      get memo4CharacterText() {
        const count = this.memo4CharacterCount;
        const limit = 500;
        if (count > limit) {
          const over = count - limit;
          return `${count}/${limit} (${over} over limit)`;
        }
        return `${count}/${limit}`;
      },
      get memo4CharacterClass() {
        const count = this.memo4CharacterCount;
        const limit = 500;
        const percentage = count / limit;
        if (count > limit) {
          return "text-red-600 dark:text-red-400 font-semibold";
        } else if (percentage >= 0.9) {
          return "text-yellow-700 dark:text-yellow-300 font-medium";
        } else {
          return "text-gray-500 dark:text-gray-400";
        }
      },
      canSaveMemo(memoNum) {
        const count = this.getMemoCharacterCount(memoNum);
        const limit = 500;
        return count <= limit;
      },
      get canSaveAllMemos() {
        return [1, 2, 3, 4].every((memoNum) => this.canSaveMemo(memoNum));
      },
      // Check if form can be saved (all required fields filled)
      get canSaveForm() {
        var _a, _b, _c, _d, _e, _f, _g;
        const requiredFields = [
          (_b = (_a = this.config) == null ? void 0 : _a.device) == null ? void 0 : _b.owner,
          (_e = (_d = (_c = this.config) == null ? void 0 : _c.device) == null ? void 0 : _d.wifi) == null ? void 0 : _e.ssid
        ];
        const hasRequiredFields = requiredFields.every(
          (field) => field && typeof field === "string" && field.trim().length > 0
        );
        const memosValid = this.canSaveAllMemos;
        const mqttValid = !((_g = (_f = this.config) == null ? void 0 : _f.mqtt) == null ? void 0 : _g.enabled) || this.mqttTestPassed;
        return hasRequiredFields && memosValid && mqttValid;
      },
      // Get all currently used GPIO pins for conflict detection
      get usedGpioPins() {
        var _a, _b, _c;
        const used = /* @__PURE__ */ new Set();
        if (this.config.device.printerTxPin !== null && this.config.device.printerTxPin !== -1) {
          used.add(Number(this.config.device.printerTxPin));
        }
        if (((_a = this.config.leds) == null ? void 0 : _a.pin) !== null && ((_b = this.config.leds) == null ? void 0 : _b.pin) !== -1) {
          used.add(Number(this.config.leds.pin));
        }
        for (let i = 1; i <= 4; i++) {
          const buttonGpio = (_c = this.config.buttons[`button${i}`]) == null ? void 0 : _c.gpio;
          if (buttonGpio !== null && buttonGpio !== -1) {
            used.add(Number(buttonGpio));
          }
        }
        return used;
      },
      // Get GPIO pin options with conflict detection and safety information
      get gpioOptions() {
        return this.gpio.availablePins.map((pin) => {
          const pinNumber = Number(pin);
          const isSafe = this.gpio.safePins.includes(pin);
          const description = this.gpio.pinDescriptions[pin] || "Unknown";
          const isUsed = this.usedGpioPins.has(pinNumber);
          return {
            pin: pinNumber,
            description,
            // "Not connected" (-1) is always available, others check safety and usage
            available: pinNumber === -1 ? true : isSafe && !isUsed,
            isSafe,
            inUse: isUsed
          };
        });
      },
      // GPIO options specifically for printer TX (excludes "Not connected" option)
      get printerGpioOptions() {
        return this.gpio.availablePins.filter((pin) => Number(pin) !== -1).map((pin) => {
          const pinNumber = Number(pin);
          const isSafe = this.gpio.safePins.includes(pin);
          const description = this.gpio.pinDescriptions[pin] || "Unknown";
          const isUsed = this.usedGpioPins.has(pinNumber);
          return {
            pin: pinNumber,
            description,
            available: isSafe && !isUsed,
            isSafe,
            inUse: isUsed
          };
        });
      },
      // Combined GPIO options that handles loading state properly for Alpine reactivity
      get allGpioOptions() {
        if (this.loading || this.gpio.availablePins.length === 0) {
          return [{
            pin: null,
            description: "Loading GPIO options...",
            available: false,
            isSafe: false,
            inUse: false
          }];
        }
        return this.gpioOptions;
      },
      // ================== LED API ==================
      // LED effect functions (WLED-style unified interface)
      async testLedEffect(effectName) {
        if (this.testingEffect) return;
        this.testingEffect = true;
        try {
          let colors = [];
          if (effectName === "chase_multi") {
            colors = [
              this.effectParams.colors[0],
              this.effectParams.colors[1],
              this.effectParams.colors[2]
            ];
          } else {
            colors = [this.effectParams.colors[0]];
          }
          let effectParams = {
            effect: effectName,
            cycles: parseInt(this.effectParams.cycles),
            // Ensure it's a number
            speed: this.effectParams.speed,
            intensity: this.effectParams.intensity,
            colors
          };
          console.log("LED Effect Payload:", effectParams);
          console.log("Cycles value:", this.effectParams.cycles, typeof this.effectParams.cycles);
          const result = await window.SettingsAPI.triggerLedEffect(effectParams);
          if (!result || !result.message && !result.effect) {
            throw new Error("LED effect failed - unexpected response format");
          }
        } catch (error) {
          console.error("LED effect test failed:", error);
          window.showMessage(`Failed to test LED effect: ${error.message}`, "error");
        } finally {
          this.testingEffect = false;
        }
      },
      // No custom sliders - all parameters now use standardized speed/intensity
      getCustomSlider1Label() {
        return null;
      },
      getCustomSlider1Range() {
        return { min: 1, max: 100, step: 1 };
      },
      getCustomSlider2Label() {
        return null;
      },
      getCustomSlider2Range() {
        return { min: 1, max: 100, step: 1 };
      },
      getCustomSlider3Label() {
        return null;
      },
      getCustomSlider3Range() {
        return { min: 1, max: 100, step: 1 };
      },
      // Initialize effect parameters based on selected effect using backend defaults
      initEffectParams() {
        var _a, _b, _c, _d, _e;
        const ledDefaults = (_b = (_a = this.config) == null ? void 0 : _a.leds) == null ? void 0 : _b.effectDefaults;
        if (!ledDefaults) {
          console.error("\u274C LED effect defaults missing from backend /api/config");
          this.effectParams = {
            speed: 50,
            intensity: 50,
            cycles: 3,
            colors: ["#ff0000", "#00ff00", "#0000ff"]
          };
          return;
        }
        const effectDefaults = ledDefaults[this.selectedEffect];
        if (!effectDefaults) {
          console.error(`\u274C LED effect defaults for '${this.selectedEffect}' missing from backend`);
          this.effectParams = {
            speed: ((_c = ledDefaults.universal) == null ? void 0 : _c.speed) || 50,
            intensity: ((_d = ledDefaults.universal) == null ? void 0 : _d.intensity) || 50,
            cycles: ((_e = ledDefaults.universal) == null ? void 0 : _e.cycles) || 3,
            colors: ["#ff0000", "#00ff00", "#0000ff"]
          };
          return;
        }
        this.effectParams = {
          speed: effectDefaults.speed || 50,
          intensity: effectDefaults.intensity || 50,
          cycles: effectDefaults.cycles || 3,
          colors: effectDefaults.colors || ["#ff0000"]
        };
        console.log(`\u2705 LED effect '${this.selectedEffect}' defaults loaded from backend:`, this.effectParams);
      },
      // Get parameter descriptions for individual sliders
      getSpeedDescription() {
        const descriptions = {
          "chase_single": "Controls movement rate",
          "rainbow": "Controls wave movement",
          "twinkle": "Controls twinkle rate",
          "chase_multi": "Controls movement",
          "pulse": "Controls pulse rate",
          "matrix": "Controls falling rate"
        };
        return descriptions[this.selectedEffect] || "Controls effect speed";
      },
      getIntensityDescription() {
        const descriptions = {
          "chase_single": "Controls trail length",
          "rainbow": "Controls wave length/density",
          "twinkle": "Controls number of active twinkles",
          "chase_multi": "Controls trail length",
          "pulse": "Controls brightness variation",
          "matrix": "Controls number of drops"
        };
        return descriptions[this.selectedEffect] || "Controls effect intensity";
      },
      getCyclesDescription() {
        return "Number of times to repeat the effect";
      },
      // Turn off all LEDs via API
      async turnOffLeds() {
        try {
          const result = await window.SettingsAPI.turnOffLeds();
          if (!result.success) {
            throw new Error(result.message || "Failed to turn off LEDs");
          }
        } catch (error) {
          console.error("Turn off LEDs failed:", error);
          window.showMessage(`Failed to turn off LEDs: ${error.message}`, "error");
        }
      },
      // Section management methods
      showSection(sectionId) {
        this.activeSection = sectionId;
      },
      getSectionClass(sectionId) {
        const section = this.sections.find((s) => s.id === sectionId);
        const baseClass = "section-nav-btn";
        const colorClass = `section-nav-btn-${(section == null ? void 0 : section.color) || "purple"}`;
        const activeClass = this.activeSection === sectionId ? "active" : "";
        return `${baseClass} ${colorClass} ${activeClass}`.trim();
      },
      // Quick prompt presets - now using backend data
      setQuickPrompt(type) {
        const presets = this.config.unbiddenInk.promptPresets || {};
        if (presets[type]) {
          this.config.unbiddenInk.prompt = presets[type];
        }
      },
      isPromptActive(type) {
        const presets = this.config.unbiddenInk.promptPresets || {};
        const currentPrompt = this.config.unbiddenInk.prompt || "";
        return currentPrompt.trim() === (presets[type] || "").trim();
      },
      // Frequency slider specific values
      get frequencyOptions() {
        return [15, 30, 60, 120, 240, 360, 480];
      },
      get frequencyLabels() {
        return this.frequencyOptions.map((minutes) => {
          if (minutes < 60) {
            return `${minutes}min`;
          } else {
            const hours = minutes / 60;
            return `${hours}hr`;
          }
        });
      },
      get frequencySliderValue() {
        var _a, _b, _c;
        const options = this.frequencyOptions;
        const current = (_c = (_b = (_a = this.config) == null ? void 0 : _a.unbiddenInk) == null ? void 0 : _b.frequencyMinutes) != null ? _c : 120;
        const index = options.indexOf(current);
        return index >= 0 ? index : 3;
      },
      set frequencySliderValue(index) {
        this.config.unbiddenInk.frequencyMinutes = this.frequencyOptions[index] || 120;
      },
      // Alpine-native collision detection via computed properties
      get startHourSafe() {
        var _a, _b, _c;
        return (_c = (_b = (_a = this.config) == null ? void 0 : _a.unbiddenInk) == null ? void 0 : _b.startHour) != null ? _c : 8;
      },
      set startHourSafe(value) {
        this.config.unbiddenInk.startHour = Math.max(0, Math.min(24, parseInt(value)));
      },
      get endHourSafe() {
        var _a, _b, _c;
        return (_c = (_b = (_a = this.config) == null ? void 0 : _a.unbiddenInk) == null ? void 0 : _b.endHour) != null ? _c : 22;
      },
      set endHourSafe(value) {
        this.config.unbiddenInk.endHour = Math.max(0, Math.min(24, parseInt(value)));
      },
      // Handle collision-aware start hour changes
      handleStartHourChange(event) {
        const newValue = parseInt(event.target.value);
        const currentEnd = this.config.unbiddenInk.endHour;
        if (newValue >= currentEnd) {
          event.target.value = this.config.unbiddenInk.startHour;
          return;
        }
        this.config.unbiddenInk.startHour = newValue;
      },
      // Handle collision-aware end hour changes  
      handleEndHourChange(event) {
        const newValue = parseInt(event.target.value);
        const currentStart = this.config.unbiddenInk.startHour;
        if (newValue <= currentStart) {
          event.target.value = this.config.unbiddenInk.endHour;
          return;
        }
        this.config.unbiddenInk.endHour = newValue;
      },
      // Time range display helper
      get timeRangeDisplay() {
        var _a, _b, _c, _d, _e, _f;
        const start = (_c = (_b = (_a = this.config) == null ? void 0 : _a.unbiddenInk) == null ? void 0 : _b.startHour) != null ? _c : 0;
        const end = (_f = (_e = (_d = this.config) == null ? void 0 : _d.unbiddenInk) == null ? void 0 : _e.endHour) != null ? _f : 24;
        if (start === 0 && (end === 0 || end === 24)) {
          return "All Day";
        }
        return `${this.formatHour(start)} - ${this.formatHour(end)}`;
      },
      // Cancel configuration changes
      cancelConfiguration() {
        window.location.href = "/";
      },
      // Handle color selection from swatches or custom picker
      selectColor(colorIndex, colorValue, type) {
        console.log(`\u{1F3A8} Selected color ${colorIndex}: ${colorValue} (${type})`);
        this.effectParams.colors[colorIndex] = colorValue;
        this.colorTypes[colorIndex] = type;
        if (type === "custom") {
          console.log(`\u{1F3A8} Custom color selected for index ${colorIndex}: ${colorValue}`);
        }
      },
      // Check if color controls should be shown for current effect
      showColorControls() {
        const colorEffects = ["chase_single", "twinkle", "pulse", "chase_multi", "matrix"];
        return colorEffects.includes(this.selectedEffect);
      },
      // Get color names based on current effect
      getColorNames() {
        if (this.selectedEffect === "chase_multi") {
          return ["Color 1", "Color 2", "Color 3"];
        } else {
          return ["Color 1"];
        }
      },
      // ================== MQTT API ==================
      // Test MQTT connection
      async testMQTTConnection() {
        this.mqttTesting = true;
        this.mqttTestResult = null;
        try {
          const testData = {
            server: this.config.mqtt.server,
            port: this.config.mqtt.port,
            username: this.config.mqtt.username
          };
          if (this.passwordsModified.mqttPassword && this.config.mqtt.password) {
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
      resetMQTTTestState() {
        this.mqttTestPassed = false;
        this.mqttTestResult = null;
      }
    };
    Alpine.effect(() => {
      var _a, _b, _c, _d, _e, _f;
      if (((_b = (_a = store.config) == null ? void 0 : _a.mqtt) == null ? void 0 : _b.server) || ((_d = (_c = store.config) == null ? void 0 : _c.mqtt) == null ? void 0 : _d.port) || ((_f = (_e = store.config) == null ? void 0 : _e.mqtt) == null ? void 0 : _f.username)) {
        store.resetMQTTTestState();
      }
    });
    return store;
  }
  document.addEventListener("alpine:init", () => {
    if (window.settingsStoreInstance) {
      console.log("\u2699\uFE0F Settings: Store already exists, skipping alpine:init");
      return;
    }
    const settingsStore = initializeSettingsStore();
    Alpine.store("settings", settingsStore);
    window.settingsStoreInstance = settingsStore;
    settingsStore.init();
    Alpine.store("partials", {
      cache: {},
      loading: {},
      load(name) {
        if (this.cache[name]) return this.cache[name];
        if (this.loading[name]) return '<div class="p-4 text-center opacity-0"></div>';
        this.loading[name] = true;
        fetch(`/html/partials/settings/${name}.html`).then((response) => {
          if (!response.ok) throw new Error(`Failed to load partial: ${name}`);
          return response.text();
        }).then((html) => {
          this.loading[name] = false;
          this.cache[name] = html;
          Alpine.store("partials", __spreadValues({}, this));
        }).catch((error) => {
          console.error(`Error loading partial ${name}:`, error);
          this.cache[name] = `<div class="p-4 bg-red-50 border border-red-200 rounded-lg"><p class="text-red-600">Failed to load ${name} section</p></div>`;
          this.loading[name] = false;
          Alpine.store("partials", __spreadValues({}, this));
        });
        return '<div class="p-4 text-center opacity-0"></div>';
      }
    });
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
})();
