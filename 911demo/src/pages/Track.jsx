import { Info } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'

export function Track({ setView, lastOrder, mode, setMode, address, onCallPhone }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 bg-paper">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-3xl font-black text-ink">ติดตามสถานะออเดอร์</h1>
          <p className="text-xs font-semibold text-smoke mt-1">อัปเดตแบบเรียลไทม์ตรงถึงเตาร้อนของคุณ</p>
        </div>
        
        {/* Manual mode switcher for demo simulation */}
        <div className="flex items-center gap-1.5 bg-white border border-line p-1 rounded-xl">
          <span className="text-[10px] font-bold text-smoke px-2">ตัวอย่าง:</span>
          <button
            onClick={() => setMode('delivery')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${mode === 'delivery' ? 'bg-ember text-white shadow-sm' : 'text-smoke hover:bg-soft'}`}
          >
            🛵 เดลิเวอรี่
          </button>
          <button
            onClick={() => setMode('dinein')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${mode === 'dinein' ? 'bg-ember text-white shadow-sm' : 'text-smoke hover:bg-soft'}`}
          >
            🪑 ทานที่ร้าน
          </button>
        </div>
      </div>

      {lastOrder ? (
        <Card className="p-6 sm:p-8 border border-line shadow-md space-y-8">
          <div className="flex flex-col sm:flex-row justify-between border-b border-line pb-4 gap-2">
            <div>
              <h2 className="text-lg font-black text-ink">{lastOrder.id}</h2>
              <p className="text-xs text-smoke font-medium">
                ประเภทการรับประทาน: <strong className="text-ink">{mode === 'delivery' ? 'จัดส่งถึงบ้าน (เดลิเวอรี่)' : 'ทานหน้าร้าน (โต๊ะ 04)'}</strong>
              </p>
            </div>
            <span className="px-3.5 py-1.5 rounded-lg bg-ember/10 border border-ember/30 text-xs font-bold text-ember self-start sm:self-center">
              🔥 {lastOrder.status}
            </span>
          </div>

          {/* Progress Steps UI */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
            <div className="flex flex-col items-center text-center space-y-2 p-3 rounded-xl bg-soft/40 border border-line">
              <span className="size-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">✓</span>
              <b className="text-xs text-ink">รับออเดอร์แล้ว</b>
              <small className="text-[10px] text-smoke font-medium">{lastOrder.time || '18:24 น.'}</small>
            </div>
            <div className="flex flex-col items-center text-center space-y-2 p-3 rounded-xl bg-ember/5 border-2 border-ember">
              <span className="size-8 rounded-full bg-ember text-white flex items-center justify-center font-bold text-sm shadow-sm animate-pulse">🔥</span>
              <b className="text-xs text-ember">กำลังปรุงอาหาร</b>
              <small className="text-[10px] text-ember font-medium">เตากำลังร้อน</small>
            </div>
            <div className="flex flex-col items-center text-center space-y-2 p-3 rounded-xl bg-soft/40 border border-line opacity-50">
              <span className="size-8 rounded-full bg-zinc-200 text-smoke flex items-center justify-center font-bold text-sm">
                {mode === 'delivery' ? '🛵' : '🍽️'}
              </span>
              <b className="text-xs text-ink">{mode === 'delivery' ? 'กำลังจัดส่ง' : 'พร้อมเสิร์ฟ'}</b>
              <small className="text-[10px] text-smoke font-medium">รออัปเดต</small>
            </div>
            <div className="flex flex-col items-center text-center space-y-2 p-3 rounded-xl bg-soft/40 border border-line opacity-50">
              <span className="size-8 rounded-full bg-zinc-200 text-smoke flex items-center justify-center font-bold text-sm">🎉</span>
              <b className="text-xs text-ink">{mode === 'delivery' ? 'ส่งถึงแล้ว' : 'เสิร์ฟเรียบร้อย'}</b>
              <small className="text-[10px] text-smoke font-medium">รออัปเดต</small>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-ember/5 border border-ember/20 text-xs text-ink font-semibold flex items-center gap-2">
            <Info size={16} className="text-ember shrink-0" />
            <span>
              {mode === 'delivery' 
                ? 'อาหารของคุณกำลังย่างและปรุงสดใหม่ คาดว่าจะออกเดินทางจากครัวเตาถ่านใน ~8 นาที' 
                : 'เตาถ่านและชุดอาหารของโต๊ะ 04 กำลังถูกจัดเตรียม คาดว่าจะเสิร์ฟที่โต๊ะใน ~5 นาที'}
            </span>
          </div>

          {/* Track Details Layout */}
          <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-line">
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-ink">รายการอาหารที่สั่ง</h3>
              <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
                {lastOrder.items ? lastOrder.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs font-semibold text-smoke">
                    <span>{item.emoji} {item.name} <small className="text-smoke font-normal">x{item.qty}</small></span>
                    <span className="text-ink">฿{(item.price * item.qty).toLocaleString()}</span>
                  </div>
                )) : (
                  <div className="flex justify-between text-xs font-semibold text-smoke">
                    <span>🥩 ชุดหมูคุโรบูตะเตาถ่าน x1</span>
                    <span className="text-ink">฿299</span>
                  </div>
                )}
              </div>
              <div className="border-t border-line/60 pt-3.5 flex justify-between text-sm">
                <b className="text-ink">ยอดชำระรวมทั้งหมด</b>
                <b className="text-deep">฿{lastOrder.total.toLocaleString()}</b>
              </div>
            </div>

            <div className="space-y-4 p-5 rounded-xl bg-soft border border-line">
              <h3 className="font-bold text-sm text-ink flex items-center gap-1">
                {mode === 'delivery' ? '🛵 รายละเอียดการจัดส่ง' : '🪑 รายละเอียดโต๊ะ'}
              </h3>
              <div className="space-y-1.5 text-xs text-smoke font-medium">
                <p>
                  <strong>{mode === 'delivery' ? 'ผู้รับ:' : 'ตำแหน่งโต๊ะ:'}</strong>{' '}
                  <span className="text-ink">{mode === 'delivery' ? (lastOrder.customer || 'คุณสมชาย ใจดี') : 'โต๊ะ 04'}</span>
                </p>
                <p>
                  <strong>{mode === 'delivery' ? 'ไรเดอร์ผู้จัดส่ง:' : 'พนักงานดูแล:'}</strong>{' '}
                  <span className="text-ink">{mode === 'delivery' ? 'คุณสมโภช (มอเตอร์ไซค์ กข-9988)' : 'คุณนิด'}</span>
                </p>
                {mode === 'delivery' && (
                  <p>
                    <strong>ที่อยู่จัดส่ง:</strong>{' '}
                    <span className="text-ink truncate block max-w-xs">{address.address || 'ที่อยู่ตามระบบในประวัติ'}</span>
                  </p>
                )}
              </div>

              <Button
                variant="outline"
                size="wide"
                onClick={onCallPhone}
                className="h-10 text-xs border-line bg-white shadow-sm mt-3"
              >
                {mode === 'delivery' ? '📞 โทรหาพนักงานจัดส่ง' : '🔔 กดปุ่มเรียกพนักงาน'}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-12 text-center border border-line shadow-sm space-y-4">
          <span className="text-5xl block select-none">🔍</span>
          <h2 className="font-black text-lg text-ink">ไม่มีการสั่งซื้อที่กำลังเปิดอยู่</h2>
          <p className="text-xs text-smoke font-medium">คุณยังไม่มีรายการออเดอร์อาหารที่รอจัดส่งหรือพร้อมเสิร์ฟในระบบตอนนี้</p>
          <Button variant="primary" onClick={() => setView('order')} className="mt-2">
            ไปหน้าสั่งอาหาร
          </Button>
        </Card>
      )}
    </div>
  )
}
