import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

export type Language = 'th' | 'en'

const translations = {
  th: {
    language: 'EN',
    home: 'หน้าแรก',
    features: 'ฟีเจอร์',
    pricing: 'ราคา',
    contact: 'ติดต่อเรา',
    login: 'เข้าสู่ระบบ',
    logout: 'ออกจากระบบ',
    orderFood: 'สั่งอาหาร',
    history: 'ประวัติ',
    promotions: 'โปรโมชั่น',
    callStaff: 'เรียกพนักงาน',
    dashboard: 'ภาพรวม',
    orders: 'ออเดอร์',
    menu: 'เมนู',
    categories: 'หมวดหมู่',
    tables: 'โต๊ะ',
    kitchen: 'ครัว',
    customers: 'ลูกค้า',
    employees: 'พนักงานและ PIN',
    reports: 'รายงาน',
    settings: 'ตั้งค่าร้าน',
    openPos: 'เปิด POS',
    loading: 'กำลังโหลด…',
    stores: 'ร้านค้า',
    packages: 'แพ็กเกจ',
    revenue: 'รายได้',
    members: 'สมาชิก',
    analytics: 'สถิติและวิเคราะห์'
  },
  en: {
    language: 'ไทย',
    home: 'Home',
    features: 'Features',
    pricing: 'Pricing',
    contact: 'Contact',
    login: 'Sign in',
    logout: 'Sign out',
    orderFood: 'Order food',
    history: 'History',
    promotions: 'Promotions',
    callStaff: 'Call staff',
    dashboard: 'Dashboard',
    orders: 'Orders',
    menu: 'Menu',
    categories: 'Categories',
    tables: 'Tables',
    kitchen: 'Kitchen',
    customers: 'Customers',
    employees: 'Employees & PIN',
    reports: 'Reports',
    settings: 'Store settings',
    openPos: 'Open POS',
    loading: 'Loading…',
    stores: 'Stores',
    packages: 'Packages',
    revenue: 'Revenue',
    members: 'Members',
    analytics: 'Analytics'
  },
} as const

