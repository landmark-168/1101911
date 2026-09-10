import { useEffect, useState } from 'react'
import { BarChart3, CircleDollarSign, Globe2, LayoutDashboard, LogOut, Mail, Package, Palette, Save, Settings, SlidersHorizontal, Store, Users, WalletCards, X, Zap } from 'lucide-react'
import AdminHeader from './AdminHeader'
import { fetchSettings, requireSuperAdmin, saveSettings, signOut } from './lib/database'
import { applyBranding } from './lib/branding'

const emptySettings = {
  general: { system_name: 'SmartPOS', timezone: 'Asia/Bangkok', language: 'th' },
  brand: { logo_url: '', primary_color: '#f65a1b', support_email: '' },
  payment: { currency: 'THB', stripe_enabled: false, stripe_publishable_key: '' },
  smtp: { enabled: false, host: '', port: '587', username: '', password: '', from_name: 'SmartPOS', from_email: '' },
  promptpay: { enabled: false, type: 'phone', account: '', account_name: '' },
  domain: { app_url: '', custom_domain: '', ssl_enabled: true },
}

const nav = [
  ['แดชบอร์ด', LayoutDashboard, '/admin'],
  ['ร้านค้า', Store, '/admin/stores'],
  ['แพ็กเกจ', Package, '/admin/packages'],
  ['รายได้', CircleDollarSign, '/admin/revenue'],
  ['สมาชิก', Users, '/admin/members'],
  ['การวิเคราะห์', BarChart3, '/admin/analytics'],
]

const tabs = [
  ['general', 'ข้อมูลทั่วไป', SlidersHorizontal],
  ['brand', 'แบรนด์และโลโก้', Palette],
  ['payment', 'ช่องทางชำระเงิน', WalletCards],
  ['smtp', 'ระบบอีเมล (SMTP)', Mail],
  ['promptpay', 'พร้อมเพย์ (PromptPay)', WalletCards],
  ['domain', 'โดเมนและเว็บไซต์', Globe2],
]

function Sidebar({ open, close }) {
  return (
    <>
      <button
        onClick={close}
        aria-label="ปิดเมนู"
        className={`fixed inset-0 z-40 bg-zinc-950/50 lg:hidden ${open ? 'block' : 'hidden'}`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col bg-zinc-950 p-4 text-white transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-14 items-center justify-between px-2">
          <a href="/" className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-orange-500">
              <Zap size={18} fill="currentColor" />
            </span>
            <b className="text-lg">
              Smart<span className="text-orange-500">POS</span>
            </b>
            <small className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-zinc-400">ผู้ดูแลระบบ</small>
          </a>
          <button onClick={close} className="lg:hidden" aria-label="ปิด">
            <X />
          </button>
        </div>
        <p className="mt-7 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-600">การจัดการ</p>
        <nav className="mt-3 space-y-1">
          {nav.map(([label, Icon, href]) => (
            <a
              key={label}
              href={href}
              className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-zinc-400 hover:bg-white/5 hover:text-white"
            >
              <Icon size={19} />
              {label}
            </a>
          ))}
        </nav>
        <p className="mt-7 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-600">ระบบ</p>
        <a
          href="/admin/settings"
          className="mt-3 flex h-11 items-center gap-3 rounded-xl bg-orange-500 px-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20"
        >
          <Settings size={19} />
          ตั้งค่าระบบ
        </a>
        <button
          onClick={signOut}
          className="mt-1 flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-zinc-400 hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut size={19} />
          ออกจากระบบ
        </button>
      </aside>
    </>
  )
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-zinc-700">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-zinc-400">{hint}</span>}
    </label>
  )
}

const inputClass = 'mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100'

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
      <span className="text-sm font-bold">{label}</span>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="size-4 accent-orange-500" />
    </label>
  )
}

