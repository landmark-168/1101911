import { useRef, useState, useEffect } from 'react'
import {
  ArrowLeft, Check, ChevronDown, ImagePlus,
  MapPin, Phone, Store, Upload, X, LogOut,
} from 'lucide-react'
import { supabase } from './lib/supabase'
import { fetchCurrentUserSummary } from './lib/database'

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

const initialForm = { shopName: '', shopType: '', phone: '', province: '', address: '', latitude: '13.7563', longitude: '100.5018', accepted: false }

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

export default function CreateStorePage() {
  const [form, setForm] = useState(initialForm)
  const [touched, setTouched] = useState({})
  const [logo, setLogo] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [logoError, setLogoError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [locating, setLocating] = useState(false)
  const [user, setUser] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    fetchCurrentUserSummary().then((summary) => {
      if (!summary?.user) {
        window.location.href = '/login?next=/create-store'
        return
      }
      if (summary.shop) {
        window.location.href = '/admin'
        return
      }
      if (!summary.subscription) {
        window.location.href = '/pricing'
        return
      }
      setUser(summary.user)
    }).catch(err => {
      console.error(err)
      window.location.href = '/login'
    })
  }, [])

  const validate = (data = form) => ({
    shopName: !data.shopName.trim() ? 'กรุณากรอกชื่อร้าน' : data.shopName.trim().length < 2 ? 'ชื่อร้านต้องมีอย่างน้อย 2 ตัวอักษร' : '',
    shopType: !data.shopType ? 'กรุณาเลือกประเภทร้าน' : '',
    phone: !data.phone ? 'กรุณากรอกเบอร์โทรศัพท์' : !/^0\d{8,9}$/.test(data.phone.replace(/[-\s]/g, '')) ? 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง' : '',
    province: !data.province ? 'กรุณาเลือกจังหวัด' : '',
    address: !data.address.trim() ? 'กรุณากรอกที่อยู่ร้าน' : data.address.trim().length < 10 ? 'กรุณากรอกที่อยู่ให้ละเอียดขึ้น' : '',
    accepted: !data.accepted ? 'กรุณายอมรับข้อตกลงและนโยบายความเป็นส่วนตัว' : '',
  })
  const errors = validate()
  const inputClass = (name, extra = '') => `h-12 w-full rounded-xl border bg-white px-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:ring-4 ${errors[name] && touched[name] ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-zinc-200 hover:border-zinc-300 focus:border-orange-400 focus:ring-orange-100'} ${extra}`
  const update = (name, value) => setForm(prev => ({ ...prev, [name]: value }))

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { setSubmitError('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      position => { setForm(prev => ({ ...prev, latitude:position.coords.latitude.toFixed(6), longitude:position.coords.longitude.toFixed(6) })); setLocating(false); setSubmitError('') },
      () => { setLocating(false); setSubmitError('ไม่สามารถอ่านตำแหน่งได้ กรุณาอนุญาต Location หรือกรอกพิกัดเอง') },
      { enableHighAccuracy:true, timeout:10000 },
    )
  }

  const handleLogo = e => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setLogoError('รองรับ JPG, PNG, WEBP ขนาดไม่เกิน 2 MB')
      return
    }
    setLogoError('')
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = () => setLogo(reader.result)
    reader.readAsDataURL(file)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!user) return
    setTouched(Object.fromEntries(Object.keys(initialForm).map(key => [key, true])))
    if (Object.values(validate()).some(Boolean)) {
      document.querySelector('[aria-invalid="true"]')?.focus()
      return
    }
    setSubmitting(true)
    setSubmitError('')
    
    // In a real app we'd upload the logo to storage first
    let logoUrl = null
    
    const { data: newShop, error } = await supabase.from('shops').insert({
      owner_id: user.id,
      name: form.shopName,
      shop_type: form.shopType,
      phone: form.phone,
      email: user.email,
      province: form.province,
      address: form.address,
      logo_url: logoUrl
    }).select().single()
    
    setSubmitting(false)
    if (error) {
      setSubmitError(error.message)
      return
    }
    
    setSubmitted(true)
    window.setTimeout(() => { window.location.href = '/admin' }, 2000)
  }

  if (submitted) return <main className="grid min-h-screen place-items-center bg-[#fffaf5] px-5">
    <div className="w-full max-w-md rounded-[28px] border border-orange-100 bg-white p-8 text-center shadow-[0_24px_80px_rgba(249,115,22,.12)]">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Check size={32} strokeWidth={3}/></span>
      <h1 className="mt-6 text-2xl font-black">สร้างร้านสำเร็จ!</h1>
      <p className="mt-3 leading-7 text-zinc-500">ร้าน <b className="text-zinc-800">{form.shopName}</b> พร้อมใช้งานแล้ว</p>
      <button onClick={() => { window.location.href = '/admin' }} className="mt-7 h-12 w-full rounded-xl bg-zinc-950 font-bold text-white transition hover:bg-zinc-800">เข้าสู่ระบบจัดการร้าน</button>
    </div>
  </main>

  if (!user) return <div className="min-h-screen bg-[#fffaf5]"></div>

  return <div className="min-h-screen bg-[#fffaf5] text-zinc-950">
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200/60 bg-white/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
        <Brand />
        <button onClick={handleSignOut} className="flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-red-500"><LogOut size={16}/> ออกจากระบบ</button>
      </div>
    </nav>
    <main className="px-5 pb-16 pt-24 sm:px-8 lg:px-12 lg:pt-28 xl:px-20">
      <div className="mx-auto max-w-xl">
        <div className="text-center">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">สร้างร้านค้าใหม่</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">ยินดีต้อนรับ! กรอกข้อมูลร้านของคุณเพื่อเริ่มต้นใช้งานระบบ POS</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-10 space-y-7 pb-12">
          <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center gap-3 border-b border-zinc-100 pb-5"><span className="grid size-9 place-items-center rounded-xl bg-orange-100 text-orange-600"><Store size={18}/></span><div><h3 className="font-extrabold">ข้อมูลร้านค้า</h3><p className="mt-0.5 text-xs text-zinc-400">ข้อมูลพื้นฐานสำหรับแสดงในระบบ</p></div></div>
            <div className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-800">โลโก้ร้าน <span className="font-normal text-zinc-400">(ไม่บังคับ)</span></label>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => fileRef.current?.click()} className="group grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 text-zinc-400 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-500" aria-label="อัปโหลดโลโก้ร้าน">
                    {logo ? <img src={logo} alt="ตัวอย่างโลโก้ร้าน" className="size-full object-cover"/> : <ImagePlus size={24}/>} 
                  </button>
                  <div><button type="button" onClick={() => fileRef.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 text-sm font-bold transition hover:border-orange-300 hover:text-orange-600"><Upload size={15}/> อัปโหลดรูป</button><p className="mt-2 text-xs text-zinc-400">JPG, PNG หรือ WEBP · ไม่เกิน 2 MB</p></div>
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogo} className="hidden"/>
                </div>
                {logoError && <p className="mt-2 text-xs font-medium text-red-500">{logoError}</p>}
              </div>
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

          <div>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl p-1 text-sm leading-6 text-zinc-600">
              <input type="checkbox" checked={form.accepted} onChange={e=>{update('accepted',e.target.checked);setTouched(p=>({...p,accepted:true}))}} className="peer sr-only"/>
              <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded border transition ${form.accepted?'border-orange-500 bg-orange-500 text-white':'border-zinc-300 bg-white'}`}>{form.accepted && <Check size={14} strokeWidth={3}/>}</span>
              <span>ฉันตรวจทานความถูกต้องของข้อมูลร้านค้าเรียบร้อยแล้ว</span>
            </label>
            {touched.accepted && errors.accepted && <p className="ml-9 mt-1 text-xs font-medium text-red-500">{errors.accepted}</p>}
          </div>

          {submitError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{submitError}</p>}
          <button type="submit" disabled={submitting} className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-base font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-orange-200 active:translate-y-0 disabled:cursor-wait disabled:opacity-60">{submitting?'กำลังสร้างร้านค้า…':<>สร้างร้านค้า <Store size={18}/></>}</button>
        </form>
      </div>
    </main>
  </div>
}
