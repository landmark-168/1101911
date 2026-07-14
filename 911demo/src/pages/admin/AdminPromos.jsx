import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'

export function AdminPromos({ showToast }) {
  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink">จัดการโปรโมชั่นส่วนลด</h1>
          <p className="text-xs text-smoke font-medium">สิทธิพิเศษสำหรับลูกค้าและยอดขายที่กระตุ้นผ่านแคมเปญ</p>
        </div>
        <Button variant="primary" size="small" onClick={() => showToast('เปิดฟอร์มสำหรับเพิ่มรหัสคูปองส่วนลดใหม่')} className="h-9.5 text-xs">
          + เพิ่มคูปอง
        </Button>
      </header>

      <Card className="p-5 border border-line">
        <div className="space-y-4 divide-y divide-line/40">
          {[
            ['EMBER15', 'ส่วนลด 15% เมื่อสั่งครบ ฿699 ขึ้นไป', 'เปิดใช้งาน'],
            ['SEA99', 'แลกซื้ออัปเกรดซีฟู้ดเพียง ฿99 ในวันอังคาร', 'เปิดใช้งาน']
          ].map(([code, desc, stat]) => (
            <div key={code} className="pt-4 first:pt-0 flex justify-between items-center gap-4">
              <div className="space-y-1">
                <b className="font-mono text-sm text-ember font-black tracking-wider block">{code}</b>
                <p className="text-xs text-smoke font-medium">{desc}</p>
              </div>
              <Button
                variant="outline"
                size="small"
                onClick={() => {
                  showToast(`อัปเดตปิดสถานะใช้งานคูปอง ${code}`)
                }}
                className="h-8.5 text-xs"
              >
                ปิดการใช้งาน
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
