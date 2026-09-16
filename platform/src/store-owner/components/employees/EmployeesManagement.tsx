import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Users, UserPlus, KeyRound, Shield, CheckCircle2,
  Trash2, Edit3, Eye, EyeOff, Search,
  ChefHat, CircleDollarSign, Utensils, Bike, Sparkles,
  RefreshCw, Copy, Check, Lock, Unlock, Phone,
  LayoutGrid, List, AlertCircle, ShieldCheck, Printer, Dices
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useStore } from '../../StoreContext'
import { useLanguage } from '../../../lib/language'

export interface Employee {
  id: string
  store_id: string
  user_id?: string | null
  full_name?: string
  name?: string
  phone?: string
  role: 'owner' | 'manager' | 'cashier' | 'kitchen' | 'waiter' | 'rider'
  pin_code?: string
  status: 'active' | 'inactive' | 'suspended'
  permissions?: string[]
  created_at: string
}

export const ROLE_CONFIG: Record<string, {
  label: string
  labelEn: string
  color: string
  bgLight: string
  badgeBg: string
  icon: any
  desc: string
  defaultPermissions: string[]
}> = {
  owner: {
    label: 'เจ้าของร้าน',
    labelEn: 'Store Owner',
    color: '#8B5CF6',
    bgLight: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
    badgeBg: 'bg-purple-600 text-white',
    icon: ShieldCheck,
    desc: 'สิทธิ์สูงสุด เข้าถึงได้ทุกฟังก์ชันและการตั้งค่าร้าน',
    defaultPermissions: ['dashboard', 'orders', 'pos', 'menu', 'categories', 'tables', 'kitchen', 'promotions', 'customers', 'employees', 'reports', 'settings']
  },
  manager: {
    label: 'ผู้จัดการร้าน',
    labelEn: 'Manager',
    color: '#3B82F6',
    bgLight: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
    badgeBg: 'bg-blue-600 text-white',
    icon: Shield,
    desc: 'จัดการภาพรวม ออเดอร์ เมนู และรายงาน',
    defaultPermissions: ['dashboard', 'orders', 'pos', 'menu', 'categories', 'tables', 'kitchen', 'promotions', 'customers', 'employees', 'reports']
  },
  cashier: {
    label: 'แคชเชียร์',
    labelEn: 'Cashier',
    color: '#10B981',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
    badgeBg: 'bg-emerald-600 text-white',
    icon: CircleDollarSign,
    desc: 'คิดเงิน เช็คบิล หน้าร้าน POS และประวัติออเดอร์',
    defaultPermissions: ['pos', 'orders', 'tables', 'customers']
  },
  kitchen: {
    label: 'พนักงานครัว',
    labelEn: 'Kitchen Staff',
    color: '#F59E0B',
    bgLight: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
    badgeBg: 'bg-amber-600 text-white',
    icon: ChefHat,
    desc: 'ดูรายการอาหารในห้องครัว (KDS) และอัปเดตสถานะปรุงอาหาร',
    defaultPermissions: ['kitchen', 'orders']
  },
  waiter: {
    label: 'พนักงานเสิร์ฟ',
    labelEn: 'Waiter / Service',
    color: '#06B6D4',
    bgLight: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60',
    badgeBg: 'bg-cyan-600 text-white',
    icon: Utensils,
    desc: 'รับออเดอร์หน้าร้าน จัดการสถานะโต๊ะอาหาร',
    defaultPermissions: ['tables', 'orders', 'pos']
  },
  rider: {
    label: 'พนักงานส่งอาหาร',
    labelEn: 'Rider / Delivery',
    color: '#F43F5E',
    bgLight: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
    badgeBg: 'bg-rose-600 text-white',
    icon: Bike,
    desc: 'รับและอัปเดตสถานะออเดอร์เดลิเวอรี',
    defaultPermissions: ['orders']
  }
}

export const ALL_PERMISSIONS = [
  { id: 'dashboard', label: 'Dashboard', desc: 'แดชบอร์ดสรุปยอดขายและสถิติ' },
  { id: 'orders', label: 'Orders', desc: 'รายการออเดอร์และสถานะ' },
  { id: 'pos', label: 'POS หน้าร้าน', desc: 'ระบบขายหน้าร้านและเช็คบิล' },
  { id: 'menu', label: 'Menu', desc: 'จัดการรายการอาหารและราคา' },
  { id: 'categories', label: 'Categories', desc: 'จัดการหมวดหมู่อาหาร' },
  { id: 'tables', label: 'Tables', desc: 'จัดการโต๊ะและ QR Code' },
  { id: 'kitchen', label: 'Kitchen KDS', desc: 'หน้าจอจัดการในครัว' },
  { id: 'promotions', label: 'Promotions', desc: 'โปรโมชั่นและส่วนลด' },
  { id: 'customers', label: 'Customers', desc: 'ฐานข้อมูลลูกค้าและสมาชิก' },
  { id: 'employees', label: 'Employees & PIN', desc: 'จัดการพนักงานและกำหนด PIN' },
  { id: 'reports', label: 'Reports', desc: 'รายงานยอดขายและสถิติเชิงลึก' },
  { id: 'settings', label: 'Store Settings', desc: 'ตั้งค่าข้อมูลและระบบของร้าน' },
]

