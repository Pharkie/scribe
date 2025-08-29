(() => {
  // multi-entry:multi-entry:src/js/setup-alpine-store.js,src/js/setup-api.js
  document.addEventListener("alpine:init", () => {
    const setupStore = {
      // Basic state
      loading: true,
      error: null,
      saving: false,
      scanning: false,
      // Minimal config structure for setup
      config: {
        device: {
          owner: "",
          // Start blank
          timezone: "",
          wifi: {
            ssid: "",
            password: ""
          }
        }
      },
      // Manual SSID entry state
      manualSsid: "",
      // WiFi networks (reuse from settings)
      availableNetworks: [],
      // Load configuration on initialization
      async init() {
        console.log("Setup Store: Initializing...");
        try {
          await this.loadConfiguration();
        } catch (error) {
          console.error("Setup Store: Unexpected initialization error:", error);
        } finally {
          this.loading = false;
        }
      },
      // Load configuration from server (use dedicated SetupAPI)
      async loadConfiguration() {
        var _a, _b, _c, _d, _e, _f;
        console.log("Setup Store: Loading configuration...");
        try {
          const response = await window.SetupAPI.loadConfiguration();
          this.config.device.owner = ((_a = response.device) == null ? void 0 : _a.owner) || "";
          this.config.device.timezone = ((_b = response.device) == null ? void 0 : _b.timezone) || "";
          this.config.device.wifi.ssid = ((_d = (_c = response.device) == null ? void 0 : _c.wifi) == null ? void 0 : _d.ssid) || "";
          this.config.device.wifi.password = ((_f = (_e = response.device) == null ? void 0 : _e.wifi) == null ? void 0 : _f.password) || "";
          console.log("Setup Store: Configuration loaded:", this.config);
        } catch (error) {
          console.warn("Setup Store: Could not load setup configuration, using defaults:", error);
          this.config.device.owner = "";
          this.config.device.timezone = "";
          this.config.device.wifi.ssid = "";
          this.config.device.wifi.password = "";
        }
      },
      // WiFi scanning (use SetupAPI)
      async scanWiFi() {
        if (this.scanning) return;
        this.scanning = true;
        try {
          console.log("Setup Store: Scanning for WiFi networks...");
          const networks = await window.SetupAPI.scanWiFiNetworks();
          this.availableNetworks = networks;
          console.log("Setup Store: Found", networks.length, "networks");
        } catch (error) {
          console.error("Setup Store: WiFi scan failed:", error);
          window.showMessage("WiFi scan failed: " + error.message, "error");
        } finally {
          this.scanning = false;
        }
      },
      // Validation for setup form
      get canSave() {
        if (this.config.device.wifi.ssid === "") {
          return false;
        }
        const requiredFields = [
          this.config.device.owner,
          this.config.device.timezone,
          this.getEffectiveSSID(),
          this.config.device.wifi.password
        ];
        return requiredFields.every(
          (field) => field && typeof field === "string" && field.trim().length > 0
        );
      },
      // Get the effective SSID (either selected or manual)
      getEffectiveSSID() {
        if (this.config.device.wifi.ssid === "__manual__") {
          return this.manualSsid;
        }
        return this.config.device.wifi.ssid;
      },
      // Save configuration and restart (setup-specific behavior)
      async saveAndRestart() {
        if (!this.canSave) {
          window.showMessage("Please fill in all required fields", "error");
          return;
        }
        this.saving = true;
        try {
          const configToSave = {
            device: {
              owner: this.config.device.owner,
              timezone: this.config.device.timezone,
              wifi: {
                ssid: this.getEffectiveSSID(),
                password: this.config.device.wifi.password
              }
            }
          };
          console.log("Setup Store: Saving configuration...", configToSave);
          await window.SetupAPI.saveConfiguration(configToSave);
          console.log("Setup Store: Configuration saved successfully");
        } catch (error) {
          console.error("Setup Store: Save failed:", error);
          window.showMessage("Failed to save configuration: " + error.message, "error");
          this.saving = false;
        }
      }
    };
    Alpine.store("setup", setupStore);
    Alpine.data("setupPage", () => ({
      // Expose all store properties as computed getters
      get loading() {
        return this.$store.setup.loading;
      },
      get error() {
        return this.$store.setup.error;
      },
      get saving() {
        return this.$store.setup.saving;
      },
      get scanning() {
        return this.$store.setup.scanning;
      },
      get config() {
        return this.$store.setup.config;
      },
      get manualSsid() {
        return this.$store.setup.manualSsid;
      },
      set manualSsid(value) {
        this.$store.setup.manualSsid = value;
      },
      get availableNetworks() {
        return this.$store.setup.availableNetworks;
      },
      get canSave() {
        return this.$store.setup.canSave;
      },
      // Expose store methods
      scanWiFi() {
        return this.$store.setup.scanWiFi();
      },
      saveAndRestart() {
        return this.$store.setup.saveAndRestart();
      },
      init() {
        this.$store.setup.init();
      }
    }));
    window.setupStoreInstance = {
      get loading() {
        return Alpine.store("setup").loading;
      },
      get error() {
        return Alpine.store("setup").error;
      },
      get saving() {
        return Alpine.store("setup").saving;
      },
      get scanning() {
        return Alpine.store("setup").scanning;
      },
      get config() {
        return Alpine.store("setup").config;
      },
      get manualSsid() {
        return Alpine.store("setup").manualSsid;
      },
      set manualSsid(value) {
        Alpine.store("setup").manualSsid = value;
      },
      get availableNetworks() {
        return Alpine.store("setup").availableNetworks;
      },
      get canSave() {
        return Alpine.store("setup").canSave;
      },
      scanWiFi() {
        return Alpine.store("setup").scanWiFi();
      },
      saveAndRestart() {
        return Alpine.store("setup").saveAndRestart();
      },
      init() {
        return Alpine.store("setup").init();
      }
    };
  });
  console.log("Setup Alpine Store loaded");
  console.log("Loading Setup API...");
  window.SetupAPI = {
    /**
     * Load initial setup configuration from server
     * Uses the dedicated /api/setup endpoint that returns minimal config for AP mode
     * @returns {Promise<Object>} Minimal configuration for setup
     */
    async loadConfiguration() {
      console.log("Setup API: Loading setup configuration...");
      const response = await fetch("/api/setup", {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to load setup configuration: ${response.status} - ${response.statusText}`);
      }
      const config = await response.json();
      console.log("Setup API: Configuration loaded:", config);
      return config;
    },
    /**
     * Save setup configuration using the minimal validation endpoint
     * @param {Object} config - Configuration object with device settings
     * @returns {Promise<Object>} Response from server
     */
    async saveConfiguration(config) {
      console.log("Setup API: Saving setup configuration...", config);
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(config)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to save setup configuration: ${response.status} - ${response.statusText}`);
      }
      const result = await response.json();
      console.log("Setup API: Configuration saved:", result);
      return result;
    },
    /**
     * Scan for available WiFi networks (reuse from main settings API)
     * @returns {Promise<Array>} Array of WiFi network objects
     */
    async scanWiFiNetworks() {
      var _a;
      console.log("Setup API: Scanning WiFi networks...");
      const response = await fetch("/api/wifi-scan", {
        method: "GET"
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `WiFi scan failed: ${response.status} - ${response.statusText}`);
      }
      const result = await response.json();
      console.log("Setup API: Found", ((_a = result.networks) == null ? void 0 : _a.length) || 0, "networks");
      return result.networks || [];
    }
  };
  console.log("Setup API loaded");
})();
