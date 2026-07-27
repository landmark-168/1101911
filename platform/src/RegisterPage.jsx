import { useState } from 'react'
import {
  ArrowLeft, Check, Eye, EyeOff,
  LockKeyhole, Mail, ShieldCheck, Store, UserCircle, X, Phone, MapPin, Map, Utensils, ChevronDown
} from 'lucide-react'
import { supabase } from './lib/supabase'

const shopTypes = ['ร้านอาหาร', 'คาเฟ่ / ร้านกาแฟ', 'เบเกอรี', 'ฟู้ดทรัก', 'ร้านเครื่องดื่ม', 'ร้านค้าปลีก', 'อื่น ๆ']
const provinces = [
  'กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยนาท',
  'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก', 'นครปฐม', 'นครพนม', 'นครราชสีมา',
  'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน', 'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์',
  'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา', 'พะเยา', 'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์',
  'แพร่', 'ภูเก็ต', 'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี',
  'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ', 'สมุทรสงคราม',
  'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์', 'หนองคาย',
  'หนองบัวลำภู', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี',
]

const initialForm = { fullName: '', email: '', password: '', confirmPassword: '', shopName: '', shopType: '', phone: '', province: '', address: '', latitude: '13.7563', longitude: '100.5018', accepted: false }

function Brand({ inverted = false }) {
  return <a href="/" className="inline-flex items-center gap-3" aria-label="SmartPOS">
    <span className="grid size-10 place-items-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/20"><Store size={21} strokeWidth={2.3}/></span>
    <span className={`text-xl font-extrabold tracking-tight ${inverted ? 'text-white' : 'text-zinc-950'}`}>Smart<span className="text-orange-500">POS</span></span>
  </a>
}

