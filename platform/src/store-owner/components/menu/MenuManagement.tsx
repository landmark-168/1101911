import { useEffect, useMemo, useState, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Image as ImageIcon, Pencil, Plus, Search, Trash2, X, ImagePlus,
  Upload, Clock, CheckCircle2, AlertCircle, RefreshCw, Layers,
  Check, Eye, EyeOff, Sparkles, Filter
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useStore } from '../../StoreContext'
import { PageHeader, Panel } from '../PageKit'
import { useLanguage } from '../../../lib/language'

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
  toppings?: { name: string; price: number }[]
  created_at?: string
  updated_at?: string
  category?: { name: string }
}

const blank = {
  category_id: '',
  name: '',
  image_url: '',
  price: 0,
  description: '',
  available: true,
  cooking_time: 10,
  toppings: [] as { name: string; price: number }[]
}

export default function MenuManagement() {
  const { language } = useLanguage()
  const english = language === 'en'
  const { store } = useStore()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'unavailable'>('all')
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [form, setForm] = useState(blank)
  const [open, setOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null)
  const [imageError, setImageError] = useState('')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const queryKey = ['store_menu_items', store.id]
  const catKey = ['store_categories', store.id]

  // Supabase Realtime Subscription for store_menu_items
  useEffect(() => {
    const channel = supabase
      .channel(`realtime:menu_items:${store.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'store_menu_items',
          filter: `store_id=eq.${store.id}`
        },
        () => {
          qc.invalidateQueries({ queryKey })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [store.id, qc])

  // Fetch Categories
  const categoriesQuery = useQuery({
    queryKey: catKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_categories')
        .select('id, name')
        .eq('store_id', store.id)
        .order('sort_order')
      if (error) throw error
      return data || []
    }
  })

  // Fetch Menu Items
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_menu_items')
        .select(`id, store_id, category_id, name, image_url, price, description, available, cooking_time, toppings, created_at, updated_at, category:store_categories(name)`)
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as MenuItem[]
    }
  })

  const menuItems = query.data || []
  const categories = categoriesQuery.data || []

  // Metrics
  const stats = useMemo(() => {
    const total = menuItems.length
    const available = menuItems.filter(x => x.available).length
    const unavailable = total - available
    const catCount = categories.length
    return { total, available, unavailable, catCount }
  }, [menuItems, categories])

  // Filtered Rows
  const filteredRows = useMemo(() => {
    return menuItems.filter(item => {
      const matchesSearch = `${item.name} ${item.description || ''} ${item.category?.name || ''}`
        .toLowerCase()
        .includes(search.toLowerCase())
      if (!matchesSearch) return false

      if (selectedCategory !== 'all' && item.category_id !== selectedCategory) return false

      if (statusFilter === 'available' && !item.available) return false
      if (statusFilter === 'unavailable' && item.available) return false

      return true
    })
  }, [menuItems, search, selectedCategory, statusFilter])

  // Image Upload Handler
  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024) {
      setImageError('รองรับไฟล์ JPG, PNG, WEBP ขนาดไม่เกิน 3 MB')
      return
    }
    setImageError('')
    const reader = new FileReader()
    reader.onload = () => {
      setForm(prev => ({ ...prev, image_url: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  // Open modal for Adding
  const handleAdd = () => {
    setEditing(null)
    setForm({
      ...blank,
      category_id: categories[0]?.id || ''
    })
    setImageError('')
    setOpen(true)
  }

  // Open modal for Editing
  const handleEdit = (item: MenuItem) => {
    setEditing(item)
    setForm({
      name: item.name,
      category_id: item.category_id || '',
      price: item.price,
      image_url: item.image_url || '',
      description: item.description || '',
      available: item.available,
      cooking_time: item.cooking_time || 10,
      toppings: Array.isArray(item.toppings) ? item.toppings.map((option: any) => ({ name: String(option.name || ''), price: Number(option.price || 0) })) : []
    })
    setImageError('')
    setOpen(true)
  }

  const closeModal = () => {
    setOpen(false)
    setEditing(null)
    setForm(blank)
    setImageError('')
  }

  // Save Mutation (Insert / Update)
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('กรุณากรอกชื่อเมนูอาหาร')
      if (!form.category_id) throw new Error('กรุณาเลือกหมวดหมู่')
      if (Number(form.price) < 0) throw new Error('ราคาอาหารต้องไม่ติดลบ')

      const payload = {
        name: form.name.trim(),
        category_id: form.category_id,
        price: Number(form.price),
        image_url: form.image_url.trim() || null,
        description: form.description.trim() || null,
        available: form.available,
        cooking_time: Number(form.cooking_time || 10),
        toppings: form.toppings.filter(option => option.name.trim()).map(option => ({ name: option.name.trim(), price: Number(option.price || 0) })),
        updated_at: new Date().toISOString()
      }

      if (editing) {
        const { error } = await supabase
          .from('store_menu_items')
          .update(payload)
          .eq('store_id', store.id)
          .eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('store_menu_items')
          .insert({
            ...payload,
            store_id: store.id
          })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey })
      closeModal()
    }
  })

  // Optimistic Realtime Toggle Status Mutation
  const toggleMutation = useMutation({
    mutationFn: async (item: MenuItem) => {
      setTogglingId(item.id)
      const nextAvailable = !item.available
      const { error } = await supabase
        .from('store_menu_items')
        .update({
          available: nextAvailable,
          updated_at: new Date().toISOString()
        })
        .eq('store_id', store.id)
        .eq('id', item.id)

      if (error) throw error
      return { id: item.id, available: nextAvailable }
    },
    onMutate: async (item) => {
      // Cancel outgoing queries
      await qc.cancelQueries({ queryKey })
      const prevData = qc.getQueryData<MenuItem[]>(queryKey)

      // Optimistically flip available
      if (prevData) {
        qc.setQueryData<MenuItem[]>(
          queryKey,
          prevData.map(x => x.id === item.id ? { ...x, available: !x.available } : x)
        )
      }
      return { prevData }
    },
    onError: (_err, _item, context) => {
      if (context?.prevData) {
        qc.setQueryData(queryKey, context.prevData)
      }
    },
    onSettled: () => {
      setTogglingId(null)
      qc.invalidateQueries({ queryKey })
    }
  })

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('store_menu_items')
        .delete()
        .eq('store_id', store.id)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey })
    }
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-orange-500">
            STORE WORKSPACE
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-zinc-950 dark:text-white sm:text-3xl">
            {english ? 'Menu items' : 'รายการเมนู'}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {english ? 'Manage menu items, prices, and availability in real time' : 'จัดการรายการอาหาร เครื่องดื่ม ราคา และสถานะพร้อมขายแบบเรียลไทม์'}
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 active:scale-[0.98]"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>{english ? 'Add menu item' : 'เพิ่มเมนูใหม่'}</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-bold text-zinc-400">{english ? 'All menu items' : 'เมนูทั้งหมด'}</p>
          <p className="mt-1.5 text-2xl font-black text-zinc-900 dark:text-white">{stats.total}</p>
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-400">
            <Layers size={12} /> {stats.catCount} {english ? 'categories' : 'หมวดหมู่'}
          </span>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm dark:border-emerald-900/30 dark:bg-emerald-950/20">
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{english ? 'Available' : 'พร้อมขาย (Active)'}</p>
          <p className="mt-1.5 text-2xl font-black text-emerald-700 dark:text-emerald-300">{stats.available}</p>
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={12} /> {english ? 'Available to customers' : 'เปิดให้ลูกค้าสั่ง'}
          </span>
        </div>

        <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4 shadow-sm dark:border-red-900/30 dark:bg-red-950/20">
          <p className="text-xs font-bold text-red-600 dark:text-red-400">{english ? 'Out of stock' : 'สินค้าหมด (Out of Stock)'}</p>
          <p className="mt-1.5 text-2xl font-black text-red-700 dark:text-red-300">{stats.unavailable}</p>
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400">
            <AlertCircle size={12} /> {english ? 'Hidden temporarily' : 'ซ่อนชั่วคราว'}
          </span>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-bold text-zinc-400">{english ? 'All categories' : 'หมวดหมู่ทั้งหมด'}</p>
          <p className="mt-1.5 text-2xl font-black text-zinc-900 dark:text-white">{stats.catCount}</p>
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-400">
            <Sparkles size={12} /> {english ? 'Store categories' : 'หมวดหลักของร้าน'}
          </span>
        </div>
      </div>

      {/* Main Panel */}
      <Panel>
        {/* Category & Status Filter Header */}
        <div className="border-b border-zinc-100 p-4 dark:border-zinc-800 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={english ? 'Search menu, category, description…' : 'ค้นหาชื่อเมนู, หมวดหมู่, คำอธิบาย...'}
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:ring-orange-500/20"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Status Filter Buttons & Refresh */}
            <div className="flex items-center gap-2">
              <div className="flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
                {[
                  { id: 'all', label: english ? 'All' : 'ทั้งหมด' },
                  { id: 'available', label: english ? 'Available' : 'พร้อมขาย' },
                  { id: 'unavailable', label: english ? 'Out of stock' : 'สินค้าหมด' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id as any)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      statusFilter === tab.id
                        ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white'
                        : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => qc.invalidateQueries({ queryKey })}
                className="grid size-10 place-items-center rounded-xl border border-zinc-200/80 bg-white text-zinc-500 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          {categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs font-bold text-zinc-400 mr-1 flex items-center gap-1">
                <Filter size={12} /> หมวด:
              </span>
              <button
                onClick={() => setSelectedCategory('all')}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  selectedCategory === 'all'
                    ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                }`}
              >
                ทั้งหมด ({menuItems.length})
              </button>
              {categories.map((cat: any) => {
                const count = menuItems.filter(m => m.category_id === cat.id).length
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                      selectedCategory === cat.id
                        ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {cat.name} ({count})
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Table Content */}
        {query.isLoading ? (
          <div className="py-20 text-center">
            <div className="mx-auto size-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            <p className="mt-3 text-xs font-bold text-zinc-400">กำลังโหลดรายการอาหาร…</p>
          </div>
        ) : query.error ? (
          <div className="py-16 text-center text-sm font-bold text-red-500">
            {(query.error as Error).message}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-zinc-100 text-2xl text-zinc-400 dark:bg-zinc-800">
              🍽️
            </div>
            <p className="mt-3 text-sm font-extrabold text-zinc-700 dark:text-zinc-300">
              {search || selectedCategory !== 'all' || statusFilter !== 'all'
                ? 'ไม่พบเมนูที่ตรงกับเงื่อนไขค้นหา'
                : 'ยังไม่มีรายการเมนูอาหารในร้าน'}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {search ? 'ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่น' : 'กดปุ่ม "เพิ่มเมนูใหม่" เพื่อเริ่มสร้างรายการอาหาร'}
            </p>
            {!search && selectedCategory === 'all' && (
              <button
                onClick={handleAdd}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-orange-600"
              >
                <Plus size={14} /> เพิ่มเมนูแรก
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/70 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/50">
                  <th className="px-5 py-3.5">เมนู</th>
                  <th className="px-5 py-3.5">หมวดหมู่</th>
                  <th className="px-5 py-3.5">ราคา</th>
                  <th className="px-5 py-3.5">เวลาปรุง</th>
                  <th className="px-5 py-3.5">สถานะ</th>
                  <th className="px-5 py-3.5 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
                {filteredRows.map(item => {
                  const isToggling = togglingId === item.id

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-orange-50/30 dark:hover:bg-zinc-800/60 transition group"
                    >
                      {/* Menu Info */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3.5">
                          {item.image_url ? (
                            <button
                              onClick={() => setPreviewImage(item.image_url)}
                              className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-zinc-100 shadow-sm transition hover:scale-105 dark:border-zinc-800"
                              title="คลิกเพื่อดูรูปขนาดเต็ม"
                            >
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="size-full object-cover"
                              />
                            </button>
                          ) : (
                            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-400 dark:bg-orange-500/10">
                              <ImageIcon size={20} />
                            </span>
                          )}
                          <div className="min-w-0">
                            <b className="block text-sm font-extrabold text-zinc-900 dark:text-white truncate">
                              {item.name}
                            </b>
                            {item.description ? (
                              <p className="mt-0.5 max-w-[280px] truncate text-xs text-zinc-500 dark:text-zinc-400">
                                {item.description}
                              </p>
                            ) : (
                              <span className="text-[11px] text-zinc-300 dark:text-zinc-600 italic">
                                ไม่มีคำอธิบาย
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {item.category?.name || 'ไม่มีหมวดหมู่'}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="px-5 py-4 font-black text-zinc-900 dark:text-white">
                        <span className="text-orange-500">฿</span>{Number(item.price || 0).toLocaleString()}
                      </td>

                      {/* Cooking Time */}
                      <td className="px-5 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={13} className="text-zinc-400" />
                          {item.cooking_time || 10} นาที
                        </span>
                      </td>

                      {/* Realtime Status Toggle Button */}
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => toggleMutation.mutate(item)}
                          disabled={isToggling}
                          className={`inline-flex items-center gap-2.5 rounded-full px-3 py-1.5 text-xs font-extrabold transition-all active:scale-95 ${
                            item.available
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-800/50'
                              : 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700'
                          }`}
                          title="คลิกเพื่อเปลี่ยนสถานะ พร้อมขาย / สินค้าหมด"
                        >
                          {/* Animated Switch Pill */}
                          <div
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                              item.available ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                item.available ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </div>
                          <span className="shrink-0">{item.available ? 'พร้อมขาย' : 'สินค้าหมด'}</span>
                        </button>
                      </td>

                      {/* Action Buttons */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="grid size-8 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-500 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                            title="แก้ไขเมนู"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="grid size-8 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-400 shadow-sm transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                            title="ลบเมนู"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Add / Edit Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-zinc-950/60 p-4 backdrop-blur-sm"
          onMouseDown={e => e.target === e.currentTarget && closeModal()}
        >
          <div className="my-8 flex max-h-[calc(100vh-4rem)] w-full max-w-xl flex-col rounded-[28px] bg-white shadow-2xl dark:bg-zinc-900">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-zinc-100 p-6 dark:border-zinc-800">
              <div>
                <h2 className="text-xl font-black text-zinc-900 dark:text-white">
                  {editing ? 'แก้ไขรายการอาหาร' : 'เพิ่มเมนูอาหารใหม่'}
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  {editing ? `กำลังแก้ไข: ${editing.name}` : 'กำหนดข้อมูลเมนู ราคา หมวดหมู่ และรูปภาพ'}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="grid size-9 place-items-center rounded-xl text-zinc-400 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={e => {
                e.preventDefault()
                saveMutation.mutate()
              }}
              className="overflow-y-auto p-6 space-y-5"
            >
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  ชื่อเมนูอาหาร *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="เช่น ต้มยำกุ้งน้ำข้น, ชาเขียวมัทฉะลาเต้"
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-sm font-semibold outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              {/* Category & Price */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    หมวดหมู่ *
                  </label>
                  <select
                    required
                    value={form.category_id}
                    onChange={e => setForm({ ...form, category_id: e.target.value })}
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="" disabled>
                      -- เลือกหมวดหมู่ --
                    </option>
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    ราคาจำหน่าย (บาท) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-orange-500">
                      ฿
                    </span>
                    <input
                      required
                      type="number"
                      min="0"
                      step="any"
                      value={form.price || ''}
                      onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                      placeholder="0.00"
                      className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-8 pr-3 text-sm font-black outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Cooking Time & Available Status */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    เวลาปรุงโดยเฉลี่ย (นาที)
                  </label>
                  <div className="relative">
                    <Clock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="number"
                      min="1"
                      value={form.cooking_time || 10}
                      onChange={e => setForm({ ...form, cooking_time: Number(e.target.value) })}
                      className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    สถานะการเปิดขาย
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, available: !form.available })}
                    className={`flex h-11 w-full items-center justify-between rounded-xl border px-3.5 text-xs font-extrabold transition ${
                      form.available
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : 'border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    <span>{form.available ? '🟢 พร้อมขาย (In Stock)' : '🔴 สินค้าหมด (Sold Out)'}</span>
                    <div
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        form.available ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          form.available ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </button>
                </div>
              </div>

              {/* Optional add-ons */}
              <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-4 dark:border-orange-900/50 dark:bg-orange-950/10">
                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-xs font-black text-zinc-800 dark:text-zinc-100">ตัวเลือกเสริมของเมนู</p><p className="mt-0.5 text-[11px] text-zinc-500">ลูกค้าและแคชเชียร์เลือกได้หลายรายการ ราคาจะบวกจากราคาเมนู</p></div>
                  <button type="button" onClick={() => setForm({ ...form, toppings: [...form.toppings, { name: '', price: 0 }] })} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-orange-500 px-3 py-2 text-xs font-bold text-white"><Plus size={13}/>เพิ่มตัวเลือก</button>
                </div>
                <div className="mt-3 space-y-2">
                  {form.toppings.map((option, index) => <div key={index} className="grid grid-cols-[1fr_110px_36px] gap-2">
                    <input value={option.name} onChange={event => setForm({ ...form, toppings: form.toppings.map((entry, i) => i === index ? { ...entry, name: event.target.value } : entry) })} placeholder="เช่น เพิ่มชีส" className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                    <input type="number" min="0" step="0.01" value={option.price || ''} onChange={event => setForm({ ...form, toppings: form.toppings.map((entry, i) => i === index ? { ...entry, price: Number(event.target.value) } : entry) })} placeholder="ราคาเพิ่ม" className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                    <button type="button" aria-label="ลบตัวเลือกเสริม" onClick={() => setForm({ ...form, toppings: form.toppings.filter((_, i) => i !== index) })} className="grid size-9 place-items-center rounded-xl text-red-500 hover:bg-red-50"><X size={15}/></button>
                  </div>)}
                  {!form.toppings.length && <p className="py-2 text-center text-xs text-zinc-400">ยังไม่มีตัวเลือกเสริม</p>}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  คำอธิบายเมนูอาหาร
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="เช่น รสชาติจัดจ้าน กุ้งแม่น้ำตัวใหญ่ พร้อมเครื่องเคียงสดใหม่"
                  className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              {/* Image Upload Area */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  รูปภาพเมนูอาหาร <span className="font-normal text-zinc-400">(อัปโหลดไฟล์ หรือใส่ Image URL)</span>
                </label>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50 space-y-3">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="group relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-zinc-300 bg-white text-zinc-400 transition hover:border-orange-500 hover:bg-orange-50 hover:text-orange-500 dark:border-zinc-600 dark:bg-zinc-800"
                    >
                      {form.image_url ? (
                        <img
                          src={form.image_url}
                          alt="ตัวอย่างรูป"
                          className="size-full object-cover"
                        />
                      ) : (
                        <ImagePlus size={24} />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 text-xs font-bold text-zinc-700 shadow-sm transition hover:border-orange-300 hover:text-orange-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                        >
                          <Upload size={13} /> เลือกรูปภาพ
                        </button>
                        {form.image_url && (
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, image_url: '' })}
                            className="inline-flex h-9 items-center gap-1 rounded-xl px-2.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                          >
                            <Trash2 size={13} /> ลบรูป
                          </button>
                        )}
                      </div>
                      <p className="mt-1.5 text-[11px] text-zinc-400">
                        JPG, PNG หรือ WEBP ขนาดไม่เกิน 3 MB
                      </p>
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleImage}
                      className="hidden"
                    />
                  </div>

                  {/* Manual URL Input */}
                  <input
                    type="url"
                    value={form.image_url}
                    onChange={e => setForm({ ...form, image_url: e.target.value })}
                    placeholder="หรือวาง URL รูปภาพ https://..."
                    className="h-9 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                {imageError && (
                  <p className="mt-1.5 text-xs font-bold text-red-500">{imageError}</p>
                )}
              </div>

              {saveMutation.error && (
                <div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600 dark:bg-red-950/40 dark:text-red-400">
                  {(saveMutation.error as Error).message}
                </div>
              )}
            </form>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 border-t border-zinc-100 p-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={closeModal}
                className="h-11 rounded-xl border border-zinc-200 px-5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                ยกเลิก
              </button>
              <button
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
                className="h-11 rounded-xl bg-orange-500 px-6 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50"
              >
                {saveMutation.isPending ? 'กำลังบันทึก…' : editing ? 'บันทึกการแก้ไข' : 'สร้างเมนูอาหาร'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Lightbox */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-zinc-950/80 p-4 backdrop-blur-md"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-zinc-900">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-zinc-950/60 text-white backdrop-blur transition hover:bg-zinc-950"
            >
              <X size={18} />
            </button>
            <img src={previewImage} alt="Preview" className="max-h-[80vh] w-full object-contain" />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[85] grid place-items-center bg-zinc-950/60 p-4 backdrop-blur-sm"
          onMouseDown={e => e.target === e.currentTarget && setDeleteTarget(null)}
        >
          <div className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl dark:bg-zinc-900">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <Trash2 size={22} />
            </div>
            <h3 className="mt-4 text-center text-lg font-black text-zinc-900 dark:text-white">
              ยืนยันการลบเมนู?
            </h3>
            <p className="mt-1 text-center text-xs text-zinc-500 dark:text-zinc-400">
              ต้องการลบ <b className="text-zinc-800 dark:text-zinc-200">"{deleteTarget.name}"</b> ออกจากรายการอาหารใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>

            <div className="mt-6 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setDeleteTarget(null)}
                className="h-11 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                ยกเลิก
              </button>
              <button
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                className="h-11 rounded-xl bg-red-500 text-sm font-bold text-white shadow-md shadow-red-500/20 transition hover:bg-red-600 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'กำลังลบ…' : 'ลบเมนู'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
