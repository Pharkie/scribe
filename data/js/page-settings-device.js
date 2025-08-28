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
      const result = await response.text();
      console.log("API: Server response:", result);
      return result;
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
          pin: null
        }
      },
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
          this.mergeDeviceConfig(serverConfig);
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
      // Save device configuration via API
      async saveConfiguration() {
        this.saving = true;
        try {
          const cleanConfig = {
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
            },
            leds: {
              pin: this.config.leds.pin
            }
          };
          console.log("Saving device configuration:", cleanConfig);
          const message = await window.SettingsAPI.saveConfiguration(cleanConfig);
          console.log("Alpine Device Store: Configuration saved successfully");
          window.location.href = "/settings.html";
        } catch (error) {
          console.error("Alpine Device Store: Failed to save configuration:", error);
          this.showErrorMessage("Failed to save device settings: " + error.message);
          this.saving = false;
        }
      },
      // Cancel configuration changes
      cancelConfiguration() {
        window.location.href = "/";
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
