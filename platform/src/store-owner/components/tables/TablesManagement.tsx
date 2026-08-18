import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Trash2, QrCode, Power, PowerOff, RefreshCw } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useStore } from '../../StoreContext'
import { PageHeader, Panel } from '../PageKit'

export default function TablesManagement() {
  const { store } = useStore()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const key = ['store_tables', store.id]

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_tables')
        .select('*')
        .eq('store_id', store.id)
        .order('table_number', { ascending: true })
      if (error) throw error
      return data || []
    }
  })

  const rows = useMemo(() => 
    (query.data || []).filter((x: any) => x.table_number.toLowerCase().includes(search.toLowerCase())),
    [query.data, search]
  )

  const add = useMutation({
    mutationFn: async () => {
      const name = prompt('กรอกหมายเลขโต๊ะ (เช่น T01, โต๊ะ 1)')
      if (!name) return
      const capacity = Number(prompt('จำนวนที่นั่ง (เช่น 2, 4)') || 2)
      const { error } = await supabase.from('store_tables').insert({
        store_id: store.id,
        table_number: name.trim(),
        capacity: capacity
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: e => alert((e as Error).message)
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm('ยืนยันการลบโต๊ะนี้?')) return
      const { error } = await supabase.from('store_tables').delete().eq('store_id', store.id).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key })
  })

  // Open table means setting status to 'occupied' and regenerating the QR token
  // So old customers from yesterday who saved the link can't order.
  const openTable = useMutation({
    mutationFn: async (id: string) => {
      const newToken = crypto.randomUUID()
      const { error } = await supabase.from('store_tables').update({
        status: 'occupied',
        qr_token: newToken,
        session_opened_at: new Date().toISOString()
      }).eq('store_id', store.id).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      setMessage('เปิดโต๊ะเรียบร้อย ระบบได้สร้าง QR Code ให้ใหม่แล้ว')
      setTimeout(() => setMessage(''), 3000)
      qc.invalidateQueries({ queryKey: key })
    }
  })

  const closeTable = useMutation({
    mutationFn: async (id: string) => {
      const newToken = crypto.randomUUID()
      const { error } = await supabase.from('store_tables').update({
        status: 'available',
        qr_token: newToken,
        session_opened_at: null
      }).eq('store_id', store.id).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      setMessage('ปิดโต๊ะเรียบร้อย QR Code เก่าถูกรีเซ็ตแล้ว')
      setTimeout(() => setMessage(''), 3000)
      qc.invalidateQueries({ queryKey: key })
    }
  })

  const regenerateQR = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm('ต้องการสร้าง QR Code ใหม่อีกครั้งหรือไม่? ลิงก์เก่าจะใช้งานไม่ได้ทันที')) return
      const newToken = crypto.randomUUID()
      const { error } = await supabase.from('store_tables').update({
        qr_token: newToken
      }).eq('store_id', store.id).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      setMessage('สร้าง QR Code ใหม่สำเร็จ')
      setTimeout(() => setMessage(''), 3000)
      qc.invalidateQueries({ queryKey: key })
    }
  })

  const getQRLink = (token: string) => `${window.location.origin}/qr/${token}`

  return (
    <div className="space-y-6">
      <PageHeader title="Table Management" description="จัดการโต๊ะ เปิดโต๊ะ และสร้าง QR Code สั่งอาหาร" />
      <div className="flex justify-end">
        <button onClick={() => add.mutate()} className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white">
          <Plus size={16} />เพิ่มโต๊ะ
        </button>
      </div>
      
      <Panel>
        <div className="border-b p-4 dark:border-zinc-800">
          <label className="flex h-11 items-center gap-2 rounded-xl bg-zinc-100 px-3 dark:bg-zinc-800">
            <Search size={16} className="text-zinc-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-transparent text-sm outline-none dark:text-white" placeholder="ค้นหาโต๊ะ..." />
          </label>
        </div>
        {message && <p className="m-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">{message}</p>}
        {query.isLoading ? <p className="p-12 text-center text-zinc-400">กำลังโหลด…</p> : query.error ? <p className="p-8 text-center text-red-500">{(query.error as Error).message}</p> : <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b bg-zinc-50 text-[11px] uppercase text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/50">
                <th className="px-5 py-3">เบอร์โต๊ะ</th>
                <th className="px-5 py-3">ความจุ (ที่นั่ง)</th>
                <th className="px-5 py-3">สถานะ</th>
                <th className="px-5 py-3">QR Link</th>
                <th className="px-5 py-3 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x: any) => (
                <tr key={x.id} className="border-b last:border-0 dark:border-zinc-800">
                  <td className="px-5 py-4 font-bold dark:text-white">{x.table_number}</td>
                  <td className="px-5 py-4 text-zinc-600 dark:text-zinc-400">{x.capacity}</td>
                  <td className="px-5 py-4">
                    {x.status === 'occupied' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/20 dark:text-red-400">
                        ไม่ว่าง
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-500/20 dark:text-green-400">
                        ว่าง
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <input type="text" readOnly value={getQRLink(x.qr_token)} className="w-48 rounded-lg border bg-zinc-50 px-2 py-1 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400" />
                      <button onClick={() => { navigator.clipboard.writeText(getQRLink(x.qr_token)); alert('คัดลอกลิงก์แล้ว') }} className="rounded bg-zinc-100 p-1.5 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300">
                        <QrCode size={14} />
                      </button>
                      <button onClick={() => regenerateQR.mutate(x.id)} title="เปลี่ยน QR ใหม่ (ลูกค้าเก่าจะสั่งไม่ได้)" className="rounded bg-orange-100 p-1.5 text-orange-600 hover:bg-orange-200 dark:bg-orange-500/20 dark:text-orange-400">
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      {x.status === 'available' ? (
                        <button onClick={() => openTable.mutate(x.id)} className="flex items-center gap-1 rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-600 hover:bg-orange-100 dark:bg-orange-500/10 dark:text-orange-400">
                          <Power size={14} /> เปิดโต๊ะ
                        </button>
                      ) : (
                        <button onClick={() => closeTable.mutate(x.id)} className="flex items-center gap-1 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400">
                          <PowerOff size={14} /> ปิดโต๊ะ
                        </button>
                      )}
                      <button onClick={() => remove.mutate(x.id)} className="p-1.5 text-red-400 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="p-12 text-center text-sm text-zinc-400">ยังไม่มีข้อมูลโต๊ะ</p>}
        </div>}
      </Panel>
    </div>
  )
}
