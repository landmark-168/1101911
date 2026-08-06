import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { ShoppingCart, Plus, Minus, ChevronLeft, MapPin, Search, Store, ArrowLeft, Utensils, Check } from 'lucide-react'

const qc = new QueryClient()

export default function StorefrontWrapper() {
  return (
    <QueryClientProvider client={qc}>
      <StorefrontApp />
    </QueryClientProvider>
  )
}

function StorefrontApp() {
  const [storeId, setStoreId] = useState<string | null>(null)
  const [tableId, setTableId] = useState<string | null>(null)
  const [tableName, setTableName] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [cart, setCart] = useState<{item: any, quantity: number, notes: string}[]>([])
  const [view, setView] = useState<'menu'|'cart'|'success'>('menu')
  const [orderNumber, setOrderNumber] = useState('')

  useEffect(() => {
    const path = window.location.pathname
    const param = path.split('/')[2]
    if (path.startsWith('/qr/')) {
      supabase.from('store_tables').select('id, store_id, table_number, status').eq('qr_token', param).maybeSingle().then(({data, error}) => {
        if (error || !data) return setErrorMsg('QR Code ไม่ถูกต้อง หรือหมดอายุแล้ว')
        setStoreId(data.store_id)
        setTableId(data.id)
        setTableName(data.table_number)
      })
    } else if (path.startsWith('/s/')) {
      setStoreId(param)
    } else {
      setErrorMsg('ลิงก์ไม่ถูกต้อง')
    }
  }, [])

  const storeQuery = useQuery({
    queryKey: ['store_profile', storeId],
    queryFn: async () => {
      const [{data: shop}, {data: settings}] = await Promise.all([
        supabase.from('shops').select('*').eq('id', storeId).maybeSingle(),
        supabase.from('store_settings').select('*').eq('store_id', storeId).maybeSingle()
      ])
      return { shop, settings }
    },
    enabled: !!storeId
  })

  const menuQuery = useQuery({
    queryKey: ['store_menu', storeId],
    queryFn: async () => {
      const [{data: cats}, {data: items}] = await Promise.all([
        supabase.from('store_categories').select('*').eq('store_id', storeId).eq('status', 'active').order('sort_order'),
        supabase.from('store_menu_items').select('*').eq('store_id', storeId).eq('available', true)
      ])
      return { categories: cats || [], items: items || [] }
    },
    enabled: !!storeId
  })

  const checkout = useMutation({
    mutationFn: async () => {
      if (!cart.length) throw new Error('ไม่มีสินค้าในตะกร้า')
      const total = cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0)
      const orderNum = 'ORD' + Math.floor(1000 + Math.random() * 9000)
      
      const { data: order, error: err1 } = await supabase.from('store_orders').insert({
        store_id: storeId,
        table_id: tableId,
        order_number: orderNum,
        order_type: tableId ? 'dine_in' : 'takeaway',
        status: 'pending',
        subtotal: total,
        total: total,
        customer_name: tableId ? `โต๊ะ ${tableName}` : 'สั่งกลับบ้าน'
      }).select('id').single()
      
      if (err1) throw err1

      const items = cart.map(c => ({
        store_id: storeId,
        order_id: order.id,
        menu_item_id: c.item.id,
        name: c.item.name,
        quantity: c.quantity,
        unit_price: c.item.price,
        notes: c.notes
      }))

      const { error: err2 } = await supabase.from('store_order_items').insert(items)
      if (err2) throw err2
      
      return orderNum
    },
    onSuccess: (num) => {
      setOrderNumber(num)
      setCart([])
      setView('success')
    },
    onError: (e) => alert((e as Error).message)
  })

  const [activeCat, setActiveCat] = useState<string>('all')
  const [search, setSearch] = useState('')

  const addToCart = (item: any) => {
    const existing = cart.find(x => x.item.id === item.id)
    if (existing) {
      setCart(cart.map(x => x.item.id === item.id ? { ...x, quantity: x.quantity + 1 } : x))
    } else {
      setCart([...cart, { item, quantity: 1, notes: '' }])
    }
  }

  const updateQty = (id: string, delta: number) => {
    setCart(cart.map(x => x.item.id === id ? { ...x, quantity: Math.max(0, x.quantity + delta) } : x).filter(x => x.quantity > 0))
  }

  if (errorMsg) return <div className="grid min-h-screen place-items-center bg-zinc-50 p-5 text-center font-bold text-red-500">{errorMsg}</div>
  if (!storeId || storeQuery.isLoading || menuQuery.isLoading) return <div className="grid min-h-screen place-items-center bg-zinc-50 text-sm font-bold text-zinc-400">กำลังโหลดข้อมูลร้าน…</div>
  
  const shop = storeQuery.data?.shop
  const settings = storeQuery.data?.settings
  const themeColor = settings?.theme_color || '#F97316'
  
  const categories = menuQuery.data?.categories || []
  let items = menuQuery.data?.items || []
  if (activeCat !== 'all') items = items.filter(x => x.category_id === activeCat)
  if (search) items = items.filter(x => x.name.toLowerCase().includes(search.toLowerCase()))

  const totalQty = cart.reduce((sum, c) => sum + c.quantity, 0)
  const totalPrice = cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0)

  if (view === 'success') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-6 text-center">
        <div className="grid size-20 place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <Check size={40} strokeWidth={3} />
        </div>
        <h2 className="mt-6 text-2xl font-black text-zinc-800">ส่งออเดอร์สำเร็จ!</h2>
        <p className="mt-2 text-zinc-500">หมายเลขออเดอร์ของคุณคือ</p>
        <div className="mt-4 rounded-xl border border-zinc-200 bg-white px-6 py-3 text-3xl font-black text-zinc-800 shadow-sm">{orderNumber}</div>
        <p className="mt-6 text-sm text-zinc-500">ครัวกำลังเตรียมอาหารให้คุณ<br/>{tableName ? `โปรดรอรับที่โต๊ะ ${tableName}` : 'โปรดรอรับที่เคาน์เตอร์'}</p>
        <button onClick={() => setView('menu')} className="mt-10 h-12 w-full max-w-xs rounded-xl font-bold text-white shadow-lg" style={{ backgroundColor: themeColor }}>
          กลับไปหน้าเมนู
        </button>
      </div>
    )
  }

  if (view === 'cart') {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-50">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 bg-white px-5 shadow-sm">
          <button onClick={() => setView('menu')} className="text-zinc-500"><ArrowLeft /></button>
          <h1 className="text-lg font-black text-zinc-900">ตะกร้าของคุณ</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-5 pb-32">
          {cart.length === 0 ? <p className="mt-20 text-center text-zinc-400">ยังไม่มีสินค้าในตะกร้า</p> : (
            <div className="space-y-4">
              {cart.map(c => (
                <div key={c.item.id} className="flex gap-4 rounded-2xl bg-white p-4 shadow-sm">
                  {c.item.image_url ? <img src={c.item.image_url} className="size-20 rounded-xl object-cover" /> : <div className="grid size-20 place-items-center rounded-xl bg-zinc-100"><Utensils className="text-zinc-300"/></div>}
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <b className="line-clamp-2 text-sm text-zinc-900">{c.item.name}</b>
                      <span className="mt-1 block font-bold text-zinc-900" style={{ color: themeColor }}>฿{c.item.price}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 rounded-lg border bg-zinc-50 p-1">
                        <button onClick={() => updateQty(c.item.id, -1)} className="grid size-6 place-items-center rounded bg-white text-zinc-600 shadow-sm"><Minus size={14}/></button>
                        <span className="w-4 text-center text-sm font-bold">{c.quantity}</span>
                        <button onClick={() => updateQty(c.item.id, 1)} className="grid size-6 place-items-center rounded bg-white text-zinc-600 shadow-sm"><Plus size={14}/></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 rounded-t-3xl border-t bg-white p-5 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <div className="mb-4 flex items-center justify-between text-lg font-black">
              <span>รวมทั้งหมด</span>
              <span style={{ color: themeColor }}>฿{totalPrice.toLocaleString()}</span>
            </div>
            <button onClick={() => checkout.mutate()} disabled={checkout.isPending} className="flex h-14 w-full items-center justify-center gap-2 rounded-xl font-bold text-white shadow-xl transition active:scale-[0.98] disabled:opacity-50" style={{ backgroundColor: themeColor }}>
              {checkout.isPending ? 'กำลังสั่งอาหาร...' : 'ยืนยันสั่งอาหาร'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      <header className="relative bg-zinc-900 px-5 pb-10 pt-12 text-white">
        <div className="absolute inset-0 overflow-hidden">
          {settings?.banner_url && <img src={settings.banner_url} className="size-full object-cover opacity-30" />}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
        </div>
        <div className="relative z-10 flex flex-col items-center text-center">
          {settings?.logo_url ? <img src={settings.logo_url} className="size-24 rounded-full border-4 border-white/10 shadow-2xl object-cover" /> : <div className="grid size-24 place-items-center rounded-full bg-white/10 text-white"><Store size={32}/></div>}
          <h1 className="mt-4 text-2xl font-black tracking-tight">{shop?.name || 'Store'}</h1>
          {settings?.description && <p className="mt-2 max-w-sm text-sm text-zinc-300">{settings.description}</p>}
          {tableName && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold backdrop-blur-md">
              <MapPin size={16} style={{ color: themeColor }} /> โต๊ะ {tableName}
            </div>
          )}
        </div>
      </header>

      <div className="sticky top-0 z-20 bg-zinc-50/90 backdrop-blur-xl">
        <div className="flex gap-2 overflow-x-auto p-4 hide-scrollbar">
          <button onClick={() => setActiveCat('all')} className={`shrink-0 rounded-full px-5 py-2 text-sm font-bold transition ${activeCat === 'all' ? 'text-white shadow-lg' : 'bg-white text-zinc-500 shadow-sm'}`} style={{ backgroundColor: activeCat === 'all' ? themeColor : '' }}>
            ทั้งหมด
          </button>
          {categories.map(c => (
            <button key={c.id} onClick={() => setActiveCat(c.id)} className={`shrink-0 rounded-full px-5 py-2 text-sm font-bold transition ${activeCat === c.id ? 'text-white shadow-lg' : 'bg-white text-zinc-500 shadow-sm'}`} style={{ backgroundColor: activeCat === c.id ? themeColor : '' }}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <main className="p-4">
        <div className="mb-6 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาเมนูอาหาร..." className="h-12 w-full rounded-2xl border-none bg-white pl-11 pr-4 text-sm shadow-sm outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-orange-500" />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map(item => {
            const qty = cart.find(x => x.item.id === item.id)?.quantity || 0
            return (
              <div key={item.id} className="group overflow-hidden rounded-3xl bg-white shadow-sm transition hover:shadow-md">
                <div className="relative aspect-square overflow-hidden bg-zinc-100">
                  {item.image_url ? <img src={item.image_url} className="size-full object-cover" /> : <div className="grid size-full place-items-center text-zinc-300"><Utensils size={32}/></div>}
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 text-sm font-bold leading-tight text-zinc-800">{item.name}</h3>
                  <div className="mt-3 flex items-end justify-between">
                    <span className="font-black" style={{ color: themeColor }}>฿{item.price}</span>
                    {qty > 0 ? (
                      <div className="flex items-center gap-2 rounded-full bg-zinc-100 p-1">
                        <button onClick={() => updateQty(item.id, -1)} className="grid size-7 place-items-center rounded-full bg-white text-zinc-600 shadow-sm"><Minus size={14}/></button>
                        <span className="w-4 text-center text-sm font-bold">{qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="grid size-7 place-items-center rounded-full bg-white text-zinc-600 shadow-sm"><Plus size={14}/></button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(item)} className="grid size-9 place-items-center rounded-full text-white shadow-md transition active:scale-95" style={{ backgroundColor: themeColor }}>
                        <Plus size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {items.length === 0 && <div className="py-20 text-center text-sm text-zinc-400">ไม่พบเมนูที่คุณค้นหา</div>}
      </main>

      {totalQty > 0 && (
        <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-5">
          <button onClick={() => setView('cart')} className="flex w-full max-w-sm items-center justify-between rounded-2xl px-6 py-4 font-bold text-white shadow-2xl transition active:scale-95" style={{ backgroundColor: themeColor }}>
            <span className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-white/20 text-xs">{totalQty}</span> ดูตะกร้า</span>
            <span>฿{totalPrice.toLocaleString()}</span>
          </button>
        </div>
      )}
    </div>
  )
}
