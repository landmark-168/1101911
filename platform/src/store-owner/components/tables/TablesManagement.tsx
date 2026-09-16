import { useState, useMemo, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, Trash2, QrCode, Power, PowerOff, RefreshCw, Download,
  X, Copy, Check, LayoutGrid, List, Receipt, Utensils, Sparkles,
  Clock, ArrowRight, CheckCircle2, AlertCircle, Bluetooth, Bell,
  Volume2, VolumeX, CircleDollarSign, ExternalLink, Globe

} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../../../lib/supabase'
import { useStore } from '../../StoreContext'
import { useLanguage } from '../../../lib/language'
import { printTableQRViaBluetooth } from '../pos/bluetoothPrinter'

// Web Audio API Bill Request Chime (Bell Ring)
function playBillChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()

    const tones = [
      { freq: 659.25, time: 0, dur: 0.35 },    // E5
      { freq: 830.61, time: 0.15, dur: 0.4 },  // G#5
      { freq: 1046.50, time: 0.35, dur: 0.6 }  // C6
    ]

    tones.forEach(t => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(t.freq, ctx.currentTime + t.time)
      gain.gain.setValueAtTime(0.25, ctx.currentTime + t.time)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t.time + t.dur)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + t.time)
      osc.stop(ctx.currentTime + t.time + t.dur)
    })
  } catch {
    // Autoplay policy fallback
  }
}

function isBillCallOrder(o: any) {
  if (!o || o.status === 'completed' || o.status === 'cancelled') return false
  const num = String(o.order_number || '').toUpperCase()
  const name = String(o.customer_name || '').toLowerCase()
  const notes = String(o.notes || '').toLowerCase()
  return num.startsWith('BILL') || name.includes('เรียกเก็บเงิน') || name.includes('เช็คบิล') || notes.includes('เรียกเก็บเงิน') || notes.includes('เช็คบิล')
}

function isStaffCallOrder(o: any) {
  if (!o || o.status === 'completed' || o.status === 'cancelled') return false
  const num = String(o.order_number || '').toUpperCase()
  const name = String(o.customer_name || '').toLowerCase()
  const notes = String(o.notes || '').toLowerCase()
  return num.startsWith('SRV') || name.includes('เรียกพนักงาน') || notes.includes('เรียกพนักงาน')
}

// ─── Table Detail & Actions Modal ─────────────────────────────────────────────
interface TableActionModalProps {
  table: any | null
  activeItemsCount: number
  activeOrders: any[]
  billCallOrder: any | null
  staffCallOrder: any | null
  onClose: () => void
  onOpenTable: (id: string) => void
  onCloseTable: (id: string) => void
  onRegenerateQR: (id: string) => void
  onEdit: (table: any) => void
  onRemove: (id: string) => void
  onDismissCall: (orderId: string) => void
  isOpening: boolean
  isClosing: boolean
  isRegenerating: boolean
  storeSlug: string
  storeName: string
  storePhone?: string
}

