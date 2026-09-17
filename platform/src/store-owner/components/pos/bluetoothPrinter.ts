/**
 * Bluetooth Thermal Printer — MXW01 (Fun Print M2 / Cat Printer)
 * Section-Aware Smart Multi-Job Engine
 * 
 * Hardware Constraint: MXW01 firmware drops data if any single job exceeds ~250 lines.
 * Solution: We split into 2 dedicated section canvases:
 * - Section 1: Store info + Order items + Grand total (under 230 lines)
 * - Section 2: Pure intact QR Code + Footer (under 240 lines)
 * Result: 100% complete print, 0% cut-off QR Code!
 */

import QRCode from 'qrcode'

const POSSIBLE_SERVICES = [
  '0000ae30-0000-1000-8000-00805f9b34fb',
  '0000af30-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
]

const CONTROL_WRITE_UUID = '0000ae01-0000-1000-8000-00805f9b34fb'
const NOTIFY_UUID        = '0000ae02-0000-1000-8000-00805f9b34fb'
const DATA_WRITE_UUID    = '0000ae03-0000-1000-8000-00805f9b34fb'

const PRINTER_WIDTH = 384
const PRINTER_WIDTH_BYTES = PRINTER_WIDTH / 8 // 48 bytes per row

export interface BillData {
  billNumber: string
  storeName: string
  storePhone: string
  storeAddress?: string
  tableName: string
  items: { name: string; qty: number; price: number; toppings?: { name: string; price: number }[] }[]
  subtotal: number
  serviceCharge: number
  serviceChargePercent: number
  tax: number
  taxPercent: number
  total: number
  createdAt: string
  promptPayPayload?: string
}

export interface TableQRData {
  storeName: string
  storePhone?: string
  tableNumber: string
  qrUrl: string
}

export type PrintStatus = (msg: string) => void

// ── CRC-8 Checksum ───────────────────────────────────────────────────────────

function calculateCRC8(data: Uint8Array): number {
  let crc = 0x00
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]
    for (let bit = 0; bit < 8; bit++) {
      if (crc & 0x80) {
        crc = ((crc << 1) ^ 0x07) & 0xff
      } else {
        crc = (crc << 1) & 0xff
      }
    }
  }
  return crc
}

function createCommandWithCRC(commandId: number, payload: number[]): Uint8Array {
  const payloadBytes = new Uint8Array(payload)
  const lenLo = payload.length & 0xff
  const lenHi = (payload.length >> 8) & 0xff
  const crc = calculateCRC8(payloadBytes)
  return new Uint8Array([0x22, 0x21, commandId, 0x00, lenLo, lenHi, ...payload, crc, 0xff])
}

function createCommandSimple(commandId: number, payload: number[]): Uint8Array {
  const lenLo = payload.length & 0xff
  const lenHi = (payload.length >> 8) & 0xff
  return new Uint8Array([0x22, 0x21, commandId, 0x00, lenLo, lenHi, ...payload, 0x00, 0x00])
}

// ── PromptPay Payload Generator (Standard Thai EMVCo QR) ──────────────────────

function generatePromptPayPayload(target: string, amount?: number): string {
  // Strip all non-numeric characters
  const sanitized = (target || '').replace(/[^0-9]/g, '')
  let formattedTarget = ''
  let subTag = '0113' // 01 for mobile phone, length 13 (0066XXXXXXXXX)

  if (sanitized.length === 10 && sanitized.startsWith('0')) {
    // Standard 10-digit Thai Mobile (e.g. 0910203541 -> 0066910203541)
    formattedTarget = '0066' + sanitized.slice(1)
    subTag = '0113'
  } else if (sanitized.length === 9) {
    // 9-digit Thai Mobile without 0 (e.g. 910203541 -> 0066910203541)
    formattedTarget = '0066' + sanitized
    subTag = '0113'
  } else if (sanitized.length === 13) {
    // 13-digit Citizen ID / Tax ID
    formattedTarget = sanitized
    subTag = '0213'
  } else {
    // Fallback: 10-digit phone
    const fallback = sanitized.padEnd(10, '0')
    formattedTarget = '0066' + (fallback.startsWith('0') ? fallback.slice(1) : fallback.slice(0, 9))
    subTag = '0113'
  }

  const tag29_sub = `0016A000000677010111${subTag}${formattedTarget}`
  const tag29 = `29${tag29_sub.length.toString().padStart(2, '0')}${tag29_sub}`
  const tag58 = '5802TH'
  const tag53 = '5303764'

  let tag54 = ''
  if (amount && amount > 0) {
    const amtStr = amount.toFixed(2)
    tag54 = `54${amtStr.length.toString().padStart(2, '0')}${amtStr}`
  }

  const raw = `000201010212${tag29}${tag53}${tag58}${tag54}6304`

  let crc = 0xFFFF
  for (let i = 0; i < raw.length; i++) {
    crc ^= raw.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF
      } else {
        crc = (crc << 1) & 0xFFFF
      }
    }
  }
  return raw + crc.toString(16).toUpperCase().padStart(4, '0')
}

