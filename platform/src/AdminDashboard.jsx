import { useEffect, useState } from 'react'
import {
  BarChart3, Bell, ChevronDown, ChevronRight, CircleDollarSign, CreditCard,
  LayoutDashboard, Menu, Package, Search, Settings, ShieldCheck, Store,
  LogOut, TrendingUp, UserRound, Users, WalletCards, X, Zap,
} from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import { fetchAdminDashboard, requireSuperAdmin, signOut } from './lib/database'

const navItems = [
  ['Dashboard', LayoutDashboard], ['ร้านค้า', Store], ['แพ็กเกจ', Package],
  ['รายได้', CircleDollarSign], ['สมาชิก', Users], ['Analytics', BarChart3],
]

const revenueData = [
  { month: 'ม.ค.', revenue: 580000 }, { month: 'ก.พ.', revenue: 720000 },
  { month: 'มี.ค.', revenue: 680000 }, { month: 'เม.ย.', revenue: 890000 },
  { month: 'พ.ค.', revenue: 1080000 }, { month: 'มิ.ย.', revenue: 1248000 },
  { month: 'ก.ค.', revenue: 1380000 }, { month: 'ส.ค.', revenue: 1520000 },
  { month: 'ก.ย.', revenue: 1680000 }, { month: 'ต.ค.', revenue: 1850000 },
  { month: 'พ.ย.', revenue: 2070000 }, { month: 'ธ.ค.', revenue: 2380000 },
]

const newStoresData = [
  { month: 'ก.ค.', stores: 42 }, { month: 'ส.ค.', stores: 58 }, { month: 'ก.ย.', stores: 51 },
  { month: 'ต.ค.', stores: 73 }, { month: 'พ.ย.', stores: 68 }, { month: 'ธ.ค.', stores: 94 },
]

const recentStores = [
  { name: 'Mellow Brew Cafe', owner: 'ณัฐชา พรหมดี', plan: 'Business', date: '15 ธ.ค. 2026', status: 'Active', color: 'bg-amber-100 text-amber-700' },
  { name: 'ครัวบ้านสวน', owner: 'กิตติภพ รุ่งเรือง', plan: 'Starter', date: '15 ธ.ค. 2026', status: 'Active', color: 'bg-emerald-100 text-emerald-700' },
  { name: 'Ocean Table', owner: 'พิมพ์ชนก วัฒนะ', plan: 'Enterprise', date: '14 ธ.ค. 2026', status: 'Pending', color: 'bg-sky-100 text-sky-700' },
  { name: 'Nom Nom Bakery', owner: 'วรัญญา สุขใจ', plan: 'Business', date: '14 ธ.ค. 2026', status: 'Active', color: 'bg-pink-100 text-pink-700' },
  { name: 'อิ่มอร่อย ชาบู', owner: 'ธนกร ศรีทอง', plan: 'Starter', date: '13 ธ.ค. 2026', status: 'Inactive', color: 'bg-orange-100 text-orange-700' },
]

const defaultCards = [
  { label: 'จำนวนร้านทั้งหมด', value: '0', change: 'ข้อมูลจริง', detail: 'ร้านค้าในระบบ', icon: Store, tone: 'orange' },
  { label: 'รายได้รวม', value: '฿0', change: 'ข้อมูลจริง', detail: 'รายได้ที่ชำระแล้ว', icon: WalletCards, tone: 'emerald' },
  { label: 'ผู้ใช้งานทั้งหมด', value: '0', change: 'ข้อมูลจริง', detail: 'สมาชิกในระบบ', icon: Users, tone: 'violet' },
  { label: 'Subscription', value: '0', change: 'ข้อมูลจริง', detail: 'แพ็กเกจที่ใช้งานอยู่', icon: CreditCard, tone: 'sky' },
]

const tones = {
  orange: 'bg-orange-100 text-orange-600', emerald: 'bg-emerald-100 text-emerald-600',
  violet: 'bg-violet-100 text-violet-600', sky: 'bg-sky-100 text-sky-600',
}

function Logo() {
  return <a href="/" className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-orange-500 text-white"><Zap size={18} fill="currentColor"/></span><span className="text-lg font-extrabold text-white">Smart<span className="text-orange-500">POS</span></span><span className="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-zinc-400">ADMIN</span></a>
}

