import { useMemo, useState, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Image as ImageIcon, Pencil, Plus, Search, Trash2, X, ImagePlus, Upload } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useStore } from '../../StoreContext'
import { PageHeader, Panel } from '../PageKit'

type MenuItem = {
  id: string
  store_id: string
  category_id: string | null
  name: string
  image_url: string | null
  price: number
  description: string | null
  available: boolean
  cooking_time: number
  category?: { name: string }
}

const blank = { category_id: '', name: '', image_url: '', price: 0, description: '', available: true, cooking_time: 10 }

export default function MenuManagement() {
  const { store } = useStore()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [form, setForm] = useState(blank)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [imageError, setImageError] = useState('')
  const key = ['store_menu_items', store.id]

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setImageError('รองรับ JPG, PNG, WEBP ขนาดไม่เกิน 2 MB')
      return
    }
    setImageError('')
    const reader = new FileReader()
    reader.onload = () => setForm({ ...form, image_url: reader.result as string })
    reader.readAsDataURL(file)
  }

  const categoriesQuery = useQuery({
    queryKey: ['store_categories', store.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('store_categories').select('id, name').eq('store_id', store.id).order('sort_order')
      if (error) throw error
      return data || []
    }
  })

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_menu_items')
        .select(`id, store_id, category_id, name, image_url, price, description, available, cooking_time, category:store_categories(name)`)
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as MenuItem[]
    }
  })

  const rows = useMemo(() => 
    (query.data || []).filter(x => `${x.name} ${x.description || ''} ${x.category?.name || ''}`.toLowerCase().includes(search.toLowerCase())),
    [query.data, search]
  )

  const close = () => {
    setOpen(false)
    setEditing(null)
    setForm(blank)
    setMessage('')
    setImageError('')
  }

  const add = () => {
    setEditing(null)
    setForm({ ...blank, category_id: categoriesQuery.data?.[0]?.id || '' })
    setOpen(true)
  }

  const edit = (x: MenuItem) => {
    setEditing(x)
    setForm({
      name: x.name,
      category_id: x.category_id || '',
      price: x.price,
      image_url: x.image_url || '',
      description: x.description || '',
      available: x.available,
      cooking_time: x.cooking_time
    })
    setOpen(true)
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('กรุณากรอกชื่อเมนู')
      if (!form.category_id) throw new Error('กรุณาเลือกหมวดหมู่')
      
      const payload = {
        name: form.name.trim(),
        category_id: form.category_id,
        price: Number(form.price),
        image_url: form.image_url.trim() || null,
        description: form.description.trim() || null,
        available: form.available,
        cooking_time: Number(form.cooking_time),
        updated_at: new Date().toISOString()
      }
      if (editing) {
        const { error } = await supabase.from('store_menu_items').update(payload).eq('store_id', store.id).eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('store_menu_items').insert({
          ...payload,
          store_id: store.id
        })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key })
      close()
    }
  })

  const toggle = useMutation({
    mutationFn: async (x: MenuItem) => {
      const { error } = await supabase.from('store_menu_items').update({ available: !x.available, updated_at: new Date().toISOString() }).eq('store_id', store.id).eq('id', x.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key })
  })

  const remove = useMutation({
    mutationFn: async (x: MenuItem) => {
      const { error } = await supabase.from('store_menu_items').delete().eq('store_id', store.id).eq('id', x.id)
      if (error) throw error
    },
    onSuccess: () => {
      setMessage('ลบเมนูแล้ว')
      qc.invalidateQueries({ queryKey: key })
    },
    onError: e => setMessage((e as Error).message)
  })

  return <div className="space-y-6">
    <PageHeader title="Menu Items" description="จัดการรายการอาหาร เครื่องดื่ม และราคา" />
    <div className="flex justify-end">
      <button onClick={add} className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white"><Plus size={16} />เพิ่มเมนู</button>
    </div>
    <Panel>
      <div className="border-b p-4 dark:border-zinc-800">
        <label className="flex h-11 items-center gap-2 rounded-xl bg-zinc-100 px-3 dark:bg-zinc-800"><Search size={16} className="text-zinc-400" /><input value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-transparent text-sm outline-none dark:text-white" placeholder="ค้นหาชื่อเมนู..." /></label>
      </div>
      {message && <p className="m-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-600">{message}</p>}
      {query.isLoading ? <p className="p-12 text-center text-zinc-400">กำลังโหลด…</p> : query.error ? <p className="p-8 text-center text-red-500">{(query.error as Error).message}</p> : <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="border-b bg-zinc-50 text-[11px] uppercase text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/50">
              <th className="px-5 py-3">เมนู</th>
              <th className="px-5 py-3">หมวดหมู่</th>
              <th className="px-5 py-3">ราคา</th>
              <th className="px-5 py-3">สถานะ</th>
              <th className="px-5 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(x => <tr key={x.id} className="border-b last:border-0 dark:border-zinc-800">
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  {x.image_url ? <img src={x.image_url} className="size-12 rounded-xl object-cover" /> : <span className="grid size-12 place-items-center rounded-xl bg-orange-50 text-orange-400"><ImageIcon size={18} /></span>}
                  <div>
                    <b className="block text-sm dark:text-white">{x.name}</b>
                    {x.description && <span className="mt-0.5 block max-w-[200px] truncate text-xs text-zinc-500">{x.description}</span>}
                  </div>
                </div>
              </td>
              <td className="px-5 py-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">{x.category?.name || '—'}</td>
              <td className="px-5 py-4 text-sm font-black text-orange-600">฿{x.price}</td>
              <td className="px-5 py-4">
                <button onClick={() => toggle.mutate(x)} className={`relative h-6 w-11 rounded-full ${x.available ? 'bg-orange-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                  <i className={`absolute top-1 size-4 rounded-full bg-white transition ${x.available ? 'left-6' : 'left-1'}`} />
                </button>
                <span className="ml-2 text-xs text-zinc-500">{x.available ? 'พร้อมขาย' : 'หมด'}</span>
              </td>
              <td className="px-5 py-4">
                <div className="flex justify-end gap-1">
                  <button onClick={() => edit(x)} className="p-2 text-zinc-400 hover:text-orange-500"><Pencil size={16} /></button>
                  <button onClick={() => confirm(`ลบ ${x.name}?`) && remove.mutate(x)} className="p-2 text-red-400 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
              </td>
            </tr>)}
          </tbody>
        </table>
        {!rows.length && <p className="p-12 text-center text-sm text-zinc-400">ไม่พบเมนูอาหาร</p>}
      </div>}
    </Panel>
    {open && <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 dark:bg-zinc-900">
        <div className="flex justify-between">
          <h2 className="text-xl font-black dark:text-white">{editing ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'}</h2>
          <button onClick={close} className="text-zinc-400 hover:text-zinc-900"><X /></button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-bold">ชื่อเมนู *</span>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-11 w-full rounded-xl border px-3 outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold">หมวดหมู่ *</span>
            <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className="h-11 w-full rounded-xl border px-3 outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white">
              <option value="" disabled>เลือกหมวดหมู่</option>
              {(categoriesQuery.data || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold">ราคา (บาท) *</span>
            <input type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} className="h-11 w-full rounded-xl border px-3 outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-bold">คำอธิบายเพิ่มเติม</span>
            <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl border p-3 outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
          </label>
          <div className="sm:col-span-2">
            <span className="mb-2 block text-xs font-bold text-zinc-800 dark:text-zinc-200">รูปภาพเมนู <span className="font-normal text-zinc-400">(ไม่บังคับ)</span></span>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => fileRef.current?.click()} className="group grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 text-zinc-400 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-500 dark:border-zinc-700 dark:bg-zinc-800">
                {form.image_url ? <img src={form.image_url} alt="ตัวอย่าง" className="size-full object-cover"/> : <ImagePlus size={24}/>} 
              </button>
              <div>
                <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 text-sm font-bold transition hover:border-orange-300 hover:text-orange-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:text-orange-500"><Upload size={15}/> อัปโหลดรูป</button>
                <p className="mt-2 text-xs text-zinc-400">JPG, PNG หรือ WEBP · ไม่เกิน 2 MB</p>
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImage} className="hidden"/>
            </div>
            {imageError && <p className="mt-2 text-xs font-medium text-red-500">{imageError}</p>}
          </div>
          <label>
            <span className="mb-1 block text-xs font-bold">เวลาปรุงอาหารโดยเฉลี่ย (นาที)</span>
            <input type="number" min="0" value={form.cooking_time} onChange={e => setForm({ ...form, cooking_time: Number(e.target.value) })} className="h-11 w-full rounded-xl border px-3 outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
          </label>
          <label className="flex items-center gap-2 pt-5 text-sm font-bold sm:col-span-2">
            <input type="checkbox" checked={form.available} onChange={e => setForm({ ...form, available: e.target.checked })} className="size-4 rounded accent-orange-500" />
            พร้อมขาย
          </label>
          {save.error && <p className="text-sm font-semibold text-red-500 sm:col-span-2">{(save.error as Error).message}</p>}
        </div>
        <div className="mt-8 flex justify-end gap-2">
          <button onClick={close} className="rounded-xl border border-zinc-200 px-5 py-2 font-bold hover:bg-zinc-50 dark:border-zinc-700">ยกเลิก</button>
          <button disabled={save.isPending} onClick={() => save.mutate()} className="rounded-xl bg-orange-500 px-5 py-2 font-bold text-white hover:bg-orange-600 disabled:opacity-50">บันทึก</button>
        </div>
      </div>
    </div>}
  </div>
}