export default function SettingsPage() {
  const [sidebar, setSidebar] = useState(false)
  const [tab, setTab] = useState('general')
  const [data, setData] = useState(emptySettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const auth = await requireSuperAdmin()
        if (!auth.session) return location.replace('/login')
        if (!auth.allowed) return location.replace('/')
        const result = await fetchSettings()
        if (live) {
          setData(Object.fromEntries(Object.keys(emptySettings).map(k => [k, { ...emptySettings[k], ...(result?.[k] || {}) }])))
        }
      } catch (e) {
        if (live) setError(e.message)
      } finally {
        if (live) setLoading(false)
      }
    })()
    return () => {
      live = false
    }
  }, [])

  const set = (section, key, value) =>
    setData(old => {
      const next = { ...old, [section]: { ...old[section], [key]: value } }
      if (section === 'brand' || section === 'general') applyBranding(next, false)
      return next
    })

  const submit = async () => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const saved = await saveSettings(data)
      const next = { ...data, ...saved }
      setData(next)
      applyBranding(next)
      setNotice('บันทึกและนำการตั้งค่าไปใช้งานเรียบร้อยแล้ว')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-zinc-50 text-sm font-bold text-zinc-500">กำลังโหลดการตั้งค่าระบบ…</div>
  }

  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      <Sidebar open={sidebar} close={() => setSidebar(false)} />
      <div className="lg:pl-[270px]">
        <AdminHeader onOpenSidebar={() => setSidebar(true)} category="ระบบ" title="ตั้งค่าระบบ" />
        <main className="p-4 sm:p-7 lg:p-8">
          <div className="mx-auto max-w-6xl">
            <h1 className="text-3xl font-black">ตั้งค่าระบบ</h1>
            <p className="mt-2 text-sm text-zinc-500">จัดการข้อมูลทั่วไป แบรนด์ ช่องทางการชำระเงิน และการเชื่อมต่อต่าง ๆ</p>
            {notice && <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</p>}
            {error && <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</p>}
            <div className="mt-7 grid gap-5 lg:grid-cols-[240px_1fr]">
              <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-2 lg:block lg:space-y-1">
                {tabs.map(([id, label, Icon]) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`flex h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-sm font-bold transition lg:w-full ${tab === id ? 'bg-orange-50 text-orange-600' : 'text-zinc-500 hover:bg-zinc-50'}`}
                  >
                    <Icon size={18} />
                    {label}
                  </button>
                ))}
              </nav>
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-6">
                  <h2 className="text-xl font-black">{tabs.find(x => x[0] === tab)?.[1]}</h2>
                  <p className="mt-1 text-xs text-zinc-400">แก้ไขข้อมูลด้านล่างแล้วกดบันทึกการตั้งค่า</p>
                </div>

                {tab === 'general' && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="ชื่อระบบ">
                      <input className={inputClass} value={data.general.system_name} onChange={e => set('general', 'system_name', e.target.value)} />
                    </Field>
                    <Field label="เขตเวลา">
                      <select className={inputClass} value={data.general.timezone} onChange={e => set('general', 'timezone', e.target.value)}>
                        <option>Asia/Bangkok</option>
                        <option>UTC</option>
                      </select>
                    </Field>
                    <Field label="ภาษาเริ่มต้น">
                      <select className={inputClass} value={data.general.language} onChange={e => set('general', 'language', e.target.value)}>
                        <option value="th">ภาษาไทย (TH)</option>
                        <option value="en">English (EN)</option>
                      </select>
                    </Field>
                  </div>
                )}

                {tab === 'brand' && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="ลิงก์รูปภาพโลโก้ (Logo URL)">
                      <input className={inputClass} placeholder="https://..." value={data.brand.logo_url} onChange={e => set('brand', 'logo_url', e.target.value)} />
                    </Field>
                    <Field label="โทนสีหลัก">
                      <div className="mt-2 flex gap-2">
                        <input
                          type="color"
                          className="h-11 w-14 rounded-xl border border-zinc-200 p-1"
                          value={data.brand.primary_color}
                          onChange={e => set('brand', 'primary_color', e.target.value)}
                        />
                        <input
                          className={`${inputClass} mt-0`}
                          value={data.brand.primary_color}
                          onChange={e => set('brand', 'primary_color', e.target.value)}
                        />
                      </div>
                    </Field>
                    <Field label="อีเมลติดต่อฝ่ายสนับสนุน (Support Email)">
                      <input
                        type="email"
                        className={inputClass}
                        value={data.brand.support_email}
                        onChange={e => set('brand', 'support_email', e.target.value)}
                      />
                    </Field>
                  </div>
                )}

                {tab === 'payment' && (
                  <div className="space-y-5">
                    <Toggle label="เปิดรับชำระเงินออนไลน์ผ่านบัตร (Stripe)" checked={data.payment.stripe_enabled} onChange={v => set('payment', 'stripe_enabled', v)} />
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="สกุลเงิน">
                        <select className={inputClass} value={data.payment.currency} onChange={e => set('payment', 'currency', e.target.value)}>
                          <option value="THB">บาท (THB)</option>
                          <option value="USD">ดอลลาร์สหรัฐ (USD)</option>
                        </select>
                      </Field>
                      <Field label="Stripe Publishable Key" hint="ใช้เฉพาะ Publishable Key ฝั่งหน้าเว็บ ห้ามใส่ Secret Key">
                        <input
                          type="password"
                          className={inputClass}
                          value={data.payment.stripe_publishable_key}
                          onChange={e => set('payment', 'stripe_publishable_key', e.target.value)}
                        />
                      </Field>
                    </div>
                  </div>
                )}

                {tab === 'smtp' && (
                  <div className="space-y-5">
                    <Toggle label="เปิดใช้งานระบบส่งอีเมล (SMTP)" checked={data.smtp.enabled} onChange={v => set('smtp', 'enabled', v)} />
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="SMTP โฮสต์ (Host)">
                        <input className={inputClass} value={data.smtp.host} onChange={e => set('smtp', 'host', e.target.value)} />
                      </Field>
                      <Field label="พอร์ต (Port)">
                        <input type="number" className={inputClass} value={data.smtp.port} onChange={e => set('smtp', 'port', e.target.value)} />
                      </Field>
                      <Field label="ชื่อผู้ใช้ (Username)">
                        <input className={inputClass} value={data.smtp.username} onChange={e => set('smtp', 'username', e.target.value)} />
                      </Field>
                      <Field label="รหัสผ่าน (Password)">
                        <input type="password" className={inputClass} value={data.smtp.password} onChange={e => set('smtp', 'password', e.target.value)} />
                      </Field>
                      <Field label="ชื่อผู้ส่ง">
                        <input className={inputClass} value={data.smtp.from_name} onChange={e => set('smtp', 'from_name', e.target.value)} />
                      </Field>
                      <Field label="อีเมลผู้ส่ง">
                        <input type="email" className={inputClass} value={data.smtp.from_email} onChange={e => set('smtp', 'from_email', e.target.value)} />
                      </Field>
                    </div>
                  </div>
                )}


                {tab === 'promptpay' && (
                  <div className="space-y-5">
                    <Toggle label="เปิดรับชำระผ่านพร้อมเพย์ (PromptPay QR)" checked={data.promptpay.enabled} onChange={v => set('promptpay', 'enabled', v)} />
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="ประเภทบัญชี">
                        <select className={inputClass} value={data.promptpay.type} onChange={e => set('promptpay', 'type', e.target.value)}>
                          <option value="phone">เบอร์โทรศัพท์</option>
                          <option value="national_id">เลขบัตรประชาชน / เลขประจำตัวผู้เสียภาษี</option>
                          <option value="ewallet">e-Wallet ID</option>
                        </select>
                      </Field>
                      <Field label="หมายเลขพร้อมเพย์">
                        <input className={inputClass} value={data.promptpay.account} onChange={e => set('promptpay', 'account', e.target.value)} />
                      </Field>
                      <Field label="ชื่อบัญชี">
                        <input className={inputClass} value={data.promptpay.account_name} onChange={e => set('promptpay', 'account_name', e.target.value)} />
                      </Field>
                    </div>
                  </div>
                )}

                {tab === 'domain' && (
                  <div className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="URL ของแอปพลิเคชัน">
                        <input
                          type="url"
                          className={inputClass}
                          placeholder="https://app.smartpos.co"
                          value={data.domain.app_url}
                          onChange={e => set('domain', 'app_url', e.target.value)}
                        />
                      </Field>
                      <Field label="โดเมนที่กำหนดเอง (Custom Domain)">
                        <input
                          className={inputClass}
                          placeholder="pos.yourdomain.com"
                          value={data.domain.custom_domain}
                          onChange={e => set('domain', 'custom_domain', e.target.value)}
                        />
                      </Field>
                    </div>
                    <Toggle label="บังคับใช้ HTTPS / SSL เพื่อความปลอดภัย" checked={data.domain.ssl_enabled} onChange={v => set('domain', 'ssl_enabled', v)} />
                  </div>
                )}

                <div className="mt-8 flex flex-col gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center">
                  <p className="text-xs leading-5 text-zinc-400">ข้อมูลลับสำหรับระบบจริงควรจัดเก็บในพื้นที่ปลอดภัยหรือตัวแปรสภาพแวดล้อมเซิร์ฟเวอร์</p>
                  <button
                    onClick={submit}
                    disabled={saving}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-bold text-white sm:ml-auto"
                  >
                    <Save size={16} />
                    {saving ? 'กำลังบันทึกข้อมูล…' : 'บันทึกการตั้งค่า'}
                  </button>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
