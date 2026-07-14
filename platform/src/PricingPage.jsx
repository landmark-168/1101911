import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Minus, ShieldCheck, Sparkles, Store, Zap } from 'lucide-react'

const plans = [
  {
    name: 'Starter', description: 'สำหรับร้านเล็กที่กำลังเริ่มต้น', monthly: 590, yearly: 472,
    features: ['1 สาขา', 'ผู้ใช้งาน 3 คน', 'POS และ QR Menu', 'รายงานยอดขายพื้นฐาน', 'ช่วยเหลือผ่านแชต'],
    button: 'Subscribe Starter', accent: false,
  },
  {
    name: 'Business', description: 'สำหรับร้านที่ต้องการเติบโต', monthly: 1290, yearly: 1032,
    features: ['3 สาขา', 'ผู้ใช้งาน 15 คน', 'ทุกฟีเจอร์ใน Starter', 'จัดการสต็อกและวัตถุดิบ', 'Delivery และ LINE OA', 'รายงานเชิงลึก'],
    button: 'Subscribe Business', accent: true,
  },
  {
    name: 'Enterprise', description: 'สำหรับธุรกิจหลายสาขา', monthly: 2990, yearly: 2392,
    features: ['ไม่จำกัดสาขา', 'ไม่จำกัดผู้ใช้งาน', 'ทุกฟีเจอร์ใน Business', 'สิทธิ์ผู้ใช้งานขั้นสูง', 'API และระบบเชื่อมต่อ', 'ผู้ดูแลบัญชีเฉพาะ'],
    button: 'ติดต่อฝ่ายขาย', accent: false,
  },
]

const comparisons = [
  ['จำนวนสาขา', '1', '3', 'ไม่จำกัด'],
  ['จำนวนผู้ใช้งาน', '3', '15', 'ไม่จำกัด'],
  ['POS และ QR Menu', true, true, true],
  ['จัดการสต็อก', false, true, true],
  ['Delivery และ LINE OA', false, true, true],
  ['รายงานเชิงลึก', false, true, true],
  ['API และระบบเชื่อมต่อ', false, false, true],
  ['ผู้ดูแลบัญชีเฉพาะ', false, false, true],
]

function Brand() {
  return <a href="/" className="inline-flex items-center gap-2.5" aria-label="SmartPOS Home"><span className="grid size-9 place-items-center rounded-xl bg-zinc-950 text-orange-500 shadow-lg"><Zap size={19} fill="currentColor"/></span><span className="text-xl font-extrabold tracking-tight">Smart<span className="text-orange-500">POS</span></span></a>
}

function Value({ value }) {
  if (value === true) return <span className="mx-auto grid size-6 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Check size={14} strokeWidth={3}/></span>
  if (value === false) return <Minus size={18} className="mx-auto text-zinc-300"/>
  return <span className="font-semibold text-zinc-700">{value}</span>
}

