/**
 * Geocoding and Place Search Utility using OpenStreetMap Nominatim API
 */

export interface PlaceSearchResult {
  place_id: number | string
  display_name: string
  lat: number
  lng: number
  type?: string
  address?: {
    road?: string
    suburb?: string
    city_district?: string
    city?: string
    state?: string
    postcode?: string
    country?: string
  }
}

/**
 * Search places / addresses in Thailand
 */
export async function searchPlaces(query: string, limit = 5): Promise<PlaceSearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed || trimmed.length < 2) return []

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=th&q=${encodeURIComponent(
      trimmed
    )}&limit=${limit}`

    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'th, en',
        'User-Agent': 'SmartPOS-Delivery-App/1.0'
      }
    })

    if (!res.ok) return []

    const data = await res.json()
    return (data || []).map((item: any) => ({
      place_id: item.place_id,
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type,
      address: item.address
    }))
  } catch (error) {
    console.warn('Geocoding search error:', error)
    return []
  }
}

/**
 * Reverse Geocode: convert Lat/Lng into readable Thai address
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'th, en',
        'User-Agent': 'SmartPOS-Delivery-App/1.0'
      }
    })

    if (!res.ok) return null
    const data = await res.json()
    return data.display_name || null
  } catch (error) {
    console.warn('Reverse geocoding error:', error)
    return null
  }
}
