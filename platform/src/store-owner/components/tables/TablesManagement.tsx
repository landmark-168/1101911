import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, Trash2, QrCode, Power, PowerOff, RefreshCw, Download,
  X, Copy, Check, LayoutGrid, List, Receipt, Utensils, Sparkles,
  Clock, ArrowRight, CheckCircle2, AlertCircle, Bluetooth
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../../../lib/supabase'
import { useStore } from '../../StoreContext'
import { printTableQRViaBluetooth } from '../pos/bluetoothPrinter'

// ─── Table Detail & Actions Modal (เมนูจัดการโต๊ะทั้งหมด) ─────────────────────
interface TableActionModalProps {
  table: any | null
  activeItemsCount: number
  activeOrders: any[]
  onClose: () => void
  onOpenTable: (id: string) => void
  onCloseTable: (id: string) => void
  onRegenerateQR: (id: string) => void
  onRemove: (id: string) => void
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
  onClose,
  onOpenTable,
  onCloseTable,
  onRegenerateQR,
  onRemove,
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
    if (activeItemsCount > 0) {
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
        {/* Header */}
        <div className="flex items-start justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3.5">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-black shadow-inner ${
              occupied
                ? 'bg-orange-500 text-white shadow-orange-500/30'
                : 'bg-emerald-500 text-white shadow-emerald-500/30'
            }`}>
              {table.table_number}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-zinc-950 dark:text-white">โต๊ะ {table.table_number}</h2>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                  occupied
                    ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                }`}>
                  {occupied ? '🔴 มีลูกค้า' : '🟢 ว่าง'}
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

