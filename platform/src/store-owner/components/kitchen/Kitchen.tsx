import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bell,
  BellOff,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  Clock3,
  Flame,
  Maximize2,
  Minimize2,
  PackageCheck,
  RefreshCw,
  Search,
  ShoppingBag,
  Sparkles,
  Utensils,
  Volume2,
  VolumeX
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useLanguage } from '../../../lib/language'
import { useStore } from '../../StoreContext'
import { PageHeader } from '../PageKit'

// Play chime sound using Web Audio API
function playChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    
    // Note 1 (High tone)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
    gain1.gain.setValueAtTime(0.15, ctx.currentTime)
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start()
    osc1.stop(ctx.currentTime + 0.5)

    // Note 2 (Higher tone)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.15) // A5
    gain2.gain.setValueAtTime(0.18, ctx.currentTime + 0.15)
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(ctx.currentTime + 0.15)
    osc2.stop(ctx.currentTime + 0.7)
  } catch {
    // Audio might be blocked by browser policy until user interacts
  }
}

function parseCustomerInfo(rawName: string | null | undefined, orderType: string) {
  if (!rawName || rawName === 'Walk-in') {
    return { name: 'Walk-in Customer', phone: '', location: '' }
  }

  if (rawName.includes('|')) {
    const parts = rawName.split('|').map(s => s.trim())
    return {
      name: parts[0] || 'Customer',
      phone: parts[1] || '',
      location: parts.slice(2).join(' ') || ''
    }
  }

  if (rawName === 'สั่งกลับบ้าน' || rawName.toLowerCase() === 'takeaway') {
    return { name: 'สั่งกลับบ้าน (Takeaway)', phone: '', location: '' }
  }

  if (rawName.startsWith('โต๊ะ')) {
    return { name: `ลูกค้า ${rawName}`, phone: '', location: '' }
  }

  return { name: rawName, phone: '', location: '' }
}

