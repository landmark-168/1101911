import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import {
  Flame, ShoppingCart, Utensils, User, LogOut, Tag, MessageSquare,
  Clock, Compass, ArrowLeft, Check, MapPin, Search, Store, Navigation,
  Trash2, ChevronRight, Phone, Info, AlertCircle, Copy, Plus, Minus,
  Bell, Receipt, QrCode, DollarSign, X, CheckCircle2, Send, Sparkles, RefreshCw,
  ClipboardList
} from 'lucide-react'

const qc = new QueryClient()

export default function StorefrontWrapper() {
  return (
    <QueryClientProvider client={qc}>
      <StorefrontApp />
    </QueryClientProvider>
  )
}

function LeafletMapPicker({ lat, lng, onChangeLocation }: { lat: number, lng: number, onChangeLocation: (lat: number, lng: number) => void }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletInstance = useRef<any>(null)
  const markerInstance = useRef<any>(null)
  const [gpsLoading, setGpsLoading] = useState(false)

  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    const initMap = () => {
      if (!mapRef.current || leafletInstance.current) return
      const L = (window as any).L
      if (!L) return

      const map = L.map(mapRef.current).setView([lat, lng], 15)
      leafletInstance.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map)

      const marker = L.marker([lat, lng], { draggable: true }).addTo(map)
      markerInstance.current = marker

      marker.on('dragend', () => {
        const pos = marker.getLatLng()
        onChangeLocation(pos.lat, pos.lng)
      })

      map.on('click', (e: any) => {
        marker.setLatLng(e.latlng)
        onChangeLocation(e.latlng.lat, e.latlng.lng)
      })
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
  }, [])

  useEffect(() => {
    if (leafletInstance.current && markerInstance.current) {
      const L = (window as any).L
      if (L) {
        const newLatLng = new L.LatLng(lat, lng)
        markerInstance.current.setLatLng(newLatLng)
        leafletInstance.current.panTo(newLatLng)
      }
    }
  }, [lat, lng])

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('อุปกรณ์ของคุณไม่รองรับ GPS')
      return
    }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false)
        onChangeLocation(pos.coords.latitude, pos.coords.longitude)
      },
      (err) => {
        setGpsLoading(false)
        alert('ไม่สามารถดึงตำแหน่งพิกัดได้: ' + err.message)
      },
      { enableHighAccuracy: true }
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
          <MapPin size={14} className="text-orange-500" /> ปักหมุดพิกัดจัดส่งบนแผนที่
        </label>
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={gpsLoading}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 text-xs font-bold hover:bg-orange-100 transition disabled:opacity-50"
        >
          <Navigation size={12} className={gpsLoading ? 'animate-spin' : ''} />
          {gpsLoading ? 'กำลังดึงพิกัด...' : 'ใช้ตำแหน่งปัจจุบัน (GPS)'}
        </button>
      </div>
      
      <div className="relative rounded-xl overflow-hidden border border-zinc-200 shadow-inner h-52 bg-zinc-100">
        <div ref={mapRef} className="size-full z-10" />
      </div>
      
      <div className="flex items-center justify-between text-[11px] text-zinc-500 bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
        <span>พิกัดที่เลือก:</span>
        <span className="font-mono font-bold text-zinc-900">{lat.toFixed(6)}, {lng.toFixed(6)}</span>
      </div>
    </div>
  )
}