        {/* Action Menu (เมนูการจัดการ) */}
        <div className="space-y-2.5 pt-1">
          {occupied ? (
            <>
              {/* POS Checkout */}
              <button
                onClick={handleCloseOrCheckout}
                disabled={isClosing}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-black text-sm shadow-lg transition cursor-pointer active:scale-98 ${
                  activeItemsCount > 0
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-500/25'
                    : 'bg-zinc-800 hover:bg-zinc-900'
                }`}
              >
                {activeItemsCount > 0 ? (
                  <>
                    <Receipt size={17} /> ไปหน้าเช็คบิล POS (฿{tableTotal.toLocaleString()})
                  </>
                ) : (
                  <>
                    <PowerOff size={16} /> ปิดโต๊ะนี้ (ไม่มีรายการอาหาร)
                  </>
                )}
              </button>
            </>
          ) : (
            /* Open Table */
            <button
              onClick={() => {
                onOpenTable(table.id)
              }}
              disabled={isOpening}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-98 text-white font-black text-sm shadow-lg shadow-emerald-600/25 transition cursor-pointer"
            >
              {isOpening ? (
                <>
                  <RefreshCw size={17} className="animate-spin" /> กำลังเปิดโต๊ะ…
                </>
              ) : (
                <>
                  <Power size={17} /> เปิดโต๊ะเพื่อรับลูกค้า
                </>
              )}
            </button>
          )}

          {/* Delete Table */}
          <button
            onClick={() => {
              onRemove(table.id)
              onClose()
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
  const { store } = useStore()
  const qc = useQueryClient()
  const key = ['store_tables', store.id]

  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [selectedTable, setSelectedTable] = useState<any | null>(null)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

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

  // Fetch Active Orders to count items per table
  const activeOrdersQuery = useQuery({
    queryKey: ['active-table-orders-count', store.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_orders')
        .select('id, table_id, status, total, created_at, store_order_items(id, name, quantity, unit_price)')
        .eq('store_id', store.id)
        .neq('status', 'cancelled')
        .neq('status', 'completed')
      if (error) return []
      return data || []
    },
    refetchInterval: 4000
  })

  // Helper: Get active orders for table
  const getTableActiveOrders = (tableId: string, sessionOpenedAt?: string) => {
    if (!sessionOpenedAt) return []
    return (activeOrdersQuery.data || []).filter((o: any) => {
      if (o.table_id !== tableId) return false
      if (o.status === 'completed' || o.status === 'cancelled') return false
      if (sessionOpenedAt && new Date(o.created_at).getTime() < new Date(sessionOpenedAt).getTime()) return false
      if (o.order_number?.startsWith('INV') || o.order_number?.startsWith('SRV') || o.order_number?.startsWith('BILL')) return false
      return true
    })
  }

  // Helper: Count active items for a table
  const getTableActiveItemsCount = (tableId: string, sessionOpenedAt?: string) => {
    const orders = getTableActiveOrders(tableId, sessionOpenedAt)
    return orders.reduce((sum: number, o: any) => {
      const itemsCount = (o.store_order_items || []).reduce((s: number, it: any) => s + (it.quantity || 1), 0)
      return sum + itemsCount
    }, 0)
  }

  // Add Table
  const add = useMutation({
    mutationFn: async () => {
      const name = prompt('กรอกหมายเลขโต๊ะ (เช่น 1, 2, A1)')
      if (!name) return
      const { error } = await supabase.from('store_tables').insert({
        store_id: store.id,
        table_number: name.trim(),
        capacity: 4
      })
      if (error) throw error
    },
    onSuccess: () => {
      showMsg('เพิ่มโต๊ะเรียบร้อย')
      qc.invalidateQueries({ queryKey: key })
    },
    onError: e => showMsg((e as Error).message, 'error')
  })

  // Delete Table
  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm('ยืนยันการลบโต๊ะนี้?')) return
      const { error } = await supabase.from('store_tables').delete().eq('store_id', store.id).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      showMsg('ลบโต๊ะเรียบร้อย')
      qc.invalidateQueries({ queryKey: key })
    },
    onError: e => showMsg((e as Error).message, 'error')
  })

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
  const liveTable = selectedTable ? rows.find((x: any) => x.id === selectedTable.id) || selectedTable : null
  const liveTableOrders = liveTable ? getTableActiveOrders(liveTable.id, liveTable.session_opened_at) : []
  const liveItemsCount = liveTable ? getTableActiveItemsCount(liveTable.id, liveTable.session_opened_at) : 0

  // Stats calculation
  const totalTables = rows.length
  const occupiedTables = rows.filter((x: any) => x.status === 'occupied').length
  const availableTables = totalTables - occupiedTables

  // Handle Quick Toggle (เปิด/ปิด โต๊ะ)
  const handleToggleTable = (e: React.MouseEvent, x: any) => {
    e.stopPropagation()
    if (x.status === 'occupied') {
      const count = getTableActiveItemsCount(x.id, x.session_opened_at)
      if (count > 0) {
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

      {/* Header & Stats Banner */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-black tracking-widest text-orange-500 uppercase">Live Store Workspace</span>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
            ผังโต๊ะ & จัดการโต๊ะ (Tables)
          </h1>
        </div>

        {/* Add Table Button */}
        <button
          onClick={() => add.mutate()}
          className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600 transition active:scale-95 cursor-pointer"
        >
          <Plus size={18} strokeWidth={3} /> เพิ่มโต๊ะใหม่
        </button>
      </div>

      {/* Quick KPI Stat Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid size-10 place-items-center rounded-xl bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white font-black text-base">
            {totalTables}
          </div>
          <div>
            <p className="text-[11px] font-bold text-zinc-400">โต๊ะทั้งหมด</p>
            <p className="text-xs font-extrabold text-zinc-900 dark:text-white">{totalTables} โต๊ะในร้าน</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 shadow-2xs dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="grid size-10 place-items-center rounded-xl bg-emerald-500 text-white font-black text-base shadow-sm">
            {availableTables}
          </div>
          <div>
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">โต๊ะว่าง (พร้อมรับ)</p>
            <p className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200">{availableTables} โต๊ะ</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-red-200/80 bg-red-50/50 p-3.5 shadow-2xs dark:border-red-900/40 dark:bg-red-950/20 col-span-2 sm:col-span-1">
          <div className="grid size-10 place-items-center rounded-xl bg-red-500 text-white font-black text-base shadow-sm">
            {occupiedTables}
          </div>
          <div>
            <p className="text-[11px] font-bold text-red-600 dark:text-red-400">กำลังรับประทาน</p>
            <p className="text-xs font-extrabold text-red-900 dark:text-red-200">{occupiedTables} โต๊ะมีลูกค้า</p>
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
            <LayoutGrid size={14} /> มุมมองการ์ด (Grid)
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition cursor-pointer ${
              viewMode === 'table'
                ? 'bg-zinc-900 text-white shadow-xs dark:bg-white dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
            }`}
          >
            <List size={14} /> มุมมองตาราง (List)
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-64">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาเบอร์โต๊ะ…"
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
                  onClick={() => add.mutate()}
                  className="px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition"
                >
                  + เพิ่มโต๊ะแรก
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {rows.map((x: any) => {
                  const occupied = x.status === 'occupied'
                  const itemsCount = getTableActiveItemsCount(x.id, x.session_opened_at)
                  const orders = getTableActiveOrders(x.id, x.session_opened_at)
                  const totalAmt = orders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0)

                  return (
                    <div
                      key={x.id}
                      onClick={() => setSelectedTable(x)}
                      className={`group relative flex flex-col justify-between rounded-3xl border-2 p-5 sm:p-6 transition-all duration-300 cursor-pointer select-none hover:-translate-y-1 hover:shadow-xl active:scale-98 ${
                        occupied
                          ? 'border-orange-200 bg-gradient-to-b from-orange-50/80 to-white hover:border-orange-400 dark:border-orange-900/60 dark:from-orange-950/30 dark:to-zinc-900'
                          : 'border-emerald-100 bg-gradient-to-b from-emerald-50/50 to-white hover:border-emerald-300 dark:border-emerald-950/60 dark:from-emerald-950/20 dark:to-zinc-900'
                      }`}
                    >
                      {/* Top Row: Label & Status Dot */}
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                          TABLE
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          occupied
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                        }`}>
                          <span className={`size-1.5 rounded-full ${occupied ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                          {occupied ? 'ไม่ว่าง' : 'ว่าง'}
                        </span>
                      </div>

                      {/* Middle: Big Table Number + Subtitle */}
                      <div className="my-5 flex flex-col items-center justify-center text-center">
                        <span className={`text-5xl sm:text-6xl font-black tracking-tight transition group-hover:scale-110 duration-300 ${
                          occupied ? 'text-orange-600 dark:text-orange-400' : 'text-zinc-900 dark:text-white'
                        }`}>
                          {x.table_number}
                        </span>

                        <div className="mt-3 min-h-6 flex items-center justify-center">
                          {occupied ? (
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
                  const itemsCount = getTableActiveItemsCount(x.id, x.session_opened_at)
                  const orders = getTableActiveOrders(x.id, x.session_opened_at)
                  const totalAmt = orders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0)

                  return (
                    <tr key={x.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="px-3 sm:px-5 py-3">
                        <div className="flex flex-col">
                          <span className="font-black text-sm text-zinc-900 dark:text-white">
                            โต๊ะ {x.table_number}
                          </span>
                          {occupied && itemsCount > 0 && (
                            <span className="text-[11px] font-extrabold text-orange-600 dark:text-orange-400">
                              {itemsCount} รายการ · ฿{totalAmt.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-3">
                        {occupied ? (
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
                              occupied
                                ? itemsCount > 0
                                ? 'bg-orange-500 hover:bg-orange-600'
                                : 'bg-zinc-800 hover:bg-zinc-700'
                              : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                          >
                            {occupied ? (itemsCount > 0 ? 'เช็คบิล POS' : 'ปิดโต๊ะ') : 'เปิดโต๊ะ'}
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

      {/* ── Table Action & Details Modal ── */}
      <TableActionModal
        table={liveTable}
        activeItemsCount={liveItemsCount}
        activeOrders={liveTableOrders}
        onClose={() => setSelectedTable(null)}
        onOpenTable={id => openTable.mutate(id)}
        onCloseTable={id => closeTable.mutate(id)}
        onRegenerateQR={id => regenerateQR.mutate(id)}
        onRemove={id => remove.mutate(id)}
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
