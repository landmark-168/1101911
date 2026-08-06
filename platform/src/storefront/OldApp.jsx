import { useState, useEffect, useRef } from 'react'
import {
  Flame, ShoppingBag, Utensils, User, Settings, LogOut,
  Tag, MessageSquare, LayoutDashboard, Clock, Compass, ShoppingCart
} from 'lucide-react'
import { Button } from './components/ui/button'
import { supabase } from './lib/supabase'

// Customer Pages
import { Login } from './pages/Login'
import { Home } from './pages/Home'
import { Order } from './pages/Order'
import { Cart } from './pages/Cart'
import { Checkout } from './pages/Checkout'
import { Track } from './pages/Track'
import { Promotions } from './pages/Promotions'
import { Contact } from './pages/Contact'

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminMenu } from './pages/admin/AdminMenu'
import { AdminOrders } from './pages/admin/AdminOrders'
import { AdminPromos } from './pages/admin/AdminPromos'
import { AdminCustomers } from './pages/admin/AdminCustomers'
import { AdminSettings } from './pages/admin/AdminSettings'

// ─── Seed Data ────────────────────────────────────────────────────────────────

const INITIAL_MENU = [
  { id: 0, emoji: '🥩', name: 'หมูคุโรบูตะสไลซ์', desc: 'นุ่ม หอม สดใหม่ทุกวัน', price: 199 },
  { id: 1, emoji: '🦐', name: 'ชุดทะเลเตาถ่าน', desc: 'กุ้ง หมึก หอย คัดไซซ์พิเศษ', price: 259 },
  { id: 2, emoji: '🥬', name: 'ผักรวมสดกรอบ', desc: 'ผักสวนครัวพร้อมน้ำจิ้ม', price: 89 },
  { id: 3, emoji: '🍄', name: 'เห็ดรวมย่าง', desc: 'เห็ดเข็มทองและเห็ดออรินจิ', price: 79 },
  { id: 4, emoji: '🍜', name: 'วุ้นเส้นผัดแห้ง', desc: 'เส้นเหนียวนุ่ม ซอสสูตรร้าน', price: 69 },
  { id: 5, emoji: '🥓', name: 'สามชั้นคั่วพริกเกลือ', desc: 'หอมกรอบ เผ็ดกำลังดี', price: 149 },
]

