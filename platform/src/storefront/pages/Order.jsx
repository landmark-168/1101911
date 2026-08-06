import { MapPin, ChevronRight } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'

export function Order({ setView, menu, onAddToCart, mode, setMode, address, setAddress }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 bg-paper">
      <h1 className="text-3xl font-black text-ink">สั่งอาหารหมูกระทะ</h1>
      <p className="text-xs font-semibold text-smoke mt-1.5">เลือกรายการอาหารที่คุณโปรดปราน</p>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-8 mt-8 items-start">
        
        <section className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {menu.map((item) => (
              <Card key={item.id} className="overflow-hidden flex gap-4 p-4 items-center">
                <div className="size-20 rounded-xl bg-soft text-4xl flex items-center justify-center select-none shadow-inner shrink-0 overflow-hidden">
                  {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : item.emoji}
                </div>
                <div className="space-y-2 flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-ink truncate">{item.name}</h3>
                  <p className="text-[11px] text-smoke font-medium line-clamp-1">{item.desc}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-bold text-sm text-ember">฿{item.price}</span>
                    <Button variant="dark" size="small" onClick={() => onAddToCart(item)} className="h-7.5 text-[10px] px-2.5">
                      เพิ่ม
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Delivery / Dine-in Settings Panel */}
        <aside className="space-y-6">
          <Card className="p-6 border border-line shadow-sm space-y-5">
            <h2 className="text-base font-black text-ink flex items-center gap-1.5">
              <MapPin className="text-ember" size={18} />
              รูปแบบการรับประทาน
            </h2>
            
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setMode('delivery')}
                className={`p-3.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 font-bold transition ${mode === 'delivery' ? 'border-ember bg-ember/5 text-ember' : 'border-line hover:bg-soft text-smoke'}`}
              >
                <span className="text-xl">🛵</span>
                <span className="text-xs">สั่งกลับบ้าน</span>
              </button>
              <button
                onClick={() => setMode('dinein')}
                className={`p-3.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 font-bold transition ${mode === 'dinein' ? 'border-ember bg-ember/5 text-ember' : 'border-line hover:bg-soft text-smoke'}`}
              >
                <span className="text-xl">🪑</span>
                <span className="text-xs">ทานที่ร้าน</span>
              </button>
            </div>

            {mode === 'delivery' ? (
              <div className="space-y-4 pt-3 border-t border-line/60">
                <h3 className="text-xs font-bold text-ink">ระบุที่อยู่จัดส่ง</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="ชื่อผู้รับ"
                    value={address.name}
                    onChange={(e) => setAddress({ ...address, name: e.target.value })}
                    className="w-full border border-line focus:border-ember outline-none rounded-lg p-2.5 bg-white text-ink text-xs transition"
                  />
                  <input
                    type="tel"
                    placeholder="เบอร์โทรศัพท์ติดต่อ"
                    value={address.phone}
                    onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                    className="w-full border border-line focus:border-ember outline-none rounded-lg p-2.5 bg-white text-ink text-xs transition"
                  />
                  <textarea
                    placeholder="ที่อยู่สำหรับจัดส่งอย่างละเอียด"
                    rows="3"
                    value={address.address}
                    onChange={(e) => setAddress({ ...address, address: e.target.value })}
                    className="w-full border border-line focus:border-ember outline-none rounded-lg p-2.5 bg-white text-ink text-xs transition"
                  />
                  <input
                    type="text"
                    placeholder="หมายเหตุถึงไรเดอร์ (ถ้ามี)"
                    value={address.note}
                    onChange={(e) => setAddress({ ...address, note: e.target.value })}
                    className="w-full border border-line focus:border-ember outline-none rounded-lg p-2.5 bg-white text-ink text-xs transition"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-soft border border-line text-xs text-smoke leading-relaxed pt-3">
                📍 <strong>ทานที่ร้าน:</strong> สั่งอาหารตอนนี้แล้วทานที่ <strong>โต๊ะ 04</strong> พนักงานของเราจะจัดเตรียมเตาและชุดอาหารให้ทันทีเมื่อออเดอร์เสร็จสิ้น
              </div>
            )}
            
            <Button variant="primary" size="wide" onClick={() => setView('cart')} className="h-12 text-sm mt-3">
              ตรวจสอบตะกร้าและชำระเงิน <ChevronRight size={15} />
            </Button>
          </Card>
        </aside>

      </div>
    </div>
  )
}