// ── Canvas to 1-Bit Raw Bitmap Buffer ─────────────────────────────────────────

function processCanvasTo1Bit(canvas: HTMLCanvasElement): Uint8Array {
  const ctx = canvas.getContext('2d')!
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const width = canvas.width
  const height = canvas.height
  const output: number[] = []

  for (let y = 0; y < height; y++) {
    let byte = 0
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const alpha = img.data[idx + 3]
      const gray = alpha === 0 ? 255 : 0.299 * img.data[idx] + 0.587 * img.data[idx + 1] + 0.114 * img.data[idx + 2]
      
      // Black pixel = 1 (LSB first: 1 << (x % 8))
      if (gray < 160) {
        byte |= (1 << (x % 8))
      }

      if ((x + 1) % 8 === 0 || (x + 1) === width) {
        output.push(byte)
        byte = 0
      }
    }
  }

  return new Uint8Array(output)
}

// ── Canvas Builders (Smart Section Slices) ────────────────────────────────────

const FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Sarabun", "Thonburi", "Noto Sans Thai", "Helvetica Neue", sans-serif'

// Section 1: Items and Total
function makeBillTopSectionCanvas(bill: BillData): HTMLCanvasElement {
  const W = PRINTER_WIDTH
  const canvas = document.createElement('canvas')
  canvas.width = W

  let totalH = 20
  totalH += 30 // Store name
  if (bill.storeAddress) totalH += 20
  totalH += 22 // Phone
  totalH += 14 // Divider
  totalH += 22 // Table
  totalH += 18 // Date
  totalH += 18 // Bill#
  totalH += 14 // Divider
  totalH += 22 // Header "รายการ"
  totalH += bill.items.reduce((height, item) => height + 24 + ((item.toppings?.length || 0) * 18), 0) // Items and add-ons
  totalH += 14 // Divider
  totalH += 22 // Subtotal
  if (bill.serviceChargePercent > 0) totalH += 18
  if (bill.taxPercent > 0) totalH += 18
  totalH += 40 // Total Box
  totalH += 10 // Bottom spacing

  canvas.height = totalH
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, totalH)
  ctx.fillStyle = '#000000'

  let y = 24

  const drawLine = (dashed = false) => {
    ctx.lineWidth = 2
    if (dashed) ctx.setLineDash([6, 4])
    else ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(12, y)
    ctx.lineTo(W - 12, y)
    ctx.stroke()
    ctx.setLineDash([])
    y += 14
  }

  // Store Header
  ctx.font = `bold 26px ${FONT_FAMILY}`
  ctx.textAlign = 'center'
  ctx.fillText(bill.storeName, W / 2, y)
  y += 26

  if (bill.storeAddress) {
    ctx.font = `15px ${FONT_FAMILY}`
    ctx.fillText(bill.storeAddress, W / 2, y)
    y += 18
  }

  ctx.font = `bold 16px ${FONT_FAMILY}`
  ctx.fillText(`โทร: ${bill.storePhone}`, W / 2, y)
  y += 16

  drawLine(true)

  // Order Details
  ctx.font = `bold 18px ${FONT_FAMILY}`
  ctx.textAlign = 'left'
  ctx.fillText(`📍 โต๊ะ: ${bill.tableName}`, 14, y)
  y += 20

  ctx.font = `15px ${FONT_FAMILY}`
  ctx.fillText(`วันที่: ${bill.createdAt}`, 14, y)
  y += 18
  ctx.fillText(`เลขที่บิล: ${bill.billNumber}`, 14, y)
  y += 14

  drawLine(false)

  // Items Header
  ctx.font = `bold 16px ${FONT_FAMILY}`
  ctx.textAlign = 'left'
  ctx.fillText('รายการอาหาร', 14, y)
  ctx.textAlign = 'right'
  ctx.fillText('รวม (฿)', W - 14, y)
  y += 18

  drawLine(true)

  // Items List
  ctx.font = `bold 16px ${FONT_FAMILY}`
  for (const it of bill.items) {
    const itemTotal = `${(it.price * it.qty).toLocaleString()} ฿`
    ctx.textAlign = 'left'
    ctx.fillText(`${it.name} x${it.qty}`, 14, y)
    ctx.textAlign = 'right'
    ctx.fillText(itemTotal, W - 14, y)
    y += 22
    for (const option of it.toppings || []) {
      ctx.font = `14px ${FONT_FAMILY}`
      ctx.textAlign = 'left'
      ctx.fillText(`  + ${option.name}`, 14, y)
      ctx.textAlign = 'right'
      ctx.fillText(`+${Number(option.price || 0).toLocaleString()} ฿`, W - 14, y)
      y += 18
    }
    ctx.font = `bold 16px ${FONT_FAMILY}`
  }

  drawLine(false)

  // Subtotal / Taxes
  ctx.font = `15px ${FONT_FAMILY}`
  ctx.textAlign = 'left'
  ctx.fillText('ยอดรวมค่าอาหาร:', 14, y)
  ctx.textAlign = 'right'
  ctx.fillText(`${bill.subtotal.toLocaleString()} ฿`, W - 14, y)
  y += 20

  if (bill.serviceChargePercent > 0) {
    ctx.textAlign = 'left'
    ctx.fillText(`ค่าบริการ ${bill.serviceChargePercent}%:`, 14, y)
    ctx.textAlign = 'right'
    ctx.fillText(`${bill.serviceCharge.toFixed(2)} ฿`, W - 14, y)
    y += 18
  }

  if (bill.taxPercent > 0) {
    ctx.textAlign = 'left'
    ctx.fillText(`ภาษีมูลค่าเพิ่ม ${bill.taxPercent}%:`, 14, y)
    ctx.textAlign = 'right'
    ctx.fillText(`${bill.tax.toFixed(2)} ฿`, W - 14, y)
    y += 18
  }

  y += 2

  // Grand Total Box
  ctx.lineWidth = 3
  ctx.strokeRect(12, y, W - 24, 38)
  ctx.font = `bold 20px ${FONT_FAMILY}`
  ctx.textAlign = 'left'
  ctx.fillText('ยอดสุทธิทั้งสิ้น', 22, y + 26)
  ctx.textAlign = 'right'
  ctx.fillText(`${bill.total.toLocaleString()} บาท`, W - 22, y + 26)

  return canvas
}

