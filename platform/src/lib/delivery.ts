export interface DeliveryConfig {
  latitude?: number | null
  longitude?: number | null
  delivery_radius_km?: number
  base_delivery_fee?: number
  delivery_fee_per_km?: number
  min_delivery_fee?: number
  max_delivery_fee?: number
  free_delivery_threshold?: number
  avg_prep_time_minutes?: number
  delivery_enabled?: boolean
}

export const DEFAULT_DELIVERY_CONFIG: DeliveryConfig = {
  latitude: 13.7563,
  longitude: 100.5018,
  delivery_radius_km: 10,
  base_delivery_fee: 25,
  delivery_fee_per_km: 10,
  min_delivery_fee: 25,
  max_delivery_fee: 150,
  free_delivery_threshold: 500,
  avg_prep_time_minutes: 20,
  delivery_enabled: true
}

/**
 * Calculate Great-Circle Distance (Haversine formula) in kilometers
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0

  const R = 6371 // Radius of Earth in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const d = R * c

  // Account for typical urban road tortuosity (~1.2x straight-line distance)
  const roadDistance = d * 1.2
  return Math.round(roadDistance * 10) / 10
}

export interface DeliveryCalculationResult {
  distanceKm: number
  deliveryFee: number
  originalFee: number
  isFree: boolean
  isOutOfRange: boolean
  maxRadiusKm: number
  etaMinutes: number
  freeThresholdRemaining: number
}

/**
 * Calculate dynamic delivery fee and check service radius
 */
export function calculateDeliveryFee(
  storeLat: number,
  storeLng: number,
  customerLat: number,
  customerLng: number,
  subtotal: number,
  config?: Partial<DeliveryConfig>
): DeliveryCalculationResult {
  const merged: DeliveryConfig = { ...DEFAULT_DELIVERY_CONFIG, ...(config || {}) }
  const distanceKm = calculateDistanceKm(storeLat, storeLng, customerLat, customerLng)
  const maxRadiusKm = Number(merged.delivery_radius_km || 10)
  const isOutOfRange = distanceKm > maxRadiusKm

  const baseFee = Number(merged.base_delivery_fee ?? 25)
  const perKmFee = Number(merged.delivery_fee_per_km ?? 10)
  const minFee = Number(merged.min_delivery_fee ?? 25)
  const maxFee = Number(merged.max_delivery_fee ?? 150)
  const freeThreshold = Number(merged.free_delivery_threshold ?? 500)
  const prepTime = Number(merged.avg_prep_time_minutes ?? 20)

  // Distance fee calculation (First 1 km uses base fee, then + per km fee)
  let calculatedFee = baseFee
  if (distanceKm > 1) {
    calculatedFee = baseFee + (distanceKm - 1) * perKmFee
  }

  // Bound fee between min and max
  calculatedFee = Math.max(minFee, Math.min(maxFee, Math.round(calculatedFee)))
  const originalFee = calculatedFee

  // Check free delivery threshold
  const isFree = freeThreshold > 0 && subtotal >= freeThreshold
  const finalFee = isFree ? 0 : calculatedFee

  const freeThresholdRemaining = Math.max(0, freeThreshold - subtotal)

  // ETA Calculation: prep time + ~2.5 mins per km travel time
  const travelTimeMinutes = Math.ceil(distanceKm * 2.5)
  const etaMinutes = prepTime + travelTimeMinutes

  return {
    distanceKm,
    deliveryFee: finalFee,
    originalFee,
    isFree,
    isOutOfRange,
    maxRadiusKm,
    etaMinutes,
    freeThresholdRemaining
  }
}

/**
 * Fetch real road-following route from OSRM (Open Source Routing Machine).
 * Requests up to 3 alternative routes and picks the one with the SHORTEST
 * total distance (ใกล้ที่สุด / ไม่อ้อม).
 * Falls back to straight-line if the API is unavailable.
 */
export async function fetchRoadRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<[number, number][]> {
  try {
    // alternatives=3  → ask for up to 3 routes
    // approaches=unrestricted;unrestricted → don't force one-way entry/exit detours
    // overview=full   → full geometry (not simplified)
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${startLng},${startLat};${endLng},${endLat}` +
      `?overview=full&geometries=geojson&steps=false&alternatives=3&approaches=unrestricted;unrestricted`

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`OSRM ${res.status}`)
    const data = await res.json()

    const routes: Array<{ distance: number; geometry: { coordinates: [number, number][] } }> =
      data?.routes ?? []

    if (!routes.length) throw new Error('No routes returned')

    // Pick the route with the minimum total distance (shortest, not fastest)
    const shortest = routes.reduce((best, r) =>
      r.distance < best.distance ? r : best
    )

    const coords: [number, number][] = shortest.geometry.coordinates.map(
      (c) => [c[1], c[0]] as [number, number]
    )

    if (coords.length >= 2) return coords
    throw new Error('Empty geometry')
  } catch (err) {
    console.warn('OSRM routing unavailable, using straight-line fallback:', err)
    return [[startLat, startLng], [endLat, endLng]]
  }
}

/**
 * Generate interpolated route waypoints between store and customer
 * (Legacy fallback – use fetchRoadRoute for real roads)
 */
export function generateRoutePoints(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  pointsCount = 20
): [number, number][] {
  // Straight line (simple fallback)
  return [[startLat, startLng], [endLat, endLng]]
}

/**
 * Format minutes into readable Thai ETA string
 */
export function formatEtaString(etaMinutes: number): string {
  if (etaMinutes <= 0) return 'กำลังจัดส่ง'
  if (etaMinutes < 60) return `ประมาณ ${etaMinutes} นาที`
  const hours = Math.floor(etaMinutes / 60)
  const mins = etaMinutes % 60
  return mins > 0 ? `ประมาณ ${hours} ชม. ${mins} นาที` : `ประมาณ ${hours} ชม.`
}
