import { useEffect, useRef, useState, useCallback } from 'react'
import { Navigation, MapPin, Bike, Store, Compass, RefreshCw, ZoomIn, ZoomOut, Search, X, Loader2, Check, Crosshair, Target } from 'lucide-react'
import { fetchRoadRoute, calculateDistanceKm } from '../lib/delivery'
import { searchPlaces, reverseGeocode, PlaceSearchResult } from '../lib/geocoding'

export interface DeliveryRouteMapProps {
  mode?: 'picker' | 'route' | 'live_track'
  pickerTarget?: 'customer' | 'store'
  storeLocation?: { lat?: number | null; lng?: number | null; name?: string }
  customerLocation?: { lat?: number | null; lng?: number | null; address?: string }
  onChangeLocation?: (lat: number, lng: number) => void
  onSelectAddressText?: (address: string) => void
  riderProgress?: number // 0 (at store) to 1 (at customer)
  riderStatus?: string
  radiusKm?: number
  className?: string
  height?: string
  showSearch?: boolean
  searchPlaceholder?: string
}

function safeCoord(val: any, fallback: number): number {
  const num = Number(val)
  return typeof num === 'number' && !isNaN(num) && isFinite(num) && num !== 0 ? num : fallback
}

export default function DeliveryRouteMap({
  mode = 'route',
  pickerTarget = 'customer',
  storeLocation,
  customerLocation,
  onChangeLocation,
  onSelectAddressText,
  riderProgress = 0,
  riderStatus = 'preparing',
  radiusKm,
  className = '',
  height = '340px',
  showSearch = true,
  searchPlaceholder
}: DeliveryRouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const isDraggingRef = useRef(false)
  const routePointsRef = useRef<[number, number][]>([])
  // Track whether we've already snapped the map view to the real pin coords once
  const firstCenterDoneRef = useRef(false)
  const prevPinRef = useRef<{ lat: number; lng: number } | null>(null)
  const markersRef = useRef<{
    store?: any
    customer?: any
    rider?: any
    routeLine?: any
    radiusCircle?: any
  }>({})
  
  const [gpsLoading, setGpsLoading] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [pinFeedback, setPinFeedback] = useState<string | null>(null)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const searchDebounceRef = useRef<any>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const sLat = safeCoord(storeLocation?.lat, 13.7563)
  const sLng = safeCoord(storeLocation?.lng, 100.5018)
  const sName = storeLocation?.name || 'ร้านค้า'

  const cLat = safeCoord(customerLocation?.lat, 13.7650)
  const cLng = safeCoord(customerLocation?.lng, 100.5100)
  const cAddress = customerLocation?.address || 'ที่อยู่จัดส่ง'

  const isStorePicker = mode === 'picker' && pickerTarget === 'store'
  const isCustomerPicker = mode === 'picker' && pickerTarget === 'customer'
  const currentPinLat = isStorePicker ? sLat : cLat
  const currentPinLng = isStorePicker ? sLng : cLng

  const activePlaceholder = searchPlaceholder || (
    isStorePicker 
      ? '🔍 พิมพ์ค้นหาที่ตั้งร้านค้า, ตลาด, อาคาร, ซอย, หรือถนน...'
      : '🔍 พิมพ์ค้นหาที่อยู่จัดส่ง, คอนโด, อาคาร, หรือสถานที่ใกล้เคียง...'
  )

  // Debounced Place Search
  const handleSearchInput = (text: string) => {
    setSearchQuery(text)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)

    if (!text.trim() || text.trim().length < 2) {
      setSearchResults([])
      setIsSearching(false)
      setIsDropdownOpen(false)
      return
    }

    setIsSearching(true)
    searchDebounceRef.current = setTimeout(async () => {
      const results = await searchPlaces(text, 6)
      setSearchResults(results)
      setIsSearching(false)
      setIsDropdownOpen(results.length > 0)
    }, 350)
  }

  // Handle Location Change (Drag, Click, Search)
  const handleLocationChanged = useCallback(async (lat: number, lng: number, shouldPan = false) => {
    const validLat = Number(lat.toFixed(6))
    const validLng = Number(lng.toFixed(6))
    onChangeLocation?.(validLat, validLng)

    setPinFeedback(`ปักหมุดพิกัด: ${validLat.toFixed(4)}, ${validLng.toFixed(4)}`)
    setTimeout(() => setPinFeedback(null), 3000)

    if (shouldPan && mapInstanceRef.current) {
      try {
        mapInstanceRef.current.panTo([validLat, validLng], { animate: true, duration: 0.5 })
      } catch (e) {}
    }

    if (onSelectAddressText) {
      const placeText = await reverseGeocode(validLat, validLng)
      if (placeText) {
        onSelectAddressText(placeText)
      }
    }
  }, [onChangeLocation, onSelectAddressText])

  // Handle Select Location from Search Dropdown
  const handleSelectPlace = (place: PlaceSearchResult) => {
    setIsDropdownOpen(false)
    setSearchQuery(place.display_name.split(',')[0] || place.display_name)
    handleLocationChanged(place.lat, place.lng, true)

    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.flyTo([place.lat, place.lng], 16, { duration: 1.2 })
      } catch (e) {
        mapInstanceRef.current.setView([place.lat, place.lng], 16)
      }
    }
  }

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Initialize Leaflet Map
  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    const initMap = () => {
      if (!mapContainerRef.current || mapInstanceRef.current) return
      const L = (window as any).L
      if (!L) return

      try {
        const targetLat = isStorePicker ? sLat : isCustomerPicker ? cLat : (sLat + cLat) / 2
        const targetLng = isStorePicker ? sLng : isCustomerPicker ? cLng : (sLng + cLng) / 2

        const map = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false
        }).setView([targetLat, targetLng], mode === 'picker' ? 15 : 13)

        mapInstanceRef.current = map

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          subdomains: ['a', 'b', 'c']
        }).addTo(map)

        L.control.zoom({ position: 'bottomright' }).addTo(map)

        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize()
            mapInstanceRef.current.setView([targetLat, targetLng], mode === 'picker' ? 15 : 13)
          }
        }, 150)

        setMapReady(true)
      } catch (err) {
        console.warn('Map initialization deferred:', err)
      }
    }

    if ((window as any).L) {
      initMap()
    } else {
      const script = document.createElement('script')
      script.id = 'leaflet-js'
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => initMap()
      document.body.appendChild(script)
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove()
        } catch (e) {}
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Auto-resize on container resize
  useEffect(() => {
    if (!mapContainerRef.current || !mapReady) return
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize()
      }
    })
    resizeObserver.observe(mapContainerRef.current)
    return () => resizeObserver.disconnect()
  }, [mapReady])

  // Update Markers and Map Click Events
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return
    const L = (window as any).L
    if (!L) return
    const map = mapInstanceRef.current

    try {
      map.invalidateSize()

      // Icons
      const storeIcon = L.divIcon({
        html: `
          <div style="background-color: #f97316; color: white; width: 42px; height: 42px; border-radius: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(249, 115, 22, 0.7); border: 3px solid white; font-size: 22px; cursor: grab;">
            🏬
          </div>
        `,
        className: 'store-leaflet-marker',
        iconSize: [42, 42],
        iconAnchor: [21, 21]
      })

      const custIcon = L.divIcon({
        html: `
          <div style="background-color: #10b981; color: white; width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(16, 185, 129, 0.7); border: 3px solid white; font-size: 22px; cursor: grab;">
            📍
          </div>
        `,
        className: 'cust-leaflet-marker',
        iconSize: [42, 42],
        iconAnchor: [21, 21]
      })

      const riderIcon = L.divIcon({
        html: `
          <div style="background-color: #3b82f6; color: white; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 18px rgba(59, 130, 246, 0.7); border: 3px solid white; font-size: 24px;">
            🛵
          </div>
        `,
        className: 'rider-leaflet-marker',
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      })

      // Remove existing layers and events
      map.off('click')
      if (markersRef.current.store) map.removeLayer(markersRef.current.store)
      if (markersRef.current.customer) map.removeLayer(markersRef.current.customer)
      if (markersRef.current.rider) map.removeLayer(markersRef.current.rider)
      if (markersRef.current.routeLine) map.removeLayer(markersRef.current.routeLine)
      if (markersRef.current.radiusCircle) map.removeLayer(markersRef.current.radiusCircle)

      // 1. Draw Radius Circle (Non-interactive)
      if (radiusKm && radiusKm > 0 && sLat && sLng) {
        const circle = L.circle([sLat, sLng], {
          radius: radiusKm * 1000,
          color: '#f97316',
          fillColor: '#f97316',
          fillOpacity: 0.08,
          weight: 2,
          dashArray: '6, 6',
          interactive: false
        }).addTo(map)
        markersRef.current.radiusCircle = circle
      }

      // 2. STORE PICKER MODE
      if (isStorePicker) {
        const sMarker = L.marker([sLat, sLng], {
          icon: storeIcon,
          draggable: true,
          autoPan: true
        }).addTo(map)

        sMarker.on('dragstart', () => { isDraggingRef.current = true })
        sMarker.on('dragend', () => {
          isDraggingRef.current = false
          const pos = sMarker.getLatLng()
          if (pos && isFinite(pos.lat) && isFinite(pos.lng)) {
            handleLocationChanged(pos.lat, pos.lng, false)
          }
        })

        // Map Click
        map.on('click', (e: any) => {
          if (e && e.latlng && isFinite(e.latlng.lat) && isFinite(e.latlng.lng)) {
            sMarker.setLatLng(e.latlng)
            handleLocationChanged(e.latlng.lat, e.latlng.lng, true)
          }
        })

        markersRef.current.store = sMarker

        // Snap view to pin whenever coords change meaningfully (e.g. data loaded from DB)
        const prev = prevPinRef.current
        const moved = !prev || Math.abs(prev.lat - sLat) > 0.001 || Math.abs(prev.lng - sLng) > 0.001
        if (!firstCenterDoneRef.current || moved) {
          firstCenterDoneRef.current = true
          prevPinRef.current = { lat: sLat, lng: sLng }
          try {
            map.setView([sLat, sLng], Math.max(map.getZoom(), 15), { animate: false })
            setTimeout(() => map.invalidateSize(), 80)
          } catch (e) {}
        }
      }

      // 3. CUSTOMER PICKER MODE
      else if (isCustomerPicker) {
        if (storeLocation) {
          const sMarker = L.marker([sLat, sLng], { icon: storeIcon, interactive: false })
            .addTo(map)
            .bindPopup(`<b>🏬 ${sName}</b><br/>จุดเริ่มต้นจัดส่ง (ร้านค้า)`)
          markersRef.current.store = sMarker
        }

        const cMarker = L.marker([cLat, cLng], {
          icon: custIcon,
          draggable: true,
          autoPan: true
        }).addTo(map)

        cMarker.on('dragstart', () => { isDraggingRef.current = true })
        cMarker.on('dragend', () => {
          isDraggingRef.current = false
          const pos = cMarker.getLatLng()
          if (pos && isFinite(pos.lat) && isFinite(pos.lng)) {
            handleLocationChanged(pos.lat, pos.lng, false)
          }
        })

        // Map Click
        map.on('click', (e: any) => {
          if (e && e.latlng && isFinite(e.latlng.lat) && isFinite(e.latlng.lng)) {
            cMarker.setLatLng(e.latlng)
            handleLocationChanged(e.latlng.lat, e.latlng.lng, true)
          }
        })

        markersRef.current.customer = cMarker

        // Snap view to customer pin on first load
        const prev = prevPinRef.current
        const moved = !prev || Math.abs(prev.lat - cLat) > 0.001 || Math.abs(prev.lng - cLng) > 0.001
        if (!firstCenterDoneRef.current || moved) {
          firstCenterDoneRef.current = true
          prevPinRef.current = { lat: cLat, lng: cLng }
          try {
            map.setView([cLat, cLng], Math.max(map.getZoom(), 15), { animate: false })
            setTimeout(() => map.invalidateSize(), 80)
          } catch (e) {}
        }
      }

      // 4. ROUTE & LIVE TRACK MODES
      else {
        const sMarker = L.marker([sLat, sLng], { icon: storeIcon }).addTo(map)
        markersRef.current.store = sMarker

        const cMarker = L.marker([cLat, cLng], { icon: custIcon }).addTo(map)
        markersRef.current.customer = cMarker

        // Fit bounds immediately while route loads
        const bounds = L.latLngBounds([[sLat, sLng], [cLat, cLng]])
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
        }

        // Draw placeholder straight line first, then replace with OSRM road route
        const placeholderLine = L.polyline([[sLat, sLng], [cLat, cLng]], {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.4,
          dashArray: '6, 8',
          interactive: false
        }).addTo(map)
        markersRef.current.routeLine = placeholderLine

        // Async fetch real road route from OSRM
        fetchRoadRoute(sLat, sLng, cLat, cLng).then((roadPoints) => {
          if (!mapInstanceRef.current) return
          routePointsRef.current = roadPoints

          // Remove placeholder and draw real road polyline (blue)
          if (markersRef.current.routeLine) {
            try { map.removeLayer(markersRef.current.routeLine) } catch (e) {}
          }

          const polyline = L.polyline(roadPoints, {
            color: '#2563eb',
            weight: 6,
            opacity: 0.92,
            lineCap: 'round',
            lineJoin: 'round',
            interactive: false
          }).addTo(map)
          markersRef.current.routeLine = polyline

          // Re-fit to actual road bounds
          const roadBounds = L.latLngBounds(roadPoints)
          if (roadBounds.isValid()) {
            map.fitBounds(roadBounds, { padding: [50, 50], maxZoom: 15 })
          }

          // Rider position on real road
          if (mode === 'live_track') {
            if (markersRef.current.rider) {
              try { map.removeLayer(markersRef.current.rider) } catch (e) {}
            }
            const safeProgress = Math.max(0, Math.min(1, Number(riderProgress) || 0))
            const pointIdx = Math.min(
              roadPoints.length - 1,
              Math.floor(safeProgress * (roadPoints.length - 1))
            )
            const riderPos = roadPoints[pointIdx] || [sLat, sLng]
            const rMarker = L.marker(riderPos, { icon: riderIcon }).addTo(map)
            markersRef.current.rider = rMarker
          }
        })

        // Initial rider (on straight line) if live_track, will be updated after OSRM loads
        if (mode === 'live_track') {
          const safeProgress = Math.max(0, Math.min(1, Number(riderProgress) || 0))
          const riderPos: [number, number] = [
            sLat + (cLat - sLat) * safeProgress,
            sLng + (cLng - sLng) * safeProgress
          ]
          const rMarker = L.marker(riderPos, { icon: riderIcon }).addTo(map)
          markersRef.current.rider = rMarker
        }
      }
    } catch (err) {
      console.warn('Map render cycle warning:', err)
    }
  }, [
    mapReady,
    mode,
    pickerTarget,
    isStorePicker,
    isCustomerPicker,
    sLat,
    sLng,
    sName,
    cLat,
    cLng,
    cAddress,
    riderProgress,
    riderStatus,
    radiusKm,
    handleLocationChanged
  ])

  // Center on current pin button
  const handleCenterOnPin = () => {
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.flyTo([currentPinLat, currentPinLng], 16, { duration: 1.0 })
      } catch (e) {
        mapInstanceRef.current.setView([currentPinLat, currentPinLng], 16)
      }
    }
  }

  // GPS Current Location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('อุปกรณ์ของคุณไม่รองรับ GPS')
      return
    }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false)
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        handleLocationChanged(lat, lng, true)
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.2 })
          } catch (e) {
            mapInstanceRef.current.setView([lat, lng], 16)
          }
        }
      },
      (err) => {
        setGpsLoading(false)
        alert('ไม่สามารถดึงตำแหน่งพิกัด GPS ได้: ' + err.message)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const distance = calculateDistanceKm(sLat, sLng, cLat, cLng)

  return (
    <div className={`relative flex flex-col overflow-visible rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 shadow-sm ${className}`}>
      
      {/* ── Search Bar ── */}
      {showSearch && mode === 'picker' && (
        <div ref={dropdownRef} className="relative z-30 p-2.5 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 rounded-t-2xl">
          <div className="relative flex items-center">
            <Search size={15} className="absolute left-3 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setIsDropdownOpen(true)
              }}
              placeholder={activePlaceholder}
              className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-20 text-xs font-bold text-zinc-900 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:ring-orange-500/20"
            />

            <div className="absolute right-2 flex items-center gap-1">
              {isSearching && <Loader2 size={14} className="animate-spin text-orange-500" />}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setSearchResults([])
                    setIsDropdownOpen(false)
                  }}
                  className="p-1 text-zinc-400 hover:text-zinc-600 rounded-md cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {isDropdownOpen && searchResults.length > 0 && (
            <div className="absolute left-2.5 right-2.5 top-full mt-1.5 z-50 max-h-56 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 animate-scale-up">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                ผลการค้นหาสถานที่ ({searchResults.length})
              </div>
              <div className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
                {searchResults.map((item) => (
                  <button
                    key={item.place_id}
                    type="button"
                    onClick={() => handleSelectPlace(item)}
                    className="flex w-full items-start gap-2.5 rounded-xl p-2.5 text-left text-xs transition hover:bg-orange-50 dark:hover:bg-zinc-800 cursor-pointer group"
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400 mt-0.5">
                      <MapPin size={13} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-zinc-900 dark:text-white group-hover:text-orange-600 truncate">
                        {item.display_name.split(',')[0]}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-medium">
                        {item.display_name}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Map Canvas Container */}
      <div className="relative overflow-hidden rounded-b-2xl cursor-crosshair">
        <div ref={mapContainerRef} style={{ height, width: '100%' }} className="z-0" />

        {/* Action Buttons at top right */}
        {mode === 'picker' && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            {/* Center on Pin Button */}
            <button
              type="button"
              onClick={handleCenterOnPin}
              title="เลื่อนไปที่ตำแหน่งหมุดปัจจุบัน"
              className="flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-2 text-xs font-bold text-zinc-800 shadow-md backdrop-blur hover:bg-white active:scale-95 transition dark:bg-zinc-900/95 dark:text-white border border-zinc-200 dark:border-zinc-700 cursor-pointer"
            >
              <Target size={14} className="text-orange-500" />
              <span>ไปยังหมุด</span>
            </button>

            {/* GPS Current Location Button */}
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={gpsLoading}
              title="ใช้พิกัดตำแหน่งอุปกรณ์ปัจจุบัน"
              className="flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-2 text-xs font-bold text-zinc-800 shadow-md backdrop-blur hover:bg-white active:scale-95 transition dark:bg-zinc-900/95 dark:text-white border border-zinc-200 dark:border-zinc-700 cursor-pointer"
            >
              <Navigation size={14} className={`text-orange-500 ${gpsLoading ? 'animate-spin' : ''}`} />
              <span>{gpsLoading ? 'กำลังค้นหา...' : 'พิกัดปัจจุบัน'}</span>
            </button>
          </div>
        )}

        {/* Live Pin Feedback Toast */}
        {pinFeedback && (
          <div className="absolute top-3 left-3 z-10 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white shadow-lg animate-bounce flex items-center gap-1.5">
            <Check size={14} />
            <span>{pinFeedback}</span>
          </div>
        )}

        {/* Distance Badge Floating in route/live_track mode */}
        {mode !== 'picker' && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-xl bg-white/95 px-3 py-1.5 text-xs font-bold text-zinc-900 shadow-md backdrop-blur dark:bg-zinc-900/95 dark:text-white border border-zinc-200 dark:border-zinc-700">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ระยะทางจัดส่ง: <b className="text-orange-600 dark:text-orange-400">{distance} กม.</b></span>
          </div>
        )}

        {/* Map Hint Footer */}
        {mode === 'picker' && (
          <div className="absolute bottom-3 left-3 right-3 z-10 rounded-xl bg-zinc-900/90 px-3 py-1.5 text-center text-[11px] font-medium text-white shadow-md backdrop-blur flex items-center justify-center gap-1.5">
            <Crosshair size={13} className="text-orange-400 shrink-0" />
            <span>แตะหรือคลิกตรงไหนก็ได้บนแผนที่เพื่อปักหมุด หรือลากหมุด {isStorePicker ? '🏬' : '📍'}</span>
          </div>
        )}
      </div>
    </div>
  )
}