type TranslationKey = keyof typeof translations.en
type LanguageContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  toggleLanguage: () => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export const interfaceTranslations: Record<string, string> = {
  // Common Actions & Buttons
  'เพิ่ม': 'Add',
  'เพิ่มใหม่': 'Add new',
  'แก้ไข': 'Edit',
  'ลบ': 'Delete',
  'บันทึก': 'Save',
  'บันทึกการแก้ไข': 'Save changes',
  'บันทึกการเปลี่ยนแปลง': 'Save changes',
  'กำลังบันทึก…': 'Saving…',
  'ยืนยัน': 'Confirm',
  'ยืนยันการสั่งซื้อ': 'Confirm order',
  'ยืนยันสั่งอาหาร': 'Confirm food order',
  'ยืนยันรับเงินสด': 'Confirm cash payment',
  'ยกเลิก': 'Cancel',
  'ปิด': 'Close',
  'กลับ': 'Back',
  'ถัดไป': 'Next',
  'เสร็จสิ้น': 'Complete',
  'รีเฟรช': 'Refresh',
  'ค้นหา': 'Search',
  'คัดลอกลิงก์': 'Copy link',
  'คัดลอก': 'Copy',
  'เปิด': 'Open',
  'ปิดร้าน': 'Close store',
  'เปิดร้าน': 'Open store',
  'รับออเดอร์': 'Accept order',
  'เริ่มทำ': 'Start preparing',
  'ปรุงเสร็จแล้ว': 'Mark as prepared',
  'รับชำระเงิน': 'Receive payment',
  'ชำระแล้ว': 'Paid',
  'พิมพ์ใบเสร็จ': 'Print receipt',
  'ดูรายละเอียด': 'View details',
  'ดูทั้งหมด': 'View all',
  'เพิ่มลงตะกร้า': 'Add to cart',
  'ไปชำระเงิน': 'Proceed to payment',
  'เลือกทั้งหมด': 'Select all',
  'ล้าง': 'Clear',
  'ออกจากระบบ': 'Sign out',
  'เข้าสู่ระบบ': 'Sign in',
  'สมัครสมาชิก': 'Register',
  'กำลังโหลด…': 'Loading…',
  'กำลังตรวจสอบสิทธิ์…': 'Authenticating…',
  'กำลังโหลด Dashboard…': 'Loading Dashboard…',
  'กำลังโหลดร้านค้า…': 'Loading Stores…',
  'กำลังโหลดแพ็กเกจ…': 'Loading Packages…',
  'กำลังโหลด Analytics…': 'Loading Analytics…',
  'กำลังโหลด Setting…': 'Loading Settings…',
  'กำลังโหลดรายได้…': 'Loading Revenue…',
  'กำลังโหลดสมาชิก…': 'Loading Members…',

  // Navigation & Sections
  'จัดการร้านค้า': 'Store Management',
  'ตรวจสอบ อนุมัติ และจัดการร้านค้าทั้งหมดในระบบ': 'Review, approve, and manage all stores in the system',
  'ร้านค้าทั้งหมด': 'Total Stores',
  'รออนุมัติ': 'Pending Approval',
  'ทุกสถานะ': 'All Statuses',
  'ไม่พบร้านค้าที่ค้นหา': 'No stores found matching your search',
  'แก้ไขข้อมูลร้านค้า': 'Edit Store Details',
  'ร้านค้า': 'Stores',
  'แพ็กเกจ': 'Packages',
  'รายได้': 'Revenue',
  'สมาชิก': 'Members',
  'สถิติ': 'Analytics',
  'การตั้งค่า': 'Settings',

  // Store & Form Fields
  'ชื่อร้าน': 'Store Name',
  'ชื่อร้าน *': 'Store Name *',
  'รหัสร้าน': 'Store ID',
  'ประเภทร้าน': 'Store Type',
  'ประเภทร้าน *': 'Store Type *',
  'เจ้าของร้าน': 'Store Owner',
  'ชื่อเจ้าของร้าน *': 'Owner Name *',
  'เจ้าของ': 'Owner',
  'อีเมลร้าน': 'Store Email',
  'อีเมลร้าน *': 'Store Email *',
  'อีเมล': 'Email',
  'เบอร์โทร': 'Phone Number',
  'เบอร์โทร *': 'Phone Number *',
  'จังหวัด': 'Province',
  'จังหวัด *': 'Province *',
  'ที่อยู่': 'Address',
  'ที่อยู่ *': 'Address *',
  'URL โลโก้': 'Logo URL',
  'พิกัด': 'Coordinates',
  'ละติจูด': 'Latitude',
  'ลองจิจูด': 'Longitude',
  'วันที่สมัคร': 'Registration Date',
  'วันที่สร้าง': 'Created Date',
  'สถานะร้าน': 'Store Status',
  'สถานะ': 'Status',
  'การกระทำ': 'Action',
  'การจัดการ': 'Management',

  // Modal / Confirmations
  'ยืนยันการลบร้านค้านี้?': 'Are you sure you want to delete this store?',
  'ยืนยันการลบ?': 'Confirm deletion?',
  'กรุณากรอกข้อมูลที่จำเป็นให้ครบ': 'Please fill in all required fields',
  'รูปแบบอีเมลไม่ถูกต้อง': 'Invalid email format',
  'พิกัดละติจูด/ลองจิจูดไม่ถูกต้อง': 'Invalid latitude/longitude coordinates',
  'บันทึกสำเร็จ': 'Saved successfully',
  'เกิดข้อผิดพลาด': 'An error occurred',

  // Placeholders
  'ค้นหาชื่อร้าน, Owner, Email หรือ Store ID...': 'Search store name, owner, email, or store ID…',
  'ค้นหาร้านค้า สมาชิก...': 'Search stores, members…',
  'ค้นหาชื่อ...': 'Search name…',
  'ค้นหาเมนู': 'Search menu',
  'ค้นหาชื่อเมนู, หมวดหมู่, คำอธิบาย...': 'Search menu, category, description…',
  'ค้นหาเบอร์โต๊ะ...': 'Search table number…',
  'ค้นหาเลขออเดอร์, โต๊ะ, รายการอาหาร...': 'Search order, table, item…',
  'ค้นหาชื่อพนักงาน, ตำแหน่ง, เบอร์โทร หรือรหัส PIN...': 'Search employee name, role, phone, or PIN…',
  'ค้นหาเลขออเดอร์, ชื่อลูกค้า, เบอร์โทร...': 'Search order number, customer, phone…',

  // Categories & Menu
  'เพิ่มหมวดหมู่': 'Add category',
  'ออเดอร์': 'Orders',
  'หมวดหมู่': 'Category',
  'จัดการ': 'Actions',
  'เพิ่มเมนูใหม่': 'Add menu item',
  'เมนูทั้งหมด': 'All menu items',
  'พร้อมขาย (Active)': 'Available',
  'สินค้าหมด (Out of Stock)': 'Out of stock',
  'หมวดหมู่ทั้งหมด': 'All categories',
  'เปิดให้ลูกค้าสั่ง': 'Available to customers',
  'ซ่อนชั่วคราว': 'Hidden temporarily',
  'หมวดหลักของร้าน': 'Main store categories',
  'ทั้งหมด': 'All',
  'พร้อมขาย': 'Available',
  'สินค้าหมด': 'Out of stock',
  'เมนู': 'Menu',
  'ราคา': 'Price',
  'เวลาเตรียม': 'Prep time',
  'ไม่มีคำอธิบาย': 'No description',

  // POS & Tables
  'เลือกโต๊ะ': 'Select table',
  'Current bill': 'Current bill',
  'เลือกโต๊ะเพื่อเริ่มบิล': 'Select a table to start a bill',
  'ยังไม่มีรายการในบิล': 'No items in this bill yet',
  'หมายเหตุทั้งบิล': 'Bill note',
  'เช็กบิล': 'Checkout',
  'ยอดสุทธิ (Total)': 'Total',
  'รวมค่าอาหาร (Subtotal)': 'Subtotal',
  'มีบิลยกเลิก': 'Cancelled bills',
  'แจ้งลูกค้าและตรวจสอบเหตุผล': 'Notify the customer and review the reason',
  'ดูบิลยกเลิก': 'View cancelled bills',
  'ต้องรับออเดอร์': 'Orders to accept',
  'กำลังทำ': 'Preparing',
  'พร้อมส่ง / พร้อมรับ': 'Ready for delivery / pickup',
  'งานที่ต้องทำ': 'To do',
  'สำเร็จ': 'Completed',
  'ช่องทาง / โต๊ะ': 'Channel / table',
  'ยอดรวม': 'Total',
  'ชำระเงิน': 'Payment',
  'ผังโต๊ะ & จัดการโต๊ะ (Tables)': 'Table layout & management',
  'ภาพรวมผังโต๊ะ สถานะลูกค้า และจัดการ QR Code ประจำโต๊ะ': 'Table overview, guest status, and table QR codes',
  'เสียงเตือนเปิดอยู่': 'Sound alerts on',
  'เพิ่มโต๊ะใหม่': 'Add table',
  'ลิงก์ Online Store': 'Online Store link',
  'โต๊ะทั้งหมด': 'All tables',
  'โต๊ะว่าง (พร้อมรับ)': 'Available tables',
  'กำลังรับประทาน': 'Dining',
  'เรียกเก็บเงิน': 'Bill requested',
  'ไม่มีโต๊ะเรียก': 'No table calls',
  'มุมมองกริด (Grid)': 'Grid view',
  'มุมมองการ์ด (Grid)': 'Grid view',
  'มุมมองตาราง (List)': 'List view',
  'ไม่ว่าง': 'Occupied',
  'ว่าง': 'Available',
  'เปิดโต๊ะแล้ว': 'Table opened',
  'พร้อมเปิดรับลูกค้า': 'Ready for guests',
  'โต๊ะในร้าน': 'tables in store',
  'โต๊ะมีลูกค้า': 'tables with guests',

  // Kitchen / KDS
  'Kitchen · หน้าจอห้องครัว': 'Kitchen display',
  'เชื่อมต่อออเดอร์ลูกค้าแบบเรียลไทม์ · มีทั้งหมด': 'Live customer orders · total',
  'ออเดอร์ที่กำลังดำเนินการ': 'active orders',
  'เปิดเสียงเตือน': 'Enable sound alerts',
  'เต็มหน้าจอ (KDS)': 'Fullscreen (KDS)',
  'ทานที่ร้าน': 'Dine-in',
  'สั่งกลับบ้าน': 'Takeaway',
  'เดลิเวอรี': 'Delivery',
  'กำลังปรุง': 'Preparing',
  'เชฟกำลังทำในครัว': 'Chef is preparing',
  'พร้อมเสิร์ฟ / จัดส่ง': 'Ready to serve / deliver',
  'รอพนักงานเสิร์ฟหรือไรเดอร์': 'Waiting for staff or rider',
  'เสร็จสิ้นล่าสุด': 'Recently completed',
  'ประวัติออเดอร์ที่เสร็จแล้ว': 'Completed order history',
  'ไม่มีออเดอร์ในสถานะนี้': 'No orders in this status',
  'ส่งมอบสำเร็จแล้ว': 'Delivered successfully',

  // Employees & Roles
  'จัดการพนักงานและระบบ PIN': 'Employee & PIN management',
  'สร้างบัญชีพนักงาน กำหนดรหัส PIN สำหรับปลดล็อคเครื่อง POS และเลือกแสดงสิทธิ์ตามแต่ละตำแหน่ง': 'Create employee accounts, assign PINs, and configure permissions by role',
  'ทดสอบกด PIN': 'Test PIN',
  'พิมพ์การ์ด PIN': 'Print PIN cards',
  'เพิ่มพนักงานใหม่': 'Add employee',
  'พนักงานทั้งหมด': 'All employees',
  'เจ้าของ/ผู้จัดการ': 'Owner / manager',
  'แคชเชียร์': 'Cashier',
  'พนักงานครัว': 'Kitchen staff',
  'พนักงานเสิร์ฟ': 'Service staff',
  'มีรหัส PIN': 'With PIN',
  'ใช้งาน': 'active',
  'สิทธิ์ผู้ดูแลเต็ม': 'Full admin permissions',
  'คิดเงิน / POS': 'Payments / POS',
  'หน้าจอ KDS ครัว': 'Kitchen KDS',
  'หน้าร้าน / โต๊ะ': 'Front counter / tables',
  'พร้อมล็อค POS': 'Ready to unlock POS',
  'เลือกแสดงโรล:': 'Filter roles:',
  'ผู้จัดการร้าน': 'Store manager',
  'พนักงานส่งอาหาร': 'Delivery staff',
  'สถานะทั้งหมด': 'All statuses',
  'รหัส PIN เข้าใช้งาน': 'Login PIN',
  'สิทธิ์ที่เปิดให้เข้าถึง': 'Enabled permissions',
  'ลบสิทธิ์': 'Remove permissions',

  // Reports & Dates
  'ตั้งแต่วันที่': 'From date',
  'ถึงวันที่': 'To date',
  'ช่องทางการขาย': 'Sales channel',
  'ทุกช่องทาง': 'All channels',
  'รายได้ที่สำเร็จ': 'Completed revenue',
  'ออเดอร์ที่สำเร็จ': 'Completed orders',
  'ยอดเฉลี่ยต่อบิล': 'Average bill',
  'ช่วงเวลาขายสูงสุด': 'Peak sales time',
  'รายได้รายวัน': 'Daily revenue',
  'นับเฉพาะออเดอร์ที่สำเร็จ': 'Completed orders only',
  'รายการ': 'items',
  'ชม.': 'hr.',
  'น.': 'min.',
  'โน้ต:': 'Note:',
  'ผู้ดูแลระบบ': 'Administrator',
  'การแจ้งเตือน': 'Notifications',
  '3 รายการใหม่': '3 new items',
  'มีร้านค้าใหม่สมัครใช้งาน': 'A new store has signed up',
  'การชำระเงินสำเร็จ ฿1,290': 'Payment of ฿1,290 completed',
  'รายงานประจำเดือนพร้อมแล้ว': 'Monthly report is ready',
  'ชั่วโมงที่แล้ว': 'hours ago',
  // Admin workspace
  'แดชบอร์ด': 'Dashboard',
  'การวิเคราะห์': 'Analytics',
  'สถิติและการวิเคราะห์': 'Analytics',
  'ตั้งค่าระบบ': 'System settings',
  'ภาพรวมแดชบอร์ด': 'Dashboard overview',
  'ภาพรวมประสิทธิภาพของระบบ SmartPOS ประจำวันนี้': 'A snapshot of SmartPOS system performance today',
  'ระบบทำงานปกติ': 'System operational',
  'จำนวนร้านค้าทั้งหมด': 'Total stores',
  'รายได้รวม': 'Total revenue',
  'ผู้ใช้งานทั้งหมด': 'Total users',
  'แพ็กเกจที่ใช้งาน': 'Active packages',
  'ข้อมูลจริง': 'Live data',
  'ร้านค้าในระบบ': 'Stores in the system',
  'รายได้ที่ชำระแล้ว': 'Paid revenue',
  'สมาชิกในระบบ': 'Members in the system',
  'แพ็กเกจที่เปิดใช้งานอยู่': 'Packages currently enabled',
  'รายได้รายเดือน': 'Monthly revenue',
  'รายได้รวมตลอด 12 เดือน': 'Total revenue for the past 12 months',
  'ร้านค้าเปิดใหม่': 'New stores',
  'จำนวนร้านค้าใหม่ในรอบ 6 เดือนล่าสุด': 'Stores created in the past six months',
  'ร้านค้าใหม่เดือนนี้': 'New stores this month',
  'ร้านค้าล่าสุด': 'Recent stores',
  'ร้านค้าที่สมัครเข้ามาใช้งานล่าสุด': 'Most recently registered stores',
  'ชื่อร้านค้า': 'Store name',
  'เปิดใช้งาน': 'Active',
  'ระงับการใช้งาน': 'Suspended',
  'จัดการแพ็กเกจ': 'Package management',
  'เพิ่มแพ็กเกจ': 'Add package',
  'จัดการข้อมูลสมาชิก': 'Member management',
  'จัดการบัญชีสมาชิก สิทธิ์การใช้งาน และแพ็กเกจในระบบ': 'Manage member accounts, access permissions, and packages.',
  'วิเคราะห์รายได้ Subscription และการเติบโตของร้านค้า': 'Analyze revenue, subscriptions, and store growth.',

  // Complete phrases used throughout the admin workspace. Keeping these whole
  // preserves clean wording without changing customer or store data.
  'ระบบ': 'System',
  'สร้างและกำหนดราคาแพ็กเกจสำหรับร้านค้า': 'Create and price packages for stores.',
  'สำหรับร้านเล็กที่กำลังเริ่มต้น': 'For small businesses getting started',
  'สำหรับร้านที่ต้องการเติบโต': 'For growing businesses',
  'สำหรับธุรกิจหลายสาขา': 'For multi-branch businesses',
  'รายเดือน': 'Monthly',
  'รายปี': 'Yearly',
  'ระยะเวลา': 'Duration',
  'ปิดใช้งาน': 'Inactive',
  'ตรวจสอบรายการชำระเงินและรายได้ทั้งหมด': 'Review all payment records and revenue.',
  'ชำระสำเร็จ': 'Completed payments',
  'รอดำเนินการ': 'Pending',
  'ค้นหาชื่อ, อีเมล, เบอร์โทร หรือร้านค้า...': 'Search name, email, phone, or store…',
  'ทุกบทบาท (Roles)': 'All roles',
  'จำนวนเงิน': 'Amount',
  'วันที่': 'Date',
  'สมาชิกทั้งหมด': 'All members',
  'เจ้าของร้าน (Shop Owner)': 'Store owners',
  'พนักงาน (Staff)': 'Staff',
  'จัดการสมาชิก': 'Manage member',
  'ไม่พบข้อมูลสมาชิกที่ค้นหา': 'No matching members found',
  'สัดส่วนสถานะสมาชิก': 'Subscription status distribution',
  'จำนวนร้านเปิดใหม่รายเดือน': 'Monthly new stores',
  'แพ็กเกจที่ร้านเลือกมากที่สุด': 'Most selected package',
  'ข้อมูลจริงจาก Supabase': 'Live data from Supabase',
  'ยังไม่มีข้อมูลแพ็กเกจ': 'No package data yet',
  'จัดการข้อมูลทั่วไป แบรนด์ ช่องทางการชำระเงิน และการเชื่อมต่อต่าง ๆ': 'Manage general information, branding, payment methods, and integrations.',
  'ข้อมูลทั่วไป': 'General',
  'แบรนด์และโลโก้': 'Brand & logo',
  'ช่องทางชำระเงิน': 'Payment methods',
  'ระบบอีเมล (SMTP)': 'Email system (SMTP)',
  'การเชื่อมต่อ LINE OA': 'LINE OA integration',
  'พร้อมเพย์ (PromptPay)': 'PromptPay',
  'โดเมนและเว็บไซต์': 'Domain & website',
  'แก้ไขข้อมูลด้านล่างแล้วกดบันทึกการตั้งค่า': 'Edit the settings below, then save your changes.',
  'ชื่อระบบ': 'System name',
  'เขตเวลา': 'Time zone',
  'ภาษาเริ่มต้น': 'Default language',
  'บันทึกการตั้งค่า': 'Save settings',
  'ข้อมูลลับสำหรับระบบจริงควรจัดเก็บในพื้นที่ปลอดภัยหรือตัวแปรสภาพแวดล้อมเซิร์ฟเวอร์': 'Keep production secrets in secure storage or server environment variables.'
}

