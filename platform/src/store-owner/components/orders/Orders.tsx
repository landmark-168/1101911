import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2, Clock, Eye, MapPin, Phone, RefreshCw, Search,
  ShoppingBag, Utensils, X, AlertCircle, ChefHat, Bike, FileText, Navigation, ExternalLink, Pencil, Plus, Minus, Save
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useStore } from '../../StoreContext'
import { PageHeader, Panel } from '../PageKit'
import DeliveryRouteMap from '../../../components/DeliveryRouteMap'
import { useLanguage } from '../../../lib/language'

const statuses = ['pending', 'accepted', 'preparing', 'delivering', 'ready', 'completed', 'cancelled']
const nextStep: Record<string, { status: string; label: string }> = {
  pending: { status: 'preparing', label: 'รับออเดอร์' },
  accepted: { status: 'ready', label: 'พร้อมรับ' },
  preparing: { status: 'ready', label: 'พร้อมรับ' },
  ready: { status: 'completed', label: 'เสร็จสิ้น' },
}

const statusConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pending: { label: 'รอดำเนินการ', bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  accepted: { label: 'กำลังปรุงอาหาร', bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
  preparing: { label: 'กำลังปรุงอาหาร', bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
  delivering: { label: 'ไรเดอร์กำลังส่ง', bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  ready: { label: 'พร้อมเสิร์ฟ/ส่ง', bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  completed: { label: 'สำเร็จแล้ว', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  cancelled: { label: 'ยกเลิกแล้ว', bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
}

const paymentStatusConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  unpaid: { label: 'ยังไม่ชำระ', bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  paid: { label: 'ชำระแล้ว', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  not_required: { label: 'ไม่ต้องชำระ', bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-500 dark:text-zinc-400', border: 'border-zinc-200 dark:border-zinc-700' }
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

function getCancellationReason(notes?: string | null) {
  const match = String(notes || '').match(/\[ยกเลิกโดยร้าน\]\s*([^\n]+)/)
  return match?.[1]?.trim() || ''
}

function getPaymentStatus(order: any) {
  if (order.status === 'cancelled') return 'not_required'
  if (order.payment_status) return order.payment_status
  return String(order.notes || '').includes('[ชำระแล้ว]') ? 'paid' : 'unpaid'
}

function openOrderInPos(orderId: string) {
  const posPath = `${window.location.pathname.replace(/\/orders$/, '/pos')}?edit_order_id=${orderId}`
  window.history.pushState({}, '', posPath)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function openOrdersInPos(orderIds: string[]) {
  const posPath = `${window.location.pathname.replace(/\/orders$/, '/pos')}?payment_order_ids=${orderIds.join(',')}`
  window.history.pushState({}, '', posPath)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function playCancellationAlert() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const context = new AudioContextClass()
    ;[440, 330, 440].forEach((frequency, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const startAt = context.currentTime + index * 0.18
      oscillator.frequency.setValueAtTime(frequency, startAt)
      gain.gain.setValueAtTime(0.12, startAt)
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.16)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(startAt)
      oscillator.stop(startAt + 0.16)
    })
  } catch {
  }
}

export default function Orders() {
  const { language } = useLanguage()
  const english = language === 'en'
  const statusLabels: Record<string, string> = english ? { pending: 'Pending', accepted: 'Preparing', preparing: 'Preparing', delivering: 'Out for delivery', ready: 'Ready to serve / deliver', completed: 'Completed', cancelled: 'Cancelled' } : {}
  const paymentLabels: Record<string, string> = english ? { unpaid: 'Unpaid', paid: 'Paid', not_required: 'No payment required' } : {}
  const channelLabels: Record<string, string> = english ? { dine_in: 'Dine in', takeaway: 'Takeaway', delivery: 'Delivery' } : {}
  const { store } = useStore()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<string>('all')
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const [selectedPaymentOrderIds, setSelectedPaymentOrderIds] = useState<string[]>([])
  const cancelledOrderIdsRef = useRef<Set<string> | null>(null)

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

  const menuQuery = useQuery({
    queryKey: ['order-edit-menu', store.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_menu_items')
        .select('id, name, price, category_id, category:store_categories(name)')
        .eq('store_id', store.id)
        .eq('available', true)
        .order('name')
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
      if (status === 'cancelled') {
        const { data: current, error: currentError } = await supabase
          .from('store_orders')
          .select('status, payment_status')
          .eq('store_id', store.id)
          .eq('id', id)
          .single()
        if (currentError) throw currentError
        if (['completed', 'cancelled'].includes(current.status) || current.payment_status === 'paid') {
          throw new Error('ไม่สามารถยกเลิกออเดอร์ที่ปิดบิลหรือชำระเงินแล้ว')
        }
      }
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

  const updatePaymentStatus = useMutation({
    mutationFn: async ({ id, paymentStatus }: { id: string; paymentStatus: string }) => {
      const { error } = await supabase
        .from('store_orders')
        .update({ payment_status: paymentStatus, updated_at: new Date().toISOString() })
        .eq('store_id', store.id)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders', store.id] }),
    onError: error => alert((error as Error).message)
  })

  const rawOrders = (query.data || []).filter((order: any) => {
    const number = String(order.order_number || '').toUpperCase()
    const notes = String(order.notes || '')
    return !number.startsWith('SRV') && order.order_type !== 'service_request' && !notes.includes('เรียกพนักงาน')
  })

  useEffect(() => {
    const legacyPendingOrders = rawOrders.filter((order: any) => order.status === 'pending' && order.order_type !== 'delivery')
    if (!legacyPendingOrders.length) return

    Promise.all(legacyPendingOrders.map(async (order: any) => {
      const { error } = await supabase
        .from('store_orders')
        .update({ status: 'preparing', updated_at: new Date().toISOString() })
        .eq('store_id', store.id)
        .eq('id', order.id)
      if (error) throw error
    })).then(() => qc.invalidateQueries({ queryKey: ['orders', store.id] }))
  }, [rawOrders, store.id, qc])

  const counts = {
    all: rawOrders.length,
    active: rawOrders.filter((o: any) => !['completed', 'cancelled'].includes(o.status)).length,
    pending: rawOrders.filter((o: any) => o.status === 'pending').length,
    preparing: rawOrders.filter((o: any) => ['accepted', 'preparing'].includes(o.status)).length,
    ready: rawOrders.filter((o: any) => o.status === 'ready').length,
    completed: rawOrders.filter((o: any) => o.status === 'completed').length,
    cancelled: rawOrders.filter((o: any) => o.status === 'cancelled').length
  }

  const cancelledOrders = rawOrders.filter((order: any) => order.status === 'cancelled')

  useEffect(() => {
    const currentCancelledIds = new Set(cancelledOrders.map((order: any) => order.id))
    if (cancelledOrderIdsRef.current) {
      const hasNewCancellation = [...currentCancelledIds].some(id => !cancelledOrderIdsRef.current?.has(id))
      if (hasNewCancellation) playCancellationAlert()
    }
    cancelledOrderIdsRef.current = currentCancelledIds
  }, [cancelledOrders])

  const filteredOrders = rawOrders.filter((o: any) => {
    const cust = parseCustomerInfo(o.customer_name, o.order_type)
    const matchesSearch =
      `${o.order_number} ${cust.name} ${cust.phone} ${o.store_tables?.table_number || ''}`
        .toLowerCase()
        .includes(search.toLowerCase())

    if (!matchesSearch) return false

    if (activeTab === 'all') return true
    if (activeTab === 'active') return !['completed', 'cancelled'].includes(o.status)
    if (activeTab === 'pending') return o.status === 'pending'
    if (activeTab === 'preparing') return ['accepted', 'preparing'].includes(o.status)
    if (activeTab === 'ready') return o.status === 'ready'
    if (activeTab === 'completed') return o.status === 'completed'
    if (activeTab === 'cancelled') return o.status === 'cancelled'
    return true
  })

  const payableOrders = filteredOrders.filter((order: any) => order.status !== 'cancelled' && getPaymentStatus(order) !== 'paid')
  const selectedPayableOrders = payableOrders.filter(order => selectedPaymentOrderIds.includes(order.id))
  const togglePaymentOrder = (orderId: string) => setSelectedPaymentOrderIds(current => current.includes(orderId) ? current.filter(id => id !== orderId) : [...current, orderId])
  const toggleAllPaymentOrders = () => setSelectedPaymentOrderIds(current => selectedPayableOrders.length === payableOrders.length && payableOrders.length > 0 ? current.filter(id => !payableOrders.some(order => order.id === id)) : [...new Set([...current, ...payableOrders.map(order => order.id)])])

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

      {cancelledOrders.length > 0 && (
        <button
          type="button"
          onClick={() => setActiveTab('cancelled')}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left transition hover:bg-red-100 dark:border-red-900/60 dark:bg-red-500/10 dark:hover:bg-red-500/20"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-300"><AlertCircle size={18} /> มีบิลถูกยกเลิก {cancelledOrders.length} บิล — แจ้งลูกค้าและตรวจสอบเหตุผล</span>
          <span className="shrink-0 text-xs font-black text-red-600">ดูบิลยกเลิก</span>
        </button>
      )}

      <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]"><button onClick={() => setActiveTab('pending')} className={`rounded-2xl border p-4 text-left transition ${activeTab === 'pending' ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-100' : 'border-zinc-200 bg-white hover:border-amber-200 dark:border-zinc-800 dark:bg-zinc-900'}`}><span className="text-xs font-bold text-amber-600">{english ? 'Orders to accept' : 'ต้องรับออเดอร์'}</span><b className="mt-1 block text-2xl dark:text-white">{counts.pending}</b></button><button onClick={() => setActiveTab('preparing')} className={`rounded-2xl border p-4 text-left transition ${activeTab === 'preparing' ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100' : 'border-zinc-200 bg-white hover:border-indigo-200 dark:border-zinc-800 dark:bg-zinc-900'}`}><span className="text-xs font-bold text-indigo-600">{english ? 'Preparing' : 'กำลังทำ'}</span><b className="mt-1 block text-2xl dark:text-white">{counts.preparing}</b></button><button onClick={() => setActiveTab('ready')} className={`rounded-2xl border p-4 text-left transition ${activeTab === 'ready' ? 'border-purple-400 bg-purple-50 ring-2 ring-purple-100' : 'border-zinc-200 bg-white hover:border-purple-200 dark:border-zinc-800 dark:bg-zinc-900'}`}><span className="text-xs font-bold text-purple-600">{english ? 'Ready for pickup / delivery' : 'พร้อมส่ง / พร้อมรับ'}</span><b className="mt-1 block text-2xl dark:text-white">{counts.ready}</b></button><button onClick={() => qc.invalidateQueries({ queryKey: ['orders', store.id] })} className="grid size-14 place-items-center self-center rounded-2xl border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900" title={english ? 'Refresh orders' : 'รีเฟรชออเดอร์'}><RefreshCw size={18} className={query.isFetching ? 'animate-spin' : ''}/></button></div>

      <Panel>
        {/* Search Header */}
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
          <div className="relative w-full max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={english ? 'Search order number, customer, phone…' : 'ค้นหาเลขออเดอร์, ชื่อลูกค้า, เบอร์โทร...'}
              className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:ring-orange-500/20"
            />
          </div><div className="flex rounded-xl bg-zinc-100 p-1 text-xs font-bold dark:bg-zinc-800">{[['active',english?'To do':'งานที่ต้องทำ'],['all',english?'All':'ทั้งหมด'],['completed',english?'Completed':'สำเร็จ'],['cancelled',english?'Cancelled':'ยกเลิก']].map(([id,label]) => <button key={id} onClick={() => setActiveTab(id)} className={`rounded-lg px-3 py-2 transition ${activeTab === id ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white' : 'text-zinc-500'}`}>{label}</button>)}</div>
        </div>

        {selectedPayableOrders.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 bg-emerald-50 px-4 py-3 dark:border-emerald-900/50 dark:bg-emerald-500/10">
            <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">เลือก {selectedPayableOrders.length} บิล · ยอดรวม ฿{selectedPayableOrders.reduce((sum, order) => sum + Number(order.total || 0), 0).toLocaleString()}</span>
            <div className="flex items-center gap-2"><button type="button" onClick={() => setSelectedPaymentOrderIds([])} className="rounded-lg px-3 py-2 text-xs font-bold text-zinc-500 hover:bg-white/70">ยกเลิกเลือก</button><button type="button" onClick={() => openOrdersInPos(selectedPayableOrders.map(order => order.id))} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">ชำระ {selectedPayableOrders.length} บิลใน POS</button></div>
          </div>
        )}

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
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/70 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/50">
                  <th className="w-10 px-3 py-3.5"><input type="checkbox" checked={payableOrders.length > 0 && selectedPayableOrders.length === payableOrders.length} onChange={toggleAllPaymentOrders} className="size-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500" title="เลือกบิลที่ยังไม่ชำระทั้งหมด" /></th>
                  <th className="px-3 py-3.5">Order</th>
                  <th className="px-3 py-3.5">{english ? 'Channel / table' : 'ช่องทาง / โต๊ะ'}</th>
                  <th className="px-3 py-3.5 text-right">{english ? 'Total' : 'ยอดรวม'}</th>
                  <th className="px-3 py-3.5">Status</th>
                  <th className="px-3 py-3.5">{english ? 'Payment' : 'ชำระเงิน'}</th>
                  <th className="px-3 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs dark:divide-zinc-800">
                {filteredOrders.map((o: any) => {
                  const cust = parseCustomerInfo(o.customer_name, o.order_type, o.notes)
                  const st = { ...(statusConfig[o.status] || { label: o.status, bg: 'bg-zinc-100', text: 'text-zinc-600', border: 'border-zinc-200' }), label: statusLabels[o.status] || statusConfig[o.status]?.label || o.status }
                  const paymentStatus = getPaymentStatus(o)
                  const payment = { ...(paymentStatusConfig[paymentStatus] || paymentStatusConfig.unpaid), label: paymentLabels[paymentStatus] || paymentStatusConfig[paymentStatus]?.label || paymentStatus }
                  const canSelectForPayment = o.status !== 'cancelled' && paymentStatus !== 'paid'
                  const ch = { ...(channelConfig[o.order_type] || { label: o.order_type, icon: '📦', bg: 'bg-zinc-100 text-zinc-600' }), label: channelLabels[o.order_type] || channelConfig[o.order_type]?.label || o.order_type }
                  const next = o.status === 'pending' && o.order_type !== 'delivery' ? undefined : nextStep[o.status]

                  return (
                    <tr
                      key={o.id}
                      className={`transition ${selectedPaymentOrderIds.includes(o.id) ? 'bg-emerald-50/70 dark:bg-emerald-500/10' : 'hover:bg-orange-50/30 dark:hover:bg-zinc-800/60'}`}
                    >
                      <td className="px-3 py-3"><input type="checkbox" disabled={!canSelectForPayment} checked={selectedPaymentOrderIds.includes(o.id)} onChange={() => togglePaymentOrder(o.id)} className="size-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-30" title={canSelectForPayment ? 'เลือกเพื่อชำระรวม' : 'บิลนี้ไม่ต้องชำระหรือชำระแล้ว'} /></td>
                      <td className="px-3 py-3">
                        <span className="font-extrabold text-zinc-900 dark:text-white">
                          #{o.order_number}
                        </span>
                        <span className="mt-1 block text-[11px] text-zinc-400">{new Date(o.created_at).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
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

                      <td className="px-3 py-3">
                        <div>
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
                        </div>
                      </td>

                      <td className="px-3 py-3 text-right font-black text-zinc-900 dark:text-white">฿{Number(o.total || 0).toLocaleString()}</td>

                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${st.bg} ${st.text} ${st.border}`}>{st.label}</span>
                        {o.status === 'cancelled' && getCancellationReason(o.notes) && (
                          <p className="mt-1.5 max-w-[240px] text-xs font-semibold text-red-600 dark:text-red-400">เหตุผล: {getCancellationReason(o.notes)}</p>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {o.status === 'cancelled' ? (
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${payment.bg} ${payment.text} ${payment.border}`}>{payment.label}</span>
                        ) : paymentStatus === 'paid' ? (
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${payment.bg} ${payment.text} ${payment.border}`}>{payment.label}</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openOrderInPos(o.id)}
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold transition hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50 ${payment.bg} ${payment.text} ${payment.border}`}
                            title="เปิดบิลนี้ใน POS เพื่อรับชำระเงิน"
                          >
                            รับชำระเงิน
                          </button>
                        )}
                      </td>

                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">{next && <button disabled={update.isPending} onClick={() => handleUpdateStatus(o.id, next.status)} className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-orange-600 disabled:opacity-50">{next.label}</button>}<button onClick={() => setSelectedOrder(o)} className="inline-grid size-8 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-xs transition hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer" title="ดูรายละเอียดออเดอร์"><Eye size={15} /></button></div>
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
          storeId={store.id}
          menuItems={menuQuery.data || []}
          onEdited={() => {
            qc.invalidateQueries({ queryKey: ['orders', store.id] })
            setSelectedOrder(null)
          }}
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
  storeId,
  menuItems,
  onEdited,
  storeLocation
}: {
  order: any
  onClose: () => void
  onUpdateStatus: (status: string) => void
  isUpdating: boolean
  storeId: string
  menuItems: any[]
  onEdited: () => void
  storeLocation?: { lat: number; lng: number; name?: string }
}) {
  const cust = parseCustomerInfo(order.customer_name, order.order_type, order.notes)
  const st = statusConfig[order.status] || { label: order.status, bg: 'bg-zinc-100', text: 'text-zinc-600', border: 'border-zinc-200' }
  const ch = channelConfig[order.order_type] || { label: order.order_type, icon: '📦', bg: 'bg-zinc-100 text-zinc-600' }
  const canEdit = !['completed', 'cancelled'].includes(order.status)
  const [isEditing, setIsEditing] = useState(false)
  const [draftItems, setDraftItems] = useState<any[]>([])
  const [isMenuPickerOpen, setIsMenuPickerOpen] = useState(false)
  const [menuSearch, setMenuSearch] = useState('')
  const [menuCategory, setMenuCategory] = useState('all')
  const categories = Array.from(new Set(menuItems.map(item => item.category?.name || 'อื่น ๆ')))
  const filteredMenuItems = menuItems.filter(item => {
    const category = item.category?.name || 'อื่น ๆ'
    return (menuCategory === 'all' || category === menuCategory) && item.name.toLowerCase().includes(menuSearch.toLowerCase())
  })

  useEffect(() => {
    setDraftItems((order.store_order_items || []).map((item: any) => ({
      id: item.id,
      menuItemId: item.menu_item_id,
      name: item.name,
      price: Number(item.unit_price || 0),
      quantity: Number(item.quantity || 0),
      status: item.status || 'waiting',
      isNew: false
    })))
    setIsEditing(false)
  }, [order.id, order.store_order_items])

  const changeQuantity = (index: number, quantity: number) => {
    setDraftItems(items => items.flatMap((item, itemIndex) => {
      if (itemIndex !== index) return [item]
      if (quantity <= 0 && item.isNew) return []
      return [{ ...item, quantity: Math.max(0, quantity), status: quantity <= 0 ? 'cancelled' : 'waiting' }]
    }))
  }

  const addMenuItem = (menuItem: any) => {
    setDraftItems(items => {
      const currentIndex = items.findIndex(item => item.isNew && item.menuItemId === menuItem.id)
      if (currentIndex < 0) return [...items, { menuItemId: menuItem.id, name: menuItem.name, price: Number(menuItem.price || 0), quantity: 1, status: 'waiting', isNew: true }]
      return items.map((item, index) => index === currentIndex ? { ...item, quantity: item.quantity + 1 } : item)
    })
    setIsMenuPickerOpen(false)
    setMenuSearch('')
  }

  const saveEdits = useMutation({
    mutationFn: async () => {
      const existingItems = draftItems.filter(item => !item.isNew)
      const newItems = draftItems.filter(item => item.isNew && item.quantity > 0)

      await Promise.all(existingItems.map(async item => {
        const { error } = await supabase
          .from('store_order_items')
          .update({ quantity: item.quantity, status: item.status })
          .eq('store_id', storeId)
          .eq('id', item.id)
        if (error) throw error
      }))

      if (newItems.length) {
        const { error } = await supabase.from('store_order_items').insert(newItems.map(item => ({
          store_id: storeId,
          order_id: order.id,
          menu_item_id: item.menuItemId,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          status: 'waiting'
        })))
        if (error) throw error
      }

      const subtotal = draftItems
        .filter(item => item.status !== 'cancelled')
        .reduce((sum, item) => sum + item.quantity * item.price, 0)
      const tax = Number(order.tax || 0)
      const discount = Number(order.discount || 0)
      const { error } = await supabase
        .from('store_orders')
        .update({ subtotal, total: Math.max(0, subtotal + tax - discount), updated_at: new Date().toISOString() })
        .eq('store_id', storeId)
        .eq('id', order.id)
      if (error) throw error
    },
    onSuccess: onEdited,
    onError: error => alert((error as Error).message)
  })

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-zinc-950/60 p-4 backdrop-blur-sm"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div className="my-auto flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col rounded-[28px] bg-white shadow-2xl dark:bg-zinc-900">
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
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">ลูกค้า / โต๊ะที่สั่ง</p>
              <p className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-200">
                {order.store_tables?.table_number ? `โต๊ะ ${order.store_tables.table_number}` : 'ไม่มีโต๊ะ'} · {cust.name}
              </p>
              {cust.phone && <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400"><Phone size={12} /> {cust.phone}</p>}
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
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white">
                รายการอาหารที่สั่ง ({order.store_order_items?.length || 0} รายการ)
              </h3>
              {canEdit && !isEditing && <button onClick={() => openOrderInPos(order.id)} className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-600 transition hover:bg-orange-100"><Pencil size={14} /> แก้ไขบิลใน POS</button>}
            </div>

            {!isEditing && (!order.store_order_items || order.store_order_items.length === 0) ? (
              <p className="text-xs text-zinc-400 py-4 text-center">ไม่มีข้อมูลรายการอาหารในออเดอร์นี้</p>
            ) : isEditing ? (
              <div className="space-y-3">
                <p className="text-xs text-zinc-500">เพิ่มรายการใหม่ได้ทันที ส่วนรายการที่ลดเหลือ 0 จะถูกยกเลิกและไม่ส่งให้ครัวทำเพิ่ม</p>
                <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-100 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
                  {draftItems.map((item, index) => <div key={item.id || `${item.menuItemId}-${index}`} className={`flex items-center justify-between gap-3 p-3.5 ${item.status === 'cancelled' ? 'opacity-45' : ''}`}>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-zinc-900 dark:text-white">{item.name}</p><p className="mt-0.5 text-xs text-orange-500">฿{item.price.toLocaleString()} {item.isNew && '· เพิ่มใหม่'}</p>{item.status === 'cancelled' && <p className="mt-0.5 text-[11px] font-bold text-red-500">ยกเลิกรายการ</p>}</div>
                    <div className="flex items-center gap-2"><button onClick={() => changeQuantity(index, item.quantity - 1)} className="grid size-8 place-items-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50"><Minus size={14}/></button><span className="w-7 text-center text-sm font-black dark:text-white">{item.quantity}</span><button onClick={() => changeQuantity(index, item.quantity + 1)} className="grid size-8 place-items-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50"><Plus size={14}/></button></div>
                  </div>)}
                </div>
                <button onClick={() => setIsMenuPickerOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-orange-300 bg-orange-50/50 px-4 py-4 text-sm font-bold text-orange-600 transition hover:bg-orange-50"><Plus size={17}/> เพิ่มเมนูเข้าบิล</button>
                <div className="flex justify-end gap-2"><button onClick={() => setIsEditing(false)} className="rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-500 hover:bg-zinc-100">ยกเลิก</button><button disabled={saveEdits.isPending} onClick={() => saveEdits.mutate()} className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50"><Save size={14}/>{saveEdits.isPending ? 'กำลังบันทึก…' : 'บันทึกและส่งครัว'}</button></div>
              </div>
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
                { s: 'preparing', label: 'รับออเดอร์', icon: CheckCircle2, color: 'hover:border-indigo-500 hover:text-indigo-600' },
                { s: 'delivering', label: 'ไรเดอร์ออกส่ง', icon: Bike, color: 'hover:border-blue-500 hover:text-blue-600' },
                { s: 'ready', label: 'พร้อมเสิร์ฟ/ส่ง', icon: Utensils, color: 'hover:border-purple-500 hover:text-purple-600' },
                { s: 'completed', label: 'จัดส่งสำเร็จ', icon: CheckCircle2, color: 'hover:border-emerald-500 hover:text-emerald-600' },
                { s: 'cancelled', label: 'ยกเลิกออเดอร์', icon: AlertCircle, color: 'hover:border-red-500 hover:text-red-600' },
              ].filter(btn => btn.s !== 'cancelled' || (!['completed', 'cancelled'].includes(order.status) && order.payment_status !== 'paid')).map(btn => (
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

      {isMenuPickerOpen && (
        <div className="fixed inset-0 z-[80] flex bg-white dark:bg-zinc-900">
          <div className="flex h-full w-full flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-100 p-5 dark:border-zinc-800">
              <div><h3 className="text-lg font-black text-zinc-900 dark:text-white">เลือกเมนูเพิ่มในบิล</h3><p className="mt-1 text-xs text-zinc-400">ค้นหาหรือเลือกหมวดหมู่ แล้วกดเมนูที่ต้องการ</p></div>
              <button onClick={() => setIsMenuPickerOpen(false)} className="grid size-9 place-items-center rounded-xl text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X size={18}/></button>
            </div>
            <div className="border-b border-zinc-100 p-4 dark:border-zinc-800">
              <div className="relative"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"/><input autoFocus value={menuSearch} onChange={event => setMenuSearch(event.target.value)} placeholder="ค้นหาชื่อเมนู…" className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm outline-none focus:border-orange-400 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"/></div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1"><button onClick={() => setMenuCategory('all')} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${menuCategory === 'all' ? 'bg-orange-500 text-white' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}>ทั้งหมด</button>{categories.map(category => <button key={category} onClick={() => setMenuCategory(category)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${menuCategory === category ? 'bg-orange-500 text-white' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}>{category}</button>)}</div>
            </div>
            <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2">{filteredMenuItems.map(menuItem => <button key={menuItem.id} onClick={() => addMenuItem(menuItem)} className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 text-left transition hover:border-orange-400 hover:bg-orange-50 dark:border-zinc-700 dark:bg-zinc-800"><span className="min-w-0"><b className="block truncate text-sm text-zinc-900 dark:text-white">{menuItem.name}</b><span className="mt-1 block text-xs font-bold text-orange-500">฿{Number(menuItem.price || 0).toLocaleString()}</span></span><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-orange-100 text-orange-600"><Plus size={17}/></span></button>)}{!filteredMenuItems.length && <p className="col-span-full py-14 text-center text-sm text-zinc-400">ไม่พบเมนูที่ค้นหา</p>}</div>
          </div>
        </div>
      )}
    </div>
  )
}