function formatElapsed(createdAtStr: string, now: Date, english: boolean) {
  if (!createdAtStr) return '00:00'
  const created = new Date(createdAtStr).getTime()
  const diffMs = Math.max(0, now.getTime() - created)
  const totalSec = Math.floor(diffMs / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  
  if (min >= 60) {
    const hr = Math.floor(min / 60)
    const remainMin = min % 60
    return english ? `${hr}h ${remainMin}m` : `${hr}ชม. ${remainMin}น.`
  }
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

function getElapsedMinutes(createdAtStr: string, now: Date) {
  if (!createdAtStr) return 0
  const created = new Date(createdAtStr).getTime()
  return Math.max(0, (now.getTime() - created) / 60000)
}

interface ColumnConfig {
  id: string
  title: string
  subtitle: string
  color: string
  headerBg: string
  badgeBg: string
  badgeText: string
  statuses: string[]
  actionLabel?: string
  actionNext?: string
  prevStatus?: string
  icon: any
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'preparing',
    title: 'กำลังปรุง',
    subtitle: 'เชฟกำลังทำในครัว',
    color: 'border-t-indigo-500',
    headerBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    badgeBg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
    badgeText: 'text-indigo-600 dark:text-indigo-400',
    statuses: ['accepted', 'preparing'],
    actionLabel: 'ปรุงเสร็จแล้ว',
    actionNext: 'ready',
    icon: Flame
  },
  {
    id: 'ready',
    title: 'พร้อมเสิร์ฟ / จัดส่ง',
    subtitle: 'รอพนักงานเสิร์ฟหรือไรเดอร์',
    color: 'border-t-purple-500',
    headerBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    badgeBg: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
    badgeText: 'text-purple-600 dark:text-purple-400',
    statuses: ['ready'],
    actionLabel: 'ส่งมอบเรียบร้อย',
    actionNext: 'completed',
    prevStatus: 'preparing',
    icon: PackageCheck
  },
  {
    id: 'completed',
    title: 'เสร็จสิ้นล่าสุด',
    subtitle: 'ประวัติออเดอร์ที่เสร็จแล้ว',
    color: 'border-t-emerald-500',
    headerBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    badgeText: 'text-emerald-600 dark:text-emerald-400',
    statuses: ['completed'],
    prevStatus: 'ready',
    icon: CheckCircle2
  }
]

export default function Kitchen() {
  const { store } = useStore()
  const { language } = useLanguage()
  const english = language === 'en'
  const qc = useQueryClient()
  const [now, setNow] = useState(() => new Date())
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'dine_in' | 'takeaway' | 'delivery'>('all')
  const [search, setSearch] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [cancelOrder, setCancelOrder] = useState<any | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const lastOrderCountRef = useRef<number>(0)

  // Realtime clock tick every 5 seconds for elapsed times
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  // Query live orders for this store
  const { data: orders = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['kitchen-orders', store.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_orders')
        .select('*, store_tables(table_number), store_order_items(*)')
        .eq('store_id', store.id)
        .in('status', ['pending', 'accepted', 'preparing', 'ready', 'completed'])
        .order('created_at', { ascending: true })
        .limit(120)

      if (error) throw error
      return (data || []).filter((order: any) => {
        const number = String(order.order_number || '').toUpperCase()
        const notes = String(order.notes || '')
        return !number.startsWith('SRV') && !number.startsWith('BILL') && order.order_type !== 'service_request' && !notes.includes('เรียกพนักงาน') && !notes.includes('เรียกเก็บเงิน')
      })
    },
    refetchInterval: 15000 // Polling fallback every 15s
  })

  // Realtime subscription via Supabase channel
  useEffect(() => {
    if (!store?.id) return
    const channel = supabase
      .channel(`kitchen-orders:${store.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_orders', filter: `store_id=eq.${store.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ['kitchen-orders', store.id] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_order_items', filter: `store_id=eq.${store.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ['kitchen-orders', store.id] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [store.id, qc])

  // Play audio chime when new pending orders are detected
  useEffect(() => {
    const pendingOrders = orders.filter((o: any) => o.status === 'pending')
    if (lastOrderCountRef.current > 0 && pendingOrders.length > lastOrderCountRef.current) {
      if (soundEnabled) {
        playChime()
      }
    }
    lastOrderCountRef.current = pendingOrders.length
  }, [orders, soundEnabled])

  // Update order status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('store_orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('store_id', store.id)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kitchen-orders', store.id] })
      qc.invalidateQueries({ queryKey: ['orders', store.id] })
    }
  })

  const cancelOrderMutation = useMutation({
    mutationFn: async () => {
      if (!cancelOrder) throw new Error('ไม่พบออเดอร์ที่ต้องการยกเลิก')
      if (!cancelReason.trim()) throw new Error('กรุณาระบุเหตุผลที่ยกเลิก')
      const currentNotes = String(cancelOrder.notes || '').trim()
      const notes = `${currentNotes}${currentNotes ? '\n' : ''}[ยกเลิกโดยร้าน] ${cancelReason.trim()}`
      let { error } = await supabase
        .from('store_orders')
        .update({ status: 'cancelled', payment_status: 'not_required', notes, updated_at: new Date().toISOString() })
        .eq('store_id', store.id)
        .eq('id', cancelOrder.id)
      if (error?.message?.includes('payment_status')) {
        const fallback = await supabase
          .from('store_orders')
          .update({ status: 'cancelled', notes, updated_at: new Date().toISOString() })
          .eq('store_id', store.id)
          .eq('id', cancelOrder.id)
        error = fallback.error
      }
      if (error) throw error
    },
    onSuccess: () => {
      setCancelOrder(null)
      setCancelReason('')
      qc.invalidateQueries({ queryKey: ['kitchen-orders', store.id] })
      qc.invalidateQueries({ queryKey: ['orders', store.id] })
    },
    onError: error => alert((error as Error).message)
  })

  const toggleItemChecked = (itemId: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o: any) => {
      // Type filter
      if (filterType !== 'all' && o.order_type !== filterType) {
        return false
      }
      // Search filter
      if (search.trim()) {
        const queryStr = search.toLowerCase()
        const cust = parseCustomerInfo(o.customer_name, o.order_type)
        const itemsText = (o.store_order_items || []).map((it: any) => it.name).join(' ')
        const match =
          (o.order_number || '').toLowerCase().includes(queryStr) ||
          cust.name.toLowerCase().includes(queryStr) ||
          (o.store_tables?.table_number || '').toLowerCase().includes(queryStr) ||
          itemsText.toLowerCase().includes(queryStr)
        if (!match) return false
      }
      return true
    })
  }, [orders, filterType, search])

  // Active tickets count (excluding completed)
  const activeCount = orders.filter((o: any) => ['pending', 'accepted', 'preparing', 'ready'].includes(o.status)).length
  const columns = COLUMNS.map(column => ({
    ...column,
    title: english
      ? ({ preparing: 'Preparing', ready: 'Ready to serve / deliver', completed: 'Recently completed' }[column.id] || column.title)
      : column.title,
    subtitle: english
      ? ({ preparing: 'Chef is preparing', ready: 'Waiting for staff or rider', completed: 'Completed order history' }[column.id] || column.subtitle)
      : column.subtitle,
    actionLabel: english
      ? ({ preparing: 'Ready to serve', ready: 'Delivered successfully' }[column.id] || column.actionLabel)
      : column.actionLabel
  }))

  return (
    <div ref={containerRef} className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 overflow-y-auto bg-zinc-950 p-6 text-white' : ''}`}>
      {/* Top Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <PageHeader
          eyebrow="Kitchen Display System (KDS)"
          title={english ? 'Kitchen display' : 'หน้าจอห้องครัว'}
          description={english ? `Live customer orders · ${activeCount} active orders` : `เชื่อมต่อออเดอร์ลูกค้าแบบเรียลไทม์ · มีทั้งหมด ${activeCount} ออเดอร์ที่กำลังดำเนินการ`}
        />

        {/* Toolbar controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sound alert toggle */}
          <button
            type="button"
            onClick={() => {
              const nextVal = !soundEnabled
              setSoundEnabled(nextVal)
              if (nextVal) playChime()
            }}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition border ${
              soundEnabled
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                : 'bg-white border-zinc-200 text-zinc-400 dark:bg-zinc-900 dark:border-zinc-800'
            }`}
            title={soundEnabled ? (english ? 'Disable sound alerts' : 'ปิดเสียงเตือน') : (english ? 'Enable sound alerts for new orders' : 'เปิดเสียงเตือนเมื่อมีออเดอร์ใหม่')}
          >
            {soundEnabled ? <Volume2 size={16} className="text-amber-500 animate-pulse" /> : <VolumeX size={16} />}
            <span>{soundEnabled ? (english ? 'Sound alerts on' : 'เปิดเสียงเตือน') : (english ? 'Sound alerts off' : 'ปิดเสียงเตือน')}</span>
          </button>

          {/* Fullscreen toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            <span>{isFullscreen ? (english ? 'Exit fullscreen' : 'ย่อหน้าจอ') : (english ? 'Fullscreen (KDS)' : 'เต็มหน้าจอ (KDS)')}</span>
          </button>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="grid size-9 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            title={english ? 'Refresh data' : 'รีเฟรชข้อมูล'}
          >
            <RefreshCw size={15} className={isFetching ? 'animate-spin text-orange-500' : ''} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Channel Filters */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800">
          {[
            { key: 'all', label: english ? 'All' : 'ทั้งหมด' },
            { key: 'dine_in', label: english ? '🍽️ Dine-in' : '🍽️ ทานที่ร้าน' },
            { key: 'takeaway', label: english ? '🛍️ Takeaway' : '🛍️ สั่งกลับบ้าน' },
            { key: 'delivery', label: english ? '🛵 Delivery' : '🛵 เดลิเวอรี' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterType(tab.key as any)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                filterType === tab.key
                  ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px] max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={english ? 'Search order, table, item…' : 'ค้นหาเลขออเดอร์, โต๊ะ, รายการอาหาร...'}
            className="h-9 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-xs outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:ring-orange-500/20"
          />
        </div>
      </div>

      {/* Kanban Board Columns */}
      {isLoading ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/50 p-12 dark:border-zinc-800 dark:bg-zinc-900/20">
          <ChefHat size={40} className="animate-bounce text-orange-500" />
          <p className="mt-3 text-sm font-bold text-zinc-500 dark:text-zinc-400">{english ? 'Connecting to kitchen orders…' : 'กำลังเชื่อมต่อข้อมูลครัว...'}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 items-start">
          {columns.map(col => {
            const colOrders = filteredOrders.filter((o: any) => col.statuses.includes(o.status))
            const sortedOrders = col.id === 'completed'
              ? [...colOrders].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 15)
              : [...colOrders].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

            const Icon = col.icon

            return (
              <section
                key={col.id}
                className={`flex flex-col rounded-3xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/40 ${col.color} border-t-4 min-h-[500px]`}
              >
                {/* Column Header */}
                <div className="mb-3.5 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className={`grid size-7 place-items-center rounded-lg ${col.headerBg}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <h2 className="text-sm font-black tracking-tight text-zinc-900 dark:text-white">
                        {col.title}
                      </h2>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{col.subtitle}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${col.badgeBg}`}>
                    {colOrders.length}
                  </span>
                </div>

                {/* Tickets list */}
                <div className="flex-1 space-y-3">
                  {sortedOrders.length === 0 ? (
                    <div className="flex min-h-[140px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200/80 p-6 text-center dark:border-zinc-800">
                      <p className="text-xs font-bold text-zinc-400 dark:text-zinc-600">{english ? 'No orders in this status' : 'ไม่มีออเดอร์ในสถานะนี้'}</p>
                    </div>
                  ) : (
                    sortedOrders.map((order: any) => {
                      const cust = parseCustomerInfo(order.customer_name, order.order_type)
                      const elapsedMin = getElapsedMinutes(order.created_at, now)
                      const elapsedStr = formatElapsed(order.created_at, now, english)
                      const isUrgent = col.id !== 'completed' && elapsedMin > 15
                      const isCritical = col.id !== 'completed' && elapsedMin > 30
                      const items = (order.store_order_items || []).filter((item: any) => item.status !== 'cancelled')
                      const tableNum = order.store_tables?.table_number

                      // Order channel badge
                      const isDineIn = order.order_type === 'dine_in'
                      const isTakeaway = order.order_type === 'takeaway'
                      const isDelivery = order.order_type === 'delivery'

                      return (
                        <article
                          key={order.id}
                          className={`group relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md dark:bg-zinc-900 ${
                            isCritical
                              ? 'border-red-400 ring-2 ring-red-400/20 dark:border-red-500/50'
                              : isUrgent
                              ? 'border-amber-300 ring-2 ring-amber-300/20 dark:border-amber-500/40'
                              : 'border-zinc-200/90 dark:border-zinc-800'
                          }`}
                        >
                          {/* Top Ticket Row */}
                          <div className="flex items-start justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <b className="text-sm font-black text-zinc-900 dark:text-white">
                                  #{order.order_number || order.id.slice(0, 5)}
                                </b>
                                {order.status === 'pending' && (
                                  <span className="inline-flex items-center rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-black text-white animate-pulse">
                                    NEW
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 flex items-center gap-1 text-xs">
                                {isDineIn ? (
                                  <span className="font-bold text-orange-600 dark:text-orange-400">
                                    🍽️ {tableNum ? (english ? `Table ${tableNum}` : `โต๊ะ ${tableNum}`) : cust.name}
                                  </span>
                                ) : isTakeaway ? (
                                  <span className="font-bold text-blue-600 dark:text-blue-400">
                                    🛍️ {english ? 'Takeaway' : 'สั่งกลับบ้าน'}
                                  </span>
                                ) : isDelivery ? (
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                    🛵 {english ? 'Delivery' : 'เดลิเวอรี'}
                                  </span>
                                ) : (
                                  <span className="font-bold text-zinc-600 dark:text-zinc-400">
                                    {cust.name}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Elapsed Timer */}
                            <div
                              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-black ${
                                col.id === 'completed'
                                  ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                                  : isCritical
                                  ? 'bg-red-500 text-white animate-pulse'
                                  : isUrgent
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                                  : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                              }`}
                              title={`${english ? 'Ordered at' : 'สั่งเมื่อ'}: ${new Date(order.created_at).toLocaleTimeString(english ? 'en-US' : 'th-TH')}`}
                            >
                              <Clock3 size={12} />
                              <span>{elapsedStr}</span>
                            </div>
                          </div>

                          {/* Customer note on overall order */}
                          {order.notes && (
                            <div className="my-2.5 rounded-xl bg-amber-50/80 p-2 text-xs font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300 border border-amber-200/60 dark:border-amber-500/20 flex items-start gap-1.5">
                              <AlertCircle size={13} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                              <span className="line-clamp-2">{english ? 'Note' : 'โน้ต'}: {order.notes}</span>
                            </div>
                          )}

                          {/* Menu Items List */}
                          <div className="my-3 space-y-2">
                            {items.length === 0 ? (
                              <p className="text-xs italic text-zinc-400">{english ? 'No menu items' : 'ไม่มีรายการอาหาร'}</p>
                            ) : (
                              items.map((item: any) => {
                                const isChecked = !!checkedItems[item.id]
                                return (
                                  <div
                                    key={item.id}
                                    onClick={() => toggleItemChecked(item.id)}
                                    className={`group/item flex cursor-pointer items-start justify-between gap-2 rounded-xl p-1.5 transition ${
                                      isChecked
                                        ? 'bg-zinc-100/70 text-zinc-400 line-through dark:bg-zinc-800/40 dark:text-zinc-500'
                                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200'
                                    }`}
                                  >
                                    <div className="flex items-start gap-2 min-w-0">
                                      <span
                                        className={`grid size-4 shrink-0 place-items-center rounded-md border mt-0.5 transition ${
                                          isChecked
                                            ? 'border-emerald-500 bg-emerald-500 text-white'
                                            : 'border-zinc-300 bg-white group-hover/item:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800'
                                        }`}
                                      >
                                        {isChecked && <Check size={10} strokeWidth={3} />}
                                      </span>
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold leading-tight">
                                          <span className="text-orange-600 dark:text-orange-400 mr-1">
                                            {item.quantity}×
                                          </span>
                                          {item.name}
                                        </p>
                                        {(item.notes || item.note) && (
                                          <p className="mt-0.5 text-[11px] font-semibold text-rose-500 dark:text-rose-400">
                                            ⚠️ {item.notes || item.note}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="mt-3 flex items-center gap-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                            {/* Move Back / Previous Step Button */}
                            {col.prevStatus && (
                              <button
                                type="button"
                                disabled={updateStatus.isPending}
                                onClick={() => updateStatus.mutate({ id: order.id, status: col.prevStatus! })}
                                className="grid size-8 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                                title={english ? 'Move to previous status' : 'ย้อนกลับสถานะก่อนหน้า'}
                              >
                                <ArrowLeft size={13} />
                              </button>
                            )}

                            {/* Move Forward Next Step Button */}
                            {col.actionNext && (
                              <button
                                type="button"
                                disabled={updateStatus.isPending}
                                onClick={() => updateStatus.mutate({ id: order.id, status: col.actionNext! })}
                                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-black shadow-sm transition active:scale-[0.98] ${
                                  col.id === 'pending'
                                    ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20'
                                    : col.id === 'preparing'
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20'
                                }`}
                              >
                                <span>{col.actionLabel}</span>
                                <ArrowRight size={13} />
                              </button>
                            )}

                            {col.id !== 'completed' && (
                              <button
                                type="button"
                                disabled={cancelOrderMutation.isPending}
                                onClick={() => { setCancelOrder(order); setCancelReason('') }}
                                className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                              >
                                {english ? 'Cancel' : 'ยกเลิก'}
                              </button>
                            )}

                            {col.id === 'completed' && (
                              <div className="flex flex-1 items-center justify-center gap-1 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 size={14} />
                                <span>{english ? 'Delivered successfully' : 'ส่งมอบสำเร็จแล้ว'}</span>
                              </div>
                            )}
                          </div>
                        </article>
                      )
                    })
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {cancelOrder && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-zinc-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
            <h2 className="text-lg font-black text-zinc-900 dark:text-white">{english ? 'Cancel order' : 'ยกเลิกออเดอร์'} #{cancelOrder.order_number}</h2>
            <p className="mt-1 text-sm text-zinc-500">{english ? 'Add a reason to notify the team and save it in the order history.' : 'ระบุเหตุผลเพื่อแจ้งทีมงานและเก็บไว้ในประวัติออเดอร์'}</p>
            <textarea value={cancelReason} onChange={event => setCancelReason(event.target.value)} autoFocus rows={4} placeholder={english ? 'For example: ingredient unavailable / customer requested cancellation' : 'เช่น วัตถุดิบหมด / ลูกค้าขอยกเลิก'} className="mt-4 w-full resize-none rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm outline-none focus:border-red-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
            <div className="mt-4 flex justify-end gap-2"><button onClick={() => setCancelOrder(null)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-zinc-500 hover:bg-zinc-100">{english ? 'Back' : 'กลับ'}</button><button disabled={cancelOrderMutation.isPending || !cancelReason.trim()} onClick={() => cancelOrderMutation.mutate()} className="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50">{cancelOrderMutation.isPending ? (english ? 'Cancelling…' : 'กำลังยกเลิก…') : (english ? 'Confirm cancellation' : 'ยืนยันยกเลิก')}</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