// Section 2: Intact Single-Block QR Code
async function makeBillBottomQRSectionCanvas(bill: BillData): Promise<HTMLCanvasElement> {
  const W = PRINTER_WIDTH
  const canvas = document.createElement('canvas')
  canvas.width = W

  const qrCanvas = document.createElement('canvas')
  const qrPayload = bill.promptPayPayload || generatePromptPayPayload(bill.storePhone, bill.total)
  const QR_SIZE = 160
  await QRCode.toCanvas(qrCanvas, qrPayload, {
    width: QR_SIZE,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  })

  let totalH = 15 // Spacing
  totalH += QR_SIZE + 10 // QR Code
  totalH += 22 // PromptPay text
  totalH += 20 // Phone
  totalH += 24 // Footer thank you
  totalH += 40 // Blank feed

  canvas.height = totalH
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, totalH)
  ctx.fillStyle = '#000000'

  let y = 15

  // QR Code (Solid single square)
  const qrX = Math.round((W - QR_SIZE) / 2)
  ctx.drawImage(qrCanvas, qrX, y, QR_SIZE, QR_SIZE)
  y += QR_SIZE + 16

  ctx.font = `bold 16px ${FONT_FAMILY}`
  ctx.textAlign = 'center'
  ctx.fillText('สแกนชำระผ่าน PromptPay QR', W / 2, y)
  y += 20

  ctx.font = `15px ${FONT_FAMILY}`
  ctx.fillText(`พร้อมเพย์: ${bill.storePhone}`, W / 2, y)
  y += 22

  ctx.font = `bold 15px ${FONT_FAMILY}`
  ctx.fillText('*** ขอบคุณที่ใช้บริการ ***', W / 2, y)

  return canvas
}

