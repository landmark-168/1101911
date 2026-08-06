import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'

export function AdminMenu({ menu, showToast }) {
  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink">จัดการเมนูอาหาร</h1>
          <p className="text-xs text-smoke font-medium">เพิ่ม แก้ไขข้อมูล หรือควบคุมรายการสินค้าในร้านเตาถ่าน</p>
        </div>
        <Button variant="primary" size="small" onClick={() => showToast('เปิดฟอร์มสำหรับเพิ่มรายการเมนูใหม่')} className="h-9.5 text-xs">
          + เพิ่มเมนู
        </Button>
      </header>

      <Card className="p-5 border border-line">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {menu.map((m) => (
            <div key={m.id} className="p-4 rounded-xl bg-soft border border-line flex items-center gap-3">
              <span className="text-4xl shrink-0 select-none size-14 bg-white rounded-lg flex items-center justify-center border border-line">{m.emoji}</span>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-xs text-ink truncate">{m.name}</h3>
                <p className="text-[10px] text-smoke font-medium truncate">{m.desc}</p>
                <b className="text-xs text-ember block mt-1">฿{m.price}</b>
              </div>
              <Button
                variant="outline"
                size="small"
                onClick={() => {
                  showToast(`เปิดฟอร์มแก้ไขเมนู: ${m.name}`)
                }}
                className="h-7 text-[10px] px-2"
              >
                แก้ไข
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
