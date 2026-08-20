import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Minus, Plus, Printer, Check, Receipt, CheckCircle } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../../../lib/supabase'
import { useStore } from '../../StoreContext'

// Helper: Standard Thai PromptPay Payload Generator (EMVCo QR)
function generatePromptPayPayload(target: string, amount?: number): string {
  const sanitized = target.replace(/[^0-9]/g, '')
  let formattedTarget = ''
  if (sanitized.length === 10) {
    formattedTarget = '0066' + sanitized.slice(1)
  } else if (sanitized.length === 13) {
    formattedTarget = sanitized
  } else {
    formattedTarget = (sanitized || '0812345678').padStart(13, '0')
  }

  const tag29_sub = `0016A000000677010111${formattedTarget.length === 13 ? '0213' : '0113'}${formattedTarget}`
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

export default function POS() {
  const { store } = useStore()
  const qc = useQueryClient()

  const initialTableId = new URLSearchParams(window.location.search).get('table_id') || ''
  const [tableId, setTableId] = useState(initialTableId)
  const [type, setType] = useState('dine_in')
  const [cart, setCart] = useState<{ id: string; name: string; price: number; qty: number; fromCustomer?: boolean }[]>([])
  const [isBillModalOpen, setIsBillModalOpen] = useState(false)
  const [completedBill, setCompletedBill] = useState<any | null>(null)

  // Fetch Menu
  const menu = useQuery({
    queryKey: ['pos-menu', store.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_menu_items')
        .select('*')
        .eq('store_id', store.id)
        .order('name')
      if (error) throw error
      return data || []
    }
  })

  // Fetch Tables
  const tables = useQuery({
    queryKey: ['pos-tables', store.id],
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

  // Fetch Store Settings
  const settings = useQuery({
    queryKey: ['pos-settings', store.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('store_id', store.id)
        .maybeSingle()
      if (error) return null
      return data
    }
  })

  const selectedTableObj = tables.data?.find((t: any) => t.id === tableId)
  const sessionOpenedAt = selectedTableObj?.session_opened_at

  // Fetch Active Orders for Table (ONLY from current active session)
  const tableOrders = useQuery({
    queryKey: ['pos-table-orders', store.id, tableId, sessionOpenedAt],
    enabled: Boolean(tableId && type === 'dine_in'),
    staleTime: 0,
    queryFn: async () => {
      if (!tableId) return []
      // If table is not occupied or has no active session, do not pull old history!
      if (selectedTableObj?.status !== 'occupied' || !sessionOpenedAt) {
        return []
      }

      let q = supabase
        .from('store_orders')
        .select('*, store_order_items(*)')
        .eq('store_id', store.id)
        .eq('table_id', tableId)
        .neq('status', 'cancelled')
        .gte('created_at', sessionOpenedAt)
        .order('created_at', { ascending: true })

      const { data, error } = await q
      if (error) throw error
      return data || []
    }
  })

  // Sync Table Orders into Cart
  useEffect(() => {
    if (type === 'dine_in' && tableId && tableOrders.data) {
      const consolidated: { id: string; name: string; price: number; qty: number; fromCustomer?: boolean }[] = []

      tableOrders.data.forEach((order: any) => {
        // Skip settlement invoices and service notification records
        if (
          order.order_number?.startsWith('INV') ||
          order.order_number?.startsWith('SRV') ||
          order.order_number?.startsWith('BILL')
        ) return

        const itemsList = order.store_order_items || order.items || []
        if (Array.isArray(itemsList)) {
          itemsList.forEach((it: any) => {
            const name = it.name
            const price = Number(it.unit_price ?? it.price ?? 0)
            const quantity = Number(it.quantity ?? it.qty ?? 1)
            const existing = consolidated.find(x => x.name === name && Number(x.price) === price)
            if (existing) {
              existing.qty += quantity
            } else {
              consolidated.push({
                id: it.menu_item_id || it.id || name,
                name,
                price,
                qty: quantity,
                fromCustomer: true
              })
            }
          })
        }
      })

      setCart(consolidated)
    } else if (type !== 'dine_in' || !tableId) {
      setCart([])
    }
  }, [tableOrders.data, tableId, type])

  const taxPercent = Number(settings.data?.tax_percent ?? 0)
  const serviceChargePercent = Number(settings.data?.service_charge_percent ?? 0)
  const themeColor = settings.data?.theme_color || '#F97316'

  const subtotal = cart.reduce((s, x) => s + Number(x.price) * x.qty, 0)
  const serviceCharge = Math.round(subtotal * (serviceChargePercent / 100) * 100) / 100
  const tax = Math.round((subtotal + serviceCharge) * (taxPercent / 100) * 100) / 100
  const total = subtotal + serviceCharge + tax

  const promptPayPhone = settings.data?.phone || store.phone || '0812345678'
  const promptPayPayload = generatePromptPayPayload(promptPayPhone, total)

  const checkout = useMutation({
    mutationFn: async () => {
      if (!cart.length) throw new Error('กรุณาเลือกเมนู')
      if (type === 'dine_in' && !tableId) throw new Error('กรุณาเลือกโต๊ะ')

      const number = `INV-${Date.now().toString().slice(-6)}`
      const billData = {
        billNumber: number,
        tableName: selectedTableObj?.table_number || (type === 'dine_in' ? 'Dine-in' : type === 'takeaway' ? 'Takeaway' : 'Delivery'),
        storeName: store.name,
        storePhone: promptPayPhone,
        storeAddress: settings.data?.address || store.address || '',
        items: [...cart],
        subtotal,
        serviceCharge,
        serviceChargePercent,
        tax,
        taxPercent,
        total,
        themeColor,
        createdAt: new Date().toLocaleString('th-TH'),
        promptPayPayload
      }

      // Mark existing table orders completed
      if (type === 'dine_in' && tableId) {
        await supabase
          .from('store_orders')
          .update({ status: 'completed' })
          .eq('store_id', store.id)
          .eq('table_id', tableId)
          .neq('status', 'cancelled')
      }

      // Insert final settled order
      await supabase.from('store_orders').insert({
        store_id: store.id,
        table_id: tableId || null,
        order_number: number,
        order_type: type,
        status: 'completed',
        subtotal,
        tax,
        total,
        customer_name: selectedTableObj ? `โต๊ะ ${selectedTableObj.table_number}` : 'Walk-in'
      })

      return billData
    },
    onSuccess: (data) => {
      setCompletedBill(data)
      setIsBillModalOpen(true)
      qc.invalidateQueries()
    },
    onError: (e) => alert((e as Error).message)
  })

  const handleFinishAndCloseTable = async () => {
    if (tableId) {
      const newToken = crypto.randomUUID()
      await supabase
        .from('store_tables')
        .update({
          status: 'available',
          qr_token: newToken,
          session_opened_at: null
        })
        .eq('store_id', store.id)
        .eq('id', tableId)
      qc.invalidateQueries()
    }
    setIsBillModalOpen(false)
    setCompletedBill(null)
    setCart([])
    setTableId('')
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <section>
        {/* Top Header Controls */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-orange-500 uppercase">POINT OF SALE</p>
            <h1 className="text-3xl font-black dark:text-white">New order</h1>
          </div>
          <div className="flex gap-2">
            <select
              value={type}
              onChange={e => {
                setType(e.target.value)
                if (e.target.value !== 'dine_in') setTableId('')
              }}
              className="h-11 rounded-xl border bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
            >
              <option value="dine_in">Dine-in</option>
              <option value="takeaway">Takeaway</option>
              <option value="delivery">Delivery</option>
            </select>
            {type === 'dine_in' && (
              <select
                value={tableId}
                onChange={e => setTableId(e.target.value)}
                className="h-11 rounded-xl border bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
              >
                <option value="">เลือกโต๊ะ</option>
                {tables.data?.map((x: any) => (
                  <option key={x.id} value={x.id}>
                    โต๊ะ {x.table_number} · {x.status === 'occupied' ? 'ไม่ว่าง' : 'ว่าง'}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Menu Catalog Grid */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {menu.data?.map((x: any) => (
            <button
              key={x.id}
              onClick={() =>
                setCart(c => {
                  const found = c.find(i => i.id === x.id || i.name === x.name)
                  return found
                    ? c.map(i => (i.id === x.id || i.name === x.name) ? { ...i, qty: i.qty + 1 } : i)
                    : [...c, { id: x.id, name: x.name, price: Number(x.price), qty: 1 }]
                })
              }
              className="rounded-2xl border bg-white p-3 text-left dark:border-zinc-800 dark:bg-zinc-900 transition hover:shadow-md cursor-pointer active:scale-95"
            >
              <div className="relative aspect-[1.5] overflow-hidden rounded-xl bg-orange-50 dark:bg-orange-500/10 grid place-items-center">
                {x.image_url ? (
                  <img src={x.image_url.split('|')[0]} alt={x.name} className="size-full object-cover" />
                ) : (
                  <span className="text-4xl">🍽️</span>
                )}
              </div>
              <b className="mt-3 block text-sm dark:text-white truncate">{x.name}</b>
              <span className="text-xs font-black text-orange-500">฿{Number(x.price).toLocaleString()}</span>
            </button>
          ))}
        </div>

        {!menu.isLoading && !menu.data?.length && (
          <p className="mt-16 text-center text-zinc-400">เพิ่มเมนูก่อนเริ่มขาย</p>
        )}
      </section>

      {/* Aside Bill Cart */}
      <aside className="h-fit rounded-2xl border bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-black dark:text-white">
          Current bill {selectedTableObj && <span className="text-orange-500">(โต๊ะ {selectedTableObj.table_number})</span>}
        </h2>
        <div className="my-5 max-h-72 overflow-y-auto space-y-3">
          {cart.map(x => (
            <div key={x.name} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <b className="block truncate text-sm dark:text-white">{x.name}</b>
                <span className="text-xs text-orange-500">฿{x.price}</span>
              </div>
              <button
                onClick={() =>
                  setCart(c =>
                    c.flatMap(i => (i.name === x.name ? (i.qty > 1 ? [{ ...i, qty: i.qty - 1 }] : []) : [i]))
                  )
                }
                className="grid size-7 place-items-center rounded-lg bg-zinc-100 dark:bg-zinc-800 cursor-pointer"
              >
                <Minus size={12} />
              </button>
              <b className="text-sm dark:text-white w-4 text-center">{x.qty}</b>
              <button
                onClick={() =>
                  setCart(c =>
                    c.map(i => (i.name === x.name ? { ...i, qty: i.qty + 1 } : i))
                  )
                }
                className="grid size-7 place-items-center rounded-lg bg-zinc-100 dark:bg-zinc-800 cursor-pointer"
              >
                <Plus size={12} />
              </button>
            </div>
          ))}
          {!cart.length && (
            <p className="text-center text-xs text-zinc-400 py-6">ยังไม่มีรายการในบิล</p>
          )}
        </div>

        <div className="space-y-2 border-y py-4 text-sm dark:border-zinc-700">
          <div className="flex justify-between text-zinc-500">
            <span>รวมค่าอาหาร (Subtotal)</span>
            <span>฿{subtotal.toLocaleString()}</span>
          </div>
          {serviceChargePercent > 0 && (
            <div className="flex justify-between text-zinc-500">
              <span>ค่าบริการ (Service Charge {serviceChargePercent}%)</span>
              <span>฿{serviceCharge.toFixed(2)}</span>
            </div>
          )}
          {taxPercent > 0 && (
            <div className="flex justify-between text-zinc-500">
              <span>ภาษี (VAT {taxPercent}%)</span>
              <span>฿{tax.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-black dark:text-white pt-1">
            <span>ยอดสุทธิ (Total)</span>
            <span style={{ color: themeColor }}>฿{total.toLocaleString()}</span>
          </div>
        </div>

        {checkout.error && <p className="mt-3 text-xs text-red-500">{(checkout.error as Error).message}</p>}

        <button
          disabled={checkout.isPending || !cart.length}
          onClick={() => checkout.mutate()}
          style={{ backgroundColor: themeColor }}
          className="mt-4 h-12 w-full rounded-xl font-bold text-white shadow-md transition hover:brightness-95 disabled:opacity-40 cursor-pointer"
        >
          {checkout.isPending ? 'กำลังสร้างออเดอร์…' : `ยืนยันเช็คบิล ฿${total.toLocaleString()}`}
        </button>
      </aside>

      {/* ── Bill & QR Slip Modal ── */}
      {isBillModalOpen && completedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div
            className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col max-h-[95vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-orange-500 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle size={20} />
                <h3 className="font-black text-base">เช็คบิลสำเร็จ</h3>
              </div>
              <span className="font-mono text-xs font-bold opacity-90">{completedBill.billNumber}</span>
            </div>

            {/* Printable Receipt */}
            <div className="p-6 overflow-y-auto space-y-4 text-zinc-900 dark:text-white">
              <div id="printable-slip" className="p-4 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-800/40 text-center space-y-3 font-mono text-xs">
                <div className="space-y-0.5 border-b border-dashed border-zinc-300 pb-3 dark:border-zinc-700">
                  <h2 className="text-base font-black uppercase font-sans text-zinc-900 dark:text-white">
                    {completedBill.storeName}
                  </h2>
                  {completedBill.storeAddress && (
                    <p className="text-[10px] text-zinc-500">{completedBill.storeAddress}</p>
                  )}
                  <p className="text-[10px] text-zinc-500">โทร: {completedBill.storePhone}</p>
                  <p className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 pt-1">
                    📍 {completedBill.tableName.startsWith('โต๊ะ') ? completedBill.tableName : `โต๊ะ ${completedBill.tableName}`}
                  </p>
                  <p className="text-[10px] text-zinc-400">เวลา: {completedBill.createdAt}</p>
                </div>

                {/* Items */}
                <div className="space-y-1.5 border-b border-dashed border-zinc-300 py-3 dark:border-zinc-700 text-left">
                  <div className="flex justify-between font-bold text-[11px] text-zinc-400">
                    <span>รายการ</span>
                    <span>รวม</span>
                  </div>
                  {completedBill.items.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs font-semibold">
                      <span className="truncate max-w-[200px]">{it.name} x{it.qty}</span>
                      <span>฿{(it.price * it.qty).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-1 text-right text-xs pt-1">
                  <div className="flex justify-between text-zinc-500">
                    <span>ยอดรวมอาหาร:</span>
                    <span>฿{completedBill.subtotal.toLocaleString()}</span>
                  </div>
                  {completedBill.serviceChargePercent > 0 && (
                    <div className="flex justify-between text-zinc-500">
                      <span>Service Charge {completedBill.serviceChargePercent}%:</span>
                      <span>฿{completedBill.serviceCharge.toFixed(2)}</span>
                    </div>
                  )}
                  {completedBill.taxPercent > 0 && (
                    <div className="flex justify-between text-zinc-500">
                      <span>VAT {completedBill.taxPercent}%:</span>
                      <span>฿{completedBill.tax.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-zinc-950 dark:text-white pt-1 border-t border-zinc-300 dark:border-zinc-700">
                    <span>ยอดชำระทั้งสิ้น:</span>
                    <span style={{ color: completedBill.themeColor || '#F97316' }}>฿{completedBill.total.toLocaleString()}</span>
                  </div>
                </div>

                {/* PromptPay QR on Bill */}
                <div className="pt-3 border-t border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center gap-1.5">
                  <div className="bg-white p-2.5 rounded-xl shadow-xs border border-zinc-200">
                    <QRCodeSVG value={completedBill.promptPayPayload} size={130} level="M" />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
                    สแกนชำระผ่าน PromptPay QR
                  </p>
                  <p className="text-[9px] text-zinc-400">
                    PromptPay: {completedBill.storePhone}
                  </p>
                </div>

                <p className="text-[10px] text-zinc-400 pt-2">
                  *** ขอบคุณที่ใช้บริการ ***
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-zinc-100 bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-800 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer dark:bg-zinc-700 dark:hover:bg-zinc-600"
              >
                <Printer size={15} /> พิมพ์ใบเสร็จ (Print Bill)
              </button>
              <button
                onClick={handleFinishAndCloseTable}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                <Check size={15} /> ปิดโต๊ะ / รับเงินเรียบร้อย
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
