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

    // Audio system
    this.audioContext = null
    this.voiceQueue = []
    this.isPlaying = false
    this.speechSynthesis = window.speechSynthesis
    this.voices = []

    // Driver-specific settings
    this.locationUpdateFrequency = 5000 // 5 seconds for drivers
    this.highAccuracyThreshold = 10 // Higher accuracy for drivers
    this.movementDetectionThreshold = 5 // Lower threshold for movement
    this.maxLocationAge = 15000 // 15 seconds max age

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

    this.logExecution("🚗 Driver-optimized system initialized", "info")
    this.initializeAudioSystem()
    this.checkBrowserCompatibility()
  }

  async initializeAudioSystem() {
    try {
      // Initialize Web Audio API
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()

      // Load available voices
      this.loadVoices()

      // Listen for voice changes
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
      // Show visual alert
      this.showVoiceAlert(alert.message)

      // Play audio notification
      this.playNotificationSound()

      // Speak the message
      await this.speakMessage(alert.message)

      // Process next in queue
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

      // Find Arabic voice if available
      const arabicVoice = this.voices.find((voice) => voice.lang.includes("ar") || voice.name.includes("Arabic"))

      if (arabicVoice) {
        utterance.voice = arabicVoice
      }

      utterance.volume = this.voiceVolume
      utterance.rate = 0.9 // Slightly slower for clarity
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
    alertContainer.textContent = message
    alertContainer.classList.add("show")

    setTimeout(() => {
      alertContainer.classList.remove("show")
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
      this.showToast("متصفحك لا يدعم WebGL المطلوب للخريطة", "error")
      return false
    }

    if (!checks.geolocation) {
      this.showToast("متصفحك لا يدعم تحديد الموقع", "error")
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

  async checkGeolocationPermission() {
    try {
      const permission = await navigator.permissions.query({ name: "geolocation" })
      this.logExecution(`📍 Geolocation permission status: ${permission.state}`, "info")
      this.updateDebugState("location-state", permission.state)

      permission.addEventListener("change", () => {
        this.logExecution(`📍 Permission changed to: ${permission.state}`, "info")
        this.updateDebugState("location-state", permission.state)
        if (permission.state === "granted") {
          this.getCurrentLocation()
        }
      })
    } catch (error) {
      this.logExecution(`⚠️ Permission API error: ${error.message}`, "warning")
    }
  }

  async init() {
    try {
      this.showLoadingOverlay("جاري تحميل التطبيق...")
      this.logExecution("🚗 Starting driver-optimized initialization...", "info")

      // Initialize core systems
      await this.loadZones()
      await this.initMap()
      this.setupEventListeners()
      this.setupDriverInterface()

      // Start location tracking
      this.startLocationTracking()

      // Update demand mode
      this.updateDemandMode()

      this.isInitialized = true
      this.hideLoadingOverlay()

      this.logExecution("🎉 Driver application ready!", "success")
      this.playVoiceAlert("تم تحميل التطبيق بنجاح. مرحباً بك في دليل السائق")
      this.showToast("مرحباً بك في دليل السائق!", "success")
    } catch (error) {
      this.logExecution(`❌ Initialization error: ${error.message}`, "error")
      this.hideLoadingOverlay()
      this.showToast("خطأ في تحميل التطبيق", "error")
    }
  }

  handleLoadingTimeout() {
    this.logExecution("⏰ Loading timeout reached", "error")
    this.showToast("انتهت مهلة التحميل. جاري المحاولة مرة أخرى...", "warning")

    const failedSteps = Object.entries(this.initializationSteps)
      .filter(([step, completed]) => !completed)
      .map(([step]) => step)

    this.logExecution(`Failed steps: ${failedSteps.join(", ")}`, "error")
    this.forceReload()
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

  validateZoneData() {
    this.logExecution("🔍 Validating zone data structure...", "info")

    const requiredFields = ["name", "lat", "lng", "density_peak", "density_off"]
    let validZones = 0
    let invalidZones = 0

    this.zones = this.zones.filter((zone) => {
      const hasRequiredFields = requiredFields.every((field) => zone.hasOwnProperty(field))

      const hasValidCoordinates =
        typeof zone.lat === "number" &&
        typeof zone.lng === "number" &&
        zone.lat >= -90 &&
        zone.lat <= 90 &&
        zone.lng >= -180 &&
        zone.lng <= 180

      const hasValidDensity =
        typeof zone.density_peak === "number" &&
        typeof zone.density_off === "number" &&
        zone.density_peak >= 0 &&
        zone.density_off >= 0

      const isValid = hasRequiredFields && hasValidCoordinates && hasValidDensity

      if (isValid) {
        validZones++
      } else {
        invalidZones++
        this.logExecution(`⚠️ Invalid zone data: ${JSON.stringify(zone)}`, "warning")
      }

      return isValid
    })

    this.logExecution(`✅ Validated ${validZones} zones (${invalidZones} invalid zones removed)`, "success")
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
          attributionControl: false, // Cleaner for drivers
          logoPosition: "bottom-left",
        })

        // Add driver-optimized controls
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
    // Enhanced sources for driver needs
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

    // Enhanced zone visualization
    this.map.addLayer({
      id: "zones-layer",
      type: "circle",
      source: "zones",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 12, 15, 20, 18, 30],
        "circle-color": ["case", [">=", ["get", "density"], 7], "#4CAF50", 11, 12, 15, 20, 18, 30],
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

    // Current location with enhanced visibility
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

    // Route layer for navigation
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

    // Enhanced click handlers for driver interaction
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

    // Tab navigation
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.switchTab(e.target.dataset.tab)
      })
    })

    // Settings
    document.getElementById("voice-enabled").addEventListener("change", (e) => {
      this.voiceEnabled = e.target.checked
      this.updateVoiceButton()
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
    })

    document.getElementById("auto-refresh").addEventListener("change", (e) => {
      this.autoRefresh = e.target.checked
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

    // Keyboard shortcuts for drivers
    document.addEventListener("keydown", (e) => {
      this.handleKeyboardShortcuts(e)
    })

    this.logExecution("✅ Driver interface events configured", "success")
  }

  setupDriverInterface() {
    // Initialize tabs
    this.switchTab("zones")

    // Set initial settings
    this.updateVoiceButton()
    this.updateSafetyMode()

    // Start auto-refresh if enabled
    if (this.autoRefresh) {
      setInterval(() => {
        if (this.isInitialized) {
          this.updateDemandMode()
          this.refreshSuggestion()
        }
      }, 60000) // Every minute
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
    if (this.voiceEnabled) {
      btn.classList.remove("muted")
      btn.textContent = "🔊"
    } else {
      btn.classList.add("muted")
      btn.textContent = "🔇"
    }
  }

  handleEmergency() {
    this.playVoiceAlert("تم تفعيل وضع الطوارئ", "urgent")
    this.showToast("تم تفعيل وضع الطوارئ", "error")

    // Vibrate if supported
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200])
    }

    // Could integrate with emergency services API here
    this.logExecution("🚨 Emergency mode activated", "error")
  }

  startNavigation() {
    if (!this.suggestedZone) {
      this.showToast("لا توجد منطقة مقترحة للتوجه إليها", "warning")
      return
    }

    this.navigationActive = true
    const url = `https://www.google.com/maps/dir/?api=1&destination=${this.suggestedZone.lat},${this.suggestedZone.lng}`
    window.open(url, "_blank")

    this.playVoiceAlert(`جاري التوجه إلى ${this.suggestedZone.name}`)
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
    button.classList.toggle("active", this.highDemandOnly)

    this.updateZoneMarkers()
    this.updateZonesList()

    const message = this.highDemandOnly ? "عرض المناطق ذات الطلب العالي فقط" : "عرض جميع المناطق"
    this.showToast(message, "info")
  }

  toggleVoiceNavigation() {
    // Toggle voice navigation mode
    this.showToast("التوجيه الصوتي قيد التطوير", "info")
  }

  toggleSafetyMode(button) {
    this.safetyMode = !this.safetyMode
    button.classList.toggle("active", this.safetyMode)
    this.updateSafetyMode()

    const message = this.safetyMode ? "تم تفعيل وضع الأمان" : "تم إيقاف وضع الأمان"
    this.showToast(message, "info")
    this.playVoiceAlert(message)
  }

  updateSafetyMode() {
    if (this.safetyMode) {
      // Reduce distractions
      document.body.classList.add("safety-mode")
      this.voiceEnabled = true
      this.updateVoiceButton()
    } else {
      document.body.classList.remove("safety-mode")
    }
  }

  switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll(".tab-content").forEach((tab) => {
      tab.classList.remove("active")
    })

    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.remove("active")
    })

    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add("active")
    document.querySelector(`[data-tab="${tabName}"]`).classList.add("active")

    this.currentTab = tabName
  }

  selectZone(zone) {
    this.suggestedZone = zone
    this.updateSuggestedZoneDisplay()

    // Enable navigation button
    document.getElementById("navigate-btn").disabled = false

    // Highlight on map
    this.highlightZoneOnMap(zone)

    this.playVoiceAlert(`تم اختيار ${zone.name} كمنطقة مقترحة`)
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

    // Update demand indicator
    const indicator = document.getElementById("demand-indicator")
    indicator.className = "demand-indicator " + this.getDemandLevel(density)

    if (this.currentLocation) {
      const distance =
        this.haversineDistance(this.currentLocation.lat, this.currentLocation.lng, zone.lat, zone.lng) / 1000

      document.getElementById("suggested-distance").textContent =
        distance < 1 ? `${Math.round(distance * 1000)} م` : `${distance.toFixed(1)} كم`

      // Estimate ETA (assuming 30 km/h average in city)
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

    // Validate location
    if (this.validateLocationAccuracy(newLocation)) {
      const hasMovedSignificantly = this.detectSignificantMovement(newLocation)

      if (hasMovedSignificantly || !this.currentLocation) {
        this.currentLocation = newLocation
        this.updateCurrentLocationDisplay()
        this.updateCurrentLocationOnMap()
        this.updateSuggestedZone()

        // Update debug info
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

    this.showToast(message, "error")
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

    // Find nearest zone for display
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

    // Center map on location
    this.map.flyTo({
      center: [this.currentLocation.lng, this.currentLocation.lat],
      zoom: 15,
      duration: 1000,
    })
  }

  updateSuggestedZone() {
    if (!this.currentLocation) return

    const suggestion = this.findBestZoneSuggestion()
    if (suggestion) {
      this.suggestedZone = suggestion
      this.updateSuggestedZoneDisplay()

      // Announce new suggestion if it changed
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

    // Sort by combination of demand and distance
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
    card.className = `zone-card ${demandLevel}-demand`

    let distanceText = ""
    if (this.currentLocation) {
      const distance =
        this.haversineDistance(this.currentLocation.lat, this.currentLocation.lng, zone.lat, zone.lng) / 1000

      distanceText = distance < 1 ? `${Math.round(distance * 1000)} م` : `${distance.toFixed(1)} كم`
    }

    card.innerHTML = `
    <div class="zone-card-header">
      <div class="zone-name">${zone.name}</div>
      <div class="zone-demand-badge ${demandLevel}">${demandText}</div>
    </div>
    <div class="zone-info">
      <span>الطلب: ${density}</span>
      <span>${distanceText}</span>
    </div>
    ${zone.safety_rating ? `<div class="zone-safety">الأمان: ${zone.safety_rating}/10</div>` : ""}
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
      duration: 1000,
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

  handleKeyboardShortcuts(e) {
    // Driver-friendly keyboard shortcuts
    if (e.altKey) {
      switch (e.key) {
        case "v":
          e.preventDefault()
          this.toggleVoice()
          break
        case "n":
          e.preventDefault()
          this.findNearestZone()
          break
        case "r":
          e.preventDefault()
          this.refreshSuggestion()
          break
        case "s":
          e.preventDefault()
          this.toggleSafetyMode(document.getElementById("safety-mode"))
          break
      }
    }
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
    toast.textContent = message
    toast.className = `toast ${type} show`

    setTimeout(() => {
      toast.classList.remove("show")
    }, 4000)
  }

  logExecution(message, type = "info") {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = { timestamp, message, type }
    this.executionLog.push(logEntry)

    // Keep only last 100 entries
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
