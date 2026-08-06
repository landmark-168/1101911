import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'

export function AdminOrders({ orders, setOrders, showToast }) {
  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink">รายการคำสั่งซื้อทั้งหมด</h1>
          <p className="text-xs text-smoke font-medium">อัปเดตขั้นตอนปรุงอาหารหรือรับชำระกับลูกค้า</p>
        </div>
        <Button variant="primary" size="small" onClick={() => {
          showToast('อัปเดตสเตตัสรายการออเดอร์ทั้งหมดล่าสุดแล้ว')
        }} className="h-9.5 text-xs">
          อัปเดตสถานะทั้งหมด
        </Button>
      </header>

      <Card className="p-5 border border-line">
        <div className="space-y-3.5 divide-y divide-line/40">
          {orders.map((o) => (
            <div key={o.id} className="pt-3.5 first:pt-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-ink">{o.id}</h3>
                <p className="text-[11px] text-smoke font-medium">
                  ลูกค้า: <strong>{o.customer}</strong> · ยอดชำระ: <strong className="text-ink">฿{o.total.toLocaleString()}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={o.status}
                  onChange={(e) => {
                    const updated = orders.map(ord => ord.id === o.id ? { ...ord, status: e.target.value } : ord)
                    setOrders(updated)
                    showToast(`อัปเดตออเดอร์ ${o.id} เป็น ${e.target.value}`)
                  }}
                  className="bg-white border border-line text-xs font-bold rounded-lg px-2.5 py-1.5 outline-none text-ink"
                >
                  <option value="รอรับออเดอร์">รอรับออเดอร์</option>
                  <option value="กำลังปรุงอาหาร">กำลังปรุงอาหาร</option>
                  <option value="จัดส่งแล้ว">จัดส่งแล้ว</option>
                  <option value="เสร็จสิ้น">เสร็จสิ้น/เสิร์ฟแล้ว</option>
                </select>
                
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => {
                    const updated = orders.filter(ord => ord.id !== o.id)
                    setOrders(updated)
                    showToast(`ลบรายการออเดอร์ ${o.id} สำเร็จ`)
                  }}
                  className="h-8.5 text-xs text-deep hover:bg-deep hover:text-white"
                >
                  ลบ
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
