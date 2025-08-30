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

  // multi-entry:multi-entry:src/js/settings-api.js,src/js/page-settings-device.js
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
  function initializeDeviceSettingsStore() {
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
      // Original configuration for change detection
      originalConfig: null,
      // GPIO information from backend
      gpio: {
        availablePins: [],
        safePins: [],
        pinDescriptions: {}
      },
      // Configuration data (reactive) - Device section with hardware GPIO
      config: {
        device: {
          owner: null,
          timezone: null,
          printerTxPin: null
        },
        buttons: {
          button1: { gpio: null },
          button2: { gpio: null },
          button3: { gpio: null },
          button4: { gpio: null }
        },
        leds: {
          enabled: false,
          pin: null
        }
      },
      // Validation state
      validation: {
        errors: {}
      },
      // Timezone picker UI state
      searchQuery: "",
      // ================== DEVICE CONFIGURATION API ==================
      // Initialize store with data from server
      async init() {
        if (this.initialized) {
          console.log("\u2699\uFE0F Device Settings: Already initialized, skipping");
          return;
        }
        this.initialized = true;
        this.loading = true;
        try {
          const serverConfig = await window.SettingsAPI.loadConfiguration();
          this.originalConfig = JSON.parse(JSON.stringify(serverConfig));
          this.mergeDeviceConfig(serverConfig);
          if (this.config.device.timezone) {
            await this.loadTimezones();
          }
          console.log("Alpine Device Store: Configuration loaded successfully");
        } catch (error) {
          console.error("Alpine Device Store: Failed to load configuration:", error);
          this.error = error.message;
        } finally {
          this.loading = false;
        }
      },
      // Merge server config into reactive state (device section only)
      mergeDeviceConfig(serverConfig) {
        console.log("\u{1F527} Merging device config from server:", serverConfig);
        if (serverConfig.device) {
          this.config.device.owner = serverConfig.device.owner || "";
          this.config.device.timezone = serverConfig.device.timezone || "";
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
        if (serverConfig.buttons) {
          for (let i = 1; i <= 4; i++) {
            const buttonKey = `button${i}`;
            if (serverConfig.buttons[buttonKey]) {
              this.config.buttons[buttonKey].gpio = serverConfig.buttons[buttonKey].gpio || null;
            }
          }
        } else {
          console.warn("\u26A0\uFE0F Missing buttons section in config");
        }
        if (serverConfig.leds) {
          this.config.leds.enabled = serverConfig.leds.enabled || false;
          this.config.leds.pin = Number(serverConfig.leds.pin);
        } else {
          console.warn("\u26A0\uFE0F Missing leds section in config");
        }
        if (serverConfig.gpio) {
          this.gpio.availablePins = serverConfig.gpio.availablePins || [];
          this.gpio.safePins = serverConfig.gpio.safePins || [];
          this.gpio.pinDescriptions = serverConfig.gpio.pinDescriptions || {};
        } else {
          console.warn("\u26A0\uFE0F Missing gpio section in config");
        }
        console.log("\u2705 Device config merge complete:", this.config);
      },
      // Validate device owner field specifically (called from UI)
      validateDeviceOwner(value) {
        if (!value || value.trim() === "") {
          this.validation.errors["device.owner"] = "Device owner cannot be blank";
        } else {
          if (this.validation.errors["device.owner"]) {
            delete this.validation.errors["device.owner"];
          }
        }
      },
      // Validate timezone field specifically (called from UI)
      validateTimezone(value) {
        if (!value || value.trim() === "") {
          this.validation.errors["device.timezone"] = "Timezone cannot be blank";
        } else {
          if (this.validation.errors["device.timezone"]) {
            delete this.validation.errors["device.timezone"];
          }
        }
      },
      // TIMEZONE PICKER FUNCTIONALITY
      timezonePicker: {
        loading: false,
        error: null,
        timezones: [],
        initialized: false
      },
      // Computed property for filtered timezones
      get filteredTimezones() {
        if (!Array.isArray(this.timezonePicker.timezones) || this.timezonePicker.timezones.length === 0) {
          return [];
        }
        const query = (this.searchQuery || "").toLowerCase().trim();
        if (!query) {
          const popularTimezones = [
            "Europe/London",
            "America/New_York",
            "America/Sao_Paulo",
            "Australia/Sydney",
            "Asia/Tokyo"
          ];
          const popular = [];
          const others = [];
          this.timezonePicker.timezones.forEach((timezone) => {
            if (popularTimezones.includes(timezone.id)) {
              popular.push(timezone);
            } else {
              others.push(timezone);
            }
          });
          popular.sort((a, b) => {
            const aIndex = popularTimezones.indexOf(a.id);
            const bIndex = popularTimezones.indexOf(b.id);
            return aIndex - bIndex;
          });
          return [...popular, ...others.slice(0, 5 - popular.length)].slice(0, 5);
        }
        const results = this.timezonePicker.timezones.filter((timezone) => {
          if (timezone.displayName.toLowerCase().includes(query)) return true;
          if (timezone.id.toLowerCase().includes(query)) return true;
          const parts = timezone.id.split("/");
          const city = parts[parts.length - 1].replace(/_/g, " ").toLowerCase();
          if (city.includes(query)) return true;
          if (timezone.countryName && timezone.countryName.toLowerCase().includes(query)) return true;
          const region = timezone.id.split("/")[0];
          if (region && region.toLowerCase().includes(query)) return true;
          if (timezone.aliases && timezone.aliases.some((alias) => alias.toLowerCase().includes(query))) return true;
          if (timezone.comment && timezone.comment.toLowerCase().includes(query)) return true;
          return false;
        });
        return results.sort((a, b) => {
          if (a.displayName.toLowerCase() === query) return -1;
          if (b.displayName.toLowerCase() === query) return 1;
          if (a.displayName.toLowerCase().startsWith(query) && !b.displayName.toLowerCase().startsWith(query)) return -1;
          if (b.displayName.toLowerCase().startsWith(query) && !a.displayName.toLowerCase().startsWith(query)) return 1;
          return a.displayName.localeCompare(b.displayName);
        });
      },
      // Load timezone data from API
      async loadTimezones() {
        if (this.timezonePicker.initialized) return;
        this.timezonePicker.loading = true;
        this.timezonePicker.error = null;
        try {
          const response = await fetch("/api/timezones");
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const data = await response.json();
          if (!data.zones || !Array.isArray(data.zones)) {
            throw new Error("Invalid timezone data format");
          }
          this.timezonePicker.timezones = data.zones.map((zone) => {
            try {
              const parts = zone.id ? zone.id.split("/") : ["Unknown"];
              const city = parts[parts.length - 1].replace(/_/g, " ");
              const countryName = zone.location && zone.location.countryName ? zone.location.countryName : null;
              const comment = zone.location && zone.location.comment ? zone.location.comment.trim() : "";
              let displayName;
              let offset = "";
              if (zone.offsets && Array.isArray(zone.offsets) && zone.offsets.length > 0) {
                const formatOffset = (o) => {
                  const cleaned = o.replace(/^\+/, "+").replace(/^-/, "-").replace(/^00/, "+00");
                  return cleaned + ":00";
                };
                if (zone.offsets.length === 1) {
                  offset = "UTC" + formatOffset(zone.offsets[0]);
                  displayName = countryName ? `${city}, ${countryName}` : zone.id || "Unknown";
                  if (comment) {
                    displayName += ` \u2014 ${comment}`;
                  }
                } else {
                  const standardOffset = formatOffset(zone.offsets[0]);
                  const dstOffset = formatOffset(zone.offsets[1]);
                  offset = `UTC${standardOffset} / ${dstOffset} DST`;
                  displayName = countryName ? `${city}, ${countryName}` : zone.id || "Unknown";
                  if (comment) {
                    displayName += ` \u2014 ${comment}`;
                  }
                }
              } else {
                displayName = countryName ? `${city}, ${countryName}` : zone.id || "Unknown";
              }
              return {
                id: zone.id || "Unknown",
                displayName,
                countryName,
                comment: zone.location && zone.location.comment ? zone.location.comment : "",
                aliases: zone.aliases || [],
                offset
              };
            } catch (transformError) {
              console.error("Error transforming timezone:", zone, transformError);
              return {
                id: zone.id || "Unknown",
                displayName: zone.id || "Unknown",
                countryName: "",
                comment: "",
                aliases: [],
                offset: ""
              };
            }
          });
          this.timezonePicker.initialized = true;
          console.log(`Loaded ${this.timezonePicker.timezones.length} timezones`);
        } catch (error) {
          console.error("Failed to load timezone data:", error);
          console.error("Error details:", error.message, error.stack);
          this.timezonePicker.error = `Failed to load timezone data: ${error.message}`;
        } finally {
          this.timezonePicker.loading = false;
        }
      },
      // Load timezones and open dropdown
      async loadTimezonesAndOpen() {
        if (!this.timezonePicker.initialized && !this.timezonePicker.loading) {
          await this.loadTimezones();
        }
        this.isOpen = true;
      },
      // Open timezone picker (clear search on click/focus)
      async openTimezonePicker() {
        if (!this.timezonePicker.initialized && !this.timezonePicker.loading) {
          await this.loadTimezones();
        }
        this.searchQuery = "";
        this.isOpen = true;
      },
      // Reset focus index
      resetTimezoneFocus() {
        this.focusedIndex = -1;
      },
      // Close timezone picker
      closeTimezonePicker() {
        this.isOpen = false;
        this.focusedIndex = -1;
      },
      // Navigate up in timezone list (Alpine context version)
      navigateTimezoneUp(refs, nextTick) {
        this.focusedIndex = this.focusedIndex > 0 ? this.focusedIndex - 1 : -1;
        if (this.focusedIndex === -1) {
          refs.searchInput.focus();
        } else {
          nextTick(() => {
            var _a;
            const options = refs.dropdown.querySelectorAll(".timezone-option");
            (_a = options[this.focusedIndex]) == null ? void 0 : _a.focus();
          });
        }
      },
      // Navigate down in timezone list (Alpine context version)
      navigateTimezoneDown(refs, nextTick) {
        const maxIndex = Math.min(this.filteredTimezones.length - 1, 4);
        this.focusedIndex = this.focusedIndex < maxIndex ? this.focusedIndex + 1 : 0;
        nextTick(() => {
          var _a;
          const options = refs.dropdown.querySelectorAll(".timezone-option");
          (_a = options[this.focusedIndex]) == null ? void 0 : _a.focus();
        });
      },
      // Navigate to first timezone option from input
      navigateToFirstTimezone(refs, nextTick) {
        if (this.isOpen && this.filteredTimezones.length > 0) {
          this.focusedIndex = 0;
          nextTick(() => {
            var _a;
            const options = refs.dropdown.querySelectorAll(".timezone-option");
            (_a = options[0]) == null ? void 0 : _a.focus();
          });
        }
      },
      // Navigate to last timezone option from input  
      navigateToLastTimezone(refs, nextTick) {
        if (this.isOpen && this.filteredTimezones.length > 0) {
          this.focusedIndex = Math.min(this.filteredTimezones.length - 1, 4);
          nextTick(() => {
            var _a;
            const options = refs.dropdown.querySelectorAll(".timezone-option");
            (_a = options[this.focusedIndex]) == null ? void 0 : _a.focus();
          });
        }
      },
      // Handle search input changes
      onSearchInput() {
        if (!this.isOpen && this.timezonePicker.initialized) {
          this.isOpen = true;
        }
      },
      // Handle search input with focus reset (Alpine-native single method)
      onSearchInputWithReset() {
        this.onSearchInput();
        this.resetTimezoneFocus();
      },
      // Select a timezone
      selectTimezone(timezone) {
        this.config.device.timezone = timezone.id;
        this.searchQuery = timezone.displayName;
        this.isOpen = false;
        if (this.validation.errors["device.timezone"]) {
          delete this.validation.errors["device.timezone"];
        }
        console.log("Selected timezone:", timezone.id);
      },
      // Get display name for a timezone ID (for dropdown)
      getTimezoneDisplayName(timezoneId) {
        if (!timezoneId) return "";
        const timezone = this.timezonePicker.timezones.find((tz) => tz.id === timezoneId);
        if (timezone) {
          return `${timezone.displayName} (${timezone.offset})`;
        }
        const parts = timezoneId.split("/");
        const city = parts[parts.length - 1].replace(/_/g, " ");
        return `${city} (${timezoneId})`;
      },
      // Get display name for selected timezone (without offset)
      getSelectedTimezoneDisplayName(timezoneId) {
        const timezone = this.getSelectedTimezone(timezoneId);
        return timezone ? timezone.displayName : "";
      },
      // Get offset display for selected timezone  
      getSelectedTimezoneOffset(timezoneId) {
        const timezone = this.getSelectedTimezone(timezoneId);
        return timezone ? `(${timezone.offset})` : "";
      },
      // Helper to find selected timezone
      getSelectedTimezone(timezoneId) {
        return timezoneId ? this.timezonePicker.timezones.find((tz) => tz.id === timezoneId) : null;
      },
      // Check if configuration has meaningful changes
      hasChanges() {
        var _a, _b, _c, _d, _e, _f;
        if (!this.originalConfig) {
          return false;
        }
        const original = this.originalConfig;
        if (this.config.device.owner !== (((_a = original.device) == null ? void 0 : _a.owner) || "")) {
          return true;
        }
        if (this.config.device.timezone !== (((_b = original.device) == null ? void 0 : _b.timezone) || "")) {
          return true;
        }
        if (this.config.device.printerTxPin !== ((_c = original.device) == null ? void 0 : _c.printerTxPin)) {
          return true;
        }
        for (const buttonKey of ["button1", "button2", "button3", "button4"]) {
          const currentGpio = this.config.buttons[buttonKey].gpio;
          const originalGpio = ((_e = (_d = original.buttons) == null ? void 0 : _d[buttonKey]) == null ? void 0 : _e.gpio) || null;
          if (currentGpio !== originalGpio) {
            return true;
          }
        }
        if (this.config.leds.enabled) {
          if (this.config.leds.pin !== (((_f = original.leds) == null ? void 0 : _f.pin) || null)) {
            return true;
          }
        }
        return false;
      },
      // Computed property to check if save should be enabled
      get canSave() {
        if (this.loading || this.saving || this.error) {
          return false;
        }
        if (!this.config.device.owner || this.config.device.owner.trim() === "") {
          return false;
        }
        if (!this.config.device.timezone || this.config.device.timezone.trim() === "") {
          return false;
        }
        return this.hasChanges();
      },
      // Save device configuration via API
      async saveConfiguration() {
        this.saving = true;
        try {
          const partialConfig = {
            device: {
              owner: this.config.device.owner,
              timezone: this.config.device.timezone,
              printerTxPin: this.config.device.printerTxPin
            },
            buttons: {
              button1: this.config.buttons.button1,
              button2: this.config.buttons.button2,
              button3: this.config.buttons.button3,
              button4: this.config.buttons.button4
            }
          };
          if (this.config.leds.enabled) {
            partialConfig.leds = {
              pin: this.config.leds.pin
            };
          }
          console.log("Saving partial device configuration:", partialConfig);
          const message = await window.SettingsAPI.saveConfiguration(partialConfig);
          console.log("Alpine Device Store: Configuration saved successfully");
          window.location.href = "/settings.html?saved=device";
        } catch (error) {
          console.error("Alpine Device Store: Failed to save configuration:", error);
          this.showErrorMessage("Failed to save device settings: " + error.message);
          this.saving = false;
        }
      },
      // Cancel configuration changes
      cancelConfiguration() {
        window.location.href = "/settings.html";
      },
      // ================== GPIO MANAGEMENT ==================
      // Get what each GPIO pin is assigned to (reactive getter)
      getGpioAssignment(pinNumber) {
        var _a, _b;
        if (pinNumber === -1 || pinNumber === null) return null;
        const pin = Number(pinNumber);
        if (this.config.device.printerTxPin === pin) {
          return "Assigned to printer";
        }
        if (((_a = this.config.leds) == null ? void 0 : _a.pin) === pin) {
          return "Assigned to LED strip";
        }
        for (let i = 1; i <= 4; i++) {
          if (((_b = this.config.buttons[`button${i}`]) == null ? void 0 : _b.gpio) === pin) {
            return `Assigned to button ${i}`;
          }
        }
        return null;
      },
      // Get formatted text for GPIO option (reactive)
      getGpioOptionText(option) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _i;
        if (option.pin === -1) return "Not connected";
        let text = `GPIO ${option.pin} - ${option.description}`;
        if (!option.isSafe) text += " (Unsafe)";
        if (this.config.device.printerTxPin === option.pin) text += " (Assigned to printer)";
        else if (((_a = this.config.leds) == null ? void 0 : _a.pin) === option.pin) text += " (Assigned to LED strip)";
        else if (((_c = (_b = this.config.buttons) == null ? void 0 : _b.button1) == null ? void 0 : _c.gpio) === option.pin) text += " (Assigned to button 1)";
        else if (((_e = (_d = this.config.buttons) == null ? void 0 : _d.button2) == null ? void 0 : _e.gpio) === option.pin) text += " (Assigned to button 2)";
        else if (((_g = (_f = this.config.buttons) == null ? void 0 : _f.button3) == null ? void 0 : _g.gpio) === option.pin) text += " (Assigned to button 3)";
        else if (((_i = (_h = this.config.buttons) == null ? void 0 : _h.button4) == null ? void 0 : _i.gpio) === option.pin) text += " (Assigned to button 4)";
        return text;
      },
      // Get used GPIO pins to avoid conflicts
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
      // GPIO options specifically for printer TX (excludes "Not connected" option)
      get printerGpioOptions() {
        if (this.loading || this.gpio.availablePins.length === 0) {
          return [{
            pin: null,
            description: "Loading GPIO options...",
            available: false,
            isSafe: false,
            inUse: false
          }];
        }
        return this.gpio.availablePins.filter((pin) => Number(pin) !== -1).map((pin) => {
          var _a, _b, _c, _d, _e, _f, _g, _h, _i;
          const pinNumber = Number(pin);
          const isSafe = this.gpio.safePins.includes(pin);
          const description = this.gpio.pinDescriptions[pin] || "Unknown";
          const isUsed = this.usedGpioPins.has(pinNumber);
          let assignment = null;
          if (this.config.device.printerTxPin === pinNumber) {
            assignment = "Assigned to printer";
          } else if (((_a = this.config.leds) == null ? void 0 : _a.pin) === pinNumber) {
            assignment = "Assigned to LED strip";
          } else if (((_c = (_b = this.config.buttons) == null ? void 0 : _b.button1) == null ? void 0 : _c.gpio) === pinNumber) {
            assignment = "Assigned to button 1";
          } else if (((_e = (_d = this.config.buttons) == null ? void 0 : _d.button2) == null ? void 0 : _e.gpio) === pinNumber) {
            assignment = "Assigned to button 2";
          } else if (((_g = (_f = this.config.buttons) == null ? void 0 : _f.button3) == null ? void 0 : _g.gpio) === pinNumber) {
            assignment = "Assigned to button 3";
          } else if (((_i = (_h = this.config.buttons) == null ? void 0 : _h.button4) == null ? void 0 : _i.gpio) === pinNumber) {
            assignment = "Assigned to button 4";
          }
          return {
            pin: pinNumber,
            description,
            available: isSafe && !isUsed,
            isSafe,
            inUse: isUsed,
            assignment
          };
        });
      },
      // Force reactive rebuild of GPIO options array with text updates
      get allGpioOptionsReactive() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _i;
        const triggerUpdate = this.config.device.printerTxPin + "-" + ((_a = this.config.leds) == null ? void 0 : _a.pin) + "-" + ((_c = (_b = this.config.buttons) == null ? void 0 : _b.button1) == null ? void 0 : _c.gpio) + "-" + ((_e = (_d = this.config.buttons) == null ? void 0 : _d.button2) == null ? void 0 : _e.gpio) + "-" + ((_g = (_f = this.config.buttons) == null ? void 0 : _f.button3) == null ? void 0 : _g.gpio) + "-" + ((_i = (_h = this.config.buttons) == null ? void 0 : _h.button4) == null ? void 0 : _i.gpio);
        return this.gpio.availablePins.map((pin, index) => {
          var _a2, _b2, _c2, _d2, _e2, _f2, _g2, _h2, _i2;
          const pinNumber = Number(pin);
          const isSafe = this.gpio.safePins.includes(pin);
          const description = this.gpio.pinDescriptions[pin] || "Unknown";
          const isUsed = this.usedGpioPins.has(pinNumber);
          let text;
          if (pinNumber === -1) {
            text = "Not connected";
          } else {
            text = `GPIO ${pinNumber} - ${description}`;
            if (pinNumber === this.config.device.printerTxPin) {
              text += " (Printer)";
            } else if (pinNumber === ((_a2 = this.config.leds) == null ? void 0 : _a2.pin)) {
              text += " (LED)";
            } else if (pinNumber === ((_c2 = (_b2 = this.config.buttons) == null ? void 0 : _b2.button1) == null ? void 0 : _c2.gpio)) {
              text += " (Button1)";
            } else if (pinNumber === ((_e2 = (_d2 = this.config.buttons) == null ? void 0 : _d2.button2) == null ? void 0 : _e2.gpio)) {
              text += " (Button2)";
            } else if (pinNumber === ((_g2 = (_f2 = this.config.buttons) == null ? void 0 : _f2.button3) == null ? void 0 : _g2.gpio)) {
              text += " (Button3)";
            } else if (pinNumber === ((_i2 = (_h2 = this.config.buttons) == null ? void 0 : _h2.button4) == null ? void 0 : _i2.gpio)) {
              text += " (Button4)";
            }
          }
          return {
            pin: pinNumber,
            description,
            text,
            available: pinNumber === -1 ? true : isSafe && !isUsed,
            isSafe,
            inUse: isUsed,
            // Add unique key to force Alpine re-render
            key: `${pinNumber}-${triggerUpdate}-${index}`
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
        return this.gpio.availablePins.map((pin) => {
          var _a, _b, _c, _d, _e, _f, _g, _h, _i;
          const pinNumber = Number(pin);
          const isSafe = this.gpio.safePins.includes(pin);
          const description = this.gpio.pinDescriptions[pin] || "Unknown";
          const isUsed = this.usedGpioPins.has(pinNumber);
          let assignment = null;
          if (pinNumber !== -1 && pinNumber !== null) {
            if (this.config.device.printerTxPin === pinNumber) {
              assignment = "Assigned to printer";
            } else if (((_a = this.config.leds) == null ? void 0 : _a.pin) === pinNumber) {
              assignment = "Assigned to LED strip";
            } else if (((_c = (_b = this.config.buttons) == null ? void 0 : _b.button1) == null ? void 0 : _c.gpio) === pinNumber) {
              assignment = "Assigned to button 1";
            } else if (((_e = (_d = this.config.buttons) == null ? void 0 : _d.button2) == null ? void 0 : _e.gpio) === pinNumber) {
              assignment = "Assigned to button 2";
            } else if (((_g = (_f = this.config.buttons) == null ? void 0 : _f.button3) == null ? void 0 : _g.gpio) === pinNumber) {
              assignment = "Assigned to button 3";
            } else if (((_i = (_h = this.config.buttons) == null ? void 0 : _h.button4) == null ? void 0 : _i.gpio) === pinNumber) {
              assignment = "Assigned to button 4";
            }
          }
          return {
            pin: pinNumber,
            description,
            // "Not connected" (-1) is always available, others check safety and usage
            available: pinNumber === -1 ? true : isSafe && !isUsed,
            isSafe,
            inUse: isUsed,
            assignment
          };
        });
      }
    };
    return store;
  }
  document.addEventListener("alpine:init", () => {
    if (window.deviceStoreInstance) {
      console.log("\u2699\uFE0F Device Settings: Store already exists, skipping alpine:init");
      return;
    }
    const deviceStore = initializeDeviceSettingsStore();
    Alpine.store("settingsDevice", deviceStore);
    window.deviceStoreInstance = deviceStore;
    deviceStore.init();
    console.log("\u2705 Device Settings Store registered and initialized");
  });
})();
