(() => {
  // src/js/page-settings-overview.js
  function initializeSettingsOverviewStore() {
    const store = {
      // ================== STATE MANAGEMENT ==================
      // Success feedback states
      deviceSaved: false,
      wifiSaved: false,
      loading: true,
      error: null,
      // ================== INITIALIZATION ==================
      init() {
        this.checkSaveSuccess();
        this.loading = false;
      },
      // ================== SUCCESS FEEDBACK ==================
      // Check for save success from URL parameter
      checkSaveSuccess() {
        const urlParams = new URLSearchParams(window.location.search);
        const saved = urlParams.get("saved");
        if (saved === "device") {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
          this.deviceSaved = true;
          setTimeout(() => {
            this.deviceSaved = false;
          }, 2e3);
        } else if (saved === "wifi") {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
          this.wifiSaved = true;
          setTimeout(() => {
            this.wifiSaved = false;
          }, 2e3);
        }
      }
    };
    return store;
  }
  var overviewStore = initializeSettingsOverviewStore();
  window.settingsOverviewStoreInstance = overviewStore;
  document.addEventListener("alpine:init", () => {
    Alpine.store("settingsOverview", overviewStore);
  });
})();
