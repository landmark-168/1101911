import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'

export function AdminSettings({ showToast }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-ink">ตั้งค่าระบบร้านค้า</h1>
        <p className="text-xs text-smoke font-medium">ข้อมูลทั่วไปและเวลาให้บริการของแบรนด์เตาถ่าน</p>
      </div>

      <Card className="p-6 border border-line max-w-xl">
        <form className="space-y-5" onSubmit={(e) => {
          e.preventDefault()
          showToast('บันทึกการตั้งค่าระบบร้านค้าเสร็จสิ้น')
        }}>
          <div className="space-y-2">
            <label className="text-xs font-bold text-ink block">ชื่อสาขาของร้าน</label>
            <input
              type="text"
              defaultValue="เตาถ่าน หมูกระทะพรีเมียม (สาขาทองหล่อ)"
              className="w-full border border-line focus:border-ember outline-none rounded-lg p-2.5 bg-white text-ink text-xs transition"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-ink block">เบอร์โทรศัพท์สาขา</label>
            <input
              type="text"
              defaultValue="02-123-4567"
              className="w-full border border-line focus:border-ember outline-none rounded-lg p-2.5 bg-white text-ink text-xs transition"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-ink block">สถานะร้านค้าตอนนี้</label>
            <select className="w-full border border-line focus:border-ember outline-none rounded-lg p-2.5 bg-white text-ink text-xs transition">
              <option>เปิดให้บริการปกติ</option>
              <option>ปิดปรับปรุงร้านชั่วคราว</option>
            </select>
          </div>

          <Button variant="primary" type="submit" className="h-11 px-6 text-xs">
            บันทึกข้อมูลตั้งค่า
          </Button>
        </form>
      </Card>
    </div>
  )
}
