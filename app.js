class AmmanDriverGuide {
  constructor() {
    this.map = null
    this.currentLocation = null
    this.zones = []
    this.markers = []
    this.currentLocationMarker = null
    this.highDemandOnly = false
    this.executionLog = []
    this.isInitialized = false
    this.geolocationWatchId = null
    this.debugMode = true
    this.loadingTimeout = null
    this.initializationSteps = {
      environment: false,
      data: false,
      map: false,
      events: false,
      demand: false,
    }

    this.logExecution("🚀 System initialized", "info")
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
    this.logExecution("🔍 Checking browser compatibility...", "info")

    const checks = {
      geolocation: !!navigator.geolocation,
      fetch: !!window.fetch,
      localStorage: !!window.localStorage,
      leaflet: !!window.L,
    }

    this.logExecution(`Browser checks: ${JSON.stringify(checks)}`, "info")

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
      this.logExecution("🚀 Starting application initialization...", "info")
      this.updateSystemStatus("جاري التحميل...", "loading")
      this.updateDebugState("app-state", "جاري التحميل")

      // Set loading timeout
      this.loadingTimeout = setTimeout(() => {
        this.handleLoadingTimeout()
      }, 30000) // 30 seconds timeout

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
      this.logExecution("🗺️ Step 3: Initializing map...", "info")
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

      // Clear loading timeout
      if (this.loadingTimeout) {
        clearTimeout(this.loadingTimeout)
        this.loadingTimeout = null
      }

      this.isInitialized = true
      this.updateSystemStatus("جاهز للاستخدام", "ready")
      this.updateDebugState("app-state", "جاهز")
      this.logExecution("🎉 Application initialization complete!", "success")

      // Hide loading indicator
      this.hideLoading()

      // Auto-start geolocation after initialization
      setTimeout(() => {
        this.getCurrentLocationWithRetry()
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

    // Check which steps failed
    const failedSteps = Object.entries(this.initializationSteps)
      .filter(([step, completed]) => !completed)
      .map(([step]) => step)

    this.logExecution(`Failed steps: ${failedSteps.join(", ")}`, "error")

    // Force use sample data and continue
    this.forceReload()
  }

  async loadZones() {
    try {
      this.logExecution("📊 Loading zones data...", "info")
      this.updateDebugState("data-state", "جاري التحميل")

      // Add timeout for fetch request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

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

        // Fallback to sample data
        this.zones = this.getSampleZones()
        this.logExecution(`✅ Loaded ${this.zones.length} sample zones`, "success")
        this.updateDebugState("data-state", `بيانات تجريبية (${this.zones.length} منطقة)`)
      }

      // Validate data structure
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

    this.zones = this.zones.filter((zone) => {
      const isValid = requiredFields.every((field) => zone.hasOwnProperty(field))
      if (isValid) {
        validZones++
      } else {
        this.logExecution(`⚠️ Invalid zone data: ${JSON.stringify(zone)}`, "warning")
      }
      return isValid
    })

    this.logExecution(`✅ Validated ${validZones} zones`, "success")
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
        this.logExecution("🗺️ Initializing Leaflet map...", "info")
        this.updateDebugState("map-state", "جاري التهيئة")

        // Check if Leaflet is loaded
        if (typeof L === "undefined") {
          throw new Error("Leaflet library not loaded")
        }

        // Clean up any existing map first
        this.cleanupMap()

        // Clear the map container
        const mapContainer = document.getElementById("map")
        if (mapContainer) {
          mapContainer.innerHTML = ""
        }

        // Initialize new map
        this.map = L.map("map").setView([31.9539, 35.9106], 12)
        this.logExecution("✅ Map container created", "success")

        // Use OpenStreetMap as primary tile layer
        const osmTileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        })

        osmTileLayer.addTo(this.map)

        // Wait for tiles to load
        osmTileLayer.on("load", () => {
          this.logExecution("✅ Map tiles loaded successfully", "success")
          this.updateDebugState("map-state", "تم التحميل")
          resolve()
        })

        osmTileLayer.on("tileerror", (error) => {
          this.logExecution(`⚠️ Tile loading error: ${error.error}`, "warning")
        })

        // Add dark theme as alternative
        const darkTileLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 19,
        })

        // Add layer control
        const baseMaps = {
          "الخريطة العادية": osmTileLayer,
          "الخريطة الداكنة": darkTileLayer,
        }

        L.control.layers(baseMaps).addTo(this.map)
        this.logExecution("✅ Map layer control added", "success")

        // Add map event handlers
        this.map.on("click", (e) => {
          if (this.debugMode) {
            this.logExecution(`🗺️ Map clicked at: ${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`, "info")
          }
        })

        this.map.on("zoomend", () => {
          this.logExecution(`🔍 Map zoom level: ${this.map.getZoom()}`, "info")
        })

        this.updateZoneMarkers()
        this.logExecution("✅ Map initialization complete", "success")

        // Resolve after a short delay to ensure everything is ready
        setTimeout(() => {
          if (this.map) {
            this.updateDebugState("map-state", "جاهز")
            resolve()
          }
        }, 2000)
      } catch (error) {
        this.logExecution(`❌ Map initialization error: ${error.message}`, "error")
        this.updateDebugState("map-state", "خطأ")
        reject(error)
      }
    })
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

    this.logExecution("✅ Event listeners configured", "success")
  }

  testDataLoading() {
    this.logExecution("🧪 Testing data loading...", "info")

    // Test network connectivity
    if (!navigator.onLine) {
      this.showToast("لا يوجد اتصال بالإنترنت", "error")
      return
    }

    // Test fetch API
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
      // Clear any existing timeouts
      if (this.loadingTimeout) {
        clearTimeout(this.loadingTimeout)
        this.loadingTimeout = null
      }

      // Reset initialization steps
      this.initializationSteps = {
        environment: false,
        data: false,
        map: false,
        events: false,
        demand: false,
      }

      // Clear existing map and markers safely
      if (this.map) {
        try {
          // Remove all markers
          this.markers.forEach((marker) => {
            if (this.map.hasLayer(marker)) {
              this.map.removeLayer(marker)
            }
          })
          this.markers = []

          // Remove current location marker
          if (this.currentLocationMarker && this.map.hasLayer(this.currentLocationMarker)) {
            this.map.removeLayer(this.currentLocationMarker)
            this.currentLocationMarker = null
          }

          // Remove the map instance
          this.map.remove()
          this.map = null
          this.logExecution("✅ Previous map instance cleaned up", "success")
        } catch (mapError) {
          this.logExecution(`⚠️ Map cleanup warning: ${mapError.message}`, "warning")
        }
      }

      // Reset data
      this.zones = []
      this.currentLocation = null
      this.isInitialized = false

      // Reset UI states
      this.updateSystemStatus("جاري إعادة التحميل...", "loading")
      this.updateDebugState("data-state", "إعادة تعيين")
      this.updateDebugState("map-state", "إعادة تعيين")
      this.updateDebugState("location-state", "إعادة تعيين")

      // Clear zone list
      const zoneList = document.getElementById("zone-list")
      if (zoneList) {
        zoneList.innerHTML = ""
      }

      // Reset status displays
      document.getElementById("current-area").textContent = "جاري التحديد..."
      document.getElementById("suggested-zone").textContent = "جاري البحث..."
      document.getElementById("demand-mode").textContent = ""

      // Show loading again
      this.showLoading()

      this.logExecution("🔄 Application state reset complete", "success")

      // Restart initialization after a short delay
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
      // Remove all event listeners
      this.map.off()

      // Remove all layers
      this.map.eachLayer((layer) => {
        this.map.removeLayer(layer)
      })

      // Clear markers array
      this.markers = []
      this.currentLocationMarker = null

      // Remove the map
      this.map.remove()
      this.map = null

      this.logExecution("🗺️ Map cleanup completed", "success")
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
      // Ensure app is initialized
      if (!this.isInitialized) {
        this.showToast("التطبيق لم يتم تحميله بعد", "warning")
        return
      }

      // Step 3: Geolocation Activation
      this.logExecution("📍 Step 3: Activating geolocation...", "info")
      await this.getCurrentLocationPromise()

      // Step 5: Real-time Demand Calculation
      this.logExecution("⏰ Step 5: Calculating real-time demand...", "info")
      this.updateDemandMode()
      this.calculateHighDemandZones()

      // Step 6: Dynamic UI Updates
      this.logExecution("🖥️ Step 6: Updating user interface...", "info")
      this.updateCurrentArea()
      this.updateSuggestedZone()
      this.updateZoneList()

      // Step 7: Interactive Features
      this.logExecution("🎮 Step 7: Interactive features activated", "info")

      // Step 8: Testing and Validation
      this.logExecution("🧪 Step 8: Running validation tests...", "info")
      this.runValidationTests()

      this.logExecution("🎉 Full execution completed successfully!", "success")
      this.showToast("تم تشغيل التطبيق بنجاح!", "success")
    } catch (error) {
      this.logExecution(`❌ Execution error: ${error.message}`, "error")
      this.showToast("خطأ في تشغيل التطبيق", "error")
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
      // Check network connectivity
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

      this.logExecution("📡 Requesting geolocation permission...", "info")
      this.showToast("جاري تحديد موقعك...", "info")

      const options = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000,
      }

      this.logExecution(`📍 Geolocation options: ${JSON.stringify(options)}`, "info")

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.currentLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          }

          this.logExecution(
            `✅ Location acquired: ${this.currentLocation.lat.toFixed(6)}, ${this.currentLocation.lng.toFixed(6)}`,
            "success",
          )
          this.logExecution(
            `📍 Accuracy: ${this.currentLocation.accuracy}m, Timestamp: ${new Date(this.currentLocation.timestamp).toLocaleTimeString()}`,
            "info",
          )

          this.updateCurrentLocationOnMap()
          resolve(this.currentLocation)
        },
        (error) => {
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
        },
        options,
      )
    })
  }

  handleLocationFailure(error) {
    this.logExecution("🔧 Handling location failure...", "info")

    const fallbackLocation = {
      lat: 31.9539,
      lng: 35.9106,
      accuracy: null,
      timestamp: Date.now(),
      isFallback: true,
    }

    this.currentLocation = fallbackLocation
    this.logExecution("📍 Using fallback location (Amman center)", "warning")
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
        name: "Map initialization",
        check: () => this.map,
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

    if (this.currentLocationMarker) {
      this.map.removeLayer(this.currentLocationMarker)
    }

    const markerHtml = this.currentLocation.isFallback ? "📍" : "🎯"
    const markerClass = this.currentLocation.isFallback ? "fallback-location-marker" : "current-location-marker"

    const currentIcon = L.divIcon({
      className: markerClass,
      iconSize: [20, 20],
      html: markerHtml,
    })

    this.currentLocationMarker = L.marker([this.currentLocation.lat, this.currentLocation.lng], {
      icon: currentIcon,
    }).addTo(this.map)

    const popupContent = this.currentLocation.isFallback
      ? "موقع افتراضي (وسط عمان)"
      : `موقعك الحالي<br>دقة: ${this.currentLocation.accuracy ? Math.round(this.currentLocation.accuracy) + "م" : "غير محدد"}`

    this.currentLocationMarker.bindPopup(popupContent).openPopup()
    this.map.setView([this.currentLocation.lat, this.currentLocation.lng], 14)
    this.logExecution("📍 Current location marker updated on map", "info")
  }

  updateCurrentArea() {
    if (!this.currentLocation) {
      document.getElementById("current-area").textContent = "غير محدد"
      return
    }

    const nearestZone = this.findNearestZone(this.currentLocation)
    if (nearestZone) {
      const areaText = this.currentLocation.isFallback ? `${nearestZone.name} (موقع افتراضي)` : nearestZone.name
      document.getElementById("current-area").textContent = areaText
      this.logExecution(`📍 Current area identified: ${nearestZone.name}`, "info")
    } else {
      document.getElementById("current-area").textContent = "منطقة غير معروفة"
    }
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
      }))
      .sort((a, b) => a.distance - b.distance)

    const suggested = sortedZones[0]
    const suggestionText = this.currentLocation.isFallback
      ? `${suggested.name} (${(suggested.distance / 1000).toFixed(1)} كم - تقديري)`
      : `${suggested.name} (${(suggested.distance / 1000).toFixed(1)} كم)`

    document.getElementById("suggested-zone").textContent = suggestionText
    this.logExecution(`🎯 Suggested zone: ${suggested.name} (${(suggested.distance / 1000).toFixed(1)}km)`, "info")
  }

  updateDemandMode() {
    const hour = new Date().getHours()
    const isPeakTime = (hour >= 11 && hour <= 14) || (hour >= 17 && hour <= 21)
    const mode = isPeakTime ? "ساعات الذروة" : "ساعات الهدوء"
    document.getElementById("demand-mode").textContent = mode
    this.logExecution(`⏰ Current demand mode: ${isPeakTime ? "Peak" : "Off-peak"} (${hour}:00)`, "info")
  }

  updateZoneMarkers() {
    if (!this.map) return

    this.markers.forEach((marker) => this.map.removeLayer(marker))
    this.markers = []

    const filteredZones = this.getFilteredZones()

    filteredZones.forEach((zone) => {
      const density = this.getCurrentDensity(zone)
      const demandLevel = this.getDemandLevel(density)

      let markerColor = "#f44336"
      if (demandLevel === "high") markerColor = "#4CAF50"
      else if (demandLevel === "medium") markerColor = "#FF9800"

      const customIcon = L.divIcon({
        className: "custom-marker",
        iconSize: [15, 15],
        html: `<div style="background: ${markerColor}; width: 15px; height: 15px; border-radius: 50%; border: 2px solid white;"></div>`,
      })

      const marker = L.marker([zone.lat, zone.lng], { icon: customIcon })
        .addTo(this.map)
        .bindPopup(`
          <div style="text-align: center;">
            <strong>${zone.name}</strong><br>
            مستوى الطلب: ${density}<br>
            <button onclick="window.driverGuide.navigateToZone(${zone.lat}, ${zone.lng})" 
                    style="margin-top: 10px; padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
              التوجه للمنطقة
            </button>
          </div>
        `)

      this.markers.push(marker)
    })

    this.logExecution(`🗺️ Updated ${this.markers.length} zone markers on map`, "info")
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

      const distanceText = this.currentLocation
        ? `المسافة: ${(zone.distance / 1000).toFixed(1)} كم${this.currentLocation.isFallback ? " (تقديري)" : ""}`
        : ""

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
        this.navigateToZone(zone.lat, zone.lng)
      })

      zoneList.appendChild(listItem)
    })

    this.logExecution(`📋 Updated zone list with ${sortedZones.length} zones`, "info")
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