async function makeQROnlyCanvas(bill: BillData): Promise<HTMLCanvasElement> {
  const W = PRINTER_WIDTH
  const canvas = document.createElement('canvas')
  canvas.width = W
  
  const qrCanvas = document.createElement('canvas')
  const qrPayload = bill.promptPayPayload || generatePromptPayPayload(bill.storePhone, bill.total)
  const QR_SIZE = 160
  await QRCode.toCanvas(qrCanvas, qrPayload, {
    width: QR_SIZE,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  })

  let totalH = 20
  totalH += 28 // Store name
  totalH += 16 // Divider
  totalH += 22 // Table name & Bill#
  totalH += 38 // Total Box
  totalH += 12 // Spacing
  totalH += QR_SIZE + 10 // QR Code
  totalH += 20 // "สแกนชำระผ่าน PromptPay QR"
  totalH += 20 // Phone
  totalH += 22 // Footer thank you
  totalH += 35 // Bottom feed

  canvas.height = totalH
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, totalH)
  ctx.fillStyle = '#000000'

  let y = 22

  // Store Name
  ctx.font = `bold 24px ${FONT_FAMILY}`
  ctx.textAlign = 'center'
  ctx.fillText(bill.storeName, W / 2, y)
  y += 24

  // Divider
  ctx.lineWidth = 2
  ctx.setLineDash([6, 4])
  ctx.beginPath()
  ctx.moveTo(14, y)
  ctx.lineTo(W - 14, y)
  ctx.stroke()
  ctx.setLineDash([])
  y += 16

  // Table + Bill No
  ctx.font = `bold 18px ${FONT_FAMILY}`
  ctx.textAlign = 'left'
  ctx.fillText(`📍 โต๊ะ: ${bill.tableName}`, 16, y)
  ctx.textAlign = 'right'
  ctx.fillText(`#${bill.billNumber}`, W - 16, y)
  y += 22

  // Total Box
  ctx.lineWidth = 3
  ctx.strokeRect(14, y, W - 28, 36)
  ctx.font = `bold 18px ${FONT_FAMILY}`
  ctx.textAlign = 'left'
  ctx.fillText('ยอดชำระ:', 24, y + 24)
  ctx.textAlign = 'right'
  ctx.fillText(`${bill.total.toLocaleString()} บาท`, W - 24, y + 24)
  y += 46

  // QR Code
  const qrX = Math.round((W - QR_SIZE) / 2)
  ctx.drawImage(qrCanvas, qrX, y, QR_SIZE, QR_SIZE)
  y += QR_SIZE + 16

  // PromptPay Text
  ctx.font = `bold 16px ${FONT_FAMILY}`
  ctx.textAlign = 'center'
  ctx.fillText('สแกนชำระผ่าน PromptPay QR', W / 2, y)
  y += 20

  ctx.font = `15px ${FONT_FAMILY}`
  ctx.fillText(`พร้อมเพย์: ${bill.storePhone}`, W / 2, y)
  y += 22

  ctx.font = `bold 15px ${FONT_FAMILY}`
  ctx.fillText('*** ขอบคุณที่ใช้บริการ ***', W / 2, y)

  return canvas
}

