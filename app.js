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

    // View mode settings
    this.viewMode = "map" // "map" or "text"
    this.autoSwitchToText = false
    this.textModeSpeed = 30 // km/h - switch to text mode above this speed
    this.lastKnownAddress = ""
    this.directionInstructions = ""

    // Share system
    this.shareModal = null
    this.addContactModal = null
    this.favoriteContacts = []
    this.activeShares = new Map()
    this.shareId = 0

    // Navigation system
    this.navigationActive = false
    this.navigationPanel = null
    this.currentRoute = null
    this.routeSteps = []
    this.currentStepIndex = 0
    this.navigationVoiceEnabled = true
    this.routeOverviewMode = false
    this.estimatedArrival = null
    this.routeDistance = 0
    this.routeDuration = 0
    this.lastNavigationUpdate = 0
    this.navigationUpdateInterval = null
    this.recalculationThreshold = 50 // meters

    // Bootstrap components
    this.toastInstance = null
    this.tooltips = []

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
    if (alertContainer) {
      alertContainer.textContent = message
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
      this.setupNavigationSystem()

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
      this.showToast("خطأ في تحميل التطبيق", "error")
    }
  }

  initializeBootstrapComponents() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    this.tooltips = tooltipTriggerList.map((tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl))

    // Initialize toast
    const toastElement = document.getElementById("toast")
    if (toastElement) {
      this.toastInstance = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: 4000,
      })
    }

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
    const voiceToggle = document.getElementById("voice-toggle")
    if (voiceToggle) {
      voiceToggle.addEventListener("click", () => {
        this.toggleVoice()
      })
    }

    // Emergency button
    const emergencyBtn = document.getElementById("emergency-btn")
    if (emergencyBtn) {
      emergencyBtn.addEventListener("click", () => {
        this.handleEmergency()
      })
    }

    // Navigation button
    const navigateBtn = document.getElementById("navigate-btn")
    if (navigateBtn) {
      navigateBtn.addEventListener("click", () => {
        this.startNavigation()
      })
    }

    // Refresh suggestion
    const refreshSuggestion = document.getElementById("refresh-suggestion")
    if (refreshSuggestion) {
      refreshSuggestion.addEventListener("click", () => {
        this.refreshSuggestion()
      })
    }

    // Quick action buttons
    const findNearest = document.getElementById("find-nearest")
    if (findNearest) {
      findNearest.addEventListener("click", () => {
        this.findNearestZone()
      })
    }

    const highDemandFilter = document.getElementById("high-demand-filter")
    if (highDemandFilter) {
      highDemandFilter.addEventListener("click", (e) => {
        this.toggleHighDemandFilter(e.target)
      })
    }

    const safetyMode = document.getElementById("safety-mode")
    if (safetyMode) {
      safetyMode.addEventListener("click", (e) => {
        this.toggleSafetyMode(e.target)
      })
    }

    // Settings event listeners
    const voiceEnabled = document.getElementById("voice-enabled")
    if (voiceEnabled) {
      voiceEnabled.addEventListener("change", (e) => {
        this.voiceEnabled = e.target.checked
        this.updateVoiceButton()
      })
    }

    const voiceVolume = document.getElementById("voice-volume")
    if (voiceVolume) {
      voiceVolume.addEventListener("input", (e) => {
        this.voiceVolume = e.target.value / 100
      })
    }

    const mapStyleSetting = document.getElementById("map-style-setting")
    if (mapStyleSetting) {
      mapStyleSetting.addEventListener("change", (e) => {
        this.changeMapStyle(e.target.value)
      })
    }

    const zoneSort = document.getElementById("zone-sort")
    if (zoneSort) {
      zoneSort.addEventListener("change", (e) => {
        this.sortZones(e.target.value)
      })
    }

    // Debug actions
    const testVoice = document.getElementById("test-voice")
    if (testVoice) {
      testVoice.addEventListener("click", () => {
        this.testVoiceSystem()
      })
    }

    const forceReload = document.getElementById("force-reload")
    if (forceReload) {
      forceReload.addEventListener("click", () => {
        this.forceReload()
      })
    }

    const exportLogs = document.getElementById("export-logs")
    if (exportLogs) {
      exportLogs.addEventListener("click", () => {
        this.exportLogs()
      })
    }

    // Setup view toggle
    this.setupViewToggle()

    // Share system
    this.setupShareSystem()

    this.logExecution("✅ Driver interface events configured", "success")
  }

  setupDriverInterface() {
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

  setupNavigationSystem() {
    this.logExecution("🧭 Setting up navigation system...", "info")

    // Get navigation panel element
    this.navigationPanel = document.getElementById("navigation-panel")

    // Set up event listeners for navigation controls
    const closeNavigation = document.getElementById("close-navigation")
    if (closeNavigation) {
      closeNavigation.addEventListener("click", () => {
        this.endNavigation()
      })
    }

    const recalculateRoute = document.getElementById("recalculate-route")
    if (recalculateRoute) {
      recalculateRoute.addEventListener("click", () => {
        this.recalculateRoute()
      })
    }

    const toggleVoiceNav = document.getElementById("toggle-voice-nav")
    if (toggleVoiceNav) {
      toggleVoiceNav.addEventListener("click", () => {
        this.toggleNavigationVoice()
      })
    }

    const showOverview = document.getElementById("show-overview")
    if (showOverview) {
      showOverview.addEventListener("click", () => {
        this.toggleRouteOverview()
      })
    }

    const endNavigation = document.getElementById("end-navigation")
    if (endNavigation) {
      endNavigation.addEventListener("click", () => {
        this.endNavigation()
      })
    }

    this.logExecution("✅ Navigation system ready", "success")
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
    if (btn) {
      const icon = btn.querySelector("i")
      if (this.voiceEnabled) {
        btn.classList.remove("btn-outline-secondary")
        btn.classList.add("btn-outline-success")
        if (icon) {
          icon.className = "bi bi-volume-up"
        }
      } else {
        btn.classList.remove("btn-outline-success")
        btn.classList.add("btn-outline-secondary")
        if (icon) {
          icon.className = "bi bi-volume-mute"
        }
      }
    }
  }

  handleEmergency() {
    this.playVoiceAlert("تم تفعيل وضع الطوارئ", "urgent")
    this.showToast("تم تفعيل وضع الطوارئ", "error")

    // Vibrate if supported
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

    // Start in-app navigation
    this.startInAppNavigation()
  }

  startInAppNavigation() {
    if (!this.suggestedZone || !this.currentLocation) {
      this.showToast("لا يمكن بدء التنقل. يرجى تحديد وجهة وموقع حالي", "error")
      return
    }

    this.navigationActive = true

    // Update UI
    const navigationDestination = document.getElementById("navigation-destination")
    if (navigationDestination) {
      navigationDestination.textContent = this.suggestedZone.name
    }

    if (this.navigationPanel) {
      this.navigationPanel.classList.remove("d-none")
      this.navigationPanel.classList.add("active")
    }

    const mapElement = document.getElementById("map")
    if (mapElement) {
      mapElement.classList.add("navigation-active")
    }

    // Calculate route
    this.calculateRoute()

    // Update navigation state
    this.updateNavigationState(true)

    // Announce start of navigation
    this.playVoiceAlert(`بدء التنقل إلى ${this.suggestedZone.name}`)

    // Start navigation updates
    this.startNavigationUpdates()

    this.logExecution(`🧭 In-app navigation started to ${this.suggestedZone.name}`, "info")
  }

  calculateRoute() {
    if (!this.currentLocation || !this.suggestedZone) return

    this.logExecution("🗺️ Calculating route...", "info")

    // Show loading state
    const instructionText = document.getElementById("instruction-text")
    if (instructionText) {
      instructionText.textContent = "جاري حساب المسار..."
    }

    // Simulate route calculation
    setTimeout(() => {
      this.createSimulatedRoute()
      this.displayRouteOnMap()
      this.updateNavigationInfo()
      this.startTurnByTurnGuidance()

      this.logExecution("✅ Route calculated and displayed", "success")
    }, 1500)
  }

  createSimulatedRoute() {
    const start = [this.currentLocation.lng, this.currentLocation.lat]
    const end = [this.suggestedZone.lng, this.suggestedZone.lat]

    // Create waypoints between start and end
    const numPoints = 10
    const waypoints = []

    for (let i = 1; i < numPoints; i++) {
      const ratio = i / numPoints
      const jitter = 0.002 * (Math.random() - 0.5)

      const lng = start[0] + (end[0] - start[0]) * ratio + jitter
      const lat = start[1] + (end[1] - start[1]) * ratio + jitter

      waypoints.push([lng, lat])
    }

    const coordinates = [start, ...waypoints, end]

    // Calculate distance and duration
    this.routeDistance =
      this.haversineDistance(
        this.currentLocation.lat,
        this.currentLocation.lng,
        this.suggestedZone.lat,
        this.suggestedZone.lng,
      ) / 1000

    this.routeDuration = (this.routeDistance / 30) * 60
    this.estimatedArrival = new Date(Date.now() + this.routeDuration * 60 * 1000)

    this.createRouteSteps(coordinates)

    this.currentRoute = {
      coordinates,
      distance: this.routeDistance,
      duration: this.routeDuration,
      estimatedArrival: this.estimatedArrival,
    }
  }

  createRouteSteps(coordinates) {
    this.routeSteps = []

    // First step
    this.routeSteps.push({
      type: "start",
      icon: "🚗",
      text: `انطلق باتجاه ${this.suggestedZone.name}`,
      distance: this.routeDistance * 1000,
      coordinates: coordinates[0],
    })

    // Create steps for waypoints
    for (let i = 1; i < coordinates.length - 1; i++) {
      const distance = this.haversineDistance(
        coordinates[i - 1][1],
        coordinates[i - 1][0],
        coordinates[i][1],
        coordinates[i][0],
      )

      this.routeSteps.push({
        type: "continue",
        icon: "⬆️",
        text: "استمر في الطريق الحالي",
        distance: distance,
        coordinates: coordinates[i],
      })
    }

    // Last step
    this.routeSteps.push({
      type: "arrive",
      icon: "🏁",
      text: `لقد وصلت إلى ${this.suggestedZone.name}`,
      distance: 0,
      coordinates: coordinates[coordinates.length - 1],
    })

    this.currentStepIndex = 0
  }

  displayRouteOnMap() {
    if (!this.currentRoute || !this.map) return

    // Update route source
    this.map.getSource("route").setData({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: this.currentRoute.coordinates,
      },
    })

    // Fit map to route
    this.fitMapToRoute()
  }

  fitMapToRoute() {
    if (!this.currentRoute || !this.map) return

    const coordinates = this.currentRoute.coordinates
    const bounds = coordinates.reduce((bounds, coord) => {
      return bounds.extend(coord)
    }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]))

    this.map.fitBounds(bounds, {
      padding: 80,
      maxZoom: 15,
      duration: 1000,
    })
  }

  updateNavigationInfo() {
    if (!this.currentRoute) return

    const distanceText =
      this.routeDistance < 1 ? `${Math.round(this.routeDistance * 1000)} م` : `${this.routeDistance.toFixed(1)} كم`

    const navigationDistance = document.getElementById("navigation-distance")
    if (navigationDistance) {
      navigationDistance.textContent = distanceText
    }

    const etaMinutes = Math.round(this.routeDuration)
    const navigationEta = document.getElementById("navigation-eta")
    if (navigationEta) {
      navigationEta.textContent = `${etaMinutes} دقيقة`
    }

    const progressBar = document.getElementById("navigation-progress-bar")
    if (progressBar) {
      progressBar.style.width = "0%"
      progressBar.setAttribute("aria-valuenow", "0")
    }

    const progressText = document.getElementById("navigation-progress-text")
    if (progressText) {
      progressText.textContent = "0% مكتمل"
    }
  }

  startTurnByTurnGuidance() {
    if (!this.routeSteps || this.routeSteps.length === 0) return

    this.updateCurrentInstruction()
  }

  updateCurrentInstruction() {
    if (!this.routeSteps || this.currentStepIndex >= this.routeSteps.length) return

    const currentStep = this.routeSteps[this.currentStepIndex]

    const instructionIcon = document.getElementById("instruction-icon")
    if (instructionIcon) {
      instructionIcon.textContent = currentStep.icon
    }

    const instructionText = document.getElementById("instruction-text")
    if (instructionText) {
      instructionText.textContent = currentStep.text
    }

    if (this.navigationVoiceEnabled) {
      this.playVoiceAlert(currentStep.text)
    }
  }

  startNavigationUpdates() {
    if (this.navigationUpdateInterval) {
      clearInterval(this.navigationUpdateInterval)
    }

    this.navigationUpdateInterval = setInterval(() => {
      this.updateNavigation()
    }, 1000)
  }

  updateNavigation() {
    if (!this.navigationActive || !this.currentLocation || !this.currentRoute) return

    this.updateRouteProgress()
    this.checkStepProgress()
  }

  updateRouteProgress() {
    if (!this.currentRoute || !this.currentLocation) return

    let distanceTraveled = 0

    if (this.currentStepIndex > 0) {
      for (let i = 0; i < this.currentStepIndex; i++) {
        distanceTraveled += this.routeSteps[i].distance
      }
    }

    const totalDistance = this.routeDistance * 1000
    const progressPercent = Math.min(100, Math.round((distanceTraveled / totalDistance) * 100))

    const progressBar = document.getElementById("navigation-progress-bar")
    if (progressBar) {
      progressBar.style.width = `${progressPercent}%`
      progressBar.setAttribute("aria-valuenow", progressPercent.toString())
    }

    const progressText = document.getElementById("navigation-progress-text")
    if (progressText) {
      progressText.textContent = `${progressPercent}% مكتمل`
    }
  }

  checkStepProgress() {
    if (!this.routeSteps || !this.currentLocation || this.currentStepIndex >= this.routeSteps.length) return

    const currentStep = this.routeSteps[this.currentStepIndex]
    const stepCoords = currentStep.coordinates
    const distanceToStep = this.haversineDistance(
      this.currentLocation.lat,
      this.currentLocation.lng,
      stepCoords[1],
      stepCoords[0],
    )

    if (distanceToStep < 30) {
      this.currentStepIndex++

      if (this.currentStepIndex >= this.routeSteps.length) {
        this.handleRouteCompletion()
      } else {
        this.updateCurrentInstruction()
      }
    }
  }

  handleRouteCompletion() {
    this.playVoiceAlert(`لقد وصلت إلى ${this.suggestedZone.name}`)
    this.showToast(`لقد وصلت إلى ${this.suggestedZone.name}`, "success")

    setTimeout(() => {
      this.endNavigation()
    }, 3000)
  }

  endNavigation() {
    this.navigationActive = false

    if (this.navigationPanel) {
      this.navigationPanel.classList.remove("active")
      this.navigationPanel.classList.add("d-none")
    }

    const mapElement = document.getElementById("map")
    if (mapElement) {
      mapElement.classList.remove("navigation-active")
    }

    if (this.navigationUpdateInterval) {
      clearInterval(this.navigationUpdateInterval)
      this.navigationUpdateInterval = null
    }

    // Clear route from map
    if (this.map && this.map.getSource("route")) {
      this.map.getSource("route").setData({
        type: "FeatureCollection",
        features: [],
      })
    }

    this.updateNavigationState(false)
    this.playVoiceAlert("تم إنهاء التنقل")

    this.logExecution("🏁 Navigation ended", "info")
  }

  recalculateRoute() {
    if (this.navigationActive) {
      this.calculateRoute()
      this.playVoiceAlert("تم إعادة حساب المسار")
    }
  }

  toggleNavigationVoice() {
    this.navigationVoiceEnabled = !this.navigationVoiceEnabled
    const message = this.navigationVoiceEnabled ? "تم تفعيل التوجيه الصوتي" : "تم إيقاف التوجيه الصوتي"
    this.showToast(message, "info")

    const btn = document.getElementById("toggle-voice-nav")
    if (btn) {
      const icon = btn.querySelector("i")
      if (this.navigationVoiceEnabled) {
        btn.classList.remove("btn-outline-secondary")
        btn.classList.add("btn-outline-success")
        if (icon) {
          icon.className = "bi bi-volume-up"
        }
      } else {
        btn.classList.remove("btn-outline-success")
        btn.classList.add("btn-outline-secondary")
        if (icon) {
          icon.className = "bi bi-volume-mute"
        }
      }
    }
  }

  toggleRouteOverview() {
    this.routeOverviewMode = !this.routeOverviewMode

    if (this.routeOverviewMode) {
      this.fitMapToRoute()
    } else {
      this.updateNavigationMapView()
    }
  }

  updateNavigationMapView() {
    if (!this.map || !this.currentLocation) return

    this.map.flyTo({
      center: [this.currentLocation.lng, this.currentLocation.lat],
      zoom: 16,
      duration: 1000,
    })
  }

  updateNavigationState(isNavigating) {
    const navigateBtn = document.getElementById("navigate-btn")
    if (navigateBtn) {
      const icon = navigateBtn.querySelector("i")
      if (isNavigating) {
        navigateBtn.innerHTML = '<i class="bi bi-navigation me-2"></i>جاري التنقل...'
        navigateBtn.classList.add("navigating")
      } else {
        navigateBtn.innerHTML = '<i class="bi bi-navigation me-2"></i>توجه الآن'
        navigateBtn.classList.remove("navigating")
      }
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

    if (this.highDemandOnly) {
      button.classList.remove("btn-outline-warning")
      button.classList.add("btn-warning")
    } else {
      button.classList.remove("btn-warning")
      button.classList.add("btn-outline-warning")
    }

    this.updateZoneMarkers()
    this.updateZonesList()

    const message = this.highDemandOnly ? "عرض المناطق ذات الطلب العالي فقط" : "عرض جميع المناطق"
    this.showToast(message, "info")
  }

  toggleSafetyMode(button) {
    this.safetyMode = !this.safetyMode
    button.classList.toggle("active", this.safetyMode)

    if (this.safetyMode) {
      button.classList.remove("btn-outline-success")
      button.classList.add("btn-success")
      document.body.classList.add("safety-mode")
    } else {
      button.classList.remove("btn-success")
      button.classList.add("btn-outline-success")
      document.body.classList.remove("safety-mode")
    }

    const message = this.safetyMode ? "تم تفعيل وضع الأمان" : "تم إيقاف وضع الأمان"
    this.showToast(message, "info")
    this.playVoiceAlert(message)
  }

  selectZone() {
    this.suggestedZone = zone
    this.updateSuggestedZoneDisplay()

    const navigateBtn = document.getElementById("navigate-btn")
    if (navigateBtn) {
      navigateBtn.disabled = false
    }

    this.highlightZoneOnMap(zone)
    this.playVoiceAlert(`تم اختيار ${zone.name} كمنطقة مقترحة`)
    this.showToast(`تم اختيار ${zone.name}`, "success")
  }

  updateSuggestedZoneDisplay() {
    if (!this.suggestedZone) {
      const suggestedZoneDisplay = document.getElementById("suggested-zone-display")
      if (suggestedZoneDisplay) {
        suggestedZoneDisplay.textContent = "لا توجد منطقة مقترحة"
      }
      return
    }

    const zone = this.suggestedZone
    const density = this.getCurrentDensity(zone)

    const suggestedZoneDisplay = document.getElementById("suggested-zone-display")
    if (suggestedZoneDisplay) {
      suggestedZoneDisplay.textContent = zone.name
    }

    const demandLevel = document.getElementById("demand-level")
    if (demandLevel) {
      demandLevel.textContent = density

      // Update badge color based on demand level
      demandLevel.className = "badge rounded-pill fs-6"
      const level = this.getDemandLevel(density)
      if (level === "high") {
        demandLevel.classList.add("bg-success")
      } else if (level === "medium") {
        demandLevel.classList.add("bg-warning")
      } else {
        demandLevel.classList.add("bg-danger")
      }
    }

    if (this.currentLocation) {
      const distance =
        this.haversineDistance(this.currentLocation.lat, this.currentLocation.lng, zone.lat, zone.lng) / 1000

      const suggestedDistance = document.getElementById("suggested-distance")
      if (suggestedDistance) {
        suggestedDistance.textContent = distance < 1 ? `${Math.round(distance * 1000)} م` : `${distance.toFixed(1)} كم`
      }

      const eta = Math.round((distance / 30) * 60)
      const suggestedEta = document.getElementById("suggested-eta")
      if (suggestedEta) {
        suggestedEta.textContent = eta < 1 ? "< 1 دقيقة" : `${eta} دقيقة`
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
      }
    }
  }

  handleLocationError(error) {
    this.logExecution(`❌ Location error: ${error.message}`, "error")

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
      const currentAreaDisplay = document.getElementById("current-area-display")
      if (currentAreaDisplay) {
        currentAreaDisplay.textContent = "غير محدد"
      }
      return
    }

    const nearest = this.findNearestZone(this.currentLocation)
    if (nearest) {
      const distance =
        this.haversineDistance(this.currentLocation.lat, this.currentLocation.lng, nearest.lat, nearest.lng) / 1000

      const distanceText = distance < 1 ? `${Math.round(distance * 1000)} م` : `${distance.toFixed(1)} كم`

      const currentAreaDisplay = document.getElementById("current-area-display")
      if (currentAreaDisplay) {
        currentAreaDisplay.textContent = `${nearest.name} (${distanceText})`
      }
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

    if (!this.navigationActive) {
      this.map.flyTo({
        center: [this.currentLocation.lng, this.currentLocation.lat],
        zoom: 15,
        duration: 1000,
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

    this.map.getSource("zones").setData({
      type: "FeatureCollection",
      features: zoneFeatures,
    })
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

    let badgeClass = "bg-danger"
    if (demandLevel === "high") badgeClass = "bg-success"
    else if (demandLevel === "medium") badgeClass = "bg-warning"

    card.innerHTML = `
      <div class="card zone-card h-100">
        <div class="card-body">
          <div class="zone-card-header">
            <h6 class="zone-name card-title mb-1">${zone.name}</h6>
            <span class="badge ${badgeClass} zone-demand-badge">${demandText}</span>
          </div>
          <div class="zone-info">
            <small class="text-muted">الطلب: ${density}</small>
            <small class="text-muted">${distanceText}</small>
          </div>
          ${zone.safety_rating ? `<div class="zone-safety mt-1"><small class="text-success">الأمان: ${zone.safety_rating}/10</small></div>` : ""}
        </div>
      </div>
    `

    card.addEventListener("click", () => {
      this.selectZone(zone)
    })

    return card
  }

  sortZonesByCurrentCriteria(zones) {
    const sortBy = document.getElementById("zone-sort")?.value || "demand"

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

    const demandModeDisplay = document.getElementById("demand-mode-display")
    if (demandModeDisplay) {
      demandModeDisplay.textContent = `${mode} (${currentTime})`
    }
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

  setupViewToggle() {
    const viewToggleBtn = document.getElementById("view-toggle")
    if (viewToggleBtn) {
      viewToggleBtn.addEventListener("click", () => {
        this.toggleViewMode()
      })
    }
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
    const locationCard = document.querySelector(".location-display-card")
    const viewToggleBtn = document.getElementById("view-toggle")

    if (this.viewMode === "text") {
      if (container) container.classList.add("text-only-mode")
      if (map) map.classList.add("minimized")
      if (locationCard) {
        locationCard.classList.remove("d-none")
        locationCard.classList.add("active")
      }
      if (viewToggleBtn) {
        const icon = viewToggleBtn.querySelector("i")
        if (icon) icon.className = "bi bi-phone"
        viewToggleBtn.classList.add("text-mode")
      }
    } else {
      if (container) container.classList.remove("text-only-mode")
      if (map) map.classList.remove("minimized")
      if (locationCard) {
        locationCard.classList.add("d-none")
        locationCard.classList.remove("active")
      }
      if (viewToggleBtn) {
        const icon = viewToggleBtn.querySelector("i")
        if (icon) icon.className = "bi bi-map"
        viewToggleBtn.classList.remove("text-mode")
      }
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
  }

  setupShareSystem() {
    // Setup share button event listeners
    const shareButtons = ["share-whatsapp", "share-telegram", "share-sms", "share-copy", "share-email", "share-maps"]

    shareButtons.forEach((buttonId) => {
      const button = document.getElementById(buttonId)
      if (button) {
        button.addEventListener("click", () => {
          this.handleShareAction(buttonId)
        })
      }
    })

    this.logExecution("📱 Share system initialized", "info")
  }

  handleShareAction(action) {
    if (!this.currentLocation) {
      this.showToast("لا يمكن مشاركة الموقع. الموقع غير محدد", "warning")
      return
    }

    const locationText = `موقعي الحالي: https://maps.google.com/maps?q=${this.currentLocation.lat},${this.currentLocation.lng}`

    switch (action) {
      case "share-whatsapp":
        window.open(`https://wa.me/?text=${encodeURIComponent(locationText)}`, "_blank")
        break
      case "share-telegram":
        window.open(`https://t.me/share/url?url=${encodeURIComponent(locationText)}`, "_blank")
        break
      case "share-sms":
        window.open(`sms:?body=${encodeURIComponent(locationText)}`, "_blank")
        break
      case "share-copy":
        navigator.clipboard.writeText(locationText).then(() => {
          this.showToast("تم نسخ الرابط", "success")
        })
        break
      case "share-email":
        window.open(`mailto:?subject=موقعي الحالي&body=${encodeURIComponent(locationText)}`, "_blank")
        break
      case "share-maps":
        window.open(`https://maps.google.com/maps?q=${this.currentLocation.lat},${this.currentLocation.lng}`, "_blank")
        break
    }

    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById("shareModal"))
    if (modal) {
      modal.hide()
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
      overlay.classList.remove("d-none")
    }
  }

  hideLoadingOverlay() {
    const overlay = document.getElementById("loading-overlay")
    if (overlay) {
      overlay.classList.add("d-none")
    }
  }

  showToast(message, type = "info") {
    const toast = document.getElementById("toast")
    if (toast && this.toastInstance) {
      const toastBody = toast.querySelector(".toast-body")
      const toastHeader = toast.querySelector(".toast-header")

      if (toastBody) {
        toastBody.textContent = message
      }

      // Update icon based on type
      const icon = toastHeader?.querySelector("i")
      if (icon) {
        icon.className = `bi me-2`
        switch (type) {
          case "success":
            icon.classList.add("bi-check-circle-fill", "text-success")
            break
          case "error":
            icon.classList.add("bi-exclamation-triangle-fill", "text-danger")
            break
          case "warning":
            icon.classList.add("bi-exclamation-triangle-fill", "text-warning")
            break
          default:
            icon.classList.add("bi-info-circle-fill", "text-primary")
        }
      }

      // Add type class to toast
      toast.className = `toast ${type}`

      this.toastInstance.show()
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
