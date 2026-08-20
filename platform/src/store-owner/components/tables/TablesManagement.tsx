import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Trash2, QrCode, Power, PowerOff, RefreshCw, Download, X, Copy, Check, LayoutGrid, List } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../../../lib/supabase'
import { useStore } from '../../StoreContext'
import { PageHeader, Panel } from '../PageKit'

// ─── QR Modal ────────────────────────────────────────────────────────────────
interface QRModalProps {
  table: { id: string; table_number: string; qr_token: string } | null
  onClose: () => void
  onRegenerate: (id: string) => void
  regenerating: boolean
}

function QRModal({ table, onClose, onRegenerate, regenerating }: QRModalProps) {
  const [copied, setCopied] = useState(false)

  if (!table) return null

  const qrUrl = `${window.location.origin}/qr/${table.qr_token}`

  const handleCopy = () => {
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl dark:bg-zinc-900"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">QR Code</p>
            <h2 className="mt-1 text-2xl font-black dark:text-white">โต๊ะ {table.table_number}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-2xl bg-white p-4 shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-700">
            <QRCodeSVG
              id={`qr-svg-${table.id}`}
              value={qrUrl}
              size={220}
              level="H"
              includeMargin={false}
            />
          </div>

          {/* URL display */}
          <div className="flex w-full items-center gap-2 rounded-xl border bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
            <p className="flex-1 truncate text-xs text-zinc-500 dark:text-zinc-400">{qrUrl}</p>
            <button
              onClick={handleCopy}
              className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            </button>
          </div>

          <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
            สแกน QR Code เพื่อเข้าสู่เมนูสั่งอาหาร
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 py-3 text-sm font-bold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            <Download size={16} />
            ดาวน์โหลด QR Code
          </button>
          <button
            onClick={() => onRegenerate(table.id)}
            disabled={regenerating}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-orange-500 py-3 text-sm font-bold text-orange-500 hover:bg-orange-50 disabled:opacity-50 dark:hover:bg-orange-500/10"
          >
            <RefreshCw size={16} className={regenerating ? 'animate-spin' : ''} />
            {regenerating ? 'กำลังรีเซ็ต...' : 'รีเซ็ต QR Code ใหม่'}
          </button>
        </div>

        <p className="mt-3 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
          ⚠️ การรีเซ็ตจะทำให้ QR Code เก่าใช้งานไม่ได้ทันที
        </p>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TablesManagement() {
  const { store } = useStore()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [qrModal, setQrModal] = useState<{ id: string; table_number: string; qr_token: string } | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const key = ['store_tables', store.id]

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_tables')
        .select('*')
        .eq('store_id', store.id)
        .order('table_number', { ascending: true })
      if (error) throw error
      return data || []
    }
  })

  const rows = useMemo(() =>
    (query.data || []).filter((x: any) => x.table_number.toLowerCase().includes(search.toLowerCase())),
    [query.data, search]
  )

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3500)
  }

  const add = useMutation({
    mutationFn: async () => {
      const name = prompt('กรอกหมายเลขโต๊ะ (เช่น T01, โต๊ะ 1)')
      if (!name) return
      const capacity = Number(prompt('จำนวนที่นั่ง (เช่น 2, 4)') || 2)
      const { error } = await supabase.from('store_tables').insert({
        store_id: store.id,
        table_number: name.trim(),
        capacity: capacity
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: e => showMsg((e as Error).message, 'error')
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm('ยืนยันการลบโต๊ะนี้?')) return
      const { error } = await supabase.from('store_tables').delete().eq('store_id', store.id).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key })
  })

  // Open table means setting status to 'occupied' and regenerating the QR token
  // So old customers from yesterday who saved the link can't order.
  const openTable = useMutation({
    mutationFn: async (id: string) => {
      const newToken = crypto.randomUUID()
      const { error } = await supabase.from('store_tables').update({
        status: 'occupied',
        qr_token: newToken,
        session_opened_at: new Date().toISOString()
      }).eq('store_id', store.id).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      showMsg('เปิดโต๊ะเรียบร้อย ระบบได้สร้าง QR Code ให้ใหม่แล้ว')
      qc.invalidateQueries({ queryKey: key })
    }
  })

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
      showMsg('ปิดโต๊ะเรียบร้อย QR Code เก่าถูกรีเซ็ตแล้ว')
      qc.invalidateQueries({ queryKey: key })
    }
  })

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
        // Update modal token if it's open for this table
        if (result && qrModal?.id === result.id) {
          setQrModal(prev => prev ? { ...prev, qr_token: result.newToken } : null)
        }
      })
    },
    onError: e => showMsg((e as Error).message, 'error')
  })

  const getQRLink = (token: string) => `${window.location.origin}/qr/${token}`

  // Sync modal with latest data from query
  const currentRow = query.data?.find((x: any) => x.id === qrModal?.id)
  const liveModal = qrModal && currentRow
    ? { ...qrModal, qr_token: currentRow.qr_token }
    : qrModal

  return (
    <div className="space-y-6">
      <PageHeader title="Table Management" description="จัดการโต๊ะ เปิดโต๊ะ และสร้าง QR Code สั่งอาหาร" />

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        {/* View toggle */}
        <div className="flex items-center rounded-xl border border-zinc-200 bg-white p-1 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
              viewMode === 'grid'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700'
            }`}
          >
            <LayoutGrid size={15} />
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
              viewMode === 'list'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700'
            }`}
          >
            <List size={15} />
            Table
          </button>
        </div>

        <button
          onClick={() => add.mutate()}
          className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition-colors"
        >
          <Plus size={16} />เพิ่มโต๊ะ
        </button>
      </div>

      <Panel>
        <div className="border-b p-4 dark:border-zinc-800">
          <label className="flex h-11 items-center gap-2 rounded-xl bg-zinc-100 px-3 dark:bg-zinc-800">
            <Search size={16} className="text-zinc-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-transparent text-sm outline-none dark:text-white" placeholder="ค้นหาโต๊ะ..." />
          </label>
        </div>

        {message && (
          <p className={`m-4 rounded-xl p-3 text-sm ${
            message.type === 'error'
              ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
          }`}>
            {message.text}
          </p>
        )}

        {query.isLoading ? (
          <p className="p-12 text-center text-zinc-400">กำลังโหลด…</p>
        ) : query.error ? (
          <p className="p-8 text-center text-red-500">{(query.error as Error).message}</p>
        ) : viewMode === 'grid' ? (
          /* ── Grid View ── */
          <div className="p-5">
            {rows.length === 0 ? (
              <p className="py-16 text-center text-sm text-zinc-400">ยังไม่มีข้อมูลโต๊ะ</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {rows.map((x: any) => {
                  const occupied = x.status === 'occupied'
                  return (
                    <div
                      key={x.id}
                      className={`group relative flex flex-col overflow-hidden rounded-2xl border-2 transition-all ${
                        occupied
                          ? 'border-red-300 bg-red-50 dark:border-red-800/60 dark:bg-red-950/30'
                          : 'border-emerald-300 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-950/30'
                      }`}
                    >
                      {/* Status bar */}
                      <div className={`h-1 w-full ${ occupied ? 'bg-red-400' : 'bg-emerald-400' }`} />

                      <div className="flex flex-col items-center gap-3 p-4">
                        {/* Table number */}
                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-black shadow-inner ${
                          occupied
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        }`}>
                          {x.table_number}
                        </div>

                        {/* Capacity */}
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{x.capacity} ที่นั่ง</p>

                        {/* Status badge */}
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          occupied
                            ? 'bg-red-200 text-red-700 dark:bg-red-800/50 dark:text-red-300'
                            : 'bg-emerald-200 text-emerald-700 dark:bg-emerald-800/50 dark:text-emerald-300'
                        }`}>
                          {occupied ? '● ไม่ว่าง' : '● ว่าง'}
                        </span>

                        {/* Mini QR */}
                        <button
                          onClick={() => setQrModal({ id: x.id, table_number: x.table_number, qr_token: x.qr_token })}
                          className="rounded-xl border-2 border-white bg-white p-1.5 shadow-md hover:scale-105 transition-transform dark:border-zinc-700 dark:bg-zinc-800"
                          title="ดู QR Code"
                        >
                          <QRCodeSVG value={getQRLink(x.qr_token)} size={56} level="M" />
                        </button>
                      </div>

                      {/* Action row */}
                      <div className="mt-auto flex border-t border-zinc-200/60 dark:border-zinc-700/60">
                        {/* Open/Close */}
                        {occupied ? (
                          <button
                            onClick={() => closeTable.mutate(x.id)}
                            className="flex flex-1 items-center justify-center gap-1 py-2.5 text-[11px] font-bold text-zinc-500 hover:bg-zinc-100 transition-colors dark:text-zinc-400 dark:hover:bg-zinc-800"
                          >
                            <PowerOff size={12} /> ปิด
                          </button>
                        ) : (
                          <button
                            onClick={() => openTable.mutate(x.id)}
                            className="flex flex-1 items-center justify-center gap-1 py-2.5 text-[11px] font-bold text-orange-600 hover:bg-orange-50 transition-colors dark:text-orange-400 dark:hover:bg-orange-900/20"
                          >
                            <Power size={12} /> เปิด
                          </button>
                        )}

                        <div className="w-px bg-zinc-200/60 dark:bg-zinc-700/60" />

                        {/* Regen QR */}
                        <button
                          onClick={() => regenerateQR.mutate(x.id)}
                          disabled={regenerateQR.isPending}
                          title="รีเซ็ต QR"
                          className="flex flex-1 items-center justify-center gap-1 py-2.5 text-[11px] font-bold text-orange-500 hover:bg-orange-50 transition-colors disabled:opacity-40 dark:hover:bg-orange-900/20"
                        >
                          <RefreshCw size={12} className={regenerateQR.isPending ? 'animate-spin' : ''} /> รี QR
                        </button>

                        <div className="w-px bg-zinc-200/60 dark:bg-zinc-700/60" />

                        {/* Delete */}
                        <button
                          onClick={() => remove.mutate(x.id)}
                          className="flex flex-1 items-center justify-center py-2.5 text-red-400 hover:bg-red-50 transition-colors dark:hover:bg-red-900/20"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          /* ── List/Table View ── */
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b bg-zinc-50 text-[11px] uppercase text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/50">
                  <th className="px-5 py-3">เบอร์โต๊ะ</th>
                  <th className="px-5 py-3">ความจุ (ที่นั่ง)</th>
                  <th className="px-5 py-3">สถานะ</th>
                  <th className="px-5 py-3">QR Code</th>
                  <th className="px-5 py-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((x: any) => (
                  <tr key={x.id} className="border-b last:border-0 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-5 py-4 font-bold dark:text-white">{x.table_number}</td>
                    <td className="px-5 py-4 text-zinc-600 dark:text-zinc-400">{x.capacity}</td>
                    <td className="px-5 py-4">
                      {x.status === 'occupied' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/20 dark:text-red-400">
                          ไม่ว่าง
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-500/20 dark:text-green-400">
                          ว่าง
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {/* Mini QR preview + action buttons */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setQrModal({ id: x.id, table_number: x.table_number, qr_token: x.qr_token })}
                          className="shrink-0 cursor-pointer rounded-xl border bg-white p-1.5 shadow-sm hover:shadow-md transition-all dark:border-zinc-700 dark:bg-zinc-800"
                          title="คลิกเพื่อดู QR Code เต็ม"
                        >
                          <QRCodeSVG
                            value={getQRLink(x.qr_token)}
                            size={40}
                            level="M"
                          />
                        </button>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => setQrModal({ id: x.id, table_number: x.table_number, qr_token: x.qr_token })}
                            className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                          >
                            <QrCode size={12} />
                            ดู QR
                          </button>
                          <button
                            onClick={() => regenerateQR.mutate(x.id)}
                            disabled={regenerateQR.isPending}
                            title="รีเซ็ต QR ใหม่ (ลิงก์เก่าจะใช้ไม่ได้)"
                            className="flex items-center gap-1.5 rounded-lg bg-orange-100 px-2.5 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:hover:bg-orange-500/30 disabled:opacity-50 transition-colors"
                          >
                            <RefreshCw size={12} className={regenerateQR.isPending ? 'animate-spin' : ''} />
                            รี QR
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {x.status === 'available' ? (
                          <button onClick={() => openTable.mutate(x.id)} className="flex items-center gap-1 rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-600 hover:bg-orange-100 dark:bg-orange-500/10 dark:text-orange-400">
                            <Power size={14} /> เปิดโต๊ะ
                          </button>
                        ) : (
                          <button onClick={() => closeTable.mutate(x.id)} className="flex items-center gap-1 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400">
                            <PowerOff size={14} /> ปิดโต๊ะ
                          </button>
                        )}
                        <button onClick={() => remove.mutate(x.id)} className="p-1.5 text-red-400 hover:text-red-500">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <p className="p-12 text-center text-sm text-zinc-400">ยังไม่มีข้อมูลโต๊ะ</p>}
          </div>
        )}
      </Panel>

      {/* QR Modal */}
      <QRModal
        table={liveModal}
        onClose={() => setQrModal(null)}
        onRegenerate={id => regenerateQR.mutate(id)}
        regenerating={regenerateQR.isPending}
      />
    </div>
  )
}
