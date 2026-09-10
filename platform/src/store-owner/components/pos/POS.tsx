import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Minus, Plus, Printer, Check, Receipt, CheckCircle, Bluetooth, Search } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../../../lib/supabase'
import { useStore } from '../../StoreContext'
import { useLanguage } from '../../../lib/language'
import { printReceiptViaBluetooth, printQROnlyViaBluetooth } from './bluetoothPrinter'

// Helper: Standard Thai PromptPay Payload Generator (EMVCo QR)
function generatePromptPayPayload(target: string, amount?: number): string {
  const sanitized = (target || '').replace(/[^0-9]/g, '')
  let formattedTarget = ''
  let subTag = '0113' // Default to 01 for mobile phone

  if (sanitized.length === 10 && sanitized.startsWith('0')) {
    // 10-digit Thai Mobile (e.g. 0910203541 -> 0066910203541)
    formattedTarget = '0066' + sanitized.slice(1)
    subTag = '0113'
  } else if (sanitized.length === 9) {
    formattedTarget = '0066' + sanitized
    subTag = '0113'
  } else if (sanitized.length === 13) {
    // 13-digit National Citizen ID
    formattedTarget = sanitized
    subTag = '0213'
  } else {
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

export default function POS() {
  const { language } = useLanguage()
  const english = language === 'en'
  const { store } = useStore()
  const qc = useQueryClient()

  const initialTableId = new URLSearchParams(window.location.search).get('table_id') || ''
  const editOrderId = new URLSearchParams(window.location.search).get('edit_order_id') || ''
  const paymentOrderIds = (new URLSearchParams(window.location.search).get('payment_order_ids') || '').split(',').filter(Boolean)
  const isBatchPayment = paymentOrderIds.length > 0
  const [tableId, setTableId] = useState(initialTableId)
  const [type, setType] = useState('dine_in')
  const [cart, setCart] = useState<{ id: string; name: string; price: number; qty: number; fromCustomer?: boolean }[]>([])
  const [editDirty, setEditDirty] = useState(false)
  const [orderNote, setOrderNote] = useState('')
  const [isBillModalOpen, setIsBillModalOpen] = useState(false)
  const [completedBill, setCompletedBill] = useState<any | null>(null)
  const [btPrinting, setBtPrinting] = useState(false)
  const [btStatus, setBtStatus] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'promptpay'>('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [menuSearch, setMenuSearch] = useState('')
  const [selectedMenuCategory, setSelectedMenuCategory] = useState('all')

  // Fetch Menu
  const menu = useQuery({
    queryKey: ['pos-menu', store.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_menu_items')
        .select('*, category:store_categories(name)')
        .eq('store_id', store.id)
        .eq('available', true)
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
  const menuCategories = Array.from(new Set((menu.data || []).map((item: any) => item.category?.name || 'อื่น ๆ')))
  const filteredMenu = (menu.data || []).filter((item: any) => {
    const category = item.category?.name || 'อื่น ๆ'
    const matchesCategory = selectedMenuCategory === 'all' || category === selectedMenuCategory
    const searchable = `${item.name} ${item.description || ''} ${category}`.toLowerCase()
    return matchesCategory && searchable.includes(menuSearch.toLowerCase())
  })

  const editOrder = useQuery({
    queryKey: ['pos-edit-order', store.id, editOrderId],
    enabled: Boolean(editOrderId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_orders')
        .select('*, store_order_items(*)')
        .eq('store_id', store.id)
        .eq('id', editOrderId)
        .single()
      if (error) throw error
      return data
    }
  })

  const batchPaymentOrders = useQuery({
    queryKey: ['pos-batch-payment-orders', store.id, paymentOrderIds],
    enabled: isBatchPayment,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_orders')
        .select('*, store_order_items(*)')
        .eq('store_id', store.id)
        .in('id', paymentOrderIds)
      if (error) throw error
      return data || []
    }
  })

  // Fetch Active Orders for Table
  const tableOrders = useQuery({
    queryKey: ['pos-table-orders', store.id, tableId],
    enabled: Boolean(tableId && type === 'dine_in'),
    staleTime: 0,
    queryFn: async () => {
      if (!tableId) return []

      const { data, error } = await supabase
        .from('store_orders')
        .select('*, store_order_items(*)')
        .eq('store_id', store.id)
        .eq('table_id', tableId)
        .neq('status', 'cancelled')
        .neq('status', 'completed')
        .order('created_at', { ascending: true })

      if (error) throw error
      return data || []
    }
  })

  // Supabase Realtime for table orders in POS
  useEffect(() => {
    if (!store?.id) return
    const channel = supabase
      .channel(`pos-orders-realtime:${store.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_orders', filter: `store_id=eq.${store.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ['pos-table-orders'] })
          qc.invalidateQueries({ queryKey: ['pos-tables', store.id] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_order_items', filter: `store_id=eq.${store.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ['pos-table-orders'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [store.id, qc])

  // Sync Table Orders into Cart
  useEffect(() => {
    if (editOrderId || isBatchPayment) return
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
  }, [tableOrders.data, tableId, type, editOrderId, isBatchPayment])

  useEffect(() => {
    const order = editOrder.data
    if (!order) return
    setType(order.order_type)
    setTableId(order.table_id || '')
    setCart((order.store_order_items || [])
      .filter((item: any) => item.status !== 'cancelled')
      .map((item: any) => ({
        id: item.menu_item_id || item.id,
        sourceItemId: item.id,
        name: item.name,
        price: Number(item.unit_price || 0),
        qty: Number(item.quantity || 0),
        originalQty: Number(item.quantity || 0),
        notes: item.notes || '',
        originalNotes: item.notes || '',
        itemStatus: item.status || 'waiting',
        fromCustomer: true
      })))
    setOrderNote(order.notes || '')
    setEditDirty(false)
  }, [editOrder.data])

  useEffect(() => {
    if (!isBatchPayment || !batchPaymentOrders.data) return
    setType('takeaway')
    setTableId('')
    setCart(batchPaymentOrders.data.flatMap((order: any) => (order.store_order_items || [])
      .filter((item: any) => item.status !== 'cancelled')
      .map((item: any) => ({
        id: `${order.id}-${item.id}`,
        name: `${item.name} · #${order.order_number}`,
        price: Number(item.unit_price || 0),
        qty: Number(item.quantity || 0),
        fromCustomer: true,
        notes: item.notes || ''
      }))))
    setOrderNote(`ชำระรวม ${batchPaymentOrders.data.length} บิล`)
  }, [isBatchPayment, batchPaymentOrders.data])

  const taxPercent = Number(settings.data?.tax_percent ?? 0)
  const serviceChargePercent = Number(settings.data?.service_charge_percent ?? 0)
  const themeColor = settings.data?.theme_color || '#F97316'

  const subtotal = cart.reduce((s, x) => s + Number(x.price) * x.qty, 0)
  const serviceCharge = Math.round(subtotal * (serviceChargePercent / 100) * 100) / 100
  const tax = Math.round((subtotal + serviceCharge) * (taxPercent / 100) * 100) / 100
  const total = subtotal + serviceCharge + tax
  const cashReceivedAmount = Number(cashReceived || 0)
  const changeDue = Math.max(0, cashReceivedAmount - total)
  const newItemCount = cart.filter(item => !item.fromCustomer).reduce((sum, item) => sum + item.qty, 0)
  const hasEditChanges = Boolean(editOrderId) && editDirty

  const promptPayPhone = settings.data?.phone || store.phone || '0812345678'
  const promptPayPayload = generatePromptPayPayload(promptPayPhone, total)

  const checkout = useMutation({
    mutationFn: async () => {
      if (!cart.length) throw new Error('กรุณาเลือกเมนู')
      if (type === 'dine_in' && !tableId) throw new Error('กรุณาเลือกโต๊ะ')
      if (paymentMethod === 'cash' && cashReceivedAmount < total) throw new Error('จำนวนเงินสดที่รับน้อยกว่ายอดชำระ')

      const number = `INV-${Date.now().toString().slice(-6)}`
      const billData = {
        billNumber: isBatchPayment ? `รวม ${batchPaymentOrders.data?.length || paymentOrderIds.length} บิล` : editOrder.data?.order_number || number,
        tableName: isBatchPayment ? `ชำระรวม ${batchPaymentOrders.data?.length || paymentOrderIds.length} บิล` : selectedTableObj?.table_number || (type === 'dine_in' ? 'Dine-in' : type === 'takeaway' ? 'Takeaway' : 'Delivery'),
        storeName: store.name,
        storeLogo: settings.data?.logo_url || store.logo_url || '',
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
        promptPayPayload,
        paymentMethod,
        cashReceived: paymentMethod === 'cash' ? cashReceivedAmount : null,
        changeDue: paymentMethod === 'cash' ? changeDue : null
      }

      // A dine-in bill is made up of the orders already sent to the kitchen.
      // Do not create another completed order here, otherwise sales are counted twice.
      if (isBatchPayment) {
        const orders = batchPaymentOrders.data || []
        if (orders.length !== paymentOrderIds.length) throw new Error('ไม่พบข้อมูลบิลบางรายการ')
        if (orders.some((order: any) => order.status === 'cancelled')) throw new Error('มีบิลที่ยกเลิกอยู่ในรายการ กรุณาเลือกใหม่')

        let { error } = await supabase
          .from('store_orders')
          .update({ status: 'completed', payment_status: 'paid', payment_method: paymentMethod, updated_at: new Date().toISOString() })
          .eq('store_id', store.id)
          .in('id', paymentOrderIds)

        if (error?.message?.includes('payment_status')) {
          const results = await Promise.all(orders.map((order: any) => {
            const currentNotes = String(order.notes || '').trim()
            const notes = currentNotes.includes('[ชำระแล้ว]') ? currentNotes : `${currentNotes}${currentNotes ? '\n' : ''}[ชำระแล้ว]`
            return supabase.from('store_orders').update({ status: 'completed', payment_method: paymentMethod, notes, updated_at: new Date().toISOString() }).eq('store_id', store.id).eq('id', order.id)
          }))
          error = results.find(result => result.error)?.error || null
        }
        if (error) throw error
        return billData
      }

      if (editOrderId) {
        if (!editOrder.data) throw new Error('กำลังโหลดข้อมูลบิล กรุณาลองใหม่อีกครั้ง')
        if (editOrder.data.status === 'cancelled') throw new Error('บิลนี้ยกเลิกแล้ว จึงรับชำระเงินไม่ได้')
        let { error } = await supabase
          .from('store_orders')
          .update({ status: 'completed', payment_status: 'paid', payment_method: paymentMethod, updated_at: new Date().toISOString() })
          .eq('store_id', store.id)
          .eq('id', editOrderId)

        if (error?.message?.includes('payment_status')) {
          const currentNotes = String(editOrder.data.notes || '').trim()
          const notes = currentNotes.includes('[ชำระแล้ว]') ? currentNotes : `${currentNotes}${currentNotes ? '\n' : ''}[ชำระแล้ว]`
          const fallback = await supabase
            .from('store_orders')
            .update({ status: 'completed', payment_method: paymentMethod, notes, updated_at: new Date().toISOString() })
            .eq('store_id', store.id)
            .eq('id', editOrderId)
          error = fallback.error
        }
        if (error) throw error
        return billData
      }

      if (type === 'dine_in' && tableId) {
        const { data: activeOrders, error: activeOrdersError } = await supabase
          .from('store_orders')
          .select('id')
          .eq('store_id', store.id)
          .eq('table_id', tableId)
          .in('status', ['pending', 'accepted', 'preparing', 'ready'])

        if (activeOrdersError) throw activeOrdersError
        if (!activeOrders?.length) throw new Error('ไม่พบบิลที่รอชำระสำหรับโต๊ะนี้')

        let { error } = await supabase
          .from('store_orders')
          .update({ status: 'completed', payment_status: 'paid', payment_method: paymentMethod, updated_at: new Date().toISOString() })
          .eq('store_id', store.id)
          .eq('table_id', tableId)
          .in('status', ['pending', 'accepted', 'preparing', 'ready'])
        if (error?.message?.includes('payment_status')) {
          const fallback = await supabase
            .from('store_orders')
            .update({ status: 'completed', payment_method: paymentMethod, updated_at: new Date().toISOString() })
            .eq('store_id', store.id)
            .eq('table_id', tableId)
            .in('status', ['pending', 'accepted', 'preparing', 'ready'])
          error = fallback.error
        }
        if (error) throw error
        return billData
      }

      throw new Error('กรุณารับออเดอร์ก่อนเช็คบิล')
    },
    onSuccess: (data) => {
      setIsPaymentModalOpen(false)
      setCompletedBill(data)
      setIsBillModalOpen(true)
      qc.invalidateQueries()
    },
    onError: (e) => alert((e as Error).message)
  })

  const holdBill = useMutation({
    mutationFn: async () => {
      const newItems = editOrderId
        ? cart.filter((item: any) => !item.sourceItemId)
        : cart.filter(item => !item.fromCustomer)
      if (editOrderId) {
        const editedItems = cart.filter((item: any) => item.sourceItemId)
        const hasChanges = editedItems.some((item: any) => item.qty !== item.originalQty || item.notes !== item.originalNotes) || newItems.length > 0 || orderNote !== (editOrder.data?.notes || '')
        if (!hasChanges) throw new Error('ยังไม่มีการเปลี่ยนแปลงในบิล')

        await Promise.all(editedItems.map(async (item: any) => {
          if (item.qty === item.originalQty && item.notes === item.originalNotes) return
          const { error } = await supabase
            .from('store_order_items')
            .update({ quantity: item.qty, notes: item.notes || null, status: item.qty ? item.itemStatus : 'cancelled' })
            .eq('store_id', store.id)
            .eq('id', item.sourceItemId)
          if (error) throw error
        }))

        if (newItems.length) {
          const { error } = await supabase.from('store_order_items').insert(newItems.map(item => ({
            store_id: store.id,
            order_id: editOrderId,
            menu_item_id: (item as any).menuItemId || item.id,
            name: item.name,
            quantity: item.qty,
            unit_price: item.price,
            notes: (item as any).notes || null,
            status: 'waiting'
          })))
          if (error) throw error
        }

        const { error } = await supabase
          .from('store_orders')
          .update({ subtotal, total, notes: orderNote || null, updated_at: new Date().toISOString() })
          .eq('store_id', store.id)
          .eq('id', editOrderId)
        if (error) throw error
        return editOrderId
      }

      if (!newItems.length) throw new Error('ยังไม่มีรายการใหม่สำหรับพักบิล')
      if (type === 'dine_in' && !tableId) throw new Error('กรุณาเลือกโต๊ะก่อนพักบิล')
      const orderNumber = `ORD-${Date.now().toString().slice(-8)}`
      const orderSubtotal = newItems.reduce((sum, item) => sum + Number(item.price) * item.qty, 0)
      const { data: order, error } = await supabase.from('store_orders').insert({
        store_id: store.id,
        table_id: tableId || null,
        order_number: orderNumber,
        order_type: type,
        status: type === 'delivery' ? 'pending' : 'preparing',
        subtotal: orderSubtotal,
        tax: 0,
        total: orderSubtotal,
        notes: orderNote || null,
        customer_name: selectedTableObj ? `โต๊ะ ${selectedTableObj.table_number}` : 'Walk-in'
      }).select('id').single()
      if (error) throw error
      const { error: itemError } = await supabase.from('store_order_items').insert(newItems.map(item => ({ store_id: store.id, order_id: order.id, menu_item_id: (item as any).menuItemId || item.id, name: item.name, quantity: item.qty, unit_price: item.price, notes: (item as any).notes || null, status: 'waiting' })))
      if (itemError) {
        await supabase.from('store_orders').delete().eq('store_id', store.id).eq('id', order.id)
        throw itemError
      }
      if (tableId) {
        const { error: tableError } = await supabase.from('store_tables').update({ status: 'occupied' }).eq('store_id', store.id).eq('id', tableId)
        if (tableError) throw tableError
      }
      return order.id
    },
    onSuccess: (orderId) => {
      qc.invalidateQueries({ queryKey: ['pos-table-orders', store.id, tableId] })
      qc.invalidateQueries({ queryKey: ['pos-tables', store.id] })
      qc.invalidateQueries({ queryKey: ['pos-edit-order', store.id, editOrderId] })
      if (editOrderId) window.history.back()
      else if (type === 'dine_in') setCart(current => current.filter(item => item.fromCustomer))
      else setCart([])
      setOrderNote('')
    },
    onError: error => alert((error as Error).message)
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
    setHeldOrderId('')
    setTableId('')
    const ordersPath = window.location.pathname.replace(/\/pos$/, '/orders')
    window.history.pushState({}, '', ordersPath)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
      {!isPaymentModalOpen && <>
      <section>
        {/* Top Header Controls */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-orange-500 uppercase">POINT OF SALE</p>
            <h1 className="text-3xl font-black dark:text-white">{isBatchPayment ? (english ? `Receive payment for ${batchPaymentOrders.data?.length || paymentOrderIds.length} bills` : `รับชำระเงิน ${batchPaymentOrders.data?.length || paymentOrderIds.length} บิล`) : editOrderId ? (english ? `Edit bill #${editOrder.data?.order_number || ''}` : `แก้ไขบิล #${editOrder.data?.order_number || ''}`) : (english ? 'New order' : 'ออเดอร์ใหม่')}</h1>
          </div>
          <div className="flex gap-2">
            <select
              value={type}
              onChange={e => {
                setType(e.target.value)
                if (e.target.value !== 'dine_in') setTableId('')
                setOrderNote('')
              }}
              disabled={Boolean(editOrderId) || isBatchPayment}
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
                disabled={Boolean(editOrderId) || isBatchPayment}
                className="h-11 rounded-xl border bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
              >
                <option value="">{english ? 'Select table' : 'เลือกโต๊ะ'}</option>
                {tables.data?.map((x: any) => (
                  <option key={x.id} value={x.id}>
                    {english ? 'Table' : 'โต๊ะ'} {x.table_number} · {x.status === 'occupied' ? (english ? 'Occupied' : 'ไม่ว่าง') : (english ? 'Available' : 'ว่าง')}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="mt-5">
          <div className="relative max-w-md">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input value={menuSearch} onChange={event => setMenuSearch(event.target.value)} placeholder={english ? 'Search menu' : 'ค้นหาเมนู'} className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-orange-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <button type="button" onClick={() => setSelectedMenuCategory('all')} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${selectedMenuCategory === 'all' ? 'bg-orange-500 text-white' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}>{english ? 'All' : 'ทั้งหมด'}</button>
            {menuCategories.map(category => <button key={category} type="button" onClick={() => setSelectedMenuCategory(category)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${selectedMenuCategory === category ? 'bg-orange-500 text-white' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}>{category}</button>)}
          </div>
        </div>

        {/* Menu Catalog Grid */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {filteredMenu.map((x: any) => (
            <button
              key={x.id}
              disabled={isBatchPayment}
              onClick={() => {
                if (editOrderId) setEditDirty(true)
                setCart(c => {
                  const found = c.find(i => i.id === x.id || i.name === x.name)
                  return found
                    ? found.fromCustomer ? [...c, { id: `${x.id}-${Date.now()}`, menuItemId: x.id, name: x.name, price: Number(x.price), qty: 1 }] : c.map(i => i.id === found.id ? { ...i, qty: i.qty + 1 } : i)
                    : [...c, { id: x.id, menuItemId: x.id, name: x.name, price: Number(x.price), qty: 1 }]
                })
              }}
              className="rounded-2xl border bg-white p-3 text-left dark:border-zinc-800 dark:bg-zinc-900 transition hover:shadow-md cursor-pointer active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
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

        {!menu.isLoading && !filteredMenu.length && (
          <p className="mt-16 text-center text-zinc-400">{english ? 'No menu items found' : 'ไม่พบเมนูที่ค้นหา'}</p>
        )}
      </section>

      {/* Aside Bill Cart */}
      <aside className="h-fit rounded-2xl border bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="text-lg font-black dark:text-white">{english ? 'Current bill' : 'บิลปัจจุบัน'}</h2><p className="mt-1 text-xs text-zinc-400">{selectedTableObj ? `${english ? 'Table' : 'โต๊ะ'} ${selectedTableObj.table_number}` : type === 'takeaway' ? (english ? 'Takeaway' : 'สั่งกลับบ้าน') : type === 'delivery' ? (english ? 'Delivery' : 'เดลิเวอรี') : (english ? 'Select a table to start a bill' : 'เลือกโต๊ะเพื่อเริ่มบิล')}</p></div>
        </div>
        <div className="my-5 max-h-72 overflow-y-auto space-y-3">
          {cart.map(x => (
            <div key={x.id} className="space-y-2 border-b border-zinc-100 pb-3 last:border-0 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1"><b className="block truncate text-sm dark:text-white">{x.name}</b><span className="text-xs text-orange-500">฿{x.price}</span></div>
                <button disabled={isBatchPayment} onClick={() => { if (editOrderId) setEditDirty(true); setCart(c => c.flatMap(i => (i.id !== x.id ? [i] : editOrderId && (i as any).sourceItemId ? [{ ...i, qty: Math.max(0, i.qty - 1) }] : i.qty > 1 ? [{ ...i, qty: i.qty - 1 }] : []))) }} className="grid size-7 place-items-center rounded-lg bg-zinc-100 dark:bg-zinc-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"><Minus size={12} /></button>
                <b className="w-4 text-center text-sm dark:text-white">{x.qty}</b>
                <button disabled={isBatchPayment} onClick={() => { if (editOrderId) setEditDirty(true); setCart(c => c.map(i => (i.id === x.id ? { ...i, qty: i.qty + 1 } : i))) }} className="grid size-7 place-items-center rounded-lg bg-zinc-100 dark:bg-zinc-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"><Plus size={12} /></button>
              </div>
              <input disabled={isBatchPayment} value={(x as any).notes || ''} onChange={event => { if (editOrderId) setEditDirty(true); setCart(items => items.map(item => item.id === x.id ? { ...item, notes: event.target.value } : item)) }} placeholder={english ? 'Kitchen note, e.g. no vegetables / mild' : 'หมายเหตุถึงครัว เช่น ไม่ใส่ผัก / เผ็ดน้อย'} className="h-8 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 text-xs outline-none focus:border-orange-400 disabled:opacity-45 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
            </div>
          ))}
          {!cart.length && (
            <p className="text-center text-xs text-zinc-400 py-6">{english ? 'No items in this bill yet' : 'ยังไม่มีรายการในบิล'}</p>
          )}
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-bold text-zinc-600 dark:text-zinc-300">{english ? 'Bill note' : 'หมายเหตุทั้งบิล'}</label>
          <textarea disabled={isBatchPayment} value={orderNote} onChange={event => { if (editOrderId) setEditDirty(true); setOrderNote(event.target.value) }} placeholder="เช่น ลูกค้ารอรับเอง / แจ้งเมื่ออาหารพร้อม" rows={2} className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs outline-none focus:border-orange-400 disabled:opacity-45 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
        </div>

        <div className="space-y-2 border-y py-4 text-sm dark:border-zinc-700">
          <div className="flex justify-between text-zinc-500">
            <span>{english ? 'Subtotal' : 'รวมค่าอาหาร (Subtotal)'}</span>
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
            <span>{english ? 'Total' : 'ยอดสุทธิ (Total)'}</span>
            <span style={{ color: themeColor }}>฿{total.toLocaleString()}</span>
          </div>
        </div>

        {checkout.error && <p className="mt-3 text-xs text-red-500">{(checkout.error as Error).message}</p>}

        <div className="mt-5 border-t pt-4 dark:border-zinc-700">
        {isBatchPayment ? <button disabled={!cart.length || batchPaymentOrders.isLoading} onClick={() => setIsPaymentModalOpen(true)} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-700 disabled:opacity-40 cursor-pointer"><CheckCircle size={17}/>{`รับชำระเงิน ${batchPaymentOrders.data?.length || paymentOrderIds.length} บิล · ฿${total.toLocaleString()}`}</button> : editOrderId ? <div className="space-y-2"><button disabled={holdBill.isPending || !hasEditChanges} onClick={() => holdBill.mutate()} style={{ backgroundColor: themeColor }} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:brightness-95 disabled:opacity-40 cursor-pointer"><Receipt size={17}/>{holdBill.isPending ? 'กำลังบันทึก…' : hasEditChanges ? 'บันทึกการแก้ไขและส่งครัว' : 'ยังไม่มีรายการแก้ไข'}</button><button disabled={!cart.length || editOrder.data?.status === 'cancelled'} onClick={() => setIsPaymentModalOpen(true)} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-40 cursor-pointer"><CheckCircle size={17}/>{`รับชำระเงินและเช็คบิล · ฿${total.toLocaleString()}`}</button></div> : newItemCount ? <button disabled={holdBill.isPending} onClick={() => holdBill.mutate()} style={{ backgroundColor: themeColor }} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:brightness-95 disabled:opacity-40 cursor-pointer"><Receipt size={17}/>{holdBill.isPending ? 'กำลังส่งออเดอร์…' : `${type === 'dine_in' ? 'ส่งเข้าครัว' : 'รับออเดอร์'} · ${newItemCount} รายการ`}</button> : <button disabled={!cart.length} onClick={() => setIsPaymentModalOpen(true)} style={{ backgroundColor: themeColor }} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:brightness-95 disabled:opacity-40 cursor-pointer"><CheckCircle size={17}/>{`เช็คบิล · ฿${total.toLocaleString()}`}</button>}
        </div>
      </aside>
      </>}

      {isPaymentModalOpen && (
        <div className="col-span-full rounded-3xl bg-white p-5 dark:bg-zinc-900 sm:p-6">
          <div className="mx-auto w-full max-w-5xl">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-3 dark:border-zinc-800"><div><p className="text-xs font-bold uppercase tracking-wide text-emerald-600">Payment</p><h2 className="text-xl font-black text-zinc-900 dark:text-white">รับชำระ ฿{total.toLocaleString()}</h2></div><button type="button" onClick={() => setIsPaymentModalOpen(false)} className="rounded-xl px-3 py-2 text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">ปิด</button></div>
            <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_1px_minmax(260px,320px)]">
              <section className="min-w-0"><h3 className="text-sm font-black text-zinc-900 dark:text-white">รายการที่สั่ง</h3><div className="mt-2 max-h-[280px] space-y-1.5 overflow-y-auto pr-2">{cart.map(item => <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-800"><div className="min-w-0"><p className="text-sm font-bold text-zinc-900 dark:text-white">{item.name}</p>{(item as any).notes && <p className="mt-0.5 text-xs text-orange-600">โน้ต: {(item as any).notes}</p>}</div><div className="shrink-0 text-right"><p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{item.qty} × ฿{item.price.toLocaleString()}</p><p className="mt-0.5 text-sm font-black text-orange-600">฿{(item.qty * item.price).toLocaleString()}</p></div></div>)}</div><div className="mt-3 border-t border-zinc-200 pt-2 dark:border-zinc-700"><div className="flex justify-between text-xs text-zinc-500"><span>รวมค่าอาหาร</span><span>฿{subtotal.toLocaleString()}</span></div><div className="mt-1 flex justify-between text-lg font-black text-zinc-900 dark:text-white"><span>ยอดสุทธิ</span><span className="text-orange-500">฿{total.toLocaleString()}</span></div></div></section>
              <div className="hidden bg-zinc-200 lg:block dark:bg-zinc-700" />
              <section><h3 className="text-base font-black text-zinc-900 dark:text-white">เลือกวิธีชำระเงิน</h3><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setPaymentMethod('cash')} className={`h-11 rounded-xl px-4 text-base font-bold transition ${paymentMethod === 'cash' ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}>เงินสด</button><button type="button" onClick={() => setPaymentMethod('promptpay')} className={`h-11 rounded-xl px-4 text-base font-bold transition ${paymentMethod === 'promptpay' ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}>PromptPay</button></div>{paymentMethod === 'cash' ? <div className="mt-4"><div className="flex items-center justify-between gap-3"><label className="text-base font-bold text-zinc-600 dark:text-zinc-300">รับเงินมา</label><input autoFocus inputMode="decimal" value={cashReceived} onChange={event => setCashReceived(event.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" className="h-11 w-36 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-right text-xl font-black outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" /></div><div className="mt-3 grid grid-cols-4 gap-2">{[1000, 500, 100, 50].map(amount => <button key={amount} type="button" onClick={() => setCashReceived(String(amount))} className="h-10 rounded-lg bg-zinc-100 text-sm font-bold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200">฿{amount}</button>)}</div><div className="mx-auto mt-3 grid max-w-[240px] grid-cols-3 gap-1.5">{['1', '2', '3', '4', '5', '6', '7', '8', '9', 'ล้าง', '0', '⌫'].map(key => <button key={key} type="button" onClick={() => setCashReceived(current => key === 'ล้าง' ? '' : key === '⌫' ? current.slice(0, -1) : `${current}${key}`)} className="h-12 rounded-lg bg-zinc-100 text-base font-bold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200">{key}</button>)}</div><div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 dark:bg-emerald-500/10"><span className="text-base font-bold text-emerald-700 dark:text-emerald-300">เงินทอน</span><span className="text-xl font-black text-emerald-700 dark:text-emerald-300">฿{changeDue.toLocaleString()}</span></div></div> : <div className="mt-4 flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/50 p-5 text-center dark:border-emerald-700 dark:bg-emerald-500/10"><div className="rounded-xl bg-white p-3 shadow-sm"><QRCodeSVG value={promptPayPayload} size={170} level="M" /></div><p className="mt-3 text-base font-black text-emerald-700 dark:text-emerald-300">สแกน PromptPay เพื่อชำระ ฿{total.toLocaleString()}</p></div>}<button type="button" disabled={checkout.isPending || (paymentMethod === 'cash' && cashReceivedAmount < total)} onClick={() => checkout.mutate()} className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-emerald-600 text-base font-black text-white transition hover:bg-emerald-700 disabled:opacity-40">{checkout.isPending ? 'กำลังบันทึก…' : paymentMethod === 'cash' ? 'ยืนยันรับเงินสด' : 'ยืนยันชำระ PromptPay'}</button></section>
            </div>
          </div>
        </div>
      )}

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
                {/* Store Logo & Header */}
                <div className="space-y-1 border-b border-dashed border-zinc-300 pb-3 dark:border-zinc-700">
                  {completedBill.storeLogo && (
                    <div className="flex justify-center pb-1">
                      <img
                        src={completedBill.storeLogo}
                        alt="Store Logo"
                        className="size-14 rounded-2xl object-cover border border-zinc-200 shadow-2xs mx-auto"
                      />
                    </div>
                  )}
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
                  <div className="flex justify-between pt-1 text-zinc-500"><span>ชำระโดย:</span><span>{completedBill.paymentMethod === 'cash' ? 'เงินสด' : 'PromptPay'}</span></div>
                  {completedBill.paymentMethod === 'cash' && <><div className="flex justify-between text-zinc-500"><span>รับเงินสด:</span><span>฿{Number(completedBill.cashReceived || 0).toLocaleString()}</span></div><div className="flex justify-between font-bold text-emerald-700"><span>เงินทอน:</span><span>฿{Number(completedBill.changeDue || 0).toLocaleString()}</span></div></>}
                </div>

                {/* PromptPay QR on Bill */}
                {completedBill.paymentMethod === 'promptpay' && <div className="pt-3 border-t border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center gap-1.5">
                  <div className="bg-white p-2.5 rounded-xl shadow-xs border border-zinc-200 inline-block">
                    <QRCodeSVG
                      value={completedBill.promptPayPayload || '00020101021129370016A000000677010111011300668123456785802TH53037646304'}
                      size={120}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#000000"
                      includeMargin={false}
                    />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200">
                    สแกนชำระผ่าน PromptPay QR
                  </p>
                  <p className="text-[9px] text-zinc-500">
                    PromptPay: {completedBill.storePhone}
                  </p>
                </div>}

                <p className="text-[10px] text-zinc-400 pt-2">
                  *** ขอบคุณที่ใช้บริการ ***
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-zinc-100 bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-800 flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer dark:bg-zinc-700 dark:hover:bg-zinc-600"
                >
                  <Printer size={15} /> พิมพ์ (Browser)
                </button>
                <button
                  id="bt-print-btn"
                  disabled={btPrinting}
                  onClick={async () => {
                    if (!completedBill) return
                    setBtPrinting(true)
                    setBtStatus('กำลังค้นหา...')
                    try {
                      await printReceiptViaBluetooth({
                        billNumber: completedBill.billNumber,
                        storeName: completedBill.storeName,
                        storePhone: completedBill.storePhone,
                        storeAddress: completedBill.storeAddress,
                        tableName: completedBill.tableName,
                        items: completedBill.items,
                        subtotal: completedBill.subtotal,
                        serviceCharge: completedBill.serviceCharge,
                        serviceChargePercent: completedBill.serviceChargePercent,
                        tax: completedBill.tax,
                        taxPercent: completedBill.taxPercent,
                        total: completedBill.total,
                        createdAt: completedBill.createdAt,
                        promptPayPayload: generatePromptPayPayload(completedBill.storePhone || store.phone || '', completedBill.total),
                      }, (msg) => setBtStatus(msg))
                      setBtStatus('✅ พิมพ์สำเร็จ!')
                    } catch (err: any) {
                      setBtStatus(`❌ ${err.message}`)
                    } finally {
                      setBtPrinting(false)
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  <Bluetooth size={15} />
                  {btPrinting ? 'กำลังพิมพ์…' : '🖨️ Bluetooth'}
                </button>
                <button
                  title="พิมพ์เฉพาะ QR Code พร้อมเพย์"
                  disabled={btPrinting}
                  onClick={async () => {
                    if (!completedBill) return
                    setBtPrinting(true)
                    setBtStatus('กำลังพิมพ์ QR Code...')
                    try {
                      await printQROnlyViaBluetooth({
                        billNumber: completedBill.billNumber,
                        storeName: completedBill.storeName,
                        storePhone: completedBill.storePhone,
                        storeAddress: completedBill.storeAddress,
                        tableName: completedBill.tableName,
                        items: completedBill.items,
                        subtotal: completedBill.subtotal,
                        serviceCharge: completedBill.serviceCharge,
                        serviceChargePercent: completedBill.serviceChargePercent,
                        tax: completedBill.tax,
                        taxPercent: completedBill.taxPercent,
                        total: completedBill.total,
                        createdAt: completedBill.createdAt,
                        promptPayPayload: generatePromptPayPayload(completedBill.storePhone || store.phone || '', completedBill.total),
                      }, (msg) => setBtStatus(msg))
                      setBtStatus('✅ พิมพ์ QR สำเร็จ!')
                    } catch (err: any) {
                      setBtStatus(`❌ ${err.message}`)
                    } finally {
                      setBtPrinting(false)
                    }
                  }}
                  className="px-3.5 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-50 active:scale-98"
                >
                  📱 พิมพ์เฉพาะ QR
                </button>
              </div>
              {btStatus && (
                <p className="text-center text-xs font-medium py-1 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200">{btStatus}</p>
              )}
              <button
                onClick={handleFinishAndCloseTable}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
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
