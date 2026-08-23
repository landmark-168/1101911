import { lazy, Suspense, useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BarChart3, Bell, Boxes, ChefHat, ChevronDown, CircleDollarSign, ClipboardList, Gift,
  LayoutDashboard, Menu as MenuIcon, Moon, PanelLeftClose, Search, Settings, ShoppingBag,
  Store, Sun, Tags, Users, Utensils, X, AlertTriangle, CreditCard
} from 'lucide-react'
import Dashboard from './components/dashboard/Dashboard'
import Orders from './components/orders/Orders'
import POS from './components/pos/POS'
import Kitchen from './components/kitchen/Kitchen'
import ManagementPage from './components/management/ManagementPage'
import Reports from './components/reports/Reports'
import StoreSettings from './components/settings/Settings'
import { StoreProvider, useStore } from './StoreContext'
import { fetchCurrentUserSummary } from '../lib/database'
import { supabase } from '../lib/supabase'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1
    }
  }
})

const nav = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['orders', 'Orders', ClipboardList],
  ['pos', 'POS', CircleDollarSign],
  ['menu', 'Menu', Utensils],
  ['categories', 'Categories', Tags],
  ['tables', 'Tables', Store],
  ['kitchen', 'Kitchen', ChefHat],
  ['inventory', 'Inventory', Boxes],
  ['promotions', 'Promotions', Gift],
  ['customers', 'Customers', Users],
  ['employees', 'Employees', Users],
  ['reports', 'Reports', BarChart3],
  ['settings', 'Store Settings', Settings]
] as const