function ProductImageCarousel({ item, className = '' }: { item: any, className?: string }) {
  const gallery = (() => {
    const values = item?.image_url || item?.image_urls || item?.gallery || item?.images

    if (Array.isArray(values)) {
      return values.filter(Boolean)
    }

    if (typeof values === 'string') {
      return values
        .split('|')
        .map((url: string) => url.trim())
        .filter(Boolean)
    }

    return []
  })()

  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (gallery.length < 2) return

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % gallery.length)
    }, 2200)

    return () => window.clearInterval(timer)
  }, [gallery.length])

  if (gallery.length === 0) {
    return <span className="text-6xl select-none">🥩</span>
  }

  return (
    <div className={`relative size-full overflow-hidden ${className}`}>
      {gallery.map((src: string, index: number) => (
        <img
          key={`${src}-${index}`}
          src={src}
          alt="product"
          className={`absolute inset-0 size-full object-cover transition-all duration-700 ease-in-out ${
            index === activeIndex ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-6 opacity-0 scale-105'
          }`}
        />
      ))}

      {gallery.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/35 px-2 py-1 backdrop-blur-sm">
          {gallery.map((_: string, index: number) => (
            <span
              key={`dot-${index}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === activeIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function HeroAnimatedBackground({ bannerUrl }: { bannerUrl?: string }) {
  const embers = [
    { left: '8%', delay: '0s', duration: '4.2s', size: 'size-2 bg-orange-500' },
    { left: '22%', delay: '1.2s', duration: '5.0s', size: 'size-1.5 bg-amber-400' },
    { left: '35%', delay: '2.5s', duration: '4.6s', size: 'size-2 bg-rose-500' },
    { left: '48%', delay: '0.7s', duration: '5.8s', size: 'size-1.5 bg-orange-400' },
    { left: '62%', delay: '1.9s', duration: '4.4s', size: 'size-2.5 bg-amber-300' },
    { left: '76%', delay: '3.0s', duration: '5.2s', size: 'size-2 bg-orange-500' },
    { left: '88%', delay: '0.4s', duration: '4.8s', size: 'size-1.5 bg-rose-400' },
    { left: '15%', delay: '3.3s', duration: '5.5s', size: 'size-2 bg-amber-500' },
    { left: '55%', delay: '2.1s', duration: '4.7s', size: 'size-1.5 bg-orange-300' },
    { left: '94%', delay: '3.6s', duration: '5.1s', size: 'size-2 bg-amber-400' },
  ]

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
      {/* Background banner if set */}
      {bannerUrl && (
        <div
          className="absolute inset-0 opacity-20 bg-cover bg-center transition-transform duration-1000 scale-105"
          style={{ backgroundImage: `url(${bannerUrl})` }}
        />
      )}

      {/* Dynamic Animated Glowing Ambient Orbs */}
      <div className="absolute -top-20 -left-20 size-80 rounded-full bg-gradient-to-br from-orange-600/35 via-ember/25 to-transparent blur-3xl animate-ambient-pulse" />
      <div
        className="absolute -bottom-24 -right-10 size-96 rounded-full bg-gradient-to-tl from-ember/40 via-rose-600/25 to-transparent blur-3xl animate-ambient-pulse"
        style={{ animationDelay: '-3.5s' }}
      />
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 size-72 rounded-full bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-transparent blur-3xl animate-ambient-pulse"
        style={{ animationDelay: '-5s' }}
      />

      {/* Micro-sparkle Grid Pattern */}
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ff5b24_1px,transparent_1px)] [background-size:22px_22px]" />

      {/* Floating Hot Charcoal Embers / Sparks */}
      {embers.map((ember, i) => (
        <span
          key={i}
          className={`absolute bottom-0 rounded-full blur-[0.5px] shadow-[0_0_10px_#ff5b24] ${ember.size}`}
          style={{
            left: ember.left,
            animation: `emberRise ${ember.duration} ease-in-out ${ember.delay} infinite`
          }}
        />
      ))}
    </div>
  )
}

function HeroProductShowcase({ items = [], onAddToCart, onSelectItem }: { items?: any[], onAddToCart?: (item: any) => void, onSelectItem?: (item: any) => void }) {
  const fallbackItems = [
    {
      id: 'fallback-1',
      name: 'ชุดหมูกระทะรวมพรีเมียม',
      price: 399,
      description: 'หมูหมักนุ่ม สามชั้นสไลซ์ กุ้งสด และชุดผักรวม',
      image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=700&auto=format&fit=crop&q=80',
      badge: '🔥 เมนูยอดนิยม'
    },
    {
      id: 'fallback-2',
      name: 'ชุดเนื้อริบอายวากิวสไลซ์',
      price: 459,
      description: 'เนื้อลายหินอ่อนคัดพิเศษ นุ่มละลายในปาก',
      image_url: 'https://images.unsplash.com/photo-1558030006-450675393462?w=700&auto=format&fit=crop&q=80',
      badge: '⭐ ซิกเนเจอร์'
    },
    {
      id: 'fallback-3',
      name: 'ชุดกุ้งแม่น้ำและซีฟู้ดรวม',
      price: 429,
      description: 'กุ้งแม่น้ำตัวโต หมึกสด หอยเชลล์สดใหม่ทุกวัน',
      image_url: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=700&auto=format&fit=crop&q=80',
      badge: '🦐 สดจากทะเล'
    },
    {
      id: 'fallback-4',
      name: 'ชุดผักรวมและเห็ดเพื่อสุขภาพ',
      price: 129,
      description: 'ผักกาดขาว ผักบุ้ง เห็ดออรินจิ เห็ดเข็มทอง กรอบสด',
      image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=700&auto=format&fit=crop&q=80',
      badge: '🥬 สดจากไร่'
    }
  ]

  // Prepare display items from actual store menu or fallback items
  const displayItems = items && items.length > 0
    ? items.map((it, idx) => {
        let img = ''
        if (typeof it.image_url === 'string' && it.image_url) {
          img = it.image_url.split('|')[0]?.trim()
        } else if (Array.isArray(it.image_urls) && it.image_urls.length > 0) {
          img = it.image_urls[0]
        }
        return {
          ...it,
          image_url: img || fallbackItems[idx % fallbackItems.length].image_url,
          badge: it.badge || (idx === 0 ? '🔥 เมนูแนะนำ' : idx === 1 ? '⭐ ยอดนิยม' : '✨ สดใหม่')
        }
      })
    : fallbackItems

  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (displayItems.length <= 1) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayItems.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [displayItems.length])

  return (
    <div className="relative w-40 xs:w-48 sm:w-64 md:w-80 lg:w-96 aspect-square shrink-0 flex items-center justify-center select-none">
      {/* Outer ambient pulsing glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-ember/35 via-orange-500/20 to-transparent blur-xl sm:blur-2xl animate-pulse" />
      
      {/* Outer decorative glowing ring */}
      <div className="absolute -inset-0.5 sm:-inset-2 rounded-full border border-ember/30 sm:border-2 opacity-70 pointer-events-none" />

      {/* Main Round Showcase Window with sliding horizontal reel */}
      <div className="relative size-full rounded-full bg-coal/95 border sm:border-2 border-white/15 shadow-2xl overflow-hidden">
        {/* Horizontal sliding track */}
        <div
          className="flex size-full transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {displayItems.map((item, index) => (
            <div
              key={item.id || index}
              onClick={() => onSelectItem && onSelectItem(item)}
              className="relative size-full shrink-0 overflow-hidden flex items-center justify-center cursor-pointer group"
            >
              {/* Product Image */}
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="size-full object-cover filter brightness-95 contrast-105 transition duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="size-full flex items-center justify-center text-4xl sm:text-7xl bg-black/40">
                  🥩
                </div>
              )}

              {/* Dark gradient shadow overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/35 pointer-events-none" />

              {/* Top Badge */}
              <div className="absolute top-2.5 sm:top-5 z-20 pointer-events-none">
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9px] xs:text-[10px] sm:text-[11px] font-extrabold tracking-wide text-white bg-ember/90 backdrop-blur-md shadow-md border border-white/20">
                  {item.badge}
                </span>
              </div>

              {/* Bottom Product Info */}
              <div className="absolute bottom-2.5 xs:bottom-3.5 sm:bottom-6 inset-x-2 sm:inset-x-6 z-20 text-center flex flex-col items-center gap-0.5 sm:gap-1.5">
                <h3 className="text-xs xs:text-sm sm:text-base font-black text-white drop-shadow-md truncate max-w-[120px] xs:max-w-[150px] sm:max-w-[220px]">
                  {item.name}
                </h3>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-xs xs:text-sm sm:text-base font-black text-amber-400 drop-shadow">
                    ฿{Number(item.price).toLocaleString()}
                  </span>
                  {onAddToCart && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onAddToCart(item)
                      }}
                      className="px-2 xs:px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg bg-ember hover:bg-deep text-white text-[9px] xs:text-[10px] sm:text-[11px] font-bold shadow-md transition active:scale-95 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus size={11} /> สั่งเลย
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Previous / Next Arrow Controls */}
        {displayItems.length > 1 && (
          <>
            <button
              onClick={() => setCurrentIndex((prev) => (prev - 1 + displayItems.length) % displayItems.length)}
              className="absolute left-1.5 sm:left-2.5 top-1/2 -translate-y-1/2 z-30 size-6 sm:size-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm border border-white/15 text-[10px] sm:text-xs font-black transition cursor-pointer"
              aria-label="Previous product"
            >
              ❮
            </button>
            <button
              onClick={() => setCurrentIndex((prev) => (prev + 1) % displayItems.length)}
              className="absolute right-1.5 sm:right-2.5 top-1/2 -translate-y-1/2 z-30 size-6 sm:size-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm border border-white/15 text-[10px] sm:text-xs font-black transition cursor-pointer"
              aria-label="Next product"
            >
              ❯
            </button>
          </>
        )}
      </div>

      {/* Dot Pagination Below Circle */}
      {displayItems.length > 1 && (
        <div className="absolute -bottom-4 sm:-bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 shadow-md">
          {displayItems.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1 sm:h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentIndex ? 'w-3 sm:w-4 bg-ember' : 'w-1 sm:w-1.5 bg-white/40 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CallStaffModal({
  isOpen,
  onClose,
  tableName,
  storeId,
  tableId,
  tableOrders = [],
  defaultReason,
  onSuccess
}: {
  isOpen: boolean
  onClose: () => void
  tableName: string | null
  storeId: string | null
  tableId: string | null
  tableOrders?: any[]
  defaultReason?: string
  onSuccess: (reason: string) => void
}) {
  const [selectedType, setSelectedType] = useState<'service' | 'bill'>('service')
  const [customNote, setCustomNote] = useState('')

  useEffect(() => {
    if (defaultReason) {
      if (defaultReason.includes('เก็บเงิน') || defaultReason.includes('เช็คบิล') || defaultReason.includes('ชำระ')) {
        setSelectedType('bill')
      } else {
        setSelectedType('service')
      }
    }
  }, [defaultReason, isOpen])

  // Calculate total ordered amount and aggregate ordered food items
  const activeOrders = tableOrders.filter(
    (ord: any) => ord.status !== 'cancelled' && !ord.order_number?.startsWith('BILL') && !ord.order_number?.startsWith('SRV')
  )
  const totalAmount = activeOrders.reduce((sum: number, ord: any) => sum + Number(ord.total || 0), 0)

  const aggregatedItems: { name: string; quantity: number; total: number; unit_price: number }[] = []
  activeOrders.forEach((ord: any) => {
    (ord.items || []).forEach((item: any) => {
      const existing = aggregatedItems.find((i) => i.name === item.name)
      if (existing) {
        existing.quantity += (item.quantity || 1)
        existing.total += ((item.unit_price || 0) * (item.quantity || 1))
      } else {
        aggregatedItems.push({
          name: item.name,
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          total: (item.unit_price || 0) * (item.quantity || 1)
        })
      }
    })
  })

  const callStaffMutation = useMutation({
    mutationFn: async () => {
      if (!storeId || !tableId) throw new Error('ไม่พบข้อมูลโต๊ะ')
      const isPayment = selectedType === 'bill'
      const actionName = isPayment ? 'เรียกเก็บเงิน / เช็คบิล' : 'เรียกพนักงาน'
      const orderPayload: any = {
        store_id: storeId,
        table_id: tableId,
        order_number: (isPayment ? 'BILL' : 'SRV') + Math.floor(1000 + Math.random() * 9000),
        order_type: 'dine_in',
        status: 'pending',
        subtotal: 0,
        total: 0,
        customer_name: `โต๊ะ ${tableName} (${actionName})`,
        notes: `[${actionName}]${totalAmount > 0 && isPayment ? ` (ยอดรวม ฿${totalAmount.toLocaleString()})` : ''}${customNote ? ` : ${customNote}` : ''}`
      }
      const { error } = await supabase.from('store_orders').insert(orderPayload)
      if (error) {
        if (error.message?.includes('notes')) {
          delete orderPayload.notes
          const retry = await supabase.from('store_orders').insert(orderPayload)
          if (retry.error) throw retry.error
        } else {
          throw error
        }
      }
    },
    onSuccess: () => {
      const actionName = selectedType === 'bill' ? '💵 เรียกเก็บเงิน / เช็คบิล' : '🙋‍♂️ เรียกพนักงาน'
      onSuccess(actionName + (customNote ? ` (${customNote})` : ''))
      onClose()
      setCustomNote('')
    },
    onError: (err: any) => {
      console.error('Call staff error:', err)
      alert(`ไม่สามารถส่งคำขอได้: ${err.message || 'กรุณาลองใหม่อีกครั้ง'}`)
    }
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md bg-white border border-line rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto animate-scale-up">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
              <Bell size={20} className="animate-bounce" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-ink">บริการประจำโต๊ะ</h2>
              <p className="text-[11px] text-smoke font-medium">โต๊ะ {tableName} • บริการส่งตรงถึงโต๊ะคุณ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-soft hover:bg-zinc-200 text-smoke flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* 2 Primary Choices */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-ink block">เลือกบริการที่ต้องการ:</label>
          <div className="grid grid-cols-1 gap-2.5">
            {/* Option 1: เรียกพนักงาน */}
            <button
              type="button"
              onClick={() => setSelectedType('service')}
              className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left transition flex items-center justify-between cursor-pointer ${
                selectedType === 'service'
                  ? 'bg-amber-50/80 border-amber-500 shadow-sm'
                  : 'bg-white border-zinc-200 hover:border-zinc-300 text-zinc-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🙋‍♂️</span>
                <div>
                  <h3 className="font-extrabold text-sm text-zinc-950">เรียกพนักงาน</h3>
                  <p className="text-[11px] text-zinc-500 font-medium mt-0.5">บริการทั่วไป, เติมน้ำซุป, ขออุปกรณ์ หรือสอบถาม</p>
                </div>
              </div>
              <div className={`size-5 rounded-full border-2 grid place-items-center shrink-0 ${
                selectedType === 'service' ? 'border-amber-500 bg-amber-500 text-white' : 'border-zinc-300'
              }`}>
                {selectedType === 'service' && <Check size={13} strokeWidth={3} />}
              </div>
            </button>

            {/* Option 2: เรียกเก็บเงิน / เช็คบิล */}
            <button
              type="button"
              onClick={() => setSelectedType('bill')}
              className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left transition flex items-center justify-between cursor-pointer ${
                selectedType === 'bill'
                  ? 'bg-emerald-50/80 border-emerald-500 shadow-sm'
                  : 'bg-white border-zinc-200 hover:border-zinc-300 text-zinc-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">💵</span>
                <div>
                  <h3 className="font-extrabold text-sm text-zinc-950">เรียกเก็บเงิน / เช็คบิล</h3>
                  <p className="text-[11px] text-zinc-500 font-medium mt-0.5">ชำระเงินโอน QR PromptPay, เงินสด หรือบัตรเครดิต</p>
                </div>
              </div>
              <div className={`size-5 rounded-full border-2 grid place-items-center shrink-0 ${
                selectedType === 'bill' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-zinc-300'
              }`}>
                {selectedType === 'bill' && <Check size={13} strokeWidth={3} />}
              </div>
            </button>
          </div>

          {/* Ordered Food Items Breakdown when requesting Bill */}
          {selectedType === 'bill' && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2.5 animate-fade-in shadow-xs">
              <div className="flex items-center justify-between border-b border-emerald-200/70 pb-2">
                <span className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                  <Receipt size={14} className="text-emerald-700" /> รายการอาหารที่สั่งไปแล้ว
                </span>
                <span className="font-bold text-[11px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  {aggregatedItems.reduce((sum, it) => sum + it.quantity, 0)} ชิ้น
                </span>
              </div>

              {aggregatedItems.length > 0 ? (
                <div className="max-h-36 overflow-y-auto space-y-1.5 divide-y divide-emerald-200/40 pr-1">
                  {aggregatedItems.map((it, idx) => (
                    <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between font-medium text-emerald-950">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{it.name}</span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[11px] font-black shrink-0">
                          x{it.quantity}
                        </span>
                      </div>
                      <span className="font-extrabold shrink-0">฿{it.total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-emerald-700 text-center py-1 font-medium text-[11px]">ยังไม่มีรายการสั่งอาหาร</p>
              )}

              <div className="border-t border-emerald-300 pt-2 flex justify-between items-center">
                <span className="font-black text-emerald-950">ยอดรวมสุทธิทั้งสิ้น</span>
                <span className="text-base sm:text-lg font-black text-emerald-700">฿{totalAmount.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Optional Note */}
          <div className="space-y-1 pt-1">
            <label className="text-xs font-bold text-ink block">ระบุข้อความเพิ่มเติม (ถ้ามี):</label>
            <textarea
              rows={2}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder={selectedType === 'bill' ? 'เช่น เตรียมเงินทอน 1,000 บาท, จ่ายผ่าน QR Code...' : 'เช่น ขอเติมน้ำซุป, ขอพริกกระเทียมเพิ่ม...'}
              className="w-full border border-line outline-none rounded-xl p-2.5 bg-soft text-ink text-xs focus:border-amber-500 transition"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-line hover:bg-soft text-smoke font-bold text-xs transition cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => callStaffMutation.mutate()}
            disabled={callStaffMutation.isPending}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer text-white ${
              selectedType === 'bill'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            <Send size={13} />
            {callStaffMutation.isPending
              ? 'กำลังส่งคำขอ...'
              : selectedType === 'bill'
              ? 'ส่งคำขอเรียกเก็บเงิน'
              : 'ส่งคำขอเรียกพนักงาน'}
          </button>
        </div>
      </div>
    </div>
  )
}

function OrderSummaryModal({
  isOpen,
  onClose,
  tableName,
  tableOrders = [],
  onCallStaff
}: {
  isOpen: boolean
  onClose: () => void
  tableName: string | null
  tableOrders: any[]
  onCallStaff: (reason?: string) => void
}) {
  // Aggregate all ordered items across rounds
  const allOrderedItems: { name: string; unit_price: number; quantity: number; total: number }[] = []
  let totalAmount = 0

  tableOrders.forEach(ord => {
    if (ord.items && Array.isArray(ord.items)) {
      ord.items.forEach((it: any) => {
        const existing = allOrderedItems.find(x => x.name === it.name && Number(x.unit_price) === Number(it.unit_price))
        if (existing) {
          existing.quantity += it.quantity
          existing.total += Number(it.unit_price) * it.quantity
        } else {
          allOrderedItems.push({
            name: it.name,
            unit_price: Number(it.unit_price),
            quantity: it.quantity,
            total: Number(it.unit_price) * it.quantity
          })
        }
      })
    }
    totalAmount += Number(ord.total || 0)
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white border border-line rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto animate-scale-up">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-orange-50 text-ember">
              <Receipt size={20} />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-ink">ยอดรวมรายการอาหารที่สั่ง</h2>
              <p className="text-[11px] text-smoke font-medium">โต๊ะ {tableName} • รวมทุกรอบการสั่งในมื้อนี้</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-soft hover:bg-zinc-200 text-smoke flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Items List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-ink">
            <span>รายการอาหารที่สั่ง ({allOrderedItems.length} รายการ):</span>
            <span className="text-smoke font-normal">สั่งไปแล้ว {tableOrders.length} รอบ</span>
          </div>

          <div className="bg-soft/70 border border-line rounded-2xl p-3 max-h-56 overflow-y-auto divide-y divide-line/40 space-y-1.5">
            {allOrderedItems.length > 0 ? (
              allOrderedItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs pt-1.5 first:pt-0 font-medium text-ink">
                  <span className="truncate max-w-[220px]">🥩 {item.name} <small className="text-smoke font-bold">x{item.quantity}</small></span>
                  <b className="text-ink">฿{item.total.toLocaleString()}</b>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-smoke py-6">ยังไม่มีรายการสั่งอาหารที่ยืนยันในรอบนี้</p>
            )}
          </div>

          {/* Grand Total Bar */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-orange-500/10 to-ember/10 border border-ember/30 flex justify-between items-center">
            <span className="text-xs font-black text-ink">ยอดรวมทั้งสิ้น (Total):</span>
            <span className="text-lg sm:text-xl font-black text-ember">฿{totalAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* Quick Call Staff for payment button */}
        <div className="pt-2 border-t border-line">
          <button
            onClick={() => {
              onClose()
              onCallStaff('💵 เรียกเก็บเงิน / เช็คบิล')
            }}
            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
          >
            <Bell size={15} /> เรียกพนักงานเก็บเงิน / เช็คบิล
          </button>
        </div>

        <div className="pt-0.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-soft hover:bg-zinc-200 text-smoke font-bold text-xs transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  )
}

function ProductDetailModal({
  item,
  categories = [],
  isOpen,
  onClose,
  cartQty,
  onAddToCart,
  onChangeQty
}: {
  item: any | null
  categories?: any[]
  isOpen: boolean
  onClose: () => void
  cartQty: number
  onAddToCart: (item: any) => void
  onChangeQty: (id: string, delta: number) => void
}) {
  if (!isOpen || !item) return null

  const categoryName = item.category?.name || categories.find(c => c.id === item.category_id)?.name

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-zinc-200/80 animate-scale-up max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 size-8 sm:size-9 rounded-full bg-black/50 hover:bg-black/75 text-white grid place-items-center backdrop-blur-md transition cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Large Food Image */}
        <div className="relative aspect-video sm:aspect-4/3 w-full bg-zinc-100 shrink-0 overflow-hidden">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="size-full object-cover"
            />
          ) : (
            <div className="grid size-full place-items-center bg-orange-50 text-5xl">
              🍲
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {categoryName && (
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold text-orange-600 bg-orange-50 border border-orange-200/60">
                  📁 {categoryName}
                </span>
              )}
              {item.badge && (
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60">
                  {item.badge}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-zinc-950">
              {item.name}
            </h2>
            <div className="text-xl font-black text-orange-500">
              ฿{Number(item.price || 0).toLocaleString()}
            </div>
          </div>

          {/* Real Description */}
          {item.description ? (
            <div className="space-y-1 border-t border-zinc-100 pt-3">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                รายละเอียดเมนู
              </h4>
              <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-line">
                {item.description}
              </p>
            </div>
          ) : (
            <div className="border-t border-zinc-100 pt-3">
              <p className="text-xs text-zinc-400 italic">
                (ไม่มีคำอธิบายเพิ่มเติมสำหรับเมนูนี้)
              </p>
            </div>
          )}
        </div>

        {/* Bottom Bar: Action / Stepper */}
        <div className="p-4 sm:p-5 border-t border-zinc-100 bg-zinc-50/70 flex items-center justify-between gap-3 shrink-0">
          <div>
            <span className="text-[11px] text-zinc-400 font-bold block">ราคารวม</span>
            <span className="text-lg font-black text-zinc-950">
              ฿{Number((item.price || 0) * (cartQty > 0 ? cartQty : 1)).toLocaleString()}
            </span>
          </div>

          {cartQty > 0 ? (
            <div className="flex items-center gap-3 bg-emerald-600 text-white rounded-2xl px-4 py-2 shadow-md">
              <button
                onClick={() => onChangeQty(item.id, -1)}
                className="size-7 rounded-full bg-white/20 hover:bg-white/30 grid place-items-center font-black text-sm active:scale-90 cursor-pointer"
              >
                -
              </button>
              <span className="text-base font-black px-1 min-w-[20px] text-center">{cartQty}</span>
              <button
                onClick={() => onChangeQty(item.id, 1)}
                className="size-7 rounded-full bg-white/20 hover:bg-white/30 grid place-items-center font-black text-sm active:scale-90 cursor-pointer"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                onAddToCart(item)
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-sm font-black shadow-md transition cursor-pointer"
            >
              <Plus size={18} strokeWidth={2.8} /> เพิ่มลงตะกร้า
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function OrderProcessStepper({ status, orderType = 'dine_in' }: { status: string; orderType?: string }) {
  const isDelivery = orderType === 'delivery'
  const steps = [
    { step: 1, label: 'รับออเดอร์', Icon: ClipboardList },
    { step: 2, label: 'กำลังปรุง', Icon: Flame },
    { step: 3, label: isDelivery ? 'กำลังจัดส่ง' : 'พร้อมเสิร์ฟ', Icon: Utensils },
    { step: 4, label: isDelivery ? 'จัดส่งสำเร็จ' : 'เสิร์ฟเรียบร้อย', Icon: Sparkles }
  ]

  let currentStep = 1
  if (['pending', 'accepted', 'waiting'].includes(status)) currentStep = 1
  else if (status === 'preparing') currentStep = 2
  else if (status === 'ready') currentStep = 3
  else if (['completed', 'delivered', 'served'].includes(status)) currentStep = 4

  if (status === 'cancelled') {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl bg-red-50 p-3.5 text-xs font-bold text-red-600 border border-red-200">
        <AlertCircle size={16} /> ออเดอร์นี้ถูกยกเลิกแล้ว (Cancelled)
      </div>
    )
  }

  const progressPercent = currentStep === 1 ? 0 : currentStep === 2 ? 33.33 : currentStep === 3 ? 66.66 : 100

  return (
    <div className="py-3 px-1 sm:px-4">
      <div className="relative flex items-center justify-between">
        {/* Background Connecting Line */}
        <div className="absolute left-5 right-5 top-4 h-1 bg-zinc-200 -translate-y-1/2 z-0 rounded-full" />
        
        {/* Active Progress Line */}
        <div
          className="absolute left-5 top-4 h-1 bg-emerald-500 -translate-y-1/2 z-0 rounded-full transition-all duration-500"
          style={{ width: `calc((100% - 2.5rem) * ${progressPercent / 100})` }}
        />

        {/* 4 Connected Circular Steps */}
        {steps.map((s) => {
          const isDone = currentStep > s.step
          const isCurrent = currentStep === s.step

          return (
            <div key={s.step} className="relative z-10 flex flex-col items-center gap-2">
              <div
                className={`grid size-8 sm:size-9 place-items-center rounded-full text-xs font-black transition-all shadow-sm ${
                  isCurrent
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-100 animate-breathing'
                    : isDone
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white border-2 border-zinc-300 text-zinc-400'
                }`}
              >
                {isDone ? (
                  <Check size={14} strokeWidth={3} className="text-white" />
                ) : (
                  <s.Icon size={14} strokeWidth={2.3} />
                )}
              </div>
              <span
                className={`text-[10px] sm:text-[11px] font-bold text-center select-none ${
                  isCurrent
                    ? 'text-emerald-700 font-extrabold'
                    : isDone
                    ? 'text-zinc-800'
                    : 'text-zinc-400'
                }`}
              >
                {s.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StorefrontApp() {
  const [storeId, setStoreId] = useState<string | null>(null)
  const [tableId, setTableId] = useState<string | null>(null)
  const [tableName, setTableName] = useState<string | null>(null)
  const [sessionOpenedAt, setSessionOpenedAt] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const [isCallStaffOpen, setIsCallStaffOpen] = useState(false)
  const [callStaffDefaultReason, setCallStaffDefaultReason] = useState('💵 เรียกเก็บเงิน / เช็คบิล')
  const [isBillOpen, setIsBillOpen] = useState(false)
  const [activeServiceRequest, setActiveServiceRequest] = useState<{ type: string; time: string } | null>(null)

  const [view, setView] = useState<'home' | 'order' | 'cart' | 'checkout' | 'track' | 'promotions' | 'contact' | 'login'>('home')
  const [customer, setCustomer] = useState<{ name: string; phone: string; email?: string } | null>(() => {
    const saved = localStorage.getItem('sfCustomer')
    return saved ? JSON.parse(saved) : null
  })

  const [cart, setCart] = useState<{ item: any; quantity: number; notes: string }[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/qr/')) {
        return []
      }
      const saved = localStorage.getItem('sfCart')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [lastOrder, setLastOrder] = useState<any>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/qr/')) {
      return null
    }
    const saved = localStorage.getItem('sfLastOrder')
    return saved ? JSON.parse(saved) : null
  })

  const [address, setAddress] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    address: '',
    note: '',
    lat: 13.7563,
    lng: 100.5018
  })

  const [toast, setToast] = useState({ show: false, message: '' })
  const showToast = (message: string) => {
    setToast({ show: true, message })
    setTimeout(() => setToast({ show: false, message: '' }), 2500)
  }

  useEffect(() => {
    if (!window.location.pathname.startsWith('/qr/')) {
      localStorage.setItem('sfCart', JSON.stringify(cart))
    }
  }, [cart])

  useEffect(() => {
    if (!window.location.pathname.startsWith('/qr/')) {
      localStorage.setItem('sfLastOrder', JSON.stringify(lastOrder))
    }
  }, [lastOrder])

  useEffect(() => {
    if (customer) localStorage.setItem('sfCustomer', JSON.stringify(customer))
    else localStorage.removeItem('sfCustomer')
  }, [customer])

  useEffect(() => {
    const path = window.location.pathname
    const param = path.split('/')[2]
    if (path.startsWith('/qr/')) {
      supabase.from('store_tables').select('id, store_id, table_number, status, session_opened_at').eq('qr_token', param).maybeSingle().then(({ data, error }) => {
        if (error || !data) return setErrorMsg('QR Code ไม่ถูกต้อง หรือหมดอายุแล้ว')
        if (data.status !== 'occupied') return setErrorMsg('โต๊ะนี้ปิดแล้ว กรุณาติดต่อพนักงาน')
        
        // Clear all previous cart items on table QR entry to ensure clean session
        setCart([])
        setLastOrder(null)
        localStorage.removeItem('sfCart')
        localStorage.removeItem('sfLastOrder')

        setStoreId(data.store_id)
        setTableId(data.id)
        setTableName(data.table_number)
        setSessionOpenedAt(data.session_opened_at)
        setView('order')
      })
    } else if (path.startsWith('/s/')) {
      setStoreId(param)
      setView('home')
    } else {
      setErrorMsg('ลิงก์ไม่ถูกต้อง')
    }
  }, [])

  const storeQuery = useQuery({
    queryKey: ['store_profile', storeId],
    queryFn: async () => {
      const [{ data: shop }, { data: settings }] = await Promise.all([
        supabase.from('shops').select('*').eq('id', storeId).maybeSingle(),
        supabase.from('store_settings').select('*').eq('store_id', storeId).maybeSingle()
      ])
      return { shop, settings }
    },
    enabled: !!storeId
  })

  const menuQuery = useQuery({
    queryKey: ['store_menu', storeId],
    queryFn: async () => {
      const [{ data: cats }, { data: items }] = await Promise.all([
        supabase.from('store_categories').select('*').eq('store_id', storeId).eq('status', 'active').order('sort_order'),
        supabase.from('store_menu_items').select('*').eq('store_id', storeId).eq('available', true)
      ])
      return { categories: cats || [], items: items || [] }
    },
    enabled: !!storeId
  })

  const tableOrdersQuery = useQuery({
    queryKey: ['table_orders', tableId, sessionOpenedAt],
    queryFn: async () => {
      if (!tableId) return []
      let q = supabase
        .from('store_orders')
        .select(`
          *,
          items:store_order_items(*)
        `)
        .eq('table_id', tableId)
        .order('created_at', { ascending: false })
      // Only show orders from the current session (after table was opened)
      if (sessionOpenedAt) q = q.gte('created_at', sessionOpenedAt)
      const { data, error } = await q
      if (error) throw error
      return data || []
    },
    enabled: !!tableId,
    refetchInterval: 4000
  })

  const checkout = useMutation({
    mutationFn: async () => {
      if (!storeId) throw new Error('ไม่พบข้อมูลร้านค้า')
      if (cart.length === 0) throw new Error('ไม่มีสินค้าในตะกร้า')
      if (!customer && !tableId) throw new Error('กรุณาล็อกอินก่อนทำการสั่งซื้อ')

      const totalPrice = cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0)
      const mapUrl = `https://maps.google.com/?q=${address.lat},${address.lng}`
      const deliveryNotes = tableId
        ? `ทานที่ร้าน โต๊ะ ${tableName}`
        : `เดลิเวอรีส่งถึง: ${address.name} (${address.phone})\nที่อยู่: ${address.address}\nจุดสังเกต: ${address.note}\nพิกัด GPS: ${address.lat.toFixed(6)}, ${address.lng.toFixed(6)}\nแผนที่นำทาง: ${mapUrl}`

      const orderPayload: any = {
        store_id: storeId,
        table_id: tableId,
        order_number: 'ORD' + Math.floor(1000 + Math.random() * 9000),
        order_type: tableId ? 'dine_in' : 'delivery',
        status: 'pending',
        subtotal: totalPrice,
        total: totalPrice,
        customer_name: tableId ? `โต๊ะ ${tableName}` : (address.name || customer?.name || 'เดลิเวอรี'),
        notes: deliveryNotes
      }

      let order: any
      let { data, error: orderErr } = await supabase.from('store_orders').insert(orderPayload).select().single()

      if (orderErr) {
        // Fallback if 'notes' column is missing in remote database schema cache
        if (orderErr.message?.includes('notes') || orderErr.code === 'PGRST204') {
          delete orderPayload.notes
          if (!tableId) {
            // For delivery only: pack address info into customer_name as fallback
            orderPayload.customer_name = `${address.name || customer?.name || 'เดลิเวอรี'} | ${address.phone} | ${address.address} (GPS: ${address.lat.toFixed(4)},${address.lng.toFixed(4)})`
          }
          const retry = await supabase.from('store_orders').insert(orderPayload).select().single()
          if (retry.error) throw retry.error
          order = retry.data
        } else {
          throw orderErr
        }
      } else {
        order = data
      }

      const itemsToInsert = cart.map(c => ({
        store_id: storeId,
        order_id: order.id,
        menu_item_id: c.item.id,
        name: c.item.name,
        unit_price: c.item.price,
        quantity: c.quantity,
        notes: c.notes || ''
      }))

      const { error: itemsErr } = await supabase.from('store_order_items').insert(itemsToInsert)
      if (itemsErr) throw itemsErr

      return order
    },
    onSuccess: (order) => {
      const newLastOrder = {
        id: `#ORD-${order.order_number || order.id.slice(0, 5)}`,
        orderId: order.id,
        total: cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0),
        status: 'กำลังปรุงอาหาร',
        items: [...cart],
        address: { ...address },
        time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'
      }
      setLastOrder(newLastOrder)
      setCart([])
      setView('track')
      showToast('ส่งคำสั่งซื้อสำเร็จเรียบร้อยแล้ว!')
    },
    onError: (e) => showToast((e as Error).message)
  })

  const [activeCat, setActiveCat] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [detailItem, setDetailItem] = useState<any | null>(null)

  const addToCart = (item: any) => {
    const existing = cart.find(x => x.item.id === item.id)
    if (existing) {
      setCart(cart.map(x => x.item.id === item.id ? { ...x, quantity: x.quantity + 1 } : x))
    } else {
      setCart([...cart, { item, quantity: 1, notes: '' }])
    }
    showToast(`เพิ่ม ${item.name} ลงตะกร้าแล้ว`)
  }

  const changeQty = (id: string, delta: number) => {
    setCart(cart.map(x => x.item.id === id ? { ...x, quantity: Math.max(0, x.quantity + delta) } : x).filter(x => x.quantity > 0))
  }

  const getCartTotal = () => cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0)
  const getCartCount = () => cart.reduce((sum, c) => sum + c.quantity, 0)

  const requireAuthAndNavigate = (targetView: typeof view) => {
    if (!customer && !tableId) {
      showToast('กรุณาเข้าสู่ระบบก่อนดำเนินการต่อ')
      setView('login')
    } else {
      setView(targetView)
    }
  }

  if (errorMsg) {
    const isClosed = errorMsg.includes('ปิดแล้ว') || errorMsg.includes('หมดอายุ')
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#faf7f2] text-center font-sans">
        <div className="max-w-sm w-full bg-white rounded-3xl p-8 border border-zinc-200 shadow-xl space-y-4">
          <div className="size-16 mx-auto rounded-full bg-orange-50 text-orange-600 flex items-center justify-center text-3xl shadow-inner border border-orange-200">
            {isClosed ? '🍽️' : '⚠️'}
          </div>
          <h2 className="text-xl font-black text-zinc-900">
            {isClosed ? 'โต๊ะนี้ยังไม่ได้เปิดให้บริการ' : 'เกิดข้อผิดพลาด'}
          </h2>
          <p className="text-xs text-zinc-500 font-medium leading-relaxed">
            {isClosed
              ? 'โต๊ะนี้ยังไม่เปิดใช้งาน หรือเช็คบิลปิดโต๊ะเรียบร้อยแล้ว กรุณาติดต่อพนักงานเพื่อเปิดโต๊ะใหม่ครับ'
              : errorMsg}
          </p>
        </div>
      </div>
    )
  }
  if (!storeId || storeQuery.isLoading || menuQuery.isLoading) return <div className="grid min-h-screen place-items-center bg-[#faf7f2] text-sm font-bold text-zinc-400">กำลังโหลดข้อมูลร้าน…</div>

  const shop = storeQuery.data?.shop
  const settings = storeQuery.data?.settings
  const categories = menuQuery.data?.categories || []
  let items = menuQuery.data?.items || []
  if (activeCat !== 'all') items = items.filter(x => x.category_id === activeCat)
  if (search) items = items.filter(x => x.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col font-sans">
      
      {/* Floating Toast Notification */}
      <div
        className={`fixed top-4 right-4 z-50 bg-zinc-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-bold transition-all duration-300 pointer-events-none ${
          toast.show ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-90 pointer-events-none'
        }`}
      >
        {toast.message}
      </div>

      <header className="fixed top-0 left-0 right-0 z-40 h-14 sm:h-16 bg-white/95 backdrop-blur-md border-b border-zinc-200 shadow-sm px-3 sm:px-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 cursor-pointer min-w-0" onClick={() => setView('home')}>
          {settings?.logo_url ? (
            <img src={settings.logo_url} className="size-8 sm:size-9 rounded-full object-cover border border-zinc-200 shrink-0" />
          ) : (
            <span className="grid size-8 sm:size-9 place-items-center rounded-full bg-orange-500 text-white shadow-md shrink-0">
              <Flame size={16} fill="currentColor" />
            </span>
          )}
          <span className="font-extrabold text-base sm:text-lg tracking-tight text-zinc-900 truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none">{shop?.name || 'ร้านค้า'}</span>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          {[
            ['home', 'หน้าแรก'],
            ['order', 'สั่งอาหาร'],
            ['track', 'ประวัติ'],
            ...(!tableId ? [
              ['promotions', 'โปรโมชั่น'],
              ['contact', 'ติดต่อเรา']
            ] : [])
          ].map(([v, label]) => (
            <button
              key={v}
              onClick={() => {
                if (['order', 'cart', 'checkout'].includes(v) && !tableId) {
                  requireAuthAndNavigate(v as any)
                } else {
                  setView(v as any)
                }
              }}
              className={`text-sm font-semibold transition hover:text-orange-500 ${view === v ? 'text-orange-500 font-bold' : 'text-zinc-500'}`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {tableId ? (
            <>
              <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 font-bold text-[11px] sm:text-xs flex items-center gap-1">
                <MapPin size={12} className="shrink-0" /> โต๊ะ {tableName}
              </div>
              <button
                onClick={() => {
                  setCallStaffDefaultReason('💵 เรียกเก็บเงิน / เช็คบิล')
                  setIsCallStaffOpen(true)
                }}
                className="animate-breathing flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md transition active:scale-95 cursor-pointer"
                title="เรียกพนักงาน"
              >
                <Bell size={13} />
                <span>เรียกพนักงาน</span>
              </button>
            </>
          ) : customer ? (
            <>
              <div className="hidden sm:block text-right">
                <p className="text-[10px] text-zinc-400 font-medium">เข้าใช้งานโดย</p>
                <p className="text-xs font-bold text-zinc-900 truncate max-w-[120px]">{customer.name}</p>
              </div>
              <button
                onClick={() => { setCustomer(null); showToast('ออกจากระบบแล้ว') }}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-bold text-zinc-500 hover:bg-zinc-50 cursor-pointer"
              >
                <LogOut size={13} /> <span className="hidden xs:inline">ออกจากระบบ</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setView('login')}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold transition hover:bg-zinc-800 cursor-pointer"
            >
              <User size={13} /> เข้าสู่ระบบ
            </button>
          )}
        </div>
      </header>

      {/* Active Service Call Notification Alert Bar */}
      {activeServiceRequest && tableId && (
        <div className="fixed top-14 sm:top-16 left-0 right-0 z-30 bg-amber-100/95 backdrop-blur-md border-b border-amber-300 px-3 sm:px-4 py-2 flex items-center justify-between text-xs text-amber-900 font-bold animate-fade-in shadow-inner">
          <div className="flex items-center gap-2 min-w-0">
            <span className="size-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
            <span className="truncate">
              🔔 กำลังเรียกพนักงาน: <span className="font-semibold text-amber-800">{activeServiceRequest.type}</span>
            </span>
            <span className="hidden sm:inline text-[10px] text-amber-600 font-normal">({activeServiceRequest.time})</span>
          </div>
          <button
            onClick={() => {
              setActiveServiceRequest(null)
              showToast('ยกเลิกการเรียกพนักงานแล้ว')
            }}
            className="text-[11px] text-amber-800 hover:text-red-600 underline font-bold shrink-0 ml-2 cursor-pointer"
          >
            ยกเลิกการเรียก
          </button>
        </div>
      )}

      {/* Fixed Bottom Mobile Navigation on ALL pages */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-line px-1 sm:px-2 py-1.5 flex items-center justify-around z-30 shadow-lg pb-safe">
        {[
          ['home', Compass, 'หน้าแรก'],
          ['order', Utensils, 'สั่งอาหาร'],
          ['track', Clock, 'ประวัติ'],
          ...(!tableId ? [
            ['promotions', Tag, 'โปรโมชั่น'],
            ['contact', MessageSquare, 'ติดต่อเรา'],
          ] : [])
        ].map(([v, Icon, label]: any) => (
          <button
            key={v}
            onClick={() => {
              if (['order', 'cart', 'checkout'].includes(v) && !tableId) {
                requireAuthAndNavigate(v)
              } else {
                setView(v)
              }
            }}
            className={`flex flex-col items-center gap-0.5 sm:gap-1 p-1 text-[10px] font-bold transition ${view === v ? 'text-ember' : 'text-smoke hover:text-ink'}`}
          >
            <Icon size={17} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ── Main View Switcher ── */}
      <main className={`flex-1 pb-24 md:pb-8 ${activeServiceRequest && tableId ? 'pt-24 sm:pt-28' : 'pt-15 sm:pt-18'}`}>

        {/* ── VIEW: Login / Customer Auth ── */}
        {view === 'login' && (
          <div className="max-w-md mx-auto my-6 sm:my-12 px-4">
            <div className="bg-white border border-line p-5 sm:p-8 rounded-3xl shadow-xl space-y-6">
              <div className="text-center space-y-2">
                <span className="inline-grid size-12 place-items-center rounded-full bg-ember/10 text-ember">
                  <User size={24} />
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-ink">เข้าสู่ระบบสั่งเดลิเวอรี</h2>
                <p className="text-xs text-smoke font-medium">กรอกชื่อและเบอร์โทรศัพท์เพื่อเริ่มสั่งอาหารสะสมแต้ม</p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const form = e.target as any
                  const name = form.name.value
                  const phone = form.phone.value
                  if (!name || !phone) return alert('กรุณากรอกข้อมูลให้ครบถ้วน')
                  const newCust = { name, phone }
                  setCustomer(newCust)
                  setAddress(prev => ({ ...prev, name, phone }))
                  showToast('เข้าสู่ระบบสำเร็จแล้ว!')
                  setView('order')
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-ink">ชื่อ-นามสกุล ผู้ใช้งาน</label>
                  <input
                    name="name"
                    type="text"
                    required
                    placeholder="เช่น สมชาย ใจดี"
                    className="w-full border border-line focus:border-ember outline-none rounded-xl p-3 bg-soft text-ink text-sm transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-ink">เบอร์โทรศัพท์ติดต่อ</label>
                  <input
                    name="phone"
                    type="tel"
                    required
                    placeholder="เช่น 0812345678"
                    className="w-full border border-line focus:border-ember outline-none rounded-xl p-3 bg-soft text-ink text-sm transition"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-ember hover:bg-deep text-white font-bold text-sm shadow-md transition active:scale-95 cursor-pointer"
                >
                  เข้าสู่ระบบ / สมัครสมาชิก
                </button>
              </form>

              <div className="p-3.5 rounded-xl bg-paper/60 border border-line text-[11px] text-smoke space-y-1">
                💡 <strong>เข้าใช้งานได้ง่ายๆ:</strong> ระบบจะจดจำโปรไฟล์และพิกัดจัดส่งของคุณไว้สำหรับการสั่งซื้อในครั้งถัดไปโดยอัตโนมัติ
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW: Home (Landing Page) ── */}
        {view === 'home' && (
          <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-8 sm:space-y-12 bg-paper">
            <section className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-coal text-paper p-4 xs:p-5 sm:p-8 lg:p-14 flex flex-row items-center justify-between gap-3 sm:gap-8 border border-white/10 shadow-2xl">
              <HeroAnimatedBackground bannerUrl={settings?.banner_url} />
              
              {/* Floating ambient badge top-right */}
              <div className="hidden lg:flex items-center gap-2 absolute top-6 right-8 z-20 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white text-xs font-bold shadow-lg animate-float-slow pointer-events-none">
                <span className="text-amber-400">✨</span> วัตถุดิบเกรดพรีเมียม 100%
              </div>

              {/* Floating ambient badge bottom-left */}
              <div className="hidden md:flex items-center gap-2 absolute bottom-5 left-8 z-20 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-ember/30 text-white text-[11px] font-bold shadow-xl animate-float-reverse pointer-events-none">
                <span className="text-ember">🔥</span> การันตีความสด อร่อยทุกคำ
              </div>

              <div className="relative z-10 space-y-2 xs:space-y-3 sm:space-y-4 max-w-xl text-left flex flex-col items-start flex-1 min-w-0 pr-1 sm:pr-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-ember/10 border border-ember/30 text-[10px] sm:text-xs font-bold text-ember">
                  <span className="size-1.5 sm:size-2 rounded-full bg-ember animate-ping" />
                  เปิดให้บริการทุกวัน 11:00 – 23:00 น.
                </span>
                <h1 className="text-base xs:text-xl sm:text-3xl lg:text-5xl font-black font-sans leading-tight">
                  {shop?.name || 'หมูกระทะพรีเมียม'} <br />
                  <span className="text-ember">สดทุกคำ ร้อนทุกเตา</span>
                </h1>
                <p className="hidden md:block text-xs sm:text-sm text-smoke leading-relaxed max-w-md line-clamp-2">
                  {settings?.description || 'คัดสรรวัตถุดิบคุณภาพพรีเมียมจากแหล่งที่ดีที่สุด ส่งตรงถึงบ้านด้วยไรเดอร์มืออาชีพ หรือสำรองโต๊ะนั่งอร่อยฟินหน้าร้าน'}
                </p>
                <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2 sm:gap-3 pt-0.5 sm:pt-1">
                  <button
                    onClick={() => requireAuthAndNavigate('order')}
                    className="w-full sm:w-auto flex items-center justify-center gap-1 px-3 sm:px-6 py-2 sm:py-3.5 rounded-xl font-bold bg-ember hover:bg-deep text-white shadow-lg transition active:scale-95 text-xs sm:text-sm cursor-pointer shrink-0"
                  >
                    เริ่มสั่งอาหาร <ChevronRight size={14} />
                  </button>
                  {tableId ? (
                    <button
                      onClick={() => {
                        setCallStaffDefaultReason('💵 เรียกเก็บเงิน / เช็คบิล')
                        setIsCallStaffOpen(true)
                      }}
                      className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 sm:px-6 py-2 sm:py-3.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer shrink-0"
                    >
                      <Bell size={14} /> เรียกพนักงาน / เช็คบิล
                    </button>
                  ) : (
                    <button
                      onClick={() => setView('promotions')}
                      className="w-full sm:w-auto flex items-center justify-center px-3 sm:px-6 py-2 sm:py-3.5 rounded-xl font-bold border border-white/10 hover:border-white/30 text-white bg-white/5 text-xs sm:text-sm transition cursor-pointer shrink-0"
                    >
                      ดูโปรโมชั่นพิเศษ
                    </button>
                  )}
                </div>
              </div>

              <HeroProductShowcase
                items={menuQuery.data?.items}
                onAddToCart={addToCart}
                onSelectItem={setDetailItem}
              />
            </section>

            {/* Quick Links Section */}
            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2 text-ink">
                <Compass className="text-ember" size={18} />
                บริการของ {shop?.name || 'ร้านเรา'}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {[
                  ['🍖', 'สั่งอาหารฟินๆ', 'เลือกเมนูลงเตา', () => requireAuthAndNavigate('order')],
                  ['🛒', 'ตะกร้าของฉัน', 'ตรวจสอบรายการอาหาร', () => { if (cart.length === 0) setView('order'); else requireAuthAndNavigate('cart'); }],
                  ['📍', 'ประวัติออเดอร์', 'ดูสถานะการทำ', () => setView('track')],
                  ...(tableId ? [
                    ['🔔', 'เรียกพนักงาน', 'บริการ / เรียกเช็คบิล', () => { setCallStaffDefaultReason('🙋‍♂️ เรียกพนักงาน'); setIsCallStaffOpen(true); }]
                  ] : [
                    ['🎁', 'คูปองโปรโมชั่น', 'โค้ดส่วนลดพิเศษ', () => setView('promotions')]
                  ])
                ].map(([emoji, title, desc, action], i) => (
                  <div key={i} onClick={action as any} className="bg-white rounded-2xl border border-line p-3.5 sm:p-5 cursor-pointer hover:-translate-y-1 hover:shadow-md transition duration-300">
                    <span className="text-2xl sm:text-3xl">{emoji}</span>
                    <h3 className="font-bold text-xs sm:text-sm text-ink mt-2 sm:mt-3">{title as string}</h3>
                    <p className="text-[10px] text-smoke font-medium mt-0.5 sm:mt-1">{desc as string}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Popular Menu Section */}
            <section className="space-y-4 sm:space-y-5">
              <h2 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2 text-ink">
                <Utensils className="text-ember" size={18} />
                เมนูแนะนำประจำวันนี้
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {menuQuery.data?.items.slice(0, 4).map((item) => {
                  const qty = cart.find(x => x.item.id === item.id)?.quantity || 0
                  return (
                    <div
                      key={item.id}
                      className="group flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-zinc-200/80 bg-white overflow-hidden shadow-xs transition hover:shadow-md duration-300"
                    >
                      {/* Food Image */}
                      <div
                        onClick={() => setDetailItem(item)}
                        className="relative aspect-square w-full overflow-hidden bg-zinc-100 cursor-pointer"
                      >
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="size-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="grid size-full place-items-center bg-orange-50 text-3xl">
                            🍲
                          </div>
                        )}
                      </div>

                      {/* Divider Line between Image and Text */}
                      <div className="border-t border-zinc-100" />

                      {/* Food Info & Price with Plus Button on Right */}
                      <div className="p-2.5 sm:p-3 flex flex-col justify-between flex-1 gap-2">
                        <div onClick={() => setDetailItem(item)} className="cursor-pointer">
                          <h3 className="text-xs sm:text-sm font-extrabold text-zinc-900 truncate group-hover:text-orange-600 transition">
                            {item.name}
                          </h3>
                        </div>

                        <div className="flex items-center justify-between gap-1 pt-0.5">
                          <span className="text-xs sm:text-sm font-black text-zinc-950">
                            ฿{item.price.toLocaleString()}
                          </span>

                          {qty > 0 ? (
                            <div className="flex items-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-white shadow-xs">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  changeQty(item.id, -1)
                                }}
                                className="grid size-5 place-items-center text-xs font-black hover:opacity-80 cursor-pointer"
                              >
                                -
                              </button>
                              <span className="px-1 text-xs font-black">{qty}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  changeQty(item.id, 1)
                                }}
                                className="grid size-5 place-items-center text-xs font-black hover:opacity-80 cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                addToCart(item)
                              }}
                              className="grid size-7 sm:size-8 place-items-center rounded-full bg-emerald-600 text-white shadow-xs transition duration-150 hover:bg-emerald-700 active:scale-90 cursor-pointer"
                              title="เพิ่มลงตะกร้า"
                            >
                              <Plus size={15} strokeWidth={2.8} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>
        )}

        {/* ── VIEW: Order / Menu (Grab / LINEMAN Clean Modern Style) ── */}
        {view === 'order' && (
          <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-4 space-y-6 pb-36">
            {/* Search & Category Filter Pills */}
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="ค้นหาชื่อเมนูอาหาร เครื่องดื่ม..."
                  className="h-11 w-full pl-10 pr-4 rounded-2xl border border-zinc-200 bg-white text-xs font-semibold outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 shadow-xs"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Category Pills (Grab Style) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setActiveCat('all')}
                  className={`px-4 py-2 rounded-full text-xs font-extrabold shrink-0 transition shadow-xs ${
                    activeCat === 'all'
                      ? 'bg-zinc-950 text-white'
                      : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  สำหรับคุณ
                </button>
                {categories.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCat(c.id)}
                    className={`px-4 py-2 rounded-full text-xs font-extrabold shrink-0 transition shadow-xs ${
                      activeCat === c.id
                        ? 'bg-zinc-950 text-white'
                        : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* ── SECTION 1: Featured / "สำหรับคุณ" (Top Picks Carousel / 2-Col Grid) ── */}
            {activeCat === 'all' && !search && items.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-black text-zinc-950 flex items-center gap-1.5">
                    <span>🔥 สำหรับคุณ</span>
                  </h2>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    แนะนำ
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {items.slice(0, 2).map((item) => {
                    const qty = cart.find(x => x.item.id === item.id)?.quantity || 0
                    return (
                      <div
                        key={`featured-${item.id}`}
                        className="group flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-zinc-200/80 bg-white overflow-hidden shadow-xs transition hover:shadow-md duration-300"
                      >
                        <div
                          onClick={() => setDetailItem(item)}
                          className="relative aspect-square w-full overflow-hidden bg-zinc-100 cursor-pointer"
                        >
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="size-full object-cover transition duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="grid size-full place-items-center bg-orange-50 text-3xl">
                              🍲
                            </div>
                          )}
                        </div>

                        {/* Divider Line between Image and Text */}
                        <div className="border-t border-zinc-100" />

                        <div className="p-2.5 sm:p-3 flex flex-col justify-between flex-1 gap-2">
                          <div onClick={() => setDetailItem(item)} className="cursor-pointer">
                            <h3 className="text-xs sm:text-sm font-extrabold text-zinc-900 truncate group-hover:text-orange-600 transition">
                              {item.name}
                            </h3>
                          </div>

                          <div className="flex items-center justify-between gap-1 pt-0.5">
                            <span className="text-xs sm:text-sm font-black text-zinc-950">
                              ฿{Number(item.price || 0).toLocaleString()}
                            </span>

                            {qty > 0 ? (
                              <div className="flex items-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-white shadow-xs">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    changeQty(item.id, -1)
                                  }}
                                  className="grid size-5 place-items-center text-xs font-black hover:opacity-80 cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="px-1 text-xs font-black">{qty}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    changeQty(item.id, 1)
                                  }}
                                  className="grid size-5 place-items-center text-xs font-black hover:opacity-80 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  addToCart(item)
                                }}
                                className="grid size-7 sm:size-8 place-items-center rounded-full bg-emerald-600 text-white shadow-xs transition duration-150 hover:bg-emerald-700 active:scale-90 cursor-pointer"
                                title="เพิ่มลงตะกร้า"
                              >
                                <Plus size={15} strokeWidth={2.8} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* ── SECTION 2: Categorized Food Items (Horizontal Table / List Rows) ── */}
            <div className="space-y-6">
              {(activeCat === 'all'
                ? categories.length > 0
                  ? categories
                  : [{ id: 'all', name: 'เมนูทั้งหมด' }]
                : categories.filter(c => c.id === activeCat)
              ).map((category) => {
                const categoryItems = activeCat === 'all' && categories.length > 0
                  ? items.filter(x => x.category_id === category.id)
                  : items

                if (categoryItems.length === 0) return null

                return (
                  <section key={category.id} className="space-y-3">
                    <h2 className="text-lg font-black text-zinc-950 border-b border-zinc-100 pb-2">
                      {category.name}
                    </h2>

                    <div className="space-y-3">
                      {categoryItems.map((item) => {
                        const qty = cart.find(x => x.item.id === item.id)?.quantity || 0

                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3.5 rounded-3xl border border-zinc-100 bg-white p-3.5 sm:p-4 shadow-sm transition hover:shadow-md group"
                          >
                            {/* Food Image */}
                            <div
                              onClick={() => setDetailItem(item)}
                              className="relative size-20 sm:size-24 shrink-0 overflow-hidden rounded-2xl bg-zinc-100 border border-zinc-100 shadow-sm cursor-pointer"
                            >
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  className="size-full object-cover transition duration-300 group-hover:scale-105"
                                />
                              ) : (
                                <div className="grid size-full place-items-center bg-orange-50 text-2xl">
                                  🍲
                                </div>
                              )}
                            </div>

                            {/* Food Details */}
                            <div
                              onClick={() => setDetailItem(item)}
                              className="flex-1 min-w-0 space-y-1 cursor-pointer"
                            >
                              <h3 className="text-sm sm:text-base font-extrabold text-zinc-900 truncate group-hover:text-orange-600 transition">
                                {item.name}
                              </h3>
                              {item.description && (
                                <p className="text-xs text-zinc-500 font-medium line-clamp-2">
                                  {item.description}
                                </p>
                              )}
                              <p className="text-sm sm:text-base font-black text-zinc-950 pt-0.5">
                                ฿{Number(item.price || 0).toLocaleString()}
                              </p>
                            </div>

                            {/* Right Action Button (Green Plus / Stepper) */}
                            <div className="shrink-0">
                              {qty > 0 ? (
                                <div className="flex items-center rounded-full bg-emerald-600 px-2 py-1 text-white shadow-md">
                                  <button
                                    onClick={() => changeQty(item.id, -1)}
                                    className="grid size-6 place-items-center text-xs font-black hover:opacity-80 active:scale-90 cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="px-2 text-xs font-black">{qty}</span>
                                  <button
                                    onClick={() => changeQty(item.id, 1)}
                                    className="grid size-6 place-items-center text-xs font-black hover:opacity-80 active:scale-90 cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => addToCart(item)}
                                  className="grid size-10 place-items-center rounded-full bg-emerald-600 text-white shadow-md transition duration-150 hover:bg-emerald-700 active:scale-90 cursor-pointer"
                                  title="เพิ่มรายการ"
                                >
                                  <Plus size={20} strokeWidth={3} />
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>

            {items.length === 0 && (
              <div className="py-16 text-center">
                <div className="mx-auto grid size-16 place-items-center rounded-full bg-zinc-100 text-2xl">
                  🍽️
                </div>
                <p className="mt-3 text-sm font-bold text-zinc-600">ไม่พบรายการอาหารในหมวดนี้</p>
              </div>
            )}
          </div>
        )}

        {/* ── VIEW: Cart ── */}
        {view === 'cart' && (
          <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8 bg-paper">
            <h1 className="text-2xl sm:text-3xl font-black text-ink">ตะกร้าของคุณ</h1>
            <p className="text-xs font-semibold text-smoke mt-1">ตรวจสอบรายการอาหารก่อนสั่งซื้อ</p>

            {cart.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6 lg:gap-8 mt-6 sm:mt-8 items-start">
                <section className="space-y-4">
                  <div className="bg-white border border-line rounded-3xl p-4 sm:p-5 shadow-sm divide-y divide-zinc-100 space-y-3">
                    {cart.map((c) => (
                      <div key={c.item.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                        {/* Food Image + Info */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="size-14 sm:size-16 rounded-2xl bg-soft flex items-center justify-center overflow-hidden border border-zinc-200 shrink-0 shadow-xs">
                            <div className="size-full">
                              <ProductImageCarousel item={c.item} />
                            </div>
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <h3 className="font-extrabold text-sm sm:text-base text-zinc-900 truncate">{c.item.name}</h3>
                            <p className="text-xs font-semibold text-zinc-400">฿{c.item.price.toLocaleString()} / ชิ้น</p>
                            <p className="text-sm font-black text-orange-500 sm:hidden">
                              ฿{(c.item.price * c.quantity).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Stepper + Total Price (Desktop) + Trash Action */}
                        <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
                          <span className="hidden sm:inline-block font-black text-base text-zinc-950 min-w-16 text-right">
                            ฿{(c.item.price * c.quantity).toLocaleString()}
                          </span>

                          <div className="flex items-center bg-zinc-100 rounded-full h-8 px-1 border border-zinc-200">
                            <button
                              onClick={() => changeQty(c.item.id, -1)}
                              className="size-6 grid place-items-center rounded-full text-zinc-700 hover:bg-white active:scale-90 font-black text-xs transition"
                            >
                              −
                            </button>
                            <span className="w-7 text-center font-extrabold text-xs text-zinc-900">{c.quantity}</span>
                            <button
                              onClick={() => changeQty(c.item.id, 1)}
                              className="size-6 grid place-items-center rounded-full text-zinc-700 hover:bg-white active:scale-90 font-black text-xs transition"
                            >
                              +
                            </button>
                          </div>

                          <button
                            onClick={() => changeQty(c.item.id, -c.quantity)}
                            className="size-8 grid place-items-center rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-50 transition active:scale-90 cursor-pointer"
                            title="ลบรายการ"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <aside className="space-y-6">
                  <div className="bg-white border border-line rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
                    <h2 className="text-sm sm:text-base font-black text-ink border-b border-line pb-3">สรุปออเดอร์</h2>
                    <div className="space-y-2 text-xs font-semibold text-smoke">
                      <div className="flex justify-between">
                        <span>ราคาค่าอาหาร</span>
                        <span className="text-ink">฿{getCartTotal().toLocaleString()}</span>
                      </div>
                      {!tableId && (
                        <div className="flex justify-between">
                          <span>ราคาค่าจัดส่ง</span>
                          <span className="text-emerald-600 font-bold">ฟรี (โปรโมชั่น)</span>
                        </div>
                      )}
                    </div>
                    <div className="border-t border-line/60 pt-3 flex justify-between items-center">
                      <span className="font-black text-ink text-xs sm:text-sm">ยอดรวมจ่ายทั้งหมด</span>
                      <span className="font-black text-base sm:text-lg text-deep">฿{getCartTotal().toLocaleString()}</span>
                    </div>

                    <button
                      onClick={() => {
                        if (tableId) {
                          checkout.mutate()
                        } else {
                          requireAuthAndNavigate('checkout')
                        }
                      }}
                      disabled={checkout.isPending}
                      className="w-full h-11 sm:h-12 rounded-xl bg-ember hover:bg-deep text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {tableId
                        ? (checkout.isPending ? 'กำลังส่งคำสั่งซื้อ...' : `ยืนยันสั่งเลย (โต๊ะ ${tableName})`)
                        : <>ไปหน้ากรอกที่อยู่และชำระเงิน <ChevronRight size={15} /></>
                      }
                    </button>
                  </div>
                </aside>
              </div>
            ) : (
              <div className="mt-6 max-w-md mx-auto bg-white border border-line rounded-3xl p-8 sm:p-12 text-center shadow-md space-y-4">
                <span className="text-5xl block select-none">🛒</span>
                <h2 className="font-black text-base sm:text-lg text-ink">ยังไม่มีอาหารในตะกร้าของคุณ</h2>
                <p className="text-xs text-smoke font-medium">กดเลือกเมนูอาหารจานโปรดลงตะกร้าก่อนทำการสั่งซื้อ</p>
                <button
                  onClick={() => setView('order')}
                  className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer"
                >
                  ไปเลือกดูเมนูอาหาร
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── VIEW: Checkout & Map Pin Location ── */}
        {view === 'checkout' && (
          <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8 bg-paper">
            <h1 className="text-2xl sm:text-3xl font-black text-ink">{tableId ? `ยืนยันสั่งอาหาร โต๊ะ ${tableName}` : 'ชำระเงินและปักหมุดจัดส่ง'}</h1>
            <p className="text-xs font-semibold text-smoke mt-1">{tableId ? 'ตรวจสอบรายการอาหารเพื่อสั่งตรงไปยังห้องครัว' : 'ระบุพิกัดสถานที่จัดส่งเดลิเวอรีและเลือกช่องทางชำระเงิน'}</p>

            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 lg:gap-8 mt-6 sm:mt-8 items-start">
              <section className="space-y-4 sm:space-y-6">
                
                {tableId ? (
                  <div className="bg-white border border-line rounded-2xl p-4 sm:p-6 shadow-sm space-y-3">
                    <h2 className="text-sm sm:text-base font-black text-ink flex items-center gap-2">
                      <MapPin size={17} className="text-ember" /> การรับประทานอาหาร
                    </h2>
                    <div className="p-3.5 sm:p-4 rounded-xl bg-ember/10 border border-ember/20 text-sm font-bold text-ink flex items-center gap-3">
                      <span className="text-2xl sm:text-3xl">🪑</span>
                      <div>
                        <p className="text-ember font-black">ทานที่ร้าน (โต๊ะ {tableName})</p>
                        <p className="text-xs text-smoke font-medium">อาหารจะถูกส่งไปยังห้องครัวและนำมาเสิร์ฟที่โต๊ะของคุณทันที</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Delivery Address & GPS Map Section */
                  <div className="bg-white border border-line rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
                    <h2 className="text-sm sm:text-base font-black text-ink flex items-center gap-1.5">
                      <MapPin size={17} className="text-ember" /> ข้อมูลผู้รับและที่อยู่จัดส่ง
                    </h2>

                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="ชื่อผู้รับ"
                          value={address.name}
                          onChange={e => setAddress({ ...address, name: e.target.value })}
                          className="w-full border border-line outline-none rounded-xl p-3 bg-soft text-ink text-xs focus:border-ember"
                        />
                        <input
                          type="tel"
                          placeholder="เบอร์โทรติดต่อ"
                          value={address.phone}
                          onChange={e => setAddress({ ...address, phone: e.target.value })}
                          className="w-full border border-line outline-none rounded-xl p-3 bg-soft text-ink text-xs focus:border-ember"
                        />
                      </div>

                      <textarea
                        placeholder="ระบุบ้านเลขที่ ซอย ถนน แขวง/ตำบล (อย่างละเอียด)"
                        rows={2}
                        value={address.address}
                        onChange={e => setAddress({ ...address, address: e.target.value })}
                        className="w-full border border-line outline-none rounded-xl p-3 bg-soft text-ink text-xs focus:border-ember"
                      />

                      <input
                        type="text"
                        placeholder="จุดสังเกต หรือหมายเหตุถึงไรเดอร์ (เช่น บ้านสีขาว หน้าปากซอยมีเซเว่น)"
                        value={address.note}
                        onChange={e => setAddress({ ...address, note: e.target.value })}
                        className="w-full border border-line outline-none rounded-xl p-3 bg-soft text-ink text-xs focus:border-ember"
                      />

                      {/* Interactive Map Picker */}
                      <div className="pt-1">
                        <LeafletMapPicker
                          lat={address.lat}
                          lng={address.lng}
                          onChangeLocation={(lat, lng) => setAddress(prev => ({ ...prev, lat, lng }))}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Channel Selection */}
                {tableId ? (
                  <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 sm:p-5 text-xs text-amber-950 space-y-1.5 shadow-xs">
                    <p className="font-black flex items-center gap-1.5 text-sm text-amber-900">
                      🔔 การชำระเงิน: ชำระที่เคาน์เตอร์ / หน้า POS
                    </p>
                    <p className="text-amber-800 leading-relaxed font-medium">
                      รายการอาหารนี้จะถูกส่งเข้าห้องครัวทันที และท่านสามารถชำระเงินกับพนักงานหรือที่เคาน์เตอร์ POS เมื่อรับประทานเสร็จสิ้น
                    </p>
                  </div>
                ) : (
                  <div className="bg-white border border-line rounded-2xl p-4 sm:p-6 shadow-sm space-y-3 sm:space-y-4">
                    <h2 className="text-sm sm:text-base font-black text-ink">เลือกช่องทางชำระเงิน</h2>
                    <div className="space-y-3">
                      <label className="flex items-start gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl border border-line hover:bg-soft cursor-pointer transition">
                        <input type="radio" name="payment" value="cash" defaultChecked className="mt-1 accent-ember size-4 cursor-pointer" />
                        <div>
                          <b className="text-xs sm:text-sm text-ink flex items-center gap-1">💵 ชำระเงินสด / เก็บเงินปลายทาง (COD)</b>
                          <p className="text-[10px] sm:text-[11px] text-smoke font-medium">ชำระเงินสดกับไรเดอร์เมื่อได้รับอาหารเรียบร้อยแล้ว</p>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl border border-line hover:bg-soft cursor-pointer transition">
                        <input type="radio" name="payment" value="promptpay" className="mt-1 accent-ember size-4 cursor-pointer" />
                        <div>
                          <b className="text-xs sm:text-sm text-ink flex items-center gap-1">📱 PromptPay สแกนจ่าย</b>
                          <p className="text-[10px] sm:text-[11px] text-smoke font-medium">สแกนคิวอาร์โค้ดชำระเงินได้ทันทีเพื่อความสะดวก</p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </section>

              <aside className="space-y-6">
                <div className="bg-white border border-line rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 lg:sticky lg:top-20">
                  <h2 className="text-sm sm:text-base font-black text-ink border-b border-line pb-3">สรุปยอดคำสั่งซื้อ</h2>
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 divide-y divide-line/30">
                    {cart.map(c => (
                      <div key={c.item.id} className="flex justify-between items-center text-xs pt-2 first:pt-0 font-medium text-ink">
                        <span className="truncate max-w-[170px]">{c.item.name} <small className="text-smoke">x{c.quantity}</small></span>
                        <b>฿{(c.item.price * c.quantity).toLocaleString()}</b>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-line/60 pt-3 flex justify-between items-center">
                    <span className="font-black text-ink text-xs sm:text-sm">ยอดชำระสุทธิ</span>
                    <span className="font-black text-base sm:text-lg text-deep">฿{getCartTotal().toLocaleString()}</span>
                  </div>

                  <button
                    onClick={() => checkout.mutate()}
                    disabled={checkout.isPending}
                    className="w-full h-11 sm:h-12 rounded-xl bg-ember hover:bg-deep text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {checkout.isPending ? 'กำลังส่งคำสั่งซื้อ...' : tableId ? `ยืนยันสั่งอาหาร โต๊ะ ${tableName}` : 'ยืนยันสั่งซื้อเดลิเวอรี'}
                  </button>
                </div>
              </aside>
            </div>
          </div>
        )}

        {/* ── VIEW: Order History / Track Status ── */}
        {view === 'track' && (
          <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-5 sm:space-y-6 bg-paper">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-ink">
                {tableId ? `ประวัติการสั่งอาหาร โต๊ะ ${tableName}` : 'ประวัติคำสั่งซื้อ'}
              </h1>
              <p className="text-xs font-semibold text-smoke mt-1">
                {tableId ? 'รายการออเดอร์ทั้งหมดของโต๊ะนี้ (อัปเดตเรียลไทม์จากห้องครัว)' : 'ติดตามสถานะคำสั่งซื้อแบบเรียลไทม์'}
              </p>
            </div>

            {/* DINE-IN ORDERS HISTORY FOR THIS TABLE */}
            {tableId ? (() => {
              const validFoodOrders = (tableOrdersQuery.data || []).filter((ord: any) => {
                const isServiceOrBill =
                  ord.order_number?.startsWith('BILL') ||
                  ord.order_number?.startsWith('SRV') ||
                  ord.order_type === 'service_request' ||
                  ord.notes?.startsWith('[เรียกพนักงาน]') ||
                  ord.customer_name?.includes('เรียกเก็บเงิน') ||
                  ord.customer_name?.includes('เรียกพนักงาน') ||
                  (!ord.items || ord.items.length === 0)
                return !isServiceOrBill
              })

              const activeFoodOrders = validFoodOrders.filter((o: any) => o.status !== 'cancelled')
              const totalTableAmount = activeFoodOrders.reduce((acc: number, o: any) => acc + Number(o.total || 0), 0)

              return validFoodOrders.length > 0 ? (
                <div className="space-y-4 sm:space-y-6">
                  {validFoodOrders.map((ord: any) => {
                    return (
                      <div key={ord.id} className="bg-white border border-line rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-md space-y-4">
                        {/* Inline Single-Row Order Header */}
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <h2 className="text-sm sm:text-base font-black text-zinc-950 shrink-0">
                              #{ord.order_number || ord.id.slice(0, 7)}
                            </h2>
                            <span className="text-zinc-300 font-bold">·</span>
                            <span className="text-xs font-semibold text-zinc-500 truncate">
                              สั่งเมื่อ {new Date(ord.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                            </span>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                            ord.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : ord.status === 'cancelled'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-orange-50 text-orange-600 border border-orange-200'
                          }`}>
                            {ord.status === 'pending' ? '🔥 รอรับออเดอร์' : ord.status === 'accepted' ? '📋 รับออเดอร์แล้ว' : ord.status === 'preparing' ? '🍳 กำลังปรุงอาหาร' : ord.status === 'ready' ? '🍽️ พร้อมเสิร์ฟ' : ord.status === 'completed' ? '✨ เสิร์ฟเรียบร้อย' : ord.status === 'cancelled' ? '❌ ยกเลิกแล้ว' : ord.status}
                          </span>
                        </div>

                        {/* 4 Circular Connected Process Steps */}
                        <OrderProcessStepper status={ord.status} orderType={ord.order_type} />

                        {/* Order Items List (Enlarged and Clear) */}
                        <div className="space-y-2.5 pt-3 border-t border-zinc-100">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-zinc-600">รายการอาหารรอบนี้:</span>
                            <span className="text-[11px] font-bold text-zinc-400">
                              {(ord.items || []).reduce((acc: number, it: any) => acc + (it.quantity || 1), 0)} รายการ
                            </span>
                          </div>
                          <div className="space-y-2 divide-y divide-zinc-100">
                            {ord.items && ord.items.map((it: any) => (
                              <div key={it.id} className="flex items-center justify-between pt-2 text-sm sm:text-base font-bold text-zinc-900">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-zinc-800 truncate">{it.name}</span>
                                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-xs font-black shrink-0">
                                    x{it.quantity}
                                  </span>
                                </div>
                                <span className="font-black text-zinc-950 shrink-0">
                                  ฿{(it.unit_price * it.quantity).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="border-t border-zinc-200 pt-3 flex justify-between items-center">
                            <span className="text-sm sm:text-base font-extrabold text-zinc-800">ยอดรวมรอบนี้</span>
                            <span className="text-lg sm:text-xl font-black text-orange-500">฿{Number(ord.total || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-white border border-line rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center shadow-sm space-y-4">
                  <span className="text-4xl sm:text-5xl block select-none">🪑</span>
                  <h2 className="font-black text-base sm:text-lg text-ink">ยังไม่มีรายการสั่งอาหารสำหรับโต๊ะ {tableName}</h2>
                  <p className="text-xs text-smoke font-medium">กดเลือกหมูกระทะและเมนูเด็ดลงเตาได้เลย!</p>
                  <button onClick={() => setView('order')} className="px-6 py-2.5 rounded-xl bg-ember hover:bg-deep text-white font-bold text-xs transition cursor-pointer">
                    ไปที่หน้าสั่งอาหาร
                  </button>
                </div>
              )
            })() : (
              /* DELIVERY ORDER TRACKING */
              lastOrder ? (
                <div className="bg-white border border-line rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-md space-y-5 sm:space-y-6">
                  {/* Inline Single-Row Order Header */}
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <h2 className="text-sm sm:text-base font-black text-zinc-950 shrink-0">{lastOrder.id}</h2>
                      <span className="text-zinc-300 font-bold">·</span>
                      <span className="text-xs font-semibold text-zinc-500 truncate">
                        เดลิเวอรี · สั่งเมื่อ {lastOrder.time}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200 shrink-0">
                      🔥 {lastOrder.status}
                    </span>
                  </div>

                  {/* 4 Circular Connected Process Steps (Delivery) */}
                  <OrderProcessStepper status={lastOrder.status} orderType="delivery" />

                  <div className="p-3.5 sm:p-4 rounded-xl bg-ember/5 border border-ember/20 text-xs text-ink font-semibold flex items-center gap-2">
                    <Info size={16} className="text-ember shrink-0" />
                    <span>อาหารของคุณกำลังปรุงสดใหม่ คาดว่าจะส่งออกจากครัวใน ~10 นาที</span>
                  </div>

                  {/* Delivery Location Details */}
                  {lastOrder.address && (
                    <div className="p-3.5 sm:p-4 rounded-xl bg-soft border border-line space-y-2 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="font-bold text-ink flex items-center gap-1">
                          <MapPin size={14} className="text-ember" /> สถานที่จัดส่ง:
                        </span>
                        <a
                          href={`https://maps.google.com/?q=${lastOrder.address.lat},${lastOrder.address.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-ember font-bold hover:underline flex items-center gap-1 text-[11px]"
                        >
                          <Navigation size={12} /> เปิดดูใน Google Maps
                        </a>
                      </div>
                      <p className="text-smoke break-words">{lastOrder.address.name} ({lastOrder.address.phone}) - {lastOrder.address.address}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white border border-line rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center shadow-sm space-y-4">
                  <span className="text-4xl sm:text-5xl block select-none">📦</span>
                  <h2 className="font-black text-base sm:text-lg text-ink">ยังไม่มีประวัติคำสั่งซื้อล่าสุด</h2>
                  <p className="text-xs text-smoke font-medium">เริ่มกดสั่งหมูกระทะส่งตรงถึงบ้านคุณได้ทันที!</p>
                  <button onClick={() => requireAuthAndNavigate('order')} className="px-6 py-2.5 rounded-xl bg-ember hover:bg-deep text-white font-bold text-xs transition cursor-pointer">
                    เริ่มสั่งอาหาร
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {/* ── VIEW: Promotions ── */}
        {view === 'promotions' && (
          <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-5 sm:space-y-6 bg-paper">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-ink">โปรโมชั่นและคูปองส่วนลด</h1>
              <p className="text-xs font-semibold text-smoke mt-1">คูปองสิทธิพิเศษสำหรับลูกค้าเดลิเวอรี</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              {[
                { code: 'TAOTHAN100', desc: 'ลดทันที 100 บาท เมื่อสั่งครบ 500 บาท', expire: '31 ธ.ค. 2569' },
                { code: 'FREESHIP', desc: 'ส่งฟรี 5 กม. แรก ทุกออเดอร์', expire: '31 ธ.ค. 2569' },
                { code: 'WELCOME50', desc: 'ส่วนลด 50 บาท สำหรับลูกค้าใหม่', expire: '31 ธ.ค. 2569' }
              ].map((promo) => (
                <div key={promo.code} className="bg-white border border-line rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col xs:flex-row xs:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="inline-block font-mono font-black text-ember text-sm sm:text-base px-2.5 py-0.5 rounded-md bg-ember/10 border border-ember/30">
                      {promo.code}
                    </span>
                    <p className="text-xs font-bold text-ink mt-1">{promo.desc}</p>
                    <p className="text-[10px] text-smoke font-medium">หมดเขต: {promo.expire}</p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(promo.code)
                      showToast(`คัดลอกโค้ด ${promo.code} แล้ว`)
                    }}
                    className="px-3 py-1.5 rounded-lg border border-line hover:bg-soft text-xs font-bold text-smoke transition flex items-center justify-center gap-1 shrink-0 self-start xs:self-center cursor-pointer"
                  >
                    <Copy size={12} /> คัดลอก
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── VIEW: Contact ── */}
        {view === 'contact' && (
          <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-5 sm:space-y-6 bg-paper">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-ink">ติดต่อเรา</h1>
              <p className="text-xs font-semibold text-smoke mt-1">สอบถามข้อมูลเพิ่มเติม หรือแจ้งปัญหาการจัดส่ง</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-white border border-line rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
                <h2 className="text-sm sm:text-base font-black text-ink">ข้อมูลการติดต่อร้าน</h2>
                <div className="space-y-3 text-xs font-semibold text-smoke">
                  <p className="flex items-center gap-2 text-ink">
                    <Store size={16} className="text-ember shrink-0" /> ร้าน: <strong>{shop?.name || 'เตาถ่าน หมูกระทะ'}</strong>
                  </p>
                  <p className="flex items-center gap-2 text-ink">
                    <Phone size={16} className="text-ember shrink-0" /> โทรศัพท์: <strong>081-234-5678</strong>
                  </p>
                  <p className="flex items-center gap-2 text-ink">
                    <Clock size={16} className="text-ember shrink-0" /> เวลาทำการ: <strong>11:00 – 23:00 น.</strong>
                  </p>
                  <p className="flex items-start gap-2 text-ink">
                    <MapPin size={16} className="text-ember shrink-0 mt-0.5" /> ที่ตั้งร้าน: <strong>สาขาหลัก ตรงข้ามตลาดสดเทศบาล</strong>
                  </p>
                </div>
              </div>

              <div className="bg-white border border-line rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
                <h2 className="text-sm sm:text-base font-black text-ink">ส่งข้อความถึงร้าน</h2>
                <form
                  onSubmit={e => {
                    e.preventDefault()
                    showToast('ส่งข้อความถึงผู้จัดการร้านสำเร็จแล้ว!')
                    ;(e.target as any).reset()
                  }}
                  className="space-y-3"
                >
                  <input
                    type="text"
                    required
                    placeholder="ชื่อของคุณ"
                    className="w-full border border-line outline-none rounded-xl p-3 bg-soft text-ink text-xs focus:border-ember"
                  />
                  <textarea
                    rows={3}
                    required
                    placeholder="ข้อความสอบถามหรือข้อเสนอแนะ..."
                    className="w-full border border-line outline-none rounded-xl p-3 bg-soft text-ink text-xs focus:border-ember"
                  />
                  <button type="submit" className="w-full py-3 rounded-xl bg-coal hover:bg-ink text-white font-bold text-xs shadow-md transition cursor-pointer">
                    ส่งข้อความ
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ── GLOBAL FLOATING CIRCULAR CART ICON BUTTON (Visible on Home & Menu) ── */}
      {['home', 'order', 'promotions', 'contact'].includes(view) && cart.length > 0 && (
        <div className="fixed bottom-20 sm:bottom-22 md:bottom-8 right-4 sm:right-6 z-40 animate-scale-up">
          <button
            onClick={() => requireAuthAndNavigate('cart')}
            className="relative grid size-13 sm:size-15 place-items-center rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-2xl shadow-orange-500/50 transition hover:scale-105 active:scale-95 cursor-pointer"
            title="ดูตะกร้าสินค้า"
          >
            <ShoppingCart size={22} strokeWidth={2.5} />
            
            {/* Badge with count (No white border) */}
            <span className="absolute -top-1 -right-1 grid size-5 sm:size-6 place-items-center rounded-full bg-red-600 text-white text-[10px] sm:text-[11px] font-black shadow-md">
              {getCartCount()}
            </span>

            {/* Price pill indicator (No white border) */}
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-zinc-900 text-white px-2.5 py-0.5 text-[10px] sm:text-xs font-black whitespace-nowrap shadow-lg">
              ฿{getCartTotal().toLocaleString()}
            </span>
          </button>
        </div>
      )}

      {/* ── MODALS: Call Staff & Order Summary ── */}
      <CallStaffModal
        isOpen={isCallStaffOpen}
        onClose={() => setIsCallStaffOpen(false)}
        tableName={tableName}
        storeId={storeId}
        tableId={tableId}
        tableOrders={(tableOrdersQuery.data || []).filter((o: any) => o.status !== 'cancelled' && !o.order_number?.startsWith('BILL') && !o.order_number?.startsWith('SRV') && o.items && o.items.length > 0)}
        shop={shop}
        settings={settings}
        defaultReason={callStaffDefaultReason}
        onSuccess={(reason) => {
          setActiveServiceRequest({
            type: reason,
            time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'
          })
          showToast(`ส่งคำขอเรียบร้อย: ${reason}`)
        }}
      />

      <OrderSummaryModal
        isOpen={isBillOpen}
        onClose={() => setIsBillOpen(false)}
        tableName={tableName}
        tableOrders={(tableOrdersQuery.data || []).filter((o: any) => o.status !== 'cancelled' && !o.order_number?.startsWith('BILL') && !o.order_number?.startsWith('SRV') && o.items && o.items.length > 0)}
        onCallStaff={(reason) => {
          if (reason) setCallStaffDefaultReason(reason)
          setIsCallStaffOpen(true)
        }}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        item={detailItem}
        categories={categories}
        isOpen={Boolean(detailItem)}
        onClose={() => setDetailItem(null)}
        cartQty={detailItem ? (cart.find(x => x.item.id === detailItem.id)?.quantity || 0) : 0}
        onAddToCart={addToCart}
        onChangeQty={changeQty}
      />

    </div>
  )
}
