import { Card } from '../../components/ui/card'

export function AdminCustomers() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-ink">รายชื่อสมาชิกและประวัติการสั่ง</h1>
        <p className="text-xs text-smoke font-medium">ลูกค้าที่สมัครเข้าใช้บริการระบบร้านเตาถ่าน</p>
      </div>

      <Card className="p-5 border border-line">
        <div className="space-y-4 divide-y divide-line/40">
          {[
            ['สมชาย ใจดี', 'สมาชิกตั้งแต่ 12 ก.ค. 2026', '1 ออเดอร์'],
            ['ณิชา สมบูรณ์', 'สมาชิกตั้งแต่ 13 ก.ค. 2026', '3 ออเดอร์'],
            ['มาลี แสนดี', 'สมาชิกตั้งแต่ 14 ก.ค. 2026', '2 ออเดอร์']
          ].map(([name, reg, ord]) => (
            <div key={name} className="pt-4 first:pt-0 flex justify-between items-center gap-4 text-xs font-semibold text-ink">
              <div>
                <b className="block text-sm text-ink">{name}</b>
                <span className="text-smoke font-medium">{reg}</span>
              </div>
              <span className="px-2.5 py-1 rounded bg-soft border border-line text-[10px] text-smoke">
                {ord}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
