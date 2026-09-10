import { useState, useEffect } from 'react'
import { Bell, ChevronDown, Menu, Search, LogOut, Home } from 'lucide-react'
import { getCurrentProfile, signOut } from './lib/database'
import { LanguageToggle, useLanguage } from './lib/language'

export default function AdminHeader({ onOpenSidebar, title, category }) {
  const { language } = useLanguage()
  const english = language === 'en'
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [profileData, setProfileData] = useState(null)

  useEffect(() => {
    let live = true
    getCurrentProfile().then(res => {
      if (live && res) setProfileData(res)
    }).catch(() => {})
    return () => { live = false }
  }, [])

  const user = profileData?.profile
  const email = profileData?.session?.user?.email || 'admin@smartpos.co'
  const name = user?.full_name || 'Admin100'
  const initial = name.substring(0, 2).toUpperCase()
  const roleLabel = user?.role === 'super_admin' ? (english ? 'Administrator' : 'ผู้ดูแลระบบ') : (english ? 'Store owner' : 'เจ้าของร้าน')

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center border-b border-zinc-200 bg-white/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <button onClick={onOpenSidebar} className="mr-3 grid size-10 place-items-center rounded-xl border border-zinc-200 text-zinc-600 lg:hidden" aria-label="เปิดเมนู"><Menu size={20}/></button>
      
      {title ? (
        <div className="hidden sm:block">
          {category && <p className="text-xs text-zinc-400">{category}</p>}
          <b className="text-sm font-extrabold">{title}</b>
        </div>
      ) : (
        <div className="relative hidden w-full max-w-sm sm:block">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"/>
          <input className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm outline-none transition focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100" placeholder="ค้นหาร้านค้า สมาชิก..."/>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <LanguageToggle />
        <div className="relative">
          <button onClick={()=>{ setNotificationsOpen(!notificationsOpen); setUserMenuOpen(false); }} className="relative grid size-10 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-50" aria-label={english ? 'Notifications' : 'การแจ้งเตือน'}>
            <Bell size={18}/>
            <span className="absolute right-2 top-2 size-2 rounded-full bg-orange-500 ring-2 ring-white"/>
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 top-12 w-72 rounded-2xl border border-zinc-200 bg-white p-3 shadow-2xl z-50">
              <div className="flex items-center justify-between px-2 py-1"><b className="text-sm">{english ? 'Notifications' : 'การแจ้งเตือน'}</b><span className="text-[10px] font-bold text-orange-600">{english ? '3 new items' : '3 รายการใหม่'}</span></div>
              {(english ? ['A new store has signed up', 'Payment of ฿1,290 completed', 'Monthly report is ready'] : ['มีร้านค้าใหม่สมัครใช้งาน','การชำระเงินสำเร็จ ฿1,290','รายงานประจำเดือนพร้อมแล้ว']).map((x,i)=><div key={x} className="mt-2 flex gap-3 rounded-xl bg-zinc-50 p-3"><span className={`mt-1 size-2 shrink-0 rounded-full ${i<2?'bg-orange-500':'bg-zinc-300'}`}/><div><p className="text-xs font-semibold">{x}</p><p className="mt-1 text-[10px] text-zinc-400">{english ? `${i+1} hours ago` : `${i+1} ชั่วโมงที่แล้ว`}</p></div></div>)}
            </div>
          )}
        </div>
        <div className="mx-1 hidden h-7 w-px bg-zinc-200 sm:block"/>
        
        <div className="relative">
          <button onClick={() => { setUserMenuOpen(!userMenuOpen); setNotificationsOpen(false); }} className="flex items-center gap-2.5 rounded-xl p-1.5 transition hover:bg-zinc-100/80 active:bg-zinc-200/60">
            <span className="grid size-9 place-items-center rounded-xl bg-zinc-950 text-xs font-black text-white shadow-sm">{initial}</span>
            <div className="hidden text-left md:block">
              <p className="text-xs font-extrabold text-zinc-900 leading-tight">{name}</p>
              <p className="text-[10px] font-medium text-zinc-400">{roleLabel}</p>
            </div>
            <ChevronDown size={15} className={`hidden text-zinc-400 transition-transform md:block ${userMenuOpen ? 'rotate-180' : ''}`}/>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-13 w-64 rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3 border border-zinc-100">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-orange-500 text-xs font-black text-white shadow-md shadow-orange-500/20">{initial}</span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-zinc-900">{name}</p>
                  <p className="truncate text-[10px] text-zinc-400 mt-0.5">{email}</p>
                </div>
              </div>
              <div className="mt-2 space-y-1">
                <a href="/" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition">
                  <Home size={15} className="text-zinc-500"/> หน้าหลัก Platform
                </a>
                <button onClick={signOut} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition">
                  <LogOut size={15} className="text-red-500"/> ออกจากระบบ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
