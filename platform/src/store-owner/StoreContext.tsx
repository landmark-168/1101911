import { createContext, useContext, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

type Store = { id: string; name: string; slug: string; logo_url?: string; status: string; owner_id: string }
const Context = createContext<{ store: Store; userId: string } | null>(null)

const slugify = (v: string) => v.toLowerCase().trim().replace(/[^a-z0-9ก-๙]+/g, '-').replace(/^-|-$/g, '')

export function StoreProvider({ children }: { children: ReactNode }) {
  const rawRequested = typeof window !== 'undefined' ? (window.location.pathname.split('/')[2] || '') : ''
  const requested = decodeURIComponent(rawRequested)

  const query = useQuery({
    queryKey: ['store-access', requested],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('AUTH_REQUIRED')

      let q = supabase.from('shops').select('id,name,slug,logo_url,status,owner_id').limit(1)
      q = requested && requested !== 'my-store'
        ? q.or(`slug.eq.${requested},slug.eq.${rawRequested}`)
        : q.eq('owner_id', user.id).order('created_at', { ascending: true })

      let { data: store, error } = await q.maybeSingle()
      if (error) throw error

      if (!store) {
        const { data: m, error: e } = await supabase
          .from('store_members')
          .select('store_id,shops(id,name,slug,logo_url,status,owner_id)')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle()
        if (e) throw e
        store = m?.shops as any
      }

      if (!store) throw new Error('STORE_NOT_FOUND')
      if (store.status !== 'Active') throw new Error('STORE_PENDING')

      const { data: subs } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .limit(1)

      if (!subs || subs.length === 0) throw new Error('SUBSCRIPTION_REQUIRED')

      if (!store.slug) {
        const slug = `${slugify(store.name) || 'store'}-${store.id.slice(0, 6)}`
        const { data, error: e } = await supabase
          .from('shops')
          .update({ slug })
          .eq('id', store.id)
          .select('id,name,slug,logo_url,status,owner_id')
          .single()
        if (e) throw e
        store = data
      }

      // Fetch store_settings to get theme_color
      const { data: setts } = await supabase
        .from('store_settings')
        .select('theme_color')
        .eq('store_id', store.id)
        .maybeSingle()

      const themeColor = setts?.theme_color || '#F97316'
      store.theme_color = themeColor

      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--brand-color', themeColor)
        document.documentElement.style.setProperty('--brand-color-dark', themeColor)
        document.documentElement.style.setProperty('--color-ember', themeColor)
        document.documentElement.style.setProperty('--color-deep', themeColor)
        let metaTheme = document.querySelector('meta[name="theme-color"]')
        if (metaTheme) metaTheme.setAttribute('content', themeColor)
      }

      return { store: store as Store, userId: user.id }
    },
    retry: false
  })

  if (query.isPending) {
    return (
      <div className="grid min-h-screen place-items-center bg-zinc-950 text-sm font-bold text-white">
        กำลังตรวจสอบสิทธิ์ร้าน…
      </div>
    )
  }

  if (query.error) {
    const err = (query.error as Error).message
    if (err === 'AUTH_REQUIRED') {
      window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`)
      return null
    }
    if (err === 'SUBSCRIPTION_REQUIRED') {
      window.location.replace('/pricing')
      return null
    }
    if (err === 'STORE_PENDING') {
      return (
        <div className="grid min-h-screen place-items-center bg-zinc-950 p-6 text-center text-white">
          <div>
            <span className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-amber-500/20 text-3xl">⏳</span>
            <h1 className="text-xl font-black">ร้านค้าอยู่ระหว่างการอนุมัติ</h1>
            <p className="mt-2 max-w-sm text-sm text-zinc-400">
              กรุณารอทีมงานตรวจสอบข้อมูลและอนุมัติร้านค้าของคุณ สถานะจะอัปเดตเมื่อการตรวจสอบเสร็จสิ้น
            </p>
            <a href="/" className="mt-6 inline-block rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-bold transition hover:bg-zinc-700">
              กลับหน้าหลัก
            </a>
          </div>
        </div>
      )
    }
    return (
      <div className="grid min-h-screen place-items-center bg-zinc-950 p-6 text-center text-white">
        <div>
          <h1 className="text-xl font-black">ไม่สามารถเปิดร้านนี้ได้</h1>
          <p className="mt-2 text-sm text-zinc-400">ไม่พบร้าน หรือบัญชีนี้ไม่มีสิทธิ์เข้าถึง ({err})</p>
          <a href="/" className="mt-5 inline-block rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold">
            กลับหน้า Platform
          </a>
        </div>
      </div>
    )
  }

  return <Context.Provider value={query.data}>{children}</Context.Provider>
}

export const useStore = () => {
  const v = useContext(Context)
  if (!v) throw new Error('Missing StoreProvider')
  return v
}
