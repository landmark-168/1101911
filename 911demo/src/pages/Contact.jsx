import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'

export function Contact({ onSubmitMessage }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 bg-paper">
      <h1 className="text-3xl font-black text-ink">ติดต่อเรา</h1>
      <p className="text-xs font-semibold text-smoke mt-1.5">เรายินดีรับข้อเสนอแนะและพร้อมช่วยเหลือคุณ</p>

      <div className="grid md:grid-cols-[1fr_1.3fr] gap-8 mt-8 items-start">
        
        <section className="space-y-6">
          <Card className="p-6 border border-line shadow-sm space-y-4 bg-white">
            <h2 className="text-sm font-black text-ink border-b border-line pb-3">สำนักงานใหญ่ เตาถ่าน</h2>
            <div className="space-y-3.5 text-xs text-smoke font-medium">
              <p><strong>เบอร์โทรติดต่อ:</strong> <span className="text-ink">02-123-4567</span></p>
              <p><strong>LINE Official:</strong> <span className="text-ink">@taothan</span></p>
              <p><strong>เวลาให้บริการ:</strong> <span className="text-ink">ทุกวัน 11:00 – 23:00 น.</span></p>
              <p><strong>สถานที่ตั้งร้าน:</strong> <span className="text-ink">88 ถนนเตาถ่าน แขวงทองหล่อ เขตวัฒนา กรุงเทพฯ 10110</span></p>
            </div>
          </Card>
        </section>

        <aside>
          <Card className="p-6 border border-line shadow-sm space-y-5 bg-white">
            <h2 className="text-sm font-black text-ink">ส่งข้อความถึงผู้จัดการร้าน</h2>
            
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault()
              onSubmitMessage()
              e.target.reset()
            }}>
              <div className="space-y-2">
                <label className="text-xs font-bold text-ink block">หัวข้อติดต่อ</label>
                <select className="w-full border border-line focus:border-ember outline-none rounded-lg p-2.5 bg-white text-ink text-xs transition">
                  <option>สอบถามข้อมูลทั่วไป</option>
                  <option>แจ้งปัญหาความไม่สะดวกออเดอร์</option>
                  <option>ข้อเสนอแนะเกี่ยวกับรสชาติและบริการ</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-ink block">ข้อความรายละเอียด</label>
                <textarea
                  required
                  rows="5"
                  placeholder="กรุณากรอกรายละเอียดและข้อมูลติดต่อกลับ..."
                  className="w-full border border-line focus:border-ember outline-none rounded-lg p-2.5 bg-white text-ink text-xs transition"
                />
              </div>

              <Button variant="primary" size="wide" type="submit" className="h-11">
                ส่งข้อความ
              </Button>
            </form>
          </Card>
        </aside>

      </div>
    </div>
  )
}
