import { useEffect, useState, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ExternalLink, Copy, Check, Upload, Image as ImageIcon,
  Trash2, Sparkles, Store, Palette, Receipt, MapPin, Phone,
  FileText, Percent, DollarSign, RefreshCw, CheckCircle2,
  Clock, Eye, Smartphone, Monitor, ChevronRight, Bell, Flame,
  Layers, SlidersHorizontal, Bike, Navigation, ShieldCheck, HelpCircle
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useStore } from '../../StoreContext'
import DeliveryRouteMap from '../../../components/DeliveryRouteMap'

const PRESET_COLORS = [
  { name: 'ส้มสด (Orange)', hex: '#F97316' },
  { name: 'แดงเพลิง (Crimson)', hex: '#EF4444' },
  { name: 'เขียวมรกต (Emerald)', hex: '#10B981' },
  { name: 'ฟ้าน้ำทะเล (Cyan)', hex: '#06B6D4' },
  { name: 'น้ำเงินรอยัล (Blue)', hex: '#3B82F6' },
  { name: 'ม่วงพรีเมียม (Purple)', hex: '#8B5CF6' },
  { name: 'ชมพูโรส (Pink)', hex: '#EC4899' },
  { name: 'ทองอำพัน (Amber)', hex: '#F59E0B' },
  { name: 'ดำคลาสสิก (Slate)', hex: '#0F172A' }
]

const OPENING_HOURS_PRESETS = [
  'เปิดให้บริการทุกวัน 11:00 – 23:00 น.',
  'เปิดให้บริการทุกวัน 10:00 – 22:00 น.',
  'เปิดทุกวัน 09:00 – 21:00 น.',
  'เปิดให้บริการ 24 ชั่วโมง',
  'จันทร์ - ศุกร์ 10:00 – 22:00 น. (หยุด ส.-อา.)'
]

const CATEGORY_TABS = [
  { id: 'all', label: 'ทั้งหมด (All)', icon: Layers },
  { id: 'branding', label: 'ภาพลักษณ์และธีมสี', icon: Palette },
  { id: 'info', label: 'ข้อมูลร้านและเวลาทำการ', icon: Store },
  { id: 'delivery', label: 'ระบบจัดส่ง & พิกัดร้าน (Delivery)', icon: Bike },
  { id: 'taxes', label: 'ภาษีและค่าธรรมเนียม', icon: Receipt }
]

const emptySettings = {
  store_name: '',
  store_slug: '',
  logo_url: '',
  banner_url: '',
  description: '',
  phone: '',
  address: '',
  google_maps_url: '',
  line_oa: '',
  delivery_fee: 25,
  tax_percent: 7,
  service_charge_percent: 0,
  theme_color: '#F97316',
  opening_hours_text: 'เปิดให้บริการทุกวัน 11:00 – 23:00 น.',
  latitude: 13.7563,
  longitude: 100.5018,
  delivery_enabled: true,
  delivery_radius_km: 10,
  base_delivery_fee: 25,
  delivery_fee_per_km: 10,
  min_delivery_fee: 25,
  max_delivery_fee: 150,
  free_delivery_threshold: 500,
  avg_prep_time_minutes: 20
}

