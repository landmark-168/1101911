import { lazy, Suspense, useEffect, useState } from 'react';import { QueryClient, QueryClientProvider } from '@tanstack/react-query';import { BarChart3, Bell, Boxes, ChefHat, ChevronDown, CircleDollarSign, ClipboardList, Gift, LayoutDashboard, Menu as MenuIcon, Moon, PanelLeftClose, Search, Settings, ShoppingBag, Store, Sun, Tags, Users, Utensils, X, AlertTriangle, CreditCard } from 'lucide-react';import Dashboard from './components/dashboard/Dashboard';import Orders from './components/orders/Orders';import POS from './components/pos/POS';import Kitchen from './components/kitchen/Kitchen';import ManagementPage from './components/management/ManagementPage';import Reports from './components/reports/Reports';import StoreSettings from './components/settings/Settings'
import { StoreProvider } from './StoreContext'
import { fetchCurrentUserSummary } from '../lib/database'
const queryClient=new QueryClient({defaultOptions:{queries:{staleTime:30000,retry:1}}})
const nav=[['dashboard','Dashboard',LayoutDashboard],['orders','Orders',ClipboardList],['pos','POS',CircleDollarSign],['menu','Menu',Utensils],['categories','Categories',Tags],['tables','Tables',Store],['kitchen','Kitchen',ChefHat],['inventory','Inventory',Boxes],['promotions','Promotions',Gift],['customers','Customers',Users],['employees','Employees',Users],['reports','Reports',BarChart3],['settings','Store Settings',Settings]] as const

function SubscriptionExpiredWall(){
  return(
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-6">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden">
        <div className="bg-red-500 px-8 py-10 text-center text-white">
          <AlertTriangle size={48} className="mx-auto mb-4 opacity-90"/>
          <h2 className="text-2xl font-black">Subscription หมดอายุแล้ว</h2>
          <p className="mt-2 text-sm text-red-100">การใช้งานระบบจัดการร้านถูกระงับชั่วคราว</p>
        </div>
        <div className="p-8 space-y-4">
          <p className="text-sm text-zinc-600 text-center leading-6">
            กรุณาต่ออายุแพ็กเกจเพื่อกลับมาใช้งาน<br/>
            ข้อมูลร้านของคุณยังคงอยู่ครบถ้วน
          </p>
          <button
            onClick={()=>window.location.href='/pricing'}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-4 text-base font-black text-white shadow-lg hover:bg-orange-600 transition"
          >
            <CreditCard size={20}/> ต่ออายุแพ็กเกจ
          </button>
          <button
            onClick={()=>window.location.href='/'}
            className="block w-full text-center py-3 text-sm font-semibold text-zinc-400 hover:text-zinc-600"
          >
            กลับหน้าแรก
          </button>
        </div>
      </div>
    </div>
  )
}

