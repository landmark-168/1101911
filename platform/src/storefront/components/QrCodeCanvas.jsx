import { useEffect, useRef } from 'react'

export function QrCodeCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const n = 29
    const z = 7
    canvas.width = canvas.height = n * z
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#171310'

    function s(a, b) {
      ctx.fillRect(a * z, b * z, 7 * z, 7 * z)
      ctx.fillStyle = '#fff'
      ctx.fillRect((a + 1) * z, (b + 1) * z, 5 * z, 5 * z)
      ctx.fillStyle = '#171310'
      ctx.fillRect((a + 2) * z, (b + 2) * z, 3 * z, 3 * z)
    }

    s(1, 1)
    s(21, 1)
    s(1, 21)

    for (let y = 0; y < n; y++) {
      for (let a = 0; a < n; a++) {
        if ((a < 9 && y < 9) || (a > 19 && y < 9) || (a < 9 && y > 19)) continue
        if ((a * a + 3 * y + 17 * a * y) % 11 < 5) {
          ctx.fillRect(a * z, y * z, z, z)
        }
      }
    }
  }, [])

  return (
    <div className="flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-line shadow-sm w-full max-w-[280px] mx-auto text-center">
      <canvas ref={canvasRef} className="w-[180px] h-[180px] rounded-lg shadow-sm border border-zinc-100" />
      <span className="font-bold text-ink mt-2">เตาถ่าน หมูกระทะพรีเมียม</span>
      <span className="text-xs text-smoke font-medium">เลขที่พร้อมเพย์ 081-234-5678</span>
    </div>
  )
}
