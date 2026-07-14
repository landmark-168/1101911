import { supabase } from './supabase'

const thaiMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

export const formatStore = row => ({
  id: row.id,
  code: `SP-${row.id.slice(0, 6).toUpperCase()}`,
  name: row.name,
  owner: row.profiles?.full_name || row.email,
  email: row.email,
  phone: row.phone,
  package: row.package,
  status: row.status,
  province: row.province,
  address: row.address,
  created: new Intl.DateTimeFormat('th-TH', { day:'numeric', month:'short', year:'numeric' }).format(new Date(row.created_at)),
  createdAt: row.created_at,
})

export async function fetchStores() {
  const { data, error } = await supabase.from('shops').select('*, profiles!shops_owner_id_fkey(full_name)').order('created_at', { ascending:false })
  if (error) throw error
  return data.map(formatStore)
}

export async function updateStoreStatus(id, status) {
  const { error } = await supabase.from('shops').update({ status, updated_at:new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deleteStore(id) {
  const { error } = await supabase.from('shops').delete().eq('id', id)
  if (error) throw error
}

export async function fetchAdminDashboard(year = new Date().getFullYear()) {
  const [{ data:stats, error:statsError }, { data:revenues, error:revenueError }, { data:newStores, error:storesError }, { data:recent, error:recentError }] = await Promise.all([
    supabase.rpc('admin_dashboard_stats'),
    supabase.rpc('admin_monthly_revenue', { report_year:year }),
    supabase.rpc('admin_monthly_stores', { report_year:year }),
    supabase.from('shops').select('*, profiles!shops_owner_id_fkey(full_name)').order('created_at', { ascending:false }).limit(5),
  ])
  const error = statsError || revenueError || storesError || recentError
  if (error) throw error
  const revenueByMonth = new Map((revenues || []).map(x => [x.month, Number(x.revenue)]))
  const storesByMonth = new Map((newStores || []).map(x => [x.month, Number(x.stores)]))
  return {
    stats: stats || { stores:0, pending_stores:0, users:0, subscriptions:0, revenue:0 },
    revenue: thaiMonths.map((month,i) => ({ month, revenue:revenueByMonth.get(i+1) || 0 })),
    newStores: thaiMonths.map((month,i) => ({ month, stores:storesByMonth.get(i+1) || 0 })).slice(-6),
    recent: (recent || []).map(formatStore),
  }
}

export async function requireSession() {
  const { data:{ session } } = await supabase.auth.getSession()
  return session
}

export async function getCurrentProfile() {
  const session = await requireSession()
  if (!session) return { session:null, profile:null }
  const { data:profile, error } = await supabase.from('profiles').select('id,email,full_name,role').eq('id', session.user.id).maybeSingle()
  if (error) throw error
  return { session, profile }
}

export async function requireSuperAdmin() {
  const { session, profile } = await getCurrentProfile()
  return { session, profile, allowed:profile?.role === 'super_admin' }
}
