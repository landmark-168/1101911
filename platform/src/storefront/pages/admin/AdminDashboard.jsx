import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'

export function AdminDashboard({ orders, setOrders, showToast }) {
  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink">แดชบอร์ดภาพรวมร้าน</h1>
          <p className="text-xs text-smoke font-medium">อัปเดตข้อมูลขายและยอดจองหมูกระทะแบบเรียลไทม์</p>
        </div>
        <Button variant="primary" size="small" onClick={() => {
          showToast('จำลองการรับออเดอร์ใหม่แล้ว')
          const simId = `#ORD-${Math.floor(1000 + Math.random() * 9000)}`
          setOrders([{ id: simId, customer: 'ลูกค้าจำลองสั่งหน้าร้าน', total: 477, status: 'รอรับออเดอร์' }, ...orders])
        }} className="h-9.5 text-xs">
          + รับออเดอร์หน้าร้าน
        </Button>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          ['ยอดขายวันนี้', '฿24,500', '+12.8% จากเมื่อวาน'],
          ['ออเดอร์วันนี้', '48 รายการ', '+4 รายการชั่วโมงนี้'],
          ['ลูกค้าใหม่วันนี้', '+12 คน', 'ผู้ใช้งานสมัครใหม่']
        ].map(([label, val, trend], idx) => (
          <Card key={label} className="p-5 border border-line space-y-1">
            <p className="text-[10px] text-smoke font-bold uppercase tracking-wider">{label}</p>
            <b className="text-2xl font-black text-ink block">{val}</b>
            <span className="text-[10px] text-emerald-600 font-bold">{trend}</span>
          </Card>
        ))}
      </div>

      {/* Order Table List */}
      <Card className="p-5 border border-line shadow-sm space-y-4">
        <h2 className="text-base font-black text-ink">ออเดอร์ล่าสุดวันนี้</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-semibold">
            <thead>
              <tr className="border-b border-line text-smoke">
                <th className="py-3 px-2">เลขออเดอร์</th>
                <th className="py-3 px-2">ชื่อลูกค้า</th>
                <th className="py-3 px-2">ยอดรวมชำระ</th>
                <th className="py-3 px-2 text-right">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-soft/40 transition">
                  <td className="py-3 px-2 text-ink font-bold">{o.id}</td>
                  <td className="py-3 px-2 text-ink">{o.customer}</td>
                  <td className="py-3 px-2 text-ink">฿{o.total.toLocaleString()}</td>
                  <td className="py-3 px-2 text-right">
                    <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold ${o.status === 'จัดส่งแล้ว' ? 'bg-zinc-200 text-smoke' : 'bg-ember/10 text-ember border border-ember/20'}`}>
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
