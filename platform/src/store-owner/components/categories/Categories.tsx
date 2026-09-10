import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useStore } from '../../StoreContext'
import { PageHeader, Panel } from '../PageKit'
import { useLanguage } from '../../../lib/language'

type Category = {
  id: string
  store_id: string
  name: string
  icon: string | null
  color: string | null
  status: string
  sort_order: number
  created_at: string
}

const blank = { name: '', icon: '', color: '#F97316', status: 'active' }

export default function Categories() {
  const { language } = useLanguage()
  const english = language === 'en'
  const { store } = useStore()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState(blank)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const key = ['store_categories', store.id]

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_categories')
        .select('id, store_id, name, icon, color, status, sort_order, created_at')
        .eq('store_id', store.id)
        .order('sort_order')
        .order('created_at')
      if (error) throw error
      return (data || []) as Category[]
    }
  })

  const rows = useMemo(() => 
    (query.data || []).filter(x => x.name.toLowerCase().includes(search.toLowerCase())),
    [query.data, search]
  )

  const close = () => {
    setOpen(false)
    setEditing(null)
    setForm(blank)
    setMessage('')
  }

  const add = () => {
    setEditing(null)
    setForm(blank)
    setOpen(true)
  }

  const edit = (x: Category) => {
    setEditing(x)
    setForm({
      name: x.name,
      icon: x.icon || '',
      color: x.color || '#F97316',
      status: x.status
    })
    setOpen(true)
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('กรุณากรอกชื่อหมวดหมู่')
      const payload = {
        name: form.name.trim(),
        icon: form.icon.trim() || null,
        color: form.color.trim() || null,
        status: form.status,
      }
      if (editing) {
        const { error } = await supabase.from('store_categories').update(payload).eq('store_id', store.id).eq('id', editing.id)
        if (error) throw error
      } else {
        const max = Math.max(-1, ...(query.data || []).map(x => x.sort_order))
        const { error } = await supabase.from('store_categories').insert({
          ...payload,
          store_id: store.id,
          sort_order: max + 1
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
    mutationFn: async (x: Category) => {
      const nextStatus = x.status === 'active' ? 'inactive' : 'active'
      const { error } = await supabase.from('store_categories').update({ status: nextStatus }).eq('store_id', store.id).eq('id', x.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key })
  })

  const remove = useMutation({
    mutationFn: async (x: Category) => {
      const { count, error: e } = await supabase.from('store_menu_items').select('id', { count: 'exact', head: true }).eq('store_id', store.id).eq('category_id', x.id)
      if (e) throw e
      if (count) throw new Error(`ลบไม่ได้ เนื่องจากยังมีเมนู ${count} รายการ`)
      const { error } = await supabase.from('store_categories').delete().eq('store_id', store.id).eq('id', x.id)
      if (error) throw error
    },
    onSuccess: () => {
      setMessage('ลบหมวดหมู่แล้ว')
      qc.invalidateQueries({ queryKey: key })
    },
    onError: e => setMessage((e as Error).message)
  })

  const move = useMutation({
    mutationFn: async ({ item, direction }: { item: Category, direction: -1 | 1 }) => {
      const list = query.data || []
      const index = list.findIndex(x => x.id === item.id)
      const other = list[index + direction]
      if (!other) return
      const { error } = await supabase.from('store_categories').upsert([
        { id: item.id, store_id: store.id, sort_order: other.sort_order, name: item.name },
        { id: other.id, store_id: store.id, sort_order: item.sort_order, name: other.name }
      ])
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key })
  })

  return <div className="space-y-6">
    <PageHeader title={english ? 'Categories' : 'หมวดหมู่'} description={english ? 'Manage menu categories and display order' : 'จัดหมวดหมู่เมนูและลำดับการแสดงผล'} />
    <div className="flex justify-end">
      <button onClick={add} className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white"><Plus size={16} />{english ? 'Add category' : 'เพิ่มหมวดหมู่'}</button>
    </div>
    <Panel>
      <div className="border-b p-4 dark:border-zinc-800">
        <label className="flex h-11 items-center gap-2 rounded-xl bg-zinc-100 px-3 dark:bg-zinc-800"><Search size={16} className="text-zinc-400" /><input value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-transparent text-sm outline-none dark:text-white" placeholder={english ? 'Search name…' : 'ค้นหาชื่อ...'} /></label>
      </div>
      {message && <p className={`m-4 rounded-xl p-3 text-sm ${message.startsWith('ลบไม่ได้') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{message}</p>}
      {query.isLoading ? <p className="p-12 text-center text-zinc-400">{english ? 'Loading…' : 'กำลังโหลด…'}</p> : query.error ? <p className="p-8 text-center text-red-500">{(query.error as Error).message}</p> : <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="border-b bg-zinc-50 text-[11px] uppercase text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/50">
              <th className="px-5 py-3">{english ? 'Order' : 'ลำดับ'}</th>
              <th className="px-5 py-3">{english ? 'Category' : 'หมวดหมู่'}</th>
              <th className="px-5 py-3">{english ? 'Status' : 'สถานะ'}</th>
              <th className="px-5 py-3 text-right">{english ? 'Actions' : 'จัดการ'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x, index) => <tr key={x.id} className="border-b last:border-0 dark:border-zinc-800">
              <td className="px-5 py-4">
                <div className="flex items-center gap-1">
                  <b className="mr-2 text-sm text-zinc-400">{x.sort_order + 1}</b>
                  <button disabled={index === 0} onClick={() => move.mutate({ item: x, direction: -1 })} className="p-1.5 disabled:opacity-20"><ArrowUp size={14} /></button>
                  <button disabled={index === rows.length - 1} onClick={() => move.mutate({ item: x, direction: 1 })} className="p-1.5 disabled:opacity-20"><ArrowDown size={14} /></button>
                </div>
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-xl text-xl" style={{ backgroundColor: `${x.color||'#f97316'}20`, color: x.color || '#f97316' }}>{x.icon || '🏷️'}</span>
                  <b className="text-sm dark:text-white">{x.name}</b>
                </div>
              </td>
              <td className="px-5 py-4">
                <button onClick={() => toggle.mutate(x)} className={`relative h-6 w-11 rounded-full ${x.status === 'active' ? 'bg-orange-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                  <i className={`absolute top-1 size-4 rounded-full bg-white transition ${x.status === 'active' ? 'left-6' : 'left-1'}`} />
                </button>
                <span className="ml-2 text-xs text-zinc-500">{x.status === 'active' ? (english ? 'Active' : 'เปิด') : (english ? 'Inactive' : 'ปิด')}</span>
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
        {!rows.length && <p className="p-12 text-center text-sm text-zinc-400">{english ? 'No categories found' : 'ไม่พบหมวดหมู่'}</p>}
      </div>}
    </Panel>
    {open && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 dark:bg-zinc-900">
        <div className="flex justify-between">
          <h2 className="text-xl font-black dark:text-white">{editing ? (english ? 'Edit category' : 'แก้ไขหมวดหมู่') : (english ? 'Add category' : 'เพิ่มหมวดหมู่')}</h2>
          <button onClick={close} className="text-zinc-400 hover:text-zinc-900"><X /></button>
        </div>
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-bold">{english ? 'Category name *' : 'ชื่อหมวดหมู่ *'}</span>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-11 w-full rounded-xl border px-3 outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1 block text-xs font-bold">{english ? 'Icon (Emoji)' : 'ไอคอน (Emoji)'}</span>
              <input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} className="h-11 w-full rounded-xl border px-3 outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" placeholder="เช่น ☕️" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold">{english ? 'Primary color (HEX)' : 'สีหลัก (HEX)'}</span>
              <div className="flex h-11 items-center gap-3 rounded-xl border px-3 dark:border-zinc-700 dark:bg-zinc-800">
                <input type="color" value={form.color||'#F97316'} onChange={e => setForm({ ...form, color: e.target.value })} className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0" />
                <input value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="w-full bg-transparent text-sm outline-none dark:text-white" />
              </div>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={form.status === 'active'} onChange={e => setForm({ ...form, status: e.target.checked ? 'active' : 'inactive' })} className="size-4 rounded accent-orange-500" />
            {english ? 'Enable this category' : 'เปิดใช้งานหมวดหมู่นี้'}
          </label>
          {save.error && <p className="text-sm font-semibold text-red-500">{(save.error as Error).message}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={close} className="rounded-xl border border-zinc-200 px-5 py-2 font-bold hover:bg-zinc-50 dark:border-zinc-700">{english ? 'Cancel' : 'ยกเลิก'}</button>
          <button disabled={save.isPending} onClick={() => save.mutate()} className="rounded-xl bg-orange-500 px-5 py-2 font-bold text-white hover:bg-orange-600 disabled:opacity-50">{english ? 'Save' : 'บันทึก'}</button>
        </div>
      </div>
    </div>}
  </div>
}
