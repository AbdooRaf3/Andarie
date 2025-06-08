class AmmanDriverGuide {
  constructor() {
    this.map = null
    this.currentLocation = null
    this.zones = []
    this.markers = new Map() // Using Map for better marker management
    this.currentLocationMarker = null
    this.currentLocationSource = null
    this.accuracyCircleSource = null
    this.highDemandOnly = false
    this.executionLog = []
    this.isInitialized = false
    this.geolocationWatchId = null
    this.debugMode = true
    this.loadingTimeout = null
    this.currentMapStyle = "osm"
    this.initializationSteps = {
      environment: false,
      data: false,
      map: false,
      events: false,
      demand: false,
    }
    this.locationUpdateInterval = null
    this.locationAccuracyThreshold = 50
    this.highAccuracyThreshold = 20
    this.locationUpdateFrequency = 10000
    this.maxLocationAge = 30000
    this.locationRetryAttempts = 5
    this.locationValidationEnabled = true
    this.realTimeTrackingEnabled = true
    this.addressCacheTimeout = 300000
    this.addressCache = new Map()
    this.lastKnownAccurateLocation = null
    this.locationConfidenceScore = 0
    this.movementDetectionThreshold = 10
    this.locationStabilityBuffer = []
    this.maxStabilityBufferSize = 5
    this.reverseGeocodingEnabled = true
    this.locationHistory = []
    this.maxLocationHistorySize = 5

    // MapLibre GL JS specific properties
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
            attribution:
              "Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
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

    this.logExecution("🚀 System initialized with MapLibre GL JS", "info")
    this.updateDebugState("app-state", "تهيئة")
    this.updateDebugState("network-state", navigator.onLine ? "متصل" : "غير متصل")
    this.checkBrowserCompatibility()
  }

  updateDebugState(elementId, value) {
    const element = document.getElementById(elementId)
    if (element) {
      element.textContent = value
    }
  }

  checkBrowserCompatibility() {
    this.logExecution("🔍 Checking browser compatibility for MapLibre GL JS...", "info")

    const checks = {
      webgl: this.checkWebGLSupport(),
      geolocation: !!navigator.geolocation,
      fetch: !!window.fetch,
      localStorage: !!window.localStorage,
      maplibre: !!window.maplibregl,
    }

    this.logExecution(`Browser checks: ${JSON.stringify(checks)}`, "info")

    if (!checks.webgl) {
      this.logExecution("❌ WebGL not supported - MapLibre GL JS requires WebGL", "error")
      this.showToast("متصفحك لا يدعم WebGL المطلوب للخريطة", "error")
      return false
    }

    if (!checks.geolocation) {
      this.logExecution("❌ Geolocation API not supported", "error")
      this.showToast("متصفحك لا يدعم تحديد الموقع", "error")
      return false
    }

    if (location.protocol !== "https:" && location.hostname !== "localhost") {
      this.logExecution("⚠️ HTTPS required for geolocation in production", "warning")
      this.showToast("يتطلب تحديد الموقع اتصال آمن (HTTPS)", "warning")
    }

    if ("permissions" in navigator) {
      this.checkGeolocationPermission()
    }

    this.logExecution("✅ Browser compatibility check complete", "success")
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
      this.logExecution("🚀 Starting application initialization with MapLibre GL JS...", "info")
      this.updateSystemStatus("جاري التحميل...", "loading")
      this.updateDebugState("app-state", "جاري التحميل")

      this.loadingTimeout = setTimeout(() => {
        this.handleLoadingTimeout()
      }, 30000)

      // Step 1: Environment Setup
      this.logExecution("📋 Step 1: Environment setup...", "info")
      if (!this.checkBrowserCompatibility()) {
        throw new Error("Browser compatibility check failed")
      }
      this.initializationSteps.environment = true
      this.logExecution("✅ Step 1: Environment setup complete", "success")

      // Step 2: Data Loading
      this.logExecution("📊 Step 2: Loading zones data...", "info")
      this.updateDebugState("data-state", "جاري التحميل")
      await this.loadZones()
      this.initializationSteps.data = true

      // Step 3: Map Initialization
      this.logExecution("🗺️ Step 3: Initializing MapLibre GL JS map...", "info")
      this.updateDebugState("map-state", "جاري التهيئة")
      await this.initMap()
      this.initializationSteps.map = true

      // Step 4: Setup Event Listeners
      this.logExecution("🎛️ Step 4: Setting up event listeners...", "info")
      this.setupEventListeners()
      this.initializationSteps.events = true

      // Step 5: Update Demand Mode
      this.logExecution("⏰ Step 5: Updating demand mode...", "info")
      this.updateDemandMode()
      this.initializationSteps.demand = true

      if (this.loadingTimeout) {
        clearTimeout(this.loadingTimeout)
        this.loadingTimeout = null
      }

      this.isInitialized = true
      this.updateSystemStatus("جاهز للاستخدام", "ready")
      this.updateDebugState("app-state", "جاهز")
      this.logExecution("🎉 Application initialization complete with MapLibre GL JS!", "success")

      this.hideLoading()
      this.loadLocationHistory()

      setTimeout(() => {
        this.startLocationTracking()
      }, 1000)
    } catch (error) {
      this.logExecution(`❌ Initialization error: ${error.message}`, "error")
      this.updateSystemStatus("خطأ في التحميل", "error")
      this.updateDebugState("app-state", "خطأ")
      this.showToast("خطأ في تحميل التطبيق", "error")
      this.hideLoading()
      console.error("Initialization error:", error)
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
      this.logExecution("📊 Loading zones data...", "info")
      this.updateDebugState("data-state", "جاري التحميل")

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      try {
        this.logExecution("🌐 Attempting to fetch zones.json...", "info")
        const response = await fetch("zones.json", {
          signal: controller.signal,
          cache: "no-cache",
          headers: {
            "Content-Type": "application/json",
          },
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()

        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("Invalid data format or empty array")
        }

        this.zones = data
        this.logExecution(`✅ Loaded ${this.zones.length} zones from zones.json`, "success")
        this.updateDebugState("data-state", `تم تحميل ${this.zones.length} منطقة`)
      } catch (fetchError) {
        clearTimeout(timeoutId)
        this.logExecution(`⚠️ Failed to load zones.json: ${fetchError.message}`, "warning")
        this.logExecution("🔄 Falling back to sample data...", "info")

        this.zones = this.getSampleZones()
        this.logExecution(`✅ Loaded ${this.zones.length} sample zones`, "success")
        this.updateDebugState("data-state", `بيانات تجريبية (${this.zones.length} منطقة)`)
      }

      this.validateZoneData()
    } catch (error) {
      this.logExecution(`❌ Data loading error: ${error.message}`, "error")
      this.updateDebugState("data-state", "خطأ في التحميل")
      throw error
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

  getSampleZones() {
    return [
      {
        name: "الصويفية",
        lat: 31.9552,
        lng: 35.8617,
        density_peak: 9,
        density_off: 4,
      },
      {
        name: "عبدون",
        lat: 31.9539,
        lng: 35.8793,
        density_peak: 8,
        density_off: 3,
      },
      {
        name: "الدوار السابع",
        lat: 31.9515,
        lng: 35.9239,
        density_peak: 7,
        density_off: 5,
      },
      {
        name: "جبل عمان",
        lat: 31.9515,
        lng: 35.9239,
        density_peak: 6,
        density_off: 3,
      },
      {
        name: "الشميساني",
        lat: 31.9613,
        lng: 35.8907,
        density_peak: 8,
        density_off: 4,
      },
      {
        name: "تلاع العلي",
        lat: 31.9723,
        lng: 35.837,
        density_peak: 7,
        density_off: 2,
      },
      {
        name: "مرج الحمام",
        lat: 31.8629,
        lng: 35.8564,
        density_peak: 6,
        density_off: 4,
      },
      {
        name: "الجبيهة",
        lat: 32.0108,
        lng: 35.8728,
        density_peak: 5,
        density_off: 3,
      },
    ]
  }

  async initMap() {
    return new Promise((resolve, reject) => {
      try {
        this.logExecution("🗺️ Initializing MapLibre GL JS map...", "info")
        this.updateDebugState("map-state", "جاري التهيئة")

        if (typeof maplibregl === "undefined") {
          throw new Error("MapLibre GL JS library not loaded")
        }

        this.cleanupMap()

        const mapContainer = document.getElementById("map")
        if (mapContainer) {
          mapContainer.innerHTML = ""
        }

        // Initialize MapLibre GL JS map
        this.map = new maplibregl.Map({
          container: "map",
          style: this.mapStyles[this.currentMapStyle],
          center: [35.9106, 31.9539], // Amman center [lng, lat]
          zoom: 12,
          minZoom: 10,
          maxZoom: 18,
          attributionControl: true,
          logoPosition: "bottom-left",
        })

        // Add navigation controls
        this.map.addControl(new maplibregl.NavigationControl(), "top-right")

        // Add scale control
        this.map.addControl(
          new maplibregl.ScaleControl({
            maxWidth: 100,
            unit: "metric",
          }),
          "bottom-left",
        )

        // Add geolocate control
        const geolocateControl = new maplibregl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true,
          },
          trackUserLocation: true,
          showUserHeading: true,
        })
        this.map.addControl(geolocateControl, "top-right")

        // Map event handlers
        this.map.on("load", () => {
          this.logExecution("✅ MapLibre GL JS map loaded successfully", "success")
          this.updateDebugState("map-state", "تم التحميل")

          // Add data sources and layers
          this.setupMapSources()
          this.updateZoneMarkers()

          resolve()
        })

        this.map.on("error", (error) => {
          this.logExecution(`❌ Map error: ${error.error}`, "error")
          reject(error.error)
        })

        this.map.on("click", (e) => {
          if (this.debugMode) {
            this.logExecution(`🗺️ Map clicked at: ${e.lngLat.lat.toFixed(6)}, ${e.lngLat.lng.toFixed(6)}`, "info")
          }
        })

        this.map.on("zoomend", () => {
          this.logExecution(`🔍 Map zoom level: ${this.map.getZoom().toFixed(2)}`, "info")
        })

        this.map.on("moveend", () => {
          const center = this.map.getCenter()
          this.logExecution(`🗺️ Map center: ${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`, "info")
        })

        this.logExecution("✅ MapLibre GL JS map initialization complete", "success")
      } catch (error) {
        this.logExecution(`❌ Map initialization error: ${error.message}`, "error")
        this.updateDebugState("map-state", "خطأ")
        reject(error)
      }
    })
  }

  setupMapSources() {
    // Add sources for zones and current location
    this.map.addSource("zones", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    })

    this.map.addSource("current-location", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    })

    this.map.addSource("accuracy-circle", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    })

    // Add layers for zones
    this.map.addLayer({
      id: "zones-layer",
      type: "circle",
      source: "zones",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 8, 15, 15, 18, 25],
        "circle-color": [
          "case",
          [">=", ["get", "density"], 7],
          "#4CAF50", // High demand - green
          [">=", ["get", "density"], 4],
          "#FF9800", // Medium demand - orange
          "#f44336", // Low demand - red
        ],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.8,
      },
    })

    // Add layer for accuracy circle
    this.map.addLayer({
      id: "accuracy-circle-layer",
      type: "fill",
      source: "accuracy-circle",
      paint: {
        "fill-color": "#4285F4",
        "fill-opacity": 0.15,
      },
    })

    this.map.addLayer({
      id: "accuracy-circle-stroke",
      type: "line",
      source: "accuracy-circle",
      paint: {
        "line-color": "#4285F4",
        "line-width": 1,
        "line-opacity": 0.8,
      },
    })

    // Add layer for current location
    this.map.addLayer({
      id: "current-location-layer",
      type: "circle",
      source: "current-location",
      paint: {
        "circle-radius": 12,
        "circle-color": "#4361ee",
        "circle-stroke-width": 3,
        "circle-stroke-color": "#ffffff",
      },
    })

    // Add click handlers for zones
    this.map.on("click", "zones-layer", (e) => {
      const feature = e.features[0]
      const coordinates = feature.geometry.coordinates.slice()
      const properties = feature.properties

      // Create popup content
      const popupContent = `
        <div style="text-align: center; font-family: var(--font-family);">
          <strong style="font-size: 16px;">${properties.name}</strong><br/>
          <div style="margin: 8px 0;">
            مستوى الطلب: <span style="font-weight: bold; color: ${this.getDemandColor(properties.density)};">${properties.density}</span>
            ${properties.distance ? `<br/>المسافة: ${properties.distance}` : ""}
          </div>
          <button onclick="window.driverGuide.navigateToZone(${coordinates[1]}, ${coordinates[0]})" 
                  style="margin-top: 10px; padding: 8px 15px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
            التوجه للمنطقة
          </button>
        </div>
      `

      new maplibregl.Popup().setLngLat(coordinates).setHTML(popupContent).addTo(this.map)
    })

    // Change cursor on hover
    this.map.on("mouseenter", "zones-layer", () => {
      this.map.getCanvas().style.cursor = "pointer"
    })

    this.map.on("mouseleave", "zones-layer", () => {
      this.map.getCanvas().style.cursor = ""
    })
  }

  getDemandColor(density) {
    if (density >= 7) return "#4CAF50"
    if (density >= 4) return "#FF9800"
    return "#f44336"
  }

  setupEventListeners() {
    this.logExecution("🎛️ Setting up event listeners...", "info")

    // Refresh location button
    document.getElementById("refresh-location").addEventListener("click", () => {
      this.getCurrentLocationWithRetry()
    })

    // Start app button
    document.getElementById("start-app").addEventListener("click", () => {
      this.startFullExecution()
    })

    // Test data button
    document.getElementById("test-data").addEventListener("click", () => {
      this.testDataLoading()
    })

    // Force reload button
    document.getElementById("force-reload").addEventListener("click", () => {
      this.forceReload()
    })

    // Toggle style button
    document.getElementById("toggle-style").addEventListener("click", () => {
      this.toggleMapStyle()
    })

    // High demand filter
    document.getElementById("high-demand-only").addEventListener("change", (e) => {
      this.highDemandOnly = e.target.checked
      this.logExecution(`Filter changed: High demand only = ${this.highDemandOnly}`, "info")
      this.updateZoneList()
      this.updateZoneMarkers()
    })

    // Network status monitoring
    window.addEventListener("online", () => {
      this.logExecution("🌐 Network connection restored", "success")
      this.updateDebugState("network-state", "متصل")
      this.showToast("تم استعادة الاتصال بالإنترنت", "success")
    })

    window.addEventListener("offline", () => {
      this.logExecution("🌐 Network connection lost", "warning")
      this.updateDebugState("network-state", "غير متصل")
      this.showToast("انقطع الاتصال بالإنترنت", "warning")
    })

    // Handle page visibility changes
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        this.logExecution("📱 App is visible, resuming location updates", "info")
        this.startLocationTracking()
      } else {
        this.logExecution("📱 App is hidden, pausing location updates", "info")
        this.stopLocationTracking()
      }
    })

    // Handle before unload to save location history
    window.addEventListener("beforeunload", () => {
      this.saveLocationHistory()
    })

    this.logExecution("✅ Event listeners configured", "success")
  }

  toggleMapStyle() {
    const styles = Object.keys(this.mapStyles)
    const currentIndex = styles.indexOf(this.currentMapStyle)
    const nextIndex = (currentIndex + 1) % styles.length
    this.currentMapStyle = styles[nextIndex]

    this.logExecution(`🗺️ Switching to map style: ${this.currentMapStyle}`, "info")

    if (this.map) {
      this.map.setStyle(this.mapStyles[this.currentMapStyle])

      // Re-add sources and layers after style change
      this.map.once("styledata", () => {
        this.setupMapSources()
        this.updateZoneMarkers()
        this.updateCurrentLocationOnMap()
      })
    }

    this.showToast(`تم تغيير نمط الخريطة إلى: ${this.getStyleName(this.currentMapStyle)}`, "info")
  }

  getStyleName(style) {
    const names = {
      osm: "الخريطة العادية",
      satellite: "صور الأقمار الصناعية",
      dark: "الخريطة الداكنة",
    }
    return names[style] || style
  }

  testDataLoading() {
    this.logExecution("🧪 Testing data loading...", "info")

    if (!navigator.onLine) {
      this.showToast("لا يوجد اتصال بالإنترنت", "error")
      return
    }

    fetch("zones.json")
      .then((response) => {
        this.logExecution(`📡 Fetch response status: ${response.status}`, "info")
        return response.json()
      })
      .then((data) => {
        this.logExecution(`✅ Test successful: ${data.length} zones loaded`, "success")
        this.showToast("اختبار البيانات نجح", "success")
      })
      .catch((error) => {
        this.logExecution(`❌ Test failed: ${error.message}`, "error")
        this.showToast("فشل اختبار البيانات", "error")
      })
  }

  forceReload() {
    this.logExecution("🔄 Force reloading application...", "info")
    this.updateDebugState("app-state", "إعادة تحميل قسري")

    try {
      this.stopLocationTracking()

      if (this.loadingTimeout) {
        clearTimeout(this.loadingTimeout)
        this.loadingTimeout = null
      }

      this.initializationSteps = {
        environment: false,
        data: false,
        map: false,
        events: false,
        demand: false,
      }

      this.cleanupMap()
      this.zones = []
      this.currentLocation = null
      this.isInitialized = false

      this.updateSystemStatus("جاري إعادة التحميل...", "loading")
      this.updateDebugState("data-state", "إعادة تعيين")
      this.updateDebugState("map-state", "إعادة تعيين")
      this.updateDebugState("location-state", "إعادة تعيين")

      const zoneList = document.getElementById("zone-list")
      if (zoneList) {
        zoneList.innerHTML = ""
      }

      document.getElementById("current-area").textContent = "جاري التحديد..."
      document.getElementById("suggested-zone").textContent = "جاري البحث..."
      document.getElementById("demand-mode").textContent = ""

      this.showLoading()
      this.logExecution("🔄 Application state reset complete", "success")

      setTimeout(() => {
        this.logExecution("🚀 Restarting initialization...", "info")
        this.init().catch((error) => {
          this.logExecution(`❌ Force reload failed: ${error.message}`, "error")
          this.showToast("فشل في إعادة التحميل القسري", "error")
          this.updateSystemStatus("خطأ في إعادة التحميل", "error")
          this.updateDebugState("app-state", "خطأ")
        })
      }, 1000)
    } catch (error) {
      this.logExecution(`❌ Force reload error: ${error.message}`, "error")
      this.showToast("خطأ في إعادة التحميل القسري", "error")
      this.updateSystemStatus("خطأ في إعادة التحميل", "error")
      this.updateDebugState("app-state", "خطأ")
    }
  }

  cleanupMap() {
    if (!this.map) return

    try {
      this.markers.clear()
      this.currentLocationMarker = null
      this.map.remove()
      this.map = null
      this.logExecution("🗺️ MapLibre GL JS map cleanup completed", "success")
    } catch (error) {
      this.logExecution(`⚠️ Map cleanup error: ${error.message}`, "warning")
    }
  }

  showLoading() {
    const loadingElement = document.getElementById("loading")
    if (loadingElement) {
      loadingElement.style.display = "flex"
    }
  }

  hideLoading() {
    const loadingElement = document.getElementById("loading")
    if (loadingElement) {
      loadingElement.style.display = "none"
    }
  }

  async startFullExecution() {
    this.logExecution("🚀 Starting full application execution...", "info")

    try {
      if (!this.isInitialized) {
        this.showToast("التطبيق لم يتم تحميله بعد", "warning")
        return
      }

      this.logExecution("📍 Step 3: Activating geolocation...", "info")
      await this.getCurrentLocationPromise()

      this.logExecution("⏰ Step 5: Calculating real-time demand...", "info")
      this.updateDemandMode()
      this.calculateHighDemandZones()

      this.logExecution("🖥️ Step 6: Updating user interface...", "info")
      this.updateCurrentArea()
      this.updateSuggestedZone()
      this.updateZoneList()

      this.logExecution("🎮 Step 7: Interactive features activated", "info")

      this.logExecution("🎮 Step 7: Interactive features activated", "info")

      this.logExecution("🧪 Step 8: Running validation tests...", "info")
      this.runValidationTests()

      this.startLocationTracking()

      this.logExecution("🎉 Full execution completed successfully!", "success")
      this.showToast("تم تشغيل التطبيق بنجاح!", "success")
    } catch (error) {
      this.logExecution(`❌ Execution error: ${error.message}`, "error")
      this.showToast("خطأ في تشغيل التطبيق", "error")
    }
  }

  startLocationTracking() {
    this.stopLocationTracking()

    if (!this.realTimeTrackingEnabled) {
      this.logExecution("📍 Real-time tracking disabled", "info")
      return
    }

    this.logExecution("🔄 Starting enhanced real-time location tracking...", "info")

    if (navigator.geolocation) {
      const watchOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }

      this.geolocationWatchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
          }

          if (this.validateLocationAccuracy(newLocation)) {
            const hasMovedSignificantly = this.detectSignificantMovement(newLocation)

            if (hasMovedSignificantly || !this.currentLocation) {
              this.logExecution(
                `📍 Real-time update: ${newLocation.lat.toFixed(8)}, ${newLocation.lng.toFixed(8)} (accuracy: ${newLocation.accuracy.toFixed(1)}m, confidence: ${this.calculateLocationConfidence(newLocation).toFixed(1)})`,
                "info",
              )

              this.processAccurateLocation(newLocation, () => {})
              this.addToLocationHistory(newLocation)
              this.updateLocationWithMovementIndicator(newLocation)
            }
          } else {
            this.logExecution(`⚠️ Real-time location rejected: accuracy ${newLocation.accuracy}m`, "warning")
          }
        },
        (error) => {
          this.logExecution(`❌ Real-time tracking error: ${error.message}`, "error")
          this.handleTrackingError(error)
        },
        watchOptions,
      )

      this.locationUpdateInterval = setInterval(() => {
        if (this.currentLocation) {
          const age = Date.now() - this.currentLocation.timestamp
          if (age > this.maxLocationAge) {
            this.logExecution("🔄 Location too old, requesting fresh location...", "info")
            this.getCurrentLocationWithRetry(1)
          }
        }
      }, this.locationUpdateFrequency)
    }
  }

  stopLocationTracking() {
    if (this.geolocationWatchId !== null) {
      navigator.geolocation.clearWatch(this.geolocationWatchId)
      this.geolocationWatchId = null
      this.logExecution("🛑 Continuous location tracking stopped", "info")
    }

    if (this.locationUpdateInterval) {
      clearInterval(this.locationUpdateInterval)
      this.locationUpdateInterval = null
    }
  }

  hasLocationChangedSignificantly(oldLocation, newLocation) {
    const distance = this.haversineDistance(oldLocation.lat, oldLocation.lng, newLocation.lat, newLocation.lng)
    const significantDistance = Math.max(newLocation.accuracy, 50)
    return distance > significantDistance
  }

  addToLocationHistory(location) {
    this.locationHistory.unshift({
      ...location,
      timestamp: Date.now(),
    })

    if (this.locationHistory.length > this.maxLocationHistorySize) {
      this.locationHistory = this.locationHistory.slice(0, this.maxLocationHistorySize)
    }
  }

  saveLocationHistory() {
    try {
      if (window.localStorage) {
        localStorage.setItem("locationHistory", JSON.stringify(this.locationHistory))
      }
    } catch (error) {
      this.logExecution(`⚠️ Failed to save location history: ${error.message}`, "warning")
    }
  }

  loadLocationHistory() {
    try {
      if (window.localStorage) {
        const savedHistory = localStorage.getItem("locationHistory")
        if (savedHistory) {
          this.locationHistory = JSON.parse(savedHistory)
          this.logExecution(`📍 Loaded ${this.locationHistory.length} location history entries`, "info")
        }
      }
    } catch (error) {
      this.logExecution(`⚠️ Failed to load location history: ${error.message}`, "warning")
    }
  }

  getCurrentLocationWithRetry(maxRetries = 3) {
    this.logExecution(`📍 Starting location detection (max retries: ${maxRetries})...`, "info")
    this.updateDebugState("location-state", "جاري التحديد")

    let attempts = 0

    const attemptLocation = () => {
      attempts++
      this.logExecution(`📍 Location attempt ${attempts}/${maxRetries}`, "info")

      this.getCurrentLocationPromise()
        .then((location) => {
          this.logExecution(`✅ Location acquired on attempt ${attempts}`, "success")
          this.updateDebugState("location-state", "تم التحديد")

          this.addToLocationHistory(location)
          this.updateCurrentArea()
          this.updateSuggestedZone()
          this.updateZoneList()

          this.showToast("تم تحديد موقعك بنجاح", "success")
        })
        .catch((error) => {
          this.logExecution(`❌ Location attempt ${attempts} failed: ${error.message}`, "error")

          if (attempts < maxRetries) {
            this.logExecution(`🔄 Retrying in 2 seconds...`, "info")
            setTimeout(attemptLocation, 2000)
          } else {
            this.logExecution(`❌ All location attempts failed`, "error")
            this.updateDebugState("location-state", "فشل")
            this.handleLocationFailure(error)
          }
        })
    }

    attemptLocation()
  }

  getCurrentLocationPromise() {
    return new Promise((resolve, reject) => {
      if (!navigator.onLine) {
        const error = new Error("No internet connection")
        this.logExecution("❌ No internet connection for geolocation", "error")
        reject(error)
        return
      }

      if (!navigator.geolocation) {
        const error = new Error("Geolocation not supported")
        this.logExecution("❌ Geolocation not supported by browser", "error")
        reject(error)
        return
      }

      this.logExecution("📡 Requesting high-accuracy geolocation...", "info")
      this.showToast("جاري تحديد موقعك بدقة عالية...", "info")

      const options = {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: this.maxLocationAge,
      }

      this.logExecution(`📍 Enhanced geolocation options: ${JSON.stringify(options)}`, "info")

      let bestLocation = null
      let attempts = 0
      const maxAttempts = 3

      const attemptLocation = () => {
        attempts++
        this.logExecution(`📍 High-accuracy attempt ${attempts}/${maxAttempts}`, "info")

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
              altitude: position.coords.altitude,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              speed: position.coords.speed,
              attempt: attempts,
            }

            this.logExecution(
              `✅ Location attempt ${attempts}: ${location.lat.toFixed(8)}, ${location.lng.toFixed(8)} (accuracy: ${location.accuracy.toFixed(1)}m)`,
              "success",
            )

            if (this.validateLocationAccuracy(location)) {
              if (!bestLocation || location.accuracy < bestLocation.accuracy) {
                bestLocation = location
                this.logExecution(
                  `🎯 New best location found with accuracy: ${location.accuracy.toFixed(1)}m`,
                  "success",
                )
              }

              if (location.accuracy <= this.highAccuracyThreshold) {
                this.logExecution(`🎯 High accuracy achieved: ${location.accuracy.toFixed(1)}m`, "success")
                this.processAccurateLocation(location, resolve)
                return
              }
            }

            if (attempts < maxAttempts && (!bestLocation || bestLocation.accuracy > this.locationAccuracyThreshold)) {
              setTimeout(attemptLocation, 2000)
            } else {
              if (bestLocation) {
                this.logExecution(
                  `✅ Using best location from ${attempts} attempts: accuracy ${bestLocation.accuracy.toFixed(1)}m`,
                  "success",
                )
                this.processAccurateLocation(bestLocation, resolve)
              } else {
                reject(new Error("No accurate location found"))
              }
            }
          },
          (error) => {
            this.logExecution(`❌ Location attempt ${attempts} failed: ${error.message}`, "error")

            if (attempts < maxAttempts) {
              setTimeout(attemptLocation, 2000)
            } else {
              this.handleGeolocationError(error, reject)
            }
          },
          options,
        )
      }

      attemptLocation()
    })
  }

  handleGeolocationError(error, reject) {
    let message = "Failed to get location"
    let debugInfo = ""

    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = "Location permission denied"
        debugInfo = "User denied the request for Geolocation"
        this.logExecution("❌ Location permission denied by user", "error")
        break
      case error.POSITION_UNAVAILABLE:
        message = "Location unavailable"
        debugInfo = "Location information is unavailable"
        this.logExecution("❌ Location position unavailable", "error")
        break
      case error.TIMEOUT:
        message = "Location request timeout"
        debugInfo = "The request to get user location timed out"
        this.logExecution("❌ Location request timed out", "error")
        break
      default:
        debugInfo = "An unknown error occurred"
        this.logExecution(`❌ Unknown geolocation error: ${error.message}`, "error")
        break
    }

    this.logExecution(`📍 Error details: ${debugInfo}`, "error")
    reject(new Error(message))
  }

  validateLocationAccuracy(location) {
    if (location.lat < -90 || location.lat > 90 || location.lng < -180 || location.lng > 180) {
      this.logExecution(`❌ Invalid coordinates: ${location.lat}, ${location.lng}`, "error")
      return false
    }

    if (location.accuracy === null || location.accuracy > 1000) {
      this.logExecution(`⚠️ Poor accuracy: ${location.accuracy}m`, "warning")
      return false
    }

    const now = Date.now()
    if (now - location.timestamp > this.maxLocationAge) {
      this.logExecution(`⚠️ Location too old: ${now - location.timestamp}ms`, "warning")
      return false
    }

    const jordanBounds = {
      north: 33.5,
      south: 29.0,
      east: 39.5,
      west: 34.5,
    }

    if (
      location.lat < jordanBounds.south ||
      location.lat > jordanBounds.north ||
      location.lng < jordanBounds.west ||
      location.lng > jordanBounds.east
    ) {
      this.logExecution(`⚠️ Location outside Jordan: ${location.lat}, ${location.lng}`, "warning")
    }

    return true
  }

  async processAccurateLocation(location, resolve) {
    try {
      this.addToStabilityBuffer(location)
      this.locationConfidenceScore = this.calculateLocationConfidence(location)

      this.logExecution(
        `📍 Processing accurate location - Confidence: ${this.locationConfidenceScore.toFixed(2)}`,
        "info",
      )

      this.lastKnownAccurateLocation = { ...location }
      this.currentLocation = location

      if (this.reverseGeocodingEnabled) {
        try {
          const addressInfo = await this.performEnhancedReverseGeocoding(location)
          if (addressInfo) {
            location.addressInfo = addressInfo
            this.logExecution(`📍 Enhanced address: ${addressInfo.display_name}`, "info")

            const cacheKey = `${location.lat.toFixed(6)},${location.lng.toFixed(6)}`
            this.addressCache.set(cacheKey, {
              address: addressInfo,
              timestamp: Date.now(),
            })
          }
        } catch (error) {
          this.logExecution(`⚠️ Enhanced reverse geocoding failed: ${error.message}`, "warning")
        }
      }

      this.updateCurrentLocationOnMap()
      this.updateCurrentArea()
      this.updateSuggestedZone()
      this.updateZoneList()

      resolve(location)
    } catch (error) {
      this.logExecution(`❌ Error processing accurate location: ${error.message}`, "error")
      resolve(location)
    }
  }

  addToStabilityBuffer(location) {
    this.locationStabilityBuffer.push({
      lat: location.lat,
      lng: location.lng,
      accuracy: location.accuracy,
      timestamp: location.timestamp,
    })

    if (this.locationStabilityBuffer.length > this.maxStabilityBufferSize) {
      this.locationStabilityBuffer.shift()
    }
  }

  calculateLocationConfidence(location) {
    let confidence = 0

    if (location.accuracy <= 5) confidence += 40
    else if (location.accuracy <= 10) confidence += 35
    else if (location.accuracy <= 20) confidence += 30
    else if (location.accuracy <= 50) confidence += 20
    else confidence += 10

    if (this.locationStabilityBuffer.length >= 3) {
      const avgLat =
        this.locationStabilityBuffer.reduce((sum, loc) => sum + loc.lat, 0) / this.locationStabilityBuffer.length
      const avgLng =
        this.locationStabilityBuffer.reduce((sum, loc) => sum + loc.lng, 0) / this.locationStabilityBuffer.length

      const variance =
        this.locationStabilityBuffer.reduce((sum, loc) => {
          const distance = this.haversineDistance(loc.lat, loc.lng, avgLat, avgLng)
          return sum + distance * distance
        }, 0) / this.locationStabilityBuffer.length

      if (variance < 25) confidence += 30
      else if (variance < 100) confidence += 20
      else if (variance < 400) confidence += 10
    }

    const age = Date.now() - location.timestamp
    if (age < 5000) confidence += 20
    else if (age < 15000) confidence += 15
    else if (age < 30000) confidence += 10

    if (location.speed !== null && location.speed < 50) {
      confidence += 10
    }

    return Math.min(confidence, 100)
  }

  detectSignificantMovement(newLocation) {
    if (!this.currentLocation) return true

    const distance = this.haversineDistance(
      this.currentLocation.lat,
      this.currentLocation.lng,
      newLocation.lat,
      newLocation.lng,
    )

    const movementThreshold = Math.max(
      this.movementDetectionThreshold,
      (this.currentLocation.accuracy + newLocation.accuracy) / 2,
    )

    const hasMovedSignificantly = distance > movementThreshold

    if (hasMovedSignificantly) {
      this.logExecution(
        `🚶 Significant movement detected: ${distance.toFixed(1)}m (threshold: ${movementThreshold.toFixed(1)}m)`,
        "info",
      )
    }

    return hasMovedSignificantly
  }

  async performEnhancedReverseGeocoding(location) {
    try {
      const cacheKey = `${location.lat.toFixed(6)},${location.lng.toFixed(6)}`
      const cached = this.addressCache.get(cacheKey)

      if (cached && Date.now() - cached.timestamp < this.addressCacheTimeout) {
        this.logExecution("📍 Using cached address", "info")
        return cached.address
      }

      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&zoom=18&addressdetails=1&accept-language=ar,en`

      const response = await fetch(url, {
        headers: {
          "User-Agent": "AmmanDriverGuide/1.0",
        },
        timeout: 8000,
      })

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const data = await response.json()

      if (data && data.display_name) {
        this.logExecution("✅ Nominatim geocoding successful", "success")
        return data
      }

      throw new Error("No geocoding data returned")
    } catch (error) {
      this.logExecution(`❌ Enhanced reverse geocoding error: ${error.message}`, "error")
      return null
    }
  }

  handleLocationFailure(error) {
    this.logExecution("🔧 Handling location failure...", "info")

    const recentLocation = this.getRecentLocationFromHistory()

    if (recentLocation) {
      this.logExecution("📍 Using recent location from history", "info")
      this.currentLocation = {
        ...recentLocation,
        isHistorical: true,
      }
    } else {
      const fallbackLocation = {
        lat: 31.9539,
        lng: 35.9106,
        accuracy: null,
        timestamp: Date.now(),
        isFallback: true,
      }

      this.currentLocation = fallbackLocation
      this.logExecution("📍 Using fallback location (Amman center)", "warning")
    }

    this.updateCurrentLocationOnMap()

    let userMessage = "فشل في تحديد الموقع"
    let instructions = ""

    if (error.message.includes("permission")) {
      userMessage = "تم رفض إذن الوصول للموقع"
      instructions = "يرجى تفعيل إذن الموقع من إعدادات المتصفح"
    } else if (error.message.includes("unavailable")) {
      userMessage = "الموقع غير متاح"
      instructions = "تأكد من تفعيل GPS وخدمات الموقع"
    } else if (error.message.includes("timeout")) {
      userMessage = "انتهت مهلة تحديد الموقع"
      instructions = "تأكد من قوة إشارة الإنترنت و GPS"
    }

    this.showToast(`${userMessage}. ${instructions}`, "error")

    this.updateCurrentArea()
    this.updateSuggestedZone()
    this.updateZoneList()
  }

  handleTrackingError(error) {
    this.logExecution("🔧 Handling tracking error...", "info")

    if (this.lastKnownAccurateLocation) {
      const age = Date.now() - this.lastKnownAccurateLocation.timestamp

      if (age < 300000) {
        this.logExecution("📍 Using last known accurate location", "info")
        this.currentLocation = {
          ...this.lastKnownAccurateLocation,
          isLastKnown: true,
        }
        this.updateCurrentLocationOnMap()
        this.updateCurrentArea()
        return
      }
    }

    const recentLocation = this.getRecentLocationFromHistory()
    if (recentLocation) {
      this.logExecution("📍 Using recent location from history", "info")
      this.currentLocation = {
        ...recentLocation,
        isHistorical: true,
      }
      this.updateCurrentLocationOnMap()
      this.updateCurrentArea()
      return
    }

    this.handleLocationFailure(error)
  }

  updateLocationWithMovementIndicator(newLocation) {
    let movementInfo = ""

    if (this.currentLocation && newLocation.speed !== null && newLocation.speed > 0) {
      const speedKmh = newLocation.speed * 3.6
      movementInfo = ` (${speedKmh.toFixed(1)} كم/س)`

      if (newLocation.heading !== null) {
        const direction = this.getDirectionFromHeading(newLocation.heading)
        movementInfo += ` ${direction}`
      }
    }

    this.updateCurrentAreaWithMovement(movementInfo)
    this.updateLocationConfidenceIndicator()
  }

  getDirectionFromHeading(heading) {
    const directions = ["شمال", "شمال شرق", "شرق", "جنوب شرق", "جنوب", "جنوب غرب", "غرب", "شمال غرب"]
    const index = Math.round(heading / 45) % 8
    return directions[index]
  }

  updateCurrentAreaWithMovement(movementInfo) {
    if (!this.currentLocation) {
      document.getElementById("current-area").textContent = "غير محدد"
      return
    }

    let areaText = ""

    if (this.currentLocation.addressInfo) {
      const address = this.currentLocation.addressInfo
      if (address.address) {
        if (address.address.suburb) areaText = address.address.suburb
        else if (address.address.neighbourhood) areaText = address.address.neighbourhood
        else if (address.address.quarter) areaText = address.address.quarter
        else if (address.address.city_district) areaText = address.address.city_district
        else if (address.address.city) areaText = address.address.city
        else areaText = address.display_name.split(",")[0]
      }
    }

    if (!areaText) {
      const nearestZone = this.findNearestZone(this.currentLocation)
      if (nearestZone) {
        const distance =
          this.haversineDistance(this.currentLocation.lat, this.currentLocation.lng, nearestZone.lat, nearestZone.lng) /
          1000

        const distanceText = distance < 1 ? `(${Math.round(distance * 1000)} م)` : `(${distance.toFixed(1)} كم)`

        areaText = `${nearestZone.name} ${distanceText}`
      } else {
        areaText = "منطقة غير معروفة"
      }
    }

    const accuracyText = this.currentLocation.accuracy ? ` [دقة: ${Math.round(this.currentLocation.accuracy)}م]` : ""
    const sourceIndicator = this.getLocationSourceIndicator()

    document.getElementById("current-area").textContent = `${areaText}${movementInfo}${accuracyText} ${sourceIndicator}`

    this.logExecution(`📍 Enhanced area display: ${areaText}${movementInfo}`, "info")
  }

  updateLocationConfidenceIndicator() {
    const confidence = this.locationConfidenceScore
    let confidenceText = ""

    if (confidence >= 80) {
      confidenceText = "دقة عالية جداً"
    } else if (confidence >= 60) {
      confidenceText = "دقة عالية"
    } else if (confidence >= 40) {
      confidenceText = "دقة متوسطة"
    } else {
      confidenceText = "دقة منخفضة"
    }

    this.updateDebugState("location-state", `${confidenceText} (${confidence.toFixed(0)}%)`)
  }

  getRecentLocationFromHistory() {
    if (this.locationHistory.length === 0) {
      return null
    }

    const mostRecent = this.locationHistory[0]
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000

    if (mostRecent.timestamp > thirtyMinutesAgo) {
      return mostRecent
    }

    return null
  }

  getCurrentLocation() {
    this.getCurrentLocationWithRetry()
  }

  calculateHighDemandZones() {
    const hour = new Date().getHours()
    const isPeakTime = (hour >= 11 && hour <= 14) || (hour >= 17 && hour <= 21)

    const highDemandZones = this.zones.filter((zone) => {
      const density = isPeakTime ? zone.density_peak : zone.density_off
      return density > 5
    })

    this.logExecution(`📊 Found ${highDemandZones.length} high-demand zones (density > 5)`, "success")

    if (this.currentLocation) {
      const distances = highDemandZones
        .map((zone) => {
          const distance = this.haversineDistance(
            this.currentLocation.lat,
            this.currentLocation.lng,
            zone.lat,
            zone.lng,
          )
          return { ...zone, distance: distance / 1000 }
        })
        .sort((a, b) => a.distance - b.distance)

      if (distances.length > 0) {
        this.logExecution(
          `🎯 Nearest high-demand zone: ${distances[0].name} (${distances[0].distance.toFixed(1)}km)`,
          "info",
        )
      }
    }
  }

  runValidationTests() {
    let testsPass = 0
    let totalTests = 0

    const tests = [
      {
        name: "Data loading",
        check: () => this.zones && this.zones.length > 0,
      },
      {
        name: "MapLibre GL JS initialization",
        check: () => this.map,
      },
      {
        name: "WebGL support",
        check: () => this.checkWebGLSupport(),
      },
      {
        name: "Geolocation support",
        check: () => navigator.geolocation,
      },
      {
        name: "RTL support",
        check: () => document.documentElement.dir === "rtl",
      },
      {
        name: "Responsive design",
        check: () => document.querySelector('meta[name="viewport"]'),
      },
      {
        name: "Network connectivity",
        check: () => navigator.onLine,
      },
      {
        name: "Secure context",
        check: () => location.protocol === "https:" || location.hostname === "localhost",
      },
      {
        name: "Zone data validity",
        check: () =>
          this.zones.every(
            (zone) =>
              typeof zone.lat === "number" &&
              typeof zone.lng === "number" &&
              zone.lat >= -90 &&
              zone.lat <= 90 &&
              zone.lng >= -180 &&
              zone.lng <= 180,
          ),
      },
    ]

    tests.forEach((test, index) => {
      totalTests++
      if (test.check()) {
        testsPass++
        this.logExecution(`✅ Test ${index + 1}: ${test.name} - PASS`, "success")
      } else {
        this.logExecution(`❌ Test ${index + 1}: ${test.name} - FAIL`, "error")
      }
    })

    this.logExecution(
      `🧪 Validation complete: ${testsPass}/${totalTests} tests passed`,
      testsPass === totalTests ? "success" : "warning",
    )
  }

  updateCurrentLocationOnMap() {
    if (!this.currentLocation || !this.map) return

    // Create GeoJSON feature for current location
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

    // Update current location source
    this.map.getSource("current-location").setData({
      type: "FeatureCollection",
      features: [locationFeature],
    })

    // Add accuracy circle if available
    if (this.currentLocation.accuracy && !this.currentLocation.isFallback) {
      const accuracyCircle = this.createCircle(
        [this.currentLocation.lng, this.currentLocation.lat],
        this.currentLocation.accuracy,
      )

      this.map.getSource("accuracy-circle").setData({
        type: "FeatureCollection",
        features: [accuracyCircle],
      })
    } else {
      // Clear accuracy circle
      this.map.getSource("accuracy-circle").setData({
        type: "FeatureCollection",
        features: [],
      })
    }

    // Create popup content
    let popupContent = `موقعك الحالي<br/>دقة: ${this.currentLocation.accuracy ? Math.round(this.currentLocation.accuracy) + "م" : "غير محدد"}`

    if (this.currentLocation.isFallback) {
      popupContent = "موقع افتراضي (وسط عمان)"
    } else if (this.currentLocation.isHistorical) {
      const timeAgo = this.getTimeAgo(this.currentLocation.timestamp)
      popupContent = `موقع سابق (منذ ${timeAgo})`
    }

    if (this.currentLocation.addressInfo) {
      popupContent += `<br/>${this.currentLocation.addressInfo.display_name}`
    }

    // Create popup
    new maplibregl.Popup()
      .setLngLat([this.currentLocation.lng, this.currentLocation.lat])
      .setHTML(popupContent)
      .addTo(this.map)

    // Center map on current location
    const zoomLevel = this.currentLocation.isFallback ? 12 : 15
    this.map.flyTo({
      center: [this.currentLocation.lng, this.currentLocation.lat],
      zoom: zoomLevel,
      duration: 1000,
    })

    this.logExecution("📍 Current location updated on MapLibre GL JS map", "info")
  }

  createCircle(center, radiusInMeters, points = 64) {
    const coords = []
    const distanceX = radiusInMeters / (111320 * Math.cos((center[1] * Math.PI) / 180))
    const distanceY = radiusInMeters / 110540

    for (let i = 0; i < points; i++) {
      const theta = (i / points) * (2 * Math.PI)
      const x = distanceX * Math.cos(theta)
      const y = distanceY * Math.sin(theta)
      coords.push([center[0] + x, center[1] + y])
    }
    coords.push(coords[0])

    return {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [coords],
      },
    }
  }

  getTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)

    if (seconds < 60) return `${seconds} ثانية`

    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} دقيقة`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} ساعة`

    const days = Math.floor(hours / 24)
    return `${days} يوم`
  }

  updateCurrentArea() {
    if (!this.currentLocation) {
      document.getElementById("current-area").textContent = "غير محدد"
      return
    }

    if (this.currentLocation.addressInfo) {
      const address = this.currentLocation.addressInfo
      let areaName = ""

      if (address.address) {
        if (address.address.suburb) areaName = address.address.suburb
        else if (address.address.neighbourhood) areaName = address.address.neighbourhood
        else if (address.address.quarter) areaName = address.address.quarter
        else if (address.address.city_district) areaName = address.address.city_district
        else if (address.address.city) areaName = address.address.city
      }

      if (areaName) {
        const sourceIndicator = this.getLocationSourceIndicator()
        document.getElementById("current-area").textContent = `${areaName} ${sourceIndicator}`
        this.logExecution(`📍 Current area from geocoding: ${areaName}`, "info")
        return
      }
    }

    const nearestZone = this.findNearestZone(this.currentLocation)
    if (nearestZone) {
      const distance =
        this.haversineDistance(this.currentLocation.lat, this.currentLocation.lng, nearestZone.lat, nearestZone.lng) /
        1000

      const sourceIndicator = this.getLocationSourceIndicator()
      const distanceText = distance < 1 ? `(${Math.round(distance * 1000)} م)` : `(${distance.toFixed(1)} كم)`

      document.getElementById("current-area").textContent = `${nearestZone.name} ${distanceText} ${sourceIndicator}`
      this.logExecution(`📍 Current area identified: ${nearestZone.name} (${distance.toFixed(3)}km)`, "info")
    } else {
      document.getElementById("current-area").textContent = "منطقة غير معروفة"
    }
  }

  getLocationSourceIndicator() {
    if (this.currentLocation.isFallback) {
      return "(موقع افتراضي)"
    } else if (this.currentLocation.isHistorical) {
      return "(موقع سابق)"
    } else if (this.currentLocation.isLastKnown) {
      return "(آخر موقع معروف)"
    }
    return ""
  }

  updateSuggestedZone() {
    if (!this.currentLocation) {
      document.getElementById("suggested-zone").textContent = "غير متاح"
      return
    }

    const highDemandZones = this.getFilteredZones().filter((zone) => this.getCurrentDensity(zone) > 5)

    if (highDemandZones.length === 0) {
      document.getElementById("suggested-zone").textContent = "لا توجد مناطق ذات طلب عالي"
      return
    }

    const sortedZones = highDemandZones
      .map((zone) => ({
        ...zone,
        distance: this.haversineDistance(this.currentLocation.lat, this.currentLocation.lng, zone.lat, zone.lng),
        density: this.getCurrentDensity(zone),
      }))
      .sort((a, b) => {
        const distanceA = a.distance
        const distanceB = b.distance

        if (Math.abs(distanceA - distanceB) < 1000) {
          return b.density - a.density
        }

        return distanceA - distanceB
      })

    const suggested = sortedZones[0]
    const distanceKm = suggested.distance / 1000

    let suggestionText
    if (distanceKm < 1) {
      suggestionText = `${suggested.name} (${Math.round(suggested.distance)} م)`
    } else {
      suggestionText = `${suggested.name} (${distanceKm.toFixed(1)} كم)`
    }

    suggestionText += ` - طلب: ${suggested.density}`

    if (this.currentLocation.isFallback || this.currentLocation.isHistorical) {
      suggestionText += this.currentLocation.isFallback ? " (تقديري)" : " (بناءً على موقع سابق)"
    }

    document.getElementById("suggested-zone").textContent = suggestionText
    this.logExecution(
      `🎯 Suggested zone: ${suggested.name} (${distanceKm.toFixed(1)}km, demand: ${suggested.density})`,
      "info",
    )
  }

  updateDemandMode() {
    const hour = new Date().getHours()
    const isPeakTime = (hour >= 11 && hour <= 14) || (hour >= 17 && hour <= 21)
    const mode = isPeakTime ? "ساعات الذروة" : "ساعات الهدوء"
    const currentTime = new Date().toLocaleTimeString("ar-JO", { hour: "2-digit", minute: "2-digit" })

    document.getElementById("demand-mode").textContent = `${mode} (${currentTime})`
    this.logExecution(`⏰ Current demand mode: ${isPeakTime ? "Peak" : "Off-peak"} (${hour}:00)`, "info")
  }

  updateZoneMarkers() {
    if (!this.map) return

    const filteredZones = this.getFilteredZones()

    // Create GeoJSON features for zones
    const zoneFeatures = filteredZones.map((zone) => {
      const density = this.getCurrentDensity(zone)
      let distance = ""

      if (this.currentLocation) {
        const distanceMeters = this.haversineDistance(
          this.currentLocation.lat,
          this.currentLocation.lng,
          zone.lat,
          zone.lng,
        )
        const distanceKm = distanceMeters / 1000
        distance = distanceKm < 1 ? `${Math.round(distanceMeters)} م` : `${distanceKm.toFixed(1)} كم`
      }

      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [zone.lng, zone.lat],
        },
        properties: {
          name: zone.name,
          density: density,
          distance: distance,
          demandLevel: this.getDemandLevel(density),
        },
      }
    })

    // Update zones source
    this.map.getSource("zones").setData({
      type: "FeatureCollection",
      features: zoneFeatures,
    })

    this.logExecution(`🗺️ Updated ${zoneFeatures.length} zone markers on MapLibre GL JS map`, "info")
  }

  updateZoneList() {
    const zoneList = document.getElementById("zone-list")
    zoneList.innerHTML = ""

    const filteredZones = this.getFilteredZones()

    const sortedZones = filteredZones
      .map((zone) => ({
        ...zone,
        density: this.getCurrentDensity(zone),
        distance: this.currentLocation
          ? this.haversineDistance(this.currentLocation.lat, this.currentLocation.lng, zone.lat, zone.lng)
          : 0,
      }))
      .sort((a, b) => {
        if (b.density !== a.density) {
          return b.density - a.density
        }
        return a.distance - b.distance
      })

    sortedZones.forEach((zone) => {
      const demandLevel = this.getDemandLevel(zone.density)
      const demandText = this.getDemandText(demandLevel)

      let distanceText = ""
      if (this.currentLocation) {
        const distanceKm = zone.distance / 1000
        if (distanceKm < 1) {
          distanceText = `المسافة: ${Math.round(zone.distance)} م`
        } else {
          distanceText = `المسافة: ${distanceKm.toFixed(1)} كم`
        }

        if (this.currentLocation.isFallback) {
          distanceText += " (تقديري)"
        } else if (this.currentLocation.isHistorical) {
          distanceText += " (بناءً على موقع سابق)"
        }
      }

      const listItem = document.createElement("li")
      listItem.className = `zone-item ${demandLevel}-demand`
      listItem.innerHTML = `
        <div class="zone-header">
          <div class="zone-name">${zone.name}</div>
          <div class="zone-demand ${demandLevel}">${demandText}</div>
        </div>
        <div class="zone-details">
          <span>مستوى الطلب: ${zone.density}</span>
          <span>${distanceText}</span>
        </div>
      `

      listItem.addEventListener("click", () => {
        this.highlightZoneOnMap(zone)
        setTimeout(() => {
          this.navigateToZone(zone.lat, zone.lng)
        }, 500)
      })

      zoneList.appendChild(listItem)
    })

    this.logExecution(`📋 Updated zone list with ${sortedZones.length} zones`, "info")
  }

  highlightZoneOnMap(zone) {
    if (this.map) {
      this.map.flyTo({
        center: [zone.lng, zone.lat],
        zoom: 15,
        duration: 1000,
      })

      // Create and show popup
      const popupContent = `
        <div style="text-align: center; font-family: var(--font-family);">
          <strong style="font-size: 16px;">${zone.name}</strong><br/>
          <div style="margin: 8px 0;">
            مستوى الطلب: <span style="font-weight: bold; color: ${this.getDemandColor(this.getCurrentDensity(zone))};">${this.getCurrentDensity(zone)}</span>
          </div>
        </div>
      `

      new maplibregl.Popup().setLngLat([zone.lng, zone.lat]).setHTML(popupContent).addTo(this.map)
    }
  }

  getFilteredZones() {
    if (!this.highDemandOnly) {
      return this.zones
    }
    return this.zones.filter((zone) => this.getCurrentDensity(zone) > 5)
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

  navigateToZone(lat, lng) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    window.open(url, "_blank")
    this.logExecution(`🧭 Navigation initiated to coordinates: ${lat}, ${lng}`, "info")
    this.showToast("جاري فتح خرائط جوجل للتوجيه...", "info")
  }

  updateSystemStatus(status, type) {
    const statusElement = document.getElementById("system-status")
    statusElement.textContent = status
    statusElement.className = `value status-${type}`
  }

  logExecution(message, type = "info") {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = { timestamp, message, type }

    this.executionLog.push(logEntry)

    const logContainer = document.getElementById("execution-log")
    const logElement = document.createElement("div")
    logElement.className = `log-entry log-${type}`
    logElement.textContent = `[${timestamp}] ${message}`

    logContainer.appendChild(logElement)
    logContainer.scrollTop = logContainer.scrollHeight

    if (this.executionLog.length > 50) {
      this.executionLog.shift()
      logContainer.removeChild(logContainer.firstChild)
    }
  }

  showToast(message, type = "info") {
    const toast = document.getElementById("toast")
    toast.textContent = message
    toast.className = `toast ${type} show`

    setTimeout(() => {
      toast.classList.remove("show")
    }, 4000)
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.driverGuide = new AmmanDriverGuide()
  window.driverGuide.init()
})

// Update demand mode every minute
setInterval(() => {
  if (window.driverGuide && window.driverGuide.isInitialized) {
    window.driverGuide.updateDemandMode()
    window.driverGuide.updateSuggestedZone()
    window.driverGuide.updateZoneList()
  }
}, 60000)
