import { Flame } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'

export function Login({ onLogin }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-paper text-ink">
      <section className="bg-coal text-paper p-8 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#ff5b2415,#00000000_50%)]" />
        <div className="relative flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-full bg-gradient-to-r from-ember to-deep text-white border-2 border-copper shadow-md">
            <Flame size={20} fill="currentColor" />
          </span>
          <span className="font-display font-extrabold text-2xl tracking-tight text-white">เตาถ่าน</span>
        </div>
        <div className="my-auto py-12 relative z-10">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-sans leading-tight tracking-tight">
            รสชาติที่ดี <br />
            เริ่มจาก <span className="text-ember relative inline-block">เตาร้อน<span className="absolute left-0 bottom-1 h-2 w-full bg-ember/30 rounded-full" /></span>
          </h1>
          <p className="mt-6 text-base text-smoke max-w-md leading-relaxed">
            สั่งหมูกระทะพรีเมียมจากเตาร้อนถึงโต๊ะคุณ ติดตามออเดอร์เรียลไทม์ และรับสิทธิพิเศษมากมายได้ในที่เดียว
          </p>
        </div>
        <p className="text-xs text-smoke font-medium">© 2026 เตาถ่าน หมูกระทะพรีเมียม. All rights reserved.</p>
      </section>

      <section className="p-8 sm:p-12 lg:p-20 flex items-center justify-center bg-soft">
        <Card className="w-full max-w-md p-8 border border-line shadow-xl">
          <h2 className="text-2xl font-black tracking-tight text-ink">ยินดีต้อนรับ</h2>
          <p className="text-xs font-semibold text-smoke mt-1">เข้าสู่ระบบเพื่อเริ่มสั่งอาหาร หรือจัดการร้านค้า</p>
          
          <form className="mt-8 space-y-5" onSubmit={(e) => {
            e.preventDefault()
            onLogin(e.target.email.value, e.target.password.value)
          }}>
            <div className="space-y-2">
              <label className="text-xs font-bold text-ink block">อีเมลผู้ใช้งาน</label>
              <input
                name="email"
                type="email"
                required
                placeholder="name@example.com"
                className="w-full border border-line focus:border-ember focus:ring-4 focus:ring-ember/15 outline-none rounded-xl p-3.5 bg-white text-ink text-sm transition"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-ink block">รหัสผ่าน</label>
              <input
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="w-full border border-line focus:border-ember focus:ring-4 focus:ring-ember/15 outline-none rounded-xl p-3.5 bg-white text-ink text-sm transition"
              />
            </div>
            <Button variant="primary" size="wide" type="submit" className="mt-2 h-13">
              เข้าสู่ระบบ
            </Button>
          </form>

          <div className="mt-8 p-4 rounded-xl bg-paper/50 border border-line text-xs space-y-1.5 text-smoke font-medium">
            <div className="flex justify-between">
              <span>บัญชีลูกค้าทดสอบ:</span>
              <span className="font-bold text-ink">customer@taothan.com / 1234</span>
            </div>
            <div className="flex justify-between">
              <span>บัญชีแอดมินทดสอบ:</span>
              <span className="font-bold text-ink">admin@taothan.com / admin123</span>
            </div>
          </div>
        </Card>
      </section>
    </div>
  )
}
