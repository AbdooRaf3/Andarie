class AmmanDriverGuide {
  constructor() {
    this.zones = []
    this.currentLocation = null
    this.isInitialized = false
    this.voiceEnabled = true
    this.currentTab = "zones"
    this.suggestedZone = null
    this.highDemandOnly = false

    console.log("🚗 تم إنشاء تطبيق دليل السائق")
  }

  async init() {
    try {
      console.log("🔄 بدء تهيئة التطبيق...")

      // إخفاء شاشة التحميل فوراً
      this.hideLoadingOverlay()

      // تحميل البيانات الأساسية
      this.loadZones()

      // إعداد واجهة المستخدم
      this.setupEventListeners()
      this.setupInterface()

      // بدء تتبع الموقع
      this.startLocationTracking()

      this.isInitialized = true
      console.log("✅ تم تحميل التطبيق بنجاح")
      this.showToast("مرحباً بك في دليل السائق!", "success")
    } catch (error) {
      console.error("❌ خطأ في التهيئة:", error)
      this.hideLoadingOverlay()
      this.showToast("تم تحميل التطبيق", "info")
      this.setupBasicInterface()
    }
  }

  loadZones() {
    // بيانات المناطق الأساسية
    this.zones = [
      {
        name: "الصويفية",
        lat: 31.9552,
        lng: 35.8617,
        density_peak: 9,
        density_off: 4,
        region: "عمان الغربية",
        safety_rating: 9,
      },
      {
        name: "عبدون",
        lat: 31.9539,
        lng: 35.8793,
        density_peak: 8,
        density_off: 3,
        region: "عمان الغربية",
        safety_rating: 10,
      },
      {
        name: "الشميساني",
        lat: 31.9613,
        lng: 35.8907,
        density_peak: 8,
        density_off: 4,
        region: "عمان الغربية",
        safety_rating: 9,
      },
      {
        name: "الدوار السابع",
        lat: 31.9515,
        lng: 35.9239,
        density_peak: 7,
        density_off: 5,
        region: "عمان الوسطى",
        safety_rating: 8,
      },
      {
        name: "تلاع العلي",
        lat: 31.9723,
        lng: 35.837,
        density_peak: 7,
        density_off: 2,
        region: "عمان الغربية",
        safety_rating: 10,
      },
      {
        name: "الجبيهة",
        lat: 32.0108,
        lng: 35.8728,
        density_peak: 5,
        density_off: 3,
        region: "عمان الشمالية",
        safety_rating: 9,
      },
    ]

    console.log(`📊 تم تحميل ${this.zones.length} منطقة`)
    this.updateZonesList()
    this.updateSuggestedZone()
  }

  setupEventListeners() {
    console.log("🎛️ إعداد أحداث الواجهة...")

    // أزرار التحكم الرئيسية
    this.setupButton("voice-toggle", () => this.toggleVoice())
    this.setupButton("emergency-btn", () => this.handleEmergency())
    this.setupButton("navigate-btn", () => this.startNavigation())
    this.setupButton("refresh-suggestion", () => this.refreshSuggestion())

    // الأزرار السريعة
    this.setupButton("find-nearest", () => this.findNearestZone())
    this.setupButton("high-demand-filter", (e) => this.toggleHighDemandFilter(e.target))
    this.setupButton("voice-navigation", () => this.showToast("التوجيه الصوتي قيد التطوير", "info"))
    this.setupButton("safety-mode", (e) => this.toggleSafetyMode(e.target))

    // التبويبات
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.switchTab(e.target.dataset.tab)
      })
    })

    // الإعدادات
    this.setupButton("test-voice", () => this.testVoice())
    this.setupButton("force-reload", () => location.reload())

    console.log("✅ تم إعداد أحداث الواجهة")
  }

  setupButton(id, handler) {
    const element = document.getElementById(id)
    if (element) {
      element.addEventListener("click", handler)
    } else {
      console.warn(`⚠️ لم يتم العثور على العنصر: ${id}`)
    }
  }

  setupInterface() {
    // تفعيل التبويب الأول
    this.switchTab("zones")

    // تحديث حالة الأزرار
    this.updateVoiceButton()

    // تحديث العرض
    this.updateDisplay()
  }

  setupBasicInterface() {
    this.isInitialized = true
    this.setupInterface()
  }

  updateDisplay() {
    // تحديث عرض المنطقة المقترحة
    this.updateSuggestedZoneDisplay()

    // تحديث قائمة المناطق
    this.updateZonesList()

    // تحديث شريط الحالة
    this.updateStatusBar()
  }

  updateSuggestedZone() {
    if (this.zones.length > 0) {
      // اختيار منطقة عشوائية كمقترح
      const highDemandZones = this.zones.filter((zone) => this.getCurrentDensity(zone) >= 7)
      if (highDemandZones.length > 0) {
        this.suggestedZone = highDemandZones[Math.floor(Math.random() * highDemandZones.length)]
      } else {
        this.suggestedZone = this.zones[0]
      }
    }
    this.updateSuggestedZoneDisplay()
  }

  updateSuggestedZoneDisplay() {
    const elements = {
      "suggested-zone-display": this.suggestedZone ? this.suggestedZone.name : "لا توجد منطقة مقترحة",
      "demand-level": this.suggestedZone ? this.getCurrentDensity(this.suggestedZone) : "--",
      "suggested-distance":
        this.suggestedZone && this.currentLocation ? this.getDistanceToZone(this.suggestedZone) : "--",
      "suggested-eta": this.suggestedZone && this.currentLocation ? this.getETA(this.suggestedZone) : "--",
    }

    Object.entries(elements).forEach(([id, text]) => {
      const element = document.getElementById(id)
      if (element) {
        element.textContent = text
      }
    })

    // تحديث مؤشر الطلب
    const indicator = document.getElementById("demand-indicator")
    if (indicator && this.suggestedZone) {
      const density = this.getCurrentDensity(this.suggestedZone)
      indicator.className = `demand-indicator ${this.getDemandClass(density)}`
    }

    // تفعيل زر التنقل
    const navigateBtn = document.getElementById("navigate-btn")
    if (navigateBtn) {
      navigateBtn.disabled = !this.suggestedZone
    }
  }

  updateZonesList() {
    const container = document.getElementById("zones-grid")
    if (!container) return

    container.innerHTML = ""

    let filteredZones = [...this.zones]
    if (this.highDemandOnly) {
      filteredZones = filteredZones.filter((zone) => this.getCurrentDensity(zone) >= 7)
    }

    if (filteredZones.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #6c757d;">
          <div style="font-size: 2rem; margin-bottom: 1rem;">🗺️</div>
          <p>لا توجد مناطق متاحة</p>
        </div>
      `
      return
    }

    filteredZones.forEach((zone) => {
      const card = this.createZoneCard(zone)
      container.appendChild(card)
    })
  }

  createZoneCard(zone) {
    const density = this.getCurrentDensity(zone)
    const demandText = this.getDemandText(density)

    const card = document.createElement("div")
    card.className = "zone-card"
    card.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 1rem;
      margin-bottom: 0.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      cursor: pointer;
      transition: transform 0.2s ease;
      border-right: 4px solid ${this.getDemandColor(density)};
    `

    let distanceText = "--"
    if (this.currentLocation) {
      const distance =
        this.haversineDistance(this.currentLocation.lat, this.currentLocation.lng, zone.lat, zone.lng) / 1000
      distanceText = distance < 1 ? `${Math.round(distance * 1000)} م` : `${distance.toFixed(1)} كم`
    }

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
        <div style="font-size: 1.2rem; font-weight: 600; color: #212529;">${zone.name}</div>
        <div style="background: ${this.getDemandColor(density)}; color: white; padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.8rem;">
          ${demandText}
        </div>
      </div>
      <div style="display: flex; gap: 1rem; font-size: 0.9rem; color: #6c757d;">
        <span>الطلب: ${density}</span>
        <span>المسافة: ${distanceText}</span>
        ${zone.safety_rating ? `<span>الأمان: ${zone.safety_rating}/10</span>` : ""}
      </div>
    `

    card.addEventListener("click", () => this.selectZone(zone))
    card.addEventListener("mouseenter", () => {
      card.style.transform = "translateY(-2px)"
    })
    card.addEventListener("mouseleave", () => {
      card.style.transform = "translateY(0)"
    })

    return card
  }

  selectZone(zone) {
    this.suggestedZone = zone
    this.updateSuggestedZoneDisplay()
    this.showToast(`تم اختيار ${zone.name}`, "success")
    console.log(`📍 تم اختيار المنطقة: ${zone.name}`)
  }

  getCurrentDensity(zone) {
    const hour = new Date().getHours()
    return hour >= 7 && hour <= 22 ? zone.density_peak : zone.density_off
  }

  getDemandClass(density) {
    if (density >= 7) return "high"
    if (density >= 4) return "medium"
    return "low"
  }

  getDemandText(density) {
    if (density >= 7) return "عالي"
    if (density >= 4) return "متوسط"
    return "منخفض"
  }

  getDemandColor(density) {
    if (density >= 7) return "#4caf50"
    if (density >= 4) return "#ff9800"
    return "#f44336"
  }

  getDistanceToZone(zone) {
    if (!this.currentLocation) return "غير محدد"

    const distance =
      this.haversineDistance(this.currentLocation.lat, this.currentLocation.lng, zone.lat, zone.lng) / 1000

    return distance < 1 ? `${Math.round(distance * 1000)} متر` : `${distance.toFixed(1)} كم`
  }

  getETA(zone) {
    if (!this.currentLocation) return "غير محدد"

    const distance =
      this.haversineDistance(this.currentLocation.lat, this.currentLocation.lng, zone.lat, zone.lng) / 1000

    const eta = Math.round((distance / 30) * 60) // افتراض سرعة 30 كم/س
    return eta < 1 ? "< 1 دقيقة" : `${eta} دقيقة`
  }

  updateStatusBar() {
    const currentArea = document.getElementById("current-area-display")
    const demandMode = document.getElementById("demand-mode-display")

    if (currentArea) {
      currentArea.textContent = this.currentLocation ? "تم تحديد الموقع" : "جاري تحديد الموقع..."
    }

    if (demandMode) {
      const hour = new Date().getHours()
      demandMode.textContent = hour >= 7 && hour <= 22 ? "وقت الذروة" : "خارج الذروة"
    }
  }

  startLocationTracking() {
    if (!navigator.geolocation) {
      console.warn("⚠️ تحديد الموقع غير مدعوم")
      return
    }

    console.log("📍 بدء تتبع الموقع...")

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.currentLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }
        console.log("✅ تم تحديد الموقع:", this.currentLocation)
        this.updateDisplay()
      },
      (error) => {
        console.warn("⚠️ خطأ في تحديد الموقع:", error.message)
        this.updateStatusBar()
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    )
  }

  // وظائف التحكم
  toggleVoice() {
    this.voiceEnabled = !this.voiceEnabled
    this.updateVoiceButton()
    this.showToast(this.voiceEnabled ? "تم تفعيل الصوت" : "تم إيقاف الصوت", "info")
  }

  updateVoiceButton() {
    const btn = document.getElementById("voice-toggle")
    if (btn) {
      btn.textContent = this.voiceEnabled ? "🔊" : "🔇"
      btn.classList.toggle("muted", !this.voiceEnabled)
    }
  }

  handleEmergency() {
    this.showToast("تم تفعيل وضع الطوارئ", "error")
    console.log("🚨 تم تفعيل وضع الطوارئ")

    // اهتزاز إذا كان مدعوماً
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200])
    }
  }

  startNavigation() {
    if (!this.suggestedZone) {
      this.showToast("لا توجد منطقة مقترحة", "warning")
      return
    }

    const zone = this.suggestedZone
    const url = `https://www.google.com/maps/dir/?api=1&destination=${zone.lat},${zone.lng}&travelmode=driving`

    window.open(url, "_blank")
    this.showToast(`جاري التوجه إلى ${zone.name}`, "success")
    console.log(`🧭 بدء التنقل إلى: ${zone.name}`)
  }

  refreshSuggestion() {
    this.updateSuggestedZone()
    this.updateZonesList()
    this.showToast("تم تحديث المقترحات", "info")
    console.log("🔄 تم تحديث المقترحات")
  }

  findNearestZone() {
    if (!this.currentLocation) {
      this.showToast("لم يتم تحديد موقعك بعد", "warning")
      return
    }

    let nearest = null
    let minDistance = Number.POSITIVE_INFINITY

    this.zones.forEach((zone) => {
      const distance = this.haversineDistance(this.currentLocation.lat, this.currentLocation.lng, zone.lat, zone.lng)
      if (distance < minDistance) {
        minDistance = distance
        nearest = zone
      }
    })

    if (nearest) {
      this.selectZone(nearest)
      this.showToast(`أقرب منطقة: ${nearest.name}`, "success")
    }
  }

  toggleHighDemandFilter(button) {
    this.highDemandOnly = !this.highDemandOnly
    button.classList.toggle("active", this.highDemandOnly)
    this.updateZonesList()

    const message = this.highDemandOnly ? "عرض المناطق عالية الطلب فقط" : "عرض جميع المناطق"
    this.showToast(message, "info")
  }

  toggleSafetyMode(button) {
    button.classList.toggle("active")
    const isActive = button.classList.contains("active")
    this.showToast(isActive ? "تم تفعيل وضع الأمان" : "تم إيقاف وضع الأمان", "info")
  }

  switchTab(tabName) {
    // إخفاء جميع التبويبات
    document.querySelectorAll(".tab-content").forEach((tab) => {
      tab.classList.remove("active")
    })
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.remove("active")
    })

    // إظهار التبويب المحدد
    const targetTab = document.getElementById(`${tabName}-tab`)
    const targetBtn = document.querySelector(`[data-tab="${tabName}"]`)

    if (targetTab) targetTab.classList.add("active")
    if (targetBtn) targetBtn.classList.add("active")

    this.currentTab = tabName
    console.log(`📑 تم التبديل إلى تبويب: ${tabName}`)
  }

  testVoice() {
    this.showToast("اختبار النظام الصوتي", "info")
    console.log("🎤 اختبار النظام الصوتي")
  }

  // وظائف مساعدة
  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3 // نصف قطر الأرض بالمتر
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  hideLoadingOverlay() {
    const overlay = document.getElementById("loading-overlay")
    if (overlay) {
      overlay.style.display = "none"
    }
  }

  showToast(message, type = "info") {
    console.log(`📢 ${type.toUpperCase()}: ${message}`)

    // إنشاء عنصر التوست
    const toast = document.createElement("div")
    toast.className = `toast ${type} show`
    toast.textContent = message
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      color: #212529;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
      font-weight: 600;
      border-right: 4px solid ${this.getToastColor(type)};
      max-width: 90%;
      text-align: center;
    `

    document.body.appendChild(toast)

    // إزالة التوست بعد 3 ثوان
    setTimeout(() => {
      toast.remove()
    }, 3000)
  }

  getToastColor(type) {
    const colors = {
      success: "#4caf50",
      error: "#f44336",
      warning: "#ff9800",
      info: "#2196f3",
    }
    return colors[type] || colors.info
  }
}

// تهيئة التطبيق
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 بدء تحميل تطبيق دليل السائق...")

  const app = new AmmanDriverGuide()
  window.driverApp = app // للوصول من وحدة التحكم

  // بدء التطبيق فوراً
  app.init()
})
