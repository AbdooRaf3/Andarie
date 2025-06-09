class AmmanDriverGuide {
  constructor() {
    this.map = null
    this.currentLocation = null
    this.zones = []
    this.markers = new Map()
    this.currentLocationMarker = null
    this.highDemandOnly = false
    this.executionLog = []
    this.isInitialized = false
    this.geolocationWatchId = null
    this.debugMode = false
    this.loadingTimeout = null
    this.currentMapStyle = "osm"
    this.safetyMode = false
    this.voiceEnabled = true
    this.voiceVolume = 0.7
    this.voiceLanguage = "ar"
    this.autoRefresh = true
    this.currentTab = "zones"
    this.suggestedZone = null
    this.navigationActive = false
    this.enhancedVoiceInTextMode = false

    // Bootstrap components
    this.toastInstance = null
    this.sideMenuInstance = null
    this.shareModalInstance = null
    this.addContactModalInstance = null

    // Audio system
    this.audioContext = null
    this.voiceQueue = []
    this.isPlaying = false
    this.speechSynthesis = window.speechSynthesis
    this.voices = []

    // Driver-specific settings
    this.locationUpdateFrequency = 5000
    this.highAccuracyThreshold = 10
    this.movementDetectionThreshold = 5
    this.maxLocationAge = 15000

    // Map styles optimized for driving
    this.mapStyles = {
      osm: {
        version: 8,
        sources: {
          "osm-tiles": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "osm-tiles",
            type: "raster",
            source: "osm-tiles",
          },
        ],
      },
      satellite: {
        version: 8,
        sources: {
          "satellite-tiles": {
            type: "raster",
            tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
            tileSize: 256,
            attribution: "Tiles © Esri",
          },
        },
        layers: [
          {
            id: "satellite-tiles",
            type: "raster",
            source: "satellite-tiles",
          },
        ],
      },
      dark: {
        version: 8,
        sources: {
          "dark-tiles": {
            type: "raster",
            tiles: ["https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors, © CARTO",
          },
        },
        layers: [
          {
            id: "dark-tiles",
            type: "raster",
            source: "dark-tiles",
          },
        ],
      },
    }

    // View mode settings
    this.viewMode = "map"
    this.autoSwitchToText = false
    this.textModeSpeed = 30
    this.lastKnownAddress = ""
    this.directionInstructions = ""

    // Share system
    this.favoriteContacts = []
    this.activeShares = new Map()
    this.shareId = 0

    this.logExecution("🚗 Driver-optimized system initialized", "info")
    this.initializeAudioSystem()
    this.checkBrowserCompatibility()
  }

  async initializeAudioSystem() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
      this.loadVoices()

      if (this.speechSynthesis) {
        this.speechSynthesis.addEventListener("voiceschanged", () => {
          this.loadVoices()
        })
      }

      this.logExecution("🔊 Audio system initialized", "success")
    } catch (error) {
      this.logExecution(`⚠️ Audio system initialization failed: ${error.message}`, "warning")
    }
  }

  loadVoices() {
    this.voices = this.speechSynthesis.getVoices()
    this.logExecution(`🎤 Loaded ${this.voices.length} voices`, "info")
  }

  async playVoiceAlert(message, priority = "normal") {
    if (!this.voiceEnabled) return

    const alert = {
      message,
      priority,
      timestamp: Date.now(),
    }

    if (priority === "urgent") {
      this.voiceQueue.unshift(alert)
    } else {
      this.voiceQueue.push(alert)
    }

    if (!this.isPlaying) {
      this.processVoiceQueue()
    }
  }

  async processVoiceQueue() {
    if (this.voiceQueue.length === 0) {
      this.isPlaying = false
      return
    }

    this.isPlaying = true
    const alert = this.voiceQueue.shift()

    try {
      this.showVoiceAlert(alert.message)
      this.playNotificationSound()
      await this.speakMessage(alert.message)

      setTimeout(() => {
        this.processVoiceQueue()
      }, 500)
    } catch (error) {
      this.logExecution(`❌ Voice alert error: ${error.message}`, "error")
      this.processVoiceQueue()
    }
  }

  async speakMessage(message) {
    return new Promise((resolve, reject) => {
      if (!this.speechSynthesis) {
        reject(new Error("Speech synthesis not supported"))
        return
      }

      const utterance = new SpeechSynthesisUtterance(message)
      const arabicVoice = this.voices.find((voice) => voice.lang.includes("ar") || voice.name.includes("Arabic"))

      if (arabicVoice) {
        utterance.voice = arabicVoice
      }

      utterance.volume = this.voiceVolume
      utterance.rate = 0.9
      utterance.pitch = 1.0

      utterance.onend = () => resolve()
      utterance.onerror = (error) => reject(error)

      this.speechSynthesis.speak(utterance)
    })
  }

  playNotificationSound() {
    try {
      const audio = document.getElementById("notification-sound")
      if (audio) {
        audio.volume = this.voiceVolume * 0.5
        audio.play().catch((error) => {
          this.logExecution(`⚠️ Notification sound failed: ${error.message}`, "warning")
        })
      }
    } catch (error) {
      this.logExecution(`⚠️ Notification sound error: ${error.message}`, "warning")
    }
  }

  showVoiceAlert(message) {
    const alertContainer = document.getElementById("voice-alerts")
    alertContainer.querySelector("div").textContent = message
    alertContainer.classList.remove("d-none")
    alertContainer.classList.add("show")

    setTimeout(() => {
      alertContainer.classList.remove("show")
      alertContainer.classList.add("d-none")
    }, 3000)
  }

  checkBrowserCompatibility() {
    this.logExecution("🔍 Checking driver-optimized compatibility...", "info")

    const checks = {
      webgl: this.checkWebGLSupport(),
      geolocation: !!navigator.geolocation,
      fetch: !!window.fetch,
      localStorage: !!window.localStorage,
      maplibre: !!window.maplibregl,
      speechSynthesis: !!window.speechSynthesis,
      audioContext: !!(window.AudioContext || window.webkitAudioContext),
      vibration: !!navigator.vibrate,
      wakeLock: "wakeLock" in navigator,
    }

    this.logExecution(`Driver compatibility: ${JSON.stringify(checks)}`, "info")

    if (!checks.webgl) {
      this.showToast("متصفحك لا يدعم WebGL المطلوب للخريطة", "danger")
      return false
    }

    if (!checks.geolocation) {
      this.showToast("متصفحك لا يدعم تحديد الموقع", "danger")
      return false
    }

    if (!checks.speechSynthesis) {
      this.logExecution("⚠️ Speech synthesis not supported - voice alerts disabled", "warning")
      this.voiceEnabled = false
    }

    return true
  }

  checkWebGLSupport() {
    try {
      const canvas = document.createElement("canvas")
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
      return !!gl
    } catch (e) {
      return false
    }
  }

  async init() {
    try {
      this.showLoadingOverlay("جاري تحميل التطبيق...")
      this.logExecution("🚗 Starting driver-optimized initialization...", "info")

      // Initialize Bootstrap components
      this.initializeBootstrapComponents()

      // Load user preferences
      this.loadUserPreferences()

      // Initialize core systems
      await this.loadZones()
      await this.initMap()
      this.setupEventListeners()
      this.setupDriverInterface()

      // Start location tracking
      this.startLocationTracking()

      // Update demand mode
      this.updateDemandMode()

      // Set initial view mode
      this.updateViewMode()

      this.isInitialized = true
      this.hideLoadingOverlay()

      this.logExecution("🎉 Driver application ready!", "success")
      this.playVoiceAlert("تم تحميل التطبيق بنجاح. مرحباً بك في دليل السائق")
      this.showToast("مرحباً بك في دليل السائق!", "success")
    } catch (error) {
      this.logExecution(`❌ Initialization error: ${error.message}`, "error")
      this.hideLoadingOverlay()
      this.showToast("خطأ في تحميل التطبيق", "danger")
    }
  }

  initializeBootstrapComponents() {
    // Initialize Bootstrap Toast
    const toastElement = document.getElementById("toast")
    this.toastInstance = new bootstrap.Toast(toastElement)

    // Initialize Bootstrap Offcanvas (Side Menu)
    const sideMenuElement = document.getElementById("sideMenu")
    this.sideMenuInstance = new bootstrap.Offcanvas(sideMenuElement)

    // Initialize Bootstrap Modals
    const shareModalElement = document.getElementById("shareModal")
    this.shareModalInstance = new bootstrap.Modal(shareModalElement)

    const addContactModalElement = document.getElementById("addContactModal")
    this.addContactModalInstance = new bootstrap.Modal(addContactModalElement)

    this.logExecution("✅ Bootstrap components initialized", "success")
  }

  async loadZones() {
    try {
      this.logExecution("📊 Loading enhanced zones database...", "info")

      const response = await fetch("zones.json")
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      this.zones = data

      this.logExecution(`✅ Loaded ${this.zones.length} zones with enhanced data`, "success")
      this.updateDebugInfo("zones-count", this.zones.length)
    } catch (error) {
      this.logExecution(`⚠️ Using fallback zones data: ${error.message}`, "warning")
      this.zones = this.getFallbackZones()
    }
  }

  getFallbackZones() {
    return [
      {
        name: "الصويفية",
        lat: 31.9552,
        lng: 35.8617,
        density_peak: 9,
        density_off: 4,
        region: "عمان الغربية",
        type: "residential_commercial",
        safety_rating: 9,
      },
      {
        name: "عبدون",
        lat: 31.9539,
        lng: 35.8793,
        density_peak: 8,
        density_off: 3,
        region: "عمان الغربية",
        type: "upscale_residential",
        safety_rating: 10,
      },
      {
        name: "الشميساني",
        lat: 31.9613,
        lng: 35.8907,
        density_peak: 8,
        density_off: 4,
        region: "عمان الغربية",
        type: "business_district",
        safety_rating: 9,
      },
    ]
  }

  async initMap() {
    return new Promise((resolve, reject) => {
      try {
        this.logExecution("🗺️ Initializing driver-optimized map...", "info")

        const mapContainer = document.getElementById("map")
        if (mapContainer) {
          mapContainer.innerHTML = ""
        }

        this.map = new maplibregl.Map({
          container: "map",
          style: this.mapStyles[this.currentMapStyle],
          center: [35.9106, 31.9539],
          zoom: 13,
          minZoom: 11,
          maxZoom: 18,
          attributionControl: false,
          logoPosition: "bottom-left",
        })

        this.map.addControl(
          new maplibregl.NavigationControl({
            showCompass: true,
            showZoom: true,
            visualizePitch: true,
          }),
          "top-right",
        )

        this.map.on("load", () => {
          this.setupMapSources()
          this.updateZoneMarkers()
          this.logExecution("✅ Driver map ready", "success")
          resolve()
        })

        this.map.on("error", (error) => {
          this.logExecution(`❌ Map error: ${error.error}`, "error")
          reject(error.error)
        })
      } catch (error) {
        this.logExecution(`❌ Map initialization error: ${error.message}`, "error")
        reject(error)
      }
    })
  }

  setupMapSources() {
    this.map.addSource("zones", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    })

    this.map.addSource("current-location", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    })

    this.map.addSource("route", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    })

    this.map.addLayer({
      id: "zones-layer",
      type: "circle",
      source: "zones",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 12, 15, 20, 18, 30],
        "circle-color": [
          "case",
          [">=", ["get", "density"], 7],
          "#4CAF50",
          [">=", ["get", "density"], 4],
          "#FF9800",
          "#f44336",
        ],
        "circle-stroke-width": 3,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.9,
      },
    })

    this.map.addLayer({
      id: "current-location-layer",
      type: "circle",
      source: "current-location",
      paint: {
        "circle-radius": 15,
        "circle-color": "#4361ee",
        "circle-stroke-width": 4,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.9,
      },
    })

    this.map.addLayer({
      id: "route-layer",
      type: "line",
      source: "route",
      paint: {
        "line-color": "#4361ee",
        "line-width": 6,
        "line-opacity": 0.8,
      },
    })

    this.map.on("click", "zones-layer", (e) => {
      const feature = e.features[0]
      const zone = this.zones.find((z) => z.name === feature.properties.name)
      if (zone) {
        this.selectZone(zone)
      }
    })
  }

  setupEventListeners() {
    this.logExecution("🎛️ Setting up driver interface events...", "info")

    // Menu toggle
    document.getElementById("menu-toggle").addEventListener("click", () => {
      this.sideMenuInstance.show()
    })

    // Voice toggle
    document.getElementById("voice-toggle").addEventListener("click", () => {
      this.toggleVoice()
    })

    // Emergency button
    document.getElementById("emergency-btn").addEventListener("click", () => {
      this.handleEmergency()
    })

    // Navigation button
    document.getElementById("navigate-btn").addEventListener("click", () => {
      this.startNavigation()
    })

    // Refresh suggestion
    document.getElementById("refresh-suggestion").addEventListener("click", () => {
      this.refreshSuggestion()
    })

    // Quick action buttons
    document.getElementById("find-nearest").addEventListener("click", () => {
      this.findNearestZone()
    })

    document.getElementById("high-demand-filter").addEventListener("click", (e) => {
      this.toggleHighDemandFilter(e.target)
    })

    document.getElementById("voice-navigation").addEventListener("click", () => {
      this.toggleVoiceNavigation()
    })

    document.getElementById("safety-mode").addEventListener("click", (e) => {
      this.toggleSafetyMode(e.target)
    })

    // Share location
    document.getElementById("share-location").addEventListener("click", () => {
      this.shareModalInstance.show()
    })

    // View toggle
    document.getElementById("view-toggle").addEventListener("click", () => {
      this.toggleViewMode()
    })

    // Settings
    document.getElementById("voice-enabled").addEventListener("change", (e) => {
      this.voiceEnabled = e.target.checked
      this.updateVoiceButton()
      this.syncMenuSettings()
    })

    document.getElementById("voice-volume").addEventListener("input", (e) => {
      this.voiceVolume = e.target.value / 100
    })

    document.getElementById("voice-language").addEventListener("change", (e) => {
      this.voiceLanguage = e.target.value
    })

    document.getElementById("safety-mode-setting").addEventListener("change", (e) => {
      this.safetyMode = e.target.checked
      this.updateSafetyMode()
      this.syncMenuSettings()
    })

    document.getElementById("auto-refresh").addEventListener("change", (e) => {
      this.autoRefresh = e.target.checked
      this.syncMenuSettings()
    })

    document.getElementById("map-style-setting").addEventListener("change", (e) => {
      this.changeMapStyle(e.target.value)
    })

    document.getElementById("zone-sort").addEventListener("change", (e) => {
      this.sortZones(e.target.value)
    })

    // Debug actions
    document.getElementById("test-voice").addEventListener("click", () => {
      this.testVoiceSystem()
    })

    document.getElementById("force-reload").addEventListener("click", () => {
      this.forceReload()
    })

    document.getElementById("export-logs").addEventListener("click", () => {
      this.exportLogs()
    })

    // View mode settings
    document.getElementById("auto-switch-text").addEventListener("change", (e) => {
      this.autoSwitchToText = e.target.checked
      this.saveUserPreferences()
      this.syncMenuSettings()
    })

    document.getElementById("text-mode-speed").addEventListener("input", (e) => {
      this.textModeSpeed = Number.parseInt(e.target.value)
      document.getElementById("speed-display").textContent = e.target.value
      this.saveUserPreferences()
    })

    document.getElementById("enhanced-voice-text").addEventListener("change", (e) => {
      this.enhancedVoiceInTextMode = e.target.checked
      this.saveUserPreferences()
    })

    // Menu system
    this.setupMenuSystem()

    // Share system
    this.setupShareSystem()

    this.logExecution("✅ Driver interface events configured", "success")
  }

  setupMenuSystem() {
    // Quick settings toggles in menu
    document.getElementById("menu-voice-toggle").addEventListener("change", (e) => {
      this.voiceEnabled = e.target.checked
      this.updateVoiceButton()
      document.getElementById("voice-enabled").checked = e.target.checked
    })

    document.getElementById("menu-safety-toggle").addEventListener("change", (e) => {
      this.safetyMode = e.target.checked
      this.updateSafetyMode()
      document.getElementById("safety-mode-setting").checked = e.target.checked
      document.getElementById("safety-mode").classList.toggle("active", e.target.checked)
    })

    document.getElementById("menu-auto-refresh").addEventListener("change", (e) => {
      this.autoRefresh = e.target.checked
      document.getElementById("auto-refresh").checked = e.target.checked
    })

    document.getElementById("menu-auto-text").addEventListener("change", (e) => {
      this.autoSwitchToText = e.target.checked
      document.getElementById("auto-switch-text").checked = e.target.checked
      this.saveUserPreferences()
    })

    // Map style selector
    document.querySelectorAll(".style-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const style = e.currentTarget.dataset.style
        this.changeMapStyle(style)

        document.querySelectorAll(".style-btn").forEach((b) => b.classList.remove("active"))
        e.currentTarget.classList.add("active")

        document.getElementById("map-style-setting").value = style
      })
    })

    // Menu items
    document.getElementById("menu-settings").addEventListener("click", () => {
      this.sideMenuInstance.hide()
      const settingsTab = new bootstrap.Tab(document.getElementById("settings-tab-btn"))
      settingsTab.show()
      this.showToast("تم فتح الإعدادات المتقدمة", "info")
    })

    document.getElementById("menu-zones").addEventListener("click", () => {
      this.sideMenuInstance.hide()
      const zonesTab = new bootstrap.Tab(document.getElementById("zones-tab-btn"))
      zonesTab.show()
      this.showToast("تم فتح قائمة المناطق", "info")
    })

    document.getElementById("menu-share").addEventListener("click", () => {
      this.sideMenuInstance.hide()
      this.shareModalInstance.show()
    })

    document.getElementById("menu-debug").addEventListener("click", () => {
      this.sideMenuInstance.hide()
      const debugTab = new bootstrap.Tab(document.getElementById("debug-tab-btn"))
      debugTab.show()
      this.showToast("تم فتح أدوات التشخيص", "info")
    })

    document.getElementById("menu-help").addEventListener("click", () => {
      this.sideMenuInstance.hide()
      this.showHelpDialog()
    })

    this.syncMenuSettings()
  }

  setupShareSystem() {
    this.loadFavoriteContacts()

    // Share options
    document.getElementById("share-whatsapp").addEventListener("click", () => {
      this.shareViaWhatsApp()
    })

    document.getElementById("share-telegram").addEventListener("click", () => {
      this.shareViaTelegram()
    })

    document.getElementById("share-sms").addEventListener("click", () => {
      this.shareViaSMS()
    })

    document.getElementById("share-copy").addEventListener("click", () => {
      this.copyLocationToClipboard()
    })

    document.getElementById("share-email").addEventListener("click", () => {
      this.shareViaEmail()
    })

    document.getElementById("share-maps").addEventListener("click", () => {
      this.shareViaGoogleMaps()
    })

    // Add contact
    document.getElementById("add-contact").addEventListener("click", () => {
      this.addContactModalInstance.show()
    })

    document.getElementById("add-contact-form").addEventListener("submit", (e) => {
      e.preventDefault()
      this.saveNewContact()
    })

    // Contact search
    document.getElementById("contact-search").addEventListener("input", (e) => {
      this.filterContacts(e.target.value)
    })

    // Live sharing
    document.getElementById("start-live-share").addEventListener("click", () => {
      this.startLiveSharing()
    })

    // Update share location preview when modal is shown
    document.getElementById("shareModal").addEventListener("shown.bs.modal", () => {
      this.updateShareLocationPreview()
    })
  }

  setupDriverInterface() {
    this.updateVoiceButton()
    this.updateSafetyMode()

    if (this.autoRefresh) {
      setInterval(() => {
        if (this.isInitialized) {
          this.updateDemandMode()
          this.refreshSuggestion()
        }
      }, 60000)
    }
  }

  toggleVoice() {
    this.voiceEnabled = !this.voiceEnabled
    this.updateVoiceButton()
    this.syncMenuSettings()

    const message = this.voiceEnabled ? "تم تفعيل التنبيهات الصوتية" : "تم إيقاف التنبيهات الصوتية"
    this.showToast(message, "info")

    if (this.voiceEnabled) {
      this.playVoiceAlert("تم تفعيل التنبيهات الصوتية")
    }
  }

  updateVoiceButton() {
    const btn = document.getElementById("voice-toggle")
    const icon = btn.querySelector("i")

    if (this.voiceEnabled) {
      btn.classList.remove("btn-secondary")
      btn.classList.add("btn-success")
      icon.className = "bi bi-volume-up"
    } else {
      btn.classList.remove("btn-success")
      btn.classList.add("btn-secondary")
      icon.className = "bi bi-volume-mute"
    }
  }

  handleEmergency() {
    this.playVoiceAlert("تم تفعيل وضع الطوارئ", "urgent")
    this.showToast("تم تفعيل وضع الطوارئ", "danger")

    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200])
    }

    this.logExecution("🚨 Emergency mode activated", "error")
  }

  startNavigation() {
    if (!this.suggestedZone) {
      this.showToast("لا توجد منطقة مقترحة للتوجه إليها", "warning")
      return
    }

    const confirmNavigation = confirm(`هل تريد فتح التنقل إلى ${this.suggestedZone.name}؟`)
    if (!confirmNavigation) return

    this.navigationActive = true

    const navigationOptions = [
      {
        name: "خرائط جوجل",
        url: `https://www.google.com/maps/dir/?api=1&destination=${this.suggestedZone.lat},${this.suggestedZone.lng}&travelmode=driving`,
      },
      {
        name: "Waze",
        url: `https://waze.com/ul?ll=${this.suggestedZone.lat},${this.suggestedZone.lng}&navigate=yes`,
      },
    ]

    const preferredApp = localStorage.getItem("preferredNavigationApp") || "google"
    const selectedOption =
      navigationOptions.find((opt) => opt.name.toLowerCase().includes(preferredApp)) || navigationOptions[0]

    window.open(selectedOption.url, "_blank")

    const distance = this.getDistanceToZone(this.suggestedZone)
    this.playVoiceAlert(`جاري التوجه إلى ${this.suggestedZone.name}. المسافة المقدرة ${distance}`)
    this.showToast(`جاري التوجه إلى ${this.suggestedZone.name}`, "success")
    this.logExecution(`🧭 Navigation started to ${this.suggestedZone.name}`, "info")

    this.updateNavigationState(true)
  }

  updateNavigationState(isNavigating) {
    const navigateBtn = document.getElementById("navigate-btn")
    const icon = navigateBtn.querySelector("i")
    const text = navigateBtn.querySelector("span") || navigateBtn

    if (isNavigating) {
      navigateBtn.classList.add("navigating")
      text.textContent = "جاري التنقل..."

      if (this.viewMode === "map") {
        this.viewMode = "text"
        this.updateViewMode()
        this.playVoiceAlert("تم التبديل إلى وضع النص للقيادة الآمنة")
      }
    } else {
      navigateBtn.classList.remove("navigating")
      text.textContent = "توجه الآن"
    }
  }

  refreshSuggestion() {
    this.logExecution("🔄 Refreshing zone suggestion...", "info")
    this.updateSuggestedZone()
    this.updateZonesList()
    this.playVoiceAlert("تم تحديث المناطق المقترحة")
  }

  findNearestZone() {
    if (!this.currentLocation) {
      this.showToast("لم يتم تحديد موقعك بعد", "warning")
      return
    }

    const nearest = this.findNearestHighDemandZone()
    if (nearest) {
      this.selectZone(nearest.zone)
      this.playVoiceAlert(`أقرب منطقة ذات طلب عالي هي ${nearest.zone.name}`)
    } else {
      this.showToast("لا توجد مناطق ذات طلب عالي قريبة", "info")
    }
  }

  toggleHighDemandFilter(button) {
    this.highDemandOnly = !this.highDemandOnly
    button.classList.toggle("active", this.highDemandOnly)

    this.updateZoneMarkers()
    this.updateZonesList()

    const message = this.highDemandOnly ? "عرض المناطق ذات الطلب العالي فقط" : "عرض جميع المناطق"
    this.showToast(message, "info")
  }

  toggleVoiceNavigation() {
    this.showToast("التوجيه الصوتي قيد التطوير", "info")
  }

  toggleSafetyMode(button) {
    this.safetyMode = !this.safetyMode
    button.classList.toggle("active", this.safetyMode)
    this.updateSafetyMode()
    this.syncMenuSettings()

    const message = this.safetyMode ? "تم تفعيل وضع الأمان" : "تم إيقاف وضع الأمان"
    this.showToast(message, "info")
    this.playVoiceAlert(message)
  }

  updateSafetyMode() {
    const container = document.querySelector(".driver-container")

    if (this.safetyMode) {
      container.classList.add("safety-mode")
      this.voiceEnabled = true
      this.updateVoiceButton()
    } else {
      container.classList.remove("safety-mode")
    }
  }

  selectZone(zone) {
    this.suggestedZone = zone
    this.updateSuggestedZoneDisplay()

    document.getElementById("navigate-btn").disabled = false
    this.highlightZoneOnMap(zone)

    if (this.viewMode === "text") {
      this.viewMode = "map"
      this.updateViewMode()
      this.showToast("تم التبديل إلى عرض الخريطة لإظهار المنطقة المختارة", "info")
    }

    this.playVoiceAlert(`تم اختيار ${zone.name} كمنطقة مقترحة. المسافة ${this.getDistanceToZone(zone)}`)
    this.showToast(`تم اختيار ${zone.name}`, "success")
  }

  getDistanceToZone(zone) {
    if (!this.currentLocation) return "غير محددة"

    const distance =
      this.haversineDistance(this.currentLocation.lat, this.currentLocation.lng, zone.lat, zone.lng) / 1000

    return distance < 1 ? `${Math.round(distance * 1000)} متر` : `${distance.toFixed(1)} كيلومتر`
  }

  updateSuggestedZoneDisplay() {
    if (!this.suggestedZone) {
      document.getElementById("suggested-zone-display").textContent = "لا توجد منطقة مقترحة"
      document.getElementById("suggested-distance").textContent = "--"
      document.getElementById("suggested-eta").textContent = "--"
      document.getElementById("demand-level").textContent = "--"
      return
    }

    const zone = this.suggestedZone
    const density = this.getCurrentDensity(zone)

    document.getElementById("suggested-zone-display").textContent = zone.name
    document.getElementById("demand-level").textContent = density

    const indicator = document.getElementById("demand-indicator")
    indicator.className = "badge bg-light text-dark rounded-pill " + this.getDemandLevel(density)

    if (this.currentLocation) {
      const distance =
        this.haversineDistance(this.currentLocation.lat, this.currentLocation.lng, zone.lat, zone.lng) / 1000

      document.getElementById("suggested-distance").textContent =
        distance < 1 ? `${Math.round(distance * 1000)} م` : `${distance.toFixed(1)} كم`

      const eta = Math.round((distance / 30) * 60)
      document.getElementById("suggested-eta").textContent = eta < 1 ? "< 1 دقيقة" : `${eta} دقيقة`
    }
  }

  startLocationTracking() {
    if (!navigator.geolocation) {
      this.logExecution("❌ Geolocation not supported", "error")
      return
    }

    this.logExecution("🔄 Starting enhanced location tracking for drivers...", "info")

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: this.maxLocationAge,
    }

    this.geolocationWatchId = navigator.geolocation.watchPosition(
      (position) => {
        this.handleLocationUpdate(position)
      },
      (error) => {
        this.handleLocationError(error)
      },
      options,
    )
  }

  handleLocationUpdate(position) {
    const newLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
      heading: position.coords.heading,
      speed: position.coords.speed,
    }

    if (this.validateLocationAccuracy(newLocation)) {
      const hasMovedSignificantly = this.detectSignificantMovement(newLocation)

      if (hasMovedSignificantly || !this.currentLocation) {
        this.currentLocation = newLocation
        this.updateCurrentLocationDisplay()
        this.updateCurrentLocationOnMap()
        this.updateSuggestedZone()

        this.updateDebugInfo("location-accuracy", `${Math.round(newLocation.accuracy)}م`)
        this.updateDebugInfo("location-state", "نشط")

        if (this.viewMode === "text") {
          this.updateLocationDisplay()
          this.updateDirectionInstructions()
        }

        if (hasMovedSignificantly) {
          this.reverseGeocode(newLocation.lat, newLocation.lng)
        }
      }
    }
  }

  handleLocationError(error) {
    this.logExecution(`❌ Location error: ${error.message}`, "error")
    this.updateDebugInfo("location-state", "خطأ")

    let message = "خطأ في تحديد الموقع"
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = "تم رفض إذن الوصول للموقع"
        break
      case error.POSITION_UNAVAILABLE:
        message = "الموقع غير متاح"
        break
      case error.TIMEOUT:
        message = "انتهت مهلة تحديد الموقع"
        break
    }

    this.showToast(message, "danger")
    this.playVoiceAlert(message, "urgent")
  }

  validateLocationAccuracy(location) {
    return (
      location.accuracy &&
      location.accuracy <= 100 &&
      location.lat >= -90 &&
      location.lat <= 90 &&
      location.lng >= -180 &&
      location.lng <= 180
    )
  }

  detectSignificantMovement(newLocation) {
    if (!this.currentLocation) return true

    const distance = this.haversineDistance(
      this.currentLocation.lat,
      this.currentLocation.lng,
      newLocation.lat,
      newLocation.lng,
    )

    return distance > this.movementDetectionThreshold
  }

  updateCurrentLocationDisplay() {
    if (!this.currentLocation) {
      document.getElementById("current-area-display").textContent = "غير محدد"
      return
    }

    const nearest = this.findNearestZone(this.currentLocation)
    if (nearest) {
      const distance =
        this.haversineDistance(this.currentLocation.lat, this.currentLocation.lng, nearest.lat, nearest.lng) / 1000

      const distanceText = distance < 1 ? `${Math.round(distance * 1000)} م` : `${distance.toFixed(1)} كم`
      document.getElementById("current-area-display").textContent = `${nearest.name} (${distanceText})`
    } else {
      document.getElementById("current-area-display").textContent = "منطقة غير معروفة"
    }
  }

  updateCurrentLocationOnMap() {
    if (!this.currentLocation || !this.map) return

    const locationFeature = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [this.currentLocation.lng, this.currentLocation.lat],
      },
      properties: {
        type: "current-location",
      },
    }

    this.map.getSource("current-location").setData({
      type: "FeatureCollection",
      features: [locationFeature],
    })

    this.map.flyTo({
      center: [this.currentLocation.lng, this.currentLocation.lat],
      zoom: 15,
      duration: 1000,
      essential: true,
    })
  }

  updateSuggestedZone() {
    if (!this.currentLocation) return

    const suggestion = this.findBestZoneSuggestion()
    if (suggestion) {
      this.suggestedZone = suggestion
      this.updateSuggestedZoneDisplay()

      if (!this.previousSuggestion || this.previousSuggestion.name !== suggestion.name) {
        this.playVoiceAlert(`المنطقة المقترحة الجديدة: ${suggestion.name}`)
        this.previousSuggestion = suggestion
      }

      if (this.viewMode === "text") {
        this.updateDirectionInstructions()

        if (this.enhancedVoiceInTextMode && suggestion) {
          const direction = this.getDirectionFromBearing(
            this.calculateBearing(this.currentLocation.lat, this.currentLocation.lng, suggestion.lat, suggestion.lng),
          )

          this.playVoiceAlert(`اتجه ${direction} نحو ${suggestion.name}`)
        }
      }
    }
  }

  findBestZoneSuggestion() {
    const highDemandZones = this.zones.filter((zone) => this.getCurrentDensity(zone) >= 6)

    if (highDemandZones.length === 0) return null

    const zonesWithDistance = highDemandZones.map((zone) => ({
      ...zone,
      distance: this.haversineDistance(this.currentLocation.lat, this.currentLocation.lng, zone.lat, zone.lng),
      density: this.getCurrentDensity(zone),
    }))

    zonesWithDistance.sort((a, b) => {
      const scoreA = a.density * 1000 - a.distance
      const scoreB = b.density * 1000 - b.distance
      return scoreB - scoreA
    })

    return zonesWithDistance[0]
  }

  findNearestHighDemandZone() {
    if (!this.currentLocation) return null

    const highDemandZones = this.zones.filter((zone) => this.getCurrentDensity(zone) >= 7)

    if (highDemandZones.length === 0) return null

    let nearest = null
    let minDistance = Number.POSITIVE_INFINITY

    highDemandZones.forEach((zone) => {
      const distance = this.haversineDistance(this.currentLocation.lat, this.currentLocation.lng, zone.lat, zone.lng)

      if (distance < minDistance) {
        minDistance = distance
        nearest = { zone, distance }
      }
    })

    return nearest
  }

  updateZoneMarkers() {
    if (!this.map) return

    const filteredZones = this.getFilteredZones()

    const zoneFeatures = filteredZones.map((zone) => {
      const density = this.getCurrentDensity(zone)

      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [zone.lng, zone.lat],
        },
        properties: {
          name: zone.name,
          density: density,
          demandLevel: this.getDemandLevel(density),
          region: zone.region || "",
          safetyRating: zone.safety_rating || 5,
        },
      }
    })

    this.map.getSource("zones").setData({
      type: "FeatureCollection",
      features: zoneFeatures,
    })
  }

  updateZonesList() {
    const container = document.getElementById("zones-grid")
    container.innerHTML = ""

    const filteredZones = this.getFilteredZones()
    const sortedZones = this.sortZonesByCurrentCriteria(filteredZones)

    sortedZones.forEach((zone) => {
      const card = this.createZoneCard(zone)
      container.appendChild(card)
    })
  }

  createZoneCard(zone) {
    const density = this.getCurrentDensity(zone)
    const demandLevel = this.getDemandLevel(density)
    const demandText = this.getDemandText(demandLevel)

    const card = document.createElement("div")
    card.className = "col-12"

    let distanceText = ""
    if (this.currentLocation) {
      const distance =
        this.haversineDistance(this.currentLocation.lat, this.currentLocation.lng, zone.lat, zone.lng) / 1000

      distanceText = distance < 1 ? `${Math.round(distance * 1000)} م` : `${distance.toFixed(1)} كم`
    }

    const badgeClass = demandLevel === "high" ? "bg-success" : demandLevel === "medium" ? "bg-warning" : "bg-danger"

    card.innerHTML = `
      <div class="card zone-card h-100" data-zone="${zone.name}">
        <div class="card-body p-3">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h6 class="card-title mb-0">${zone.name}</h6>
            <span class="badge ${badgeClass} text-white">${demandText}</span>
          </div>
          <div class="d-flex justify-content-between text-muted small">
            <span><i class="bi bi-graph-up me-1"></i>الطلب: ${density}</span>
            <span><i class="bi bi-geo me-1"></i>${distanceText}</span>
          </div>
          ${zone.safety_rating ? `<div class="mt-2"><small class="text-success"><i class="bi bi-shield-check me-1"></i>الأمان: ${zone.safety_rating}/10</small></div>` : ""}
        </div>
      </div>
    `

    card.addEventListener("click", () => {
      this.selectZone(zone)
    })

    return card
  }

  sortZonesByCurrentCriteria(zones) {
    const sortBy = document.getElementById("zone-sort").value

    return zones.sort((a, b) => {
      switch (sortBy) {
        case "demand":
          return this.getCurrentDensity(b) - this.getCurrentDensity(a)
        case "distance":
          if (!this.currentLocation) return 0
          const distA = this.haversineDistance(this.currentLocation.lat, this.currentLocation.lng, a.lat, a.lng)
          const distB = this.haversineDistance(this.currentLocation.lat, this.currentLocation.lng, b.lat, b.lng)
          return distA - distB
        case "name":
          return a.name.localeCompare(b.name, "ar")
        default:
          return 0
      }
    })
  }

  getFilteredZones() {
    if (!this.highDemandOnly) {
      return this.zones
    }
    return this.zones.filter((zone) => this.getCurrentDensity(zone) >= 6)
  }

  getCurrentDensity(zone) {
    const hour = new Date().getHours()
    const isPeakTime = (hour >= 11 && hour <= 14) || (hour >= 17 && hour <= 21)
    return isPeakTime ? zone.density_peak : zone.density_off
  }

  getDemandLevel(density) {
    if (density >= 7) return "high"
    if (density >= 4) return "medium"
    return "low"
  }

  getDemandText(level) {
    switch (level) {
      case "high":
        return "عالي"
      case "medium":
        return "متوسط"
      case "low":
        return "منخفض"
      default:
        return "غير محدد"
    }
  }

  updateDemandMode() {
    const hour = new Date().getHours()
    const isPeakTime = (hour >= 11 && hour <= 14) || (hour >= 17 && hour <= 21)
    const mode = isPeakTime ? "ساعات الذروة" : "ساعات الهدوء"
    const currentTime = new Date().toLocaleTimeString("ar-JO", {
      hour: "2-digit",
      minute: "2-digit",
    })

    document.getElementById("demand-mode-display").textContent = `${mode} (${currentTime})`
  }

  highlightZoneOnMap(zone) {
    if (!this.map) return

    this.map.flyTo({
      center: [zone.lng, zone.lat],
      zoom: 16,
      duration: 2000,
      essential: true,
    })

    this.addTemporaryHighlight(zone)
  }

  addTemporaryHighlight(zone) {
    if (this.map.getLayer("zone-highlight")) {
      this.map.removeLayer("zone-highlight")
      this.map.removeSource("zone-highlight")
    }

    this.map.addSource("zone-highlight", {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [zone.lng, zone.lat],
        },
      },
    })

    this.map.addLayer({
      id: "zone-highlight",
      type: "circle",
      source: "zone-highlight",
      paint: {
        "circle-radius": 25,
        "circle-color": "#4361ee",
        "circle-opacity": 0.3,
        "circle-stroke-width": 3,
        "circle-stroke-color": "#4361ee",
        "circle-stroke-opacity": 0.8,
      },
    })

    setTimeout(() => {
      if (this.map.getLayer("zone-highlight")) {
        this.map.removeLayer("zone-highlight")
        this.map.removeSource("zone-highlight")
      }
    }, 3000)
  }

  findNearestZone(location) {
    if (this.zones.length === 0) return null

    let nearest = this.zones[0]
    let minDistance = this.haversineDistance(location.lat, location.lng, nearest.lat, nearest.lng)

    this.zones.forEach((zone) => {
      const distance = this.haversineDistance(location.lat, location.lng, zone.lat, zone.lng)
      if (distance < minDistance) {
        minDistance = distance
        nearest = zone
      }
    })

    return nearest
  }

  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  changeMapStyle(style) {
    this.currentMapStyle = style
    if (this.map) {
      this.map.setStyle(this.mapStyles[style])
      this.map.once("styledata", () => {
        this.setupMapSources()
        this.updateZoneMarkers()
        this.updateCurrentLocationOnMap()
      })
    }
  }

  sortZones(criteria) {
    this.updateZonesList()
  }

  testVoiceSystem() {
    this.playVoiceAlert("اختبار النظام الصوتي. النظام يعمل بشكل صحيح")
  }

  forceReload() {
    this.logExecution("🔄 Force reloading driver application...", "info")
    location.reload()
  }

  exportLogs() {
    const logs = this.executionLog
      .map((log) => `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}`)
      .join("\n")

    const blob = new Blob([logs], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `driver-logs-${new Date().toISOString().split("T")[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  updateDebugInfo(key, value) {
    const element = document.getElementById(key)
    if (element) {
      element.textContent = value
    }
  }

  showLoadingOverlay(message) {
    const overlay = document.getElementById("loading-overlay")
    const text = overlay.querySelector(".loading-text")
    text.textContent = message
    overlay.style.display = "flex"
  }

  hideLoadingOverlay() {
    const overlay = document.getElementById("loading-overlay")
    overlay.style.display = "none"
  }

  showToast(message, type = "info") {
    const toast = document.getElementById("toast")
    const toastBody = toast.querySelector(".toast-body")

    // Remove existing classes
    toast.className = "toast align-items-center border-0"

    // Add new classes based on type
    switch (type) {
      case "success":
        toast.classList.add("text-bg-success")
        break
      case "danger":
      case "error":
        toast.classList.add("text-bg-danger")
        break
      case "warning":
        toast.classList.add("text-bg-warning")
        break
      case "info":
      default:
        toast.classList.add("text-bg-info")
        break
    }

    toastBody.textContent = message
    this.toastInstance.show()
  }

  logExecution(message, type = "info") {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = { timestamp, message, type }
    this.executionLog.push(logEntry)

    if (this.executionLog.length > 100) {
      this.executionLog.shift()
    }

    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`)
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === "map" ? "text" : "map"
    this.updateViewMode()

    const message = this.viewMode === "text" ? "تم التبديل إلى وضع النص المبسط" : "تم التبديل إلى وضع الخريطة"

    this.showToast(message, "info")
    this.playVoiceAlert(message)

    localStorage.setItem("driverViewMode", this.viewMode)
  }

  updateViewMode() {
    const container = document.querySelector(".driver-container")
    const map = document.getElementById("map")
    const locationCard = document.getElementById("location-display-card")
    const viewToggleBtn = document.getElementById("view-toggle")
    const icon = viewToggleBtn.querySelector("i")

    if (this.viewMode === "text") {
      container.classList.add("text-only-mode")
      map.classList.add("minimized")
      locationCard.classList.remove("d-none")
      locationCard.classList.add("active")
      icon.className = "bi bi-phone"
      viewToggleBtn.setAttribute("aria-label", "تبديل إلى وضع الخريطة")

      this.updateLocationDisplay()
      this.updateDirectionInstructions()
    } else {
      container.classList.remove("text-only-mode")
      map.classList.remove("minimized")
      locationCard.classList.add("d-none")
      locationCard.classList.remove("active")
      icon.className = "bi bi-map"
      viewToggleBtn.setAttribute("aria-label", "تبديل إلى وضع النص")
    }

    if (this.viewMode === "map" && this.map) {
      setTimeout(() => {
        this.map.resize()
      }, 300)
    }
  }

  updateLocationDisplay() {
    if (this.viewMode !== "text") return

    const locationName = document.getElementById("current-location-name")
    const accuracyInfo = document.getElementById("accuracy-info")
    const speedInfo = document.getElementById("speed-info")

    if (this.currentLocation) {
      if (this.lastKnownAddress) {
        locationName.textContent = this.lastKnownAddress
      } else {
        const nearest = this.findNearestZone(this.currentLocation)
        if (nearest) {
          const distance =
            this.haversineDistance(this.currentLocation.lat, this.currentLocation.lng, nearest.lat, nearest.lng) / 1000

          const distanceText = distance < 1 ? `${Math.round(distance * 1000)} م` : `${distance.toFixed(1)} كم`
          locationName.textContent = `قرب ${nearest.name} (${distanceText})`
        } else {
          locationName.textContent = "موقع غير معروف"
        }
      }

      accuracyInfo.textContent = `${Math.round(this.currentLocation.accuracy)}م`

      if (this.currentLocation.speed !== null && this.currentLocation.speed !== undefined) {
        const speedKmh = Math.round(this.currentLocation.speed * 3.6)
        speedInfo.textContent = `${speedKmh} كم/س`
      } else {
        speedInfo.textContent = "--"
      }
    } else {
      locationName.textContent = "جاري تحديد الموقع..."
      accuracyInfo.textContent = "--"
      speedInfo.textContent = "--"
    }
  }

  updateDirectionInstructions() {
    if (this.viewMode !== "text") return

    const directionIcon = document.getElementById("direction-icon")
    const directionText = document.getElementById("direction-text")

    if (this.suggestedZone && this.currentLocation) {
      const bearing = this.calculateBearing(
        this.currentLocation.lat,
        this.currentLocation.lng,
        this.suggestedZone.lat,
        this.suggestedZone.lng,
      )

      const direction = this.getDirectionFromBearing(bearing)
      const distance =
        this.haversineDistance(
          this.currentLocation.lat,
          this.currentLocation.lng,
          this.suggestedZone.lat,
          this.suggestedZone.lng,
        ) / 1000

      directionIcon.textContent = this.getDirectionIcon(direction)

      const distanceText = distance < 1 ? `${Math.round(distance * 1000)} متر` : `${distance.toFixed(1)} كيلومتر`
      directionText.textContent = `اتجه ${direction} نحو ${this.suggestedZone.name} (${distanceText})`
    } else {
      directionIcon.textContent = "🎯"
      directionText.textContent = "ابحث عن منطقة ذات طلب عالي"
    }
  }

  calculateBearing(lat1, lng1, lat2, lng2) {
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const lat1Rad = (lat1 * Math.PI) / 180
    const lat2Rad = (lat2 * Math.PI) / 180

    const y = Math.sin(dLng) * Math.cos(lat2Rad)
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng)

    const bearing = (Math.atan2(y, x) * 180) / Math.PI
    return (bearing + 360) % 360
  }

  getDirectionFromBearing(bearing) {
    const directions = [
      { name: "شمالاً", min: 337.5, max: 22.5 },
      { name: "شمال شرق", min: 22.5, max: 67.5 },
      { name: "شرقاً", min: 67.5, max: 112.5 },
      { name: "جنوب شرق", min: 112.5, max: 157.5 },
      { name: "جنوباً", min: 157.5, max: 202.5 },
      { name: "جنوب غرب", min: 202.5, max: 247.5 },
      { name: "غرباً", min: 247.5, max: 292.5 },
      { name: "شمال غرب", min: 292.5, max: 337.5 },
    ]

    for (const dir of directions) {
      if (dir.min > dir.max) {
        if (bearing >= dir.min || bearing <= dir.max) {
          return dir.name
        }
      } else {
        if (bearing >= dir.min && bearing <= dir.max) {
          return dir.name
        }
      }
    }

    return "شمالاً"
  }

  getDirectionIcon(direction) {
    const icons = {
      شمالاً: "⬆️",
      "شمال شرق": "↗️",
      شرقاً: "➡️",
      "جنوب شرق": "↘️",
      جنوباً: "⬇️",
      "جنوب غرب": "↙️",
      غرباً: "⬅️",
      "شمال غرب": "↖️",
    }

    return icons[direction] || "➡️"
  }

  checkAutoSwitch() {
    if (!this.autoSwitchToText || !this.currentLocation) return

    const speed = this.currentLocation.speed
    if (speed !== null && speed !== undefined) {
      const speedKmh = speed * 3.6

      if (speedKmh > this.textModeSpeed && this.viewMode === "map") {
        this.viewMode = "text"
        this.updateViewMode()
        this.playVoiceAlert("تم التبديل التلقائي إلى وضع النص للقيادة الآمنة")
      } else if (speedKmh <= 5 && this.viewMode === "text") {
        this.viewMode = "map"
        this.updateViewMode()
      }
    }
  }

  async reverseGeocode(lat, lng) {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=ar`,
      )

      if (response.ok) {
        const data = await response.json()

        const addressComponents = [
          data.locality,
          data.localityInfo?.administrative?.[3]?.name,
          data.localityInfo?.administrative?.[2]?.name,
          data.city,
          data.principalSubdivision,
        ].filter(Boolean)

        if (addressComponents.length > 0) {
          this.lastKnownAddress = addressComponents[0]
          this.updateLocationDisplay()
          return this.lastKnownAddress
        }
      }
    } catch (error) {
      this.logExecution(`⚠️ Reverse geocoding failed: ${error.message}`, "warning")
    }

    return null
  }

  loadUserPreferences() {
    const savedViewMode = localStorage.getItem("driverViewMode")
    if (savedViewMode && ["map", "text"].includes(savedViewMode)) {
      this.viewMode = savedViewMode
    }

    const autoSwitch = localStorage.getItem("autoSwitchToText")
    if (autoSwitch !== null) {
      this.autoSwitchToText = autoSwitch === "true"
    }

    const speedThreshold = localStorage.getItem("textModeSpeed")
    if (speedThreshold) {
      this.textModeSpeed = Number.parseInt(speedThreshold)
    }

    document.getElementById("auto-switch-text").checked = this.autoSwitchToText
    document.getElementById("text-mode-speed").value = this.textModeSpeed
    document.getElementById("speed-display").textContent = this.textModeSpeed

    const enhancedVoice = localStorage.getItem("enhancedVoiceInTextMode")
    if (enhancedVoice !== null) {
      this.enhancedVoiceInTextMode = enhancedVoice === "true"
      document.getElementById("enhanced-voice-text").checked = this.enhancedVoiceInTextMode
    }
  }

  saveUserPreferences() {
    localStorage.setItem("driverViewMode", this.viewMode)
    localStorage.setItem("autoSwitchToText", this.autoSwitchToText.toString())
    localStorage.setItem("textModeSpeed", this.textModeSpeed.toString())
    localStorage.setItem("enhancedVoiceInTextMode", this.enhancedVoiceInTextMode.toString())
  }

  syncMenuSettings() {
    document.getElementById("menu-voice-toggle").checked = this.voiceEnabled
    document.getElementById("menu-safety-toggle").checked = this.safetyMode
    document.getElementById("menu-auto-refresh").checked = this.autoRefresh
    document.getElementById("menu-auto-text").checked = this.autoSwitchToText

    document.querySelectorAll(".style-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.style === this.currentMapStyle)
    })
  }

  showHelpDialog() {
    const helpContent = `
    🚗 دليل السائق - المساعدة

    الاختصارات:
    • Alt + V: تفعيل/إيقاف الصوت
    • Alt + N: البحث عن أقرب منطقة
    • Alt + R: تحديث المقترحات
    • Alt + S: تفعيل وضع الأمان

    الميزات:
    • التنبيهات الصوتية الذكية
    • التبديل التلقائي لوضع النص أثناء القيادة
    • مشاركة الموقع المباشرة
    • تتبع المناطق ذات الطلب العالي

    للدعم الفني:
    تواصل معنا عبر الإعدادات > التشخيص > تصدير السجلات
  `

    alert(helpContent)
    this.playVoiceAlert("تم عرض دليل المساعدة")
    this.logExecution("❓ Help dialog shown", "info")
  }

  updateShareLocationPreview() {
    const locationName = document.getElementById("share-location-name")
    const locationDetails = document.getElementById("share-location-details")

    if (this.currentLocation) {
      if (this.lastKnownAddress) {
        locationName.textContent = this.lastKnownAddress
      } else {
        const nearest = this.findNearestZone(this.currentLocation)
        if (nearest) {
          locationName.textContent = `قرب ${nearest.name}`
        } else {
          locationName.textContent = "الموقع الحالي"
        }
      }

      const coords = `${this.currentLocation.lat.toFixed(6)}, ${this.currentLocation.lng.toFixed(6)}`
      const accuracy = `دقة: ${Math.round(this.currentLocation.accuracy)}م`
      const timestamp = new Date().toLocaleTimeString("ar-JO")

      locationDetails.textContent = `${coords} • ${accuracy} • ${timestamp}`

      if (this.suggestedZone) {
        locationDetails.textContent += ` • الوجهة: ${this.suggestedZone.name}`
      }
    } else {
      locationName.textContent = "جاري تحديد الموقع..."
      locationDetails.textContent = "يرجى انتظار تحديد الموقع"
    }
  }

  generateLocationMessage() {
    if (!this.currentLocation) {
      return "لم يتم تحديد الموقع بعد"
    }

    let message = "📍 موقعي الحالي:\n"

    if (this.lastKnownAddress) {
      message += `${this.lastKnownAddress}\n`
    } else {
      const nearest = this.findNearestZone(this.currentLocation)
      if (nearest) {
        message += `قرب ${nearest.name}\n`
      }
    }

    message += `الإحداثيات: ${this.currentLocation.lat.toFixed(6)}, ${this.currentLocation.lng.toFixed(6)}\n`
    message += `الوقت: ${new Date().toLocaleString("ar-JO")}\n`

    if (this.suggestedZone) {
      message += `🎯 الوجهة المقترحة: ${this.suggestedZone.name}\n`
    }

    const googleMapsUrl = `https://maps.google.com/maps?q=${this.currentLocation.lat},${this.currentLocation.lng}`
    message += `\n🗺️ عرض على الخريطة: ${googleMapsUrl}`

    return message
  }

  shareViaWhatsApp() {
    const message = this.generateLocationMessage()
    const encodedMessage = encodeURIComponent(message)
    const url = `https://wa.me/?text=${encodedMessage}`

    window.open(url, "_blank")
    this.logExecution("📱 Shared location via WhatsApp", "info")
    this.playVoiceAlert("تم مشاركة الموقع عبر واتساب")
    this.shareModalInstance.hide()
  }

  shareViaTelegram() {
    const message = this.generateLocationMessage()
    const encodedMessage = encodeURIComponent(message)
    const url = `https://t.me/share/url?url=${encodedMessage}`

    window.open(url, "_blank")
    this.logExecution("📱 Shared location via Telegram", "info")
    this.playVoiceAlert("تم مشاركة الموقع عبر تيليجرام")
    this.shareModalInstance.hide()
  }

  shareViaSMS() {
    const message = this.generateLocationMessage()
    const encodedMessage = encodeURIComponent(message)
    const url = `sms:?body=${encodedMessage}`

    window.open(url, "_blank")
    this.logExecution("📱 Shared location via SMS", "info")
    this.playVoiceAlert("تم مشاركة الموقع عبر الرسائل النصية")
    this.shareModalInstance.hide()
  }

  async copyLocationToClipboard() {
    const message = this.generateLocationMessage()

    try {
      await navigator.clipboard.writeText(message)
      this.showToast("تم نسخ معلومات الموقع", "success")
      this.playVoiceAlert("تم نسخ معلومات الموقع")
    } catch (error) {
      const textArea = document.createElement("textarea")
      textArea.value = message
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)

      this.showToast("تم نسخ معلومات الموقع", "success")
      this.playVoiceAlert("تم نسخ معلومات الموقع")
    }

    this.logExecution("📋 Copied location to clipboard", "info")
    this.shareModalInstance.hide()
  }

  shareViaEmail() {
    const message = this.generateLocationMessage()
    const subject = "مشاركة الموقع - دليل السائق"
    const encodedSubject = encodeURIComponent(subject)
    const encodedMessage = encodeURIComponent(message)

    const url = `mailto:?subject=${encodedSubject}&body=${encodedMessage}`
    window.open(url, "_blank")

    this.logExecution("📧 Shared location via email", "info")
    this.playVoiceAlert("تم مشاركة الموقع عبر البريد الإلكتروني")
    this.shareModalInstance.hide()
  }

  shareViaGoogleMaps() {
    if (!this.currentLocation) {
      this.showToast("لم يتم تحديد الموقع بعد", "warning")
      return
    }

    const url = `https://maps.google.com/maps?q=${this.currentLocation.lat},${this.currentLocation.lng}`
    window.open(url, "_blank")

    this.logExecution("🗺️ Opened location in Google Maps", "info")
    this.playVoiceAlert("تم فتح الموقع في خرائط جوجل")
    this.shareModalInstance.hide()
  }

  saveNewContact() {
    const name = document.getElementById("contact-name").value.trim()
    const phone = document.getElementById("contact-phone").value.trim()
    const type = document.getElementById("contact-type").value

    if (!name || !phone) {
      this.showToast("يرجى ملء جميع الحقول المطلوبة", "warning")
      return
    }

    const contact = {
      id: Date.now(),
      name,
      phone,
      type,
      avatar: name.charAt(0).toUpperCase(),
    }

    this.favoriteContacts.push(contact)
    this.saveFavoriteContacts()
    this.updateContactsList()
    this.addContactModalInstance.hide()

    this.showToast(`تم إضافة ${name} إلى جهات الاتصال`, "success")
    this.playVoiceAlert(`تم إضافة ${name} إلى جهات الاتصال`)
    this.logExecution(`👤 Added new contact: ${name}`, "info")
  }

  updateContactsList() {
    const container = document.getElementById("favorite-contacts")
    container.innerHTML = ""

    if (this.favoriteContacts.length === 0) {
      container.innerHTML = `
        <div class="text-center p-4 text-muted">
          <div style="font-size: 3rem; margin-bottom: 1rem;">👥</div>
          <p>لا توجد جهات اتصال محفوظة</p>
          <p>أضف جهات اتصال للمشاركة السريعة</p>
        </div>
      `
      return
    }

    this.favoriteContacts.forEach((contact) => {
      const contactElement = this.createContactElement(contact)
      container.appendChild(contactElement)
    })
  }

  createContactElement(contact) {
    const element = document.createElement("div")
    element.className = "contact-item d-flex align-items-center p-3 border rounded mb-2"

    element.innerHTML = `
      <div class="contact-avatar me-3">${contact.avatar}</div>
      <div class="flex-grow-1">
        <div class="contact-name fw-bold">${contact.name}</div>
        <div class="contact-phone text-muted small">${contact.phone}</div>
      </div>
      <span class="badge bg-secondary contact-type">${this.getContactTypeText(contact.type)}</span>
    `

    element.addEventListener("click", () => {
      this.shareToContact(contact)
    })

    return element
  }

  getContactTypeText(type) {
    const types = {
      customer: "عميل",
      family: "عائلة",
      friend: "صديق",
      work: "عمل",
    }
    return types[type] || type
  }

  shareToContact(contact) {
    const message = this.generateLocationMessage()
    const encodedMessage = encodeURIComponent(message)
    const url = `https://wa.me/${contact.phone.replace(/\D/g, "")}?text=${encodedMessage}`

    window.open(url, "_blank")
    this.logExecution(`📱 Shared location to ${contact.name}`, "info")
    this.playVoiceAlert(`تم مشاركة الموقع مع ${contact.name}`)
    this.shareModalInstance.hide()
  }

  filterContacts(searchTerm) {
    const contacts = document.querySelectorAll(".contact-item")
    const term = searchTerm.toLowerCase()

    contacts.forEach((contact) => {
      const name = contact.querySelector(".contact-name").textContent.toLowerCase()
      const phone = contact.querySelector(".contact-phone").textContent.toLowerCase()

      if (name.includes(term) || phone.includes(term)) {
        contact.style.display = "flex"
      } else {
        contact.style.display = "none"
      }
    })
  }

  startLiveSharing() {
    if (!this.currentLocation) {
      this.showToast("لم يتم تحديد الموقع بعد", "warning")
      return
    }

    const duration = Number.parseInt(document.getElementById("share-duration").value)
    const includeDestination = document.getElementById("include-destination").checked
    const showRoute = document.getElementById("show-route").checked

    const shareId = ++this.shareId
    const endTime = new Date(Date.now() + duration * 60000)

    const shareData = {
      id: shareId,
      startTime: new Date(),
      endTime: endTime,
      duration: duration,
      includeDestination,
      showRoute,
      active: true,
    }

    this.activeShares.set(shareId, shareData)

    const shareUrl = this.generateLiveShareUrl(shareData)

    navigator.clipboard.writeText(shareUrl).then(() => {
      this.showToast("تم نسخ رابط التتبع المباشر", "success")
      this.playVoiceAlert("تم بدء المشاركة المباشرة ونسخ الرابط")
    })

    this.updateActiveShares()
    this.logExecution(`🔴 Started live sharing for ${duration} minutes`, "info")

    setTimeout(() => {
      this.stopLiveSharing(shareId)
    }, duration * 60000)
  }

  generateLiveShareUrl(shareData) {
    const baseUrl = window.location.origin + window.location.pathname
    const params = new URLSearchParams({
      track: shareData.id,
      expires: shareData.endTime.getTime(),
    })

    return `${baseUrl}?${params.toString()}`
  }

  stopLiveSharing(shareId) {
    const shareData = this.activeShares.get(shareId)
    if (shareData) {
      shareData.active = false
      this.activeShares.delete(shareId)
      this.updateActiveShares()
      this.playVoiceAlert("تم إيقاف المشاركة المباشرة")
      this.logExecution(`⏹️ Stopped live sharing ${shareId}`, "info")
    }
  }

  updateActiveShares() {
    const container = document.getElementById("active-shares")
    container.innerHTML = ""

    if (this.activeShares.size === 0) {
      return
    }

    const title = document.createElement("h6")
    title.textContent = "المشاركات النشطة"
    title.className = "mt-3 mb-2"
    container.appendChild(title)

    this.activeShares.forEach((shareData, shareId) => {
      const shareElement = this.createActiveShareElement(shareData)
      container.appendChild(shareElement)
    })
  }

  createActiveShareElement(shareData) {
    const element = document.createElement("div")
    element.className = "active-share-item d-flex justify-content-between align-items-center p-3 border rounded mb-2"

    const timeRemaining = Math.max(0, Math.floor((shareData.endTime - new Date()) / 60000))

    element.innerHTML = `
      <div class="share-status d-flex align-items-center">
        <div class="status-indicator me-2"></div>
        <div class="share-info">
          <div class="share-recipient fw-bold">مشاركة مباشرة #${shareData.id}</div>
          <div class="share-time text-muted small">متبقي: ${timeRemaining} دقيقة</div>
        </div>
      </div>
      <button class="btn btn-danger btn-sm stop-share-btn" onclick="window.driverGuide.stopLiveSharing(${shareData.id})">
        إيقاف
      </button>
    `

    return element
  }

  loadFavoriteContacts() {
    const saved = localStorage.getItem("driverFavoriteContacts")
    if (saved) {
      try {
        this.favoriteContacts = JSON.parse(saved)
      } catch (error) {
        this.logExecution("⚠️ Failed to load contacts", "warning")
        this.favoriteContacts = []
      }
    }
  }

  saveFavoriteContacts() {
    localStorage.setItem("driverFavoriteContacts", JSON.stringify(this.favoriteContacts))
  }
}

// Initialize the driver application
document.addEventListener("DOMContentLoaded", () => {
  window.driverGuide = new AmmanDriverGuide()
  window.driverGuide.init()
})

// Auto-update every 30 seconds for drivers
setInterval(() => {
  if (window.driverGuide && window.driverGuide.isInitialized) {
    window.driverGuide.updateDemandMode()
    if (window.driverGuide.autoRefresh) {
      window.driverGuide.refreshSuggestion()
    }
  }
}, 30000)