function SubscriptionExpiredWall() {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-6">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden">
        <div className="bg-red-500 px-8 py-10 text-center text-white">
          <AlertTriangle size={48} className="mx-auto mb-4 opacity-90" />
          <h2 className="text-2xl font-black">Subscription หมดอายุแล้ว</h2>
          <p className="mt-2 text-sm text-red-100">การใช้งานระบบจัดการร้านถูกระงับชั่วคราว</p>
        </div>
        <div className="p-8 space-y-4">
          <p className="text-sm text-zinc-600 text-center leading-6">
            กรุณาต่ออายุแพ็กเกจเพื่อกลับมาใช้งาน<br />
            ข้อมูลร้านของคุณยังคงอยู่ครบถ้วน
          </p>
          <button
            onClick={() => window.location.href = '/pricing'}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-4 text-base font-black text-white shadow-lg hover:bg-orange-600 transition"
          >
            <CreditCard size={20} /> ต่ออายุแพ็กเกจ
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="block w-full text-center py-3 text-sm font-semibold text-zinc-400 hover:text-zinc-600"
          >
            กลับหน้าแรก
          </button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const { store } = useStore()
  const qc = useQueryClient()
  const themeColor = (store as any)?.theme_color || '#F97316'
  const getPathSegments = () => {
    if (typeof window === 'undefined') return { slug: 'demo', key: 'dashboard' }
    const parts = window.location.pathname.split('/')
    return {
      slug: decodeURIComponent(parts[2] || 'demo'),
      key: parts[3] || 'dashboard'
    }
  }

  const { slug, key } = getPathSegments()
  const [active, setActive] = useState(key)
  const [mobile, setMobile] = useState(false)
  const [dark, setDark] = useState(() => (typeof window !== 'undefined' && localStorage.getItem('store-theme') === 'dark'))
  const [subStatus, setSubStatus] = useState<'loading' | 'ok' | 'expired'>('loading')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('store-theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    fetchCurrentUserSummary().then((u: any) => {
      const isExpired = u?.subscription?.ends_at ? (new Date(u.subscription.ends_at).getTime() <= Date.now()) : false
      const valid = u?.subscription && ['active', 'trialing'].includes(u.subscription.status) && !isExpired
      setSubStatus(valid ? 'ok' : 'expired')
    }).catch(() => setSubStatus('ok'))
  }, [])

  const go = (x: string) => {
    window.history.pushState({}, '', `/store/${encodeURIComponent(slug)}/${x === 'dashboard' ? '' : x}`)
    setActive(x)
    setMobile(false)
  }

  useEffect(() => {
    const p = () => {
      const parts = window.location.pathname.split('/')
      setActive(parts[3] || 'dashboard')
    }
    window.addEventListener('popstate', p)
    return () => window.removeEventListener('popstate', p)
  }, [])

  // Global Bill Calls Query
  const { data: billCalls = [] } = useQuery({
    queryKey: ['global-bill-calls', store?.id],
    enabled: Boolean(store?.id),
    queryFn: async () => {
      if (!store?.id) return []
      const { data } = await supabase
        .from('store_orders')
        .select('id, table_id, order_number, customer_name, notes, status, created_at, store_tables(table_number)')
        .eq('store_id', store.id)
        .neq('status', 'completed')
        .neq('status', 'cancelled')
      return (data || []).filter((o: any) => {
        const num = String(o.order_number || '').toUpperCase()
        const name = String(o.customer_name || '').toLowerCase()
        const notes = String(o.notes || '').toLowerCase()
        return num.startsWith('BILL') || name.includes('เรียกเก็บเงิน') || name.includes('เช็คบิล') || notes.includes('เรียกเก็บเงิน') || notes.includes('เช็คบิล')
      })
    },
    refetchInterval: 6000
  })

  // Realtime listener for global bill calls
  useEffect(() => {
    if (!store?.id) return
    const channel = supabase
      .channel(`store-global-orders:${store.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_orders', filter: `store_id=eq.${store.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ['global-bill-calls', store.id] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [store?.id, qc])

  let page: any = <Dashboard navigate={go} />
  if (active === 'orders') page = <Orders />
  else if (active === 'pos') page = <POS />
  else if (active === 'kitchen') page = <Kitchen />
  else if (active === 'reports') page = <Reports />
  else if (active === 'settings') page = <StoreSettings />
  else if (['menu', 'categories', 'tables', 'inventory', 'promotions', 'customers', 'employees'].includes(active)) {
    page = <ManagementPage kind={active} />
  }

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-zinc-900 dark:bg-zinc-950">
      {subStatus === 'expired' && <SubscriptionExpiredWall />}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-zinc-950 text-white transition-transform lg:translate-x-0 ${mobile ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-18 items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-2.5">
            <span
              style={{ backgroundColor: themeColor }}
              className="grid size-9 place-items-center rounded-xl text-lg text-white"
            >
              🔥
            </span>
            <div>
              <b className="block text-sm">SmartPOS</b>
              <span className="text-[10px] text-zinc-500">STORE OWNER</span>
            </div>
          </div>
          <button onClick={() => setMobile(false)} className="lg:hidden">
            <X />
          </button>
        </div>

        <div className="mx-3 mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <span
            style={{ backgroundColor: `${themeColor}25`, color: themeColor }}
            className="grid size-9 place-items-center rounded-lg font-black text-xs"
          >
            OT
          </span>
          <div className="min-w-0 flex-1">
            <b className="block truncate text-xs">{slug}</b>
            <span className="text-[10px] text-emerald-400">● Open now</span>
          </div>
          <ChevronDown size={14} className="text-zinc-500" />
        </div>

        <nav className="mt-3 flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {nav.map(([id, label, Icon]) => {
            const hasBillCall = id === 'tables' && billCalls.length > 0
            return (
              <button
                key={id}
                onClick={() => go(id)}
                style={active === id ? { backgroundColor: themeColor } : {}}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition cursor-pointer ${
                  active === id ? 'text-white shadow-lg shadow-zinc-950/30' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={17} />
                  <span>{label}</span>
                </div>
                {hasBillCall && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white shadow-sm animate-pulse">
                    <Bell size={11} className="animate-bell-wiggle" />
                    <span>{billCalls.length}</span>
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </aside>

      {mobile && <button onClick={() => setMobile(false)} className="fixed inset-0 z-40 bg-black/50 lg:hidden" />}

      {/* Main Content Area */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-18 items-center gap-3 border-b border-zinc-200/70 bg-white/85 px-4 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/85 lg:px-6">
          <button onClick={() => setMobile(true)} className="grid size-10 place-items-center rounded-xl border dark:border-zinc-700 lg:hidden">
            <MenuIcon />
          </button>

          {/* Top Header Bill Alert Button (if any tables are calling) */}
          {billCalls.length > 0 && (
            <button
              onClick={() => go('tables')}
              className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 text-xs font-black text-amber-600 dark:text-amber-400 shadow-sm transition hover:bg-amber-500/20 animate-pulse cursor-pointer"
            >
              <Bell size={14} className="text-amber-500 animate-bell-wiggle" />
              <span>ลูกค้าเรียกเช็คบิล ({billCalls.length} โต๊ะ)</span>
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setDark(!dark)} className="grid size-10 place-items-center rounded-xl border bg-white text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 cursor-pointer">
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button
              onClick={() => go('pos')}
              style={{ backgroundColor: themeColor }}
              className="hidden h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold text-white sm:flex cursor-pointer shadow-md hover:brightness-95"
            >
              <CircleDollarSign size={16} /> Open POS
            </button>
          </div>
        </header>

        <main className="p-4 lg:p-6">
          <Suspense fallback={<div className="grid min-h-80 place-items-center text-sm text-zinc-400">Loading workspace…</div>}>
            {page}
          </Suspense>
        </main>
      </div>
    </div>
  )
}

export default function StoreOwnerApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <App />
      </StoreProvider>
    </QueryClientProvider>
  )
}
