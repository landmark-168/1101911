import { Compass, Utensils, ChevronRight } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'

export function Home({ setView, menu, onAddToCart }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-12 bg-paper">
      <section className="relative rounded-3xl overflow-hidden bg-coal text-paper p-8 sm:p-12 lg:p-16 flex flex-col md:flex-row items-center justify-between gap-8 border border-line/10 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,#ff5b2415,#00000000_60%)]" />
        <div className="relative z-10 space-y-6 max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ember/10 border border-ember/30 text-xs font-bold text-ember">
            <span className="size-2 rounded-full bg-ember animate-ping" />
            เปิดให้บริการทุกวัน 11:00 – 23:00 น.
          </span>
          <h1 className="text-3xl sm:text-5xl font-black font-sans leading-tight">
            หมูกระทะพรีเมียม <br />
            <span className="text-ember">สดทุกคำ ร้อนทุกเตา</span>
          </h1>
          <p className="text-sm text-smoke leading-relaxed">
            คัดสรรวัตถุดิบคุณภาพพรีเมียมจากแหล่งที่ดีที่สุด ส่งตรงถึงบ้านด้วยไรเดอร์มืออาชีพ หรือสำรองโต๊ะนั่งอร่อยฟินหน้าร้าน
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="primary" onClick={() => setView('order')}>
              เริ่มสั่งอาหาร <ChevronRight size={16} />
            </Button>
            <Button variant="outline" className="border-white/10 hover:border-white/30 text-white bg-white/5" onClick={() => setView('promotions')}>
              ดูโปรโมชั่นพิเศษ
            </Button>
          </div>
        </div>

        <div className="relative select-none text-7xl sm:text-8xl p-8 rounded-full bg-soft/5 border border-white/5 animate-pulse grid grid-cols-2 gap-4">
          <span>🥩</span> <span>🥬</span>
          <span>🦐</span> <span>🍄</span>
        </div>
      </section>

      {/* Quick Links Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
          <Compass className="text-ember" size={20} />
          บริการของเตาถ่าน
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ['🍖', 'สั่งอาหารฟินๆ', 'เลือกเมนูลงเตา', 'order'],
            ['🛒', 'ตะกร้าของฉัน', 'ตรวจสอบราคารวม', 'cart'],
            ['💳', 'ไปหน้าชำระเงิน', 'เลือกสแกนหรือเงินสด', 'cart'],
            ['📍', 'ติดตามสถานะ', 'ดูขั้นตอนการทำ', 'track']
          ].map(([emoji, title, desc, path]) => (
            <Card key={title} className="p-5 cursor-pointer hover:-translate-y-1 hover:shadow-md transition duration-300" onClick={() => setView(path)}>
              <span className="text-3xl">{emoji}</span>
              <h3 className="font-bold text-sm text-ink mt-3">{title}</h3>
              <p className="text-[10px] text-smoke font-medium mt-1">{desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Popular Menu Section */}
      <section className="space-y-5">
        <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
          <Utensils className="text-ember" size={20} />
          เมนูแนะนำประจำวันนี้
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {menu.slice(0, 3).map((item) => (
            <Card key={item.id} className="overflow-hidden flex flex-col justify-between group">
              <div className="bg-soft py-10 flex items-center justify-center text-7xl select-none group-hover:scale-105 duration-300">
                {item.emoji}
              </div>
              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-black text-base text-ink">{item.name}</h3>
                  <p className="text-xs text-smoke font-medium mt-1">{item.desc}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-line/45">
                  <span className="font-black text-ember">฿{item.price.toLocaleString()}</span>
                  <Button variant="dark" size="small" onClick={() => onAddToCart(item)} className="h-8 text-[11px]">
                    + เพิ่มลงตะกร้า
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