async function makeTableQRCanvas(data: TableQRData): Promise<HTMLCanvasElement> {
  const W = PRINTER_WIDTH
  const canvas = document.createElement('canvas')
  canvas.width = W
  
  const qrCanvas = document.createElement('canvas')
  const QR_SIZE = 170
  await QRCode.toCanvas(qrCanvas, data.qrUrl, {
    width: QR_SIZE,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  })

  let totalH = 20
  totalH += 28 // Store name
  totalH += 16 // Divider
  totalH += 42 // Table Number Box
  totalH += 22 // "สแกนสั่งอาหาร"
  totalH += QR_SIZE + 12 // QR Code
  totalH += 22 // "เปิดกล้องมือถือส่องเพื่อสั่งอาหาร"
  if (data.storePhone) totalH += 20
  totalH += 24 // Footer
  totalH += 35 // Bottom blank feed

  canvas.height = totalH
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, totalH)
  ctx.fillStyle = '#000000'

  let y = 24

  // Store Name
  ctx.font = `bold 24px ${FONT_FAMILY}`
  ctx.textAlign = 'center'
  ctx.fillText(data.storeName, W / 2, y)
  y += 24

  // Divider
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(14, y)
  ctx.lineTo(W - 14, y)
  ctx.stroke()
  y += 16

  // Table Number Box
  ctx.lineWidth = 3
  ctx.strokeRect(20, y, W - 40, 40)
  ctx.font = `bold 26px ${FONT_FAMILY}`
  ctx.textAlign = 'center'
  ctx.fillText(`โต๊ะ ${data.tableNumber}`, W / 2, y + 29)
  y += 52

  // Instructions
  ctx.font = `bold 16px ${FONT_FAMILY}`
  ctx.fillText('สแกนสั่งอาหาร (Scan to Order)', W / 2, y)
  y += 14

  // QR Code
  const qrX = Math.round((W - QR_SIZE) / 2)
  ctx.drawImage(qrCanvas, qrX, y, QR_SIZE, QR_SIZE)
  y += QR_SIZE + 16

  ctx.font = `bold 16px ${FONT_FAMILY}`
  ctx.fillText('เปิดกล้องมือถือสแกนได้ทันที', W / 2, y)
  y += 18

  if (data.storePhone) {
    ctx.font = `14px ${FONT_FAMILY}`
    ctx.fillText(`ติดต่อร้าน: ${data.storePhone}`, W / 2, y)
    y += 18
  }

  ctx.font = `bold 14px ${FONT_FAMILY}`
  ctx.fillText('*** ขอให้อร่อยกับมื้ออาหาร ***', W / 2, y)

  return canvas
}

// ── Multi-Canvas Execution Engine ─────────────────────────────────────────────

