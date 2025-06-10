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
    if (alertContainer && alertContainer.querySelector("div")) {
      alertContainer.querySelector("div").textContent = message
      alertContainer.classList.remove("d-none")
      alertContainer.classList.add("show")

      setTimeout(() => {
        alertContainer.classList.remove("show")
        alertContainer.classList.add("d-none")
      }, 3000)
    }
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
    try {
      // Initialize Bootstrap Toast
      const toastElement = document.getElementById("toast")
      if (toastElement && typeof bootstrap !== "undefined") {
        this.toastInstance = new bootstrap.Toast(toastElement)
      }

      // Initialize Bootstrap Offcanvas (Side Menu)
      const sideMenuElement = document.getElementById("sideMenu")
      if (sideMenuElement && typeof bootstrap !== "undefined") {
        this.sideMenuInstance = new bootstrap.Offcanvas(sideMenuElement)
      }

      // Initialize Bootstrap Modals
      const shareModalElement = document.getElementById("shareModal")
      if (shareModalElement && typeof bootstrap !== "undefined") {
        this.shareModalInstance = new bootstrap.Modal(shareModalElement)
      }

      const addContactModalElement = document.getElementById("addContactModal")
      if (addContactModalElement && typeof bootstrap !== "undefined") {
        this.addContactModalInstance = new bootstrap.Modal(addContactModalElement)
      }

      this.logExecution("✅ Bootstrap components initialized", "success")
    } catch (error) {
      this.logExecution(`⚠️ Bootstrap initialization failed: ${error.message}`, "warning")
    }
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

        if (typeof maplibregl === "undefined") {
          throw new Error("MapLibre GL JS not loaded")
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
    if (!this.map) return

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

    // Safe event listener setup with null checks
    const addEventListenerSafe = (id, event, handler) => {
      const element = document.getElementById(id)
      if (element) {
        element.addEventListener(event, handler)
      }
    }

    // Menu toggle
    addEventListenerSafe("menu-toggle", "click", () => {
      if (this.sideMenuInstance) this.sideMenuInstance.show()
    })

    // Voice toggle
    addEventListenerSafe("voice-toggle", "click", () => {
      this.toggleVoice()
    })

    // Emergency button
    addEventListenerSafe("emergency-btn", "click", () => {
      this.handleEmergency()
    })

    // Navigation button
    addEventListenerSafe("navigate-btn", "click", () => {
      this.startNavigation()
    })

    // Refresh suggestion
    addEventListenerSafe("refresh-suggestion", "click", () => {
      this.refreshSuggestion()
    })

    // Quick action buttons
    addEventListenerSafe("find-nearest", "click", () => {
      this.findNearestZone()
    })

    addEventListenerSafe("high-demand-filter", "click", (e) => {
      this.toggleHighDemandFilter(e.target)
    })

    addEventListenerSafe("voice-navigation", "click", () => {
      this.toggleVoiceNavigation()
    })

    addEventListenerSafe("safety-mode", "click", (e) => {
      this.toggleSafetyMode(e.target)
    })

    // Share location
    addEventListenerSafe("share-location", "click", () => {
      if (this.shareModalInstance) this.shareModalInstance.show()
    })

    // View toggle
    addEventListenerSafe("view-toggle", "click", () => {
      this.toggleViewMode()
    })

    this.logExecution("✅ Driver interface events configured", "success")
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

    const message = this.voiceEnabled ? "تم تفعيل التنبيهات الصوتية" : "تم إيقاف التنبيهات الصوتية"
    this.showToast(message, "info")

    if (this.voiceEnabled) {
      this.playVoiceAlert("تم تفعيل التنبيهات الصوتية")
    }
  }

  updateVoiceButton() {
    const btn = document.getElementById("voice-toggle")
    if (!btn) return

    const icon = btn.querySelector("i")
    if (!icon) return

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
    if (button) {
      button.classList.toggle("active", this.highDemandOnly)
    }

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
    if (button) {
      button.classList.toggle("active", this.safetyMode)
    }
    this.updateSafetyMode()

    const message = this.safetyMode ? "تم تفعيل وضع الأمان" : "تم إيقاف وضع الأمان"
    this.showToast(message, "info")
    this.playVoiceAlert(message)
  }

  updateSafetyMode() {
    const container = document.querySelector(".driver-container")
    if (!container) return

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

    const navigateBtn = document.getElementById("navigate-btn")
    if (navigateBtn) {
      navigateBtn.disabled = false
    }

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
    const elements = {
      display: document.getElementById("suggested-zone-display"),
      distance: document.getElementById("suggested-distance"),
      eta: document.getElementById("suggested-eta"),
      level: document.getElementById("demand-level"),
    }

    if (!this.suggestedZone) {
      if (elements.display) elements.display.textContent = "لا توجد منطقة مقترحة"
      if (elements.distance) elements.distance.textContent = "--"
      if (elements.eta) elements.eta.textContent = "--"
      if (elements.level) elements.level.textContent = "--"
      return
    }

    const zone = this.suggestedZone
    const density = this.getCurrentDensity(zone)

    if (elements.display) elements.display.textContent = zone.name
    if (elements.level) elements.level.textContent = density

    if (this.currentLocation) {
      const distance =
        this.haversineDistance(this.currentLocation.lat, this.currentLocation.lng, zone.lat, zone.lng) / 1000

      if (elements.distance) {
        elements.distance.textContent = distance < 1 ? `${Math.round(distance * 1000)} م` : `${distance.toFixed(1)} كم`
      }

      const eta = Math.round((distance / 30) * 60)
      if (elements.eta) {
        elements.eta.textContent = eta < 1 ? "< 1 دقيقة" : `${eta} دقيقة`
      }
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
    const element = document.getElementById("current-area-display")
    if (!element) return

    if (!this.currentLocation) {
      element.textContent = "غير محدد"
      return
    }

    const nearest = this.findNearestZone(this.currentLocation)
    if (nearest) {
      const distance =
        this.haversineDistance(this.currentLocation.lat, this.currentLocation.lng, nearest.lat, nearest.lng) / 1000

      const distanceText = distance < 1 ? `${Math.round(distance * 1000)} م` : `${distance.toFixed(1)} كم`
      element.textContent = `${nearest.name} (${distanceText})`
    } else {
      element.textContent = "منطقة غير معروفة"
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

    const source = this.map.getSource("current-location")
    if (source) {
      source.setData({
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

    const source = this.map.getSource("zones")
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features: zoneFeatures,
      })
    }
  }

  updateZonesList() {
    const container = document.getElementById("zones-grid")
    if (!container) return

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
    const sortElement = document.getElementById("zone-sort")
    const sortBy = sortElement ? sortElement.value : "demand"

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
    const element = document.getElementById("demand-mode-display")
    if (!element) return

    const hour = new Date().getHours()
    const isPeakTime = (hour >= 11 && hour <= 14) || (hour >= 17 && hour <= 21)
    const mode = isPeakTime ? "ساعات الذروة" : "ساعات الهدوء"
    const currentTime = new Date().toLocaleTimeString("ar-JO", {
      hour: "2-digit",
      minute: "2-digit",
    })

    element.textContent = `${mode} (${currentTime})`
  }

  highlightZoneOnMap(zone) {
    if (!this.map) return

    this.map.flyTo({
      center: [zone.lng, zone.lat],
      zoom: 16,
      duration: 2000,
      essential: true,
    })
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

    if (!container || !map || !viewToggleBtn) return

    const icon = viewToggleBtn.querySelector("i")

    if (this.viewMode === "text") {
      container.classList.add("text-only-mode")
      map.classList.add("minimized")
      if (locationCard) {
        locationCard.classList.remove("d-none")
        locationCard.classList.add("active")
      }
      if (icon) icon.className = "bi bi-phone"
      viewToggleBtn.setAttribute("aria-label", "تبديل إلى وضع الخريطة")
    } else {
      container.classList.remove("text-only-mode")
      map.classList.remove("minimized")
      if (locationCard) {
        locationCard.classList.add("d-none")
        locationCard.classList.remove("active")
      }
      if (icon) icon.className = "bi bi-map"
      viewToggleBtn.setAttribute("aria-label", "تبديل إلى وضع النص")
    }

    if (this.viewMode === "map" && this.map) {
      setTimeout(() => {
        this.map.resize()
      }, 300)
    }
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

    const enhancedVoice = localStorage.getItem("enhancedVoiceInTextMode")
    if (enhancedVoice !== null) {
      this.enhancedVoiceInTextMode = enhancedVoice === "true"
    }
  }

  updateDebugInfo(key, value) {
    const element = document.getElementById(key)
    if (element) {
      element.textContent = value
    }
  }

  showLoadingOverlay(message) {
    const overlay = document.getElementById("loading-overlay")
    if (overlay) {
      const text = overlay.querySelector(".loading-text")
      if (text) text.textContent = message
      overlay.style.display = "flex"
    }
  }

  hideLoadingOverlay() {
    const overlay = document.getElementById("loading-overlay")
    if (overlay) {
      overlay.style.display = "none"
    }
  }

  showToast(message, type = "info") {
    if (!this.toastInstance) return

    const toast = document.getElementById("toast")
    const toastBody = toast.querySelector(".toast-body")

    if (!toast || !toastBody) return

    // Remove existing classes
    toast.className = "toast align-items-center border-0"

    // Add new classes based on type
    switch (type) {
      case "success":
        toast.classList.add("text-bg-success")
        break
      case "danger":
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
