import { lazy, Suspense, useEffect, useState } from 'react'
import {
  ArrowRight, BarChart3, Bell, Check, ChefHat, ChevronRight,
  CircleDollarSign, Clock, LogOut, Menu, PackageCheck, QrCode, ShoppingBag,
  Sparkles, Store, Truck, UserCircle, Utensils, X, Zap, ShieldCheck
} from 'lucide-react'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import RegisterPage from './RegisterPage'
import LoginPage from './LoginPage'
import PricingPage from './PricingPage'
import { fetchCurrentUserSummary, fetchPublicSettings, signOut, updateProfile } from './lib/database'
import { applyAdminIdentity, applyBranding, readCachedBranding, watchBranding } from './lib/branding'
import { LanguageToggle, useLanguage } from './lib/language'
const AdminDashboard = lazy(() => import('./AdminDashboard'))
const StoreManagement = lazy(() => import('./StoreManagement'))
const CheckoutPage = lazy(() => import('./CheckoutPage'))
const CreateStorePage = lazy(() => import('./CreateStorePage'))
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
  { icon: BarChart3, label: 'DASHBOARD', title: 'รู้ยอดขายแบบเรียลไทม์', description: 'ดูเมนูขายดี ยอดขาย กำไร และภาพรวมทุกสาขาได้ทุกที่ทุกเวลา', stat: '24/7 Insights', tone: 'orange' },
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
  const { language } = useLanguage()
  const english = language === 'en'
  const copy = english ? {
    nav: ['Store overview', 'Sales', 'Menu', 'Tables', 'Customers'], branch: 'Thonglor branch', open: 'Open now', date: 'Tuesday, 14 July', greeting: 'Hello, Palm 👋', cards: ['Today’s sales', 'Orders', 'New customers'], weekly: 'Weekly sales', latest: 'Last 7 days', channels: 'Sales channels', order: 'orders', counter: 'In store', online: 'Online', foodTitle: 'What should we eat today?', foods: ['ชุดอิ่มคุ้ม', 'หมูสามชั้น', 'ทะเลรวม', 'ผักสด'], cart: 'View cart', newOrder: 'New order received!', table: 'Table A08'
  } : {
    nav: ['ภาพรวมร้าน', 'รายการขาย', 'เมนูอาหาร', 'จัดการโต๊ะ', 'ลูกค้า'], branch: 'สาขาทองหล่อ', open: 'เปิดให้บริการ', date: 'วันอังคารที่ 14 กรกฎาคม', greeting: 'สวัสดีคุณปาล์ม 👋', cards: ['ยอดขายวันนี้', 'ออเดอร์', 'ลูกค้าใหม่'], weekly: 'ยอดขายรายสัปดาห์', latest: '7 วันล่าสุด', channels: 'ช่องทางการขาย', order: 'ออเดอร์', counter: 'หน้าร้าน', online: 'ออนไลน์', foodTitle: 'วันนี้กินอะไรดี?', foods: ['ชุดอิ่มคุ้ม', 'หมูสามชั้น', 'ทะเลรวม', 'ผักสด'], cart: 'ดูตะกร้า', newOrder: 'รับออเดอร์ใหม่!', table: 'โต๊ะ A08'
  }
  return (
    <div className="relative mx-auto w-full max-w-[670px] pt-8 lg:pt-0" aria-label={english ? 'SmartPOS dashboard preview' : 'ตัวอย่างหน้าจอ SmartPOS Dashboard'}>
      <div className="absolute -inset-8 -z-10 rounded-full bg-orange-400/20 blur-3xl" />
      <div className="overflow-hidden rounded-[26px] border border-white/80 bg-white/80 p-2 shadow-[0_35px_100px_rgba(24,24,27,.18)] backdrop-blur-xl">
        <div className="flex min-h-[390px] overflow-hidden rounded-[20px] bg-[#fafafa] sm:min-h-[440px]">
          <aside className="hidden w-36 flex-col bg-zinc-950 p-4 text-white sm:flex">
            <Logo />
            <div className="mt-9 space-y-2 text-[10px] font-medium text-zinc-500">
              <div className="rounded-lg bg-orange-500 px-3 py-2.5 text-white">{copy.nav[0]}</div>
              {copy.nav.slice(1).map(label => <div key={label} className="px-3 py-2">{label}</div>)}
            </div>
            <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-3 text-[9px] text-zinc-400">{copy.branch}<br/><b className="text-white">{copy.open}</b></div>
          </aside>
          <div className="min-w-0 flex-1 p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div><p className="text-[10px] text-zinc-400">{copy.date}</p><h3 className="mt-1 text-base font-bold sm:text-xl">{copy.greeting}</h3></div>
              <div className="grid size-8 place-items-center rounded-full bg-orange-100 text-orange-600"><Bell size={14}/></div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-3">
              {[[copy.cards[0],'฿48,590','+12.8%'],[copy.cards[1],'124','+8.2%'],[copy.cards[2],'38','+16.4%']].map((item,i)=><div key={item[0]} className={`rounded-xl border p-3 ${i===0?'border-orange-200 bg-orange-50':'border-zinc-100 bg-white'}`}><p className="text-[9px] text-zinc-400">{item[0]}</p><p className="mt-2 text-lg font-extrabold">{item[1]}</p><span className="text-[8px] font-semibold text-emerald-600">{item[2]}</span></div>)}
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-[1.5fr_1fr]">
              <div className="rounded-xl border border-zinc-100 bg-white p-4"><div className="flex justify-between text-[10px]"><b>{copy.weekly}</b><span className="text-zinc-400">{copy.latest}</span></div><div className="mt-5 flex h-28 items-end gap-2">{[36,54,43,70,58,86,76].map((h,i)=><div key={i} className="flex-1 rounded-t bg-orange-100" style={{height:`${h}%`}}><div className="h-full rounded-t bg-orange-500" style={{opacity:.38+i*.08}} /></div>)}</div></div>
              <div className="rounded-xl bg-zinc-950 p-4 text-white"><p className="text-[10px] font-semibold">{copy.channels}</p><div className="mx-auto my-4 grid size-20 place-items-center rounded-full border-[10px] border-orange-500 border-r-orange-200 text-center"><span className="text-base font-bold">124<small className="block text-[7px] font-normal text-zinc-400">{copy.order}</small></span></div><div className="flex justify-between text-[8px] text-zinc-400"><span>● {copy.counter}</span><span>● {copy.online}</span></div></div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-8 -left-3 w-[150px] rounded-[26px] border-[5px] border-zinc-950 bg-white p-2 shadow-2xl sm:-left-10 sm:w-[185px]">
        <div className="rounded-[17px] bg-orange-50 p-3"><div className="mx-auto mb-3 h-1 w-9 rounded bg-zinc-300"/><p className="text-[7px] font-semibold text-orange-600">MOOKATA HOUSE</p><h4 className="mt-1 text-xs font-extrabold">{copy.foodTitle}</h4><div className="mt-3 grid grid-cols-2 gap-1.5">{copy.foods.map((x,i)=><div key={x} className="rounded-lg bg-white p-1.5 shadow-sm"><div className={`mb-1 h-8 rounded ${['bg-orange-200','bg-amber-200','bg-sky-100','bg-emerald-100'][i]}`}/><p className="truncate text-[6px] font-bold">{x}</p><p className="text-[6px] text-orange-600">฿{[299,89,199,59][i]}</p></div>)}</div><button className="mt-3 w-full rounded-lg bg-zinc-950 py-2 text-[7px] font-bold text-white">{copy.cart} · ฿388</button></div>
      </div>
      <div className="absolute -right-2 top-0 flex items-center gap-2 rounded-2xl border border-white bg-white/90 p-3 shadow-xl backdrop-blur sm:-right-5"><span className="grid size-8 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Check size={16}/></span><span className="text-[10px]"><b className="block">{copy.newOrder}</b><span className="text-zinc-400">{copy.table} · ฿459</span></span></div>
    </div>
  )
}