const INITIAL_ORDERS = [
  { id: '#ORD-9952', customer: 'สมชาย ใจดี', total: 477, status: 'กำลังปรุงอาหาร' },
  { id: '#ORD-9951', customer: 'ณิชา สมบูรณ์', total: 399, status: 'รอรับออเดอร์' },
  { id: '#ORD-9950', customer: 'มาลี แสนดี', total: 118, status: 'จัดส่งแล้ว' },
]

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  // ── Auth & Navigation
  const [role, setRole] = useState(() => localStorage.getItem('ttRole') || null)
  const [view, setView] = useState(() => localStorage.getItem('ttView') || 'login')

  // ── State
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('ttCart') || '[]'))
  const [orders, setOrders] = useState(() => JSON.parse(localStorage.getItem('ttOrders') || JSON.stringify(INITIAL_ORDERS)))
  const [lastOrder, setLastOrder] = useState(() => JSON.parse(localStorage.getItem('ttLastOrder') || 'null'))
  const [menu, setMenu] = useState(() => JSON.parse(localStorage.getItem('ttMenu') || JSON.stringify(INITIAL_MENU)))
  const [mode, setMode] = useState(() => localStorage.getItem('ttMode') || 'delivery')
  const [address, setAddress] = useState(() => JSON.parse(localStorage.getItem('ttAddress') || '{"name":"","phone":"","address":"","note":""}'))

  // ── Toast
  const [toast, setToast] = useState({ show: false, message: '' })
  const toastTimeout = useRef(null)

  const showToast = (message) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current)
    setToast({ show: true, message })
    toastTimeout.current = setTimeout(() => setToast({ show: false, message: '' }), 2300)
  }

  // ── Persistence
  useEffect(() => {
    supabase.from('store_menu_items').select('*').eq('available', true).order('created_at', { ascending: false }).then(({ data, error }) => {
      if (data && !error && data.length > 0) {
        const formattedMenu = data.map(item => ({
          id: item.id,
          emoji: '🍽️',
          image_url: item.image_url,
          name: item.name,
          desc: item.description || '',
          price: item.price
        }))
        setMenu(formattedMenu)
      }
    })
  }, [])

  useEffect(() => { localStorage.setItem('ttMenu', JSON.stringify(menu)) }, [menu])
  useEffect(() => { localStorage.setItem('ttCart', JSON.stringify(cart)) }, [cart])
  useEffect(() => { localStorage.setItem('ttOrders', JSON.stringify(orders)) }, [orders])
  useEffect(() => { localStorage.setItem('ttLastOrder', JSON.stringify(lastOrder)) }, [lastOrder])
  useEffect(() => { localStorage.setItem('ttMode', mode) }, [mode])
  useEffect(() => { localStorage.setItem('ttAddress', JSON.stringify(address)) }, [address])
  useEffect(() => {
    localStorage.setItem('ttRole', role || '')
    localStorage.setItem('ttView', view)
  }, [role, view])

  // ── Auth Actions
  const logout = () => { setRole(null); setView('login') }

  const login = (email, password) => {
    if (email === 'admin@taothan.com' && password === 'admin123') {
      setRole('admin'); setView('admin-dashboard')
      showToast('เข้าสู่ระบบในฐานะแอดมินสำเร็จ')
    } else if (email === 'customer@taothan.com' && password === '1234') {
      setRole('customer'); setView('home')
      showToast('เข้าสู่ระบบสำเร็จ')
    } else {
      showToast('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    }
  }

  // ── Cart Actions
  const addToCart = (item) => {
    const existing = cart.find(c => c.id === item.id)
    if (existing) {
      setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c))
    } else {
      setCart([...cart, { ...item, qty: 1 }])
    }
    showToast(`เพิ่ม ${item.name} ลงตะกร้าแล้ว`)
  }

  const changeQty = (id, delta) => {
    setCart(cart.map(c => c.id === id ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0))
  }

  const getCartTotal = () => cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const getCartCount = () => cart.reduce((sum, item) => sum + item.qty, 0)

  // ── Pay / Checkout
  const handlePay = () => {
    if (!cart.length) { showToast('กรุณาเลือกอาหารก่อนชำระเงิน'); return }
    const newOrder = {
      id: `#ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      customer: address.name || 'สมชาย ใจดี',
      total: getCartTotal(),
      status: 'กำลังปรุงอาหาร',
      items: [...cart],
      mode,
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.',
    }
    setOrders([newOrder, ...orders])
    setLastOrder(newOrder)
    setCart([])
    setView('track')
    showToast('ยืนยันคำสั่งซื้อและเริ่มปรุงอาหารแล้ว')
  }

  // ── Promotions
  const copyPromo = (code) => {
    navigator.clipboard?.writeText(code)
    showToast(`คัดลอกรหัสคูปอง ${code} แล้ว`)
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const isCustomer = role === 'customer'
  const isAdmin = role === 'admin'

  const ADMIN_NAV = [
    ['admin-dashboard', LayoutDashboard, 'แดชบอร์ด'],
    ['admin-menu', Utensils, 'จัดการเมนู'],
    ['admin-orders', ShoppingBag, 'จัดการออเดอร์'],
    ['admin-promos', Tag, 'โปรโมชั่น'],
    ['admin-customers', User, 'ลูกค้า'],
    ['admin-settings', Settings, 'ตั้งค่าร้าน'],
  ]

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col font-sans">
      {/* Toast */}
      <div className={`toast ${toast.show ? 'show' : ''}`}>{toast.message}</div>

      {/* ── Customer Header ── */}
      {isCustomer && (
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-line shadow-sm px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
            <span className="grid size-9 place-items-center rounded-full bg-gradient-to-r from-ember to-deep text-white border-2 border-copper shadow-md">
              <Flame size={18} fill="currentColor" />
            </span>
            <span className="font-display font-extrabold text-xl tracking-tight text-ink">เตาถ่าน</span>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            {[['home','หน้าแรก'],['order','สั่งอาหาร'],['track','ติดตามสถานะ'],['promotions','โปรโมชั่น'],['contact','ติดต่อเรา']].map(([v, label]) => (
              <button key={v} onClick={() => setView(v)} className={`text-sm font-semibold transition hover:text-ember ${view === v ? 'text-ember' : 'text-smoke'}`}>
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-[10px] text-smoke font-medium">เข้าใช้งานโดย</p>
              <p className="text-xs font-bold text-ink">ลูกค้าเตาถ่าน</p>
            </div>
            <Button variant="outline" size="small" onClick={logout} className="gap-1.5 h-8.5 text-xs">
              <LogOut size={13} /> ออกจากระบบ
            </Button>
          </div>
        </header>
      )}

      {/* ── Cart FAB ── */}
      {isCustomer && ['home','order','promotions','contact'].includes(view) && (
        <button
          onClick={() => setView('cart')}
          className="fixed bottom-6 right-6 z-40 bg-coal hover:bg-ink text-white p-4.5 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 group border border-line/30"
          aria-label="ดูตะกร้าสินค้า"
        >
          <ShoppingCart size={24} className="group-hover:rotate-6 transition-transform" />
          {getCartCount() > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-b from-ember to-deep text-white font-black text-xs size-6 rounded-full flex items-center justify-center animate-bounce shadow-md">
              {getCartCount()}
            </span>
          )}
        </button>
      )}

      {/* ── Mobile Bottom Nav (Customer) ── */}
      {isCustomer && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-line px-2 py-2 flex items-center justify-around z-30 shadow-lg">
          {[
            ['home', Compass, 'หน้าแรก'],
            ['order', Utensils, 'สั่งอาหาร'],
            ['track', Clock, 'ติดตามสถานะ'],
            ['promotions', Tag, 'โปรโมชั่น'],
            ['contact', MessageSquare, 'ติดต่อเรา'],
          ].map(([v, Icon, label]) => (
            <button key={v} onClick={() => setView(v)} className={`flex flex-col items-center gap-1 p-1 text-[10px] font-bold ${view === v ? 'text-ember' : 'text-smoke'}`}>
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Main Content ── */}
      <main className={`flex-1 ${isCustomer ? 'pb-20 md:pb-8' : ''}`}>

        {/* Login */}
        {view === 'login' && <Login onLogin={login} />}

        {/* Customer Views */}
        {isCustomer && view === 'home' && <Home setView={setView} menu={menu} onAddToCart={addToCart} />}
        {isCustomer && view === 'order' && <Order setView={setView} menu={menu} onAddToCart={addToCart} mode={mode} setMode={setMode} address={address} setAddress={setAddress} />}
        {isCustomer && view === 'cart' && <Cart setView={setView} cart={cart} changeQty={changeQty} getCartTotal={getCartTotal} />}
        {isCustomer && view === 'checkout' && <Checkout cart={cart} getCartTotal={getCartTotal} onPay={handlePay} />}
        {isCustomer && view === 'track' && <Track setView={setView} lastOrder={lastOrder} mode={mode} setMode={setMode} address={address} onCallPhone={() => showToast(mode === 'delivery' ? 'กำลังโทรหาไรเดอร์...' : 'เรียกพนักงานแล้ว กรุณารอสักครู่')} />}
        {isCustomer && view === 'promotions' && <Promotions onCopyPromo={copyPromo} />}
        {isCustomer && view === 'contact' && <Contact onSubmitMessage={() => showToast('ส่งข้อความติดต่อผู้จัดการสำเร็จแล้ว')} />}

        {/* Admin Layout */}
        {isAdmin && (
          <div className="min-h-screen flex bg-soft text-ink">

            {/* Sidebar */}
            <aside className="w-64 bg-coal text-white p-5 border-r border-white/5 shrink-0 flex-col justify-between hidden md:flex">
              <div className="space-y-8">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-full bg-gradient-to-r from-ember to-deep text-white border border-copper/40 shadow-md">
                    <Flame size={17} fill="currentColor" />
                  </span>
                  <span className="font-display font-extrabold text-lg tracking-tight text-white">Admin Control</span>
                </div>
                <nav className="space-y-1.5">
                  {ADMIN_NAV.map(([v, Icon, label]) => (
                    <button key={v} onClick={() => setView(v)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition ${view === v ? 'bg-ember text-white shadow-md' : 'text-smoke hover:bg-white/5 hover:text-white'}`}
                    >
                      <Icon size={14} /><span>{label}</span>
                    </button>
                  ))}
                </nav>
              </div>
              <div className="space-y-4">
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-[10px] text-smoke leading-normal">
                  <p className="font-bold text-white mb-0.5">สาขาทองหล่อ</p>
                  <p>เปิดให้บริการตามปกติ</p>
                </div>
                <Button variant="outline" size="wide" onClick={logout} className="h-10 text-xs border-white/10 hover:border-white/20 text-white bg-white/5 gap-1.5">
                  <LogOut size={13} /> ออกจากระบบ
                </Button>
              </div>
            </aside>

            {/* Admin Content Area */}
            <div className="flex-1 flex flex-col min-w-0">

              {/* Mobile Admin Header */}
              <header className="md:hidden sticky top-0 z-40 bg-coal text-white px-4 py-3 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-full bg-gradient-to-r from-ember to-deep text-white border border-copper/40">
                    <Flame size={15} fill="currentColor" />
                  </span>
                  <span className="font-display font-extrabold text-sm tracking-tight">Admin Control</span>
                </div>
                <div className="flex items-center gap-2">
                  <select value={view} onChange={(e) => setView(e.target.value)}
                    className="bg-white/10 border border-white/10 text-white text-xs font-bold rounded-lg px-2.5 py-1.5 outline-none"
                  >
                    {ADMIN_NAV.map(([v,, label]) => (
                      <option key={v} value={v} className="bg-coal">{label}</option>
                    ))}
                  </select>
                  <button onClick={logout} className="p-2 text-white hover:text-ember transition" aria-label="ออกจากระบบ">
                    <LogOut size={18} />
                  </button>
                </div>
              </header>

              {/* Admin Page Router */}
              <section className="p-6 md:p-10 max-w-5xl w-full mx-auto">
                {view === 'admin-dashboard' && <AdminDashboard orders={orders} setOrders={setOrders} showToast={showToast} />}
                {view === 'admin-menu' && <AdminMenu menu={menu} showToast={showToast} />}
                {view === 'admin-orders' && <AdminOrders orders={orders} setOrders={setOrders} showToast={showToast} />}
                {view === 'admin-promos' && <AdminPromos showToast={showToast} />}
                {view === 'admin-customers' && <AdminCustomers />}
                {view === 'admin-settings' && <AdminSettings showToast={showToast} />}
              </section>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
