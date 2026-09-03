import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2, Clock, Eye, MapPin, Phone, RefreshCw, Search,
  ShoppingBag, Utensils, X, AlertCircle, ChefHat, Bike, FileText, Navigation, ExternalLink
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useStore } from '../../StoreContext'
import { PageHeader, Panel } from '../PageKit'
import DeliveryRouteMap from '../../../components/DeliveryRouteMap'

const statuses = ['pending', 'accepted', 'preparing', 'delivering', 'ready', 'completed', 'cancelled']

const statusConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pending: { label: 'รอดำเนินการ', bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  accepted: { label: 'รับออเดอร์แล้ว', bg: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-700 dark:text-sky-400', border: 'border-sky-200 dark:border-sky-800' },
  preparing: { label: 'กำลังปรุงอาหาร', bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
  delivering: { label: 'ไรเดอร์กำลังส่ง', bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  ready: { label: 'พร้อมเสิร์ฟ/ส่ง', bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  completed: { label: 'สำเร็จแล้ว', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  cancelled: { label: 'ยกเลิกแล้ว', bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
}

const channelConfig: Record<string, { label: string; icon: string; bg: string }> = {
  dine_in: { label: 'ทานที่ร้าน', icon: '🍽️', bg: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400' },
  takeaway: { label: 'สั่งกลับบ้าน', icon: '🛍️', bg: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' },
  delivery: { label: 'เดลิเวอรี', icon: '🛵', bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' }
}

function parseCustomerInfo(rawName: string | null | undefined, orderType: string, notes?: string | null) {
  let name = 'Customer'
  let phone = ''
  let location = ''
  let lat = 13.7563
  let lng = 100.5018
  let distanceKm = ''
  let hasGps = false

  if (!rawName || rawName === 'Walk-in') {
    name = 'Walk-in Customer'
  } else if (rawName.includes('|')) {
    const parts = rawName.split('|').map(s => s.trim())
    name = parts[0] || 'Customer'
    phone = parts[1] || ''
    location = parts.slice(2).join(' ') || ''
  } else if (rawName === 'สั่งกลับบ้าน' || rawName.toLowerCase() === 'takeaway') {
    name = 'สั่งกลับบ้าน (Takeaway)'
  } else if (rawName.startsWith('โต๊ะ')) {
    name = `ลูกค้า ${rawName}`
  } else {
    name = rawName
  }

  // Parse details from notes
  if (notes) {
    const gpsMatch = notes.match(/พิกัด GPS:\s*([\d.-]+),\s*([\d.-]+)/i) || notes.match(/GPS:\s*([\d.-]+),\s*([\d.-]+)/i)
    if (gpsMatch) {
      lat = parseFloat(gpsMatch[1])
      lng = parseFloat(gpsMatch[2])
      hasGps = true
    }

    const distMatch = notes.match(/ระยะทาง:\s*([\d.]+)\s*กม/i) || notes.match(/\(([\d.]+)\s*กม\.\)/i)
    if (distMatch) {
      distanceKm = distMatch[1]
    }

    const addrMatch = notes.match(/ที่อยู่:\s*([^\n]+)/i)
    if (addrMatch && !location) {
      location = addrMatch[1].trim()
    }
  }

  return { name, phone, location, lat, lng, distanceKm, hasGps }
}

export default function Orders() {
  const { store } = useStore()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<string>('all')
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)

  const query = useQuery({
    queryKey: ['orders', store.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_orders')
        .select('*, store_tables(table_number), store_order_items(*)')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      return data || []
    }
  })

  // Fetch store location (lat/lng) from shops table and store_settings
  const storeLocationQuery = useQuery({
    queryKey: ['store-coordinates', store.id],
    queryFn: async () => {
      // 1. Fetch from shops table (where Settings updates latitude/longitude)
      const { data: shopData } = await supabase
        .from('shops')
        .select('latitude, longitude')
        .eq('id', store.id)
        .maybeSingle()

      // 2. Fetch from store_settings (for delivery_config fallback)
      const { data: settingsData } = await supabase
        .from('store_settings')
        .select('delivery_config')
        .eq('store_id', store.id)
        .maybeSingle()

      const delConf = (settingsData as any)?.delivery_config || {}
      const lat = shopData?.latitude ?? delConf?.latitude ?? 13.7563
      const lng = shopData?.longitude ?? delConf?.longitude ?? 100.5018

      return {
        lat: Number(lat),
        lng: Number(lng)
      }
    },
    staleTime: 5 * 60 * 1000
  })

  const storeLat = Number(storeLocationQuery.data?.lat || 13.7563)
  const storeLng = Number(storeLocationQuery.data?.lng || 100.5018)

  useEffect(() => {
    const c = supabase
      .channel(`orders:${store.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_orders', filter: `store_id=eq.${store.id}` },
        () => qc.invalidateQueries({ queryKey: ['orders', store.id] })
      )
      .subscribe()

    return () => {
      supabase.removeChannel(c)
    }
  }, [store.id, qc])

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('store_orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('store_id', store.id)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders', store.id] })
      if (selectedOrder) {
        setSelectedOrder((prev: any) => prev ? { ...prev, status: selectedOrder.nextStatus || prev.status } : null)
      }
    }
  })

  const rawOrders = query.data || []

  const counts = {
    all: rawOrders.length,
    pending: rawOrders.filter((o: any) => o.status === 'pending').length,
    preparing: rawOrders.filter((o: any) => ['accepted', 'preparing'].includes(o.status)).length,
    ready: rawOrders.filter((o: any) => o.status === 'ready').length,
    completed: rawOrders.filter((o: any) => o.status === 'completed').length,
    cancelled: rawOrders.filter((o: any) => o.status === 'cancelled').length
  }

  const filteredOrders = rawOrders.filter((o: any) => {
    const cust = parseCustomerInfo(o.customer_name, o.order_type)
    const matchesSearch =
      `${o.order_number} ${cust.name} ${cust.phone} ${o.store_tables?.table_number || ''}`
        .toLowerCase()
        .includes(search.toLowerCase())

    if (!matchesSearch) return false

    if (activeTab === 'all') return true
    if (activeTab === 'pending') return o.status === 'pending'
    if (activeTab === 'preparing') return ['accepted', 'preparing'].includes(o.status)
    if (activeTab === 'ready') return o.status === 'ready'
    if (activeTab === 'completed') return o.status === 'completed'
    if (activeTab === 'cancelled') return o.status === 'cancelled'
    return true
  })

  const handleUpdateStatus = (id: string, newStatus: string) => {
    update.mutate({ id, status: newStatus })
    if (selectedOrder && selectedOrder.id === id) {
      setSelectedOrder({ ...selectedOrder, status: newStatus })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="รายการออเดอร์หน้าร้านและออนไลน์ อัปเดตเรียลไทม์ผ่านระบบ Supabase"
      />

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        {[
          { id: 'all', label: 'ทั้งหมด', count: counts.all },
          { id: 'pending', label: 'รอดำเนินการ', count: counts.pending, color: 'bg-amber-500' },
          { id: 'preparing', label: 'กำลังปรุง', count: counts.preparing, color: 'bg-indigo-500' },
          { id: 'ready', label: 'พร้อมเสิร์ฟ', count: counts.ready, color: 'bg-purple-500' },
          { id: 'completed', label: 'สำเร็จ', count: counts.completed, color: 'bg-emerald-500' },
          { id: 'cancelled', label: 'ยกเลิก', count: counts.cancelled, color: 'bg-red-500' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === tab.id
                ? 'bg-zinc-950 text-white shadow-md dark:bg-orange-500'
                : 'bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-800'
            }`}
          >
            {tab.color && <span className={`size-2 rounded-full ${tab.color}`} />}
            <span>{tab.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}

        <button
          onClick={() => qc.invalidateQueries({ queryKey: ['orders', store.id] })}
          className="ml-auto grid size-10 place-items-center rounded-xl border border-zinc-200/80 bg-white text-zinc-500 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
          title="รีเฟรชออเดอร์"
        >
          <RefreshCw size={16} className={query.isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      <Panel>
        {/* Search Header */}
        <div className="border-b p-4 dark:border-zinc-800">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาเลขออเดอร์, ชื่อลูกค้า, เบอร์โทร..."
              className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:ring-orange-500/20"
            />
          </div>
        </div>

        {/* Content Table */}
        {query.isLoading ? (
          <div className="py-20 text-center text-sm font-bold text-zinc-400">
            กำลังโหลดรายการออเดอร์…
          </div>
        ) : query.error ? (
          <div className="py-20 text-center text-sm font-bold text-red-500">
            {(query.error as Error).message}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center">
            <ShoppingBag size={40} className="mx-auto text-zinc-300 dark:text-zinc-700" />
            <p className="mt-3 text-sm font-bold text-zinc-500 dark:text-zinc-400">ไม่พบรายการออเดอร์</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/70 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/50">
                  <th className="px-5 py-3.5">Order</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Table</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
                {filteredOrders.map((o: any) => {
                  const cust = parseCustomerInfo(o.customer_name, o.order_type, o.notes)
                  const st = statusConfig[o.status] || { label: o.status, bg: 'bg-zinc-100', text: 'text-zinc-600', border: 'border-zinc-200' }
                  const ch = channelConfig[o.order_type] || { label: o.order_type, icon: '📦', bg: 'bg-zinc-100 text-zinc-600' }

                  return (
                    <tr
                      key={o.id}
                      className="hover:bg-orange-50/30 dark:hover:bg-zinc-800/60 transition"
                    >
                      <td className="px-5 py-4">
                        <span className="font-extrabold text-zinc-900 dark:text-white">
                          #{o.order_number}
                        </span>
                        {o.store_order_items?.length > 0 && (
                          <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                            {o.store_order_items.length} รายการ
                          </span>
                        )}
                        {cust.distanceKm && (
                          <span className="ml-1.5 rounded-full bg-orange-100 dark:bg-orange-950/40 px-2 py-0.5 text-[10px] font-black text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50">
                            🛵 {cust.distanceKm} กม.
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-bold text-zinc-800 dark:text-zinc-200">
                          {cust.name}
                        </div>
                        {(cust.phone || cust.location) && (
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
                            {cust.phone && (
                              <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                <Phone size={10} /> {cust.phone}
                              </span>
                            )}
                            {cust.location && (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 max-w-[200px] truncate">
                                <MapPin size={10} /> {cust.location}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {o.store_tables?.table_number ? (
                          <span className="inline-flex items-center gap-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/50 px-2.5 py-1 text-xs font-black text-orange-600 dark:text-orange-400">
                            <MapPin size={12} /> โต๊ะ {o.store_tables.table_number}
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${ch.bg}`}>
                            <span>{ch.icon}</span>
                            <span>{ch.label}</span>
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <select
                          value={o.status}
                          disabled={update.isPending}
                          onChange={e => handleUpdateStatus(o.id, e.target.value)}
                          className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-extrabold outline-none transition ${st.bg} ${st.text} ${st.border}`}
                        >
                          {statuses.map(s => (
                            <option key={s} value={s} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">
                              {statusConfig[s]?.label || s}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="inline-grid size-8 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-xs transition hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                          title="ดูรายละเอียดออเดอร์"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={(newStatus) => handleUpdateStatus(selectedOrder.id, newStatus)}
          isUpdating={update.isPending}
          storeLocation={{
            lat: storeLat,
            lng: storeLng,
            name: store?.name || 'ร้านค้า'
          }}
        />
      )}
    </div>
  )
}

function OrderDetailModal({
  order,
  onClose,
  onUpdateStatus,
  isUpdating,
  storeLocation
}: {
  order: any
  onClose: () => void
  onUpdateStatus: (status: string) => void
  isUpdating: boolean
  storeLocation?: { lat: number; lng: number; name?: string }
}) {
  const cust = parseCustomerInfo(order.customer_name, order.order_type, order.notes)
  const st = statusConfig[order.status] || { label: order.status, bg: 'bg-zinc-100', text: 'text-zinc-600', border: 'border-zinc-200' }
  const ch = channelConfig[order.order_type] || { label: order.order_type, icon: '📦', bg: 'bg-zinc-100 text-zinc-600' }

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-zinc-950/60 p-4 backdrop-blur-sm"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div className="my-8 flex max-h-[calc(100vh-4rem)] w-full max-w-2xl flex-col rounded-[28px] bg-white shadow-2xl dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-100 p-6 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-zinc-900 dark:text-white">
                ออเดอร์ #{order.order_number}
              </h2>
              <span className={`rounded-full border px-3 py-1 text-xs font-extrabold ${st.bg} ${st.text} ${st.border}`}>
                {st.label}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              สร้างเมื่อ {new Date(order.created_at).toLocaleString('th-TH')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid size-9 place-items-center rounded-xl text-zinc-400 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 space-y-5">
          {/* Info Card */}
          <div className="grid gap-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">ช่องทางขาย</p>
              <p className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <span>{ch.icon}</span> {ch.label}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">โต๊ะที่สั่ง</p>
              <p className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-200">
                {order.store_tables?.table_number ? `โต๊ะ ${order.store_tables.table_number}` : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">วิธีชำระเงิน</p>
              <p className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase">
                {order.payment_method || 'PromptPay / หน้าร้าน'}
              </p>
            </div>
          </div>

          {/* Delivery & Routing Map Section */}
          {(order.order_type === 'delivery' || cust.hasGps || cust.location) && (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <Bike size={16} className="text-orange-500" /> แผนที่และข้อมูลการจัดส่งเดลิเวอรี
                </span>
                {cust.distanceKm && (
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 text-xs font-black">
                    ระยะทาง {cust.distanceKm} กม.
                  </span>
                )}
              </div>

              <DeliveryRouteMap
                mode="route"
                height="220px"
                showSearch={false}
                storeLocation={storeLocation}
                customerLocation={{
                  lat: cust.lat,
                  lng: cust.lng,
                  address: cust.location || cust.name || 'ที่อยู่จัดส่ง'
                }}
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
                <p className="text-zinc-600 dark:text-zinc-300 font-medium">
                  ที่อยู่: <b>{cust.location || 'ตามพิกัดที่ปักหมุด'}</b>
                </p>
                <a
                  href={`https://maps.google.com/?q=${cust.lat},${cust.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-orange-600 hover:underline shrink-0"
                >
                  <Navigation size={13} /> นำทางด้วย Google Maps <ExternalLink size={11} />
                </a>
              </div>
            </div>
          )}

          {/* Customer Details */}
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">ข้อมูลลูกค้า</p>
            <p className="mt-1 text-sm font-extrabold text-zinc-900 dark:text-white">
              {cust.name}
            </p>
            {cust.phone && (
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                <Phone size={13} className="text-zinc-400" /> {cust.phone}
              </p>
            )}
          </div>

          {/* Special Notes */}
          {order.notes && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs dark:border-amber-800/50 dark:bg-amber-500/10">
              <span className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5 mb-1">
                <FileText size={14} /> ข้อมูลและหมายเหตุจากลูกค้า
              </span>
              <p className="text-amber-900 dark:text-amber-300 font-medium whitespace-pre-line">{order.notes}</p>
            </div>
          )}

          {/* Order Items Table */}
          <div>
            <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white mb-3">
              รายการอาหารที่สั่ง ({order.store_order_items?.length || 0} รายการ)
            </h3>

            {!order.store_order_items || order.store_order_items.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 text-center">ไม่มีข้อมูลรายการอาหารในออเดอร์นี้</p>
            ) : (
              <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-100 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
                {order.store_order_items.map((item: any) => {
                  const toppingsList = Array.isArray(item.toppings) ? item.toppings : []
                  return (
                    <div key={item.id} className="p-3.5 flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-zinc-900 dark:text-white">
                          {item.name}
                        </p>
                        {toppingsList.length > 0 && (
                          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            + {toppingsList.map((t: any) => t.name || t).join(', ')}
                          </p>
                        )}
                        {item.notes && (
                          <p className="mt-0.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
                            * {item.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-zinc-400">
                          {item.quantity} x ฿{Number(item.unit_price || 0).toLocaleString()}
                        </p>
                        <p className="text-sm font-extrabold text-zinc-900 dark:text-white mt-0.5">
                          ฿{(item.quantity * Number(item.unit_price || 0)).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Pricing Summary */}
          <div className="rounded-2xl bg-zinc-50 p-4 space-y-2 dark:bg-zinc-800/40 text-xs font-medium">
            <div className="flex justify-between text-zinc-500">
              <span>ยอดรวมอาหาร (Subtotal)</span>
              <span>฿{Number(order.subtotal || order.total || 0).toLocaleString()}</span>
            </div>
            {Number(order.discount || 0) > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>ส่วนลด (Discount)</span>
                <span>-฿{Number(order.discount).toLocaleString()}</span>
              </div>
            )}
            {Number(order.tax || 0) > 0 && (
              <div className="flex justify-between text-zinc-500">
                <span>ภาษี (VAT 7%)</span>
                <span>฿{Number(order.tax).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-black text-zinc-900 dark:border-zinc-700 dark:text-white">
              <span>ราคารวมสุทธิ (Total)</span>
              <span className="text-orange-500">฿{Number(order.total || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Quick Change Status Buttons */}
          <div>
            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
              อัปเดตสถานะออเดอร์ / จัดส่ง
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                { s: 'accepted', label: 'รับออเดอร์', icon: CheckCircle2, color: 'hover:border-sky-500 hover:text-sky-600' },
                { s: 'preparing', label: 'กำลังปรุงอาหาร', icon: ChefHat, color: 'hover:border-indigo-500 hover:text-indigo-600' },
                { s: 'delivering', label: 'ไรเดอร์ออกส่ง', icon: Bike, color: 'hover:border-blue-500 hover:text-blue-600' },
                { s: 'ready', label: 'พร้อมเสิร์ฟ/ส่ง', icon: Utensils, color: 'hover:border-purple-500 hover:text-purple-600' },
                { s: 'completed', label: 'จัดส่งสำเร็จ', icon: CheckCircle2, color: 'hover:border-emerald-500 hover:text-emerald-600' },
                { s: 'cancelled', label: 'ยกเลิกออเดอร์', icon: AlertCircle, color: 'hover:border-red-500 hover:text-red-600' },
              ].map(btn => (
                <button
                  key={btn.s}
                  disabled={isUpdating || order.status === btn.s}
                  onClick={() => onUpdateStatus(btn.s)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition cursor-pointer ${
                    order.status === btn.s
                      ? 'border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-500/20'
                      : `border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 ${btn.color}`
                  } disabled:opacity-50`}
                >
                  <btn.icon size={14} />
                  <span>{btn.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-zinc-100 p-4 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="h-11 rounded-xl bg-zinc-950 px-6 text-sm font-bold text-white shadow-md transition hover:bg-zinc-800 dark:bg-orange-500 dark:hover:bg-orange-600 cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  )
}
