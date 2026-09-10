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
 inventory:{table:'store_inventory',title:'Inventory',action:'Add ingredient',columns:['Ingredient','Stock','Unit','Minimum','Supplier','Actions'],create:(name:string)=>({ingredient:name,stock:Number(prompt('จำนวนคงเหลือ')||0),unit:prompt('หน่วย')||'pcs',minimum_stock:Number(prompt('จุดแจ้งเตือน')||0)}),row:(x:any)=>[x.ingredient,x.stock,x.unit,x.minimum_stock,x.supplier||'—']},
 promotions:{table:'store_promotions',title:'Promotions',action:'New promotion',columns:['Name','Code','Discount','End date','Status','Actions'],create:(name:string)=>({name,coupon_code:prompt('Coupon code')||null,discount:{type:'percent',value:Number(prompt('ส่วนลด %')||0)},status:'active'}),row:(x:any)=>[x.name,x.coupon_code||'—',`${x.discount?.value||0}%`,x.end_date?new Date(x.end_date).toLocaleDateString('th-TH'):'—',<Status>{x.status}</Status>]},
 customers:{table:'store_customers',title:'Customers',action:'Add customer',columns:['Name','Phone','Level','Orders','Spending','Actions'],create:(name:string)=>({name,phone:prompt('เบอร์โทร')||null}),row:(x:any)=>[x.name,x.phone||'—',x.member_level,x.total_orders,`฿${Number(x.total_spending).toLocaleString()}`]},
 employees:{table:'store_members',title:'Employees',action:'Invite employee',columns:['User ID','Role','Status','Joined','Actions'],create:(name:string)=>({user_id:name,role:prompt('Role')||'cashier',status:'active'}),row:(x:any)=>[x.user_id,x.role,<Status>{x.status}</Status>,new Date(x.created_at).toLocaleDateString('th-TH')]},
}
function Generic({kind}:{kind:string}){
  const {store}=useStore()
  const {language}=useLanguage()
  const english=language==='en'
  const c=cfg[kind]
  const copy:any={
    inventory:{title:english?'Inventory':'สต็อกวัตถุดิบ',description:english?`Manage inventory for ${store.name}`:`จัดการสต็อกวัตถุดิบของ ${store.name}`,action:english?'Add ingredient':'เพิ่มวัตถุดิบ',search:english?'Search inventory…':'ค้นหาวัตถุดิบ…',columns:english?['Ingredient','Stock','Unit','Minimum','Supplier','Actions']:['วัตถุดิบ','คงเหลือ','หน่วย','ขั้นต่ำ','ผู้จัดจำหน่าย','จัดการ']},
    promotions:{title:english?'Promotions':'โปรโมชัน',description:english?`Manage promotions for ${store.name}`:`จัดการโปรโมชันของ ${store.name}`,action:english?'New promotion':'สร้างโปรโมชัน',search:english?'Search promotions…':'ค้นหาโปรโมชัน…',columns:english?['Name','Code','Discount','End date','Status','Actions']:['ชื่อ','รหัส','ส่วนลด','วันสิ้นสุด','สถานะ','จัดการ']},
    customers:{title:english?'Customers':'ลูกค้า',description:english?`Manage customers for ${store.name}`:`จัดการข้อมูลลูกค้าของ ${store.name}`,action:english?'Add customer':'เพิ่มลูกค้า',search:english?'Search customers…':'ค้นหาลูกค้า…',columns:english?['Name','Phone','Level','Orders','Spending','Actions']:['ชื่อ','เบอร์โทร','ระดับ','ออเดอร์','ยอดใช้จ่าย','จัดการ']}
  }[kind]
  const qc=useQueryClient()
  const key=[c.table,store.id]
  const query=useQuery({queryKey:key,queryFn:()=>listRows(store.id,c.table)})
  const add=useMutation({mutationFn:()=>{const name=prompt(kind==='employees'?'Supabase Auth User UUID':(english?`${copy.title} name`:`ชื่อ${copy.title}`));if(!name)throw new Error('CANCELLED');return insertRow(store.id,c.table,c.create(name))},onSuccess:()=>qc.invalidateQueries({queryKey:key})})
  const edit=useMutation({mutationFn:({id,current}:{id:string;current:string})=>{const name=prompt(english?'Edit':'แก้ไข',current);if(!name)throw new Error('CANCELLED');const field=kind==='inventory'?'ingredient':kind==='employees'?'role':'name';return updateRow(store.id,c.table,id,{[field]:name})},onSuccess:()=>qc.invalidateQueries({queryKey:key})})
  const remove=useMutation({mutationFn:(id:string)=>deleteRow(store.id,c.table,id),onSuccess:()=>qc.invalidateQueries({queryKey:key})})
  const rows=(query.data||[]).map((x:any)=>[...c.row(x),<span className="flex gap-1" key={x.id}><button title={english?'Edit':'แก้ไข'} onClick={()=>edit.mutate({id:x.id,current:x.name||x.ingredient||x.role})} className="p-2 text-zinc-400"><Pencil size={15}/></button><button title={english?'Delete':'ลบ'} onClick={()=>confirm(english?'Delete this item?':'ยืนยันการลบ?')&&remove.mutate(x.id)} className="p-2 text-red-400"><Trash2 size={15}/></button></span>])
  return <div className="space-y-6"><PageHeader title={copy.title} description={copy.description}/><Panel><div className="border-b p-4 dark:border-zinc-800"><SearchBar placeholder={copy.search}/></div>{query.isLoading?<p className="p-10 text-center text-zinc-400">{english?'Loading…':'กำลังโหลด…'}</p>:<DataTable columns={copy.columns} rows={rows}/>}<div className="border-t p-4 text-right dark:border-zinc-800"><button onClick={()=>add.mutate()} className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white">{copy.action}</button></div></Panel></div>
}
export default function ManagementPage({kind}:{kind:string}){return kind==='categories'?<Categories/>:kind==='menu'?<MenuManagement/>:kind==='tables'?<TablesManagement/>:kind==='employees'?<EmployeesManagement/>:<Generic kind={kind}/>}
