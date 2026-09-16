import { useState } from 'react'
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query'
import { Pencil,Trash2 } from 'lucide-react'
import { useStore } from '../../StoreContext'
import { useLanguage } from '../../../lib/language'
import { deleteRow,insertRow,listRows,updateRow } from '../../lib/data'
import { DataTable,PageHeader,Panel,SearchBar,Status } from '../PageKit'
import Categories from '../categories/Categories'
import MenuManagement from '../menu/MenuManagement'
import TablesManagement from '../tables/TablesManagement'
import EmployeesManagement from '../employees/EmployeesManagement'
const cfg:any={
 promotions:{table:'store_promotions',title:'Promotions',action:'New promotion',columns:['Name','Code','Discount','End date','Status','Actions'],row:(x:any)=>[x.name,x.coupon_code||'—',x.discount?.type==='fixed'?`฿${Number(x.discount?.value||0).toLocaleString()}`:`${x.discount?.value||0}%`,x.end_date?new Date(x.end_date).toLocaleDateString('th-TH'):'ไม่กำหนด',<Status>{x.status}</Status>]},
 customers:{table:'store_customers',title:'Customers',action:'Add customer',columns:['Name','Phone','Level','Orders','Spending','Actions'],create:(name:string)=>({name,phone:prompt('เบอร์โทร')||null}),row:(x:any)=>[x.name,x.phone||'—',x.member_level,x.total_orders,`฿${Number(x.total_spending).toLocaleString()}`]},
 employees:{table:'store_members',title:'Employees',action:'Invite employee',columns:['User ID','Role','Status','Joined','Actions'],create:(name:string)=>({user_id:name,role:prompt('Role')||'cashier',status:'active'}),row:(x:any)=>[x.user_id,x.role,<Status>{x.status}</Status>,new Date(x.created_at).toLocaleDateString('th-TH')]},
}
const toDateInput=(value:string)=>{const date=new Date(value);return new Date(date.getTime()-date.getTimezoneOffset()*60_000).toISOString().slice(0,10)}
function Generic({kind}:{kind:string}){
  const {store}=useStore()
  const {language}=useLanguage()
  const english=language==='en'
  const c=cfg[kind]
  const copy:any={
    promotions:{title:english?'Promotions':'โปรโมชัน',description:english?`Manage promotions for ${store.name}`:`จัดการโปรโมชันของ ${store.name}`,action:english?'New promotion':'สร้างโปรโมชัน',search:english?'Search promotions…':'ค้นหาโปรโมชัน…',columns:english?['Name','Code','Discount','End date','Status','Actions']:['ชื่อ','รหัส','ส่วนลด','วันสิ้นสุด','สถานะ','จัดการ']},
    customers:{title:english?'Customers':'ลูกค้า',description:english?`Manage customers for ${store.name}`:`จัดการข้อมูลลูกค้าของ ${store.name}`,action:english?'Add customer':'เพิ่มลูกค้า',search:english?'Search customers…':'ค้นหาลูกค้า…',columns:english?['Name','Phone','Level','Orders','Spending','Actions']:['ชื่อ','เบอร์โทร','ระดับ','ออเดอร์','ยอดใช้จ่าย','จัดการ']}
  }[kind]
  const qc=useQueryClient()
  const emptyPromotion={name:'',coupon_code:'',discount_type:'percent',discount_value:'',start_date:'',end_date:'',minimum_order:'0',usage_limit:'',status:'active'}
  const [promotionForm,setPromotionForm]=useState<any>(emptyPromotion)
  const [editingPromotionId,setEditingPromotionId]=useState<string|null>(null)
  const [promotionDialogOpen,setPromotionDialogOpen]=useState(false)
  const key=[c.table,store.id]
  const query=useQuery({queryKey:key,queryFn:()=>listRows(store.id,c.table)})
  const add=useMutation({mutationFn:()=>{const name=prompt(kind==='employees'?'Supabase Auth User UUID':(english?`${copy.title} name`:`ชื่อ${copy.title}`));if(!name)throw new Error('CANCELLED');return insertRow(store.id,c.table,c.create(name))},onSuccess:()=>qc.invalidateQueries({queryKey:key})})
  const edit=useMutation({mutationFn:({id,current}:{id:string;current:string})=>{const name=prompt(english?'Edit':'แก้ไข',current);if(!name)throw new Error('CANCELLED');const field=kind==='employees'?'role':'name';return updateRow(store.id,c.table,id,{[field]:name})},onSuccess:()=>qc.invalidateQueries({queryKey:key})})
  const savePromotion=useMutation({mutationFn:async()=>{
    const name=promotionForm.name.trim()
    const code=promotionForm.coupon_code.trim().toUpperCase()
    const value=Number(promotionForm.discount_value)
    if(!name||!code)throw new Error(english?'Name and coupon code are required':'กรุณาระบุชื่อและรหัสคูปอง')
    if(!Number.isFinite(value)||value<=0||(promotionForm.discount_type==='percent'&&value>100))throw new Error(english?'Enter a valid discount':'กรุณาระบุส่วนลดให้ถูกต้อง')
    if(promotionForm.start_date&&promotionForm.end_date&&promotionForm.end_date<promotionForm.start_date)throw new Error(english?'End date must be on or after start date':'วันหมดอายุต้องไม่ก่อนวันเริ่มต้น')
    const payload={name,coupon_code:code,discount:{type:promotionForm.discount_type,value},start_date:promotionForm.start_date?new Date(`${promotionForm.start_date}T00:00:00`).toISOString():null,end_date:promotionForm.end_date?new Date(`${promotionForm.end_date}T23:59:59`).toISOString():null,minimum_order:Number(promotionForm.minimum_order)||0,usage_limit:promotionForm.usage_limit?Number(promotionForm.usage_limit):null,status:promotionForm.status}
    return editingPromotionId?updateRow(store.id,c.table,editingPromotionId,payload):insertRow(store.id,c.table,payload)
  },onSuccess:()=>{qc.invalidateQueries({queryKey:key});setPromotionDialogOpen(false)},onError:(error:any)=>alert(error.message)})
  const remove=useMutation({mutationFn:(id:string)=>deleteRow(store.id,c.table,id),onSuccess:()=>qc.invalidateQueries({queryKey:key})})
  const openPromotion=(promotion?:any)=>{setEditingPromotionId(promotion?.id||null);setPromotionForm(promotion?{name:promotion.name||'',coupon_code:promotion.coupon_code||'',discount_type:promotion.discount?.type||'percent',discount_value:String(promotion.discount?.value||''),start_date:promotion.start_date?toDateInput(promotion.start_date):'',end_date:promotion.end_date?toDateInput(promotion.end_date):'',minimum_order:String(promotion.minimum_order||0),usage_limit:promotion.usage_limit==null?'':String(promotion.usage_limit),status:promotion.status||'active'}:emptyPromotion);setPromotionDialogOpen(true)}
  const rows=(query.data||[]).map((x:any)=>[...c.row(x),<span className="flex gap-1" key={x.id}><button title={english?'Edit':'แก้ไข'} onClick={()=>kind==='promotions'?openPromotion(x):edit.mutate({id:x.id,current:x.name||x.role})} className="p-2 text-zinc-400"><Pencil size={15}/></button><button title={english?'Delete':'ลบ'} onClick={()=>confirm(english?'Delete this item?':'ยืนยันการลบ?')&&remove.mutate(x.id)} className="p-2 text-red-400"><Trash2 size={15}/></button></span>])
  const field=(key:string,value:string)=>setPromotionForm((current:any)=>({...current,[key]:value}))
  return <div className="space-y-6"><PageHeader title={copy.title} description={copy.description}/><Panel><div className="border-b p-4 dark:border-zinc-800"><SearchBar placeholder={copy.search}/></div>{query.isLoading?<p className="p-10 text-center text-zinc-400">{english?'Loading…':'กำลังโหลด…'}</p>:<DataTable columns={copy.columns} rows={rows}/>}<div className="border-t p-4 text-right dark:border-zinc-800"><button onClick={()=>kind==='promotions'?openPromotion():add.mutate()} className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white">{copy.action}</button></div></Panel>
    {kind==='promotions'&&promotionDialogOpen&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"><form onSubmit={(event)=>{event.preventDefault();savePromotion.mutate()}} className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900"><div><h2 className="text-lg font-bold">{editingPromotionId?(english?'Edit promotion':'แก้ไขโปรโมชัน'):(english?'New promotion':'สร้างโปรโมชัน')}</h2><p className="text-xs text-zinc-500">{english?'Set the validity period used by storefront validation.':'กำหนดช่วงวันที่ที่ลูกค้าสามารถใช้โค้ดได้'}</p></div><div className="grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-bold">{english?'Promotion name':'ชื่อโปรโมชัน'}<input required value={promotionForm.name} onChange={e=>field('name',e.target.value)} className="mt-1 w-full rounded-lg border p-2 font-normal dark:bg-zinc-800"/></label>
      <label className="text-xs font-bold">{english?'Coupon code':'รหัสคูปอง'}<input required value={promotionForm.coupon_code} onChange={e=>field('coupon_code',e.target.value.toUpperCase())} className="mt-1 w-full rounded-lg border p-2 font-normal uppercase dark:bg-zinc-800"/></label>
      <label className="text-xs font-bold">{english?'Discount type':'ประเภทส่วนลด'}<select value={promotionForm.discount_type} onChange={e=>field('discount_type',e.target.value)} className="mt-1 w-full rounded-lg border p-2 font-normal dark:bg-zinc-800"><option value="percent">{english?'Percent (%)':'เปอร์เซ็นต์ (%)'}</option><option value="fixed">{english?'Fixed amount (THB)':'จำนวนเงิน (บาท)'}</option></select></label>
      <label className="text-xs font-bold">{english?'Discount value':'มูลค่าส่วนลด'}<input required min="0.01" step="0.01" type="number" value={promotionForm.discount_value} onChange={e=>field('discount_value',e.target.value)} className="mt-1 w-full rounded-lg border p-2 font-normal dark:bg-zinc-800"/></label>
      <label className="text-xs font-bold">{english?'Start date':'วันเริ่มต้น'}<input type="date" value={promotionForm.start_date} onChange={e=>field('start_date',e.target.value)} className="mt-1 w-full rounded-lg border p-2 font-normal dark:bg-zinc-800"/></label>
      <label className="text-xs font-bold">{english?'Expiry date':'วันหมดอายุ'}<input type="date" min={promotionForm.start_date||undefined} value={promotionForm.end_date} onChange={e=>field('end_date',e.target.value)} className="mt-1 w-full rounded-lg border p-2 font-normal dark:bg-zinc-800"/></label>
      <label className="text-xs font-bold">{english?'Minimum order':'ยอดขั้นต่ำ'}<input min="0" step="0.01" type="number" value={promotionForm.minimum_order} onChange={e=>field('minimum_order',e.target.value)} className="mt-1 w-full rounded-lg border p-2 font-normal dark:bg-zinc-800"/></label>
      <label className="text-xs font-bold">{english?'Usage limit':'จำนวนสิทธิ์'}<input min="1" step="1" type="number" placeholder={english?'Unlimited':'ไม่จำกัด'} value={promotionForm.usage_limit} onChange={e=>field('usage_limit',e.target.value)} className="mt-1 w-full rounded-lg border p-2 font-normal dark:bg-zinc-800"/></label>
      <label className="text-xs font-bold sm:col-span-2">{english?'Status':'สถานะ'}<select value={promotionForm.status} onChange={e=>field('status',e.target.value)} className="mt-1 w-full rounded-lg border p-2 font-normal dark:bg-zinc-800"><option value="active">Active</option><option value="draft">Draft</option><option value="inactive">Inactive</option></select></label>
    </div><div className="flex justify-end gap-2"><button type="button" onClick={()=>setPromotionDialogOpen(false)} className="rounded-xl border px-4 py-2 text-xs font-bold">{english?'Cancel':'ยกเลิก'}</button><button disabled={savePromotion.isPending} className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{savePromotion.isPending?(english?'Saving…':'กำลังบันทึก…'):(english?'Save promotion':'บันทึกโปรโมชัน')}</button></div></form></div>}
  </div>
}
export default function ManagementPage({kind}:{kind:string}){return kind==='categories'?<Categories/>:kind==='menu'?<MenuManagement/>:kind==='tables'?<TablesManagement/>:kind==='employees'?<EmployeesManagement/>:<Generic kind={kind}/>}