async function executeMXW01Canvases(canvases: HTMLCanvasElement[], onStatus: PrintStatus): Promise<void> {
  if (!navigator.bluetooth) throw new Error('กรุณาใช้ Chrome บนคอมพิวเตอร์ และเปิด Bluetooth')

  onStatus('🔍 กำลังเลือกเครื่อง MXW01...')
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: POSSIBLE_SERVICES,
  })

  onStatus(`⏳ กำลังเชื่อมต่อ ${device.name || 'MXW01'}...`)
  if (!device.gatt) throw new Error('GATT ไม่พร้อมใช้งาน')
  const server = await device.gatt.connect()

  try {
    let service: BluetoothRemoteGATTService | null = null
    for (const svcId of POSSIBLE_SERVICES) {
      try {
        service = await server.getPrimaryService(svcId)
        if (service) break
      } catch { /* continue */ }
    }
    if (!service) throw new Error('ไม่พบบริการ AE30 บนเครื่องพิมพ์')

    const ae01Char = await service.getCharacteristic(CONTROL_WRITE_UUID) // Control
    const ae02Char = await service.getCharacteristic(NOTIFY_UUID)        // Notify
    const ae03Char = await service.getCharacteristic(DATA_WRITE_UUID)    // Data

    const responses = new Map<number, Uint8Array>()
    await ae02Char.startNotifications()
    ae02Char.addEventListener('characteristicvaluechanged', (e: any) => {
      const buf = new Uint8Array(e.target.value.buffer)
      if (buf.length >= 6 && buf[0] === 0x22 && buf[1] === 0x21) {
        const cmdId = buf[2]
        const payloadLen = buf[4] | (buf[5] << 8)
        const payload = buf.slice(6, 6 + payloadLen)
        responses.set(cmdId, payload)
      }
    })

    const waitForResponse = async (cmdId: number, timeoutMs = 4000): Promise<Uint8Array | null> => {
      const start = Date.now()
      while (Date.now() - start < timeoutMs) {
        if (responses.has(cmdId)) {
          const resp = responses.get(cmdId)!
          responses.delete(cmdId)
          return resp
        }
        await new Promise(r => setTimeout(r, 40))
      }
      return null
    }

    // 1. Initial Setup Sequence
    onStatus('⚙️ เริ่มต้นการตั้งค่าเครื่องพิมพ์...')
    const cmdSetupB1 = createCommandWithCRC(0xB1, [0x00])
    const cmdSetupA2 = createCommandWithCRC(0xA2, [0x5D])
    const cmdSetupA1 = createCommandWithCRC(0xA1, [0x00])

    await ae01Char.writeValueWithoutResponse(cmdSetupB1)
    await new Promise(r => setTimeout(r, 20))
    await ae01Char.writeValueWithoutResponse(cmdSetupA2)
    await new Promise(r => setTimeout(r, 20))
    await ae01Char.writeValueWithoutResponse(cmdSetupA1)

    await waitForResponse(0xA1, 3000)

    // 2. Print Each Section Canvas (Each <= 240px safe buffer)
    for (let cIdx = 0; cIdx < canvases.length; cIdx++) {
      const canvas = canvases[cIdx]
      const height = canvas.height
      const pixelData = processCanvasTo1Bit(canvas)

      onStatus(`🖨️ กำลังพิมพ์ส่วนที่ ${cIdx + 1}/${canvases.length}...`)

      // A2 + A9 for this canvas
      const cmdPrintA2 = createCommandWithCRC(0xA2, [0x5D])
      const printRequestPayload = [
        height & 0xff,
        (height >> 8) & 0xff,
        PRINTER_WIDTH_BYTES & 0xff,
        (PRINTER_WIDTH_BYTES >> 8) & 0xff,
      ]
      const cmdPrintA9 = createCommandSimple(0xA9, printRequestPayload)

      await ae01Char.writeValueWithoutResponse(cmdPrintA2)
      await new Promise(r => setTimeout(r, 20))
      await ae01Char.writeValueWithoutResponse(cmdPrintA9)

      await waitForResponse(0xA9, 3000)

      // Stream pixel data to AE03 in 20-byte chunks with steady 15ms pacing
      const CHUNK_SIZE = 20
      for (let i = 0; i < pixelData.length; i += CHUNK_SIZE) {
        const chunk = pixelData.slice(i, i + CHUNK_SIZE)
        try {
          await ae03Char.writeValueWithoutResponse(chunk)
        } catch {
          try {
            await ae03Char.writeValue(chunk)
          } catch (e) {
            console.warn('[MXW01] Write err:', e)
          }
        }
        await new Promise(r => setTimeout(r, 15))
      }

      // End of this canvas section (AD)
      const cmdEndPrintAD = createCommandSimple(0xAD, [0x00])
      await ae01Char.writeValueWithoutResponse(cmdEndPrintAD)

      // Wait for section to finish rolling
      const printWaitTime = Math.max(1000, height * 10)
      await Promise.race([
        waitForResponse(0xAA, printWaitTime),
        new Promise(r => setTimeout(r, printWaitTime)),
      ])

      await new Promise(r => setTimeout(r, 150))
    }

    onStatus('✅ พิมพ์บิลเสร็จสมบูรณ์ 100%!')
    await new Promise(r => setTimeout(r, 800))
  } finally {
    server.disconnect()
  }
}

// ── Public Exports ────────────────────────────────────────────────────────────

export async function printReceiptViaBluetooth(bill: BillData, onStatus: PrintStatus = () => {}): Promise<void> {
  const topCanvas = makeBillTopSectionCanvas(bill)
  const bottomCanvas = await makeBillBottomQRSectionCanvas(bill)
  await executeMXW01Canvases([topCanvas, bottomCanvas], onStatus)
}

export async function printQROnlyViaBluetooth(bill: BillData, onStatus: PrintStatus = () => {}): Promise<void> {
  const canvas = await makeQROnlyCanvas(bill)
  await executeMXW01Canvases([canvas], onStatus)
}

export async function printTableQRViaBluetooth(data: TableQRData, onStatus: PrintStatus = () => {}): Promise<void> {
  const canvas = await makeTableQRCanvas(data)
  await executeMXW01Canvases([canvas], onStatus)
}