function Sidebar({ open, onClose, active, setActive, storeCount }) {
  return <>
    {open && <button aria-label="ปิดเมนู" onClick={onClose} className="fixed inset-0 z-40 bg-zinc-950/50 backdrop-blur-sm lg:hidden"/>}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col bg-zinc-950 px-4 py-5 text-white transition-transform duration-300 lg:translate-x-0 ${open?'translate-x-0':'-translate-x-full'}`}>
      <div className="flex h-12 items-center justify-between px-2"><Logo/><button onClick={onClose} className="grid size-9 place-items-center rounded-lg text-zinc-400 hover:bg-white/10 lg:hidden"><X size={20}/></button></div>
      <div className="mt-8 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-zinc-600">Management</div>
      <nav className="mt-3 space-y-1">
        {navItems.map(([label,Icon])=><button key={label} onClick={()=>{if(label==='ร้านค้า'){window.location.href='/admin/stores';return}if(label==='แพ็กเกจ'){window.location.href='/admin/packages';return}if(label==='Analytics'){window.location.href='/admin/analytics';return}setActive(label);onClose()}} className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${active===label?'bg-orange-500 text-white shadow-lg shadow-orange-500/15':'text-zinc-400 hover:bg-white/5 hover:text-white'}`}><Icon size={19}/>{label}{label==='ร้านค้า'&&<span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{Number(storeCount || 0).toLocaleString()}</span>}</button>)}
      </nav>
      <div className="mt-8 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-zinc-600">System</div>
      <a href="/admin/settings" className="mt-3 flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-zinc-400 transition hover:bg-white/5 hover:text-white"><Settings size={19}/>Setting</a>
      <button onClick={signOut} className="mt-1 flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400"><LogOut size={19}/>ออกจากระบบ</button>
      <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-3.5">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-orange-500 font-black">SA</span><div className="min-w-0"><p className="truncate text-xs font-bold">Super Admin</p><p className="mt-0.5 truncate text-[10px] text-zinc-500">admin@smartpos.co</p></div><ChevronRight size={15} className="ml-auto text-zinc-600"/></div>
      </div>
    </aside>
  </>
}

