import { ChevronRight } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { QrCodeCanvas } from '../components/QrCodeCanvas'

export function Checkout({ cart, getCartTotal, onPay }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 bg-paper">
      <h1 className="text-3xl font-black text-ink">ชำระเงิน</h1>
      <p className="text-xs font-semibold text-smoke mt-1.5">เลือกวิธีการชำระเงินเพื่อยืนยันรายการออเดอร์</p>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8 mt-8 items-start">
        
        <section className="space-y-6">
          <Card className="p-6 border border-line shadow-sm space-y-5">
            <h2 className="text-base font-black text-ink">เลือกช่องทางชำระเงิน</h2>
            
            <div className="space-y-3">
              <label className="flex items-start gap-4 p-4 rounded-xl border border-line hover:bg-soft/40 cursor-pointer transition">
                <input
                  type="radio"
                  name="payment"
                  value="cash"
                  defaultChecked
                  className="mt-1 accent-ember size-4"
                  onChange={(e) => {
                    document.getElementById('qrCodeBox').style.display = 'none'
                  }}
                />
                <div className="space-y-1">
                  <b className="text-sm text-ink flex items-center gap-1">💵 ชำระเงินสด</b>
                  <p className="text-[11px] text-smoke font-medium">ชำระหน้าร้านหรือชำระกับพนักงานส่งของเมื่อได้รับอาหาร</p>
                </div>
              </label>

              <label className="flex items-start gap-4 p-4 rounded-xl border border-line hover:bg-soft/40 cursor-pointer transition">
                <input
                  type="radio"
                  name="payment"
                  value="promptpay"
                  className="mt-1 accent-ember size-4"
                  onChange={(e) => {
                    document.getElementById('qrCodeBox').style.display = 'block'
                  }}
                />
                <div className="space-y-1">
                  <b className="text-sm text-ink flex items-center gap-1">📱 PromptPay สแกนจ่าย</b>
                  <p className="text-[11px] text-smoke font-medium">สแกนคิวอาร์โค้ดชำระเงินได้ทันทีเพื่ออำนวยความสะดวก</p>
                </div>
              </label>
            </div>

            {/* QR Box (Hidden by default) */}
            <div id="qrCodeBox" className="hidden pt-4 border-t border-line/60">
              <QrCodeCanvas />
            </div>

            <div className="p-3.5 rounded-xl bg-paper/60 border border-line text-[11px] text-smoke leading-relaxed">
              💡 <strong>หมายเหตุ:</strong> หลังจากยืนยัน ระบบจะจำลองขั้นตอนชำระเงินสำเร็จ และออเดอร์ของท่านจะเริ่มเข้าสู่ขั้นตอนเตรียมปรุงทันที
            </div>
          </Card>
        </section>

        <aside className="space-y-6">
          <Card className="p-6 border border-line shadow-sm space-y-4">
            <h2 className="text-base font-black text-ink border-b border-line pb-3">สรุปออเดอร์</h2>
            <div className="space-y-3 divide-y divide-line/30 max-h-48 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-xs pt-2 first:pt-0 font-medium text-ink">
                  <span>{item.name} <small className="text-smoke font-normal">x{item.qty}</small></span>
                  <b>฿{(item.price * item.qty).toLocaleString()}</b>
                </div>
              ))}
            </div>
            
            <div className="border-t border-line/60 pt-3 flex justify-between items-center">
              <span className="font-black text-ink text-sm">ยอดชำระสุทธิ</span>
              <span className="font-black text-lg text-deep">฿{getCartTotal().toLocaleString()}</span>
            </div>

            <Button variant="primary" size="wide" onClick={onPay} className="h-12 mt-2">
              ยืนยันคำสั่งซื้อ
            </Button>
          </Card>
        </aside>

      </div>
    </div>
  )
}