export default function EmployeesManagement() {
  const { store } = useStore()
  const { language } = useLanguage()
  const english = language === 'en'
  const qc = useQueryClient()
  const themeColor = (store as any)?.theme_color || '#F97316'

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [isPinTestOpen, setIsPinTestOpen] = useState(false)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Fetch Employees from DB
  const { data: employees = [], isLoading, isFetching } = useQuery<Employee[]>({
    queryKey: ['store-employees', store.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_members')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: true })

      if (error) {
        console.warn('Query store_members error:', error)
        return []
      }
      return data || []
    }
  })

  // Insert / Update Mutation
  const saveEmployee = useMutation({
    mutationFn: async (payload: {
      id?: string
      full_name: string
      role: string
      pin_code: string
      phone?: string
      status: string
      permissions: string[]
    }) => {
      const values: any = {
        store_id: store.id,
        role: payload.role,
        status: payload.status,
        pin_code: payload.pin_code,
        full_name: payload.full_name,
        phone: payload.phone || null,
        permissions: payload.permissions
      }

      if (payload.id) {
        // Try update with new fields, fallback if columns not ready
        const { data, error } = await supabase
          .from('store_members')
          .update(values)
          .eq('id', payload.id)
          .eq('store_id', store.id)
          .select()
          .single()

        if (error) {
          // Fallback update
          const basicValues = {
            role: payload.role,
            status: payload.status,
            pin_code: payload.pin_code
          }
          const { data: fallbackData, error: fbError } = await supabase
            .from('store_members')
            .update(basicValues)
            .eq('id', payload.id)
            .eq('store_id', store.id)
            .select()
            .single()
          if (fbError) throw fbError
          return fallbackData
        }
        return data
      } else {
        // Insert new employee (user_id is null for PIN staff)
        const insertPayload = {
          ...values,
          user_id: null
        }

        const { data, error } = await supabase
          .from('store_members')
          .insert(insertPayload)
          .select()
          .single()

        if (error) {
          // Fallback insert without extra columns
          const basicInsert = {
            store_id: store.id,
            user_id: null,
            role: payload.role,
            status: payload.status,
            pin_code: payload.pin_code
          }
          const { data: fbData, error: fbError } = await supabase
            .from('store_members')
            .insert(basicInsert)
            .select()
            .single()
          if (fbError) throw fbError
          return fbData
        }
        return data
      }

    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store-employees', store.id] })
      setIsModalOpen(false)
      setEditingEmployee(null)
      showToast('บันทึกข้อมูลพนักงานเรียบร้อยแล้ว')
    },
    onError: (err: any) => {
      alert(`เกิดข้อผิดพลาดในการบันทึก: ${err.message}`)
    }
  })

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('store_members')
        .delete()
        .eq('id', id)
        .eq('store_id', store.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store-employees', store.id] })
      setDeleteConfirmId(null)
      showToast('ลบพนักงานสำเร็จ')
    },
    onError: (err: any) => {
      alert(`ไม่สามารถลบได้: ${err.message}`)
    }
  })

  // Filter & Search Logic
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Role filter
      if (selectedRoleFilter !== 'all' && emp.role !== selectedRoleFilter) {
        return false
      }
      // Status filter
      if (selectedStatusFilter !== 'all' && emp.status !== selectedStatusFilter) {
        return false
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const name = (emp.full_name || emp.name || '').toLowerCase()
        const role = (emp.role || '').toLowerCase()
        const roleLabel = (ROLE_CONFIG[emp.role]?.label || '').toLowerCase()
        const phone = (emp.phone || '').toLowerCase()
        const pin = (emp.pin_code || '').toLowerCase()
        const userId = (emp.user_id || '').toLowerCase()
        return (
          name.includes(q) ||
          role.includes(q) ||
          roleLabel.includes(q) ||
          phone.includes(q) ||
          pin.includes(q) ||
          userId.includes(q)
        )
      }
      return true
    })
  }, [employees, selectedRoleFilter, selectedStatusFilter, searchQuery])

  // Count stats
  const stats = useMemo(() => {
    const total = employees.length
    const active = employees.filter(e => e.status === 'active').length
    const owners = employees.filter(e => e.role === 'owner' || e.role === 'manager').length
    const cashiers = employees.filter(e => e.role === 'cashier').length
    const kitchen = employees.filter(e => e.role === 'kitchen').length
    const waiters = employees.filter(e => e.role === 'waiter').length
    const riders = employees.filter(e => e.role === 'rider').length
    const withPin = employees.filter(e => Boolean(e.pin_code)).length

    return { total, active, owners, cashiers, kitchen, waiters, riders, withPin }
  }, [employees])

  const togglePinReveal = (id: string) => {
    setRevealedPins(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const copyPin = (pin: string, id: string) => {
    if (!pin) return
    navigator.clipboard.writeText(pin)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    showToast(`คัดลอก PIN: ${pin} แล้ว`)
  }

  const handleActiveStaffSwitch = (emp: Employee) => {
    localStorage.setItem(`active_staff_${store.id}`, JSON.stringify({
      id: emp.id,
      name: emp.full_name || emp.role,
      role: emp.role,
      pin: emp.pin_code,
      permissions: emp.permissions || ROLE_CONFIG[emp.role]?.defaultPermissions || []
    }))
    window.dispatchEvent(new Event('staff-changed'))
    showToast(`สลับใช้งานเป็น: ${emp.full_name || ROLE_CONFIG[emp.role]?.label} สำเร็จ`)
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white shadow-2xl animate-fade-in dark:bg-white dark:text-zinc-950">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
              className="grid size-9 place-items-center rounded-xl font-bold"
            >
              <KeyRound size={18} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-orange-500">
                Staff & Access Control
              </p>
              <h1 className="text-2xl font-black text-zinc-950 dark:text-white sm:text-3xl">
                {english ? 'Employee & PIN management' : 'จัดการพนักงานและระบบ PIN'}
              </h1>
            </div>
          </div>
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            {english ? 'Create employee accounts, assign PINs for POS access, and manage permissions by role.' : 'สร้างบัญชีพนักงาน กำหนดรหัส PIN สำหรับปลดล็อคเครื่อง POS และเลือกแสดงสิทธิ์ตามแต่ละตำแหน่ง'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsPinTestOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-bold text-zinc-700 shadow-xs transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
          >
            <Lock size={15} className="text-orange-500" />
            <span>{english ? 'Test PIN' : 'ทดสอบกด PIN'}</span>
          </button>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-bold text-zinc-700 shadow-xs transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
          >
            <Printer size={15} className="text-blue-500" />
            <span>{english ? 'Print PIN cards' : 'พิมพ์การ์ด PIN'}</span>
          </button>

          <button
            onClick={() => {
              setEditingEmployee(null)
              setIsModalOpen(true)
            }}
            style={{ backgroundColor: themeColor }}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:brightness-95 cursor-pointer active:scale-95"
          >
            <UserPlus size={16} />
            <span>{english ? 'Add employee' : 'เพิ่มพนักงานใหม่'}</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">{english ? 'All employees' : 'พนักงานทั้งหมด'}</span>
            <Users size={16} />
          </div>
          <p className="mt-2 text-2xl font-black text-zinc-900 dark:text-white">{stats.total}</p>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{english ? `${stats.active} active` : `ใช้งาน ${stats.active} คน`}</span>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-purple-500">
            <span className="text-xs font-medium">{english ? 'Owner / manager' : 'เจ้าของ/ผู้จัดการ'}</span>
            <ShieldCheck size={16} />
          </div>
          <p className="mt-2 text-2xl font-black text-purple-600 dark:text-purple-400">{stats.owners}</p>
          <span className="text-[10px] text-zinc-400">{english ? 'Full store access' : 'สิทธิ์ดูแลร้านเต็ม'}</span>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-emerald-500">
            <span className="text-xs font-medium">{english ? 'Cashier' : 'แคชเชียร์'}</span>
            <CircleDollarSign size={16} />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.cashiers}</p>
          <span className="text-[10px] text-zinc-400">{english ? 'Checkout / POS' : 'คิดเงิน / POS'}</span>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-amber-500">
            <span className="text-xs font-medium">{english ? 'Kitchen staff' : 'พนักงานครัว'}</span>
            <ChefHat size={16} />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">{stats.kitchen}</p>
          <span className="text-[10px] text-zinc-400">{english ? 'Kitchen KDS' : 'หน้าจอ KDS ครัว'}</span>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-cyan-500">
            <span className="text-xs font-medium">{english ? 'Service staff' : 'พนักงานเสิร์ฟ'}</span>
            <Utensils size={16} />
          </div>
          <p className="mt-2 text-2xl font-black text-cyan-600 dark:text-cyan-400">{stats.waiters}</p>
          <span className="text-[10px] text-zinc-400">{english ? 'Front of house / tables' : 'หน้าร้าน / โต๊ะ'}</span>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-orange-500">
            <span className="text-xs font-medium">{english ? 'Has PIN' : 'มีรหัส PIN'}</span>
            <KeyRound size={16} />
          </div>
          <p className="mt-2 text-2xl font-black text-orange-600 dark:text-orange-400">{stats.withPin}</p>
          <span className="text-[10px] text-zinc-400">{english ? 'Ready for POS sign-in' : 'พร้อมล็อคอิน POS'}</span>
        </div>
      </div>

      {/* Role Filter Bar ("เลือกแสดงได้") */}
      <div className="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
        {/* Top filter row: Role Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-zinc-400 mr-1">{english ? 'Show roles:' : 'เลือกแสดงโรล:'}</span>
            <button
              onClick={() => setSelectedRoleFilter('all')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                selectedRoleFilter === 'all'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              {english ? `All (${stats.total})` : `ทั้งหมด (${stats.total})`}
            </button>

            {Object.entries(ROLE_CONFIG).map(([key, cfg]) => {
              const count = employees.filter(e => e.role === key).length
              const Icon = cfg.icon
              const isSelected = selectedRoleFilter === key
              return (
                <button
                  key={key}
                  onClick={() => setSelectedRoleFilter(key)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    isSelected
                      ? `${cfg.badgeBg} shadow-xs`
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                  }`}
                >
                  <Icon size={13} />
                  <span>{english ? cfg.labelEn : cfg.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 rounded-xl border border-zinc-200 p-1 dark:border-zinc-700">
            <button
              onClick={() => setViewMode('grid')}
              className={`grid size-8 place-items-center rounded-lg text-xs transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
              title="แสดงแบบการ์ด"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`grid size-8 place-items-center rounded-lg text-xs transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
              title="แสดงแบบตาราง"
            >
              <List size={15} />
            </button>
          </div>
        </div>

        {/* Bottom filter row: Search & Status */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={english ? 'Search employee, role, phone, or PIN…' : 'ค้นหาชื่อพนักงาน, ตำแหน่ง, เบอร์โทร หรือรหัส PIN...'}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 py-2 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-orange-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-white dark:focus:bg-zinc-800"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-zinc-400 shrink-0">{english ? 'Status:' : 'สถานะ:'}</span>
            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-700 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              <option value="all">{english ? 'All statuses' : 'สถานะทั้งหมด'}</option>
              <option value="active">{english ? '🟢 Active' : '🟢 ใช้งาน (Active)'}</option>
              <option value="inactive">{english ? '⚪ Inactive' : '⚪ พักงาน (Inactive)'}</option>
            </select>

            <button
              onClick={() => qc.invalidateQueries({ queryKey: ['store-employees', store.id] })}
              className="grid size-9 place-items-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 cursor-pointer"
              title={english ? 'Refresh data' : 'รีเฟรชข้อมูล'}
            >
              <RefreshCw size={14} className={isFetching ? 'animate-spin text-orange-500' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Employees Content: Grid or Table */}
      {isLoading ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white p-12 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
          <RefreshCw size={24} className="animate-spin text-orange-500" />
          <p className="text-xs font-bold">{english ? 'Loading employee data…' : 'กำลังโหลดข้อมูลพนักงาน…'}</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid size-14 place-items-center rounded-2xl bg-orange-50 text-orange-500 dark:bg-orange-950/40">
            <Users size={28} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              {searchQuery || selectedRoleFilter !== 'all' ? (english ? 'No employees match your filters' : 'ไม่พบพนักงานที่ตรงกับเงื่อนไขค้นหา') : (english ? 'No employee data yet' : 'ยังไม่มีข้อมูลพนักงาน')}
            </h3>
            <p className="mt-1 text-xs text-zinc-400">
              {searchQuery || selectedRoleFilter !== 'all' ? 'ลองล้างการค้นหาหรือเลือกโรลอื่น' : 'คลิกปุ่ม "เพิ่มพนักงานใหม่" เพื่อสร้างบัญชีและกำหนดรหัส PIN'}
            </p>
          </div>
          {(!searchQuery && selectedRoleFilter === 'all') && (
            <button
              onClick={() => {
                setEditingEmployee(null)
                setIsModalOpen(true)
              }}
              style={{ backgroundColor: themeColor }}
              className="mt-2 flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-md transition hover:brightness-95 cursor-pointer"
            >
              <UserPlus size={15} />
              <span>สร้างพนักงานคนแรก</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* ── GRID CARD VIEW ── */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredEmployees.map(emp => {
            const roleCfg = ROLE_CONFIG[emp.role] || ROLE_CONFIG.waiter
            const RoleIcon = roleCfg.icon
            const isRevealed = revealedPins[emp.id]
            const pinDisplay = emp.pin_code
              ? (isRevealed ? emp.pin_code : '••••')
              : 'ยังไม่ได้ตั้ง PIN'
            const permissions = emp.permissions || roleCfg.defaultPermissions

            return (
              <div
                key={emp.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                {/* Top Role Header */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        style={{ backgroundColor: `${roleCfg.color}15`, color: roleCfg.color }}
                        className="grid size-12 place-items-center rounded-2xl text-lg font-black shrink-0 border border-current/20"
                      >
                        <RoleIcon size={22} />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white line-clamp-1">
                          {emp.full_name || emp.name || (emp.role === 'owner' ? 'เจ้าของร้าน (หลัก)' : `พนักงาน #${emp.id.slice(0, 6)}`)}
                        </h3>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black border ${roleCfg.bgLight}`}>
                            <RoleIcon size={10} />
                            {roleCfg.label}
                          </span>
                          <span className={`size-1.5 rounded-full ${emp.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Phone & ID */}
                  <div className="mt-4 space-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {emp.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={12} className="text-zinc-400" />
                        <span>{emp.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* PIN Card Box */}
                  <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
                        <KeyRound size={12} className="text-orange-500" />
                        รหัส PIN เข้าใช้งาน
                      </span>
                      <button
                        onClick={() => togglePinReveal(emp.id)}
                        className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                        title={isRevealed ? 'ซ่อน PIN' : 'ดู PIN'}
                      >
                        {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between">
                      <span className={`font-mono text-base font-black tracking-widest ${emp.pin_code ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 text-xs tracking-normal'}`}>
                        {pinDisplay}
                      </span>
                      {emp.pin_code && (
                        <button
                          onClick={() => copyPin(emp.pin_code!, emp.id)}
                          className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-zinc-600 shadow-xs border border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-200 cursor-pointer"
                        >
                          {copiedId === emp.id ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                          <span>{copiedId === emp.id ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Permissions Pills */}
                  <div className="mt-3">
                    <p className="text-[10px] font-bold text-zinc-400 mb-1">สิทธิ์ที่เปิดให้เข้าถึง ({permissions.length} เมนู):</p>
                    <div className="flex flex-wrap gap-1">
                      {permissions.slice(0, 4).map(perm => (
                        <span key={perm} className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          {perm}
                        </span>
                      ))}
                      {permissions.length > 4 && (
                        <span className="rounded-md bg-orange-50 px-1.5 py-0.5 text-[9px] font-bold text-orange-600 dark:bg-orange-950/50 dark:text-orange-300">
                          +{permissions.length - 4} เพิ่มเติม
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <button
                    onClick={() => handleActiveStaffSwitch(emp)}
                    className="flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 cursor-pointer"
                    title="สลับใช้งาน POS ในนามพนักงานคนนี้"
                  >
                    <Sparkles size={12} />
                    <span>สลับใช้โรลนี้</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingEmployee(emp)
                        setIsModalOpen(true)
                      }}
                      className="grid size-8 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                      title="แก้ไขข้อมูล"
                    >
                      <Edit3 size={14} />
                    </button>
                    {emp.role !== 'owner' && (
                      <button
                        onClick={() => setDeleteConfirmId(emp.id)}
                        className="grid size-8 place-items-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 cursor-pointer"
                        title="ลบพนักงาน"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── TABLE VIEW ── */
        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="border-b border-zinc-100 bg-zinc-50/70 text-[11px] uppercase tracking-wider text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-5 py-3.5 font-bold">พนักงาน / ชื่อ</th>
                  <th className="px-5 py-3.5 font-bold">ตำแหน่ง (Role)</th>
                  <th className="px-5 py-3.5 font-bold">รหัส PIN</th>
                  <th className="px-5 py-3.5 font-bold">สิทธิ์ที่เปิด</th>
                  <th className="px-5 py-3.5 font-bold">สถานะ</th>
                  <th className="px-5 py-3.5 text-right font-bold">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredEmployees.map(emp => {
                  const roleCfg = ROLE_CONFIG[emp.role] || ROLE_CONFIG.waiter
                  const RoleIcon = roleCfg.icon
                  const isRevealed = revealedPins[emp.id]
                  const pinDisplay = emp.pin_code
                    ? (isRevealed ? emp.pin_code : '••••')
                    : '—'
                  const permissions = emp.permissions || roleCfg.defaultPermissions

                  return (
                    <tr key={emp.id} className="hover:bg-orange-50/20 dark:hover:bg-zinc-800/40 transition">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            style={{ backgroundColor: `${roleCfg.color}15`, color: roleCfg.color }}
                            className="grid size-9 place-items-center rounded-xl font-bold shrink-0 border border-current/20"
                          >
                            <RoleIcon size={16} />
                          </div>
                          <div>
                            <p className="font-bold text-zinc-900 dark:text-white">
                              {emp.full_name || emp.name || (emp.role === 'owner' ? 'เจ้าของร้าน (หลัก)' : `พนักงาน #${emp.id.slice(0, 6)}`)}
                            </p>
                            <p className="text-[11px] text-zinc-400">{emp.phone || 'ไม่มีเบอร์โทร'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-black border ${roleCfg.bgLight}`}>
                          <RoleIcon size={12} />
                          {roleCfg.label}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-black text-zinc-800 dark:text-zinc-200">
                            {pinDisplay}
                          </span>
                          {emp.pin_code && (
                            <button
                              onClick={() => togglePinReveal(emp.id)}
                              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                              title={isRevealed ? 'ซ่อน PIN' : 'ดู PIN'}
                            >
                              {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {permissions.slice(0, 3).map(p => (
                            <span key={p} className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                              {p}
                            </span>
                          ))}
                          {permissions.length > 3 && (
                            <span className="rounded bg-zinc-100 px-1 py-0.5 text-[9px] font-bold text-zinc-400 dark:bg-zinc-800">
                              +{permissions.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          emp.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                          <span className={`size-1.5 rounded-full ${emp.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                          {emp.status === 'active' ? 'ใช้งาน' : 'พักงาน'}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleActiveStaffSwitch(emp)}
                            className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40 cursor-pointer"
                          >
                            สลับโรล
                          </button>
                          <button
                            onClick={() => {
                              setEditingEmployee(emp)
                              setIsModalOpen(true)
                            }}
                            className="grid size-8 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                          >
                            <Edit3 size={14} />
                          </button>
                          {emp.role !== 'owner' && (
                            <button
                              onClick={() => setDeleteConfirmId(emp.id)}
                              className="grid size-8 place-items-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT EMPLOYEE MODAL ── */}
      {isModalOpen && (
        <EmployeeFormModal
          employee={editingEmployee}
          themeColor={themeColor}
          onClose={() => {
            setIsModalOpen(false)
            setEditingEmployee(null)
          }}
          onSave={data => saveEmployee.mutate(data)}
          isPending={saveEmployee.isPending}
        />
      )}

      {/* ── PIN TEST & QUICK SWITCH MODAL ── */}
      {isPinTestOpen && (
        <PinTestModal
          employees={employees}
          themeColor={themeColor}
          onClose={() => setIsPinTestOpen(false)}
          onSelectStaff={handleActiveStaffSwitch}
        />
      )}

      {/* ── PRINT PIN BADGES MODAL ── */}
      {isPrintModalOpen && (
        <PrintPinCardsModal
          employees={employees}
          storeName={store.name}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="grid size-12 place-items-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400 mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="text-center">
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">ยืนยันการลบพนักงาน?</h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                พนักงานคนนี้จะไม่สามารถใช้ PIN เพื่อเข้าสู่ระบบ POS ได้อีกต่อไป
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'กำลังลบ…' : 'ยืนยันลบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── EMPLOYEE FORM MODAL ───────────────────────────────────────────────────
interface EmployeeFormModalProps {
  employee: Employee | null
  themeColor: string
  onClose: () => void
  onSave: (data: any) => void
  isPending: boolean
}

function EmployeeFormModal({ employee, themeColor, onClose, onSave, isPending }: EmployeeFormModalProps) {
  const [fullName, setFullName] = useState(employee?.full_name || employee?.name || '')
  const [role, setRole] = useState(employee?.role || 'cashier')
  const [pinCode, setPinCode] = useState(employee?.pin_code || '')
  const [phone, setPhone] = useState(employee?.phone || '')
  const [status, setStatus] = useState(employee?.status || 'active')
  const [permissions, setPermissions] = useState<string[]>(() => {
    if (employee?.permissions && employee.permissions.length > 0) return employee.permissions
    return ROLE_CONFIG[employee?.role || 'cashier']?.defaultPermissions || []
  })

  // When role changes, update default permissions if user hasn't heavily customized
  const handleRoleChange = (newRole: string) => {
    setRole(newRole as any)
    setPermissions(ROLE_CONFIG[newRole]?.defaultPermissions || [])
  }

  const generateRandomPin = () => {
    const random = Math.floor(1000 + Math.random() * 9000).toString()
    setPinCode(random)
  }

  const togglePermission = (permId: string) => {
    if (permissions.includes(permId)) {
      setPermissions(permissions.filter(p => p !== permId))
    } else {
      setPermissions([...permissions, permId])
    }
  }

  const selectAllPermissions = () => {
    setPermissions(ALL_PERMISSIONS.map(p => p.id))
  }

  const resetRolePermissions = () => {
    setPermissions(ROLE_CONFIG[role]?.defaultPermissions || [])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) {
      alert('กรุณากรอกชื่อพนักงาน')
      return
    }
    if (!/^\d{4,6}$/.test(pinCode)) {
      alert('รหัส PIN ต้องเป็นตัวเลข 4–6 หลักเท่านั้น')
      return
    }

    onSave({
      id: employee?.id,
      full_name: fullName.trim(),
      role,
      pin_code: pinCode.trim(),
      phone: phone.trim(),
      status,
      permissions
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-5 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
              className="grid size-10 place-items-center rounded-xl font-bold"
            >
              {employee ? <Edit3 size={20} /> : <UserPlus size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-900 dark:text-white">
                {employee ? 'แก้ไขข้อมูลพนักงาน & PIN' : 'เพิ่มพนักงานใหม่'}
              </h2>
              <p className="text-xs text-zinc-400">
                กรอกข้อมูลพนักงาน กำหนดรหัส PIN 4-6 หลัก และเลือกสิทธิ์เข้าถึงเมนูต่างๆ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Name & Phone */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                ชื่อ-นามสกุล หรือชื่อเล่นพนักงาน <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="เช่น เมย์ (แคชเชียร์), เชฟเอิร์ธ"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-orange-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                เบอร์โทรศัพท์ (ถ้ามี)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="เช่น 081-234-5678"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-orange-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>
          </div>

          {/* Row 2: Role Selection */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
              ตำแหน่ง / บทบาท (Role) <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(ROLE_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon
                const isSelected = role === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleRoleChange(key)}
                    style={isSelected ? { borderColor: cfg.color } : {}}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? `${cfg.bgLight} border-2 shadow-xs`
                        : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={16} style={{ color: cfg.color }} />
                      <span className="font-extrabold text-xs">{cfg.label}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 mt-1 line-clamp-1">{cfg.labelEn}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Row 3: PIN Code Setup */}
          <div className="rounded-2xl border border-orange-200/80 bg-orange-50/40 p-4 dark:border-orange-950/80 dark:bg-orange-950/20">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-black text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <KeyRound size={14} className="text-orange-500" />
                  รหัส PIN ประจำตัว (4-6 หลัก) <span className="text-red-500">*</span>
                </label>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  ใช้สำหรับกดเข้าใช้งานหน้า POS, ปลดล็อคห้องครัว และสลับโรลในระบบ
                </p>
              </div>
              <button
                type="button"
                onClick={generateRandomPin}
                className="flex items-center gap-1.5 rounded-xl bg-white border border-orange-200 px-3 py-1.5 text-xs font-bold text-orange-600 shadow-xs hover:bg-orange-50 dark:bg-zinc-800 dark:border-orange-900 dark:text-orange-400 cursor-pointer"
              >
                <Dices size={14} />
                <span>สุ่มรหัส PIN</span>
              </button>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <input
                type="text"
                pattern="[0-9]*"
                maxLength={6}
                required
                value={pinCode}
                onChange={e => setPinCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="เช่น 1234"
                className="w-48 rounded-xl border border-orange-300 bg-white px-4 py-2.5 text-center font-mono text-lg font-black tracking-widest text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-orange-800 dark:bg-zinc-800 dark:text-white"
              />
              <span className="text-xs text-zinc-400">
                {/^\d{4,6}$/.test(pinCode) ? '✅ รหัส PIN พร้อมใช้งาน' : '⚠️ ระบุตัวเลข 4–6 หลัก'}
              </span>
            </div>
          </div>

          {/* Row 4: Custom Permissions Matrix ("สามารถเลือกแสดงได้") */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Shield size={14} className="text-blue-500" />
                  กำหนดสิทธิ์เมนูที่เลือกแสดงให้พนักงานคนนี้
                </label>
                <p className="text-[11px] text-zinc-400">
                  เลือกเมนูที่พนักงานตำแหน่งนี้สามารถมองเห็นและเข้าใช้งานได้
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetRolePermissions}
                  className="text-[11px] font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                >
                  คืนค่าตามตำแหน่ง
                </button>
                <span className="text-zinc-300">|</span>
                <button
                  type="button"
                  onClick={selectAllPermissions}
                  className="text-[11px] font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
                >
                  เลือกทั้งหมด
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/40">
              {ALL_PERMISSIONS.map(p => {
                const isChecked = permissions.includes(p.id)
                return (
                  <label
                    key={p.id}
                    className={`flex items-start gap-2 p-2 rounded-lg border text-left cursor-pointer transition ${
                      isChecked
                        ? 'border-orange-300 bg-orange-50/50 dark:border-orange-900/60 dark:bg-orange-950/30'
                        : 'border-transparent bg-white dark:bg-zinc-800/80 hover:bg-zinc-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => togglePermission(p.id)}
                      className="mt-0.5 rounded text-orange-500 focus:ring-orange-400"
                    />
                    <div>
                      <span className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {p.label}
                      </span>
                      <span className="text-[10px] text-zinc-400 leading-tight">
                        {p.desc}
                      </span>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Status Selection */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">สถานะการทำงาน:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStatus('active')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  status === 'active'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                🟢 ใช้งาน (Active)
              </button>
              <button
                type="button"
                onClick={() => setStatus('inactive')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  status === 'inactive'
                    ? 'bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                ⚪ พักงาน (Inactive)
              </button>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isPending}
              style={{ backgroundColor: themeColor }}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-md hover:brightness-95 cursor-pointer disabled:opacity-50"
            >
              {isPending ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
              <span>{isPending ? 'กำลังบันทึก…' : 'บันทึกพนักงาน'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── PIN TEST & QUICK SWITCH KEYPAD MODAL ──────────────────────────────────
function PinTestModal({ employees, themeColor, onClose, onSelectStaff }: {
  employees: Employee[]
  themeColor: string
  onClose: () => void
  onSelectStaff: (emp: Employee) => void
}) {
  const [pin, setPin] = useState('')
  const [matchedStaff, setMatchedStaff] = useState<Employee | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const handleKeyClick = (key: string) => {
    if (key === 'C') {
      setPin('')
      setMatchedStaff(null)
      setErrorMsg('')
    } else if (key === 'DEL') {
      setPin(prev => prev.slice(0, -1))
      setMatchedStaff(null)
      setErrorMsg('')
    } else {
      if (pin.length < 4) {
        const nextPin = pin + key
        setPin(nextPin)
        if (nextPin.length === 4) checkPin(nextPin)
      }
    }
  }

  const checkPin = (code: string) => {
    if (code.length === 4) {
      const found = employees.find(e => e.pin_code === code && e.status === 'active')
      if (found) {
        setMatchedStaff(found)
        setErrorMsg('')
      } else {
        setMatchedStaff(null)
        setErrorMsg('ไม่พบรหัส PIN นี้ หรือพนักงานถูกพักงาน')
      }
    } else {
      setMatchedStaff(null)
      setErrorMsg('')
    }
  }

  const handleLogin = () => {
    if (matchedStaff) {
      onSelectStaff(matchedStaff)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/50">
              <KeyRound size={16} />
            </span>
            <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white">
              ทดสอบกด PIN สลับพนักงาน
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600">✕</button>
        </div>

        {/* PIN Code Dots Display */}
        <div className="text-center py-2">
          <div className="flex justify-center items-center gap-3">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`size-4 rounded-full border-2 transition-all ${
                  pin.length > i
                    ? 'bg-orange-500 border-orange-500 scale-110 shadow-xs'
                    : 'border-zinc-300 dark:border-zinc-700 bg-transparent'
                }`}
              />
            ))}
          </div>
          <p className="mt-2 font-mono text-xs font-bold text-zinc-400">
            {pin ? `รหัสที่กด: ${pin}` : 'กดปุ่มตัวเลข 4 หลัก'}
          </p>
        </div>

        {/* Matched Staff Preview Card */}
        {matchedStaff ? (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50/70 p-3 text-center dark:border-emerald-900 dark:bg-emerald-950/40 animate-fade-in">
            <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-1" />
            <p className="text-xs font-black text-emerald-800 dark:text-emerald-200">
              {matchedStaff.full_name || ROLE_CONFIG[matchedStaff.role]?.label}
            </p>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              ตำแหน่ง: {ROLE_CONFIG[matchedStaff.role]?.label}
            </span>
            <button
              onClick={handleLogin}
              style={{ backgroundColor: themeColor }}
              className="mt-2.5 w-full rounded-xl py-2 text-xs font-bold text-white shadow-md hover:brightness-95 cursor-pointer"
            >
              ยืนยันเข้าใช้งานเป็นพนักงานคนนี้
            </button>
          </div>
        ) : errorMsg ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-2.5 text-center text-xs font-bold text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
            <AlertCircle size={14} className="inline mr-1" />
            {errorMsg}
          </div>
        ) : null}

        {/* Keypad Grid */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map(key => (
            <button
              key={key}
              type="button"
              onClick={() => handleKeyClick(key)}
              className={`h-12 rounded-2xl font-bold text-base transition cursor-pointer active:scale-95 flex items-center justify-center ${
                key === 'C'
                  ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400'
                  : key === 'DEL'
                  ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                  : 'bg-zinc-50 border border-zinc-200/80 text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700 shadow-xs'
              }`}
            >
              {key === 'DEL' ? '⌫' : key}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── PRINTABLE PIN BADGES MODAL ───────────────────────────────────────────
function PrintPinCardsModal({ employees, storeName, onClose }: {
  employees: Employee[]
  storeName: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4 my-8">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div>
            <h3 className="text-base font-black text-zinc-900 dark:text-white">
              พิมพ์การ์ดรหัส PIN พนักงาน (Staff PIN Cards)
            </h3>
            <p className="text-xs text-zinc-400">
              สำหรับพิมพ์แจกพนักงานหรือติดประจำจุดแคชเชียร์ / ครัว
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 cursor-pointer"
            >
              <Printer size={14} />
              <span>สั่งพิมพ์การ์ด</span>
            </button>
            <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600">✕</button>
          </div>
        </div>

        {/* Printable Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-2 print:grid-cols-2">
          {employees.map(emp => {
            const roleCfg = ROLE_CONFIG[emp.role] || ROLE_CONFIG.waiter
            const RoleIcon = roleCfg.icon
            return (
              <div
                key={emp.id}
                className="rounded-2xl border-2 border-dashed border-zinc-300 p-4 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/40 text-center space-y-2"
              >
                <div className="flex items-center justify-between text-[10px] text-zinc-400 border-b border-zinc-200 pb-2 dark:border-zinc-700">
                  <span className="font-bold">{storeName}</span>
                  <span>STAFF PIN CARD</span>
                </div>
                <div className="pt-2">
                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black border ${roleCfg.bgLight}`}>
                    <RoleIcon size={11} />
                    {roleCfg.label}
                  </span>
                  <h4 className="mt-1 text-base font-black text-zinc-900 dark:text-white">
                    {emp.full_name || emp.name || `พนักงาน #${emp.id.slice(0, 6)}`}
                  </h4>
                </div>
                <div className="rounded-xl bg-white p-3 shadow-xs border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700">
                  <span className="text-[10px] font-bold text-zinc-400 block">รหัส PIN ปลดล็อค</span>
                  <span className="font-mono text-2xl font-black tracking-widest text-orange-600 dark:text-orange-400">
                    {emp.pin_code || '----'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
