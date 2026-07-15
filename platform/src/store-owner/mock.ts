import type { Order } from './types'
export const orders:Order[] = [
  {id:'#SP-1048',customer:'Nattaya P.',type:'Dine-in',table:'A08',total:459,status:'Pending',time:'2 min ago',items:4},
  {id:'#SP-1047',customer:'Krit S.',type:'Delivery',total:780,status:'Preparing',time:'8 min ago',items:6},
  {id:'#SP-1046',customer:'Walk-in',type:'Dine-in',table:'B03',total:325,status:'Ready',time:'12 min ago',items:3},
  {id:'#SP-1045',customer:'Pimchanok',type:'Takeaway',total:199,status:'Completed',time:'21 min ago',items:2},
  {id:'#SP-1044',customer:'Thanawat',type:'Dine-in',table:'A02',total:890,status:'Accepted',time:'26 min ago',items:8},
]
export const menuItems = [
  {id:1,name:'Salmon Teriyaki Bowl',category:'Main dish',price:249,available:true,stock:18,emoji:'🍣'},
  {id:2,name:'Truffle Cream Pasta',category:'Pasta',price:289,available:true,stock:12,emoji:'🍝'},
  {id:3,name:'Crispy Chicken Salad',category:'Salad',price:189,available:true,stock:6,emoji:'🥗'},
  {id:4,name:'Matcha Tiramisu',category:'Dessert',price:159,available:false,stock:0,emoji:'🍰'},
  {id:5,name:'Yuzu Sparkling',category:'Beverage',price:95,available:true,stock:24,emoji:'🍹'},
]
export const revenue = [18,25,21,32,28,41,48]