function Field({ label, required, error, icon: Icon, children }) {
  return <div>
    <label className="mb-2 block text-sm font-semibold text-zinc-800">{label}{required && <span className="ml-1 text-orange-500">*</span>}</label>
    <div className="relative">
      {Icon && <Icon size={18} className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${error ? 'text-red-400' : 'text-zinc-400'}`}/>} 
      {children}
    </div>
    {error && <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-500"><X size={13}/>{error}</p>}
  </div>
}

export default function RegisterPage() {
  const [form, setForm] = useState(initialForm)
  const [touched, setTouched] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [locating, setLocating] = useState(false)

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { setSubmitError('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      position => { setForm(prev => ({ ...prev, latitude:position.coords.latitude.toFixed(6), longitude:position.coords.longitude.toFixed(6) })); setLocating(false); setSubmitError('') },
      () => { setLocating(false); setSubmitError('ไม่สามารถอ่านตำแหน่งได้ กรุณาอนุญาต Location หรือกรอกพิกัดเอง') },
      { enableHighAccuracy:true, timeout:10000 },
    )
  }

  const validate = (data = form) => ({
    fullName: !data.fullName.trim() ? 'กรุณากรอกชื่อ–นามสกุล' : data.fullName.trim().length < 4 ? 'กรุณากรอกชื่อ–นามสกุลให้ครบถ้วน' : '',
    email: !data.email ? 'กรุณากรอกอีเมล' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) ? 'รูปแบบอีเมลไม่ถูกต้อง' : '',
    shopName: !data.shopName.trim() ? 'กรุณากรอกชื่อร้าน' : data.shopName.trim().length < 2 ? 'ชื่อร้านต้องมีอย่างน้อย 2 ตัวอักษร' : '',
    shopType: !data.shopType ? 'กรุณาเลือกประเภทร้าน' : '',
    phone: !data.phone ? 'กรุณากรอกเบอร์โทรศัพท์' : !/^0\d{8,9}$/.test(data.phone.replace(/[-\s]/g, '')) ? 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง' : '',
    province: !data.province ? 'กรุณาเลือกจังหวัด' : '',
    address: !data.address.trim() ? 'กรุณากรอกที่อยู่ร้าน' : data.address.trim().length < 10 ? 'กรุณากรอกที่อยู่ให้ละเอียดขึ้น' : '',
    password: !data.password ? 'กรุณากรอกรหัสผ่าน' : data.password.length < 8 ? 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' : !/(?=.*[A-Za-z])(?=.*\d)/.test(data.password) ? 'ต้องประกอบด้วยตัวอักษรและตัวเลข' : '',
    confirmPassword: !data.confirmPassword ? 'กรุณายืนยันรหัสผ่าน' : data.confirmPassword !== data.password ? 'รหัสผ่านไม่ตรงกัน' : '',
    accepted: !data.accepted ? 'กรุณายอมรับข้อตกลงและนโยบายความเป็นส่วนตัว' : '',
  })
  const errors = validate()
  const inputClass = (name, extra = '') => `h-12 w-full rounded-xl border bg-white px-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:ring-4 ${errors[name] && touched[name] ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-zinc-200 hover:border-zinc-300 focus:border-orange-400 focus:ring-orange-100'} ${extra}`
  const update = (name, value) => setForm(prev => ({ ...prev, [name]: value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setTouched(Object.fromEntries(Object.keys(initialForm).map(key => [key, true])))
    if (Object.values(validate()).some(Boolean)) {
      document.querySelector('[aria-invalid="true"]')?.focus()
      return
    }
    setSubmitting(true)
    setSubmitError('')
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { 
          full_name: form.fullName, 
          role: 'shop_owner',
          shop_name: form.shopName,
          shop_type: form.shopType,
          phone: form.phone,
          province: form.province,
          address: form.address,
          latitude: form.latitude,
          longitude: form.longitude
        },
      },
    })
    setSubmitting(false)
    if (error) {
      setSubmitError(error.message)
      return
    }
    if (!data.user) {
      setSubmitError('ไม่สามารถสร้างบัญชีได้ กรุณาลองใหม่อีกครั้ง')
      return
    }
    setSubmitted(true)
    window.setTimeout(() => { window.location.href = '/login?registered=1' }, 2500)
  }

  if (submitted) return <main className="grid min-h-screen place-items-center bg-[#fffaf5] px-5">
    <div className="w-full max-w-md rounded-[28px] border border-orange-100 bg-white p-8 text-center shadow-[0_24px_80px_rgba(249,115,22,.12)]">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Check size={32} strokeWidth={3}/></span>
      <h1 className="mt-6 text-2xl font-black">สร้างบัญชีสำเร็จ!</h1>
      <p className="mt-3 leading-7 text-zinc-500">ยินดีต้อนรับคุณ <b className="text-zinc-800">{form.fullName}</b> สู่ระบบ SmartPOS</p>
      <p className="mt-1 text-sm text-zinc-400">กำลังพาคุณไปยังหน้าเข้าสู่ระบบ...</p>
      <button onClick={() => { window.location.href = '/login' }} className="mt-7 h-12 w-full rounded-xl bg-zinc-950 font-bold text-white transition hover:bg-zinc-800">ไปหน้าเข้าสู่ระบบทันที</button>
    </div>
  </main>

  return <div className="min-h-screen bg-[#fffaf5] text-zinc-950">
    <div className="grid min-h-screen lg:grid-cols-[minmax(360px,42%)_1fr]">
      <aside className="relative hidden overflow-hidden bg-zinc-950 p-12 text-white lg:flex lg:flex-col xl:p-16">
        <div className="absolute -left-32 -top-32 size-[430px] rounded-full bg-orange-500/25 blur-[90px]"/>
        <div className="absolute -bottom-40 -right-36 size-[500px] rounded-full border-[80px] border-orange-500/10"/>
        <div className="relative"><Brand inverted/></div>
        <div className="relative my-auto max-w-lg py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-orange-300"><ShieldCheck size={15}/> เริ่มต้นฟรี ไม่มีค่าติดตั้ง</span>
          <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight xl:text-5xl">เริ่มต้นใช้งานระบบ<br/><span className="text-orange-500">SmartPOS</span></h1>
          <p className="mt-5 max-w-md text-base leading-8 text-zinc-400">สร้างบัญชีผู้ใช้งานเพื่อเข้าถึงระบบจัดการร้านอาหารที่ดีที่สุด</p>
          <div className="mt-10 space-y-4">
            {['ทดลองใช้งานฟรี 14 วัน', 'ตั้งค่าร้านพร้อมขายใน 5 นาที', 'ทีมงานดูแลตลอดการใช้งาน'].map(text => <div key={text} className="flex items-center gap-3 text-sm font-medium text-zinc-200"><span className="grid size-6 place-items-center rounded-full bg-orange-500/15 text-orange-400"><Check size={14} strokeWidth={3}/></span>{text}</div>)}
          </div>
        </div>
        <p className="relative text-xs text-zinc-600">© 2026 SmartPOS. All rights reserved.</p>
      </aside>

      <main className="flex min-h-screen flex-col px-5 py-6 sm:px-8 lg:px-12 lg:py-10 xl:px-20">
        <div className="mx-auto w-full max-w-xl">
          <div className="flex items-center justify-between lg:justify-end">
            <div className="lg:hidden"><Brand/></div>
            <p className="hidden text-sm text-zinc-500 sm:block">มีบัญชีอยู่แล้ว? <a href="/login" className="ml-1 font-bold text-orange-600 hover:text-orange-700">เข้าสู่ระบบ</a></p>
          </div>

          <div className="mt-10 lg:mt-6">
            <a href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition hover:text-zinc-900"><ArrowLeft size={17}/> กลับหน้าหลัก</a>
            <h2 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl">สร้างบัญชีผู้ใช้งาน</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">กรอกข้อมูลส่วนตัวของคุณเพื่อลงทะเบียน</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-7 pb-12">
            <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-center gap-3 border-b border-zinc-100 pb-5"><span className="grid size-9 place-items-center rounded-xl bg-orange-100 text-orange-600"><UserCircle size={18}/></span><div><h3 className="font-extrabold">ข้อมูลส่วนตัว</h3><p className="mt-0.5 text-xs text-zinc-400">ชื่อและอีเมลสำหรับติดต่อ</p></div></div>
              <div className="mt-6 space-y-5">
                <Field label="ชื่อ–นามสกุล" required error={touched.fullName && errors.fullName} icon={UserCircle}><input value={form.fullName} onChange={e=>update('fullName',e.target.value)} onBlur={()=>setTouched(p=>({...p,fullName:true}))} className={inputClass('fullName','pl-11')} placeholder="เช่น สมชาย ใจดี" autoComplete="name" aria-invalid={!!(touched.fullName && errors.fullName)}/></Field>
                <Field label="อีเมล" required error={touched.email && errors.email} icon={Mail}><input type="email" value={form.email} onChange={e=>update('email',e.target.value)} onBlur={()=>setTouched(p=>({...p,email:true}))} className={inputClass('email','pl-11')} placeholder="name@example.com" aria-invalid={!!(touched.email && errors.email)}/></Field>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-center gap-3 border-b border-zinc-100 pb-5"><span className="grid size-9 place-items-center rounded-xl bg-orange-100 text-orange-600"><Store size={18}/></span><div><h3 className="font-extrabold">ข้อมูลร้านค้า</h3><p className="mt-0.5 text-xs text-zinc-400">รายละเอียดร้านค้าของคุณ</p></div></div>
              <div className="mt-6 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="ชื่อร้าน" required error={touched.shopName && errors.shopName} icon={Store}><input value={form.shopName} onChange={e=>update('shopName',e.target.value)} onBlur={()=>setTouched(p=>({...p,shopName:true}))} className={inputClass('shopName','pl-11')} placeholder="เช่น ครัวบ้านสวน" aria-invalid={!!(touched.shopName && errors.shopName)}/></Field>
                  <Field label="ประเภทร้าน" required error={touched.shopType && errors.shopType}><select value={form.shopType} onChange={e=>update('shopType',e.target.value)} onBlur={()=>setTouched(p=>({...p,shopType:true}))} className={inputClass('shopType','appearance-none pr-10')} aria-invalid={!!(touched.shopType && errors.shopType)}><option value="">เลือกประเภทร้าน</option>{shopTypes.map(x=><option key={x}>{x}</option>)}</select><ChevronDown size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400"/></Field>
                </div>
                <Field label="เบอร์โทรศัพท์ร้าน" required error={touched.phone && errors.phone} icon={Phone}><input type="tel" inputMode="tel" value={form.phone} onChange={e=>update('phone',e.target.value)} onBlur={()=>setTouched(p=>({...p,phone:true}))} className={inputClass('phone','pl-11')} placeholder="08x-xxx-xxxx" aria-invalid={!!(touched.phone && errors.phone)}/></Field>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-center gap-3 border-b border-zinc-100 pb-5"><span className="grid size-9 place-items-center rounded-xl bg-orange-100 text-orange-600"><MapPin size={18}/></span><div><h3 className="font-extrabold">ที่อยู่ร้าน</h3><p className="mt-0.5 text-xs text-zinc-400">สำหรับตั้งค่าข้อมูลสาขาและการจัดส่ง</p></div></div>
              <div className="mt-6 space-y-5">
                <Field label="จังหวัด" required error={touched.province && errors.province}><select value={form.province} onChange={e=>update('province',e.target.value)} onBlur={()=>setTouched(p=>({...p,province:true}))} className={inputClass('province','appearance-none pr-10')} aria-invalid={!!(touched.province && errors.province)}><option value="">เลือกจังหวัด</option>{provinces.map(x=><option key={x}>{x}</option>)}</select><ChevronDown size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400"/></Field>
                <Field label="ที่อยู่" required error={touched.address && errors.address}><textarea value={form.address} onChange={e=>update('address',e.target.value)} onBlur={()=>setTouched(p=>({...p,address:true}))} className={`${inputClass('address')} min-h-24 resize-y py-3`} placeholder="บ้านเลขที่ อาคาร ถนน แขวง/ตำบล เขต/อำเภอ และรหัสไปรษณีย์" aria-invalid={!!(touched.address && errors.address)}/></Field>
                <div>
                  <div className="flex items-center justify-between gap-3"><label className="text-sm font-semibold text-zinc-800">ตำแหน่งร้านบนแผนที่</label><button type="button" onClick={useCurrentLocation} disabled={locating} className="inline-flex h-9 items-center gap-2 rounded-lg bg-orange-100 px-3 text-xs font-bold text-orange-700 transition hover:bg-orange-200 disabled:opacity-60"><MapPin size={14}/>{locating?'กำลังค้นหา…':'ใช้ตำแหน่งปัจจุบัน'}</button></div>
                  <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100"><iframe title="ตำแหน่งร้านบนแผนที่" src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(form.longitude)-0.01}%2C${Number(form.latitude)-0.007}%2C${Number(form.longitude)+0.01}%2C${Number(form.latitude)+0.007}&layer=mapnik&marker=${form.latitude}%2C${form.longitude}`} className="h-56 w-full border-0" loading="lazy"/></div>
                  <div className="mt-3 grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-xs font-semibold text-zinc-500">Latitude</label><input type="number" step="any" value={form.latitude} onChange={e=>update('latitude',e.target.value)} className={inputClass('latitude')} aria-label="Latitude"/></div><div><label className="mb-1.5 block text-xs font-semibold text-zinc-500">Longitude</label><input type="number" step="any" value={form.longitude} onChange={e=>update('longitude',e.target.value)} className={inputClass('longitude')} aria-label="Longitude"/></div></div>
                  <p className="mt-2 text-xs leading-5 text-zinc-400">กดใช้ตำแหน่งปัจจุบัน หรือกรอกพิกัดเพื่อกำหนดจุดร้านให้แม่นยำ</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-center gap-3 border-b border-zinc-100 pb-5"><span className="grid size-9 place-items-center rounded-xl bg-orange-100 text-orange-600"><LockKeyhole size={18}/></span><div><h3 className="font-extrabold">ตั้งค่ารหัสผ่าน</h3><p className="mt-0.5 text-xs text-zinc-400">ใช้สำหรับเข้าสู่ระบบ</p></div></div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <Field label="รหัสผ่าน" required error={touched.password && errors.password} icon={LockKeyhole}><input type={showPassword?'text':'password'} value={form.password} onChange={e=>update('password',e.target.value)} onBlur={()=>setTouched(p=>({...p,password:true}))} className={inputClass('password','pl-11 pr-11')} placeholder="อย่างน้อย 8 ตัวอักษร" aria-invalid={!!(touched.password && errors.password)}/><button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-zinc-400 hover:text-zinc-700" aria-label={showPassword?'ซ่อนรหัสผ่าน':'แสดงรหัสผ่าน'}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></Field>
                <Field label="ยืนยันรหัสผ่าน" required error={touched.confirmPassword && errors.confirmPassword} icon={LockKeyhole}><input type={showConfirm?'text':'password'} value={form.confirmPassword} onChange={e=>update('confirmPassword',e.target.value)} onBlur={()=>setTouched(p=>({...p,confirmPassword:true}))} className={inputClass('confirmPassword','pl-11 pr-11')} placeholder="กรอกรหัสผ่านอีกครั้ง" aria-invalid={!!(touched.confirmPassword && errors.confirmPassword)}/><button type="button" onClick={()=>setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-zinc-400 hover:text-zinc-700" aria-label={showConfirm?'ซ่อนรหัสผ่าน':'แสดงรหัสผ่าน'}>{showConfirm?<EyeOff size={18}/>:<Eye size={18}/>}</button></Field>
              </div>
              <p className="mt-3 text-xs text-zinc-400">รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และประกอบด้วยตัวอักษรกับตัวเลข</p>
            </section>

            <div>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl p-1 text-sm leading-6 text-zinc-600">
                <input type="checkbox" checked={form.accepted} onChange={e=>{update('accepted',e.target.checked);setTouched(p=>({...p,accepted:true}))}} className="peer sr-only"/>
                <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded border transition ${form.accepted?'border-orange-500 bg-orange-500 text-white':'border-zinc-300 bg-white'}`}>{form.accepted && <Check size={14} strokeWidth={3}/>}</span>
                <span>ฉันอ่านและยอมรับ <a href="#terms" className="font-semibold text-orange-600 underline decoration-orange-200 underline-offset-2 hover:text-orange-700">ข้อกำหนดการใช้งาน</a> และ <a href="#privacy" className="font-semibold text-orange-600 underline decoration-orange-200 underline-offset-2 hover:text-orange-700">นโยบายความเป็นส่วนตัว</a></span>
              </label>
              {touched.accepted && errors.accepted && <p className="ml-9 mt-1 text-xs font-medium text-red-500">{errors.accepted}</p>}
            </div>

            {submitError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{submitError}</p>}
            <button type="submit" disabled={submitting} className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-base font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-orange-200 active:translate-y-0 disabled:cursor-wait disabled:opacity-60">{submitting?'กำลังสร้างบัญชี…':<>สร้างบัญชีผู้ใช้งาน <UserCircle size={18}/></>}</button>
            <p className="text-center text-xs text-zinc-400 sm:hidden">มีบัญชีอยู่แล้ว? <a href="/login" className="font-bold text-orange-600">เข้าสู่ระบบ</a></p>
          </form>
        </div>
      </main>
    </div>
  </div>
}
