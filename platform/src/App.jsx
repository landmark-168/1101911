import { lazy, Suspense, useEffect, useState } from 'react'
import {
  ArrowRight, BarChart3, Bell, Check, ChefHat, ChevronRight,
  CircleDollarSign, Clock, LogOut, Menu, PackageCheck, QrCode, ShoppingBag,
  Sparkles, Store, Truck, UserCircle, Utensils, X, Zap,
} from 'lucide-react'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import RegisterPage from './RegisterPage'
import LoginPage from './LoginPage'
import PricingPage from './PricingPage'
import { fetchCurrentUserSummary, fetchPublicSettings, signOut } from './lib/database'
import { applyAdminIdentity, applyBranding, readCachedBranding, watchBranding } from './lib/branding'
const AdminDashboard = lazy(() => import('./AdminDashboard'))
const StoreManagement = lazy(() => import('./StoreManagement'))
const CheckoutPage = lazy(() => import('./CheckoutPage'))
const PackageManagement = lazy(() => import('./PackageManagement'))
const AnalyticsPage = lazy(() => import('./AnalyticsPage'))
const SettingsPage = lazy(() => import('./SettingsPage'))
const RevenuePage = lazy(() => import('./RevenuePage'))
const MembersPage = lazy(() => import('./MembersPage'))
const StoreOwnerApp = lazy(() => import('./store-owner/StoreOwnerApp'))

const features = [
  { icon: CircleDollarSign, label: 'POS', title: 'ขายง่าย หน้าร้านลื่นไหล', description: 'รับออเดอร์ ชำระเงิน และจัดการโต๊ะในหน้าจอเดียว ใช้งานง่ายแม้ช่วงร้านแน่น', stat: 'เร็วขึ้น 2×', tone: 'orange' },
  { icon: QrCode, label: 'QR MENU', title: 'ลูกค้าสั่งเองจากโต๊ะ', description: 'สแกน QR ดูเมนู สั่งอาหาร และเรียกพนักงาน ลดงานซ้ำและลดออเดอร์ผิด', stat: 'ลดงาน 40%', tone: 'amber' },
  { icon: Truck, label: 'DELIVERY', title: 'ออเดอร์ออนไลน์ ไม่เสีย GP', description: 'มีเว็บสั่งอาหารเป็นของร้านเอง รับออเดอร์เดลิเวอรีและลูกค้ารับหน้าร้าน', stat: '0% GP', tone: 'zinc' },
  { icon: BarChart3, label: 'DASHBOARD', title: 'รู้ยอดขายแบบเรียลไทม์', description: 'ดูเมนูขายดี สต็อก กำไร และภาพรวมทุกสาขาได้ทุกที่ทุกเวลา', stat: '24/7 Insights', tone: 'orange' },
]

function Logo() {
  const settings = window.__smartposSettings
  const name = settings?.general?.system_name || 'SmartPOS'
  const logo = settings?.brand?.logo_url
  return <a href="#home" className="flex items-center gap-2.5" aria-label="SmartPOS Home">
    <span className="grid size-9 place-items-center overflow-hidden rounded-xl bg-zinc-950 text-orange-500 shadow-lg">{logo?<img src={logo} alt="" className="size-full object-cover"/>:<Zap size={19} fill="currentColor" />}</span>
    <span className="text-xl font-extrabold tracking-tight">{name}</span>
  </a>
}

function DashboardMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[670px] pt-8 lg:pt-0" aria-label="ตัวอย่างหน้าจอ SmartPOS Dashboard">
      <div className="absolute -inset-8 -z-10 rounded-full bg-orange-400/20 blur-3xl" />
      <div className="overflow-hidden rounded-[26px] border border-white/80 bg-white/80 p-2 shadow-[0_35px_100px_rgba(24,24,27,.18)] backdrop-blur-xl">
        <div className="flex min-h-[390px] overflow-hidden rounded-[20px] bg-[#fafafa] sm:min-h-[440px]">
          <aside className="hidden w-36 flex-col bg-zinc-950 p-4 text-white sm:flex">
            <Logo />
            <div className="mt-9 space-y-2 text-[10px] font-medium text-zinc-500">
              <div className="rounded-lg bg-orange-500 px-3 py-2.5 text-white">ภาพรวมร้าน</div>
              <div className="px-3 py-2">รายการขาย</div><div className="px-3 py-2">เมนูอาหาร</div><div className="px-3 py-2">คลังสินค้า</div><div className="px-3 py-2">ลูกค้า</div>
            </div>
            <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-3 text-[9px] text-zinc-400">สาขาทองหล่อ<br/><b className="text-white">เปิดให้บริการ</b></div>
          </aside>
          <div className="min-w-0 flex-1 p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div><p className="text-[10px] text-zinc-400">วันอังคารที่ 14 กรกฎาคม</p><h3 className="mt-1 text-base font-bold sm:text-xl">สวัสดีคุณปาล์ม 👋</h3></div>
              <div className="grid size-8 place-items-center rounded-full bg-orange-100 text-orange-600"><Bell size={14}/></div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-3">
              {[['ยอดขายวันนี้','฿48,590','+12.8%'],['ออเดอร์','124','+8.2%'],['ลูกค้าใหม่','38','+16.4%']].map((item,i)=><div key={item[0]} className={`rounded-xl border p-3 ${i===0?'border-orange-200 bg-orange-50':'border-zinc-100 bg-white'}`}><p className="text-[9px] text-zinc-400">{item[0]}</p><p className="mt-2 text-lg font-extrabold">{item[1]}</p><span className="text-[8px] font-semibold text-emerald-600">{item[2]}</span></div>)}
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-[1.5fr_1fr]">
              <div className="rounded-xl border border-zinc-100 bg-white p-4"><div className="flex justify-between text-[10px]"><b>ยอดขายรายสัปดาห์</b><span className="text-zinc-400">7 วันล่าสุด</span></div><div className="mt-5 flex h-28 items-end gap-2">{[36,54,43,70,58,86,76].map((h,i)=><div key={i} className="flex-1 rounded-t bg-orange-100" style={{height:`${h}%`}}><div className="h-full rounded-t bg-orange-500" style={{opacity:.38+i*.08}} /></div>)}</div></div>
              <div className="rounded-xl bg-zinc-950 p-4 text-white"><p className="text-[10px] font-semibold">ช่องทางการขาย</p><div className="mx-auto my-4 grid size-20 place-items-center rounded-full border-[10px] border-orange-500 border-r-orange-200 text-center"><span className="text-base font-bold">124<small className="block text-[7px] font-normal text-zinc-400">ออเดอร์</small></span></div><div className="flex justify-between text-[8px] text-zinc-400"><span>● หน้าร้าน</span><span>● ออนไลน์</span></div></div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-8 -left-3 w-[150px] rounded-[26px] border-[5px] border-zinc-950 bg-white p-2 shadow-2xl sm:-left-10 sm:w-[185px]">
        <div className="rounded-[17px] bg-orange-50 p-3"><div className="mx-auto mb-3 h-1 w-9 rounded bg-zinc-300"/><p className="text-[7px] font-semibold text-orange-600">MOOKATA HOUSE</p><h4 className="mt-1 text-xs font-extrabold">วันนี้กินอะไรดี?</h4><div className="mt-3 grid grid-cols-2 gap-1.5">{['ชุดอิ่มคุ้ม','หมูสามชั้น','ทะเลรวม','ผักสด'].map((x,i)=><div key={x} className="rounded-lg bg-white p-1.5 shadow-sm"><div className={`mb-1 h-8 rounded ${['bg-orange-200','bg-amber-200','bg-sky-100','bg-emerald-100'][i]}`}/><p className="truncate text-[6px] font-bold">{x}</p><p className="text-[6px] text-orange-600">฿{[299,89,199,59][i]}</p></div>)}</div><button className="mt-3 w-full rounded-lg bg-zinc-950 py-2 text-[7px] font-bold text-white">ดูตะกร้า · ฿388</button></div>
      </div>
      <div className="absolute -right-2 top-0 flex items-center gap-2 rounded-2xl border border-white bg-white/90 p-3 shadow-xl backdrop-blur sm:-right-5"><span className="grid size-8 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Check size={16}/></span><span className="text-[10px]"><b className="block">รับออเดอร์ใหม่!</b><span className="text-zinc-400">โต๊ะ A08 · ฿459</span></span></div>
    </div>
  )
}

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [now, setNow] = useState(Date.now())
  useEffect(()=>{let live=true;fetchCurrentUserSummary().then(data=>{if(live)setCurrentUser(data)}).catch(()=>{});const timer=window.setInterval(()=>setNow(Date.now()),60000);return()=>{live=false;window.clearInterval(timer)}},[])
  const trialRemaining = (() => {
    const end = currentUser?.subscription?.ends_at
    if (!end) return null
    const diff = Math.max(0, new Date(end).getTime() - now)
    const days = Math.floor(diff / 86400000)
    const hours = Math.floor((diff % 86400000) / 3600000)
    return diff > 0 ? `ทดลองเหลือ ${days} วัน ${hours} ชม.` : 'หมดช่วงทดลองใช้ฟรีแล้ว'
  })()
  const accountStatus = [currentUser?.subscription?.package || currentUser?.shop?.package, trialRemaining].filter(Boolean).join(' · ') || currentUser?.shop?.name || 'บัญชีร้านค้า'
  const hasValidSub = currentUser?.subscription && ['active','trialing'].includes(currentUser.subscription.status)
  const scrollTo = id => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMenuOpen(false) }
  return <div className="min-h-screen overflow-hidden bg-[#fffdf9] text-zinc-950">
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200/60 bg-white/75 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Logo />
        <div className="hidden items-center gap-8 md:flex">{[['home','Home'],['features','Features'],['pricing','Pricing'],['contact','Contact']].map(([id,label])=><button key={id} onClick={()=>id==='pricing' ? window.location.href='/pricing' : scrollTo(id)} className="text-sm font-medium text-zinc-600 transition hover:text-orange-600">{label}</button>)}</div>
        <div className="hidden items-center gap-2 md:flex">
          {currentUser ? <>
            {currentUser.profile.role !== 'super_admin' && <Button className="h-10 rounded-lg px-4" onClick={()=>{ window.location.href=hasValidSub?'/store/my-store/':'/pricing' }}><Store size={16}/> {hasValidSub?'จัดการร้านค้า':'เลือกแพ็กเกจเพื่อเริ่มต้น'}</Button>}
            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-1.5"><span className="grid size-8 place-items-center rounded-lg bg-orange-100 text-orange-600"><UserCircle size={18}/></span><div className="text-left"><p className="max-w-36 truncate text-xs font-extrabold">{currentUser.profile.full_name||currentUser.user.email}</p><p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-orange-600"><Clock size={10}/>{accountStatus}</p></div></div>
            <button onClick={signOut} className="grid size-10 place-items-center rounded-xl border border-zinc-200 text-zinc-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500" aria-label="ออกจากระบบ"><LogOut size={17}/></button>
          </> : <><Button variant="ghost" onClick={()=>{ window.location.href='/login' }}>เข้าสู่ระบบ</Button><Button className="h-10 rounded-lg px-4" onClick={()=>{ window.location.href='/register' }}>สมัครร้าน <ArrowRight size={15}/></Button></>}
        </div>
        <button className="grid size-10 place-items-center rounded-xl border border-zinc-200 md:hidden" onClick={()=>setMenuOpen(!menuOpen)} aria-label="เปิดเมนู">{menuOpen?<X/>:<Menu/>}</button>
      </div>
      {menuOpen && <div className="border-t border-zinc-100 bg-white p-5 md:hidden">
        {currentUser&&<div className="mb-3 rounded-xl bg-orange-50 p-3"><p className="text-sm font-extrabold">{currentUser.profile.full_name||currentUser.user.email}</p><p className="mt-1 text-xs font-semibold text-orange-600">{trialRemaining||currentUser.shop?.name}</p></div>}
        {currentUser?.profile.role !== 'super_admin' && currentUser && <Button className="mb-2 w-full" onClick={()=>{ window.location.href=hasValidSub?'/store/my-store/':'/pricing' }}><Store size={16}/> {hasValidSub?'จัดการร้านค้า':'เลือกแพ็กเกจเพื่อเริ่มต้น'}</Button>}
        {[['home','Home'],['features','Features'],['pricing','Pricing'],['contact','Contact']].map(([id,label])=><button key={id} onClick={()=>id==='pricing' ? window.location.href='/pricing' : scrollTo(id)} className="block w-full border-b border-zinc-100 py-3 text-left font-medium">{label}</button>)}
        {currentUser?<Button className="mt-4 w-full" variant="secondary" onClick={signOut}><LogOut size={16}/> ออกจากระบบ</Button>:<div className="mt-4 grid grid-cols-2 gap-2"><Button variant="secondary" onClick={()=>{ window.location.href='/login' }}>เข้าสู่ระบบ</Button><Button onClick={()=>{ window.location.href='/register' }}>สมัครร้าน</Button></div>}
      </div>}
    </nav>

    <main>
      <section id="home" className="relative px-5 pb-28 pt-36 lg:px-8 lg:pb-36 lg:pt-44">
        <div className="absolute left-0 top-0 -z-10 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-orange-100/60 blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-20 lg:grid-cols-[.92fr_1.08fr] lg:gap-10">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700"><Sparkles size={14}/> ระบบจัดการร้านอาหาร All-in-One</div>
            <h1 className="mt-7 text-4xl font-black leading-[1.15] tracking-[-.04em] sm:text-5xl lg:text-[62px]">ระบบ POS และ<br/><span className="relative text-orange-500">เว็บสั่งอาหาร<span className="absolute -bottom-1 left-0 h-2 w-full -rotate-1 rounded-full bg-orange-200/70 -z-10"/></span><br/>สำหรับร้านอาหาร<br/>ทุกประเภท</h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-zinc-600 sm:text-lg">ขายหน้าร้าน สั่งผ่าน QR Code เดลิเวอรี จัดการสต็อก รายงานยอดขาย และแจ้งเตือนผ่าน LINE OA — ครบในระบบเดียว</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button className="h-14 px-7 text-base" onClick={()=>{ window.location.href='/register' }}>ทดลองใช้งานฟรี <ArrowRight size={18}/></Button><Button variant="secondary" className="h-14 px-7 text-base" onClick={()=>scrollTo('demo')}><Store size={18}/> ดูตัวอย่างร้านหมูกระทะ</Button></div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-zinc-500">{['ฟรี 14 วัน','ไม่ต้องใช้บัตรเครดิต','พร้อมใช้ใน 5 นาที'].map(x=><span key={x} className="flex items-center gap-1.5"><Check size={14} className="text-orange-500"/>{x}</span>)}</div>
          </div>
          <div id="demo"><DashboardMockup/></div>
        </div>
      </section>

      <section className="border-y border-zinc-200/70 bg-white/65 px-5 py-8"><div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 sm:flex-row"><p className="text-center text-sm font-semibold text-zinc-500">ครบทุกเครื่องมือที่ร้านอาหารยุคใหม่ต้องการ</p><div className="flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm font-bold text-zinc-400"><span className="flex gap-2"><Utensils/>ร้านอาหาร</span><span className="flex gap-2"><ChefHat/>คาเฟ่</span><span className="flex gap-2"><ShoppingBag/>เดลิเวอรี</span><span className="flex gap-2"><Store/>หลายสาขา</span></div></div></section>

      <section id="features" className="px-5 py-24 lg:px-8 lg:py-32"><div className="mx-auto max-w-7xl"><div className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold uppercase tracking-[.18em] text-orange-500">Power your restaurant</p><h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">ระบบเดียว จัดการร้านได้ครบ</h2><p className="mt-5 text-zinc-500">ลดความวุ่นวาย เพิ่มความเร็ว และเห็นภาพรวมธุรกิจได้ชัดเจนกว่าเดิม</p></div><div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">{features.map(({icon:Icon,...f},i)=><Card key={f.label} className={`group relative overflow-hidden p-6 transition duration-300 hover:-translate-y-2 hover:shadow-[0_30px_80px_rgba(249,115,22,.13)] ${i===0?'lg:-rotate-1':''}`}><div className="absolute -right-10 -top-10 size-32 rounded-full bg-orange-100/60 blur-2xl transition group-hover:bg-orange-200"/><div className="relative"><div className={`grid size-12 place-items-center rounded-2xl ${f.tone==='zinc'?'bg-zinc-950 text-white':'bg-orange-100 text-orange-600'}`}><Icon/></div><p className="mt-6 text-[10px] font-black tracking-[.18em] text-orange-500">{f.label}</p><h3 className="mt-2 text-xl font-extrabold leading-snug">{f.title}</h3><p className="mt-3 text-sm leading-6 text-zinc-500">{f.description}</p><div className="mt-7 flex items-center justify-between border-t border-zinc-100 pt-4"><b className="text-sm">{f.stat}</b><ChevronRight size={17} className="text-orange-500 transition group-hover:translate-x-1"/></div></div></Card>)}</div></div></section>

      <section id="pricing" className="px-5 pb-24 lg:px-8"><div className="mx-auto max-w-7xl overflow-hidden rounded-[40px] bg-zinc-950 px-6 py-16 text-white sm:px-12 lg:px-16"><div className="grid items-center gap-10 lg:grid-cols-2"><div><p className="text-sm font-bold uppercase tracking-[.18em] text-orange-500">Built to grow</p><h2 className="mt-4 text-3xl font-black sm:text-5xl">เริ่มเล็ก แล้วเติบโต<br/>ไปพร้อมกับร้านคุณ</h2><p className="mt-5 max-w-lg leading-7 text-zinc-400">ไม่ว่าจะเป็นร้านแรกหรือหลายสิบสาขา SmartPOS ก็พร้อมช่วยให้ทุกออเดอร์เป็นเรื่องง่าย</p></div><div className="grid gap-3 sm:grid-cols-2">{[[PackageCheck,'สต็อกแม่นยำ'],[Bell,'แจ้งเตือน LINE OA'],[BarChart3,'รายงานเรียลไทม์'],[QrCode,'QR Menu พร้อมใช้']].map(([Icon,text])=><div key={text} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"><span className="grid size-10 place-items-center rounded-xl bg-orange-500/15 text-orange-500"><Icon size={19}/></span><span className="text-sm font-semibold">{text}</span></div>)}</div></div></div></section>

      <section id="cta" className="px-5 pb-24 lg:px-8"><div className="relative mx-auto max-w-7xl overflow-hidden rounded-[40px] bg-orange-500 px-6 py-16 text-center text-white sm:px-12 lg:py-20"><div className="absolute -left-20 -top-20 size-72 rounded-full border-[40px] border-white/10"/><div className="absolute -bottom-28 -right-10 size-80 rounded-full border-[55px] border-zinc-950/10"/><div className="relative"><p className="text-sm font-bold uppercase tracking-[.18em] text-orange-100">พร้อมเปิดร้านให้ Smart ขึ้นหรือยัง?</p><h2 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">เริ่มต้นใช้งานฟรี</h2><p className="mx-auto mt-5 max-w-xl text-orange-50">ทดลองทุกฟีเจอร์ฟรี 14 วัน ให้ทีมของเราช่วยตั้งค่าร้าน พร้อมเริ่มขายได้ทันที</p><Button onClick={()=>{ window.location.href='/register' }} className="mt-8 h-14 bg-zinc-950 px-8 text-base shadow-xl hover:bg-zinc-800">สมัครร้านของคุณ <ArrowRight size={18}/></Button></div></div></section>
    </main>

    <footer id="contact" className="border-t border-zinc-200 bg-white px-5 py-10 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-7 md:flex-row"><div><Logo/><p className="mt-3 text-sm text-zinc-500">ให้ทุกเรื่องร้านอาหาร ง่ายในระบบเดียว</p></div><div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-zinc-500"><a href="#features" className="hover:text-orange-500">Features</a><a href="#pricing" className="hover:text-orange-500">Pricing</a><a href="mailto:hello@smartpos.co" className="hover:text-orange-500">hello@smartpos.co</a><a href="tel:020000000" className="hover:text-orange-500">02-000-0000</a></div><p className="text-xs text-zinc-400">© 2026 SmartPOS</p></div></footer>
  </div>
}


export default function App() {
  const [, setBrandReady] = useState(false)
  useEffect(() => { const cached=readCachedBranding();if(cached)applyBranding(cached,false);watchBranding();fetchPublicSettings().then(settings => { if (!settings) return;applyBranding(settings);setBrandReady(true) });fetchCurrentUserSummary().then(applyAdminIdentity).catch(()=>{}) }, [])
  if (window.location.pathname.startsWith('/store/')) return <Suspense fallback={<div className="grid min-h-screen place-items-center bg-zinc-950 text-sm font-bold text-white">กำลังเปิด Store Workspace…</div>}><StoreOwnerApp /></Suspense>
  if (window.location.pathname === '/register') return <RegisterPage />
  if (window.location.pathname === '/login') return <LoginPage />
  if (window.location.pathname === '/pricing') return <PricingPage />
  if (window.location.pathname === '/checkout') return <Suspense fallback={<div className="grid min-h-screen place-items-center">กำลังโหลด…</div>}><CheckoutPage /></Suspense>
  if (window.location.pathname === '/admin') return <Suspense fallback={<div className="grid min-h-screen place-items-center bg-zinc-50 text-sm font-bold text-zinc-500">กำลังโหลด Dashboard…</div>}><AdminDashboard /></Suspense>
  if (window.location.pathname === '/admin/stores') return <Suspense fallback={<div className="grid min-h-screen place-items-center bg-zinc-50 text-sm font-bold text-zinc-500">กำลังโหลดร้านค้า…</div>}><StoreManagement /></Suspense>
  if (window.location.pathname === '/admin/packages') return <Suspense fallback={<div className="grid min-h-screen place-items-center bg-zinc-50 text-sm font-bold text-zinc-500">กำลังโหลดแพ็กเกจ…</div>}><PackageManagement /></Suspense>
  if (window.location.pathname === '/admin/analytics') return <Suspense fallback={<div className="grid min-h-screen place-items-center bg-zinc-50 text-sm font-bold text-zinc-500">กำลังโหลด Analytics…</div>}><AnalyticsPage /></Suspense>
  if (window.location.pathname === '/admin/settings') return <Suspense fallback={<div className="grid min-h-screen place-items-center bg-zinc-50 text-sm font-bold text-zinc-500">กำลังโหลด Setting…</div>}><SettingsPage /></Suspense>
  if (window.location.pathname === '/admin/revenue') return <Suspense fallback={<div className="grid min-h-screen place-items-center">กำลังโหลดรายได้…</div>}><RevenuePage /></Suspense>
  if (window.location.pathname === '/admin/members') return <Suspense fallback={<div className="grid min-h-screen place-items-center">กำลังโหลดสมาชิก…</div>}><MembersPage /></Suspense>
  return <LandingPage />
}
