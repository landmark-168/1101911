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
  latitude: row.latitude,
  longitude: row.longitude,
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

export async function updateStore(id, changes) {
  const allowed = { name:changes.name?.trim(), package:changes.package }
  const { data, error } = await supabase.from('shops').update({ ...allowed, updated_at:new Date().toISOString() }).eq('id', id).select().single()
  if (error) throw error
  return data
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
  const allStoreMonths = thaiMonths.map((month,i) => ({ month, stores:storesByMonth.get(i+1) || 0 }))
  const currentMonthIndex = year === new Date().getFullYear() ? new Date().getMonth() : 11
  const sixMonthStart = Math.max(0, currentMonthIndex - 5)
  return {
    stats: stats || { stores:0, pending_stores:0, users:0, subscriptions:0, revenue:0 },
    revenue: thaiMonths.map((month,i) => ({ month, revenue:revenueByMonth.get(i+1) || 0 })),
    newStores: allStoreMonths.slice(sixMonthStart, currentMonthIndex + 1),
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

export async function signOut() {
  await supabase.auth.signOut()
  window.location.replace('/login')
}

export async function fetchCurrentUserSummary() {
  const { session, profile } = await getCurrentProfile()
  if (!session || !profile) return null
  const { data:shop, error } = await supabase.from('shops').select('id,name,package,subscriptions(id,package,billing_cycle,amount,status,starts_at,ends_at)').eq('owner_id', session.user.id).order('created_at', { ascending:true }).limit(1).maybeSingle()
  if (error) throw error
  const subscription = shop?.subscriptions?.find(item => ['trialing','active'].includes(item.status)) || null
  return { user:session.user, profile, shop, subscription }
}

export async function selectSubscriptionPlan({ packageName, billingCycle, amount }) {
  const summary = await fetchCurrentUserSummary()
  if (!summary?.shop) throw new Error('ไม่พบข้อมูลร้านค้าของบัญชีนี้')
  const existing = summary.subscription
  const payload = { shop_id:summary.shop.id, package:packageName, billing_cycle:billingCycle, amount, status:existing?.status === 'active' ? 'active' : 'trialing' }
  let result
  if (existing) result = await supabase.from('subscriptions').update(payload).eq('shop_id', summary.shop.id).eq('id', existing.id).select().single()
  else result = await supabase.from('subscriptions').insert({ ...payload, starts_at:new Date().toISOString(), ends_at:new Date(Date.now()+14*86400000).toISOString() }).select().single()
  if (result.error) throw result.error
  const { error:shopError } = await supabase.from('shops').update({ package:packageName, updated_at:new Date().toISOString() }).eq('id', summary.shop.id)
  if (shopError) throw shopError
  return result.data
}

export async function fetchPackages() {
  const { data,error }=await supabase.from('packages').select('*').order('monthly_price')
  if(error)throw error
  return data
}

export async function fetchPackageByName(name) {
  const {data,error}=await supabase.from('packages').select('*').eq('name',name).eq('status','active').maybeSingle()
  if(error)throw error
  return data
}

export async function savePackage(values,id=null) {
  const payload={name:values.name.trim(),slug:values.slug.trim().toLowerCase().replace(/\s+/g,'-'),description:values.description.trim(),monthly_price:Number(values.monthly_price),yearly_price:Number(values.yearly_price),features:values.features,status:values.status,duration_days:Number(values.duration_days),updated_at:new Date().toISOString()}
  const query=id?supabase.from('packages').update(payload).eq('id',id):supabase.from('packages').insert(payload)
  const {data,error}=await query.select().single();if(error)throw error;return data
}

export async function removePackage(id) {
  const {error}=await supabase.from('packages').delete().eq('id',id);if(error)throw error
}

export async function fetchAnalytics(year=new Date().getFullYear()) {
  const [{data:payments,error:paymentError},{data:subscriptions,error:subscriptionError},{data:shops,error:shopError}]=await Promise.all([
    supabase.from('payments').select('amount,status,paid_at,created_at').eq('status','paid'),
    supabase.from('subscriptions').select('package,status,created_at'),
    supabase.from('shops').select('package,status,created_at'),
  ])
  const error=paymentError||subscriptionError||shopError;if(error)throw error
  const months=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
  const monthly=months.map((month,index)=>({month,revenue:0,stores:0}))
  payments.forEach(p=>{const date=new Date(p.paid_at||p.created_at);if(date.getFullYear()===year)monthly[date.getMonth()].revenue+=Number(p.amount)})
  shops.forEach(s=>{const date=new Date(s.created_at);if(date.getFullYear()===year)monthly[date.getMonth()].stores+=1})
  const subscriptionMap={};subscriptions.forEach(s=>{subscriptionMap[s.status]=(subscriptionMap[s.status]||0)+1})
  const packageMap={};shops.forEach(s=>{packageMap[s.package]=(packageMap[s.package]||0)+1})
  return {monthly,subscriptions:Object.entries(subscriptionMap).map(([name,value])=>({name,value})),packages:Object.entries(packageMap).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value),totals:{revenue:payments.reduce((sum,p)=>sum+Number(p.amount),0),subscriptions:subscriptions.filter(s=>['active','trialing'].includes(s.status)).length,stores:shops.length,activeStores:shops.filter(s=>s.status==='Active').length}}
}

export async function fetchSettings() {
  const {data,error}=await supabase.from('app_settings').select('*').eq('id','global').single()
  if(error) {
    if (error.code === 'PGRST205' || error.message?.includes("app_settings")) throw new Error('ยังไม่มีตาราง app_settings — กรุณารันไฟล์ migration 20260715060000_app_settings.sql ใน Supabase SQL Editor แล้วรีเฟรชหน้านี้')
    throw error
  }
  return data
}

export async function fetchPublicSettings() {
  const { data, error } = await supabase.rpc('get_public_app_settings')
  if (error) {
    try { return JSON.parse(localStorage.getItem('smartpos_public_settings') || 'null') } catch { return null }
  }
  return data
}

export async function saveSettings(settings) {
  const {data:{user}}=await supabase.auth.getUser()
  const payload={id:'global',general:settings.general,brand:settings.brand,payment:settings.payment,smtp:settings.smtp,line_oa:settings.line_oa,promptpay:settings.promptpay,domain:settings.domain,updated_by:user?.id,updated_at:new Date().toISOString()}
  const {data,error}=await supabase.from('app_settings').upsert(payload).select().single();if(error)throw error
  localStorage.setItem('smartpos_public_settings',JSON.stringify({general:data.general,brand:data.brand}))
  return data
}
