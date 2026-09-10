import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BarChart3, Bell, Boxes, ChefHat, ChevronDown, CircleDollarSign, ClipboardList, Gift,
  LayoutDashboard, Menu as MenuIcon, Moon, PanelLeftClose, Search, Settings, ShoppingBag,
  Store, Sun, Tags, Users, Utensils, X, AlertTriangle, AlertCircle, CreditCard, KeyRound, Lock, Unlock, ShieldCheck, Shield, CheckCircle2
} from 'lucide-react'

import Dashboard from './components/dashboard/Dashboard'
import Orders from './components/orders/Orders'
import POS from './components/pos/POS'
import Kitchen from './components/kitchen/Kitchen'
import ManagementPage from './components/management/ManagementPage'
import Reports from './components/reports/Reports'
import StoreSettings from './components/settings/Settings'
import { ROLE_CONFIG, type Employee } from './components/employees/EmployeesManagement'
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
  ['employees', 'Employees & PIN', Users],
  ['reports', 'Reports', BarChart3],
  ['settings', 'Store Settings', Settings]
] as const

function playServiceAlert() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const context = new AudioContextClass()
    ;[880, 1046.5].forEach((frequency, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const start = context.currentTime + index * 0.16
      oscillator.frequency.setValueAtTime(frequency, start)
      gain.gain.setValueAtTime(0.2, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(start)
      oscillator.stop(start + 0.35)
    })
  } catch {
    // The browser may require a user interaction before playing sound.
  }
}


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
  const [isStaffPinModalOpen, setIsStaffPinModalOpen] = useState(false)

  // Active Staff from LocalStorage
  const [activeStaff, setActiveStaff] = useState<{
    id: string
    name: string
    role: string
    pin: string
    permissions: string[]
  } | null>(() => {
    if (typeof window === 'undefined' || !store?.id) return null
    try {
      const saved = localStorage.getItem(`active_staff_${store.id}`)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  // Listen to staff switch events
  useEffect(() => {
    const handleStaffChange = () => {
      if (!store?.id) return
      try {
        const saved = localStorage.getItem(`active_staff_${store.id}`)
        setActiveStaff(saved ? JSON.parse(saved) : null)
      } catch {
        setActiveStaff(null)
      }
    }
    window.addEventListener('staff-changed', handleStaffChange)
    return () => window.removeEventListener('staff-changed', handleStaffChange)
  }, [store?.id])

  const clearActiveStaff = () => {
    if (!store?.id) return
    localStorage.removeItem(`active_staff_${store.id}`)
    setActiveStaff(null)
    window.dispatchEvent(new Event('staff-changed'))
  }

  // Fetch employees for PIN modal
  const { data: storeEmployees = [] } = useQuery<Employee[]>({
    queryKey: ['store-employees', store?.id],
    enabled: Boolean(store?.id),
    queryFn: async () => {
      if (!store?.id) return []
      const { data } = await supabase
        .from('store_members')
        .select('*')
        .eq('store_id', store.id)
      return data || []
    }
  })

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark')
      document.body.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
      document.body.classList.remove('dark')
    }
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

  const { data: staffCalls = [] } = useQuery({
    queryKey: ['global-staff-calls', store?.id],
    enabled: Boolean(store?.id),
    queryFn: async () => {
      if (!store?.id) return []
      const { data } = await supabase
        .from('store_orders')
        .select('id, table_id, order_number, customer_name, notes, status, created_at, store_tables(table_number)')
        .eq('store_id', store.id)
        .neq('status', 'completed')
        .neq('status', 'cancelled')
      return (data || []).filter((order: any) => {
        const number = String(order.order_number || '').toUpperCase()
        const name = String(order.customer_name || '')
        const notes = String(order.notes || '')
        return number.startsWith('SRV') || name.includes('เรียกพนักงาน') || notes.includes('เรียกพนักงาน')
      })
    },
    refetchInterval: 6000
  })

  const previousStaffCallCount = useRef<number | null>(null)
  useEffect(() => {
    if (previousStaffCallCount.current !== null && staffCalls.length > previousStaffCallCount.current) playServiceAlert()
    previousStaffCallCount.current = staffCalls.length
  }, [staffCalls.length])

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
          qc.invalidateQueries({ queryKey: ['global-staff-calls', store.id] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [store?.id, qc])

  // Check if current active page is allowed for activeStaff
  const isPageAllowed = !activeStaff || !activeStaff.permissions || activeStaff.permissions.length === 0 || activeStaff.permissions.includes(active)

  let page: any = <Dashboard navigate={go} />
  if (active === 'orders') page = <Orders />
  else if (active === 'pos') page = <POS />
  else if (active === 'kitchen') page = <Kitchen />
  else if (active === 'reports') page = <Reports />
  else if (active === 'settings') page = <StoreSettings />
  else if (['menu', 'categories', 'tables', 'inventory', 'promotions', 'customers', 'employees'].includes(active)) {
    page = <ManagementPage kind={active} />
  }

  // Auto-redirect if current active tab is not allowed for activeStaff
  useEffect(() => {
    if (activeStaff && activeStaff.permissions && activeStaff.permissions.length > 0) {
      if (!activeStaff.permissions.includes(active)) {
        const firstAllowed = nav.find(([id]) => activeStaff.permissions.includes(id))?.[0] || activeStaff.permissions[0] || 'pos'
        go(firstAllowed)
      }
    }
  }, [activeStaff])

  // Active staff role config
  const activeRoleCfg = activeStaff ? ROLE_CONFIG[activeStaff.role] : null
  const ActiveRoleIcon = activeRoleCfg?.icon || ShieldCheck

  // Filter navigation items to hide locked ones completely
  const visibleNav = nav.filter(([id]) => {
    if (!activeStaff || !activeStaff.permissions || activeStaff.permissions.length === 0) return true
    return activeStaff.permissions.includes(id)
  })

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

        {/* Store & Active Staff Info in Sidebar */}
        <div className="mx-3 mt-3 space-y-2">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
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

          {/* Active Staff Sidebar Tag */}
          {activeStaff ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-white/15 bg-white/10 p-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  style={{ backgroundColor: `${activeRoleCfg?.color || themeColor}30`, color: activeRoleCfg?.color || themeColor }}
                  className="grid size-7 place-items-center rounded-lg text-xs shrink-0"
                >
                  <ActiveRoleIcon size={14} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-white">{activeStaff.name}</p>
                  <span className="text-[9px] text-zinc-400 block">{activeRoleCfg?.label || activeStaff.role}</span>
                </div>
              </div>
              <button
                onClick={() => setIsStaffPinModalOpen(true)}
                className="text-[10px] font-bold text-orange-400 hover:text-orange-300 underline cursor-pointer shrink-0"
              >
                สลับ PIN
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsStaffPinModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 py-2 text-[11px] font-bold text-zinc-300 hover:bg-white/10 transition cursor-pointer"
            >
              <KeyRound size={13} className="text-orange-400" />
              <span>สลับใช้งานด้วย PIN</span>
            </button>
          )}
        </div>

        <nav className="mt-3 flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {visibleNav.map(([id, label, Icon]) => {
            const tableAlertCount = billCalls.length + staffCalls.length
            const hasTableAlert = id === 'tables' && tableAlertCount > 0

            return (
              <button
                key={id}
                onClick={() => go(id)}
                style={active === id ? { backgroundColor: themeColor } : {}}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition cursor-pointer ${
                  active === id
                    ? 'text-white shadow-lg shadow-zinc-950/30'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={17} />
                  <span>{label}</span>
                </div>
                {hasTableAlert && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white shadow-sm animate-pulse">
                    <Bell size={11} className="animate-bell-wiggle" />
                    <span>{tableAlertCount}</span>
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
        <header className="fixed inset-x-0 top-0 z-30 flex h-18 items-center gap-3 border-b border-zinc-200/70 bg-white/85 px-4 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/85 lg:left-64 lg:px-6">
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

          {/* Top Header Staff PIN Switcher Bar */}
          <div className="hidden md:flex items-center gap-2">
            {activeStaff ? (
              <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white pl-3 pr-1.5 py-1 shadow-xs dark:border-zinc-700 dark:bg-zinc-900">
                <span
                  style={{ backgroundColor: `${activeRoleCfg?.color || themeColor}20`, color: activeRoleCfg?.color || themeColor }}
                  className="grid size-6 place-items-center rounded-lg text-xs"
                >
                  <ActiveRoleIcon size={13} />
                </span>
                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-100">
                  <span>{activeStaff.name}</span>
                  <span className="ml-1.5 text-[10px] font-normal text-zinc-400">({activeRoleCfg?.label || activeStaff.role})</span>
                </div>
                <button
                  onClick={() => setIsStaffPinModalOpen(true)}
                  className="flex items-center gap-1 rounded-xl bg-zinc-100 px-2.5 py-1 text-[11px] font-bold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                >
                  <KeyRound size={11} className="text-orange-500" />
                  <span>สลับ PIN</span>
                </button>
                <button
                  onClick={clearActiveStaff}
                  title="ปลดล็อคกลับเป็นโหมดเจ้าของร้าน (Owner Full Access)"
                  className="grid size-6 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <Unlock size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsStaffPinModalOpen(true)}
                className="flex items-center gap-1.5 rounded-2xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 shadow-xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <KeyRound size={13} className="text-orange-500" />
                <span>👤 เข้าใช้งานด้วย PIN พนักงาน</span>
              </button>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setIsStaffPinModalOpen(true)}
              className="flex md:hidden grid size-10 place-items-center rounded-xl border bg-white text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 cursor-pointer"
              title="สลับพนักงานด้วย PIN"
            >
              <KeyRound size={17} className="text-orange-500" />
            </button>

            <button
              type="button"
              onClick={() => setDark(prev => !prev)}
              className="grid size-10 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white transition cursor-pointer shadow-2xs active:scale-95"
              title={dark ? 'เปลี่ยนเป็นโหมดสว่าง (Light Mode)' : 'เปลี่ยนเป็นโหมดมืด (Dark Mode)'}
            >
              {dark ? <Sun size={18} className="text-amber-400 animate-fade-in" /> : <Moon size={18} className="text-zinc-600 animate-fade-in" />}
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

        <main className="p-4 pt-[calc(4.5rem+1rem)] lg:p-6 lg:pt-[calc(4.5rem+1.5rem)]">
          <Suspense fallback={<div className="grid min-h-80 place-items-center text-sm text-zinc-400">Loading workspace…</div>}>
            {isPageAllowed ? (
              page
            ) : (
              /* Permission Locked Screen */
              <div className="mx-auto max-w-md my-12 rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-lg dark:border-zinc-800 dark:bg-zinc-900 space-y-4 animate-fade-in">
                <div className="grid size-16 place-items-center rounded-3xl bg-amber-50 text-amber-500 dark:bg-amber-950/50 mx-auto">
                  <Lock size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-white">
                    หน้านี้ถูกจำกัดสิทธิ์ (Role Protected)
                  </h3>
                  <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    ตำแหน่ง <b className="text-zinc-800 dark:text-zinc-200">{activeStaff?.name} ({activeRoleCfg?.label || activeStaff?.role})</b> ไม่มีสิทธิ์เข้าถึงเมนูนี้
                  </p>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => setIsStaffPinModalOpen(true)}
                    style={{ backgroundColor: themeColor }}
                    className="flex items-center justify-center gap-2 rounded-2xl py-3 text-xs font-bold text-white shadow-md hover:brightness-95 cursor-pointer"
                  >
                    <KeyRound size={15} />
                    <span>ใส่รหัส PIN ผู้จัดการเพื่อปลดล็อค</span>
                  </button>
                  <button
                    onClick={clearActiveStaff}
                    className="rounded-2xl border border-zinc-200 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    คืนค่าสิทธิ์เจ้าของร้าน (Owner Mode)
                  </button>
                </div>
              </div>
            )}
          </Suspense>
        </main>
      </div>

      {/* Global Staff PIN Keypad Switcher Modal */}
      {isStaffPinModalOpen && (
        <GlobalStaffPinModal
          employees={storeEmployees}
          activeStaff={activeStaff}
          themeColor={themeColor}
          onClose={() => setIsStaffPinModalOpen(false)}
          onSelectStaff={(emp) => {
            localStorage.setItem(`active_staff_${store.id}`, JSON.stringify({
              id: emp.id,
              name: emp.full_name || emp.role,
              role: emp.role,
              pin: emp.pin_code,
              permissions: emp.permissions || ROLE_CONFIG[emp.role]?.defaultPermissions || []
            }))
            setActiveStaff({
              id: emp.id,
              name: emp.full_name || emp.role,
              role: emp.role,
              pin: emp.pin_code || '',
              permissions: emp.permissions || ROLE_CONFIG[emp.role]?.defaultPermissions || []
            })
            window.dispatchEvent(new Event('staff-changed'))
            setIsStaffPinModalOpen(false)
          }}
          onResetOwner={() => {
            clearActiveStaff()
            setIsStaffPinModalOpen(false)
          }}
        />
      )}
    </div>
  )
}

function GlobalStaffPinModal({ employees, activeStaff, themeColor, onClose, onSelectStaff, onResetOwner }: {
  employees: Employee[]
  activeStaff: any
  themeColor: string
  onClose: () => void
  onSelectStaff: (emp: Employee) => void
  onResetOwner: () => void
}) {
  const [pin, setPin] = useState('')
  const [matchedStaff, setMatchedStaff] = useState<Employee | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const handleKeyClick = (key: string) => {
    if (key === 'C') {
      setPin('')
      setMatchedStaff(null)
      setErrorMsg('')
    } else if (key === 'DEL') {
      setPin(prev => prev.slice(0, -1))
      setMatchedStaff(null)
      setErrorMsg('')
    } else {
      if (pin.length < 6) {
        const nextPin = pin + key
        setPin(nextPin)
        checkPin(nextPin)
      }
    }
  }

  const checkPin = (code: string) => {
    if (code.length >= 4) {
      const found = employees.find(e => e.pin_code === code && e.status === 'active')
      if (found) {
        setMatchedStaff(found)
        setErrorMsg('')
      } else {
        setMatchedStaff(null)
        if (code.length >= 4) {
          setErrorMsg('ไม่พบรหัส PIN นี้ หรือพนักงานถูกระงับสิทธิ์')
        }
      }
    } else {
      setMatchedStaff(null)
      setErrorMsg('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/50">
              <KeyRound size={16} />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white">
                สลับพนักงานด้วย PIN
              </h3>
              <p className="text-[10px] text-zinc-400">กดรหัส PIN 4 หลักเพื่อระบุตัวตน</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600">✕</button>
        </div>

        {/* PIN Code Dots Display */}
        <div className="text-center py-2">
          <div className="flex justify-center items-center gap-3">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`size-4 rounded-full border-2 transition-all ${
                  pin.length > i
                    ? 'bg-orange-500 border-orange-500 scale-110 shadow-xs'
                    : 'border-zinc-300 dark:border-zinc-700 bg-transparent'
                }`}
              />
            ))}
          </div>
          <p className="mt-2 font-mono text-xs font-bold text-zinc-400">
            {pin ? `PIN: ${pin}` : 'กดตัวเลข 4 หลัก'}
          </p>
        </div>

        {/* Matched Staff Preview */}
        {matchedStaff ? (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50/70 p-3 text-center dark:border-emerald-900 dark:bg-emerald-950/40 animate-fade-in">
            <CheckCircle2 size={22} className="mx-auto text-emerald-500 mb-1" />
            <p className="text-xs font-black text-emerald-800 dark:text-emerald-200">
              {matchedStaff.full_name || ROLE_CONFIG[matchedStaff.role]?.label}
            </p>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              ตำแหน่ง: {ROLE_CONFIG[matchedStaff.role]?.label}
            </span>
            <button
              onClick={() => onSelectStaff(matchedStaff)}
              style={{ backgroundColor: themeColor }}
              className="mt-2.5 w-full rounded-xl py-2 text-xs font-bold text-white shadow-md hover:brightness-95 cursor-pointer"
            >
              เข้าใช้งานทันที
            </button>
          </div>
        ) : errorMsg ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-2.5 text-center text-xs font-bold text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
            <AlertCircle size={14} className="inline mr-1" />
            {errorMsg}
          </div>
        ) : null}

        {/* Keypad Grid */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map(key => (
            <button
              key={key}
              type="button"
              onClick={() => handleKeyClick(key)}
              className={`h-12 rounded-2xl font-bold text-base transition cursor-pointer active:scale-95 flex items-center justify-center ${
                key === 'C'
                  ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400'
                  : key === 'DEL'
                  ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                  : 'bg-zinc-50 border border-zinc-200/80 text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700 shadow-xs'
              }`}
            >
              {key === 'DEL' ? '⌫' : key}
            </button>
          ))}
        </div>

        {/* Footer: Reset to owner */}
        {activeStaff && (
          <button
            onClick={onResetOwner}
            className="w-full text-center py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
          >
            🔓 ปลดล็อคเป็นโหมดเจ้าของร้าน (Full Access)
          </button>
        )}
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
