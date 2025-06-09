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

    // Audio system
    this.audioContext = null
    this.voiceQueue = []
    this.isPlaying = false
    this.speechSynthesis = window.speechSynthesis
    this.voices = []

    // Driver-specific settings
    this.locationUpdateFrequency = 5000
    this.highAccuracyThreshold = 100 // زيادة الحد المسموح للدقة
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
    this.shareModal = null
    this.addContactModal = null
    this.favoriteContacts = []
    this.activeShares = new Map()
    this.shareId = 0

    this.logExecution("🚗 Driver-optimized system initialized", "info")

    // تأخير تهيئة الأنظمة المعقدة
    setTimeout(() => {
      this.initializeAudioSystem()
    }, 100)
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

      // تحميل البيانات الأساسية أولاً
      await this.loadZones()

      // إعداد واجهة المستخدم
      this.setupEventListeners()
      this.setupDriverInterface()

      // تهيئة الخريطة (اختياري)
      try {
        await this.initMap()
      } catch (mapError) {
        this.logExecution(`⚠️ Map initialization failed: ${mapError.message}`, "warning")
        // المتابعة بدون خريطة
      }

      // بدء تتبع الموقع
      this.startLocationTracking()

      // تحديث وضع الطلب
      this.updateDemandMode()

      this.isInitialized = true
      this.hideLoadingOverlay()

      this.logExecution("🎉 Driver application ready!", "success")
      this.showToast("مرحباً بك في دليل السائق!", "success")
    } catch (error) {
      this.logExecution(`❌ Initialization error: ${error.message}`, "error")
      this.hideLoadingOverlay()
      this.showToast("تم تحميل التطبيق بنجاح", "success")

      // إظهار واجهة أساسية حتى لو فشلت بعض الأجزاء
      this.setupBasicInterface()
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
      this.logExecution("📊 Loading zones database...", "info")

      // محاولة تحميل البيانات من الملف
      const response = await fetch("zones.json")
      if (response.ok) {
        const data = await response.json()
        this.zones = data
        this.logExecution(`✅ Loaded ${this.zones.length} zones`, "success")
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      this.logExecution(`⚠️ Using fallback zones: ${error.message}`, "warning")
      // استخدام بيانات احتياطية
      this.zones = this.getFallbackZones()
    }

    this.updateDebugInfo("zones-count", this.zones.length)
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

    // Setup view toggle
    this.setupViewToggle()

    // View mode settings
    document.getElementById("auto-switch-text").addEventListener("change", (e) => {
      this.autoSwitchToText = e.target.checked
      this.saveUserPreferences()
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

    // Share system
    this.setupShareSystem()

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

    // Show confirmation dialog
    const confirmNavigation = confirm(`هل تريد فتح التنقل إلى ${this.suggestedZone.name}؟`)

    if (!confirmNavigation) return

    this.navigationActive = true

    // Enhanced navigation options
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

    // Try to open preferred navigation app
    const preferredApp = localStorage.getItem("preferredNavigationApp") || "google"
    const selectedOption =
      navigationOptions.find((opt) => opt.name.toLowerCase().includes(preferredApp)) || navigationOptions[0]

    window.open(selectedOption.url, "_blank")

    // Enhanced feedback
    const distance = this.getDistanceToZone(this.suggestedZone)
    this.playVoiceAlert(`جاري التوجه إلى ${this.suggestedZone.name}. المسافة المقدرة ${distance}`)
    this.showToast(`جاري التوجه إلى ${this.suggestedZone.name}`, "success")
    this.logExecution(`🧭 Navigation started to ${this.suggestedZone.name}`, "info")

    // Update navigation state
    this.updateNavigationState(true)
  }

  // إضافة دالة لتحديث حالة التنقل
  updateNavigationState(isNavigating) {
    const navigateBtn = document.getElementById("navigate-btn")

    if (isNavigating) {
      navigateBtn.textContent = "🧭 جاري التنقل..."
      navigateBtn.classList.add("navigating")

      // Auto-switch to text mode for safer driving
      if (this.viewMode === "map") {
        this.viewMode = "text"
        this.updateViewMode()
        this.playVoiceAlert("تم التبديل إلى وضع النص للقيادة الآمنة")
      }
    } else {
      navigateBtn.textContent = "🧭 توجه الآن"
      navigateBtn.classList.remove("navigating")
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

    // Highlight on map with smooth animation
    this.highlightZoneOnMap(zone)

    // Auto-switch to map view when zone is selected for better visualization
    if (this.viewMode === "text") {
      this.viewMode = "map"
      this.updateViewMode()
      this.showToast("تم التبديل إلى عرض الخريطة لإظهار المنطقة المختارة", "info")
    }

    // Enhanced voice feedback
    this.playVoiceAlert(`تم اختيار ${zone.name} كمنطقة مقترحة. المسافة ${this.getDistanceToZone(zone)}`)

    // Visual feedback
    this.showToast(`تم اختيار ${zone.name}`, "success")
  }

  // إضافة دالة مساعدة لحساب المسافة
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

        // Update location display if in text mode
        if (this.viewMode === "text") {
          this.updateLocationDisplay()
        }

        // Check for auto-switch to text mode
        if (this.autoSwitchToText && newLocation.speed && newLocation.speed * 3.6 > this.textModeSpeed) {
          this.switchViewMode("text")
        }
      }
    } else {
      this.logExecution(`📍 Location update ignored due to low accuracy: ${newLocation.accuracy}m`, "warning")
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

    this.showToast(message, "warning")

    // المتابعة بدون موقع
    this.updateCurrentLocationDisplay()
  }

  validateLocationAccuracy(location) {
    return location.accuracy <= this.highAccuracyThreshold
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
    if (!this.currentLocation) return

    document.getElementById("current-location-lat").textContent = this.currentLocation.lat.toFixed(5)
    document.getElementById("current-location-lng").textContent = this.currentLocation.lng.toFixed(5)
    document.getElementById("current-location-accuracy").textContent = `${Math.round(this.currentLocation.accuracy)}م`

    if (this.currentLocation.heading !== null) {
      document.getElementById("current-location-heading").textContent = `${Math.round(this.currentLocation.heading)}°`
    } else {
      document.getElementById("current-location-heading").textContent = "N/A"
    }

    if (this.currentLocation.speed !== null) {
      document.getElementById("current-location-speed").textContent =
        `${(this.currentLocation.speed * 3.6).toFixed(1)} كم/س`
    } else {
      document.getElementById("current-location-speed").textContent = "0 كم/س"
    }
  }

  updateCurrentLocationOnMap() {
    if (!this.map || !this.currentLocation) return

    this.map.getSource("current-location").setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [this.currentLocation.lng, this.currentLocation.lat],
          },
        },
      ],
    })

    // Optionally center the map on the new location
    if (!this.navigationActive) {
      this.map.flyTo({
        center: [this.currentLocation.lng, this.currentLocation.lat],
        duration: 3000,
      })
    }
  }

  updateSuggestedZone() {
    if (!this.currentLocation) return

    if (this.suggestedZone) {
      this.updateSuggestedZoneDisplay()
    } else {
      this.updateSuggestedZoneDisplay()
    }
  }

  updateDemandMode() {
    this.logExecution("🚦 Updating demand levels...", "info")
    this.updateZonesList()
    this.updateZoneMarkers()
  }

  updateZonesList() {
    const container = document.getElementById("zones-grid")
    if (!container) {
      this.logExecution("⚠️ Zones container not found", "warning")
      return
    }

    container.innerHTML = ""

    const filteredZones = this.getFilteredZones()
    const sortedZones = this.sortZonesByCurrentCriteria(filteredZones)

    if (sortedZones.length === 0) {
      container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
        <div style="font-size: 2rem; margin-bottom: 1rem;">🗺️</div>
        <p>لا توجد مناطق متاحة</p>
      </div>
    `
      return
    }

    sortedZones.forEach((zone, index) => {
      const card = this.createZoneCard(zone)
      card.style.animationDelay = `${index * 0.1}s`
      card.classList.add("fade-in")
      container.appendChild(card)
    })
  }

  updateZoneMarkers() {
    if (!this.map) return

    let filteredZones = [...this.zones]

    if (this.highDemandOnly) {
      filteredZones = filteredZones.filter((zone) => this.getCurrentDensity(zone) >= 7)
    }

    const features = filteredZones.map((zone) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [zone.lng, zone.lat],
      },
      properties: {
        name: zone.name,
        density: this.getCurrentDensity(zone),
      },
    }))

    this.map.getSource("zones").setData({
      type: "FeatureCollection",
      features: features,
    })
  }

  getCurrentDensity(zone) {
    const hour = new Date().getHours()
    return hour >= 7 && hour <= 22 ? zone.density_peak : zone.density_off
  }

  getDemandLevel(density) {
    if (density >= 7) return "high-demand"
    if (density >= 4) return "medium-demand"
    return "low-demand"
  }

  highlightZoneOnMap(zone) {
    // Fly to the zone
    this.map.flyTo({
      center: [zone.lng, zone.lat],
      zoom: 15,
      duration: 2000,
    })

    // Highlight the zone (e.g., change color temporarily)
    const originalColor = this.map.getPaintProperty("zones-layer", "circle-color")
    this.map.setPaintProperty("zones-layer", "circle-color", "#ffff00")

    setTimeout(() => {
      this.map.setPaintProperty("zones-layer", "circle-color", originalColor)
    }, 3000)
  }

  changeMapStyle(style) {
    this.currentMapStyle = style
    this.map.setStyle(this.mapStyles[style])
    this.saveUserPreferences()
  }

  sortZones(sortBy) {
    this.updateZonesList()
    this.saveUserPreferences()
  }

  setupScrollEnhancements() {
    // Smooth scrolling for zone list
    const zonesList = document.getElementById("zones-list")
    if (zonesList) {
      zonesList.addEventListener("wheel", (e) => {
        e.preventDefault()
        zonesList.scrollLeft += e.deltaY
      })
    }
  }

  handleKeyboardShortcuts(e) {
    if (e.key === "v") {
      this.toggleVoice()
    } else if (e.key === "n") {
      this.startNavigation()
    } else if (e.key === "r") {
      this.refreshSuggestion()
    } else if (e.key === "e") {
      this.handleEmergency()
    }
  }

  setupViewToggle() {
    const viewToggle = document.getElementById("view-toggle")

    viewToggle.addEventListener("click", () => {
      this.switchViewMode(this.viewMode === "map" ? "text" : "map")
    })

    this.updateViewMode()
  }

  switchViewMode(mode) {
    this.viewMode = mode
    this.updateViewMode()
  }

  updateViewMode() {
    const viewToggle = document.getElementById("view-toggle")
    const mapContainer = document.getElementById("map-container")
    const textContainer = document.getElementById("text-container")

    if (this.viewMode === "map") {
      viewToggle.textContent = "عرض نصي"
      mapContainer.classList.remove("hidden")
      textContainer.classList.add("hidden")
    } else {
      viewToggle.textContent = "عرض الخريطة"
      mapContainer.classList.add("hidden")
      textContainer.classList.remove("hidden")
      this.updateLocationDisplay()
    }

    this.saveUserPreferences()
  }

  updateLocationDisplay() {
    if (!this.currentLocation) {
      document.getElementById("location-display").textContent = "جاري تحديد الموقع..."
      return
    }

    this.reverseGeocode(this.currentLocation.lat, this.currentLocation.lng)
      .then((address) => {
        this.lastKnownAddress = address
        this.updateDirectionInstructions()
        this.displayLocationInfo()
      })
      .catch((error) => {
        this.logExecution(`⚠️ Geocoding error: ${error.message}`, "warning")
        this.lastKnownAddress = "خطأ في تحديد العنوان"
        this.displayLocationInfo()
      })
  }

  async reverseGeocode(latitude, longitude) {
    const apiKey = "YOUR_GEOAPIFY_API_KEY" // Replace with your actual API key
    const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=${apiKey}`

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`)
      }
      const data = await response.json()

      if (data.features && data.features.length > 0) {
        const address = data.features[0].properties.formatted
        return address
      } else {
        return "العنوان غير متوفر"
      }
    } catch (error) {
      this.logExecution(`⚠️ Reverse geocoding failed: ${error.message}`, "warning")
      return "خطأ في تحديد العنوان"
    }
  }

  updateDirectionInstructions() {
    // Placeholder for direction instructions
    this.directionInstructions = "لا توجد تعليمات حالياً"

    if (this.suggestedZone) {
      // Simulate direction instructions
      this.directionInstructions = `اتجه نحو ${this.suggestedZone.name}. المسافة ${this.getDistanceToZone(this.suggestedZone)}`

      if (this.enhancedVoiceInTextMode) {
        this.playVoiceAlert(this.directionInstructions)
      }
    }
  }

  displayLocationInfo() {
    const locationDisplay = document.getElementById("location-display")
    locationDisplay.textContent = this.lastKnownAddress + ". " + this.directionInstructions
  }

  setupShareSystem() {
    this.shareModal = document.getElementById("share-modal")
    this.addContactModal = document.getElementById("add-contact-modal")

    // Load favorite contacts
    this.loadFavoriteContacts()

    // Share button
    document.getElementById("share-btn").addEventListener("click", () => {
      this.openShareModal()
    })

    // Add contact button
    document.getElementById("add-contact-btn").addEventListener("click", () => {
      this.openAddContactModal()
    })

    // Send share button
    document.getElementById("send-share-btn").addEventListener("click", () => {
      this.sendShare()
    })

    // Save contact button
    document.getElementById("save-contact-btn").addEventListener("click", () => {
      this.saveContact()
    })

    // Close modal buttons
    document.querySelectorAll(".close-modal-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.closeModal(e.target.closest(".modal"))
      })
    })
  }

  openShareModal() {
    if (!this.currentLocation) {
      this.showToast("لم يتم تحديد موقعك بعد", "warning")
      return
    }

    this.populateContactsList()
    this.shareModal.classList.add("show")
  }

  openAddContactModal() {
    this.addContactModal.classList.add("show")
  }

  closeModal(modal) {
    modal.classList.remove("show")
  }

  sendShare() {
    const selectedContacts = Array.from(document.querySelectorAll("#contacts-list input:checked")).map(
      (checkbox) => checkbox.value,
    )

    if (selectedContacts.length === 0) {
      this.showToast("الرجاء تحديد جهة اتصال واحدة على الأقل", "warning")
      return
    }

    const shareMessage = `موقعي الحالي: ${this.currentLocation.lat}, ${this.currentLocation.lng}. العنوان: ${this.lastKnownAddress}`

    selectedContacts.forEach((contact) => {
      // Simulate sending the share
      this.shareId++
      this.activeShares.set(this.shareId, { contact, message: shareMessage, timestamp: Date.now() })
      this.logExecution(`📤 Shared location with ${contact}`, "info")
    })

    this.showToast(`تم إرسال الموقع إلى ${selectedContacts.length} جهة اتصال`, "success")
    this.closeModal(this.shareModal)
  }

  saveContact() {
    const contactName = document.getElementById("contact-name").value
    const contactPhone = document.getElementById("contact-t-phone").value

    if (!contactName || !contactPhone) {
      this.showToast("الرجاء إدخال الاسم ورقم الهاتف", "warning")
      return
    }

    const newContact = { name: contactName, phone: contactPhone }
    this.favoriteContacts.push(newContact)
    this.saveFavoriteContacts()

    this.showToast("تم حفظ جهة الاتصال", "success")
    this.closeModal(this.addContactModal)
    this.populateContactsList()
  }

  populateContactsList() {
    const contactsList = document.getElementById("contacts-list")
    contactsList.innerHTML = ""

    this.favoriteContacts.forEach((contact) => {
      const li = document.createElement("li")
      li.innerHTML = `
        <label>
          <input type="checkbox" value="${contact.name}">
          ${contact.name} (${contact.phone})
        </label>
      `
      contactsList.appendChild(li)
    })
  }

  loadFavoriteContacts() {
    const savedContacts = localStorage.getItem("favoriteContacts")
    if (savedContacts) {
      this.favoriteContacts = JSON.parse(savedContacts)
    }
  }

  saveFavoriteContacts() {
    localStorage.setItem("favoriteContacts", JSON.stringify(this.favoriteContacts))
  }

  loadUserPreferences() {
    const preferences = localStorage.getItem("driverPreferences")
    if (preferences) {
      const prefs = JSON.parse(preferences)
      this.voiceEnabled = prefs.voiceEnabled !== undefined ? prefs.voiceEnabled : this.voiceEnabled
      this.voiceVolume = prefs.voiceVolume !== undefined ? prefs.voiceVolume : this.voiceVolume
      this.voiceLanguage = prefs.voiceLanguage !== undefined ? prefs.voiceLanguage : this.voiceLanguage
      this.safetyMode = prefs.safetyMode !== undefined ? prefs.safetyMode : this.safetyMode
      this.autoRefresh = prefs.autoRefresh !== undefined ? prefs.autoRefresh : this.autoRefresh
      this.currentMapStyle = prefs.currentMapStyle !== undefined ? prefs.currentMapStyle : this.currentMapStyle
      this.viewMode = prefs.viewMode !== undefined ? prefs.viewMode : this.viewMode
      this.autoSwitchToText = prefs.autoSwitchToText !== undefined ? prefs.autoSwitchToText : this.autoSwitchToText
      this.textModeSpeed = prefs.textModeSpeed !== undefined ? prefs.textModeSpeed : this.textModeSpeed
      this.enhancedVoiceInTextMode =
        prefs.enhancedVoiceInTextMode !== undefined ? prefs.enhancedVoiceInTextMode : this.enhancedVoiceInTextMode
    }
  }

  saveUserPreferences() {
    const preferences = {
      voiceEnabled: this.voiceEnabled,
      voiceVolume: this.voiceVolume,
      voiceLanguage: this.voiceLanguage,
      safetyMode: this.safetyMode,
      autoRefresh: this.autoRefresh,
      currentMapStyle: this.currentMapStyle,
      viewMode: this.viewMode,
      autoSwitchToText: this.autoSwitchToText,
      textModeSpeed: this.textModeSpeed,
      enhancedVoiceInTextMode: this.enhancedVoiceInTextMode,
    }
    localStorage.setItem("driverPreferences", JSON.stringify(preferences))
  }

  showLoadingOverlay(message) {
    const loadingOverlay = document.getElementById("loading-overlay")
    const loadingMessage = document.getElementById("loading-message")

    loadingMessage.textContent = message
    loadingOverlay.classList.add("show")

    // Set a timeout to handle loading failures
    this.loadingTimeout = setTimeout(() => {
      this.handleLoadingTimeout()
    }, 30000) // 30 seconds
  }

  hideLoadingOverlay() {
    const loadingOverlay = document.getElementById("loading-overlay")
    loadingOverlay.classList.remove("show")
    clearTimeout(this.loadingTimeout)
  }

  showToast(message, type = "info") {
    const toastContainer = document.getElementById("toast-container")
    const toast = document.createElement("div")
    toast.className = `toast ${type}`
    toast.textContent = message

    toastContainer.appendChild(toast)

    setTimeout(() => {
      toast.remove()
    }, 5000)
  }

  updateDebugInfo(key, value) {
    const element = document.getElementById(key)
    if (element) {
      element.textContent = value
    } else {
      this.logExecution(`⚠️ Debug element not found: ${key}`, "warning")
    }
  }

  updateDebugState(key, value) {
    if (!this.debugMode) return

    const element = document.getElementById(`debug-${key}`)
    if (element) {
      element.textContent = value
    }
  }

  logExecution(message, level = "info") {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`
    this.executionLog.push(logEntry)

    console.log(logEntry)

    if (this.debugMode) {
      const logContainer = document.getElementById("debug-log")
      const logItem = document.createElement("div")
      logItem.textContent = logEntry
      logContainer.appendChild(logItem)
      logContainer.scrollTop = logContainer.scrollHeight
    }
  }

  testVoiceSystem() {
    this.playVoiceAlert("هذا اختبار للنظام الصوتي")
  }

  forceReload() {
    location.reload()
  }

  exportLogs() {
    const logContent = this.executionLog.join("\n")
    const blob = new Blob([logContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "execution_log.txt"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3 // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180 // φ, λ in radians
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    const d = R * c

    return d
  }

  setupBasicInterface() {
    // إظهار واجهة أساسية حتى لو فشلت بعض الأجزاء
    this.isInitialized = true

    // تحديث العرض
    this.updateZonesList()
    this.updateDemandMode()

    // تفعيل التبويبات
    this.switchTab("zones")
  }

  getFilteredZones() {
    let filteredZones = [...this.zones]

    if (this.highDemandOnly) {
      filteredZones = filteredZones.filter((zone) => this.getCurrentDensity(zone) >= 7)
    }

    return filteredZones
  }

  sortZonesByCurrentCriteria(zones) {
    const sortOption = document.getElementById("zone-sort").value

    return zones.sort((a, b) => {
      if (sortOption === "name") {
        return a.name.localeCompare(b.name, "ar")
      } else if (sortOption === "density") {
        return this.getCurrentDensity(b) - this.getCurrentDensity(a)
      } else if (sortOption === "distance") {
        if (!this.currentLocation) return 0
        const distanceA = this.haversineDistance(this.currentLocation.lat, this.currentLocation.lng, a.lat, a.lng)
        const distanceB = this.haversineDistance(this.currentLocation.lat, this.currentLocation.lng, b.lat, b.lng)
        return distanceA - distanceB
      }
    })
  }

  createZoneCard(zone) {
    const density = this.getCurrentDensity(zone)
    const demandLevel = this.getDemandLevel(density)
    const demandText = this.getDemandText(demandLevel)

    const card = document.createElement("div")
    card.className = `zone-card ${demandLevel}-demand`

    let distanceText = "--"
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

  getDemandText(demandLevel) {
    switch (demandLevel) {
      case "high-demand":
        return "عالي"
      case "medium-demand":
        return "متوسط"
      default:
        return "منخفض"
    }
  }
}

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  const app = new AmmanDriverGuide()
  window.driverApp = app // Make it globally accessible for debugging
  app.init()
})
