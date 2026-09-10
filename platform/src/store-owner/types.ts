export type NavKey = 'dashboard'|'orders'|'pos'|'menu'|'categories'|'tables'|'kitchen'|'promotions'|'customers'|'employees'|'reports'|'settings'
export type OrderStatus = 'Pending'|'Accepted'|'Preparing'|'Ready'|'Completed'|'Cancelled'
export interface Order { id:string; customer:string; type:'Dine-in'|'Takeaway'|'Delivery'; table?:string; total:number; status:OrderStatus; time:string; items:number }

