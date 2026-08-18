import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import {
  Flame, ShoppingCart, Utensils, User, LogOut, Tag, MessageSquare,
  Clock, Compass, ArrowLeft, Check, MapPin, Search, Store, Navigation,
  Trash2, ChevronRight, Phone, Info, AlertCircle, Copy, Plus, Minus
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

function StorefrontApp() {
  const [storeId, setStoreId] = useState<string | null>(null)
  const [tableId, setTableId] = useState<string | null>(null)
  const [tableName, setTableName] = useState<string | null>(null)
  const [sessionOpenedAt, setSessionOpenedAt] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const [view, setView] = useState<'home' | 'order' | 'cart' | 'checkout' | 'track' | 'promotions' | 'contact' | 'login'>('home')
  const [customer, setCustomer] = useState<{ name: string; phone: string; email?: string } | null>(() => {
    const saved = localStorage.getItem('sfCustomer')
    return saved ? JSON.parse(saved) : null
  })

  const [cart, setCart] = useState<{ item: any; quantity: number; notes: string }[]>(() => {
    const saved = localStorage.getItem('sfCart')
    return saved ? JSON.parse(saved) : []
  })
  const [lastOrder, setLastOrder] = useState<any>(() => {
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

  useEffect(() => { localStorage.setItem('sfCart', JSON.stringify(cart)) }, [cart])
  useEffect(() => { localStorage.setItem('sfLastOrder', JSON.stringify(lastOrder)) }, [lastOrder])
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

  if (errorMsg) return <div className="grid min-h-screen place-items-center bg-zinc-50 p-5 text-center font-bold text-red-500">{errorMsg}</div>
  if (!storeId || storeQuery.isLoading || menuQuery.isLoading) return <div className="grid min-h-screen place-items-center bg-zinc-50 text-sm font-bold text-zinc-400">กำลังโหลดข้อมูลร้าน…</div>

  const shop = storeQuery.data?.shop
  const settings = storeQuery.data?.settings
  const categories = menuQuery.data?.categories || []
  let items = menuQuery.data?.items || []
  if (activeCat !== 'all') items = items.filter(x => x.category_id === activeCat)
  if (search) items = items.filter(x => x.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col font-sans">
      
      <div className={`fixed top-4 right-4 z-50 bg-black text-white px-4 py-2 rounded-lg shadow-xl text-xs font-bold transition ${toast.show ? 'translate-x-0' : 'translate-x-full'}`}>{toast.message}</div>

      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-zinc-200 shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
          {settings?.logo_url ? (
            <img src={settings.logo_url} className="size-9 rounded-full object-cover border border-zinc-200" />
          ) : (
            <span className="grid size-9 place-items-center rounded-full bg-orange-500 text-white shadow-md">
              <Flame size={18} fill="currentColor" />
            </span>
          )}
          <span className="font-extrabold text-lg tracking-tight text-zinc-900">{shop?.name || 'ร้านค้า'}</span>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          {['home', 'order', 'track', 'promotions', 'contact'].map((v) => (
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
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {tableId ? (
            <div className="px-3.5 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 font-bold text-xs flex items-center gap-1.5">
              <MapPin size={14} /> โต๊ะ {tableName}
            </div>
          ) : customer ? (
            <>
              <div className="hidden sm:block text-right">
                <p className="text-[10px] text-zinc-400 font-medium">เข้าใช้งานโดย</p>
                <p className="text-xs font-bold text-zinc-900">{customer.name}</p>
              </div>
              <button
                onClick={() => { setCustomer(null); showToast('ออกจากระบบแล้ว') }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-bold text-zinc-500"
              >
                <LogOut size={13} /> ออกจากระบบ
              </button>
            </>
          ) : (
            <button
              onClick={() => setView('login')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold transition"
            >
              <User size={14} /> เข้าสู่ระบบ
            </button>
          )}
        </div>
      </header>

      {['home', 'order', 'promotions', 'contact'].includes(view) && (
        <button
          onClick={() => requireAuthAndNavigate('cart')}
          className="fixed bottom-20 md:bottom-6 right-6 z-40 bg-orange-600 text-white p-4 rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95"
        >
          <ShoppingCart size={22} />
          {getCartCount() > 0 && (
            <span className="absolute -top-1 -right-1 bg-white text-orange-600 font-black text-[10px] size-5 rounded-full flex items-center justify-center shadow-md">
              {getCartCount()}
            </span>
          )}
        </button>
      )}

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-line px-2 py-2 flex items-center justify-around z-30 shadow-lg">
        {[
          ['home', Compass, 'หน้าแรก'],
          ['order', Utensils, 'สั่งอาหาร'],
          ['track', Clock, 'ติดตามสถานะ'],
          ['promotions', Tag, 'โปรโมชั่น'],
          ['contact', MessageSquare, 'ติดต่อเรา'],
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
            className={`flex flex-col items-center gap-1 p-1 text-[10px] font-bold transition ${view === v ? 'text-ember' : 'text-smoke'}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ── Main View Switcher ── */}
      <main className="flex-1 pb-20 md:pb-8">

        {/* ── VIEW: Login / Customer Auth ── */}
        {view === 'login' && (
          <div className="max-w-md mx-auto my-12 px-4">
            <div className="bg-white border border-line p-8 rounded-3xl shadow-xl space-y-6">
              <div className="text-center space-y-2">
                <span className="inline-grid size-12 place-items-center rounded-full bg-ember/10 text-ember">
                  <User size={24} />
                </span>
                <h2 className="text-2xl font-black text-ink">เข้าสู่ระบบสั่งเดลิเวอรี</h2>
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
                  className="w-full py-3.5 rounded-xl bg-ember hover:bg-deep text-white font-bold text-sm shadow-md transition active:scale-95"
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
          <div className="max-w-6xl mx-auto px-4 py-8 space-y-12 bg-paper">
            <section className="relative rounded-3xl overflow-hidden bg-coal text-paper p-8 sm:p-12 lg:p-16 flex flex-col md:flex-row items-center justify-between gap-8 border border-line/10 shadow-2xl">
              <div className="absolute inset-0 opacity-20 bg-cover bg-center" style={{ backgroundImage: settings?.banner_url ? `url(${settings.banner_url})` : 'none' }} />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,#ff5b2415,#00000000_60%)]" />
              <div className="relative z-10 space-y-6 max-w-xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ember/10 border border-ember/30 text-xs font-bold text-ember">
                  <span className="size-2 rounded-full bg-ember animate-ping" />
                  เปิดให้บริการทุกวัน 11:00 – 23:00 น.
                </span>
                <h1 className="text-3xl sm:text-5xl font-black font-sans leading-tight">
                  {shop?.name || 'หมูกระทะพรีเมียม'} <br />
                  <span className="text-ember">สดทุกคำ ร้อนทุกเตา</span>
                </h1>
                <p className="text-sm text-smoke leading-relaxed">
                  {settings?.description || 'คัดสรรวัตถุดิบคุณภาพพรีเมียมจากแหล่งที่ดีที่สุด ส่งตรงถึงบ้านด้วยไรเดอร์มืออาชีพ หรือสำรองโต๊ะนั่งอร่อยฟินหน้าร้าน'}
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={() => requireAuthAndNavigate('order')}
                    className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold bg-ember hover:bg-deep text-white shadow-lg transition active:scale-95 text-sm"
                  >
                    เริ่มสั่งอาหาร <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => setView('promotions')}
                    className="px-6 py-3.5 rounded-xl font-bold border border-white/10 hover:border-white/30 text-white bg-white/5 text-sm transition"
                  >
                    ดูโปรโมชั่นพิเศษ
                  </button>
                </div>
              </div>

              <div className="relative select-none text-7xl sm:text-8xl p-8 rounded-full bg-soft/5 border border-white/5 animate-pulse grid grid-cols-2 gap-4">
                <span>🥩</span> <span>🥬</span>
                <span>🦐</span> <span>🍄</span>
              </div>
            </section>

            {/* Quick Links Section */}
            <section className="space-y-4">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2 text-ink">
                <Compass className="text-ember" size={20} />
                บริการของ {shop?.name || 'ร้านเรา'}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  ['🍖', 'สั่งอาหารฟินๆ', 'เลือกเมนูลงเตา', () => requireAuthAndNavigate('order')],
                  ['🛒', 'ตะกร้าของฉัน', 'ตรวจสอบราคารวม', () => requireAuthAndNavigate('cart')],
                  ['📍', 'ติดตามสถานะ', 'ดูขั้นตอนการทำ', () => setView('track')],
                  ['🎁', 'คูปองโปรโมชั่น', 'โค้ดส่วนลดพิเศษ', () => setView('promotions')]
                ].map(([emoji, title, desc, action], i) => (
                  <div key={i} onClick={action as any} className="bg-white rounded-2xl border border-line p-5 cursor-pointer hover:-translate-y-1 hover:shadow-md transition duration-300">
                    <span className="text-3xl">{emoji}</span>
                    <h3 className="font-bold text-sm text-ink mt-3">{title as string}</h3>
                    <p className="text-[10px] text-smoke font-medium mt-1">{desc as string}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Popular Menu Section */}
            <section className="space-y-5">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2 text-ink">
                <Utensils className="text-ember" size={20} />
                เมนูแนะนำประจำวันนี้
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {menuQuery.data?.items.slice(0, 3).map((item) => (
                  <div key={item.id} className="bg-white border border-line rounded-2xl overflow-hidden flex flex-col justify-between group shadow-sm">
                    <div className="h-44 bg-soft flex items-center justify-center overflow-hidden">
                      {item.image_url ? (
                        <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-105 duration-300" />
                      ) : (
                        <span className="text-6xl select-none">🥩</span>
                      )}
                    </div>
                    <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-black text-base text-ink">{item.name}</h3>
                        <p className="text-xs text-smoke font-medium mt-1 line-clamp-2">{item.description || 'เมนูอร่อยที่ต้องลอง'}</p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-line/45">
                        <span className="font-black text-ember">฿{item.price.toLocaleString()}</span>
                        <button
                          onClick={() => addToCart(item)}
                          className="h-8 px-3.5 text-xs rounded-lg font-bold bg-coal text-white hover:bg-ink transition active:scale-95"
                        >
                          + เพิ่มลงตะกร้า
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ── VIEW: Order / Menu ── */}
        {view === 'order' && (
          <div className="max-w-6xl mx-auto px-4 py-8 bg-paper space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-ink">
                  {tableId ? `สั่งอาหาร โต๊ะ ${tableName}` : 'สั่งอาหารเดลิเวอรี'}
                </h1>
                <p className="text-xs font-semibold text-smoke mt-1">
                  {tableId ? 'เลือกเมนูโปรด กดยืนยันส่งตรงถึงครัวได้เลย' : 'เลือกหมูกระทะและชุดเมนูสุดโปรดของคุณ'}
                </p>
              </div>
              <div className="relative min-w-[240px]">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-smoke" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="ค้นหาเมนูอาหาร..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-line bg-white text-xs outline-none focus:border-ember"
                />
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => setActiveCat('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition ${activeCat === 'all' ? 'bg-ember text-white shadow-sm' : 'bg-white text-smoke border border-line hover:bg-soft'}`}
              >
                ทั้งหมด
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition ${activeCat === c.id ? 'bg-ember text-white shadow-sm' : 'bg-white text-smoke border border-line hover:bg-soft'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {items.map((item) => {
                const qty = cart.find(x => x.item.id === item.id)?.quantity || 0
                return (
                  <div key={item.id} className="bg-white border border-line rounded-2xl p-4 flex gap-4 items-center shadow-sm">
                    <div className="size-20 rounded-xl bg-soft flex items-center justify-center overflow-hidden shrink-0 border border-line">
                      {item.image_url ? (
                        <img src={item.image_url} className="size-full object-cover" />
                      ) : (
                        <span className="text-3xl select-none">🍖</span>
                      )}
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-ink truncate">{item.name}</h3>
                      <p className="text-[11px] text-smoke font-medium line-clamp-1">{item.description || 'สด ใหม่ ทุกล็อต'}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-bold text-sm text-ember">฿{item.price}</span>
                        {qty > 0 ? (
                          <div className="flex items-center bg-soft border border-line rounded-lg overflow-hidden h-7">
                            <button onClick={() => changeQty(item.id, -1)} className="px-2 hover:bg-line/20 h-full font-bold text-xs text-ink">-</button>
                            <span className="px-2 font-bold text-xs text-ink">{qty}</span>
                            <button onClick={() => changeQty(item.id, 1)} className="px-2 hover:bg-line/20 h-full font-bold text-xs text-ink">+</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(item)}
                            className="h-7 px-3 text-[11px] rounded-lg font-bold bg-coal text-white hover:bg-ink transition active:scale-95"
                          >
                            + เพิ่ม
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {items.length === 0 && <div className="py-16 text-center text-sm text-smoke font-medium">ไม่พบรายการอาหารในหมวดหมู่นี้</div>}
          </div>
        )}

        {/* ── VIEW: Cart ── */}
        {view === 'cart' && (
          <div className="max-w-6xl mx-auto px-4 py-8 bg-paper">
            <h1 className="text-3xl font-black text-ink">ตะกร้าของคุณ</h1>
            <p className="text-xs font-semibold text-smoke mt-1.5">ตรวจสอบรายการอาหารก่อนสั่งซื้อ</p>

            <div className="grid lg:grid-cols-[1.6fr_1fr] gap-8 mt-8 items-start">
              <section className="space-y-4">
                {cart.length > 0 ? (
                  <div className="bg-white border border-line rounded-2xl p-5 shadow-sm divide-y divide-line/45">
                    {cart.map((c) => (
                      <div key={c.item.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="size-12 rounded-lg bg-soft flex items-center justify-center overflow-hidden border border-line">
                            {c.item.image_url ? <img src={c.item.image_url} className="size-full object-cover" /> : <span className="text-2xl">🥩</span>}
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-ink">{c.item.name}</h3>
                            <p className="text-[11px] text-smoke font-medium">฿{c.item.price.toLocaleString()} / ชิ้น</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center bg-soft border border-line rounded-lg overflow-hidden h-9">
                            <button onClick={() => changeQty(c.item.id, -1)} className="px-3 hover:bg-line/20 h-full font-extrabold text-ink transition">−</button>
                            <span className="px-3 font-bold text-xs text-ink">{c.quantity}</span>
                            <button onClick={() => changeQty(c.item.id, 1)} className="px-3 hover:bg-line/20 h-full font-extrabold text-ink transition">+</button>
                          </div>
                          <span className="font-black text-sm text-ink w-16 text-right">฿{(c.item.price * c.quantity).toLocaleString()}</span>
                          <button onClick={() => changeQty(c.item.id, -c.quantity)} className="text-smoke hover:text-deep transition">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white border border-line rounded-2xl p-12 text-center shadow-sm space-y-4">
                    <span className="text-5xl block select-none">🛒</span>
                    <h2 className="font-black text-lg text-ink">ยังไม่มีอาหารในตะกร้าของคุณ</h2>
                    <p className="text-xs text-smoke font-medium">เลือกหมูกระทะคุโรบูตะ ซีฟู้ด หรือเมนูอื่นๆ ลงตะกร้าเลย!</p>
                    <button onClick={() => setView('order')} className="px-6 py-2.5 rounded-xl bg-ember text-white font-bold text-xs">
                      ดูเมนูอาหาร
                    </button>
                  </div>
                )}
              </section>

              <aside className="space-y-6">
                <div className="bg-white border border-line rounded-2xl p-6 shadow-sm space-y-4">
                  <h2 className="text-base font-black text-ink border-b border-line pb-3">สรุปออเดอร์</h2>
                  <div className="space-y-2 text-xs font-semibold text-smoke">
                    <div className="flex justify-between">
                      <span>ราคาค่าอาหาร</span>
                      <span className="text-ink">฿{getCartTotal().toLocaleString()}</span>
                    </div>
                    {!tableId && (
                      <div className="flex justify-between">
                        <span>ราคาค่าจัดส่ง</span>
                        <span className="text-emerald-600">ฟรี (โปรโมชั่น)</span>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-line/60 pt-3 flex justify-between items-center">
                    <span className="font-black text-ink text-sm">ยอดรวมจ่ายทั้งหมด</span>
                    <span className="font-black text-lg text-deep">฿{getCartTotal().toLocaleString()}</span>
                  </div>

                  {cart.length > 0 ? (
                    <button
                      onClick={() => {
                        if (tableId) {
                          checkout.mutate()
                        } else {
                          requireAuthAndNavigate('checkout')
                        }
                      }}
                      disabled={checkout.isPending}
                      className="w-full h-12 rounded-xl bg-ember hover:bg-deep text-white font-bold text-sm shadow-md transition active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {tableId
                        ? (checkout.isPending ? 'กำลังส่งคำสั่งซื้อ...' : `ยืนยันสั่งเลย (โต๊ะ ${tableName})`)
                        : <>ไปหน้ากรอกที่อยู่และชำระเงิน <ChevronRight size={15} /></>
                      }
                    </button>
                  ) : (
                    <button disabled className="w-full h-12 rounded-xl bg-zinc-200 text-zinc-400 font-bold text-sm cursor-not-allowed">
                      ตะกร้าว่าง
                    </button>
                  )}
                </div>
              </aside>
            </div>
          </div>
        )}

        {/* ── VIEW: Checkout & Map Pin Location ── */}
        {view === 'checkout' && (
          <div className="max-w-4xl mx-auto px-4 py-8 bg-paper">
            <h1 className="text-3xl font-black text-ink">{tableId ? `ยืนยันสั่งอาหาร โต๊ะ ${tableName}` : 'ชำระเงินและปักหมุดจัดส่ง'}</h1>
            <p className="text-xs font-semibold text-smoke mt-1.5">{tableId ? 'ตรวจสอบรายการอาหารเพื่อสั่งตรงไปยังห้องครัว' : 'ระบุพิกัดสถานที่จัดส่งเดลิเวอรีและเลือกช่องทางชำระเงิน'}</p>

            <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8 mt-8 items-start">
              <section className="space-y-6">
                
                {tableId ? (
                  <div className="bg-white border border-line rounded-2xl p-6 shadow-sm space-y-3">
                    <h2 className="text-base font-black text-ink flex items-center gap-2">
                      <MapPin size={18} className="text-ember" /> การรับประทานอาหาร
                    </h2>
                    <div className="p-4 rounded-xl bg-ember/10 border border-ember/20 text-sm font-bold text-ink flex items-center gap-3">
                      <span className="text-3xl">🪑</span>
                      <div>
                        <p className="text-ember font-black">ทานที่ร้าน (โต๊ะ {tableName})</p>
                        <p className="text-xs text-smoke font-medium">อาหารจะถูกส่งไปยังห้องครัวและนำมาเสิร์ฟที่โต๊ะของคุณทันที</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Delivery Address & GPS Map Section */
                  <div className="bg-white border border-line rounded-2xl p-6 shadow-sm space-y-4">
                    <h2 className="text-base font-black text-ink flex items-center gap-1.5">
                      <MapPin size={18} className="text-ember" /> ข้อมูลผู้รับและที่อยู่จัดส่ง
                    </h2>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
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
                      <div className="pt-2">
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
                <div className="bg-white border border-line rounded-2xl p-6 shadow-sm space-y-4">
                  <h2 className="text-base font-black text-ink">เลือกช่องทางชำระเงิน</h2>
                  <div className="space-y-3">
                    <label className="flex items-start gap-4 p-4 rounded-xl border border-line hover:bg-soft cursor-pointer transition">
                      <input type="radio" name="payment" value="cash" defaultChecked className="mt-1 accent-ember size-4" />
                      <div>
                        <b className="text-sm text-ink flex items-center gap-1">💵 ชำระเงินสด / เก็บเงินปลายทาง (COD)</b>
                        <p className="text-[11px] text-smoke font-medium">ชำระเงินสดกับไรเดอร์เมื่อได้รับอาหารเรียบร้อยแล้ว</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-4 p-4 rounded-xl border border-line hover:bg-soft cursor-pointer transition">
                      <input type="radio" name="payment" value="promptpay" className="mt-1 accent-ember size-4" />
                      <div>
                        <b className="text-sm text-ink flex items-center gap-1">📱 PromptPay สแกนจ่าย</b>
                        <p className="text-[11px] text-smoke font-medium">สแกนคิวอาร์โค้ดชำระเงินได้ทันทีเพื่อความสะดวก</p>
                      </div>
                    </label>
                  </div>
                </div>
              </section>

              <aside className="space-y-6">
                <div className="bg-white border border-line rounded-2xl p-6 shadow-sm space-y-4 sticky top-20">
                  <h2 className="text-base font-black text-ink border-b border-line pb-3">สรุปยอดคำสั่งซื้อ</h2>
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 divide-y divide-line/30">
                    {cart.map(c => (
                      <div key={c.item.id} className="flex justify-between items-center text-xs pt-2 first:pt-0 font-medium text-ink">
                        <span>{c.item.name} <small className="text-smoke">x{c.quantity}</small></span>
                        <b>฿{(c.item.price * c.quantity).toLocaleString()}</b>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-line/60 pt-3 flex justify-between items-center">
                    <span className="font-black text-ink text-sm">ยอดชำระสุทธิ</span>
                    <span className="font-black text-lg text-deep">฿{getCartTotal().toLocaleString()}</span>
                  </div>

                  <button
                    onClick={() => checkout.mutate()}
                    disabled={checkout.isPending}
                    className="w-full h-12 rounded-xl bg-ember hover:bg-deep text-white font-bold text-sm shadow-md transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {checkout.isPending ? 'กำลังส่งคำสั่งซื้อ...' : tableId ? `ยืนยันสั่งอาหาร โต๊ะ ${tableName}` : 'ยืนยันสั่งซื้อเดลิเวอรี'}
                  </button>
                </div>
              </aside>
            </div>
          </div>
        )}

        {/* ── VIEW: Track Order Status ── */}
        {view === 'track' && (
          <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 bg-paper">
            <div>
              <h1 className="text-3xl font-black text-ink">{tableId ? `ประวัติการสั่งอาหาร โต๊ะ ${tableName}` : 'ติดตามสถานะออเดอร์'}</h1>
              <p className="text-xs font-semibold text-smoke mt-1">
                {tableId ? 'รายการออเดอร์ทั้งหมดของโต๊ะนี้ (อัปเดตเรียลไทม์จากห้องครัว)' : 'อัปเดตแบบเรียลไทม์ตรงถึงบ้านของคุณ'}
              </p>
            </div>

            {/* DINE-IN ORDERS HISTORY FOR THIS TABLE */}
            {tableId ? (
              tableOrdersQuery.data && tableOrdersQuery.data.length > 0 ? (
                <div className="space-y-6">
                  {tableOrdersQuery.data.map((ord: any) => {
                    const isDone = ord.status === 'completed' || ord.status === 'ready'
                    const isPrep = ord.status === 'preparing' || ord.status === 'accepted'
                    return (
                      <div key={ord.id} className="bg-white border border-line rounded-3xl p-6 shadow-md space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between border-b border-line pb-4 gap-2">
                          <div>
                            <h2 className="text-lg font-black text-ink">#{ord.order_number || ord.id.slice(0, 8)}</h2>
                            <p className="text-xs text-smoke font-medium">
                              สั่งเมื่อ: <strong className="text-ink">{new Date(ord.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</strong>
                            </p>
                          </div>
                          <span className="px-3.5 py-1.5 rounded-lg bg-ember/10 border border-ember/30 text-xs font-bold text-ember self-start sm:self-center">
                            🔥 {ord.status === 'pending' ? 'รอรับออเดอร์' : ord.status === 'preparing' ? 'กำลังปรุงอาหาร' : ord.status === 'ready' ? 'พร้อมเสิร์ฟ' : ord.status === 'completed' ? 'เสิร์ฟเรียบร้อย' : ord.status}
                          </span>
                        </div>

                        {/* Dine-In Progress Steps (No Rider / No Map) */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className={`flex flex-col items-center text-center space-y-1.5 p-3 rounded-xl border text-xs font-bold ${ord.status ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-soft/40 border-line text-smoke'}`}>
                            <span className="size-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">✓</span>
                            <span>รับออเดอร์แล้ว</span>
                          </div>
                          <div className={`flex flex-col items-center text-center space-y-1.5 p-3 rounded-xl border text-xs font-bold ${isPrep || isDone ? 'bg-ember/10 border-ember/30 text-ember' : 'bg-soft/40 border-line text-smoke opacity-50'}`}>
                            <span className="size-7 rounded-full bg-ember text-white flex items-center justify-center font-bold text-xs shadow-sm animate-pulse">🔥</span>
                            <span>กำลังปรุงอาหาร</span>
                          </div>
                          <div className={`flex flex-col items-center text-center space-y-1.5 p-3 rounded-xl border text-xs font-bold ${isDone ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-soft/40 border-line text-smoke opacity-50'}`}>
                            <span className="size-7 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">🍽️</span>
                            <span>พร้อมเสิร์ฟ</span>
                          </div>
                          <div className={`flex flex-col items-center text-center space-y-1.5 p-3 rounded-xl border text-xs font-bold ${ord.status === 'completed' ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-soft/40 border-line text-smoke opacity-50'}`}>
                            <span className="size-7 rounded-full bg-zinc-700 text-white flex items-center justify-center font-bold text-xs shadow-sm">🎉</span>
                            <span>เสิร์ฟเรียบร้อย</span>
                          </div>
                        </div>

                        {/* Order Items List */}
                        <div className="space-y-2 pt-2">
                          <b className="text-xs text-ink block">รายการอาหารรอบนี้:</b>
                          <div className="space-y-2 divide-y divide-line/30">
                            {ord.items && ord.items.map((it: any) => (
                              <div key={it.id} className="flex justify-between text-xs pt-1.5 font-medium text-ink">
                                <span>🥩 {it.name} <small className="text-smoke">x{it.quantity}</small></span>
                                <b>฿{(it.unit_price * it.quantity).toLocaleString()}</b>
                              </div>
                            ))}
                          </div>
                          <div className="border-t border-line/60 pt-3 flex justify-between items-center text-sm">
                            <span className="font-bold text-ink">ยอดรวมรอบนี้</span>
                            <span className="font-black text-ember">฿{ord.total?.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-white border border-line rounded-3xl p-12 text-center shadow-sm space-y-4">
                  <span className="text-5xl block select-none">🪑</span>
                  <h2 className="font-black text-lg text-ink">ยังไม่มีรายการสั่งอาหารสำหรับโต๊ะ {tableName}</h2>
                  <p className="text-xs text-smoke font-medium">กดเลือกหมูกระทะและเมนูเด็ดลงเตาได้เลย!</p>
                  <button onClick={() => setView('order')} className="px-6 py-2.5 rounded-xl bg-ember text-white font-bold text-xs">
                    ไปที่หน้าสั่งอาหาร
                  </button>
                </div>
              )
            ) : (
              /* DELIVERY ORDER TRACKING */
              lastOrder ? (
                <div className="bg-white border border-line rounded-3xl p-6 sm:p-8 shadow-md space-y-8">
                  <div className="flex flex-col sm:flex-row justify-between border-b border-line pb-4 gap-2">
                    <div>
                      <h2 className="text-lg font-black text-ink">{lastOrder.id}</h2>
                      <p className="text-xs text-smoke font-medium">
                        ประเภทออเดอร์: <strong className="text-ink">จัดส่งถึงบ้าน (เดลิเวอรี)</strong>
                      </p>
                    </div>
                    <span className="px-3.5 py-1.5 rounded-lg bg-ember/10 border border-ember/30 text-xs font-bold text-ember self-start sm:self-center">
                      🔥 {lastOrder.status}
                    </span>
                  </div>

                  {/* Delivery Progress Steps */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex flex-col items-center text-center space-y-2 p-3 rounded-xl bg-soft/40 border border-line">
                      <span className="size-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">✓</span>
                      <b className="text-xs text-ink">รับออเดอร์แล้ว</b>
                      <small className="text-[10px] text-smoke font-medium">{lastOrder.time}</small>
                    </div>
                    <div className="flex flex-col items-center text-center space-y-2 p-3 rounded-xl bg-ember/5 border-2 border-ember">
                      <span className="size-8 rounded-full bg-ember text-white flex items-center justify-center font-bold text-sm shadow-sm animate-pulse">🔥</span>
                      <b className="text-xs text-ember">กำลังปรุงอาหาร</b>
                      <small className="text-[10px] text-ember font-medium">เตากำลังร้อน</small>
                    </div>
                    <div className="flex flex-col items-center text-center space-y-2 p-3 rounded-xl bg-soft/40 border border-line opacity-50">
                      <span className="size-8 rounded-full bg-zinc-200 text-smoke flex items-center justify-center font-bold text-sm">🛵</span>
                      <b className="text-xs text-ink">ไรเดอร์จัดส่ง</b>
                      <small className="text-[10px] text-smoke font-medium">รออัปเดต</small>
                    </div>
                    <div className="flex flex-col items-center text-center space-y-2 p-3 rounded-xl bg-soft/40 border border-line opacity-50">
                      <span className="size-8 rounded-full bg-zinc-200 text-smoke flex items-center justify-center font-bold text-sm">🎉</span>
                      <b className="text-xs text-ink">จัดส่งเรียบร้อย</b>
                      <small className="text-[10px] text-smoke font-medium">รอรับสินค้า</small>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-ember/5 border border-ember/20 text-xs text-ink font-semibold flex items-center gap-2">
                    <Info size={16} className="text-ember shrink-0" />
                    <span>อาหารของคุณกำลังปรุงสดใหม่ คาดว่าจะส่งออกจากครัวใน ~10 นาที</span>
                  </div>

                  {/* Delivery Location Details */}
                  {lastOrder.address && (
                    <div className="p-4 rounded-xl bg-soft border border-line space-y-2 text-xs">
                      <div className="flex items-center justify-between">
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
                      <p className="text-smoke">{lastOrder.address.name} ({lastOrder.address.phone}) - {lastOrder.address.address}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white border border-line rounded-3xl p-12 text-center shadow-sm space-y-4">
                  <span className="text-5xl block select-none">📦</span>
                  <h2 className="font-black text-lg text-ink">ยังไม่มีประวัติคำสั่งซื้อล่าสุด</h2>
                  <p className="text-xs text-smoke font-medium">เริ่มกดสั่งหมูกระทะส่งตรงถึงบ้านคุณได้ทันที!</p>
                  <button onClick={() => requireAuthAndNavigate('order')} className="px-6 py-2.5 rounded-xl bg-ember text-white font-bold text-xs">
                    เริ่มสั่งอาหาร
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {/* ── VIEW: Promotions ── */}
        {view === 'promotions' && (
          <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 bg-paper">
            <div>
              <h1 className="text-3xl font-black text-ink">โปรโมชั่นและคูปองส่วนลด</h1>
              <p className="text-xs font-semibold text-smoke mt-1">คูปองสิทธิพิเศษสำหรับลูกค้าเดลิเวอรี</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {[
                { code: 'TAOTHAN100', desc: 'ลดทันที 100 บาท เมื่อสั่งครบ 500 บาท', expire: '31 ธ.ค. 2569' },
                { code: 'FREESHIP', desc: 'ส่งฟรี 5 กม. แรก ทุกออเดอร์', expire: '31 ธ.ค. 2569' },
                { code: 'WELCOME50', desc: 'ส่วนลด 50 บาท สำหรับลูกค้าใหม่', expire: '31 ธ.ค. 2569' }
              ].map((promo) => (
                <div key={promo.code} className="bg-white border border-line rounded-2xl p-5 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="inline-block font-mono font-black text-ember text-base px-2.5 py-0.5 rounded-md bg-ember/10 border border-ember/30">
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
                    className="px-3 py-1.5 rounded-lg border border-line hover:bg-soft text-xs font-bold text-smoke transition flex items-center gap-1 shrink-0"
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
          <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 bg-paper">
            <div>
              <h1 className="text-3xl font-black text-ink">ติดต่อเรา</h1>
              <p className="text-xs font-semibold text-smoke mt-1">สอบถามข้อมูลเพิ่มเติม หรือแจ้งปัญหาการจัดส่ง</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border border-line rounded-2xl p-6 shadow-sm space-y-4">
                <h2 className="text-base font-black text-ink">ข้อมูลการติดต่อร้าน</h2>
                <div className="space-y-3 text-xs font-semibold text-smoke">
                  <p className="flex items-center gap-2 text-ink">
                    <Store size={16} className="text-ember" /> ร้าน: <strong>{shop?.name || 'เตาถ่าน หมูกระทะ'}</strong>
                  </p>
                  <p className="flex items-center gap-2 text-ink">
                    <Phone size={16} className="text-ember" /> โทรศัพท์: <strong>081-234-5678</strong>
                  </p>
                  <p className="flex items-center gap-2 text-ink">
                    <Clock size={16} className="text-ember" /> เวลาทำการ: <strong>11:00 – 23:00 น.</strong>
                  </p>
                  <p className="flex items-start gap-2 text-ink">
                    <MapPin size={16} className="text-ember shrink-0 mt-0.5" /> ที่ตั้งร้าน: <strong>สาขาหลัก ตรงข้ามตลาดสดเทศบาล</strong>
                  </p>
                </div>
              </div>

              <div className="bg-white border border-line rounded-2xl p-6 shadow-sm space-y-4">
                <h2 className="text-base font-black text-ink">ส่งข้อความถึงร้าน</h2>
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
                  <button type="submit" className="w-full py-3 rounded-xl bg-coal hover:bg-ink text-white font-bold text-xs shadow-md transition">
                    ส่งข้อความ
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

      </main>

    </div>
  )
}