function TableActionModal({
  table,
  activeItemsCount,
  activeOrders,
  billCallOrder,
  staffCallOrder,
  onClose,
  onOpenTable,
  onCloseTable,
  onRegenerateQR,
  onEdit,
  onRemove,
  onDismissCall,
  isOpening,
  isClosing,
  isRegenerating,
  storeSlug,
  storeName,
  storePhone,
}: TableActionModalProps) {
  const [copied, setCopied] = useState(false)
  const [btPrinting, setBtPrinting] = useState(false)
  const [btStatus, setBtStatus] = useState('')

  if (!table) return null

  const occupied = table.status === 'occupied'
  const qrUrl = table.qr_token ? `${window.location.origin}/qr/${table.qr_token}` : ''
  const tableTotal = activeOrders.reduce((sum, o) => sum + Number(o.total || 0), 0)

  const handleCopy = () => {
    if (!qrUrl) return
    navigator.clipboard.writeText(qrUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const svgEl = document.getElementById(`qr-svg-${table.id}`) as SVGElement | null
    if (!svgEl) return

    const canvas = document.createElement('canvas')
    const size = 512
    canvas.width = size
    canvas.height = size + 80
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const svgData = new XMLSerializer().serializeToString(svgEl)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 16, 16, size - 32, size - 32)
      ctx.fillStyle = '#1a1a1a'
      ctx.font = 'bold 28px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`โต๊ะ ${table.table_number}`, size / 2, size + 48)
      URL.revokeObjectURL(url)
      const link = document.createElement('a')
      link.download = `qr-table-${table.table_number}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = url
  }

  const handleCloseOrCheckout = () => {
    if (activeItemsCount > 0 || billCallOrder) {
      window.location.href = `/store/${storeSlug}/pos?table_id=${table.id}`
    } else {
      onCloseTable(table.id)
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-5 animate-scale-up max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Urgent Call Alert Banner inside modal */}
        {billCallOrder && (
          <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 dark:border-amber-500/60 dark:bg-amber-950/40 animate-pulse">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-amber-500 text-white font-black">
                  <Bell size={16} className="animate-bell-wiggle" />
                </span>
                <div>
                  <h4 className="text-sm font-black text-amber-900 dark:text-amber-200">
                    🔔 ลูกค้ากดเรียกเก็บเงิน / เช็คบิล!
                  </h4>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mt-0.5">
                    {billCallOrder.notes || 'ลูกค้ารอชำระเงินที่โต๊ะ'}
                  </p>
                  <span className="text-[10px] text-amber-600 dark:text-amber-500 font-bold block mt-1">
                    เมื่อ {new Date(billCallOrder.created_at).toLocaleTimeString('th-TH')} น.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDismissCall(billCallOrder.id)}
                className="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-extrabold bg-amber-200 text-amber-900 hover:bg-amber-300 dark:bg-amber-800 dark:text-amber-100 transition"
              >
                รับทราบ
              </button>
            </div>

            <div className="mt-3 pt-2.5 border-t border-amber-200/80 dark:border-amber-800 flex gap-2">
              <button
                onClick={() => {
                  window.location.href = `/store/${storeSlug}/pos?table_id=${table.id}`
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-md transition cursor-pointer"
              >
                <CircleDollarSign size={14} /> คิดเงินโต๊ะนี้ที่ POS ทันที
              </button>
            </div>
          </div>
        )}

        {/* Staff Call Alert Banner inside modal */}
        {!billCallOrder && staffCallOrder && (
          <div className="rounded-2xl border-2 border-blue-400 bg-blue-50 p-4 dark:border-blue-500/60 dark:bg-blue-950/40">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-blue-500 text-white font-black">
                  🙋‍♂️
                </span>
                <div>
                  <h4 className="text-sm font-black text-blue-900 dark:text-blue-200">
                    ลูกค้ากดเรียกพนักงาน
                  </h4>
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mt-0.5">
                    {staffCallOrder.notes || 'ลูกค้าต้องการความช่วยเหลือ'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDismissCall(staffCallOrder.id)}
                className="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-extrabold bg-blue-200 text-blue-900 hover:bg-blue-300 dark:bg-blue-800 dark:text-blue-100 transition"
              >
                รับทราบ
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3.5">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-black shadow-inner ${
              billCallOrder
                ? 'bg-amber-500 text-white shadow-amber-500/40 animate-pulse'
                : occupied
                ? 'bg-orange-500 text-white shadow-orange-500/30'
                : 'bg-emerald-500 text-white shadow-emerald-500/30'
            }`}>
              {table.table_number}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-zinc-950 dark:text-white">โต๊ะ {table.table_number}</h2>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                  billCallOrder
                    ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300'
                    : occupied
                    ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                }`}>
                  {billCallOrder ? '🔔 เรียกเก็บเงิน' : occupied ? '🔴 มีลูกค้า' : '🟢 ว่าง'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium mt-0.5">
                {occupied && table.session_opened_at
                  ? `เปิดโต๊ะเมื่อ ${new Date(table.session_opened_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`
                  : 'ยังไม่เปิดรอบบริการ'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* QR Section */}
        {occupied && table.qr_token ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-gradient-to-b from-zinc-50 to-zinc-100/60 p-4 border border-zinc-200/80 dark:from-zinc-800/40 dark:to-zinc-800/80 dark:border-zinc-700">
            <div className="rounded-2xl bg-white p-3.5 shadow-md ring-1 ring-zinc-100 dark:ring-zinc-700">
              <QRCodeSVG
                id={`qr-svg-${table.id}`}
                value={qrUrl}
                size={170}
                level="H"
                includeMargin={false}
              />
            </div>

            {/* URL Copy */}
            <div className="flex w-full items-center gap-2 rounded-xl border border-zinc-200/80 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900 shadow-2xs">
              <p className="flex-1 truncate text-[11px] font-mono text-zinc-500 dark:text-zinc-400">{qrUrl}</p>
              <button
                onClick={handleCopy}
                className="shrink-0 rounded-lg px-2 py-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                title="คัดลอกลิงก์"
              >
                {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
              </button>
            </div>

            <div className="flex flex-col w-full gap-2 pt-1">
              <button
                disabled={btPrinting}
                onClick={async () => {
                  if (!qrUrl) return
                  setBtPrinting(true)
                  setBtStatus('กำลังค้นหาเครื่องพิมพ์...')
                  try {
                    await printTableQRViaBluetooth({
                      storeName: storeName || 'ร้านค้า',
                      storePhone: storePhone || '',
                      tableNumber: table.table_number,
                      qrUrl: qrUrl,
                    }, (msg) => setBtStatus(msg))
                    setBtStatus('✅ พิมพ์ QR โต๊ะสำเร็จ!')
                  } catch (err: any) {
                    setBtStatus(`❌ ${err.message}`)
                  } finally {
                    setBtPrinting(false)
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition shadow-md cursor-pointer disabled:opacity-50 active:scale-98"
              >
                <Bluetooth size={16} />
                {btPrinting ? 'กำลังพิมพ์ QR...' : `🖨️ พิมพ์ QR โต๊ะ ${table.table_number} (Bluetooth)`}
              </button>

              {btStatus && (
                <p className="text-center text-xs font-bold py-1.5 px-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200">
                  {btStatus}
                </p>
              )}

              <div className="flex w-full gap-2">
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition shadow-sm cursor-pointer dark:bg-zinc-700 dark:hover:bg-zinc-600"
                >
                  <Download size={14} /> โหลดรูป QR
                </button>
                <button
                  onClick={() => onRegenerateQR(table.id)}
                  disabled={isRegenerating}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-orange-300 text-orange-600 hover:bg-orange-50 text-xs font-bold transition disabled:opacity-50 cursor-pointer dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/10"
                >
                  <RefreshCw size={14} className={isRegenerating ? 'animate-spin' : ''} /> รีเซ็ต QR ใหม่
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 px-4 rounded-3xl bg-zinc-50 border-2 border-dashed border-zinc-200 text-center space-y-2.5 dark:bg-zinc-800/40 dark:border-zinc-700">
            <span className="grid size-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 text-2xl dark:bg-emerald-950/60 dark:text-emerald-400">
              🪑
            </span>
            <p className="text-sm font-black text-zinc-800 dark:text-zinc-200">โต๊ะนี้พร้อมให้บริการ</p>
            <p className="text-xs text-zinc-400 max-w-xs">กดปุ่ม "เปิดโต๊ะ" เพื่อเริ่มเปิดรอบบริการและสร้าง QR Code สำหรับสั่งอาหาร</p>
          </div>
        )}

        {/* Live Orders Summary Preview (If Occupied) */}
        {occupied && activeItemsCount > 0 && (
          <div className="rounded-2xl border border-orange-200/80 bg-orange-50/50 p-4 dark:border-orange-900/40 dark:bg-orange-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-orange-950 dark:text-orange-200 flex items-center gap-1.5">
                <Utensils size={14} className="text-orange-500" /> รายการอาหารในรอบนี้
              </span>
              <span className="text-xs font-black text-orange-600 dark:text-orange-400">
                {activeItemsCount} รายการ · ฿{tableTotal.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Action Menu */}
        <div className="space-y-2.5 pt-1">
          {occupied ? (
            <>
              <button
                onClick={handleCloseOrCheckout}
                disabled={isClosing}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white text-sm font-black transition shadow-lg cursor-pointer active:scale-98 disabled:opacity-50 ${
                  billCallOrder
                    ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25 animate-pulse'
                    : activeItemsCount > 0
                    ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/25'
                    : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600'
                }`}
              >
                {isClosing ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : activeItemsCount > 0 || billCallOrder ? (
                  <>
                    <Receipt size={18} />
                    <span>ไปที่ระบบ POS (เช็คบิล โต๊ะ {table.table_number})</span>
                    <ArrowRight size={16} />
                  </>
                ) : (
                  <>
                    <PowerOff size={18} />
                    <span>ปิดโต๊ะ (เปลี่ยนสถานะเป็นว่าง)</span>
                  </>
                )}
              </button>

              {activeItemsCount > 0 && (
                <button
                  onClick={() => {
                    if (confirm(`ยืนยันการเคลียร์และปิดโต๊ะ ${table.table_number} ทันทีโดยไม่ต้องคิดเงินที่ POS?`)) {
                      onCloseTable(table.id)
                      onClose()
                    }
                  }}
                  className="w-full text-center text-xs font-bold text-zinc-400 hover:text-zinc-600 py-1.5 transition"
                >
                  บังคับปิดโต๊ะทันที (Force Close)
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => onOpenTable(table.id)}
              disabled={isOpening}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-black transition shadow-lg shadow-emerald-500/25 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {isOpening ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <>
                  <Power size={18} />
                  <span>เปิดโต๊ะ {table.table_number} (สร้าง QR Code)</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={() => onEdit(table)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-xs font-bold transition cursor-pointer dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            แก้ไขเลขโต๊ะ / จำนวนที่นั่ง
          </button>

          <button
            onClick={() => {
              onRemove(table.id)
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 text-xs font-bold transition cursor-pointer dark:hover:bg-red-950/20"
          >
            <Trash2 size={13} /> ลบโต๊ะนี้ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Tables Management Component ─────────────────────────────────────────
export default function TablesManagement() {
  const { language } = useLanguage()
  const english = language === 'en'
  const { store } = useStore()
  const qc = useQueryClient()
  const key = ['store_tables', store.id]

  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [selectedTable, setSelectedTable] = useState<any | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [isAddTableOpen, setIsAddTableOpen] = useState(false)
  const [newTableNumber, setNewTableNumber] = useState('')
  const [newTableCapacity, setNewTableCapacity] = useState('4')
  const lastBillCallCountRef = useRef<number>(0)

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3500)
  }

  // Fetch Tables
  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_tables')
        .select('*')
        .eq('store_id', store.id)
        .order('table_number')
      if (error) throw error
      return data || []
    }
  })

  // Fetch Active Orders to count items and check bill/service calls
  const activeOrdersQuery = useQuery({
    queryKey: ['active-table-orders-count', store.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_orders')
        .select('id, table_id, order_number, customer_name, notes, status, total, created_at, store_order_items(id, name, quantity, unit_price)')
        .eq('store_id', store.id)
        .neq('status', 'cancelled')
        .neq('status', 'completed')
      if (error) return []
      return data || []
    },
    refetchInterval: 5000
  })

  // Supabase Realtime Subscription for instant updates
  useEffect(() => {
    if (!store?.id) return
    const channel = supabase
      .channel(`tables-realtime:${store.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_orders', filter: `store_id=eq.${store.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ['active-table-orders-count', store.id] })
          qc.invalidateQueries({ queryKey: key })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_tables', filter: `store_id=eq.${store.id}` },
        () => {
          qc.invalidateQueries({ queryKey: key })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [store.id, qc])

  // Helper: Get active food orders for table (excluding service/bill call requests)
  const getTableActiveOrders = (tableId: string) => {
    return (activeOrdersQuery.data || []).filter((o: any) => {
      if (o.table_id !== tableId) return false
      if (o.status === 'completed' || o.status === 'cancelled') return false
      if (isBillCallOrder(o) || isStaffCallOrder(o)) return false
      return true
    })
  }

  // Helper: Count active food items for a table
  const getTableActiveItemsCount = (tableId: string) => {
    const orders = getTableActiveOrders(tableId)
    return orders.reduce((sum: number, o: any) => {
      const itemsCount = (o.store_order_items || []).reduce((s: number, it: any) => s + (it.quantity || 1), 0)
      return sum + itemsCount
    }, 0)
  }

  // Helper: Get active bill call request for table
  const getTableBillCall = (tableId: string) => {
    return (activeOrdersQuery.data || []).find((o: any) => {
      if (o.table_id !== tableId) return false
      return isBillCallOrder(o)
    })
  }

  // Helper: Get active staff call request for table
  const getTableStaffCall = (tableId: string) => {
    return (activeOrdersQuery.data || []).find((o: any) => {
      if (o.table_id !== tableId) return false
      return isStaffCallOrder(o)
    })
  }

  // Detect bill calls and play audio chime
  const allActiveBillCalls = useMemo(() => {
    return (activeOrdersQuery.data || []).filter((o: any) => isBillCallOrder(o))
  }, [activeOrdersQuery.data])

  useEffect(() => {
    if (allActiveBillCalls.length > lastBillCallCountRef.current) {
      if (soundEnabled) {
        playBillChime()
      }
    }
    lastBillCallCountRef.current = allActiveBillCalls.length
  }, [allActiveBillCalls, soundEnabled])

  // Dismiss Call Mutation
  const dismissCall = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('store_orders')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('store_id', store.id)
        .eq('id', orderId)
      if (error) throw error
    },
    onSuccess: () => {
      showMsg('รับทราบคำขอเรียบร้อยแล้ว')
      qc.invalidateQueries({ queryKey: ['active-table-orders-count', store.id] })
    }
  })

  // Add Table
  const add = useMutation({
    mutationFn: async ({ tableNumber, capacity }: { tableNumber: string; capacity: number }) => {
      const { error } = await supabase.from('store_tables').insert({
        store_id: store.id,
        table_number: tableNumber,
        capacity
      })
      if (error) throw error
    },
    onSuccess: () => {
      showMsg('เพิ่มโต๊ะเรียบร้อย')
      qc.invalidateQueries({ queryKey: key })
      setIsAddTableOpen(false)
      setNewTableNumber('')
      setNewTableCapacity('4')
    },
    onError: e => showMsg((e as Error).message, 'error')
  })

  // Delete Table
  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm('ยืนยันการลบโต๊ะนี้?')) return
      const [{ data: table, error: tableError }, { count, error: orderError }] = await Promise.all([
        supabase.from('store_tables').select('status').eq('store_id', store.id).eq('id', id).single(),
        supabase.from('store_orders').select('id', { count: 'exact', head: true }).eq('store_id', store.id).eq('table_id', id).not('status', 'in', '(completed,cancelled)')
      ])
      if (tableError) throw tableError
      if (orderError) throw orderError
      if (table?.status !== 'available' || Number(count || 0) > 0) throw new Error('ลบได้เฉพาะโต๊ะว่างที่ไม่มีออเดอร์ค้าง')
      const { error } = await supabase.from('store_tables').delete().eq('store_id', store.id).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      showMsg('ลบโต๊ะเรียบร้อย')
      qc.invalidateQueries({ queryKey: key })
      setSelectedTable(null)
    },
    onError: e => showMsg((e as Error).message, 'error')
  })

  const editTable = useMutation({
    mutationFn: async ({ id, tableNumber, capacity }: { id: string; tableNumber: string; capacity: number }) => {
      const cleanNumber = tableNumber.trim()
      if (!cleanNumber) throw new Error('กรุณาระบุเลขโต๊ะ')
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 50) throw new Error('จำนวนที่นั่งต้องอยู่ระหว่าง 1–50')
      const { data, error } = await supabase
        .from('store_tables')
        .update({ table_number: cleanNumber, capacity })
        .eq('store_id', store.id)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: data => {
      showMsg('แก้ไขข้อมูลโต๊ะเรียบร้อย')
      qc.invalidateQueries({ queryKey: key })
      setSelectedTable(data)
    },
    onError: e => showMsg((e as Error).message, 'error')
  })

  const requestEditTable = (table: any) => {
    const tableNumber = prompt('เลขโต๊ะ', String(table.table_number || ''))
    if (tableNumber === null) return
    const capacityText = prompt('จำนวนที่นั่ง (1–50)', String(table.capacity || 4))
    if (capacityText === null) return
    editTable.mutate({ id: table.id, tableNumber, capacity: Number(capacityText) })
  }

  // Open Table
  const openTable = useMutation({
    mutationFn: async (id: string) => {
      const newToken = crypto.randomUUID()
      const sessionOpenedAt = new Date().toISOString()
      const { error } = await supabase.from('store_tables').update({
        status: 'occupied',
        qr_token: newToken,
        session_opened_at: sessionOpenedAt
      }).eq('store_id', store.id).eq('id', id)
      if (error) throw error
      return { id, newToken, sessionOpenedAt }
    },
    onSuccess: (result) => {
      showMsg('เปิดโต๊ะเรียบร้อย ระบบได้สร้าง QR Code ให้ใหม่แล้ว')
      qc.invalidateQueries({ queryKey: key })
      qc.invalidateQueries({ queryKey: ['active-table-orders-count', store.id] })
      if (result) {
        setSelectedTable((prev: any) => prev ? {
          ...prev,
          status: 'occupied',
          qr_token: result.newToken,
          session_opened_at: result.sessionOpenedAt
        } : null)
      }
    },
    onError: e => showMsg((e as Error).message, 'error')
  })

  // Close Table
  const closeTable = useMutation({
    mutationFn: async (id: string) => {
      const newToken = crypto.randomUUID()
      const { error } = await supabase.from('store_tables').update({
        status: 'available',
        qr_token: newToken,
        session_opened_at: null
      }).eq('store_id', store.id).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      showMsg('ปิดโต๊ะเรียบร้อย')
      qc.invalidateQueries({ queryKey: key })
      qc.invalidateQueries({ queryKey: ['active-table-orders-count', store.id] })
    },
    onError: e => showMsg((e as Error).message, 'error')
  })

  // Regenerate QR
  const regenerateQR = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm('ต้องการสร้าง QR Code ใหม่อีกครั้งหรือไม่?\nลิงก์เก่าจะใช้งานไม่ได้ทันที')) return
      const newToken = crypto.randomUUID()
      const { error } = await supabase.from('store_tables').update({
        qr_token: newToken
      }).eq('store_id', store.id).eq('id', id)
      if (error) throw error
      return { id, newToken }
    },
    onSuccess: (result) => {
      showMsg('สร้าง QR Code ใหม่สำเร็จ')
      qc.invalidateQueries({ queryKey: key }).then(() => {
        if (result && selectedTable?.id === result.id) {
          setSelectedTable((prev: any) => prev ? { ...prev, qr_token: result.newToken } : null)
        }
      })
    },
    onError: e => showMsg((e as Error).message, 'error')
  })

  const rows = useMemo(() => {
    const list = query.data || []
    if (!search) return list
    return list.filter((x: any) => x.table_number.toLowerCase().includes(search.toLowerCase()))
  }, [query.data, search])

  const storeSlug = typeof window !== 'undefined' ? (window.location.pathname.split('/')[2] || store.slug || store.id) : (store.slug || store.id)
  const storefrontLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${store.slug || store.id}`
  const [storefrontCopied, setStorefrontCopied] = useState(false)
  const liveTable = selectedTable ? rows.find((x: any) => x.id === selectedTable.id) || selectedTable : null
  const liveTableOrders = liveTable ? getTableActiveOrders(liveTable.id, liveTable.session_opened_at) : []
  const liveItemsCount = liveTable ? getTableActiveItemsCount(liveTable.id, liveTable.session_opened_at) : 0
  const liveBillCall = liveTable ? getTableBillCall(liveTable.id) : null
  const liveStaffCall = liveTable ? getTableStaffCall(liveTable.id) : null

  // Stats calculation
  const totalTables = rows.length
  const occupiedTables = rows.filter((x: any) => x.status === 'occupied').length
  const availableTables = totalTables - occupiedTables

  const copyStorefrontLink = async () => {
    await navigator.clipboard.writeText(storefrontLink)
    setStorefrontCopied(true)
    setTimeout(() => setStorefrontCopied(false), 2000)
  }

  // Tables that currently have active bill call
  const callingTables = useMemo(() => {
    return rows.filter((x: any) => !!getTableBillCall(x.id))
  }, [rows, activeOrdersQuery.data])

  // Handle Quick Toggle (เปิด/ปิด โต๊ะ)
  const handleToggleTable = (e: React.MouseEvent, x: any) => {
    e.stopPropagation()
    const billCall = getTableBillCall(x.id)
    if (x.status === 'occupied') {
      const count = getTableActiveItemsCount(x.id)
      if (count > 0 || billCall) {
        window.location.href = `/store/${storeSlug}/pos?table_id=${x.id}`
      } else {
        closeTable.mutate(x.id)
      }
    } else {
      openTable.mutate(x.id)
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast message */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-xl transition-all ${
          message.type === 'error' ? 'bg-red-500' : 'bg-emerald-600'
        }`}>
          {message.text}
        </div>
      )}

      {/* ── Active Bill Call Alert Banner (แจ้งเตือนเรียกเก็บเงินแบบชัดเจน) ── */}
      {callingTables.length > 0 && (
        <div className="rounded-3xl border-2 border-amber-400 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 p-4 sm:p-5 text-white shadow-xl shadow-amber-500/20 animate-pulse">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-white/20 text-white backdrop-blur-md">
                <Bell size={24} className="animate-bell-wiggle" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                  <span>มีลูกค้ากดเรียกเก็บเงิน {callingTables.length} โต๊ะ!</span>
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-black text-amber-600">
                    {callingTables.map((t: any) => `โต๊ะ ${t.table_number}`).join(', ')}
                  </span>
                </h3>
                <p className="text-xs text-amber-100 font-semibold mt-0.5">
                  กรุณาตรวจสอบและดำเนินการคิดเงินที่ระบบ POS หรือเข้ารับชำระเงินที่โต๊ะ
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {callingTables.length === 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = `/store/${storeSlug}/pos?table_id=${callingTables[0].id}`
                  }}
                  className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-amber-700 shadow-md transition hover:bg-amber-50 active:scale-95"
                >
                  <CircleDollarSign size={16} />
                  <span>คิดเงินโต๊ะ {callingTables[0].table_number} ที่ POS</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = `/store/${storeSlug}/pos`
                  }}
                  className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-amber-700 shadow-md transition hover:bg-amber-50 active:scale-95"
                >
                  <CircleDollarSign size={16} />
                  <span>เปิดระบบ POS</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header & Stats Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-black tracking-widest text-orange-500 uppercase">Live Store Workspace</span>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
            {english ? 'Table layout & management' : 'ผังโต๊ะ & จัดการโต๊ะ'}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium">
            {english ? 'Table overview, guest status, and table QR codes' : 'ภาพรวมผังโต๊ะ สถานะลูกค้า และจัดการ QR Code ประจำโต๊ะ'}
          </p>
        </div>

        {/* Toolbar & Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Sound Alert Toggle */}
          <button
            type="button"
            onClick={() => {
              const nextVal = !soundEnabled
              setSoundEnabled(nextVal)
              if (nextVal) playBillChime()
            }}
            className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition border ${
              soundEnabled
                ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-300'
                : 'bg-white border-zinc-200 text-zinc-400 dark:bg-zinc-900 dark:border-zinc-800'
            }`}
            title={soundEnabled ? (english ? 'Disable bill request alerts' : 'ปิดเสียงแจ้งเตือนเรียกเก็บเงิน') : (english ? 'Enable bill request alerts' : 'เปิดเสียงแจ้งเตือนเรียกเก็บเงิน')}
          >
            {soundEnabled ? <Volume2 size={16} className="text-amber-500 animate-pulse" /> : <VolumeX size={16} />}
            <span>{soundEnabled ? (english ? 'Sound alerts on' : 'เสียงเตือนเปิดอยู่') : (english ? 'Sound alerts off' : 'ปิดเสียงเตือน')}</span>
          </button>

          {/* Add Table Button */}
          <button
            onClick={() => setIsAddTableOpen(true)}
            className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600 transition active:scale-95 cursor-pointer"
          >
            <Plus size={18} strokeWidth={3} /> {english ? 'Add table' : 'เพิ่มโต๊ะใหม่'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200/80 bg-white px-4 py-3 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><p className="text-xs font-black text-zinc-800 dark:text-white">{english ? 'Online store link' : 'ลิงก์ร้านออนไลน์'}</p><p className="mt-0.5 truncate font-mono text-[11px] text-zinc-500 dark:text-zinc-400">{storefrontLink}</p></div>
        <div className="flex shrink-0 gap-2"><button type="button" onClick={copyStorefrontLink} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 px-3 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"><Copy size={14} />{storefrontCopied ? (english ? 'Copied' : 'คัดลอกแล้ว') : (english ? 'Copy' : 'คัดลอก')}</button><a href={storefrontLink} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-orange-500 px-3 text-xs font-bold text-white hover:bg-orange-600"><ExternalLink size={14} />{english ? 'Open store' : 'เปิดร้าน'}</a></div>
      </div>

      {/* Quick KPI Stat Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid size-10 place-items-center rounded-xl bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white font-black text-base">
            {totalTables}
          </div>
          <div>
            <p className="text-[11px] font-bold text-zinc-400">{english ? 'All tables' : 'โต๊ะทั้งหมด'}</p>
            <p className="text-xs font-extrabold text-zinc-900 dark:text-white">{totalTables} {english ? 'tables in store' : 'โต๊ะในร้าน'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 shadow-2xs dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="grid size-10 place-items-center rounded-xl bg-emerald-500 text-white font-black text-base shadow-sm">
            {availableTables}
          </div>
          <div>
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{english ? 'Available tables' : 'โต๊ะว่าง (พร้อมรับ)'}</p>
            <p className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200">{availableTables} {english ? 'tables' : 'โต๊ะ'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-red-200/80 bg-red-50/50 p-3.5 shadow-2xs dark:border-red-900/40 dark:bg-red-950/20">
          <div className="grid size-10 place-items-center rounded-xl bg-red-500 text-white font-black text-base shadow-sm">
            {occupiedTables}
          </div>
          <div>
            <p className="text-[11px] font-bold text-red-600 dark:text-red-400">{english ? 'Dining' : 'กำลังรับประทาน'}</p>
            <p className="text-xs font-extrabold text-red-900 dark:text-red-200">{occupiedTables} {english ? 'tables with guests' : 'โต๊ะมีลูกค้า'}</p>
          </div>
        </div>

        {/* Bill call stats card */}
        <div className={`flex items-center gap-3 rounded-2xl border p-3.5 shadow-2xs transition ${
          callingTables.length > 0
            ? 'border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-500/60 dark:bg-amber-950/30 dark:text-amber-200 animate-pulse'
            : 'border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900'
        }`}>
          <div className={`grid size-10 place-items-center rounded-xl font-black text-base ${
            callingTables.length > 0 ? 'bg-amber-500 text-white shadow-sm' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800'
          }`}>
            <Bell size={18} className={callingTables.length > 0 ? 'animate-bell-wiggle' : ''} />
          </div>
          <div>
            <p className={`text-[11px] font-bold ${callingTables.length > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-zinc-400'}`}>
              {english ? 'Bill requested' : 'เรียกเก็บเงิน'}
            </p>
            <p className="text-xs font-extrabold">
              {callingTables.length > 0 ? (english ? `${callingTables.length} tables pending` : `${callingTables.length} โต๊ะรอดำเนินการ`) : (english ? 'No table calls' : 'ไม่มีโต๊ะเรียก')}
            </p>
          </div>
        </div>
      </div>

      {/* Control Bar: View Toggle + Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* View Toggle */}
        <div className="flex rounded-2xl border border-zinc-200/80 bg-white p-1 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-zinc-900 text-white shadow-xs dark:bg-white dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
            }`}
          >
            <LayoutGrid size={14} /> {english ? 'Grid view' : 'มุมมองการ์ด'}
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition cursor-pointer ${
              viewMode === 'table'
                ? 'bg-zinc-900 text-white shadow-xs dark:bg-white dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
            }`}
          >
            <List size={14} /> {english ? 'List view' : 'มุมมองตาราง'}
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-64">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={english ? 'Search table number…' : 'ค้นหาเบอร์โต๊ะ…'}
            className="h-10 w-full rounded-2xl border border-zinc-200/80 bg-white pl-10 pr-4 text-xs font-bold shadow-2xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
          />
        </div>
      </div>

      {/* Main Container */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
        {query.isLoading ? (
          <p className="p-16 text-center text-xs font-bold text-zinc-400">กำลังโหลดข้อมูลผังโต๊ะ…</p>
        ) : query.error ? (
          <p className="p-8 text-center text-xs font-bold text-red-500">{(query.error as Error).message}</p>
        ) : viewMode === 'grid' ? (
          /* ── Premium Modern Grid View ── */
          <div className="p-5 sm:p-7">
            {rows.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <span className="text-4xl block opacity-40">🪑</span>
                <p className="text-sm font-bold text-zinc-400">ยังไม่มีข้อมูลโต๊ะในระบบ</p>
                <button
                  onClick={() => setIsAddTableOpen(true)}
                  className="px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition"
                >
                  + เพิ่มโต๊ะแรก
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {rows.map((x: any) => {
                  const occupied = x.status === 'occupied'
                  const itemsCount = getTableActiveItemsCount(x.id)
                  const orders = getTableActiveOrders(x.id)
                  const totalAmt = orders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0)
                  const billCall = getTableBillCall(x.id)
                  const staffCall = getTableStaffCall(x.id)

                  return (
                    <div
                      key={x.id}
                      onClick={() => setSelectedTable(x)}
                      className={`group relative flex flex-col justify-between rounded-3xl border-2 p-5 sm:p-6 transition-all duration-300 cursor-pointer select-none hover:-translate-y-1 hover:shadow-xl active:scale-98 ${
                        billCall
                          ? 'animate-table-bill border-amber-400 bg-gradient-to-b from-amber-100 via-amber-50/90 to-white ring-4 ring-amber-400/50 dark:from-amber-950/50 dark:to-zinc-900 dark:border-amber-400'
                          : occupied
                          ? 'border-orange-200 bg-gradient-to-b from-orange-50/80 to-white hover:border-orange-400 dark:border-orange-900/60 dark:from-orange-950/30 dark:to-zinc-900'
                          : 'border-emerald-100 bg-gradient-to-b from-emerald-50/50 to-white hover:border-emerald-300 dark:border-emerald-950/60 dark:from-emerald-950/20 dark:to-zinc-900'
                      }`}
                    >
                      {/* Top Row: Label & Status Dot / Bill Badge */}
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                          TABLE
                        </span>
                        
                        {billCall ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-sm animate-pulse">
                            <Bell size={11} className="animate-bell-wiggle" />
                            <span>เรียกเก็บเงิน!</span>
                          </span>
                        ) : staffCall ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500 text-white shadow-sm">
                            <span>🙋‍♂️ เรียกพนักงาน</span>
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            occupied
                              ? 'bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                          }`}>
                            <span className={`size-1.5 rounded-full ${occupied ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                            {occupied ? 'ไม่ว่าง' : 'ว่าง'}
                          </span>
                        )}
                      </div>

                      {/* Middle: Big Table Number + Subtitle */}
                      <div className="my-5 flex flex-col items-center justify-center text-center">
                        <span className={`text-5xl sm:text-6xl font-black tracking-tight transition group-hover:scale-110 duration-300 ${
                          billCall
                            ? 'text-amber-600 dark:text-amber-400 animate-pulse'
                            : occupied
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-zinc-900 dark:text-white'
                        }`}>
                          {x.table_number}
                        </span>

                        <div className="mt-3 min-h-6 flex items-center justify-center">
                          {billCall ? (
                            <span className="text-xs font-black text-amber-800 dark:text-amber-300 bg-amber-200/90 dark:bg-amber-900/60 px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                              <CircleDollarSign size={12} />
                              <span>รอลูกค้าเช็คบิล</span>
                            </span>
                          ) : occupied ? (
                            itemsCount > 0 ? (
                              <span className="text-xs font-black text-orange-600 dark:text-orange-400 bg-orange-100/80 dark:bg-orange-950/60 px-3 py-1 rounded-full">
                                {itemsCount} รายการ · ฿{totalAmt.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
                                เปิดโต๊ะแล้ว
                              </span>
                            )
                          ) : (
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full">
                              พร้อมเปิดรับลูกค้า
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          /* ── Modern Table / List View ── */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50 text-[11px] uppercase font-black tracking-wider text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/40">
                  <th className="px-3 sm:px-5 py-3.5">โต๊ะ</th>
                  <th className="px-2 sm:px-4 py-3.5">สถานะ</th>
                  <th className="px-3 sm:px-5 py-3.5 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {rows.map((x: any) => {
                  const occupied = x.status === 'occupied'
                  const itemsCount = getTableActiveItemsCount(x.id)
                  const orders = getTableActiveOrders(x.id)
                  const totalAmt = orders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0)
                  const billCall = getTableBillCall(x.id)
                  const staffCall = getTableStaffCall(x.id)

                  return (
                    <tr
                      key={x.id}
                      className={`transition-colors ${
                        billCall
                          ? 'bg-amber-50/90 hover:bg-amber-100/80 dark:bg-amber-950/30'
                          : 'hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30'
                      }`}
                    >
                      <td className="px-3 sm:px-5 py-3">
                        <div className="flex flex-col">
                          <span className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                            <span>โต๊ะ {x.table_number}</span>
                            {billCall && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-black text-white animate-pulse">
                                <Bell size={10} className="animate-bell-wiggle" />
                                <span>เรียกเก็บเงิน</span>
                              </span>
                            )}
                          </span>
                          {occupied && itemsCount > 0 && (
                            <span className="text-[11px] font-extrabold text-orange-600 dark:text-orange-400">
                              {itemsCount} รายการ · ฿{totalAmt.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-3">
                        {billCall ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[11px] font-black text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 whitespace-nowrap animate-pulse">
                            <span className="size-1.5 rounded-full bg-amber-500" />
                            <span>🔔 เรียกลูกค้าเช็คบิล</span>
                          </span>
                        ) : occupied ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 sm:px-2.5 py-0.5 text-[11px] font-bold text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300 whitespace-nowrap">
                            <span className="size-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                            <span>ไม่ว่าง</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 sm:px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 whitespace-nowrap">
                            <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>ว่าง</span>
                          </span>
                        )}
                      </td>
                      <td className="px-3 sm:px-5 py-3 text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          <button
                            onClick={(e) => handleToggleTable(e, x)}
                            className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-black text-white transition shadow-2xs cursor-pointer whitespace-nowrap ${
                              billCall
                                ? 'bg-amber-500 hover:bg-amber-600 animate-pulse'
                                : occupied
                                ? itemsCount > 0
                                ? 'bg-orange-500 hover:bg-orange-600'
                                : 'bg-zinc-800 hover:bg-zinc-700'
                              : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                          >
                            {billCall ? '💰 เช็คบิล POS' : occupied ? (itemsCount > 0 ? 'เช็คบิล POS' : 'ปิดโต๊ะ') : 'เปิดโต๊ะ'}
                          </button>
                          <button
                            onClick={() => setSelectedTable(x)}
                            className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition cursor-pointer dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 whitespace-nowrap"
                          >
                            เมนูโต๊ะ
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!rows.length && <p className="p-12 text-center text-sm text-zinc-400">ยังไม่มีข้อมูลโต๊ะ</p>}
          </div>
        )}
      </div>

      {isAddTableOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm" onMouseDown={event => event.target === event.currentTarget && !add.isPending && setIsAddTableOpen(false)}>
          <form onSubmit={event => {
            event.preventDefault()
            const tableNumber = newTableNumber.trim()
            const capacity = Number(newTableCapacity)
            if (!tableNumber) return showMsg('กรุณากรอกหมายเลขโต๊ะ', 'error')
            if (!Number.isInteger(capacity) || capacity < 1) return showMsg('จำนวนที่นั่งต้องมากกว่า 0', 'error')
            add.mutate({ tableNumber, capacity })
          }} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-black uppercase tracking-wider text-orange-500">Tables</p><h2 className="mt-1 text-2xl font-black text-zinc-900 dark:text-white">เพิ่มโต๊ะใหม่</h2><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">กำหนดเลขโต๊ะและจำนวนที่นั่งก่อนสร้าง QR</p></div>
              <button type="button" onClick={() => setIsAddTableOpen(false)} className="grid size-9 place-items-center rounded-xl text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X size={18} /></button>
            </div>
            <div className="mt-6 space-y-4">
              <label className="block"><span className="mb-1.5 block text-sm font-bold text-zinc-700 dark:text-zinc-200">หมายเลขโต๊ะ</span><input autoFocus value={newTableNumber} onChange={event => setNewTableNumber(event.target.value)} placeholder="เช่น 1, 2 หรือ A1" className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-base font-bold outline-none focus:border-orange-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" /></label>
              <label className="block"><span className="mb-1.5 block text-sm font-bold text-zinc-700 dark:text-zinc-200">จำนวนที่นั่ง</span><div className="grid grid-cols-4 gap-2">{[2, 4, 6, 8].map(capacity => <button key={capacity} type="button" onClick={() => setNewTableCapacity(String(capacity))} className={`h-11 rounded-xl text-sm font-black transition ${newTableCapacity === String(capacity) ? 'bg-orange-500 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'}`}>{capacity} ที่</button>)}</div></label>
            </div>
            <div className="mt-7 flex justify-end gap-2"><button type="button" disabled={add.isPending} onClick={() => setIsAddTableOpen(false)} className="h-11 rounded-xl px-4 text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">ยกเลิก</button><button disabled={add.isPending} className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600 disabled:opacity-50"><Plus size={17} />{add.isPending ? 'กำลังเพิ่ม…' : 'เพิ่มโต๊ะ'}</button></div>
          </form>
        </div>
      )}

      {/* ── Table Action & Details Modal ── */}
      <TableActionModal
        table={liveTable}
        activeItemsCount={liveItemsCount}
        activeOrders={liveTableOrders}
        billCallOrder={liveBillCall}
        staffCallOrder={liveStaffCall}
        onClose={() => setSelectedTable(null)}
        onOpenTable={id => openTable.mutate(id)}
        onCloseTable={id => closeTable.mutate(id)}
        onRegenerateQR={id => regenerateQR.mutate(id)}
        onEdit={requestEditTable}
        onRemove={id => remove.mutate(id)}
        onDismissCall={orderId => dismissCall.mutate(orderId)}
        isOpening={openTable.isPending}
        isClosing={closeTable.isPending}
        isRegenerating={regenerateQR.isPending}
        storeSlug={storeSlug}
        storeName={store.name}
        storePhone={store.phone}
      />
    </div>
  )
}