export default function Settings() {
  const { store } = useStore()
  const qc = useQueryClient()
  const [form, setForm] = useState<any>(emptySettings)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile')

  const logoFileRef = useRef<HTMLInputElement>(null)
  const bannerFileRef = useRef<HTMLInputElement>(null)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Fetch Store Settings
  const query = useQuery({
    queryKey: ['settings', store.id],
    queryFn: async () => {
      // Fetch settings
      const { data: settingsData, error: sErr } = await supabase
        .from('store_settings')
        .select('*')
        .eq('store_id', store.id)
        .maybeSingle()

      // Fetch shop data
      const { data: shopData, error: shErr } = await supabase
        .from('shops')
        .select('*')
        .eq('id', store.id)
        .maybeSingle()

      if (sErr && sErr.code !== 'PGRST116') throw sErr
      if (shErr) throw shErr

      const openingHoursRaw = settingsData?.opening_hours
      const openingHoursText = typeof openingHoursRaw === 'string'
        ? openingHoursRaw
        : (openingHoursRaw?.text || 'เปิดให้บริการทุกวัน 11:00 – 23:00 น.')

      const delConf = (settingsData as any)?.delivery_config || openingHoursRaw?.delivery_config || {}

      return {
        ...emptySettings,
        ...(settingsData || {}),
        store_name: shopData?.name || settingsData?.store_name || store.name || '',
        store_slug: shopData?.slug || settingsData?.store_slug || store.slug || '',
        logo_url: settingsData?.logo_url || shopData?.logo_url || '',
        banner_url: settingsData?.banner_url || '',
        phone: settingsData?.phone || shopData?.phone || '',
        address: settingsData?.address || shopData?.address || '',
        description: settingsData?.description || '',
        google_maps_url: settingsData?.google_maps_url || '',
        line_oa: settingsData?.line_oa || '',
        delivery_fee: Number(settingsData?.delivery_fee ?? delConf.base_delivery_fee ?? 25),
        tax_percent: Number(settingsData?.tax_percent ?? 7),
        service_charge_percent: Number(settingsData?.service_charge_percent ?? 0),
        theme_color: settingsData?.theme_color || '#F97316',
        opening_hours_text: openingHoursText,
        latitude: Number(shopData?.latitude ?? delConf.latitude ?? 13.7563),
        longitude: Number(shopData?.longitude ?? delConf.longitude ?? 100.5018),
        delivery_enabled: delConf.delivery_enabled !== false,
        delivery_radius_km: Number(delConf.delivery_radius_km ?? 10),
        base_delivery_fee: Number(delConf.base_delivery_fee ?? settingsData?.delivery_fee ?? 25),
        delivery_fee_per_km: Number(delConf.delivery_fee_per_km ?? 10),
        min_delivery_fee: Number(delConf.min_delivery_fee ?? 25),
        max_delivery_fee: Number(delConf.max_delivery_fee ?? 150),
        free_delivery_threshold: Number(delConf.free_delivery_threshold ?? 500),
        avg_prep_time_minutes: Number(delConf.avg_prep_time_minutes ?? 20)
      }
    }
  })

  useEffect(() => {
    if (query.data) {
      setForm(query.data)
    }
  }, [query.data])

  // Image Uploader Helper
  const handleUploadImage = async (file: File, target: 'logo_url' | 'banner_url') => {
    try {
      if (target === 'logo_url') setUploadingLogo(true)
      else setUploadingBanner(true)

      const ext = file.name.split('.').pop() || 'png'
      const path = `${store.id}/${target}-${Date.now()}.${ext}`

      // Attempt upload to Supabase storage bucket 'store-assets' or 'public'
      const { error: uploadErr } = await supabase.storage
        .from('store-assets')
        .upload(path, file, { upsert: true })

      if (!uploadErr) {
        const { data } = supabase.storage.from('store-assets').getPublicUrl(path)
        setForm((prev: any) => ({ ...prev, [target]: data.publicUrl }))
        showToast('อัปโหลดรูปภาพสำเร็จ')
      } else {
        // Fallback: Read as base64 Data URL if storage bucket is not configured
        const reader = new FileReader()
        reader.onload = () => {
          setForm((prev: any) => ({ ...prev, [target]: reader.result as string }))
          showToast('บันทึกรูปภาพเรียบร้อย')
        }
        reader.readAsDataURL(file)
      }
    } catch (err: any) {
      showToast(err.message || 'ไม่สามารถอัปโหลดรูปภาพได้', 'error')
    } finally {
      setUploadingLogo(false)
      setUploadingBanner(false)
    }
  }

  // Save Mutation
  const save = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString()
      const deliveryConfigObj = {
        latitude: Number(form.latitude || 13.7563),
        longitude: Number(form.longitude || 100.5018),
        delivery_enabled: form.delivery_enabled !== false,
        delivery_radius_km: Number(form.delivery_radius_km || 10),
        base_delivery_fee: Number(form.base_delivery_fee || form.delivery_fee || 25),
        delivery_fee_per_km: Number(form.delivery_fee_per_km || 10),
        min_delivery_fee: Number(form.min_delivery_fee || 25),
        max_delivery_fee: Number(form.max_delivery_fee || 150),
        free_delivery_threshold: Number(form.free_delivery_threshold || 500),
        avg_prep_time_minutes: Number(form.avg_prep_time_minutes || 20)
      }

      // 1. Update shops table safely with coordinates
      const shopPayload: any = {
        name: form.store_name?.trim() || store.name,
        slug: form.store_slug?.trim() || store.slug,
        logo_url: form.logo_url || null,
        phone: form.phone?.trim() || '0800000000',
        address: form.address?.trim() || '-',
        latitude: Number(form.latitude || 13.7563),
        longitude: Number(form.longitude || 100.5018),
        updated_at: now
      }

      const { error: shopError } = await supabase
        .from('shops')
        .update(shopPayload)
        .eq('id', store.id)

      if (shopError) throw shopError

      // 2. Upsert store_settings table
      const settingsPayload: any = {
        store_id: store.id,
        logo_url: form.logo_url || null,
        banner_url: form.banner_url || null,
        description: form.description?.trim() || null,
        phone: form.phone?.trim() || null,
        address: form.address?.trim() || null,
        google_maps_url: form.google_maps_url?.trim() || null,
        line_oa: form.line_oa?.trim() || null,
        delivery_fee: Number(form.base_delivery_fee || form.delivery_fee || 25),
        tax_percent: Number(form.tax_percent || 0),
        service_charge_percent: Number(form.service_charge_percent || 0),
        theme_color: form.theme_color || '#F97316',
        opening_hours: {
          text: form.opening_hours_text?.trim() || 'เปิดให้บริการทุกวัน 11:00 – 23:00 น.',
          delivery_config: deliveryConfigObj
        },
        delivery_config: deliveryConfigObj,
        updated_at: now
      }

      let { error: settingsError } = await supabase
        .from('store_settings')
        .upsert(settingsPayload, { onConflict: 'store_id' })

      // Fallback if delivery_config column isn't created yet in Postgres
      if (settingsError && (settingsError.message?.includes('delivery_config') || settingsError.code === 'PGRST204')) {
        delete settingsPayload.delivery_config
        const retry = await supabase
          .from('store_settings')
          .upsert(settingsPayload, { onConflict: 'store_id' })
        if (retry.error) throw retry.error
      } else if (settingsError) {
        throw settingsError
      }
    },
    onSuccess: () => {
      showToast('บันทึกข้อมูลการตั้งค่าร้านสำเร็จ')
      qc.invalidateQueries({ queryKey: ['settings', store.id] })
      qc.invalidateQueries({ queryKey: ['store-access'] })
    },
    onError: (e: any) => {
      showToast(e.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error')
    }
  })

  const updateDeliveryEnabled = useMutation({
    mutationFn: async (enabled: boolean) => {
      const deliveryConfig = {
        latitude: Number(form.latitude || 13.7563),
        longitude: Number(form.longitude || 100.5018),
        delivery_enabled: enabled,
        delivery_radius_km: Number(form.delivery_radius_km || 10),
        base_delivery_fee: Number(form.base_delivery_fee || form.delivery_fee || 25),
        delivery_fee_per_km: Number(form.delivery_fee_per_km || 10),
        min_delivery_fee: Number(form.min_delivery_fee || 25),
        max_delivery_fee: Number(form.max_delivery_fee || 150),
        free_delivery_threshold: Number(form.free_delivery_threshold || 500),
        avg_prep_time_minutes: Number(form.avg_prep_time_minutes || 20)
      }
      const payload: any = {
        store_id: store.id,
        delivery_config: deliveryConfig,
        opening_hours: { text: form.opening_hours_text?.trim() || 'เปิดให้บริการทุกวัน 11:00 – 23:00 น.', delivery_config: deliveryConfig },
        updated_at: new Date().toISOString()
      }
      let { error } = await supabase.from('store_settings').upsert(payload, { onConflict: 'store_id' })
      if (error?.message?.includes('delivery_config') || error?.code === 'PGRST204') {
        delete payload.delivery_config
        const retry = await supabase.from('store_settings').upsert(payload, { onConflict: 'store_id' })
        error = retry.error
      }
      if (error) throw error
    },
    onSuccess: (_, enabled) => {
      setForm((current: any) => ({ ...current, delivery_enabled: enabled }))
      qc.invalidateQueries({ queryKey: ['settings', store.id] })
      showToast(enabled ? 'เปิดรับออเดอร์เดลิเวอรีแล้ว' : 'ปิดรับออเดอร์เดลิเวอรีแล้ว')
    },
    onError: (error: any, enabled) => {
      setForm((current: any) => ({ ...current, delivery_enabled: !enabled }))
      showToast(error.message || 'ไม่สามารถเปลี่ยนสถานะเดลิเวอรีได้', 'error')
    }
  })
  const activeThemeColor = form.theme_color || '#F97316'

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-2xl transition-all ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-600'
        }`}>
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-black tracking-widest uppercase" style={{ color: activeThemeColor }}>
            Configuration
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
            ตั้งค่าร้านค้า (Store Settings)
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium">
            จัดการภาพลักษณ์ สโลแกน เวลาทำการ ภาษี และช่องทางติดต่อ
          </p>
        </div>

        {/* Top Save Button */}
        <button
          disabled={save.isPending}
          onClick={() => save.mutate()}
          style={{ backgroundColor: activeThemeColor }}
          className="flex h-11 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-black text-white shadow-lg transition active:scale-95 disabled:opacity-50 cursor-pointer hover:brightness-95"
        >
          {save.isPending ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          <span>{save.isPending ? 'กำลังบันทึก…' : 'บันทึกการเปลี่ยนแปลง'}</span>
        </button>
      </div>

      {/* ── Category Tabs Navigation ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORY_TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={isActive ? { backgroundColor: activeThemeColor, borderColor: activeThemeColor } : {}}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition whitespace-nowrap cursor-pointer border ${
                isActive
                  ? 'text-white shadow-md shadow-zinc-950/10'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── CATEGORY 2: BRANDING, THEME, SLOGAN & LIVE PREVIEW (การ์ดเดียวกัน) ── */}
      {(activeTab === 'all' || activeTab === 'branding') && (
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-5 sm:p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-6 animate-fade-in">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Palette size={18} style={{ color: activeThemeColor }} />
              <h2 className="text-base font-black text-zinc-950 dark:text-white">
                ภาพลักษณ์ ธีมสี และตัวอย่างหน้าร้าน (Branding, Theme & Preview)
              </h2>
            </div>

            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPreviewMode('mobile')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  previewMode === 'mobile'
                    ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
                }`}
              >
                <Smartphone size={12} /> มือถือ
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('desktop')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  previewMode === 'desktop'
                    ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
                }`}
              >
                <Monitor size={12} /> เต็มจอ
              </button>
            </div>
          </div>

          {/* Unified Two-Column Layout (Controls Left + Live Preview Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
            
            {/* Left: Branding Controls (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Logo & Banner Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Logo Picker */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200">
                    โลโก้ร้านค้า (Store Logo)
                  </label>
                  
                  <div className="flex items-center gap-3">
                    <div className="relative size-20 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 overflow-hidden grid place-items-center shrink-0 shadow-inner group">
                      {form.logo_url ? (
                        <img src={form.logo_url} alt="Logo" className="size-full object-cover" />
                      ) : (
                        <ImageIcon size={24} className="text-zinc-400" />
                      )}
                      {uploadingLogo && (
                        <div className="absolute inset-0 bg-black/60 grid place-items-center text-white text-xs font-bold">
                          <RefreshCw size={14} className="animate-spin" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5 min-w-0">
                      <input
                        type="file"
                        ref={logoFileRef}
                        accept="image/*"
                        onChange={e => {
                          const f = e.target.files?.[0]
                          if (f) handleUploadImage(f, 'logo_url')
                        }}
                        className="hidden"
                      />
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => logoFileRef.current?.click()}
                          disabled={uploadingLogo}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition shadow-xs cursor-pointer dark:bg-zinc-700 dark:hover:bg-zinc-600 truncate"
                        >
                          <Upload size={12} /> {uploadingLogo ? 'กำลังโหลด…' : 'เลือกรูปโลโก้'}
                        </button>
                        {form.logo_url && (
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, logo_url: '' })}
                            className="p-1.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-xs font-bold transition cursor-pointer dark:border-red-900/50 shrink-0"
                            title="ลบรูปโลโก้"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="ลิงก์รูปภาพ (URL)..."
                        value={form.logo_url || ''}
                        onChange={e => setForm({ ...form, logo_url: e.target.value })}
                        className="h-8 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 text-[10px] font-mono outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Banner Picker */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200">
                    ภาพแบนเนอร์ร้าน (Banner Cover)
                  </label>
                  
                  <div className="flex items-center gap-3">
                    <div className="relative w-28 h-20 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 overflow-hidden grid place-items-center shrink-0 shadow-inner">
                      {form.banner_url ? (
                        <img src={form.banner_url} alt="Banner" className="size-full object-cover" />
                      ) : (
                        <ImageIcon size={24} className="text-zinc-400" />
                      )}
                      {uploadingBanner && (
                        <div className="absolute inset-0 bg-black/60 grid place-items-center text-white text-xs font-bold">
                          <RefreshCw size={14} className="animate-spin" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5 min-w-0">
                      <input
                        type="file"
                        ref={bannerFileRef}
                        accept="image/*"
                        onChange={e => {
                          const f = e.target.files?.[0]
                          if (f) handleUploadImage(f, 'banner_url')
                        }}
                        className="hidden"
                      />
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => bannerFileRef.current?.click()}
                          disabled={uploadingBanner}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition shadow-xs cursor-pointer dark:bg-zinc-700 dark:hover:bg-zinc-600 truncate"
                        >
                          <Upload size={12} /> {uploadingBanner ? 'กำลังโหลด…' : 'เลือกรูปแบนเนอร์'}
                        </button>
                        {form.banner_url && (
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, banner_url: '' })}
                            className="p-1.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-xs font-bold transition cursor-pointer dark:border-red-900/50 shrink-0"
                            title="ลบรูปแบนเนอร์"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="ลิงก์แบนเนอร์ (URL)..."
                        value={form.banner_url || ''}
                        onChange={e => setForm({ ...form, banner_url: e.target.value })}
                        className="h-8 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 text-[10px] font-mono outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Theme Color Picker */}
              <div className="space-y-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200">
                  สีประจำร้าน (Brand Theme Color)
                </label>
                
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-1.5 dark:border-zinc-700 dark:bg-zinc-800">
                    <input
                      type="color"
                      value={form.theme_color || '#F97316'}
                      onChange={e => setForm({ ...form, theme_color: e.target.value })}
                      className="size-7 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={form.theme_color || '#F97316'}
                      onChange={e => setForm({ ...form, theme_color: e.target.value })}
                      className="w-20 bg-transparent font-mono text-xs font-black text-zinc-800 dark:text-white outline-none uppercase"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setForm({ ...form, theme_color: c.hex })}
                        style={{ backgroundColor: c.hex }}
                        className={`size-7 rounded-lg shadow-2xs transition hover:scale-110 active:scale-95 cursor-pointer ring-offset-2 dark:ring-offset-zinc-900 ${
                          form.theme_color?.toLowerCase() === c.hex.toLowerCase()
                            ? 'ring-2 ring-zinc-900 dark:ring-white scale-110'
                            : ''
                        }`}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Description & Slogan */}
              <div className="space-y-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200">
                    คำอธิบายร้านค้า / สโลแกน (Description & Slogan)
                  </label>
                  <span className="text-[11px] text-zinc-400 font-medium">
                    * แสดงเป็นสโลแกนใต้ชื่อร้านในหน้าแรกของลูกค้า
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={form.description || ''}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="เช่น สดทุกคำ ร้อนทุกเตา หรือ บุฟเฟต์หมูกระทะพรีเมียม น้ำจิ้มสูตรเด็ด..."
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 p-3.5 text-xs font-bold outline-none focus:border-orange-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
            </div>

            {/* Right: Live Interactive Storefront Preview (5 cols) */}
            <div className="lg:col-span-5 bg-zinc-950 rounded-2xl p-3.5 sm:p-5 flex flex-col items-center justify-center border border-zinc-800 shadow-xl lg:sticky lg:top-24">
              <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-zinc-400">
                <span className="text-[11px] font-bold flex items-center gap-1.5">
                  <Eye size={13} style={{ color: activeThemeColor }} /> ตัวอย่างหน้าจอลูกค้าแบบสด
                </span>
                <span className="text-[10px] font-mono text-emerald-400">● Live Updates</span>
              </div>

              {/* Preview Container */}
              <div className={`w-full transition-all duration-300 ${previewMode === 'mobile' ? 'max-w-xs' : 'max-w-full'}`}>
                
                {/* Mockup Header */}
                <div className="bg-white/95 backdrop-blur-md rounded-t-xl p-2.5 border-b border-zinc-200 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    {form.logo_url ? (
                      <img src={form.logo_url} alt="Logo" className="size-6 rounded-full object-cover border border-zinc-200 shrink-0" />
                    ) : (
                      <span
                        style={{ backgroundColor: activeThemeColor }}
                        className="grid size-6 place-items-center rounded-full text-white text-[10px] font-black shadow-xs shrink-0"
                      >
                        🔥
                      </span>
                    )}
                    <span className="font-extrabold text-[11px] text-zinc-900 truncate">
                      {form.store_name || store.name || 'ชื่อร้านค้า'}
                    </span>
                  </div>

                  <div
                    style={{ backgroundColor: activeThemeColor }}
                    className="px-2 py-0.5 rounded-lg text-white font-black text-[9px] flex items-center gap-1 shadow-xs shrink-0"
                  >
                    <MapPin size={9} /> โต๊ะ 1
                  </div>
                </div>

                {/* Mockup Hero Banner */}
                <div
                  className="relative overflow-hidden bg-zinc-900 text-white p-4 rounded-b-xl border-x border-b border-white/10 shadow-2xl flex flex-col items-start gap-2.5"
                  style={{
                    backgroundImage: form.banner_url ? `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.85)), url(${form.banner_url})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  {/* Opening Hours Tag */}
                  <span
                    style={{ color: activeThemeColor, borderColor: `${activeThemeColor}50`, backgroundColor: `${activeThemeColor}20` }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold backdrop-blur-md"
                  >
                    <span className="size-1 rounded-full animate-ping" style={{ backgroundColor: activeThemeColor }} />
                    {form.opening_hours_text || 'เปิดให้บริการทุกวัน 11:00 – 23:00 น.'}
                  </span>

                  {/* Title & Slogan */}
                  <div>
                    <h3 className="text-base font-black font-sans leading-tight">
                      {form.store_name || store.name || 'ชื่อร้านค้า'}
                    </h3>
                    <p className="text-xs font-extrabold mt-0.5" style={{ color: activeThemeColor }}>
                      {form.description || 'สดทุกคำ ร้อนทุกเตา'}
                    </p>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center gap-1.5 pt-1 w-full">
                    <button
                      type="button"
                      style={{ backgroundColor: activeThemeColor }}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-white font-bold text-[10px] shadow-md"
                    >
                      เริ่มสั่งอาหาร <ChevronRight size={11} />
                    </button>
                    <button
                      type="button"
                      className="px-2.5 py-1.5 rounded-lg bg-white/10 text-white font-bold text-[10px] border border-white/15"
                    >
                      โปรโมชั่น
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CATEGORY 3: STORE INFO & OPERATING HOURS ── */}
      {(activeTab === 'all' || activeTab === 'info') && (
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-5 sm:p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-6 animate-fade-in">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <Store size={18} style={{ color: activeThemeColor }} />
            <h2 className="text-base font-black text-zinc-950 dark:text-white">ข้อมูลพื้นฐานและเวลาทำการ (Store Information & Hours)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Store Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200">
                ชื่อร้าน (Store Name) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.store_name || ''}
                onChange={e => setForm({ ...form, store_name: e.target.value })}
                placeholder="เช่น ครัวน้องยีน"
                className="h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 text-xs font-bold outline-none focus:border-orange-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>

            {/* Store Slug */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200">
                สลัก URL ร้านค้า (Store Slug) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.store_slug || ''}
                onChange={e => setForm({ ...form, store_slug: e.target.value })}
                placeholder="เช่น krua-nong-yeen-19d794"
                className="h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 text-xs font-mono font-bold outline-none focus:border-orange-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>

            {/* Opening Hours */}
            <div className="sm:col-span-2 space-y-2.5 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Clock size={14} style={{ color: activeThemeColor }} /> เวลาเปิด-ปิดร้าน (Opening Hours)
                </label>
                <span className="text-[11px] text-zinc-400 font-medium">
                  * แสดงบนหน้าแรกของลูกค้า
                </span>
              </div>

              <input
                type="text"
                value={form.opening_hours_text || ''}
                onChange={e => setForm({ ...form, opening_hours_text: e.target.value })}
                placeholder="เช่น เปิดให้บริการทุกวัน 11:00 – 23:00 น."
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-xs font-bold outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
              />

              {/* Quick Opening Hours Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {OPENING_HOURS_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setForm({ ...form, opening_hours_text: preset })}
                    style={form.opening_hours_text === preset ? { backgroundColor: activeThemeColor, borderColor: activeThemeColor } : {}}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                      form.opening_hours_text === preset
                        ? 'text-white shadow-xs'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200">
                เบอร์โทรศัพท์ร้าน (Phone)
              </label>
              <input
                type="tel"
                value={form.phone || ''}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="เช่น 081-234-5678"
                className="h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 text-xs font-bold outline-none focus:border-orange-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>

            {/* Line OA */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200">
                LINE Official Account
              </label>
              <input
                type="text"
                value={form.line_oa || ''}
                onChange={e => setForm({ ...form, line_oa: e.target.value })}
                placeholder="เช่น @yourstore"
                className="h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 text-xs font-bold outline-none focus:border-orange-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>

            {/* Address */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200">
                ที่อยู่ร้านค้า (Address)
              </label>
              <textarea
                rows={2}
                value={form.address || ''}
                onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder="ระบุที่อยู่และทำเลของร้าน..."
                className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 p-3.5 text-xs font-bold outline-none focus:border-orange-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>

            {/* Google Maps URL */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200">
                พิกัด Google Maps (Location URL)
              </label>
              <input
                type="url"
                value={form.google_maps_url || ''}
                onChange={e => setForm({ ...form, google_maps_url: e.target.value })}
                placeholder="เช่น https://maps.google.com/..."
                className="h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 text-xs font-bold outline-none focus:border-orange-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── CATEGORY: DELIVERY & STORE LOCATION ── */}
      {(activeTab === 'all' || activeTab === 'delivery') && (
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-5 sm:p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Bike size={20} style={{ color: activeThemeColor }} />
              <div>
                <h2 className="text-base font-black text-zinc-950 dark:text-white">
                  ระบบจัดส่งเดลิเวอรี & พิกัดร้านค้า (Delivery & Location)
                </h2>
                <p className="text-xs text-zinc-400 font-medium">
                  กำหนดพิกัดร้านค้า รัศมีให้บริการ อัตราค่าจัดส่งตามระยะทาง และเวลาถึงโดยประมาณ (ETA)
                </p>
              </div>
            </div>

            {/* Delivery Enable Toggle */}
            <label className="flex items-center gap-2.5 cursor-pointer bg-zinc-50 dark:bg-zinc-800/60 px-4 py-2 rounded-2xl border border-zinc-200 dark:border-zinc-700">
              <input
                type="checkbox"
                checked={form.delivery_enabled !== false}
                onChange={e => {
                  const enabled = e.target.checked
                  setForm((current: any) => ({ ...current, delivery_enabled: enabled }))
                  updateDeliveryEnabled.mutate(enabled)
                }}
                disabled={updateDeliveryEnabled.isPending}
                className="size-4 accent-orange-500 rounded"
              />
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                {form.delivery_enabled !== false ? 'เปิดรับออเดอร์เดลิเวอรี' : 'ปิดรับออเดอร์เดลิเวอรี'}
              </span>
            </label>
          </div>

          {/* Map Location Picker */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <MapPin size={15} style={{ color: activeThemeColor }} /> พิกัดร้านค้าบนแผนที่ (Store Coordinates)
              </label>
              <span className="text-[11px] text-zinc-400 font-medium">
                * แตะบนแผนที่หรือลากหมุด 🏬 เพื่อเปลี่ยนตำแหน่งร้าน
              </span>
            </div>

            <DeliveryRouteMap
              mode="picker"
              pickerTarget="store"
              height="340px"
              showSearch={true}
              searchPlaceholder="🔍 พิมพ์ค้นหาที่ตั้งร้านค้า, ตลาด, อาคาร, ซอย, ถนน..."
              radiusKm={form.delivery_radius_km || 10}
              storeLocation={{
                lat: Number(form.latitude || 13.7563),
                lng: Number(form.longitude || 100.5018),
                name: form.store_name || 'ร้านค้า'
              }}
              onChangeLocation={(lat, lng) => {
                setForm(prev => ({
                  ...prev,
                  latitude: Number(lat.toFixed(6)),
                  longitude: Number(lng.toFixed(6))
                }))
              }}
              onSelectAddressText={(detectedAddress) => {
                if (!form.address || form.address.length < 5) {
                  setForm(prev => ({ ...prev, address: detectedAddress }))
                }
              }}
            />

            {/* Lat / Lng inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400">ละติจูด (Latitude)</label>
                <input
                  type="number"
                  step="0.000001"
                  value={form.latitude ?? 13.7563}
                  onChange={e => setForm({ ...form, latitude: Number(e.target.value) })}
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-xs font-mono font-bold outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400">ลองจิจูด (Longitude)</label>
                <input
                  type="number"
                  step="0.000001"
                  value={form.longitude ?? 100.5018}
                  onChange={e => setForm({ ...form, longitude: Number(e.target.value) })}
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-xs font-mono font-bold outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Delivery Configuration & Pricing Rules Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            {/* Radius */}
            <div className="space-y-2 rounded-2xl bg-zinc-50 p-4 border border-zinc-200/80 dark:bg-zinc-800/50 dark:border-zinc-700 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200">
                  รัศมีจัดส่งสูงสุด (Radius)
                </label>
                <span className="text-xs font-black text-orange-600 dark:text-orange-400">
                  {form.delivery_radius_km || 10} กม.
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={form.delivery_radius_km ?? 10}
                onChange={e => setForm({ ...form, delivery_radius_km: Number(e.target.value) })}
                className="w-full accent-orange-500 cursor-pointer"
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {[3, 5, 10, 15, 20, 30].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm({ ...form, delivery_radius_km: r })}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                      form.delivery_radius_km === r
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {r} กม.
                  </button>
                ))}
              </div>
            </div>

            {/* Base Delivery Fee */}
            <div className="space-y-2 rounded-2xl bg-zinc-50 p-4 border border-zinc-200/80 dark:bg-zinc-800/50 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200">
                  ค่าส่งเริ่มต้น (Base Fare)
                </label>
                <DollarSign size={14} style={{ color: activeThemeColor }} />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-400">฿</span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={form.base_delivery_fee ?? 25}
                  onChange={e => setForm({ ...form, base_delivery_fee: Number(e.target.value), delivery_fee: Number(e.target.value) })}
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-8 pr-3 text-sm font-black outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                />
              </div>
              <p className="text-[10px] text-zinc-400">ค่าจัดส่งสำหรับ 1 กิโลเมตรแรก</p>
            </div>

            {/* Fee Per KM */}
            <div className="space-y-2 rounded-2xl bg-zinc-50 p-4 border border-zinc-200/80 dark:bg-zinc-800/50 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200">
                  ค่าส่งต่อกิโลเมตร (Per KM)
                </label>
                <span className="text-[10px] font-bold text-zinc-400">฿ / กม.</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-400">฿</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.delivery_fee_per_km ?? 10}
                  onChange={e => setForm({ ...form, delivery_fee_per_km: Number(e.target.value) })}
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-8 pr-3 text-sm font-black outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                />
              </div>
              <p className="text-[10px] text-zinc-400">คิดเพิ่มกิโลเมตรละ (หลังพ้น 1 กม. แรก)</p>
            </div>

            {/* Min / Max Capped Fee */}
            <div className="space-y-2 rounded-2xl bg-zinc-50 p-4 border border-zinc-200/80 dark:bg-zinc-800/50 dark:border-zinc-700">
              <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200">
                ค่าส่งขั้นต่ำ / ขั้นสูง
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold block mb-1">ขั้นต่ำ (Min)</span>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={form.min_delivery_fee ?? 25}
                    onChange={e => setForm({ ...form, min_delivery_fee: Number(e.target.value) })}
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-2.5 text-xs font-black outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold block mb-1">สูงสุด (Max)</span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={form.max_delivery_fee ?? 150}
                    onChange={e => setForm({ ...form, max_delivery_fee: Number(e.target.value) })}
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-2.5 text-xs font-black outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Free Delivery Threshold */}
            <div className="space-y-2 rounded-2xl bg-zinc-50 p-4 border border-zinc-200/80 dark:bg-zinc-800/50 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200">
                  ส่งฟรีเมื่อซื้อครบ (Free Delivery)
                </label>
                <Sparkles size={14} className="text-amber-500" />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-400">฿</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={form.free_delivery_threshold ?? 500}
                  onChange={e => setForm({ ...form, free_delivery_threshold: Number(e.target.value) })}
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-8 pr-3 text-sm font-black outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                />
              </div>
              <p className="text-[10px] text-zinc-400">หากไม่ต้องการมีโปรส่งฟรี ให้ใส่ 0</p>
            </div>

            {/* Prep Time (ETA) */}
            <div className="space-y-2 rounded-2xl bg-zinc-50 p-4 border border-zinc-200/80 dark:bg-zinc-800/50 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200">
                  เวลาปรุงอาหารเฉลี่ย (Prep Time)
                </label>
                <Clock size={14} style={{ color: activeThemeColor }} />
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="5"
                  max="120"
                  step="5"
                  value={form.avg_prep_time_minutes ?? 20}
                  onChange={e => setForm({ ...form, avg_prep_time_minutes: Number(e.target.value) })}
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 pr-12 text-sm font-black outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">นาที</span>
              </div>
              <p className="text-[10px] text-zinc-400">ใช้คำนวณเวลารออาหารและเวลาเดินทางรวม (ETA)</p>
            </div>
          </div>
        </div>
      )}

      {/* ── CATEGORY 4: TAXES, SERVICE CHARGE & FEES ── */}
      {(activeTab === 'all' || activeTab === 'taxes') && (
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-5 sm:p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-6 animate-fade-in">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <Receipt size={18} style={{ color: activeThemeColor }} />
            <h2 className="text-base font-black text-zinc-950 dark:text-white">ภาษีและค่าธรรมเนียม (Tax & Fees)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Tax Percent */}
            <div className="space-y-2 rounded-2xl bg-zinc-50 p-4 border border-zinc-200/80 dark:bg-zinc-800/50 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200">
                  ภาษีมูลค่าเพิ่ม (VAT / Tax)
                </label>
                <Percent size={14} style={{ color: activeThemeColor }} />
              </div>
              
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.tax_percent ?? 7}
                  onChange={e => setForm({ ...form, tax_percent: Number(e.target.value) })}
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 pr-8 text-sm font-black outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-400">%</span>
              </div>

              {/* Quick tax presets */}
              <div className="flex gap-1.5 pt-1">
                {[0, 7].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setForm({ ...form, tax_percent: pct })}
                    style={form.tax_percent === pct ? { backgroundColor: activeThemeColor, borderColor: activeThemeColor } : {}}
                    className={`flex-1 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                      form.tax_percent === pct
                        ? 'text-white shadow-xs'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {pct === 0 ? 'ไม่มีภาษี (0%)' : 'VAT 7%'}
                  </button>
                ))}
              </div>
            </div>

            {/* Service Charge Percent */}
            <div className="space-y-2 rounded-2xl bg-zinc-50 p-4 border border-zinc-200/80 dark:bg-zinc-800/50 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200">
                  ค่าบริการ (Service Charge)
                </label>
                <Percent size={14} style={{ color: activeThemeColor }} />
              </div>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={form.service_charge_percent ?? 0}
                  onChange={e => setForm({ ...form, service_charge_percent: Number(e.target.value) })}
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 pr-8 text-sm font-black outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-400">%</span>
              </div>

              {/* Quick service charge presets */}
              <div className="flex gap-1.5 pt-1">
                {[0, 10].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setForm({ ...form, service_charge_percent: pct })}
                    style={form.service_charge_percent === pct ? { backgroundColor: activeThemeColor, borderColor: activeThemeColor } : {}}
                    className={`flex-1 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                      form.service_charge_percent === pct
                        ? 'text-white shadow-xs'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {pct === 0 ? 'ไม่มี (0%)' : '10%'}
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery Fee */}
            <div className="space-y-2 rounded-2xl bg-zinc-50 p-4 border border-zinc-200/80 dark:bg-zinc-800/50 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200">
                  ค่าจัดส่งเริ่มต้น (Delivery Fee)
                </label>
                <DollarSign size={14} style={{ color: activeThemeColor }} />
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-400">฿</span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={form.delivery_fee ?? 0}
                  onChange={e => setForm({ ...form, delivery_fee: Number(e.target.value) })}
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-8 pr-3 text-sm font-black outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                />
              </div>

              <p className="text-[10px] text-zinc-400 pt-1">
                ค่าจัดส่งพื้นฐานสำหรับออเดอร์ประเภทจัดส่งเดลิเวอรี
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Save Action Bar ── */}
      <div className="flex items-center justify-between p-5 rounded-3xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
        <div className="text-xs text-zinc-400 font-medium">
          ข้อมูลจะถูกซิงค์ตรงไปยังฐานข้อมูลและอัปเดตหน้าร้านทันที
        </div>

        <button
          disabled={save.isPending}
          onClick={() => save.mutate()}
          style={{ backgroundColor: activeThemeColor }}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl px-8 text-sm font-black text-white shadow-lg transition active:scale-95 disabled:opacity-50 cursor-pointer hover:brightness-95"
        >
          {save.isPending ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          <span>{save.isPending ? 'กำลังบันทึกข้อมูล…' : 'บันทึกการตั้งค่าทั้งหมด'}</span>
        </button>
      </div>
    </div>
  )
}
