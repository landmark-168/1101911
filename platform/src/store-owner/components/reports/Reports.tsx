import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileSpreadsheet, Printer, RefreshCw } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useStore } from '../../StoreContext'
import { PageHeader, Panel } from '../PageKit'

const money = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 2 })
const datetime = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const dayKey = (value: string) => new Date(value).toISOString().slice(0, 10)
const dayLabel = (value: string) => new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(new Date(`${value}T00:00:00`))

function exportCsv(orders: any[], storeName: string, from: string, to: string) {
  const cell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const headers = ['Order number', 'Date', 'Channel', 'Customer', 'Status', 'Items', 'Subtotal', 'Discount', 'Tax', 'Total', 'Payment method']
  const rows = orders.map(order => [order.order_number, datetime.format(new Date(order.created_at)), order.order_type, order.customer_name, order.status, (order.store_order_items || []).map((item: any) => `${item.name} x${item.quantity}`).join(' | '), order.subtotal, order.discount, order.tax, order.total, order.payment_method])
  const blob = new Blob([`\uFEFF${[headers, ...rows].map(row => row.map(cell).join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `report-${storeName.replace(/[^\wก-๙-]+/g, '-').toLowerCase()}-${from}-to-${to}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

function previewPdf(orders: any[], storeName: string, from: string, to: string) {
  const completed = orders.filter(order => order.status === 'completed')
  const revenue = completed.reduce((sum, order) => sum + Number(order.total || 0), 0)
  const pages = Array.from({ length: Math.max(1, Math.ceil(orders.length / 24)) }, (_, page) => orders.slice(page * 24, page * 24 + 24).map(order => [order.order_number, datetime.format(new Date(order.created_at)), order.order_type, order.status, money.format(Number(order.total || 0))]))
  const images = pages.map((rows, index) => {
    const canvas = document.createElement('canvas'); canvas.width = 1684; canvas.height = 1191
    const context = canvas.getContext('2d')!; context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); context.fillStyle = '#18181b'; context.font = '700 36px Arial, sans-serif'; context.fillText(`รายงานยอดขาย · ${storeName}`, 72, 76); context.font = '22px Arial, sans-serif'; context.fillStyle = '#52525b'; context.fillText(`ช่วงวันที่ ${from} ถึง ${to} · หน้า ${index + 1}/${pages.length}`, 72, 115)
    if (!index) { context.fillStyle = '#fff7ed'; context.fillRect(72, 145, 940, 100); context.fillStyle = '#18181b'; context.font = '700 23px Arial, sans-serif'; context.fillText(`รายได้สำเร็จ ${money.format(revenue)}     ออเดอร์สำเร็จ ${completed.length}     ออเดอร์ทั้งหมด ${orders.length}`, 96, 205) }
    const top = index ? 155 : 280; const columns = [72, 355, 780, 1050, 1380]; const titles = ['เลขออเดอร์', 'วันที่', 'ช่องทาง', 'สถานะ', 'ยอดรวม']; context.fillStyle = '#f4f4f5'; context.fillRect(72, top, 1540, 42); context.fillStyle = '#52525b'; context.font = '700 18px Arial, sans-serif'; titles.forEach((title, column) => context.fillText(title, columns[column], top + 28)); context.font = '18px Arial, sans-serif'
    rows.forEach((row, rowIndex) => { const y = top + 75 + rowIndex * 34; context.fillStyle = '#18181b'; row.forEach((value, column) => context.fillText(String(value).slice(0, column === 1 ? 28 : 22), columns[column], y)); context.strokeStyle = '#e4e4e7'; context.beginPath(); context.moveTo(72, y + 12); context.lineTo(1612, y + 12); context.stroke() })
    return canvas.toDataURL('image/jpeg', 0.94).split(',')[1]
  })
  const binary = (value: string) => atob(value); const objects: string[] = ['<< /Type /Catalog /Pages 2 0 R >>']; const pageIds: number[] = []; const imageIds: number[] = []
  images.forEach(image => { const imageId = objects.length + 1; imageIds.push(imageId); const bytes = binary(image); objects.push(`<< /Type /XObject /Subtype /Image /Width 1684 /Height 1191 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n${bytes}\nendstream`); const content = 'q\n842 0 0 595 0 0 cm\n/Im1 Do\nQ\n'; const contentId = objects.length + 1; objects.push(`<< /Length ${content.length} >>\nstream\n${content}endstream`); const pageId = objects.length + 1; pageIds.push(pageId); objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im1 ${imageId + 1} 0 R >> >> /Contents ${contentId + 1} 0 R >>`) })
  objects.splice(1, 0, `<< /Type /Pages /Kids [${pageIds.map(id => `${id + 1} 0 R`).join(' ')}] /Count ${pageIds.length} >>`)
  const parts = ['%PDF-1.4\n']; const offsets = [0]; objects.forEach((object, index) => { offsets.push(parts.join('').length); parts.push(`${index + 1} 0 obj\n${object}\nendobj\n`) }); const xref = parts.join('').length; parts.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`)
  const output = parts.join(''); const bytes = Uint8Array.from(output, character => character.charCodeAt(0)); const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })); const preview = window.open(url, '_blank'); window.setTimeout(() => URL.revokeObjectURL(url), 60_000); return Boolean(preview)
}

