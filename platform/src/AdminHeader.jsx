import { useState } from 'react'
import { Bell, ChevronDown, Menu, Search } from 'lucide-react'

export default function AdminHeader({ onOpenSidebar, title, category }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  
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
        <div className="relative">
          <button onClick={()=>setNotificationsOpen(!notificationsOpen)} className="relative grid size-10 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-50" aria-label="การแจ้งเตือน">
            <Bell size={18}/>
            <span className="absolute right-2 top-2 size-2 rounded-full bg-orange-500 ring-2 ring-white"/>
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 top-12 w-72 rounded-2xl border border-zinc-200 bg-white p-3 shadow-2xl">
              <div className="flex items-center justify-between px-2 py-1"><b className="text-sm">การแจ้งเตือน</b><span className="text-[10px] font-bold text-orange-600">3 รายการใหม่</span></div>
              {['มีร้านค้าใหม่สมัครใช้งาน','การชำระเงินสำเร็จ ฿1,290','รายงานประจำเดือนพร้อมแล้ว'].map((x,i)=><div key={x} className="mt-2 flex gap-3 rounded-xl bg-zinc-50 p-3"><span className={`mt-1 size-2 shrink-0 rounded-full ${i<2?'bg-orange-500':'bg-zinc-300'}`}/><div><p className="text-xs font-semibold">{x}</p><p className="mt-1 text-[10px] text-zinc-400">{i+1} ชั่วโมงที่แล้ว</p></div></div>)}
            </div>
          )}
        </div>
        <div className="mx-1 hidden h-7 w-px bg-zinc-200 sm:block"/>
        <button className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-zinc-50">
          <span className="grid size-9 place-items-center rounded-xl bg-zinc-950 text-xs font-black text-white">SA</span>
          <div className="hidden text-left md:block"><p className="text-xs font-bold">Super Admin</p><p className="text-[10px] text-zinc-400">ผู้ดูแลระบบ</p></div>
          <ChevronDown size={15} className="hidden text-zinc-400 md:block"/>
        </button>
      </div>
    </header>
  )
}
