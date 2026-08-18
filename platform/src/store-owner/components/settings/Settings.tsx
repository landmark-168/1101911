import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useStore } from '../../StoreContext'
import { PageHeader, Panel } from '../PageKit'
import { ExternalLink, Copy, Check } from 'lucide-react'

const empty={description:'',phone:'',address:'',google_maps_url:'',line_oa:'',delivery_fee:0,tax_percent:7,service_charge_percent:0,theme_color:'#F97316',opening_hours:{}}
export default function Settings(){
  const {store}=useStore();
  const [form,setForm]=useState<any>(empty);
  const [copied, setCopied] = useState(false);
  const query=useQuery({queryKey:['settings',store.id],queryFn:async()=>{const {data,error}=await supabase.from('store_settings').select('*').eq('store_id',store.id).maybeSingle();if(error)throw error;return data||empty}});
  useEffect(()=>{if(query.data)setForm(query.data)},[query.data]);
  const save=useMutation({mutationFn:async()=>{const {error}=await supabase.from('store_settings').upsert({...form,store_id:store.id,updated_at:new Date().toISOString()});if(error)throw error;const {error:shopError}=await supabase.from('shops').update({name:form.store_name||store.name,slug:form.store_slug||store.slug,phone:form.phone,address:form.address,updated_at:new Date().toISOString()}).eq('id',store.id);if(shopError)throw shopError},onSuccess:()=>alert('บันทึกการตั้งค่าร้านแล้ว')});
  
  const storeLink = `${window.location.origin}/s/${store.id}`
  const copyLink = () => { navigator.clipboard.writeText(storeLink); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  
  const fields=[['store_name','Store Name',store.name],['store_slug','Store Slug',store.slug],['phone','Phone',''],['address','Address',''],['description','Description',''],['google_maps_url','Google Maps',''],['line_oa','LINE OA',''],['delivery_fee','Delivery Fee','number'],['tax_percent','Tax (%)','number'],['service_charge_percent','Service Charge (%)','number'],['theme_color','Theme Color','color']];
  
  return <div className="space-y-6">
    <PageHeader title="Store settings" description="ข้อมูลนี้บันทึกลง Supabase สำหรับร้านนี้เท่านั้น"/>
    
    <Panel className="p-5 sm:p-7">
      <h3 className="mb-4 text-sm font-bold text-zinc-900 dark:text-white">ลิงก์สั่งเดลิเวอรี (Delivery)</h3>
      <div className="flex items-center gap-3 rounded-xl border p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
        <input readOnly value={storeLink} className="flex-1 bg-transparent text-sm text-zinc-500 outline-none" />
        <button onClick={copyLink} className="grid size-8 place-items-center rounded-lg bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700">
          {copied ? <Check size={14} className="text-emerald-500"/> : <Copy size={14}/>}
        </button>
        <a href={storeLink} target="_blank" rel="noreferrer" className="grid size-8 place-items-center rounded-lg bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700">
          <ExternalLink size={14}/>
        </a>
      </div>
    </Panel>

    <Panel className="p-5 sm:p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([key,label,type])=><label key={key} className={['address','description'].includes(key)?'sm:col-span-2':''}><span className="mb-1.5 block text-xs font-bold dark:text-zinc-300">{label}</span>{['address','description'].includes(key)?<textarea rows={3} value={form[key]??''} onChange={e=>setForm({...form,[key]:e.target.value})} className="w-full rounded-xl border bg-transparent p-3 dark:border-zinc-700 dark:text-white"/>:<input type={type||'text'} value={form[key]??(key==='store_name'?store.name:key==='store_slug'?store.slug:'')} onChange={e=>setForm({...form,[key]:type==='number'?Number(e.target.value):e.target.value})} className="h-11 w-full rounded-xl border bg-transparent px-3 dark:border-zinc-700 dark:text-white"/>}</label>)}
      </div>
      {save.error&&<p className="mt-4 text-sm text-red-500">{(save.error as Error).message}</p>}
      <div className="mt-6 flex justify-end">
        <button disabled={save.isPending} onClick={()=>save.mutate()} className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
          {save.isPending?'กำลังบันทึก…':'Save changes'}
        </button>
      </div>
    </Panel>
  </div>
}