export default function Reports() {
  const { store } = useStore()
  const today = new Date().toISOString().slice(0, 10)
  const start = new Date(); start.setDate(start.getDate() - 29)
  const [from, setFrom] = useState(start.toISOString().slice(0, 10))
  const [to, setTo] = useState(today)
  const [channel, setChannel] = useState('all')
  const [message, setMessage] = useState('')
  const invalidRange = from > to
  const query = useQuery({ queryKey: ['reports', store.id, from, to], enabled: !invalidRange, queryFn: async () => {
    const { data, error } = await supabase.from('store_orders').select('id,order_number,order_type,status,subtotal,discount,tax,total,payment_method,customer_name,created_at,store_order_items(name,quantity,unit_price)').eq('store_id', store.id).gte('created_at', new Date(`${from}T00:00:00`).toISOString()).lte('created_at', new Date(`${to}T23:59:59.999`).toISOString()).order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  } })
  const orders = useMemo(() => (query.data || []).filter(order => channel === 'all' || order.order_type === channel), [query.data, channel])
  const completed = orders.filter(order => order.status === 'completed')
  const totals = useMemo(() => {
    const revenue = completed.reduce((sum, order) => sum + Number(order.total || 0), 0)
    return { revenue, orders: completed.length, average: completed.length ? revenue / completed.length : 0, cancelled: orders.filter(order => order.status === 'cancelled').length }
  }, [completed, orders])
  const daily = useMemo(() => {
    const entries = new Map<string, { date: string; revenue: number }>()
    completed.forEach(order => { const date = dayKey(order.created_at); const entry = entries.get(date) || { date, revenue: 0 }; entry.revenue += Number(order.total || 0); entries.set(date, entry) })
    return [...entries.values()].sort((a, b) => a.date.localeCompare(b.date))
  }, [completed])
  const peak = useMemo(() => {
    const hours = new Map<number, number>(); completed.forEach(order => { const hour = new Date(order.created_at).getHours(); hours.set(hour, (hours.get(hour) || 0) + 1) }); const [hour, count] = [...hours].sort((a, b) => b[1] - a[1])[0] || []; return count ? `${String(hour).padStart(2, '0')}:00 (${count} ออเดอร์)` : 'ไม่มีข้อมูล'
  }, [completed])
  const maximum = Math.max(...daily.map(item => item.revenue), 1)
  const channels = useMemo(() => ['dine_in', 'takeaway', 'delivery'].map(type => { const rows = completed.filter(order => order.order_type === type); return { type, orders: rows.length, revenue: rows.reduce((sum, order) => sum + Number(order.total || 0), 0) } }), [completed])
  const statusSummary = useMemo(() => Object.entries(orders.reduce((result: Record<string, number>, order) => ({ ...result, [order.status]: (result[order.status] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1]), [orders])
  const topItems = useMemo(() => {
    const items = new Map<string, { quantity: number; revenue: number }>()
    completed.forEach(order => (order.store_order_items || []).forEach((item: any) => { const entry = items.get(item.name) || { quantity: 0, revenue: 0 }; entry.quantity += Number(item.quantity || 0); entry.revenue += Number(item.quantity || 0) * Number(item.unit_price || 0); items.set(item.name, entry) }))
    return [...items.entries()].map(([name, value]) => ({ name, ...value })).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  }, [completed])
  return <div className="space-y-6"><PageHeader title="Reports" description="วิเคราะห์ยอดขายจริงจากออเดอร์ และ export ข้อมูลตามช่วงวันที่"/>
    <Panel className="p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-end"><label className="flex-1"><span className="mb-1.5 block text-xs font-bold text-zinc-500">ตั้งแต่วันที่</span><input type="date" value={from} max={to} onChange={event => setFrom(event.target.value)} className="h-11 w-full rounded-xl border bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"/></label><label className="flex-1"><span className="mb-1.5 block text-xs font-bold text-zinc-500">ถึงวันที่</span><input type="date" value={to} min={from} max={today} onChange={event => setTo(event.target.value)} className="h-11 w-full rounded-xl border bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"/></label><label className="flex-1"><span className="mb-1.5 block text-xs font-bold text-zinc-500">ช่องทางการขาย</span><select value={channel} onChange={event => setChannel(event.target.value)} className="h-11 w-full rounded-xl border bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"><option value="all">ทุกช่องทาง</option><option value="dine_in">ทานที่ร้าน</option><option value="takeaway">สั่งกลับบ้าน</option><option value="delivery">เดลิเวอรี</option></select></label><button onClick={() => query.refetch()} disabled={query.isFetching || invalidRange} className="flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold dark:border-zinc-700 dark:text-white disabled:opacity-50"><RefreshCw size={16} className={query.isFetching ? 'animate-spin' : ''}/>รีเฟรช</button><button onClick={() => setMessage(previewPdf(orders, store.name, from, to) ? 'เปิดตัวอย่าง PDF แล้ว' : 'เบราว์เซอร์บล็อกหน้าต่างตัวอย่าง PDF')} disabled={!orders.length} className="flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold dark:border-zinc-700 dark:text-white disabled:opacity-50"><Printer size={16}/>Preview PDF</button><button onClick={() => { if (!orders.length) return setMessage('ไม่มีข้อมูลสำหรับ export'); exportCsv(orders, store.name, from, to); setMessage(`Export ${orders.length} รายการแล้ว`) }} disabled={!orders.length} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-bold text-white disabled:opacity-50"><FileSpreadsheet size={16}/>Export CSV</button></div>{(invalidRange || message) && <p className={`mt-3 text-xs font-bold ${invalidRange || message.includes('บล็อก') ? 'text-red-500' : 'text-emerald-600'}`}>{invalidRange ? 'วันเริ่มต้นต้องไม่เกินวันสิ้นสุด' : message}</p>}</Panel>
    {query.isLoading ? <Panel className="p-12 text-center text-sm text-zinc-400">กำลังโหลดรายงาน…</Panel> : query.error ? <Panel className="p-12 text-center text-sm text-red-500">{(query.error as Error).message}</Panel> : <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[['รายได้สำเร็จ', money.format(totals.revenue)], ['ออเดอร์สำเร็จ', totals.orders.toLocaleString('th-TH')], ['ยอดเฉลี่ยต่อบิล', money.format(totals.average)], ['ช่วงเวลาขายสูงสุด', peak]].map(([label, value]) => <Panel key={label} className="p-5"><p className="text-xs text-zinc-400">{label}</p><b className="mt-2 block text-xl dark:text-white">{value}</b><span className="mt-1 block text-xs text-zinc-500">{from} ถึง {to}</span></Panel>)}</div>
      <Panel className="p-5"><div className="flex items-center justify-between"><div><h2 className="font-black dark:text-white">รายได้รายวัน</h2><p className="mt-1 text-xs text-zinc-400">นับเฉพาะออเดอร์ที่สำเร็จ</p></div><span className="text-xs font-bold text-zinc-500">ยกเลิก {totals.cancelled} รายการ</span></div>{daily.length ? <div className="mt-7 flex h-60 items-end gap-2 overflow-x-auto pb-1">{daily.map(item => <div key={item.date} className="flex h-full min-w-11 flex-1 flex-col justify-end gap-2"><div title={`${dayLabel(item.date)}: ${money.format(item.revenue)}`} className="min-h-1 rounded-t-md bg-orange-500" style={{ height: `${Math.max(item.revenue / maximum * 100, 2)}%` }}/><span className="text-center text-[10px] text-zinc-400">{dayLabel(item.date)}</span></div>)}</div> : <p className="py-16 text-center text-sm text-zinc-400">ไม่มีออเดอร์สำเร็จในช่วงที่เลือก</p>}</Panel>
      <div className="grid gap-5 xl:grid-cols-3"><Panel className="p-5"><h2 className="font-black dark:text-white">ยอดขายตามช่องทาง</h2><div className="mt-5 space-y-4">{channels.map(item => <div key={item.type}><div className="flex justify-between text-sm"><b>{item.type === 'dine_in' ? 'ทานที่ร้าน' : item.type === 'takeaway' ? 'สั่งกลับบ้าน' : 'เดลิเวอรี'}</b><span className="text-zinc-500">{item.orders} ออเดอร์ · {money.format(item.revenue)}</span></div><div className="mt-2 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800"><div className="h-full rounded-full bg-orange-500" style={{ width: `${totals.revenue ? item.revenue / totals.revenue * 100 : 0}%` }}/></div></div>)}</div></Panel><Panel className="p-5"><h2 className="font-black dark:text-white">สถานะออเดอร์</h2><div className="mt-5 space-y-3">{statusSummary.map(([status, count]) => <div key={status} className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2.5 text-sm dark:bg-zinc-800"><span className="capitalize dark:text-white">{status}</span><b className="dark:text-white">{count} รายการ</b></div>)}{!statusSummary.length && <p className="py-8 text-center text-sm text-zinc-400">ไม่มีข้อมูล</p>}</div></Panel><Panel className="p-5"><h2 className="font-black dark:text-white">เมนูขายดี</h2><div className="mt-5 space-y-3">{topItems.map((item, index) => <div key={item.name} className="flex items-center justify-between gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-orange-50 text-xs font-black text-orange-600">{index + 1}</span><div className="min-w-0 flex-1"><b className="block truncate text-sm dark:text-white">{item.name}</b><span className="text-xs text-zinc-400">{item.quantity} ชิ้น</span></div><b className="text-sm dark:text-white">{money.format(item.revenue)}</b></div>)}{!topItems.length && <p className="py-8 text-center text-sm text-zinc-400">ยังไม่มีรายการเมนู</p>}</div></Panel></div>
      <Panel className="overflow-hidden"><div className="border-b px-5 py-4 dark:border-zinc-800"><h2 className="font-black dark:text-white">รายละเอียดออเดอร์</h2><p className="mt-1 text-xs text-zinc-400">{orders.length.toLocaleString('th-TH')} รายการที่พร้อม export</p></div><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead><tr className="bg-zinc-50 text-[11px] uppercase tracking-wide text-zinc-400 dark:bg-zinc-800/50"><th className="px-5 py-3">เลขออเดอร์</th><th className="px-5 py-3">วันที่</th><th className="px-5 py-3">ช่องทาง</th><th className="px-5 py-3">สถานะ</th><th className="px-5 py-3 text-right">ยอดรวม</th></tr></thead><tbody>{orders.map(order => <tr key={order.id} className="border-t dark:border-zinc-800"><td className="px-5 py-3.5 font-bold dark:text-white">{order.order_number}</td><td className="px-5 py-3.5 text-zinc-500">{datetime.format(new Date(order.created_at))}</td><td className="px-5 py-3.5 capitalize text-zinc-600 dark:text-zinc-300">{order.order_type.replace('_', ' ')}</td><td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${order.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : order.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>{order.status}</span></td><td className="px-5 py-3.5 text-right font-bold dark:text-white">{money.format(Number(order.total || 0))}</td></tr>)}</tbody></table></div>{!orders.length && <p className="p-12 text-center text-sm text-zinc-400">ไม่พบออเดอร์ในช่วงที่เลือก</p>}</Panel></>}</div>
}