function ChartTooltip({ active, payload, label, currency = false }) {
  if (!active || !payload?.length) return null
  return <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-xl"><p className="text-xs text-zinc-400">{label}</p><p className="mt-1 text-sm font-extrabold text-zinc-900">{currency?'฿':''}{Number(payload[0].value).toLocaleString()}</p></div>
}

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [active, setActive] = useState('Dashboard')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [cards, setCards] = useState(defaultCards)
  const [revenueData, setRevenueData] = useState([])
  const [newStoresData, setNewStoresData] = useState([])
  const [recentStores, setRecentStores] = useState([])
  const [dbError, setDbError] = useState('')
  const [authorizing, setAuthorizing] = useState(true)
  useEffect(()=>{let live=true;(async()=>{try{const auth=await requireSuperAdmin();if(!auth.session){window.location.replace('/login');return}if(!auth.allowed){window.location.replace('/');return}const data=await fetchAdminDashboard();if(!live)return;setRevenueData(data.revenue);setNewStoresData(data.newStores);setRecentStores(data.recent.map((s,i)=>({...s,plan:s.package,date:s.created,color:['bg-amber-100 text-amber-700','bg-emerald-100 text-emerald-700','bg-sky-100 text-sky-700','bg-pink-100 text-pink-700','bg-orange-100 text-orange-700'][i]})));setCards([{...defaultCards[0],value:Number(data.stats.stores||0).toLocaleString()},{...defaultCards[1],value:`฿${Number(data.stats.revenue||0).toLocaleString()}`},{...defaultCards[2],value:Number(data.stats.users||0).toLocaleString()},{...defaultCards[3],value:Number(data.stats.subscriptions||0).toLocaleString()}])}catch(error){if(live)setDbError(error.message)}finally{if(live)setAuthorizing(false)}})();return()=>{live=false}},[])

  if (authorizing) return <div className="grid min-h-screen place-items-center bg-zinc-50 text-sm font-bold text-zinc-500">กำลังตรวจสอบสิทธิ์…</div>

  return <div className="min-h-screen bg-[#f7f7f8] text-zinc-950">
    <Sidebar open={sidebarOpen} onClose={()=>setSidebarOpen(false)} active={active} setActive={setActive} storeCount={Number(cards[0]?.value?.replaceAll(',','')) || 0}/>
    <div className="lg:pl-[270px]">
      <header className="sticky top-0 z-30 flex h-[72px] items-center border-b border-zinc-200 bg-white/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <button onClick={()=>setSidebarOpen(true)} className="mr-3 grid size-10 place-items-center rounded-xl border border-zinc-200 text-zinc-600 lg:hidden" aria-label="เปิดเมนู"><Menu size={20}/></button>
        <div className="relative hidden w-full max-w-sm sm:block"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"/><input className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm outline-none transition focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100" placeholder="ค้นหาร้านค้า สมาชิก..."/></div>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="relative"><button onClick={()=>setNotificationsOpen(!notificationsOpen)} className="relative grid size-10 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-50" aria-label="การแจ้งเตือน"><Bell size={18}/><span className="absolute right-2 top-2 size-2 rounded-full bg-orange-500 ring-2 ring-white"/></button>{notificationsOpen&&<div className="absolute right-0 top-12 w-72 rounded-2xl border border-zinc-200 bg-white p-3 shadow-2xl"><div className="flex items-center justify-between px-2 py-1"><b className="text-sm">การแจ้งเตือน</b><span className="text-[10px] font-bold text-orange-600">3 รายการใหม่</span></div>{['มีร้านค้าใหม่สมัครใช้งาน','การชำระเงินสำเร็จ ฿1,290','รายงานประจำเดือนพร้อมแล้ว'].map((x,i)=><div key={x} className="mt-2 flex gap-3 rounded-xl bg-zinc-50 p-3"><span className={`mt-1 size-2 shrink-0 rounded-full ${i<2?'bg-orange-500':'bg-zinc-300'}`}/><div><p className="text-xs font-semibold">{x}</p><p className="mt-1 text-[10px] text-zinc-400">{i+1} ชั่วโมงที่แล้ว</p></div></div>)}</div>}</div>
          <div className="mx-1 hidden h-7 w-px bg-zinc-200 sm:block"/>
          <button className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-zinc-50"><span className="grid size-9 place-items-center rounded-xl bg-zinc-950 text-xs font-black text-white">SA</span><div className="hidden text-left md:block"><p className="text-xs font-bold">Super Admin</p><p className="text-[10px] text-zinc-400">ผู้ดูแลระบบ</p></div><ChevronDown size={15} className="hidden text-zinc-400 md:block"/></button>
        </div>
      </header>

      <main className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-[1500px]">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-zinc-400">วันอังคารที่ 15 ธันวาคม 2026</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Dashboard Overview</h1><p className="mt-2 text-sm text-zinc-500">ภาพรวมประสิทธิภาพของ SmartPOS วันนี้</p></div><button className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-zinc-200 bg-white px-4 text-xs font-bold shadow-sm hover:bg-zinc-50"><ShieldCheck size={16} className="text-emerald-500"/> ระบบทำงานปกติ</button></div>

          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(({label,value,change,detail,icon:Icon,tone})=><article key={label} className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="flex items-start justify-between"><span className={`grid size-11 place-items-center rounded-2xl ${tones[tone]}`}><Icon size={21}/></span><span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-extrabold text-emerald-600"><TrendingUp size={11}/>{change}</span></div><p className="mt-5 text-xs font-semibold text-zinc-400">{label}</p><p className="mt-1 text-2xl font-black tracking-tight">{value}</p><p className="mt-2 text-[11px] text-zinc-400">{detail}</p></article>)}
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1.7fr_1fr]">
            <article className="min-w-0 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between"><div><h2 className="font-extrabold">Monthly Revenue</h2><p className="mt-1 text-xs text-zinc-400">รายได้รวมตลอด 12 เดือน</p></div><select className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold outline-none"><option>ปี 2026</option><option>ปี 2025</option></select></div><div className="mt-6 h-[290px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={revenueData} margin={{top:5,right:4,left:-15,bottom:0}}><defs><linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f65a1b" stopOpacity={0.3}/><stop offset="100%" stopColor="#f65a1b" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee"/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#a1a1aa'}}/><YAxis axisLine={false} tickLine={false} tick={{fontSize:10,fill:'#a1a1aa'}} tickFormatter={v=>`${v/1000000}M`}/><Tooltip content={<ChartTooltip currency/>}/><Area type="monotone" dataKey="revenue" stroke="#f65a1b" strokeWidth={3} fill="url(#revenue)" activeDot={{r:5,fill:'#f65a1b',stroke:'#fff',strokeWidth:3}}/></AreaChart></ResponsiveContainer></div></article>

            <article className="min-w-0 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm sm:p-6"><div><h2 className="font-extrabold">ร้านเปิดใหม่</h2><p className="mt-1 text-xs text-zinc-400">จำนวนร้านใหม่ใน 6 เดือนล่าสุด</p></div><div className="mt-6 h-[230px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={newStoresData} margin={{top:5,right:0,left:-25,bottom:0}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee"/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#a1a1aa'}}/><YAxis axisLine={false} tickLine={false} tick={{fontSize:10,fill:'#a1a1aa'}}/><Tooltip content={<ChartTooltip/>}/><Bar dataKey="stores" radius={[6,6,0,0]}>{newStoresData.map((_,i)=><Cell key={i} fill={i===newStoresData.length-1?'#f65a1b':'#fed7aa'}/>)}</Bar></BarChart></ResponsiveContainer></div><div className="mt-3 flex items-center justify-between rounded-xl bg-orange-50 p-3"><div><p className="text-[10px] font-semibold text-orange-700">ร้านใหม่เดือนนี้</p><p className="mt-0.5 text-xl font-black text-orange-600">{newStoresData.at(-1)?.stores || 0} ร้าน</p></div><span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-emerald-600">ข้อมูลจริง</span></div></article>
          </section>

          <section className="mt-5 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-zinc-100 px-5 py-5 sm:px-6"><div><h2 className="font-extrabold">Recent Store</h2><p className="mt-1 text-xs text-zinc-400">ร้านค้าที่สมัครเข้ามาล่าสุด</p></div><button className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700">ดูทั้งหมด <ChevronRight size={14}/></button></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-400"><th className="px-6 py-3 font-bold">ร้านค้า</th><th className="px-4 py-3 font-bold">เจ้าของร้าน</th><th className="px-4 py-3 font-bold">แพ็กเกจ</th><th className="px-4 py-3 font-bold">วันที่สมัคร</th><th className="px-4 py-3 font-bold">สถานะ</th><th className="px-6 py-3"/></tr></thead><tbody>{recentStores.map((store,i)=><tr key={store.name} className="border-t border-zinc-100 transition hover:bg-orange-50/30"><td className="px-6 py-3.5"><div className="flex items-center gap-3"><span className={`grid size-9 place-items-center rounded-xl text-xs font-black ${store.color}`}>{store.name.slice(0,1)}</span><div><p className="text-xs font-bold">{store.name}</p><p className="mt-0.5 text-[10px] text-zinc-400">ID: SP-{2847-i}</p></div></div></td><td className="px-4 py-3.5 text-xs text-zinc-600">{store.owner}</td><td className="px-4 py-3.5"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${store.plan==='Enterprise'?'bg-violet-100 text-violet-700':store.plan==='Business'?'bg-orange-100 text-orange-700':'bg-zinc-100 text-zinc-600'}`}>{store.plan}</span></td><td className="px-4 py-3.5 text-xs text-zinc-500">{store.date}</td><td className="px-4 py-3.5"><span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${store.status==='Active'?'text-emerald-600':store.status==='Pending'?'text-amber-600':'text-zinc-400'}`}><span className="size-1.5 rounded-full bg-current"/>{store.status}</span></td><td className="px-6 py-3.5 text-right"><button className="rounded-lg px-2 py-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">•••</button></td></tr>)}</tbody></table></div></section>
        </div>
      </main>
    </div>
  </div>
}
