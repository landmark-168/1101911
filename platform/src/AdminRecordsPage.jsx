import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CircleDollarSign, LayoutDashboard, LogOut, Package, Pencil, Search, Settings, Store, Trash2, Users, X, Zap } from 'lucide-react'
import { adminDeleteMember, adminUpdateMemberFull, fetchAdminMembers, fetchAdminRevenue, requireSuperAdmin, signOut } from './lib/database'
import AdminHeader from './AdminHeader'

const nav=[['Dashboard',LayoutDashboard,'/admin'],['ร้านค้า',Store,'/admin/stores'],['แพ็กเกจ',Package,'/admin/packages'],['รายได้',CircleDollarSign,'/admin/revenue'],['สมาชิก',Users,'/admin/members'],['Analytics',BarChart3,'/admin/analytics']]
const money=n=>`฿${Number(n||0).toLocaleString()}`
const date=v=>v?new Date(v).toLocaleDateString('th-TH',{day:'2-digit',month:'short',year:'numeric'}):'-'

const getSub = item => {
  if (!item?.subscriptions) return null
  if (Array.isArray(item.subscriptions)) return item.subscriptions[0] || null
  return item.subscriptions
}

const getShop = item => {
  if (!item?.shops) return null
  if (Array.isArray(item.shops)) return item.shops[0] || null
  return item.shops
}

function Sidebar({open,close,active}){return <><button onClick={close} className={`fixed inset-0 z-40 bg-black/50 lg:hidden ${open?'block':'hidden'}`}/><aside className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col bg-zinc-950 p-4 text-white transition-transform lg:translate-x-0 ${open?'translate-x-0':'-translate-x-full'}`}><a href="/" className="flex h-14 items-center gap-2 px-2"><span className="grid size-9 place-items-center rounded-xl bg-orange-500"><Zap size={18} fill="currentColor"/></span><b className="text-lg">SmartPOS</b><small className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-zinc-400">ADMIN</small><button onClick={close} className="ml-auto lg:hidden"><X/></button></a><p className="mt-7 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Management</p><nav className="mt-3 space-y-1">{nav.map(([label,Icon,href])=><a key={label} href={href} className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold ${label===active?'bg-orange-500 text-white':'text-zinc-400 hover:bg-white/5 hover:text-white'}`}><Icon size={19}/>{label}</a>)}</nav><p className="mt-7 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-600">System</p><a href="/admin/settings" className="mt-3 flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-zinc-400"><Settings size={19}/>Setting</a><button onClick={signOut} className="mt-1 flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-zinc-400 hover:text-red-400"><LogOut size={19}/>ออกจากระบบ</button></aside></>}