function ProfileModal({ user, onClose, onSave }) {
  const [name, setName] = useState(user.profile.full_name || '')
  const [phone, setPhone] = useState(user.profile.phone || '')
  const [saving, setSaving] = useState(false)
  const submit = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateProfile(user.user.id, { full_name: name, phone })
      onSave({ ...user, profile: { ...user.profile, full_name: name, phone } })
      onClose()
    } catch(err) { alert(err.message) }
    setSaving(false)
  }
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-zinc-950/50 p-4 backdrop-blur-sm" onClick={e=>e.target===e.currentTarget&&onClose()}>
    <form onSubmit={submit} className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl">
      <h3 className="text-lg font-black">แก้ไขโปรไฟล์</h3>
      <p className="mt-1 text-sm text-zinc-500">{user.user.email}</p>
      <div className="mt-5 space-y-4">
        <label className="block text-sm font-bold">ชื่อ-นามสกุล<input required value={name} onChange={e=>setName(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-zinc-200 px-3 outline-none focus:border-orange-500" /></label>
        <label className="block text-sm font-bold">เบอร์โทรศัพท์<input value={phone} onChange={e=>setPhone(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-zinc-200 px-3 outline-none focus:border-orange-500" /></label>
      </div>
      <div className="mt-7 flex gap-3"><button type="button" onClick={onClose} className="h-11 flex-1 rounded-xl border border-zinc-200 font-bold">ยกเลิก</button><button disabled={saving} className="h-11 flex-1 rounded-xl bg-orange-500 font-bold text-white disabled:opacity-50">บันทึก</button></div>
    </form>
  </div>
}

function LandingPage() {
  const { language, t } = useLanguage()
  const english = language === 'en'
  const copy = english ? {
    allInOne: 'All-in-one restaurant management', hero: <>POS and<br/><span className="relative text-orange-500">online ordering<span className="absolute -bottom-1 left-0 h-2 w-full -rotate-1 rounded-full bg-orange-200/70 -z-10"/></span><br/>for every kind<br/>of restaurant</>,
    heroDescription: 'In-store sales, QR ordering, delivery, sales reports, and kitchen display — all in one system.',
    trial: 'Try for free', demo: 'View barbecue restaurant demo', benefits: ['14-day free trial', 'No credit card required', 'Ready in 5 minutes'],
    tools: 'Everything a modern restaurant needs', businessTypes: ['Restaurant', 'Cafe', 'Delivery', 'Multi-branch'],
    featuresTitle: 'One system for your whole restaurant', featuresDescription: 'Reduce busywork, speed up service, and see your business more clearly.',
    growthTitle: <>Start small, grow<br/>with your restaurant</>, growthDescription: 'Whether you have one restaurant or many branches, SmartPOS makes every order easier.',
    growthItems: ['Easy POS system', 'Kitchen KDS display', 'Real-time reports', 'QR menu ready'],
    ctaTop: 'Ready to make your restaurant smarter?', ctaTitle: 'Get started for free', ctaDescription: 'Try every feature free for 14 days. We help set up your store so you can start selling right away.', ctaButton: 'Create your store', footer: 'Every restaurant task, simple in one system'
  } : {
    allInOne: 'ระบบจัดการร้านอาหาร All-in-One', hero: <>ระบบ POS และ<br/><span className="relative text-orange-500">เว็บสั่งอาหาร<span className="absolute -bottom-1 left-0 h-2 w-full -rotate-1 rounded-full bg-orange-200/70 -z-10"/></span><br/>สำหรับร้านอาหาร<br/>ทุกประเภท</>,
    heroDescription: 'ขายหน้าร้าน สั่งผ่าน QR Code เดลิเวอรี จอครัว KDS รายงานยอดขาย — ครบในระบบเดียว',
    trial: 'ทดลองใช้งานฟรี', demo: 'ดูตัวอย่างร้านหมูกระทะ', benefits: ['ฟรี 14 วัน', 'ไม่ต้องใช้บัตรเครดิต', 'พร้อมใช้ใน 5 นาที'],
    tools: 'ครบทุกเครื่องมือที่ร้านอาหารยุคใหม่ต้องการ', businessTypes: ['ร้านอาหาร', 'คาเฟ่', 'เดลิเวอรี', 'หลายสาขา'],
    featuresTitle: 'ระบบเดียว จัดการร้านได้ครบ', featuresDescription: 'ลดความวุ่นวาย เพิ่มความเร็ว และเห็นภาพรวมธุรกิจได้ชัดเจนกว่าเดิม',
    growthTitle: <>เริ่มเล็ก แล้วเติบโต<br/>ไปพร้อมกับร้านคุณ</>, growthDescription: 'ไม่ว่าจะเป็นร้านแรกหรือหลายสิบสาขา SmartPOS ก็พร้อมช่วยให้ทุกออเดอร์เป็นเรื่องง่าย',
    growthItems: ['ระบบ POS ลื่นไหล', 'จอครัว KDS เรียลไทม์', 'รายงานเรียลไทม์', 'QR Menu พร้อมใช้'],
    ctaTop: 'พร้อมเปิดร้านให้ Smart ขึ้นหรือยัง?', ctaTitle: 'เริ่มต้นใช้งานฟรี', ctaDescription: 'ทดลองทุกฟีเจอร์ฟรี 14 วัน ให้ทีมของเราช่วยตั้งค่าร้าน พร้อมเริ่มขายได้ทันที', ctaButton: 'สมัครร้านของคุณ', footer: 'ให้ทุกเรื่องร้านอาหาร ง่ายในระบบเดียว'
  }
  const [menuOpen, setMenuOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [now, setNow] = useState(Date.now())
  const [profileModal, setProfileModal] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  useEffect(()=>{let live=true;fetchCurrentUserSummary().then(data=>{if(live)setCurrentUser(data)}).catch(()=>{});const timer=window.setInterval(()=>setNow(Date.now()),60000);return()=>{live=false;window.clearInterval(timer)}},[])
  // Close dropdown on outside click
  useEffect(()=>{
    const handler=(e)=>{ if(!e.target.closest('#profile-dropdown')) setDropdownOpen(false) }
    document.addEventListener('mousedown',handler)
    return ()=>document.removeEventListener('mousedown',handler)
  },[])
  const trialExpiredText = english ? 'Free trial ended' : 'หมดช่วงทดลองใช้ฟรีแล้ว'
  const trialRemaining = (() => {
    const end = currentUser?.subscription?.ends_at
    if (!end) return null
    const diff = Math.max(0, new Date(end).getTime() - now)
    const days = Math.floor(diff / 86400000)
    const hours = Math.floor((diff % 86400000) / 3600000)
    return diff > 0 ? (english ? `${days} days ${hours} hours remaining` : `ทดลองเหลือ ${days} วัน ${hours} ชม.`) : trialExpiredText
  })()
  const accountStatus = [currentUser?.subscription?.package || currentUser?.shop?.package, trialRemaining].filter(Boolean).join(' · ') || currentUser?.shop?.name || (english ? 'Store account' : 'บัญชีร้านค้า')
  const isTrialExpired = currentUser?.subscription?.ends_at ? (new Date(currentUser.subscription.ends_at).getTime() <= now) : false
  const hasValidSub = currentUser?.subscription && ['active','trialing'].includes(currentUser.subscription.status) && !isTrialExpired
  const scrollTo = id => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMenuOpen(false) }
  return <div className="min-h-screen overflow-hidden bg-[#fffdf9] text-zinc-950">
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200/60 bg-white/75 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Logo />
        <div className="hidden items-center gap-8 md:flex">{[['home',t('home')],['features',t('features')],['pricing',t('pricing')],['contact',t('contact')]].map(([id,label])=><button key={id} onClick={()=>id==='pricing' ? window.location.href='/pricing' : scrollTo(id)} className="text-sm font-medium text-zinc-600 transition hover:text-orange-600">{label}</button>)}</div>
        <div className="hidden items-center gap-2 md:flex">
          {currentUser ? (
            /* Profile Dropdown */
            <div id="profile-dropdown" className="relative">
              <button
                onClick={()=>setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 transition hover:border-orange-200 hover:bg-orange-50 text-left shadow-sm"
              >
                <span className="grid size-8 place-items-center rounded-lg bg-orange-100 text-orange-600"><UserCircle size={18}/></span>
                <div>
                  <p className="max-w-36 truncate text-xs font-extrabold">{currentUser.profile.full_name||currentUser.user.email}</p>
                  <p className={`mt-0.5 flex items-center gap-1 text-[10px] font-semibold ${isTrialExpired || trialRemaining===trialExpiredText?'text-red-500':'text-orange-600'}`}>
                    <Clock size={10}/>{accountStatus}
                  </p>
                </div>
                <ChevronRight size={14} className={`text-zinc-400 transition-transform ${dropdownOpen?'rotate-90':''}`}/>
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-zinc-100 bg-white shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
                    <p className="text-xs font-extrabold text-zinc-900 truncate">{currentUser.profile.full_name||currentUser.user.email}</p>
                  <p className={`text-[10px] mt-0.5 font-semibold ${isTrialExpired || trialRemaining===trialExpiredText?'text-red-500':'text-zinc-500'}`}>{accountStatus}</p>
                  </div>

                  {!hasValidSub && (
                    <div className="px-4 py-3 bg-red-50 border-b border-red-100">
                      <p className="text-[11px] font-bold text-red-600">⚠️ Subscription หมดอายุแล้ว</p>
                      <p className="text-[10px] text-red-500 mt-0.5">กรุณาต่ออายุแพ็กเกจเพื่อเข้าใช้งานร้านค้า</p>
                      <button onClick={()=>{window.location.href='/pricing';setDropdownOpen(false)}} className="mt-2 w-full rounded-lg bg-red-500 py-1.5 text-[11px] font-bold text-white hover:bg-red-600 shadow-sm">ต่ออายุแพ็กเกจ →</button>
                    </div>
                  )}

                  <div className="p-1 space-y-0.5">
                    {currentUser.profile.role === 'super_admin' && (
                      <button
                        onClick={()=>{window.location.href='/admin';setDropdownOpen(false)}}
                        className="flex w-full items-center gap-3 px-3 py-2 text-xs font-bold text-orange-600 hover:bg-orange-50 rounded-xl"
                      >
                        <ShieldCheck size={16} className="text-orange-500"/> {english ? 'Admin management' : 'จัดการระบบ Admin'}
                      </button>
                    )}

                    <button
                      onClick={()=>{
                        if (hasValidSub) {
                          window.location.href='/store/my-store/'
                        } else {
                          window.location.href='/pricing'
                        }
                        setDropdownOpen(false)
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2 text-xs font-bold text-zinc-800 hover:bg-zinc-100 rounded-xl"
                    >
                      <Store size={16} className="text-orange-500"/> {english ? 'Store management' : 'จัดการร้านค้า'}
                    </button>

                    <button onClick={()=>{setProfileModal(true);setDropdownOpen(false)}} className="flex w-full items-center gap-3 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-xl">
                      <UserCircle size={16} className="text-zinc-400"/> {english ? 'Edit profile' : 'แก้ไขโปรไฟล์'}
                    </button>
                  </div>

                  <div className="border-t border-zinc-100 p-1">
                    <button onClick={signOut} className="flex w-full items-center gap-3 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl">
                      <LogOut size={16}/> {english ? 'Sign out' : 'ออกจากระบบ'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : <><Button variant="ghost" onClick={()=>{ window.location.href='/login' }}>เข้าสู่ระบบ</Button><Button className="h-10 rounded-lg px-4" onClick={()=>{ window.location.href='/register' }}>สมัครร้าน <ArrowRight size={15}/></Button></>}
          <LanguageToggle />
        </div>
        <button className="grid size-10 place-items-center rounded-xl border border-zinc-200 md:hidden" onClick={()=>setMenuOpen(!menuOpen)} aria-label="เปิดเมนู">{menuOpen?<X/>:<Menu/>}</button>
      </div>
      {menuOpen && <div className="border-t border-zinc-100 bg-white p-5 md:hidden space-y-4 shadow-xl">
        {currentUser && (
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-sm font-extrabold text-zinc-900 truncate">{currentUser.profile.full_name||currentUser.user.email}</p>
                <p className={`text-xs font-semibold mt-0.5 ${isTrialExpired || trialRemaining===trialExpiredText ? 'text-red-500' : 'text-orange-600'}`}>
                  {accountStatus}
                </p>
              </div>
              <button onClick={() => { setProfileModal(true); setMenuOpen(false) }} className="text-xs font-bold text-orange-600 hover:underline shrink-0">
                แก้ไขโปรไฟล์
              </button>
            </div>

            {!hasValidSub && (
              <div className="rounded-xl bg-red-50 p-3 border border-red-100 space-y-2">
                <p className="text-xs font-bold text-red-600">⚠️ Subscription หมดอายุแล้ว</p>
                <button
                  onClick={()=>{ window.location.href='/pricing'; setMenuOpen(false) }}
                  className="w-full rounded-lg bg-red-500 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-600"
                >
                  ต่ออายุแพ็กเกจ →
                </button>
              </div>
            )}
          </div>
        )}

        <div className="space-y-1">
          {currentUser?.profile.role === 'super_admin' && (
            <button
              onClick={()=>{ window.location.href='/admin'; setMenuOpen(false) }}
              className="flex w-full items-center gap-3 rounded-xl bg-orange-50 px-3 py-2.5 text-sm font-bold text-orange-600 hover:bg-orange-100"
            >
              <ShieldCheck size={18}/> จัดการระบบ Admin
            </button>
          )}

          {currentUser && (
            <button
              onClick={()=>{ window.location.href=hasValidSub?'/store/my-store/':'/pricing'; setMenuOpen(false) }}
              className="flex w-full items-center gap-3 rounded-xl bg-zinc-900 px-3 py-2.5 text-sm font-bold text-white hover:bg-zinc-800"
            >
              <Store size={18}/> {hasValidSub ? 'จัดการร้านค้า' : 'เลือกแพ็กเกจ'}
            </button>
          )}
        </div>

        <div className="border-t border-zinc-100 pt-3 space-y-1">
          {[['home','Home'],['features','Features'],['pricing','Pricing'],['contact','Contact']].map(([id,label])=>(
            <button key={id} onClick={()=>id==='pricing' ? (window.location.href='/pricing') : scrollTo(id)} className="block w-full py-2 text-left text-sm font-semibold text-zinc-700 hover:text-orange-600">
              {label}
            </button>
          ))}
        </div>

        {currentUser ? (
          <Button className="w-full" variant="secondary" onClick={signOut}>
            <LogOut size={16} className="mr-2"/> ออกจากระบบ
          </Button>
        ) : (
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button variant="secondary" onClick={()=>{ window.location.href='/login' }}>เข้าสู่ระบบ</Button>
            <Button onClick={()=>{ window.location.href='/register' }}>สมัครร้าน</Button>
          </div>
        )}
      </div>}
    </nav>

    <main>
      <section id="home" className="relative px-5 pb-28 pt-36 lg:px-8 lg:pb-36 lg:pt-44">
        <div className="absolute left-0 top-0 -z-10 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-orange-100/60 blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-20 lg:grid-cols-[.92fr_1.08fr] lg:gap-10">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700"><Sparkles size={14}/>{copy.allInOne}</div>
            <h1 className="mt-7 text-4xl font-black leading-[1.15] tracking-[-.04em] sm:text-5xl lg:text-[62px]">{copy.hero}</h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-zinc-600 sm:text-lg">{copy.heroDescription}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button className="h-14 px-7 text-base" onClick={()=>{ window.location.href='/pricing' }}>{copy.trial} <ArrowRight size={18}/></Button><Button variant="secondary" className="h-14 px-7 text-base" onClick={()=>scrollTo('demo')}><Store size={18}/> {copy.demo}</Button></div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-zinc-500">{copy.benefits.map(x=><span key={x} className="flex items-center gap-1.5"><Check size={14} className="text-orange-500"/>{x}</span>)}</div>
          </div>
          <div id="demo"><DashboardMockup/></div>
        </div>
      </section>

      <section className="border-y border-zinc-200/70 bg-white/65 px-5 py-8"><div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 sm:flex-row"><p className="text-center text-sm font-semibold text-zinc-500">{copy.tools}</p><div className="flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm font-bold text-zinc-400"><span className="flex gap-2"><Utensils/>{copy.businessTypes[0]}</span><span className="flex gap-2"><ChefHat/>{copy.businessTypes[1]}</span><span className="flex gap-2"><ShoppingBag/>{copy.businessTypes[2]}</span><span className="flex gap-2"><Store/>{copy.businessTypes[3]}</span></div></div></section>

      <section id="features" className="px-5 py-24 lg:px-8 lg:py-32"><div className="mx-auto max-w-7xl"><div className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold uppercase tracking-[.18em] text-orange-500">Power your restaurant</p><h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{copy.featuresTitle}</h2><p className="mt-5 text-zinc-500">{copy.featuresDescription}</p></div><div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">{features.map(({icon:Icon,...f},i)=><Card key={f.label} className={`group relative overflow-hidden p-6 transition duration-300 hover:-translate-y-2 hover:shadow-[0_30px_80px_rgba(249,115,22,.13)] ${i===0?'lg:-rotate-1':''}`}><div className="absolute -right-10 -top-10 size-32 rounded-full bg-orange-100/60 blur-2xl transition group-hover:bg-orange-200"/><div className="relative"><div className={`grid size-12 place-items-center rounded-2xl ${f.tone==='zinc'?'bg-zinc-950 text-white':'bg-orange-100 text-orange-600'}`}><Icon/></div><p className="mt-6 text-[10px] font-black tracking-[.18em] text-orange-500">{f.label}</p><h3 className="mt-2 text-xl font-extrabold leading-snug">{english ? ['Easy sales, smooth counter', 'Customers order at their table', 'Online orders, zero GP', 'Real-time business insights'][i] : f.title}</h3><p className="mt-3 text-sm leading-6 text-zinc-500">{english ? ['Take orders, payments, and table management in one fast screen.', 'Scan a QR code, browse the menu, place an order, and call staff.', 'A store-owned ordering site for delivery and pickup orders.', 'See best sellers, inventory, profit, and every branch anywhere.'][i] : f.description}</p><div className="mt-7 flex items-center justify-between border-t border-zinc-100 pt-4"><b className="text-sm">{f.stat}</b><ChevronRight size={17} className="text-orange-500 transition group-hover:translate-x-1"/></div></div></Card>)}</div></div></section>

      <section id="pricing" className="px-5 pb-24 lg:px-8"><div className="mx-auto max-w-7xl overflow-hidden rounded-[40px] bg-zinc-950 px-6 py-16 text-white sm:px-12 lg:px-16"><div className="grid items-center gap-10 lg:grid-cols-2"><div><p className="text-sm font-bold uppercase tracking-[.18em] text-orange-500">Built to grow</p><h2 className="mt-4 text-3xl font-black sm:text-5xl">{copy.growthTitle}</h2><p className="mt-5 max-w-lg leading-7 text-zinc-400">{copy.growthDescription}</p></div><div className="grid gap-3 sm:grid-cols-2">{[[PackageCheck,copy.growthItems[0]],[Bell,copy.growthItems[1]],[BarChart3,copy.growthItems[2]],[QrCode,copy.growthItems[3]]].map(([Icon,text])=><div key={text} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"><span className="grid size-10 place-items-center rounded-xl bg-orange-500/15 text-orange-500"><Icon size={19}/></span><span className="text-sm font-semibold">{text}</span></div>)}</div></div></div></section>

      <section id="cta" className="px-5 pb-24 lg:px-8"><div className="relative mx-auto max-w-7xl overflow-hidden rounded-[40px] bg-orange-500 px-6 py-16 text-center text-white sm:px-12 lg:py-20"><div className="absolute -left-20 -top-20 size-72 rounded-full border-[40px] border-white/10"/><div className="absolute -bottom-28 -right-10 size-80 rounded-full border-[55px] border-zinc-950/10"/><div className="relative"><p className="text-sm font-bold uppercase tracking-[.18em] text-orange-100">{copy.ctaTop}</p><h2 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">{copy.ctaTitle}</h2><p className="mx-auto mt-5 max-w-xl text-orange-50">{copy.ctaDescription}</p><Button onClick={()=>{ window.location.href='/register' }} className="mt-8 h-14 bg-zinc-950 px-8 text-base shadow-xl hover:bg-zinc-800">{copy.ctaButton} <ArrowRight size={18}/></Button></div></div></section>
    </main>

    <footer id="contact" className="border-t border-zinc-200 bg-white px-5 py-10 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-7 md:flex-row"><div><Logo/><p className="mt-3 text-sm text-zinc-500">{copy.footer}</p></div><div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-zinc-500"><a href="#features" className="hover:text-orange-500">{t('features')}</a><a href="#pricing" className="hover:text-orange-500">{t('pricing')}</a><a href="mailto:hello@smartpos.co" className="hover:text-orange-500">hello@smartpos.co</a><a href="tel:020000000" className="hover:text-orange-500">02-000-0000</a></div><p className="text-xs text-zinc-400">© 2026 SmartPOS</p></div></footer>
    {profileModal && currentUser && <ProfileModal user={currentUser} onClose={() => setProfileModal(false)} onSave={setCurrentUser} />}
  </div>
}

const StorefrontApp = lazy(() => import('./storefront/StorefrontApp'))

export default function App() {
  const [, setBrandReady] = useState(false)
  useEffect(() => { const cached=readCachedBranding();if(cached)applyBranding(cached,false);watchBranding();fetchPublicSettings().then(settings => { if (!settings) return;applyBranding(settings);setBrandReady(true) });fetchCurrentUserSummary().then(applyAdminIdentity).catch(()=>{}) }, [])
  const withLanguageSwitch = page => window.location.pathname.startsWith('/admin')
    ? page
    : <><div className="fixed right-4 top-4 z-[120]"><LanguageToggle /></div>{page}</>
  if (window.location.pathname.startsWith('/store/')) return <Suspense fallback={<div className="grid min-h-screen place-items-center bg-zinc-950 text-sm font-bold text-white">กำลังเปิด Store Workspace…</div>}><StoreOwnerApp /></Suspense>
  if (window.location.pathname.startsWith('/qr/') || window.location.pathname.startsWith('/s/')) return <Suspense fallback={<div className="grid min-h-screen place-items-center bg-zinc-50 text-sm font-bold text-zinc-500">กำลังโหลดหน้าร้าน…</div>}><StorefrontApp /></Suspense>
  if (window.location.pathname === '/register') return withLanguageSwitch(<RegisterPage />)
  if (window.location.pathname === '/login') return withLanguageSwitch(<LoginPage />)
  if (window.location.pathname === '/pricing') return withLanguageSwitch(<PricingPage />)
  if (window.location.pathname === '/checkout') return withLanguageSwitch(<Suspense fallback={<div className="grid min-h-screen place-items-center">กำลังโหลด…</div>}><CheckoutPage /></Suspense>)
  if (window.location.pathname === '/create-store') return withLanguageSwitch(<Suspense fallback={<div className="grid min-h-screen place-items-center">กำลังโหลด…</div>}><CreateStorePage /></Suspense>)
  if (window.location.pathname === '/admin') return withLanguageSwitch(<Suspense fallback={<div className="grid min-h-screen place-items-center bg-zinc-50 text-sm font-bold text-zinc-500">กำลังโหลด Dashboard…</div>}><AdminDashboard /></Suspense>)
  if (window.location.pathname === '/admin/stores') return withLanguageSwitch(<Suspense fallback={<div className="grid min-h-screen place-items-center bg-zinc-50 text-sm font-bold text-zinc-500">กำลังโหลดร้านค้า…</div>}><StoreManagement /></Suspense>)
  if (window.location.pathname === '/admin/packages') return withLanguageSwitch(<Suspense fallback={<div className="grid min-h-screen place-items-center bg-zinc-50 text-sm font-bold text-zinc-500">กำลังโหลดแพ็กเกจ…</div>}><PackageManagement /></Suspense>)
  if (window.location.pathname === '/admin/analytics') return withLanguageSwitch(<Suspense fallback={<div className="grid min-h-screen place-items-center bg-zinc-50 text-sm font-bold text-zinc-500">กำลังโหลด Analytics…</div>}><AnalyticsPage /></Suspense>)
  if (window.location.pathname === '/admin/settings') return withLanguageSwitch(<Suspense fallback={<div className="grid min-h-screen place-items-center bg-zinc-50 text-sm font-bold text-zinc-500">กำลังโหลด Setting…</div>}><SettingsPage /></Suspense>)
  if (window.location.pathname === '/admin/revenue') return withLanguageSwitch(<Suspense fallback={<div className="grid min-h-screen place-items-center">กำลังโหลดรายได้…</div>}><RevenuePage /></Suspense>)
  if (window.location.pathname === '/admin/members') return withLanguageSwitch(<Suspense fallback={<div className="grid min-h-screen place-items-center">กำลังโหลดสมาชิก…</div>}><MembersPage /></Suspense>)
  return <LandingPage />
}
