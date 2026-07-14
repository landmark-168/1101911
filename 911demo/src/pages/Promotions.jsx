import { Copy } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'

export function Promotions({ onCopyPromo }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 bg-paper">
      <div>
        <h1 className="text-3xl font-black text-ink">สิทธิพิเศษ & โปรโมชั่น</h1>
        <p className="text-xs font-semibold text-smoke mt-1">คูปองส่วนลดพิเศษเฉพาะคุณสมาชิกเตาถ่าน</p>
      </div>

      <section className="bg-gradient-to-br from-coal via-coal to-deep text-paper p-8 rounded-3xl border border-line/10 shadow-lg relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,#ff5b2415,#00000000_50%)]" />
        <div className="relative z-10 space-y-3 text-center md:text-left">
          <span className="px-2.5 py-1 rounded bg-ember text-white font-bold text-[10px] tracking-wide uppercase">คูปองฮิต</span>
          <h2 className="text-2xl font-black">อิ่มคุ้มเตาร้อน ยอดนิยม ลด 15%</h2>
          <p className="text-xs text-smoke">เมื่อมียอดสั่งซื้อหมูกระทะพรีเมียมครบ 699 บาทขึ้นไป</p>
        </div>

        <div className="relative z-10 flex flex-col items-center gap-3 shrink-0 bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-sm w-full max-w-[240px] text-center">
          <span className="font-mono text-xl font-extrabold text-ember tracking-wider">EMBER15</span>
          <Button variant="primary" size="small" onClick={() => onCopyPromo("EMBER15")} className="gap-1.5 h-8.5 text-[11px] w-full mt-1 bg-gradient-to-r from-ember to-deep border-none text-white">
            <Copy size={12} />
            คัดลอกรหัสคูปอง
          </Button>
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 flex gap-4 items-center">
          <span className="text-4xl select-none">🥓</span>
          <div className="space-y-1.5">
            <h3 className="font-bold text-sm text-ink">ชุดคู่หูอิ่มคุ้ม หมูสไลซ์คู่สามชั้น</h3>
            <p className="text-[11px] text-smoke font-medium">รวมผักสดกรอบพร้อมน้ำจิ้มสูตรเด็ดของทางร้านเตาถ่าน</p>
            <p className="text-xs font-black text-ember">พิเศษเพียง ฿299 <span className="text-[10px] text-smoke line-through font-normal">จากปกติ ฿499</span></p>
          </div>
        </Card>

        <Card className="p-6 flex gap-4 items-center">
          <span className="text-4xl select-none">🦐</span>
          <div className="space-y-1.5">
            <h3 className="font-bold text-sm text-ink">Seafood Tuesday Upgrade 99.-</h3>
            <p className="text-[11px] text-smoke font-medium">แลกซื้ออัปเกรดซีฟู้ด กุ้ง ปลากระพง หอย แมงกะพรุน ในราคาสุดช็อค</p>
            <p className="text-xs font-black text-ember">ทุกวันอังคารเท่านั้น</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