function App(){const slug=location.pathname.split('/')[2]||'demo';const key=location.pathname.split('/')[3]||'dashboard';const [active,setActive]=useState(key);const [mobile,setMobile]=useState(false);const [dark,setDark]=useState(()=>localStorage.getItem('store-theme')==='dark');const [subStatus,setSubStatus]=useState<'loading'|'ok'|'expired'>('loading');useEffect(()=>{document.documentElement.classList.toggle('dark',dark);localStorage.setItem('store-theme',dark?'dark':'light')},[dark]);useEffect(()=>{fetchCurrentUserSummary().then((u:any)=>{const isExpired=u?.subscription?.ends_at?(new Date(u.subscription.ends_at).getTime()<=Date.now()):false;const valid=u?.subscription&&['active','trialing'].includes(u.subscription.status)&&!isExpired;setSubStatus(valid?'ok':'expired')}).catch(()=>setSubStatus('ok'))},[]);const go=(x:string)=>{history.pushState({},'',`/store/${slug}/${x==='dashboard'?'':x}`);setActive(x);setMobile(false)};useEffect(()=>{const p=()=>setActive(location.pathname.split('/')[3]||'dashboard');addEventListener('popstate',p);return()=>removeEventListener('popstate',p)},[]);let page:any=<Dashboard navigate={go}/>;if(active==='orders')page=<Orders/>;else if(active==='pos')page=<POS/>;else if(active==='kitchen')page=<Kitchen/>;else if(active==='reports')page=<Reports/>;else if(active==='settings')page=<StoreSettings/>;else if(['menu','categories','tables','inventory','promotions','customers','employees'].includes(active))page=<ManagementPage kind={active}/>;return <div className="min-h-screen bg-[#f7f7f8] text-zinc-900 dark:bg-zinc-950">{subStatus==='expired'&&<SubscriptionExpiredWall/>}<aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-zinc-950 text-white transition-transform lg:translate-x-0 ${mobile?'translate-x-0':'-translate-x-full'}`}><div className="flex h-18 items-center justify-between border-b border-white/10 px-5"><div className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-orange-500 text-lg">🍊</span><div><b className="block text-sm">SmartPOS</b><span className="text-[10px] text-zinc-500">STORE OWNER</span></div></div><button onClick={()=>setMobile(false)} className="lg:hidden"><X/></button></div><div className="mx-3 mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"><span className="grid size-9 place-items-center rounded-lg bg-orange-500/15">OT</span><div className="min-w-0 flex-1"><b className="block truncate text-xs">The Orange Table</b><span className="text-[10px] text-emerald-400">● Open now</span></div><ChevronDown size={14} className="text-zinc-500"/></div><nav className="mt-3 flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">{nav.map(([id,label,Icon])=><button onClick={()=>go(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active===id?'bg-orange-500 text-white shadow-lg shadow-orange-950/30':'text-zinc-400 hover:bg-white/5 hover:text-white'}`}><Icon size={17}/>{label}{id==='orders'&&<span className="ml-auto rounded-full bg-white/15 px-2 text-[10px]">8</span>}</button>)}</nav><div className="border-t border-white/10 p-3"><div className="flex items-center gap-3 rounded-xl p-2"><span className="grid size-9 place-items-center rounded-full bg-orange-100 text-xs font-black text-orange-700">PS</span><div className="min-w-0 flex-1"><b className="block truncate text-xs">Palm Somchai</b><span className="text-[10px] text-zinc-500">Store Owner</span></div></div></div></aside>{mobile&&<button onClick={()=>setMobile(false)} className="fixed inset-0 z-40 bg-black/50 lg:hidden"/>}<div className="lg:pl-64"><header className="sticky top-0 z-30 flex h-18 items-center gap-3 border-b border-zinc-200/70 bg-white/85 px-4 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/85 lg:px-6"><button onClick={()=>setMobile(true)} className="grid size-10 place-items-center rounded-xl border dark:border-zinc-700 lg:hidden"><MenuIcon/></button><label className="hidden h-10 max-w-sm flex-1 items-center gap-2 rounded-xl bg-zinc-100 px-3 text-zinc-400 dark:bg-zinc-900 sm:flex"><Search size={16}/><input className="w-full bg-transparent text-sm outline-none" placeholder="Search anything..."/><kbd className="text-[10px]">⌘K</kbd></label><div className="ml-auto flex items-center gap-2"><button onClick={()=>setDark(!dark)} className="grid size-10 place-items-center rounded-xl border bg-white text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">{dark?<Sun size={17}/>:<Moon size={17}/>}</button><button className="relative grid size-10 place-items-center rounded-xl border bg-white text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"><Bell size={17}/><i className="absolute right-2 top-2 size-2 rounded-full bg-orange-500 ring-2 ring-white dark:ring-zinc-900"/></button><button onClick={()=>go('pos')} className="hidden h-10 items-center gap-2 rounded-xl bg-orange-500 px-4 text-xs font-bold text-white sm:flex"><CircleDollarSign size={16}/> Open POS</button></div></header><main className="p-4 lg:p-6"><Suspense fallback={<div className="grid min-h-80 place-items-center text-sm text-zinc-400">Loading workspace…</div>}>{page}</Suspense></main></div></div>}
export default function StoreOwnerApp(){return <QueryClientProvider client={queryClient}><StoreProvider><App/></StoreProvider></QueryClientProvider>}