function MemberFullModal({ member, onClose, onSave, onDelete }) {
  const sub = getSub(member)
  const [fullName, setFullName] = useState(member?.full_name || '')
  const [phone, setPhone] = useState(member?.phone || '')
  const [role, setRole] = useState(member?.role || 'shop_owner')
  const [packageName, setPackageName] = useState(sub?.package || 'Starter')
  const [billingCycle, setBillingCycle] = useState(sub?.billing_cycle || 'yearly')
  const [status, setStatus] = useState(sub?.status || 'active')
  const [endsAt, setEndsAt] = useState(() => {
    if (sub?.ends_at) {
      try { return new Date(sub.ends_at).toISOString().split('T')[0] } catch { }
    }
    return new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (member) {
      const s = getSub(member)
      setFullName(member.full_name || '')
      setPhone(member.phone || '')
      setRole(member.role || 'shop_owner')
      setPackageName(s?.package || 'Starter')
      setBillingCycle(s?.billing_cycle || 'yearly')
      setStatus(s?.status || 'active')
      if (s?.ends_at) {
        try { setEndsAt(new Date(s.ends_at).toISOString().split('T')[0]) } catch {}
      } else {
        setEndsAt(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0])
      }
    }
  }, [member])

  if (!member) return null

  const addDays = days => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    setEndsAt(d.toISOString().split('T')[0])
  }

  const submit = async e => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({
        userId: member.id,
        fullName,
        phone,
        role,
        packageName,
        billingCycle,
        status,
        endsAt: new Date(endsAt).toISOString()
      })
      onClose()
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`ยืนยันการลบบัญชีสมาชิก "${member.full_name || member.email}" ออกจากระบบ?`)) return
    setDeleting(true)
    try {
      await onDelete(member.id)
      onClose()
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการลบสมาชิก')
      setDeleting(false)
    }
  }

  const initial = String(member.full_name || member.email || 'U').charAt(0).toUpperCase()

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-zinc-950/60 p-4 backdrop-blur-sm overflow-y-auto" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
      <form onSubmit={submit} className="my-8 w-full max-w-xl rounded-[28px] bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between border-b pb-5">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-orange-100 text-lg font-black text-orange-600">
              {initial}
            </span>
            <div>
              <h2 className="text-xl font-black text-zinc-900">จัดการข้อมูลสมาชิก</h2>
              <p className="text-xs text-zinc-400 mt-0.5">{member.email}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl text-zinc-400 hover:bg-zinc-100"><X size={18}/></button>
        </div>

        <div className="mt-6 space-y-5 text-left">
          <div className="rounded-2xl bg-zinc-50 p-4 space-y-3 border border-zinc-100">
            <p className="text-xs font-black uppercase tracking-wider text-zinc-400">1. ข้อมูลส่วนตัว</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold text-zinc-700">
                ชื่อ-นามสกุล
                <input required value={fullName} onChange={e=>setFullName(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:border-orange-500"/>
              </label>
              <label className="block text-xs font-bold text-zinc-700">
                เบอร์โทรศัพท์
                <input value={phone} onChange={e=>setPhone(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:border-orange-500" placeholder="08X-XXX-XXXX"/>
              </label>
            </div>
          </div>

          <div className="rounded-2xl bg-zinc-50 p-4 space-y-3 border border-zinc-100">
            <p className="text-xs font-black uppercase tracking-wider text-zinc-400">2. บทบาทและสิทธิ์การใช้งาน (Role)</p>
            <label className="block text-xs font-bold text-zinc-700">
              ประเภทสิทธิ์
              <select value={role} onChange={e=>setRole(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border bg-white px-3 text-sm font-semibold outline-none focus:border-orange-500">
                <option value="shop_owner">Shop Owner (เจ้าของร้าน)</option>
                <option value="staff">Staff (พนักงานร้าน)</option>
                <option value="super_admin">Super Admin (ผู้ดูแลระบบสูงสุด)</option>
              </select>
            </label>
          </div>

          <div className="rounded-2xl bg-zinc-50 p-4 space-y-3 border border-zinc-100">
            <p className="text-xs font-black uppercase tracking-wider text-zinc-400">3. แพ็กเกจการใช้งาน & Subscription</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold text-zinc-700">
                เลือกแพ็กเกจ
                <select value={packageName} onChange={e=>setPackageName(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border bg-white px-3 text-sm font-semibold outline-none focus:border-orange-500">
                  <option value="Starter">Starter Plan</option>
                  <option value="Business">Business Plan</option>
                  <option value="Enterprise">Enterprise Plan</option>
                </select>
              </label>
              <label className="block text-xs font-bold text-zinc-700">
                รอบการชำระเงิน
                <select value={billingCycle} onChange={e=>setBillingCycle(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border bg-white px-3 text-sm font-semibold outline-none focus:border-orange-500">
                  <option value="yearly">รายปี (Yearly)</option>
                  <option value="monthly">รายเดือน (Monthly)</option>
                </select>
              </label>
            </div>

            <label className="block text-xs font-bold text-zinc-700">
              สถานะการเปิดใช้งาน
              <select value={status} onChange={e=>setStatus(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border bg-white px-3 text-sm font-semibold outline-none focus:border-orange-500">
                <option value="active">Active (เปิดใช้งานได้ปกติ)</option>
                <option value="trialing">Trialing (ทดลองใช้ฟรี)</option>
                <option value="expired">Expired (หมดอายุการใช้งาน)</option>
                <option value="cancelled">Cancelled (ยกเลิกแล้ว)</option>
              </select>
            </label>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                กำหนดวันหมดอายุ (Ends At)
              </label>
              <input type="date" value={endsAt} onChange={e=>setEndsAt(e.target.value)} required className="h-10 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:border-orange-500"/>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button type="button" onClick={()=>addDays(7)} className="rounded-lg bg-white border px-2.5 py-1 text-[11px] font-bold text-zinc-600 hover:bg-zinc-100">+7 วัน</button>
                <button type="button" onClick={()=>addDays(30)} className="rounded-lg bg-white border px-2.5 py-1 text-[11px] font-bold text-zinc-600 hover:bg-zinc-100">+30 วัน (1 เดือน)</button>
                <button type="button" onClick={()=>addDays(365)} className="rounded-lg bg-orange-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-orange-600">+1 ปี</button>
                <button type="button" onClick={()=>addDays(1095)} className="rounded-lg bg-orange-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-orange-600">+3 ปี</button>
              </div>
            </div>
          </div>

          {error && <p className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">{error}</p>}
        </div>

        <div className="mt-7 flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-5">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-2 rounded-xl"
          >
            <Trash2 size={15}/> {deleting ? 'กำลังลบ…' : 'ลบบัญชีสมาชิก'}
          </button>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button type="button" onClick={onClose} className="h-11 flex-1 sm:flex-none px-5 rounded-xl border font-bold text-xs">ยกเลิก</button>
            <button disabled={saving} className="h-11 flex-1 sm:flex-none px-6 rounded-xl bg-orange-500 font-bold text-xs text-white shadow-lg hover:bg-orange-600 disabled:opacity-50">
              {saving ? 'กำลังบันทึก…' : 'บันทึกการเปลี่ยนแปลง'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default function AdminRecordsPage({type}){
  const revenue=type==='revenue',active=revenue?'รายได้':'สมาชิก';
  const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[side,setSide]=useState(false);
  const [editingMember, setEditingMember] = useState(null);

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const auth = await requireSuperAdmin()
      if (!auth?.session) return location.replace('/login')
      if (!auth?.allowed) return location.replace('/')
      const data = await (revenue ? fetchAdminRevenue() : fetchAdminMembers())
      setRows(data || [])
    } catch (e) {
      setError(e?.message || 'ไม่สามารถโหลดข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [revenue]);

  const handleSaveMember = async (changes) => {
    await adminUpdateMemberFull(changes)
    await loadData()
  }

  const handleDeleteMember = async (userId) => {
    await adminDeleteMember(userId)
    await loadData()
  }

  const shown=useMemo(()=>(rows || []).filter(r=>{
    if (!r) return false
    const sub = getSub(r)
    const shop = getShop(r)
    const prof = r.profiles || null
    const text = revenue
      ? [prof?.full_name, prof?.email, sub?.package, r.status]
      : [r.full_name, r.email, r.phone, r.role, shop?.name];
    return text.filter(Boolean).join(' ').toLowerCase().includes((query || '').toLowerCase()) && (filter === 'all' || (revenue ? r.status : r.role) === filter)
  }),[rows,query,filter,revenue]);

  const paid=(rows || []).filter(x=>x?.status==='paid'),total=paid.reduce((s,x)=>s+Number(x?.amount || 0),0),owners=(rows || []).filter(x=>x?.role==='shop_owner').length;
  const cards=revenue?[['รายได้รวม',money(total)],['ชำระสำเร็จ',paid.length.toLocaleString()],['รอดำเนินการ',(rows || []).filter(x=>x?.status==='pending').length.toLocaleString()],['คืนเงิน',money((rows || []).filter(x=>x?.status==='refunded').reduce((s,x)=>s+Number(x?.amount || 0),0))]]:[['สมาชิกทั้งหมด',(rows || []).length.toLocaleString()],['เจ้าของร้าน (Shop Owner)',owners.toLocaleString()],['พนักงาน (Staff)',(rows || []).filter(x=>x?.role==='staff').length.toLocaleString()],['Super Admin',(rows || []).filter(x=>x?.role==='super_admin').length.toLocaleString()]];

  const roleStyle = {
    super_admin: 'bg-amber-100 text-amber-800 border-amber-200',
    shop_owner: 'bg-violet-100 text-violet-800 border-violet-200',
    staff: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  }

  const subStatusStyle = {
    active: 'bg-emerald-50 text-emerald-700',
    trialing: 'bg-sky-50 text-sky-700',
    expired: 'bg-red-50 text-red-600',
    cancelled: 'bg-zinc-100 text-zinc-500'
  }

  return <div className="min-h-screen bg-zinc-50"><Sidebar open={side} close={()=>setSide(false)} active={active}/><div className="lg:pl-[270px]">
  <AdminHeader onOpenSidebar={() => setSide(true)} category={revenue ? 'Management' : 'System'} title={revenue ? 'Revenue Management' : 'Member Management'} />
  <main className="p-4 sm:p-7"><div className="mx-auto max-w-[1450px]">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-3xl font-black">{active}</h1>
        <p className="mt-1.5 text-sm text-zinc-500">{revenue?'ตรวจสอบรายการชำระเงินและรายได้ทั้งหมด':'จัดการบัญชีสมาชิก สิทธิ์การใช้งาน และแพ็กเกจในระบบ'}</p>
      </div>
    </div>

    {error&&<p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
    
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([a,b])=><div key={a} className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold text-zinc-400">{a}</p>
        <p className="mt-2 text-2xl font-black">{b}</p>
      </div>)}
    </div>

    <section className="mt-6 overflow-visible rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search className="absolute left-3.5 top-3 text-zinc-400" size={17}/>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ค้นหาชื่อ, อีเมล, เบอร์โทร หรือร้านค้า..." className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-3 text-sm outline-none focus:border-orange-500 focus:bg-white"/>
        </label>
        <select value={filter} onChange={e=>setFilter(e.target.value)} className="h-11 rounded-xl border border-zinc-200 bg-white px-4 text-xs font-bold outline-none">
          <option value="all">ทุกบทบาท (Roles)</option>
          {(revenue?['paid','pending','failed','refunded']:['shop_owner','staff','super_admin']).map(x=><option key={x} value={x}>{x}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[950px] text-left text-sm">
          <thead className="bg-zinc-50 text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
            <tr>
              {(revenue ? ['ร้านค้า','แพ็กเกจ','จำนวนเงิน','สถานะ','วันที่'] : ['สมาชิก (User)','เบอร์โทร','ร้านค้าที่สังกัด','แพ็กเกจ','สถานะ','บทบาท (Role)','วันที่สมัคร','การจัดการ']).map(x=><th key={x} className="px-5 py-4">{x}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {shown.map(r => {
              if (!r) return null
              const sub = getSub(r)
              const shop = getShop(r)
              const prof = r.profiles || null
              const initial = String(r.full_name || r.email || 'U').charAt(0).toUpperCase()

              return revenue ? (
                <tr key={r.id}>
                  <td className="px-5 py-4"><b>{prof?.full_name || prof?.email || '-'}</b><small className="block text-zinc-400">{prof?.email || '-'}</small></td>
                  <td className="px-5">{sub?.package || '-'}<small className="block text-zinc-400">{sub?.billing_cycle || '-'}</small></td>
                  <td className="px-5 font-black">{money(r.amount)}</td>
                  <td className="px-5"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${r.status==='paid'?'bg-emerald-50 text-emerald-600':r.status==='failed'?'bg-red-50 text-red-600':'bg-amber-50 text-amber-600'}`}>{r.status}</span></td>
                  <td className="px-5 text-zinc-500">{date(r.paid_at||r.created_at)}</td>
                </tr>
              ) : (
                <tr key={r.id} className="hover:bg-orange-50/20 transition">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-orange-100 text-sm font-black text-orange-600 shrink-0">
                        {initial}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-zinc-900 truncate">{r.full_name || '-'}</p>
                        <p className="text-xs text-zinc-400 truncate">{r.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 text-xs text-zinc-600 font-medium">{r.phone || '-'}</td>
                  <td className="px-5 text-xs font-semibold text-zinc-700">{shop?.name || '-'}</td>
                  <td className="px-5">
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-700">
                      {sub?.package || 'Starter'}
                    </span>
                  </td>
                  <td className="px-5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${subStatusStyle[sub?.status] || 'bg-zinc-100 text-zinc-500'}`}>
                      <span className="size-1.5 rounded-full bg-current"/>
                      {sub?.status || 'no_sub'}
                    </span>
                  </td>
                  <td className="px-5">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold ${roleStyle[r.role] || 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
                      {r.role}
                    </span>
                  </td>
                  <td className="px-5 text-xs text-zinc-400 font-medium">{date(r.created_at)}</td>
                  <td className="px-5 relative">
                    <button
                      onClick={() => setEditingMember(r)}
                      className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 shadow-sm hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 transition"
                    >
                      <Pencil size={13}/> จัดการสมาชิก
                    </button>
                  </td>
                </tr>
              )
            })}</tbody>
        </table>

        {!loading&&!shown.length&&<p className="py-16 text-center text-sm font-bold text-zinc-400">ไม่พบข้อมูลสมาชิกที่ค้นหา</p>}
        {loading&&<p className="py-16 text-center text-sm font-bold text-zinc-400">กำลังโหลดข้อมูล…</p>}
      </div>
    </section>
  </div></main></div>

  <MemberFullModal
    key={editingMember?.id || 'none'}
    member={editingMember}
    onClose={() => setEditingMember(null)}
    onSave={handleSaveMember}
    onDelete={handleDeleteMember}
  />
</div>
}
