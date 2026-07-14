import { useState } from 'react'
import { ArrowLeft, Check, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Store } from 'lucide-react'
import { supabase } from './lib/supabase'
import { getCurrentProfile } from './lib/database'

function Brand({ inverted = false }) {
  return <a href="/" className="inline-flex items-center gap-3" aria-label="SmartPOS">
    <span className="grid size-10 place-items-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/20"><Store size={21} strokeWidth={2.3}/></span>
    <span className={`text-xl font-extrabold tracking-tight ${inverted ? 'text-white' : 'text-zinc-950'}`}>Smart<span className="text-orange-500">POS</span></span>
  </a>
}

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '', remember: false })
  const [touched, setTouched] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState(() => new URLSearchParams(window.location.search).get('registered') === '1' ? 'สมัครร้านสำเร็จแล้ว กรุณาเข้าสู่ระบบ' : '')
  const [authError, setAuthError] = useState('')
  const [loading, setLoading] = useState(false)

  const errors = {
    email: !form.email ? 'กรุณากรอกอีเมล' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? 'รูปแบบอีเมลไม่ถูกต้อง' : '',
    password: !form.password ? 'กรุณากรอกรหัสผ่าน' : form.password.length < 8 ? 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' : '',
  }
  const update = (name, value) => setForm(prev => ({ ...prev, [name]: value }))
  const inputClass = name => `h-13 w-full rounded-xl border bg-white pl-11 pr-11 text-sm outline-none transition placeholder:text-zinc-400 focus:ring-4 ${errors[name] && touched[name] ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-zinc-200 hover:border-zinc-300 focus:border-orange-400 focus:ring-orange-100'}`

  const submit = async e => {
    e.preventDefault()
    setTouched({ email: true, password: true })
    if (errors.email || errors.password) {
      document.querySelector('[aria-invalid="true"]')?.focus()
      return
    }
    setLoading(true)
    setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
    setLoading(false)
    if (error) {
      setAuthError(error.message === 'Invalid login credentials' ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' : error.message)
      return
    }
    setMessage('เข้าสู่ระบบสำเร็จ กำลังพาคุณไปยังหน้าหลัก…')
    const requestedNext = new URLSearchParams(window.location.search).get('next')
    let destination = requestedNext?.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/'
    try {
      const { profile } = await getCurrentProfile()
      if (profile?.role === 'super_admin') destination = '/admin'
    } catch {
      destination = '/'
    }
    window.setTimeout(() => { window.location.href = destination }, 600)
  }

  const loginWithGoogle = async () => {
    setAuthError('')
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/admin` } })
    if (error) setAuthError(error.message)
  }

  const forgotPassword = async e => {
    e.preventDefault()
    if (!form.email || errors.email) { setTouched(p => ({ ...p, email: true })); setAuthError('กรุณากรอกอีเมลที่ถูกต้องก่อนขอรีเซ็ตรหัสผ่าน'); return }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(form.email, { redirectTo: `${window.location.origin}/login` })
    setLoading(false)
    if (error) setAuthError(error.message)
    else { setAuthError(''); setMessage('ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลแล้ว') }
  }

  return <div className="min-h-screen bg-[#fffaf5] text-zinc-950">
    <div className="grid min-h-screen lg:grid-cols-[minmax(380px,44%)_1fr]">
      <aside className="relative hidden overflow-hidden bg-zinc-950 p-12 text-white lg:flex lg:flex-col xl:p-16">
        <div className="absolute -left-36 -top-36 size-[500px] rounded-full bg-orange-500/25 blur-[100px]"/>
        <div className="absolute -bottom-48 -right-40 size-[520px] rounded-full border-[90px] border-orange-500/10"/>
        <div className="relative"><Brand inverted/></div>
        <div className="relative my-auto max-w-lg py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-orange-300"><ShieldCheck size={15}/> ระบบจัดการร้านที่คุณวางใจ</span>
          <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight xl:text-5xl">ยินดีต้อนรับ<br/><span className="text-orange-500">กลับมาที่ร้านของคุณ</span></h1>
          <p className="mt-5 max-w-md text-base leading-8 text-zinc-400">ดูยอดขาย จัดการออเดอร์ และติดตามทุกความเคลื่อนไหวของร้านได้ในที่เดียว</p>
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <p className="text-sm leading-7 text-zinc-300">“SmartPOS ช่วยให้ทีมของเราทำงานเร็วขึ้น และเห็นยอดขายทุกสาขาแบบเรียลไทม์”</p>
            <div className="mt-4 flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-orange-500 font-black">K</span><div><p className="text-xs font-bold">คุณกานต์ · KIN Cafe</p><p className="mt-0.5 text-[11px] text-zinc-500">ลูกค้า SmartPOS ตั้งแต่ปี 2024</p></div></div>
          </div>
        </div>
        <p className="relative text-xs text-zinc-600">© 2026 SmartPOS. All rights reserved.</p>
      </aside>

      <main className="flex min-h-screen items-center px-5 py-8 sm:px-10 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10 flex items-center justify-between lg:hidden"><Brand/><a href="/" className="grid size-10 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-500" aria-label="กลับหน้าหลัก"><ArrowLeft size={19}/></a></div>
          <a href="/" className="hidden items-center gap-2 text-sm font-semibold text-zinc-500 transition hover:text-zinc-900 lg:inline-flex"><ArrowLeft size={17}/> กลับหน้าหลัก</a>
          <div className="mt-8 lg:mt-10">
            <p className="text-sm font-bold uppercase tracking-[.16em] text-orange-500">Welcome back</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">เข้าสู่ระบบ</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-500">เข้าสู่ระบบเพื่อจัดการร้านและดูภาพรวมธุรกิจของคุณ</p>
          </div>

          <form onSubmit={submit} noValidate className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold">อีเมล</label>
              <div className="relative"><Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"/><input id="email" type="email" autoComplete="email" value={form.email} onChange={e=>update('email',e.target.value)} onBlur={()=>setTouched(p=>({...p,email:true}))} className={inputClass('email')} placeholder="name@example.com" aria-invalid={!!(touched.email && errors.email)}/></div>
              {touched.email && errors.email && <p className="mt-1.5 text-xs font-medium text-red-500">{errors.email}</p>}
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between"><label htmlFor="password" className="text-sm font-semibold">รหัสผ่าน</label><button type="button" onClick={forgotPassword} className="text-xs font-bold text-orange-600 transition hover:text-orange-700">ลืมรหัสผ่าน?</button></div>
              <div className="relative"><LockKeyhole size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"/><input id="password" type={showPassword?'text':'password'} autoComplete="current-password" value={form.password} onChange={e=>update('password',e.target.value)} onBlur={()=>setTouched(p=>({...p,password:true}))} className={inputClass('password')} placeholder="กรอกรหัสผ่าน" aria-invalid={!!(touched.password && errors.password)}/><button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-zinc-400 transition hover:text-zinc-700" aria-label={showPassword?'ซ่อนรหัสผ่าน':'แสดงรหัสผ่าน'}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
              {touched.password && errors.password && <p className="mt-1.5 text-xs font-medium text-red-500">{errors.password}</p>}
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-zinc-600"><input type="checkbox" checked={form.remember} onChange={e=>update('remember',e.target.checked)} className="sr-only"/><span className={`grid size-5 place-items-center rounded border transition ${form.remember?'border-orange-500 bg-orange-500 text-white':'border-zinc-300 bg-white'}`}>{form.remember&&<Check size={14} strokeWidth={3}/>}</span>จดจำการเข้าสู่ระบบ</label>
            {message && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p>}
            {authError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{authError}</p>}
            <button type="submit" disabled={loading} className="h-13 w-full rounded-xl bg-orange-500 text-base font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-orange-200 active:translate-y-0 disabled:cursor-wait disabled:opacity-60">{loading?'กำลังดำเนินการ…':'เข้าสู่ระบบ'}</button>
          </form>

          <div className="my-7 flex items-center gap-4"><span className="h-px flex-1 bg-zinc-200"/><span className="text-xs text-zinc-400">หรือเข้าสู่ระบบด้วย</span><span className="h-px flex-1 bg-zinc-200"/></div>
          <button type="button" onClick={loginWithGoogle} className="flex h-13 w-full items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white text-sm font-bold transition hover:border-zinc-300 hover:bg-zinc-50">
            <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.12-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.55l3.35-2.62Z"/><path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"/></svg>
            เข้าสู่ระบบด้วย Google
          </button>
          <p className="mt-8 text-center text-sm text-zinc-500">ยังไม่มีบัญชี? <a href="/register" className="ml-1 font-extrabold text-orange-600 transition hover:text-orange-700">สมัครร้านฟรี</a></p>
        </div>
      </main>
    </div>
  </div>
}
