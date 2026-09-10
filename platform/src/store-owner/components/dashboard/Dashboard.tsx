import { useQueries } from '@tanstack/react-query'
import { CircleDollarSign, Clock3, ShoppingBag, UsersRound, UtensilsCrossed } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useStore } from '../../StoreContext'
import { Panel } from '../PageKit'
import { useLanguage } from '../../../lib/language'

const dayStart = (offset = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  d.setHours(0, 0, 0, 0)
  return d
}

const money = (value: number) => `฿${(Number(value) || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })}`

export default function Dashboard({ navigate }: { navigate: (path: string) => void }) {
  const { language } = useLanguage()
  const english = language === 'en'
  const copy = english ? {
    loading: 'Loading dashboard data…', overview: 'Daily store overview', kpis: ['Today’s sales', 'Today’s orders', 'Pending', 'Occupied tables', 'Today’s customers'],
    sales7: '7-day sales', total: 'Total', orderTypes: 'Today’s order types', topItems: 'Top 5 menu items', sold: 'sold', items: 'items', noSales: 'No sales data yet', recent: 'Recent orders', viewAll: 'View all', noOrders: 'No orders yet', orderLabels: ['Dine-in', 'Pickup', 'Delivery'], completed: 'Completed', pending: 'Pending', customer: 'Walk-in customer'
  } : {
    loading: 'กำลังโหลดข้อมูล Dashboard…', overview: 'ภาพรวมร้านประจำวันที่', kpis: ['ยอดขายวันนี้', 'ออเดอร์วันนี้', 'รอดำเนินการ', 'โต๊ะใช้งาน', 'ลูกค้าวันนี้'],
    sales7: 'ยอดขาย 7 วัน', total: 'รวม', orderTypes: 'ประเภทออเดอร์วันนี้', topItems: 'เมนูขายดี 5 อันดับ', sold: 'ขาย', items: 'รายการ', noSales: 'ยังไม่มีข้อมูลการขาย', recent: 'ออเดอร์ล่าสุด', viewAll: 'ดูทั้งหมด', noOrders: 'ยังไม่มีออเดอร์', orderLabels: ['ทานที่ร้าน', 'สั่งกลับบ้าน', 'เดลิเวอรี'], completed: 'สำเร็จแล้ว', pending: 'รอดำเนินการ', customer: 'ลูกค้าหน้าร้าน'
  }
  const { store } = useStore()
  const today = dayStart().toISOString()
  const tomorrow = dayStart(1).toISOString()
  const sevenDays = dayStart(-6).toISOString()

  const results = useQueries({
    queries: [
      {
        queryKey: ['dashboard', 'store_orders', store?.id],
        enabled: Boolean(store?.id),
        queryFn: async () => {
          const { data, error } = await supabase
            .from('store_orders')
            .select('id,order_number,total,status,order_type,customer_name,created_at')
            .eq('store_id', store.id)
            .gte('created_at', sevenDays)
            .lt('created_at', tomorrow)
            .order('created_at', { ascending: false })
          if (error) {
            console.warn('Dashboard orders query error:', error)
            return []
          }
          return data || []
        }
      },
      {
        queryKey: ['dashboard', 'store_order_items', store?.id],
        enabled: Boolean(store?.id),
        queryFn: async () => {
          const { data, error } = await supabase
            .from('store_order_items')
            .select('id,order_id,name,quantity,unit_price,created_at')
            .eq('store_id', store.id)
            .gte('created_at', sevenDays)
            .lt('created_at', tomorrow)
          if (error) {
            console.warn('Dashboard order items query error:', error)
            return []
          }
          return data || []
        }
      },
      {
        queryKey: ['dashboard', 'store_tables', store?.id],
        enabled: Boolean(store?.id),
        queryFn: async () => {
          const { data, error } = await supabase
            .from('store_tables')
            .select('id,status')
            .eq('store_id', store.id)
          if (error) return []
          return data || []
        }
      },
      {
        queryKey: ['dashboard', 'store_customers', store?.id],
        enabled: Boolean(store?.id),
        queryFn: async () => {
          const { data, error } = await supabase
            .from('store_customers')
            .select('id,created_at')
            .eq('store_id', store.id)
            .gte('created_at', today)
            .lt('created_at', tomorrow)
          if (error) return []
          return data || []
        }
      }
    ]
  })

  const loading = results.some(x => x.isLoading)
  const orders: any[] = results[0]?.data || []
  const items: any[] = results[1]?.data || []
  const tables: any[] = results[2]?.data || []
  const customers: any[] = results[3]?.data || []

  const todayOrders = orders.filter(x => (x.created_at || '') >= today)
  const completedToday = todayOrders.filter(x => x.status === 'completed')
  const revenue = completedToday.reduce((sum, x) => sum + Number(x.total || 0), 0)
  const pending = todayOrders.filter(x => ['pending', 'accepted', 'preparing', 'ready'].includes(x.status)).length
  const occupied = tables.filter(x => x.status === 'occupied').length
  const completedIds = new Set(orders.filter(x => x.status === 'completed').map(x => x.id))

  const topMap = new Map<string, { name: string; quantity: number; revenue: number }>()
  items.filter(x => completedIds.has(x.order_id)).forEach(x => {
    const keyName = x.name || 'เมนู'
    const old = topMap.get(keyName) || { name: keyName, quantity: 0, revenue: 0 }
    old.quantity += Number(x.quantity || 0)
    old.revenue += Number(x.quantity || 0) * Number(x.unit_price || 0)
    topMap.set(keyName, old)
  })
  const topItems = [...topMap.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5)

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = dayStart(index - 6)
    const key = date.toISOString().slice(0, 10)
    const value = orders
      .filter(x => x.status === 'completed' && (x.created_at || '').slice(0, 10) === key)
      .reduce((sum, x) => sum + Number(x.total || 0), 0)
    return { label: date.toLocaleDateString(english ? 'en-US' : 'th-TH', { weekday: 'short' }), value }
  })
  const maxRevenue = Math.max(...days.map(x => x.value), 1)

  const orderTypes = [
    [copy.orderLabels[0], 'dine_in', 'bg-orange-500'],
    [copy.orderLabels[1], 'takeaway', 'bg-amber-400'],
    [copy.orderLabels[2], 'delivery', 'bg-orange-200']
  ].map(([label, key, color]) => ({
    label,
    key,
    color,
    count: todayOrders.filter(x => x.order_type === key).length
  }))
  const totalTypes = Math.max(orderTypes.reduce((sum, x) => sum + x.count, 0), 1)

  const kpis = [
    [CircleDollarSign, copy.kpis[0], money(revenue)],
    [ShoppingBag, copy.kpis[1], todayOrders.length],
    [Clock3, copy.kpis[2], pending],
    [UtensilsCrossed, copy.kpis[3], `${occupied} / ${tables.length}`],
    [UsersRound, copy.kpis[4], customers.length]
  ]

  if (loading) {
    return <div className="grid min-h-[60vh] place-items-center text-sm font-bold text-zinc-400">{copy.loading}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-orange-500">STORE DASHBOARD</p>
        <h1 className="mt-1 text-3xl font-black dark:text-white">{store?.name || 'ร้านค้า'}</h1>
        <p className="text-sm text-zinc-400">{copy.overview} {new Date().toLocaleDateString(english ? 'en-US' : 'th-TH', { dateStyle: 'long' })}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {kpis.map(([Icon, label, value]: any) => (
          <Panel key={label} className="p-4">
            <span className="grid size-9 place-items-center rounded-xl bg-orange-50 text-orange-500 dark:bg-orange-500/10">
              <Icon size={18} />
            </span>
            <b className="mt-4 block text-xl dark:text-white">{value}</b>
            <p className="mt-1 text-[11px] text-zinc-400">{label}</p>
          </Panel>
        ))}
      </div>

      {/* 7 Days Revenue & Order Types */}
      <div className="grid gap-5 xl:grid-cols-[1.45fr_.75fr]">
        <Panel className="p-5">
          <div>
            <h2 className="font-black dark:text-white">{copy.sales7}</h2>
            <p className="text-xs text-zinc-400">{copy.total} {money(days.reduce((s, x) => s + x.value, 0))}</p>
          </div>
          <div className="mt-7 flex h-56 items-end gap-3">
            {days.map(x => (
              <div key={x.label} className="flex h-full flex-1 flex-col justify-end gap-2">
                <span className="text-center text-[9px] font-bold text-zinc-400">{x.value ? money(x.value) : ''}</span>
                <div
                  className="min-h-1 rounded-t-lg bg-orange-500 transition hover:brightness-90"
                  style={{ height: `${Math.max(2, (x.value / maxRevenue) * 100)}%` }}
                />
                <span className="text-center text-[10px] text-zinc-400">{x.label}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="font-black dark:text-white">{copy.orderTypes}</h2>
          <div className="my-7 flex h-4 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            {orderTypes.map(x => (
              <div key={x.key} className={x.color} style={{ width: `${(x.count / totalTypes) * 100}%` }} />
            ))}
          </div>
          <div className="space-y-4">
            {orderTypes.map(x => (
              <div key={x.key} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-zinc-500">
                  <i className={`size-2.5 rounded-full ${x.color}`} />
                  {x.label}
                </span>
                <div className="text-right">
                  <b className="dark:text-white">{x.count}</b>
                  <span className="ml-2 text-xs text-zinc-400">{Math.round((x.count / totalTypes) * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Top 5 Items & Recent Orders */}
      <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <Panel>
          <div className="border-b p-5 dark:border-zinc-800">
            <h2 className="font-black dark:text-white">{copy.topItems}</h2>
          </div>
          {topItems.map((x, index) => (
            <div key={x.name} className="flex items-center gap-3 border-b px-5 py-3 last:border-0 dark:border-zinc-800">
              <span className="grid size-8 place-items-center rounded-lg bg-orange-50 text-xs font-black text-orange-600 dark:bg-orange-500/10">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <b className="block truncate text-sm dark:text-white">{x.name}</b>
                <span className="text-xs text-zinc-400">{copy.sold} {x.quantity} {copy.items}</span>
              </div>
              <b className="text-sm dark:text-white">{money(x.revenue)}</b>
            </div>
          ))}
          {!topItems.length && <p className="p-8 text-center text-sm text-zinc-400">{copy.noSales}</p>}
        </Panel>

        <Panel>
          <div className="flex justify-between border-b p-5 dark:border-zinc-800">
            <h2 className="font-black dark:text-white">{copy.recent}</h2>
            <button onClick={() => navigate('orders')} className="text-xs font-bold text-orange-500 hover:underline">
              {copy.viewAll}
            </button>
          </div>
          {orders.slice(0, 6).map(x => (
            <div key={x.id} className="flex items-center justify-between border-b px-5 py-3 last:border-0 dark:border-zinc-800">
              <div>
                <b className="text-sm dark:text-white">#{x.order_number || x.id?.slice(0, 6)}</b>
                <p className="text-xs text-zinc-400">
                  {x.customer_name || copy.customer} · {String(x.order_type || 'dine_in').replace('_', ' ')}
                </p>
              </div>
              <div className="text-right">
                <b className="text-sm dark:text-white">{money(Number(x.total || 0))}</b>
                <p className="text-[10px] capitalize text-zinc-400">{x.status === 'completed' ? copy.completed : copy.pending}</p>
              </div>
            </div>
          ))}
          {!orders.length && <p className="p-8 text-center text-sm text-zinc-400">{copy.noOrders}</p>}
        </Panel>
      </div>
    </div>
  )
}
