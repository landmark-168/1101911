import { Trash2, ChevronRight } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'

export function Cart({ setView, cart, changeQty, getCartTotal }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 bg-paper">
      <h1 className="text-3xl font-black text-ink">ตะกร้าของคุณ</h1>
      <p className="text-xs font-semibold text-smoke mt-1.5">ตรวจสอบจำนวนรายการสินค้าอาหารก่อนสั่งซื้อ</p>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-8 mt-8 items-start">
        
        <section className="space-y-4">
          {cart.length > 0 ? (
            <Card className="p-5 border border-line shadow-sm divide-y divide-line/45">
              {cart.map((item) => (
                <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl select-none size-12 bg-soft rounded-lg flex items-center justify-center overflow-hidden">
                      {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : item.emoji}
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-ink">{item.name}</h3>
                      <p className="text-[11px] text-smoke font-medium">฿{item.price.toLocaleString()} / ชิ้น</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center bg-soft border border-line rounded-lg overflow-hidden h-9">
                      <button onClick={() => changeQty(item.id, -1)} className="px-3 hover:bg-line/20 h-full font-extrabold text-ink transition">−</button>
                      <span className="px-3 font-bold text-xs text-ink">{item.qty}</span>
                      <button onClick={() => changeQty(item.id, 1)} className="px-3 hover:bg-line/20 h-full font-extrabold text-ink transition">+</button>
                    </div>
                    <span className="font-black text-sm text-ink w-16 text-right">฿{(item.price * item.qty).toLocaleString()}</span>
                    <button onClick={() => changeQty(item.id, -item.qty)} className="text-smoke hover:text-deep transition" aria-label="ลบรายการ">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </Card>
          ) : (
            <Card className="p-12 text-center border border-line shadow-sm space-y-4">
              <span className="text-5xl block select-none">🛒</span>
              <h2 className="font-black text-lg text-ink">ยังไม่มีอาหารในตะกร้าของคุณ</h2>
              <p className="text-xs text-smoke font-medium">เลือกหมูกระทะคุโรบูตะ ซีฟู้ด หรือเมนูข้างเคียงอื่นๆ ลงตะกร้าเลย!</p>
              <Button variant="primary" onClick={() => setView('order')} className="mt-2.5">
                ดูเมนูอาหาร
              </Button>
            </Card>
          )}
        </section>

        <aside className="space-y-6">
          <Card className="p-6 border border-line shadow-sm space-y-4">
            <h2 className="text-base font-black text-ink border-b border-line pb-3">สรุปออเดอร์</h2>
            <div className="space-y-2 text-xs font-semibold text-smoke">
              <div className="flex justify-between">
                <span>ราคาค่าอาหาร</span>
                <span className="text-ink">฿{getCartTotal().toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>ราคาค่าจัดส่ง</span>
                <span className="text-emerald-600">ฟรี</span>
              </div>
            </div>
            <div className="border-t border-line/60 pt-3 flex justify-between items-center">
              <span className="font-black text-ink text-sm">ยอดรวมจ่ายทั้งหมด</span>
              <span className="font-black text-lg text-deep">฿{getCartTotal().toLocaleString()}</span>
            </div>
            
            {cart.length > 0 ? (
              <Button variant="primary" size="wide" onClick={() => setView('checkout')} className="h-12 mt-2">
                ไปหน้าชำระเงิน <ChevronRight size={15} />
              </Button>
            ) : (
              <Button variant="primary" size="wide" disabled className="h-12 mt-2 opacity-50 cursor-not-allowed">
                ตะกร้าว่าง
              </Button>
            )}
          </Card>
        </aside>

      </div>
    </div>
  )
}