export default function PricingPage() {
  const [yearly, setYearly] = useState(true)

  return <div className="min-h-screen bg-[#fffdf9] text-zinc-950">
    <nav className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Brand/>
        <div className="flex items-center gap-2"><a href="/login" className="hidden rounded-lg px-4 py-2 text-sm font-bold text-zinc-600 transition hover:bg-zinc-100 sm:block">เข้าสู่ระบบ</a><a href="/register" className="inline-flex h-10 items-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-bold text-white shadow-md shadow-orange-500/15 transition hover:bg-orange-600">ทดลองฟรี <ArrowRight size={15}/></a></div>
      </div>
    </nav>

    <main>
      <section className="relative overflow-hidden px-5 pb-16 pt-14 text-center lg:px-8 lg:pb-20 lg:pt-20">
        <div className="absolute left-1/2 top-0 -z-10 size-[650px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-100/80 blur-3xl"/>
        <div className="mx-auto max-w-3xl">
          <a href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition hover:text-zinc-900"><ArrowLeft size={16}/> กลับหน้าหลัก</a>
          <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700"><Sparkles size={14}/> ทดลองทุกแพ็กเกจฟรี 14 วัน</div>
          <h1 className="mt-5 text-4xl font-black tracking-[-.04em] sm:text-5xl lg:text-6xl">แพ็กเกจที่เติบโต<br className="sm:hidden"/>ไปพร้อมกับร้านคุณ</h1>
          <p className="mx-auto mt-5 max-w-2xl leading-7 text-zinc-500">เลือกแพ็กเกจที่เหมาะกับร้าน เปลี่ยนหรือยกเลิกได้ทุกเมื่อ ไม่มีค่าติดตั้ง</p>
          <div className="mt-8 inline-flex items-center rounded-xl border border-zinc-200 bg-white p-1.5 shadow-sm" role="group" aria-label="เลือกรอบการชำระเงิน">
            <button onClick={()=>setYearly(false)} className={`h-10 rounded-lg px-5 text-sm font-bold transition ${!yearly?'bg-zinc-950 text-white shadow':'text-zinc-500 hover:text-zinc-900'}`} aria-pressed={!yearly}>รายเดือน</button>
            <button onClick={()=>setYearly(true)} className={`flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-bold transition ${yearly?'bg-zinc-950 text-white shadow':'text-zinc-500 hover:text-zinc-900'}`} aria-pressed={yearly}>รายปี <span className={`rounded-full px-2 py-0.5 text-[10px] ${yearly?'bg-orange-500 text-white':'bg-orange-100 text-orange-700'}`}>ประหยัด 20%</span></button>
          </div>
        </div>
      </section>

      <section className="px-5 pb-24 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-3">
          {plans.map(plan => <article key={plan.name} className={`relative flex flex-col rounded-[28px] border bg-white p-6 transition hover:-translate-y-1 hover:shadow-xl sm:p-8 ${plan.accent?'border-orange-500 shadow-[0_25px_70px_rgba(249,115,22,.14)] lg:-translate-y-3 lg:hover:-translate-y-4':'border-zinc-200 shadow-sm'}`}>
            {plan.accent && <span className="absolute right-5 top-0 -translate-y-1/2 rounded-full bg-orange-500 px-3 py-1 text-[11px] font-extrabold text-white shadow-md">แนะนำ</span>}
            <div className="flex items-start justify-between"><div><h2 className="text-2xl font-black">{plan.name}</h2><p className="mt-2 text-sm text-zinc-500">{plan.description}</p></div><span className={`grid size-11 place-items-center rounded-2xl ${plan.accent?'bg-orange-500 text-white':'bg-orange-100 text-orange-600'}`}><Store size={20}/></span></div>
            <div className="mt-8 flex items-end gap-1"><span className="pb-2 text-sm font-bold text-zinc-500">฿</span><span className="text-5xl font-black tracking-tight">{(yearly?plan.yearly:plan.monthly).toLocaleString()}</span><span className="pb-2 text-sm text-zinc-400">/ เดือน</span></div>
            <p className="mt-2 h-5 text-xs text-zinc-400">{yearly?`ชำระ ฿${(plan.yearly*12).toLocaleString()} ต่อปี`:'ชำระแบบรายเดือน'}</p>
            <a href={plan.name==='Enterprise'?'mailto:sales@smartpos.co':'/register'} className={`mt-7 flex h-12 items-center justify-center rounded-xl text-sm font-extrabold transition ${plan.accent?'bg-orange-500 text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600':'bg-zinc-950 text-white hover:bg-zinc-800'}`}>{plan.button}</a>
            <div className="my-7 h-px bg-zinc-100"/>
            <p className="text-sm font-extrabold">สิ่งที่คุณจะได้รับ</p>
            <ul className="mt-4 space-y-3">{plan.features.map(item=><li key={item} className="flex items-start gap-3 text-sm text-zinc-600"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-orange-100 text-orange-600"><Check size={12} strokeWidth={3}/></span>{item}</li>)}</ul>
          </article>)}
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-white px-5 py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center"><p className="text-sm font-bold uppercase tracking-[.16em] text-orange-500">Compare plans</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">เปรียบเทียบทุกฟีเจอร์</h2><p className="mt-3 text-sm text-zinc-500">ดูรายละเอียดเพื่อเลือกแพ็กเกจที่เหมาะกับร้านคุณที่สุด</p></div>
          <div className="mt-10 overflow-x-auto rounded-2xl border border-zinc-200">
            <table className="w-full min-w-[700px] border-collapse text-sm">
              <thead><tr className="bg-zinc-50"><th className="w-[40%] px-6 py-5 text-left font-extrabold">ฟีเจอร์</th>{plans.map(plan=><th key={plan.name} className={`px-4 py-5 text-center text-base font-black ${plan.accent?'text-orange-600':''}`}>{plan.name}</th>)}</tr></thead>
              <tbody>{comparisons.map(([label,...values])=><tr key={label} className="border-t border-zinc-100 transition hover:bg-orange-50/30"><td className="px-6 py-4 font-medium text-zinc-600">{label}</td>{values.map((value,i)=><td key={i} className="px-4 py-4 text-center"><Value value={value}/></td>)}</tr>)}</tbody>
            </table>
          </div>
          <p className="mt-3 text-center text-xs text-zinc-400 sm:hidden">เลื่อนซ้าย–ขวาเพื่อดูแพ็กเกจทั้งหมด</p>
        </div>
      </section>

      <section className="px-5 py-20 lg:px-8"><div className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-zinc-950 px-6 py-14 text-center text-white sm:px-10"><div className="absolute -right-20 -top-20 size-64 rounded-full bg-orange-500/20 blur-3xl"/><div className="relative"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-orange-500 text-white"><ShieldCheck size={24}/></span><h2 className="mt-5 text-3xl font-black sm:text-4xl">ยังไม่แน่ใจว่าแพ็กเกจไหนเหมาะ?</h2><p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-zinc-400">คุยกับทีมของเราเพื่อรับคำแนะนำ หรือทดลองใช้งานทุกฟีเจอร์ฟรี 14 วัน</p><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><a href="/register" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 text-sm font-extrabold hover:bg-orange-600">เริ่มทดลองฟรี <ArrowRight size={16}/></a><a href="mailto:sales@smartpos.co" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 text-sm font-bold hover:bg-white/10">คุยกับฝ่ายขาย</a></div></div></div></section>
    </main>
  </div>
}