export const reverseInterfaceTranslations = Object.fromEntries(
  Object.entries(interfaceTranslations).map(([thai, english]) => [english, thai])
)

export function translateInterfaceText(source: string, language: Language) {
  if (!source) return source
  const dictionary = language === 'en' ? interfaceTranslations : reverseInterfaceTranslations
  return Object.entries(dictionary)
    .sort(([left], [right]) => right.length - left.length)
    .reduce((result, [from, to]) => result.includes(from) ? result.split(from).join(to) : result, source)
}

function InterfaceTranslator({ language }: { language: Language }) {
  const textOriginals = useRef(new WeakMap<Text, string>())
  const inputOriginals = useRef(new WeakMap<HTMLElement, { placeholder?: string; title?: string; ariaLabel?: string }>())

  useEffect(() => {
    const translateNode = (node: Text) => {
      if (node.parentElement?.closest('[data-language-toggle]')) return
      const source = textOriginals.current.get(node) ?? node.nodeValue ?? ''
      if (!textOriginals.current.has(node)) textOriginals.current.set(node, source)
      const target = translateInterfaceText(source, language)
      if (node.nodeValue !== target) node.nodeValue = target
    }

    const translateElementAttrs = (el: HTMLElement) => {
      if (el.closest('[data-language-toggle]')) return
      let saved = inputOriginals.current.get(el)
      if (!saved) {
        saved = {
          placeholder: (el as HTMLInputElement).placeholder || undefined,
          title: el.title || undefined,
          ariaLabel: el.getAttribute('aria-label') || undefined,
        }
        inputOriginals.current.set(el, saved)
      }

      if (saved.placeholder && (el as HTMLInputElement).placeholder !== undefined) {
        const target = translateInterfaceText(saved.placeholder, language)
        if ((el as HTMLInputElement).placeholder !== target) {
          (el as HTMLInputElement).placeholder = target
        }
      }
      if (saved.ariaLabel && el.getAttribute('aria-label') !== null) {
        const target = translateInterfaceText(saved.ariaLabel, language)
        if (el.getAttribute('aria-label') !== target) {
          el.setAttribute('aria-label', target)
        }
      }
    }

    const translateTree = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) translateNode(root as Text)
      if (root.nodeType === Node.ELEMENT_NODE) translateElementAttrs(root as HTMLElement)

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      let node = walker.nextNode()
      while (node) {
        translateNode(node as Text)
        node = walker.nextNode()
      }

      if (root.nodeType === Node.ELEMENT_NODE) {
        const inputs = (root as HTMLElement).querySelectorAll('input, textarea, select, [aria-label]')
        inputs.forEach(el => translateElementAttrs(el as HTMLElement))
      }
    }

    translateTree(document.body)

    const observer = new MutationObserver(records => records.forEach(record => {
      record.addedNodes.forEach(node => translateTree(node))
      if (record.type === 'characterData') translateNode(record.target as Text)
      if (record.type === 'attributes' && record.target instanceof HTMLElement) {
        translateElementAttrs(record.target)
      }
    }))

    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'aria-label'] })
    return () => observer.disconnect()
  }, [language])

  return null
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem('smartpos-language') === 'en' ? 'en' : 'th')
  useEffect(() => {
    localStorage.setItem('smartpos-language', language)
    document.documentElement.lang = language
  }, [language])

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage,
      toggleLanguage: () => setLanguage(current => current === 'th' ? 'en' : 'th'),
      t: key => translations[language]?.[key] || (key as string)
    }}>
      {children}
      {typeof window !== 'undefined' && window.location.pathname.startsWith('/admin') && <InterfaceTranslator language={language} />}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider')
  return context
}

export function translateText(value: string, language: Language) {
  if (!value) return value
  return translateInterfaceText(value, language)
}

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { language, toggleLanguage, t } = useLanguage()
  return (
    <button
      type="button"
      data-language-toggle
      onClick={toggleLanguage}
      aria-label={language === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
      className={`rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-700 shadow-sm transition hover:border-orange-300 hover:text-orange-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 ${className}`}
    >
      {t('language')}
    </button>
  )
}
