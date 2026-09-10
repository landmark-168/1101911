# 📋 SmartPOS Platform — เอกสารข้อกำหนดความต้องการระบบ (Software Requirements Specification - SRS)

> **โครงการ:** SmartPOS Platform (ระบบบริหารจัดการร้านอาหารและจุดขายแบบคลาวด์ Multi-tenant)  

---

## 1. บทนำและภาพรวมของระบบ (System Overview)

**SmartPOS** เป็นแพลตฟอร์มระบบขายหน้าร้าน (Point of Sale - POS) และระบบบริหารจัดการร้านอาหารแบบครบวงจรบนระบบคลาวด์ (Cloud-based Multi-tenant Restaurant Platform) รองรับการใช้งานของร้านอาหารทุกขนาด ตั้งแต่ร้านขนาดเล็ก (Starter), ธุรกิจขนาดกลาง (Business) ไปจนถึงธุรกิจแฟรนไชส์หรือหลายสาขา (Enterprise)

ระบบเชื่อมต่อการทำงานแบบเรียลไทม์ (Real-time Synchronization) ระหว่าง:
1. **ระบบบริหารจัดการส่วนกลาง (Super Admin Platform)**
2. **ระบบหลังบ้านของเจ้าของร้าน (Store Owner Portal)**
3. **ระบบแคชเชียร์และจุดขายหน้าร้าน (POS Terminal)**
4. **ระบบหน้าจอห้องครัว (Kitchen Display System - KDS)**
5. **ระบบสั่งอาหารออนไลน์และ QR Code ประจำโต๊ะ (Customer Self-Ordering & Storefront)**

---

## 2. กลุ่มผู้ใช้งานและบทบาทในระบบ (User Roles & Permissions)

```
┌─────────────────────────────────────────────────────────────┐
│                       Super Admin                           │
│     (จัดการร้านค้า, แพ็กเกจ, รายได้, สมาชิก, ตั้งค่าระบบ)           │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                       Store Owner                           │
│   (จัดการเมนู, โต๊ะ/QR, สต็อก, พนักงาน/PIN, โปรโมชัน, รายงาน)      │
└──────────────┬───────────────┬───────────────┬──────────────┘
               │               │               │
┌──────────────▼─────┐  ┌──────▼──────┐  ┌─────▼──────────────┐
│  Cashier / Service │  │Kitchen Staff│  │      Customer      │
│  (เปิดบิล/รับชำระ) │  │  (KDS ครัว) │  │ (สแกน QR สั่งอาหาร)│
└────────────────────┘  └─────────────┘  └────────────────────┘
```

### 2.1 Super Admin (ผู้ดูแลระบบแพลตฟอร์ม)
- **Store Management:** ตรวจสอบ รายชื่อร้านค้าทั้งหมด อนุมัติร้านค้าใหม่ (Approve), ระงับการใช้งานชั่วคราว (Suspend), แก้ไขข้อมูลร้าน หรือลบร้านค้า
- **Package Management:** สร้าง แก้ไข กำหนดราคาแบบรายเดือน/รายปี และกำหนดรายการฟีเจอร์สำหรับแพ็กเกจ (Starter, Business, Enterprise)
- **Revenue & Analytics:** สรุปรายงานรายได้ ยอดสมัครสมาชิก แผนภูมิการเติบโตของร้านค้าใหม่ในรอบ 6-12 เดือน
- **Members Management:** จัดการบัญชีผู้ใช้งาน สิทธิ์การเข้าถึง (Roles) และสถานะบัญชี
- **System Settings:** ตั้งค่าแบรนด์ (Logo, สีหลัก), ระบบอีเมล SMTP, ช่องทางชำระเงิน Stripe/PromptPay, การเชื่อมต่อ LINE OA และโดเมน

### 2.2 Store Owner & Manager (เจ้าของร้าน / ผู้จัดการร้าน)
- **Store Setup:** ตั้งค่าชื่อร้าน โลโก้ ที่อยู่ เบอร์โทร พิกัดแผนที่ (Latitude/Longitude) และเวลาเปิด-ปิด
- **Menu & Category:** จัดการหมวดหมู่อาหาร รายการเมนู รูปภาพ ราคา ตัวเลือกพิเศษ (Options/Add-ons) และสถานะพร้อมขาย/สินค้าหมด
- **Table & QR Code:** จัดการผังโต๊ะ (Floor Plan / Grid Layout) สร้างและพิมพ์ QR Code ประจำโต๊ะสำหรับให้ลูกค้าสแกนสั่งอาหาร
- **Inventory Management:** บันทึกและตัดสต็อกวัตถุดิบอัตโนมัติตามเมนู พร้อมระบบแจ้งเตือนสินค้าใกล้หมด
- **Employee & PIN Security:** สร้างบัญชีพนักงาน กำหนดตำแหน่ง และตั้งรหัส PIN สำหรับปลดล็อกเครื่อง POS
- **Promotions & Discounts:** จัดการคูปองส่วนลดและโปรโมชันส่งเสริมการขาย
- **Reports & Analytics:** ดูรายงานยอดขายจริง ยอดเฉลี่ยต่อบิล ช่วงเวลาที่ขายดีที่สุด และส่งออกข้อมูล (Export)

### 2.3 Cashier & Service Staff (พนักงานแคชเชียร์ / พนักงานบริการ)
- **Quick PIN Login:** เข้าสู่ระบบ POS รวดเร็วด้วยรหัส PIN
- **Order & Table Management:** เปิดโต๊ะ รับออเดอร์หน้าร้าน เพิ่ม/ลดรายการ ระบุหมายเหตุพิเศษ (เช่น ไม่เผ็ด, หวานน้อย)
- **Payment Processing:** รองรับการชำระเงินสด, สแกน QR PromptPay พร้อมระบบตรวจสอบสลิป, และบัตรเครดิต
- **Receipt Printing:** สั่งพิมพ์ใบเสร็จรับเงินหรือใบแจ้งหนี้แบบย่อ

### 2.4 Kitchen Staff (พนักงานครัว / เชฟ)
- **Live KDS Display:** หน้าจอแสดงรายการอาหารที่ต้องปรุงแบบเรียลไทม์ (Live Orders)
- **Order Tracking:** แยกประเภทออเดอร์ (ทานที่ร้าน, กลับบ้าน, เดลิเวอรี) แสดงเวลาที่สั่ง และเวลาที่รอ
- **Status Update:** กดเปลี่ยนสถานะออเดอร์: `กำลังปรุง (Preparing)` ➔ `ปรุงเสร็จแล้วพร้อมเสิร์ฟ (Ready)` ➔ `ส่งมอบแล้ว (Delivered)`
- **Audio Notification:** ระบบเสียงแจ้งเตือนอัตโนมัติเมื่อมีออเดอร์ใหม่เข้ามา

### 2.5 Customer (ลูกค้า)
- **QR Table Ordering:** สแกน QR Code เพื่อดูเมนูอาหาร เลือกสั่งอาหาร และส่งเข้าห้องครัวได้ทันทีโดยไม่ต้องรอพนักงาน
- **Takeaway & Delivery:** สั่งอาหารล่วงหน้าเพื่อมารับเองที่ร้าน หรือสั่งแบบส่งถึงบ้าน
- **Service Request:** กดปุ่มแจ้งเรียกพนักงาน หรือแจ้งขอเช็กบิลผ่านหน้าจอมือถือ

---

## 3. ข้อกำหนดทางฟังก์ชันการทำงาน (Functional Requirements - FR)

| รหัสข้อกำหนด | โมดูลระบบ | รายละเอียดความต้องการทางฟังก์ชัน |
| :--- | :--- | :--- |
| **FR-01** | ระบบยืนยันตัวตน | รองรับการเข้าสู่ระบบ/สมัครสมาชิกผ่าน Email/Password และระบบ Magic Link / Supabase Auth |
| **FR-02** | ระบบจัดการสิทธิ์ (RBAC) | แยกสิทธิ์ชัดเจนระหว่าง `super_admin`, `store_owner`, `staff`, และ `customer` ด้วย Row Level Security (RLS) |
| **FR-03** | จุดขายหน้าร้าน (POS) | เลือกลงรายการอาหาร คำนวณภาษีมูลค่าเพิ่ม (VAT) ส่วนลด ยอดสุทธิ และส่งออเดอร์เข้าครัวแบบเรียลไทม์ |
| **FR-04** | ระบบความปลอดภัย PIN | ล็อกหน้าจอ POS เมื่อไม่ได้ใช้งาน และต้องใส่รหัส PIN 4-6 หลักเพื่อปลดล็อก |
| **FR-05** | จอแสดงผลครัว (KDS) | อัปเดตสถานะออเดอร์แบบ Real-time WebSocket ผ่าน Supabase Realtime พร้อมตัวนับเวลา |
| **FR-06** | จัดการโต๊ะและผังร้าน | สร้าง/แก้ไข/ลบโต๊ะ กำหนดจำนวนที่นั่ง ดูสถานะโต๊ะว่าง/ไม่ว่าง และดาวน์โหลด QR Code |
| **FR-07** | จัดการสต็อกสินค้า | ระบบตัดสต็อกอัตโนมัติตามส่วนประกอบเมนู และแจ้งเตือนเมื่อวัตถุดิบต่ำกว่าเกณฑ์ |
| **FR-08** | ระบบชำระเงิน | รองรับ เงินสด (Cash), QR พร้อมเพย์ (PromptPay), และบัตรเครดิต (Stripe Payment Gateway) |
| **FR-09** | ระบบสลับภาษา (i18n) | สลับภาษาได้ทันที 2 ภาษา (ไทย และ English) ครอบคลุมทั้ง UI, ป้ายสถานะ, Placeholder และฟอร์มทั้งหมด |
| **FR-10** | ระบบแจ้งเตือน | มีระบบเสียงเตือนออเดอร์ และรองรับการส่งแจ้งเตือนผ่าน LINE Official Account (LINE OA) |
| **FR-11** | แดชบอร์ดและรายงาน | กราฟสรุปยอดขายรายวัน/รายเดือน, รายงานยอดขายตามช่องทาง, รายงานสินค้าขายดี |
| **FR-12** | แบรนด์และปรับแต่ง | รองรับการเปลี่ยน Logo, สีหลักของระบบ (Primary Color), ข้อมูลผู้ติดต่อ และโดเมนเฉพาะ (Custom Domain) |

---

## 4. ข้อกำหนดด้านคุณภาพและคุณลักษณะทางเทคนิค (Non-Functional Requirements - NFR)

1. **ประสิทธิภาพและความเร็ว (Performance & Latency):**
   - หน้าจอ KDS และ POS ต้องได้รับข้อมูลอัปเดตออเดอร์ใหม่ภายในเวลาไม่เกิน **500 มิลลิวินาที** (Realtime WebSocket)
   - ระยะเวลาโหลดหน้าแรก (Initial Page Load) ไม่เกิน 2.0 วินาที

2. **ความพร้อมใช้งานและความเสถียร (Availability & Reliability):**
   - ออกแบบระบบให้รองรับ Service Uptime 99.9% บนโครงสร้างพื้นฐานคลาวด์
   - รองรับการเก็บ State การใช้งานบน Client ชั่วคราวกรณีเครือข่ายขัดข้องสั้น ๆ

3. **ความปลอดภัยของข้อมูล (Security & Privacy):**
   - รหัสผ่านและการเข้าถึงถูกเข้ารหัสตามมาตรฐานความปลอดภัยสูงผ่าน Supabase Auth
   - ข้อมูลแต่ละร้านถูกแยกออกจากกันอย่างเด็ดขาด (Data Isolation) ด้วย PostgreSQL Row Level Security (RLS)
   - รหัส PIN ของพนักงานและ API Keys ฝั่งเซิร์ฟเวอร์ถูกเก็บเป็นความลับ

4. **การรองรับอุปกรณ์ที่หลากหลาย (Responsiveness & Compatibility):**
   - รองรับการใช้งานผ่าน Web Browser มาตรฐาน (Google Chrome, Safari, Edge, Firefox)
   - รองรับอุปกรณ์หลากหลายขนาดหน้าจอ: Smart Phone, Tablet (iPad / Android POS), และ Computer/Laptop

---

## 5. สถาปัตยกรรมทางเทคนิค (Technology Stack)

| ส่วนประกอบ (Component) | เทคโนโลยีที่เลือกใช้ (Technology Stack) |
| :--- | :--- |
| **Frontend Framework** | React 19, Vite, TypeScript, JavaScript (ES Modules) |
| **Styling & UI Engine** | Tailwind CSS, Lucide React Icons, Canvas Confetti |
| **Data Visualization** | Recharts (Area Charts, Bar Charts, Tooltips) |
| **Backend & Cloud DB** | Supabase (PostgreSQL 15+) |
| **Authentication** | Supabase Auth (JWT & Session Token) |
| **Realtime Engine** | Supabase Realtime Channels (WebSockets) |
| **Storage & Assets** | Supabase Storage (ภาพอาหาร, โลโก้ร้าน, สลิปโอนเงิน) |
| **Payment Gateway** | Stripe API, PromptPay QR Generator |
| **Language System** | Built-in Dynamic i18n Translation Engine (TH / EN) |

---

## 6. โครงสร้างฐานข้อมูลหลัก (Database Schema Overview)

```
stores (ข้อมูลร้านค้า)
 ├── id, name, slug, owner_id, phone, email, province, address, status, created_at
 ├── store_packages / subscriptions (ประวัติและแพ็กเกจร้าน)
 ├── categories (หมวดหมู่อาหาร)
 ├── menu_items (รายการอาหาร, ราคา, รูปภาพ, สถานะขาย)
 ├── tables (ข้อมูลโต๊ะ, เลขโต๊ะ, QR Code Token)
 ├── employees (ข้อมูลพนักงาน, ตำแหน่ง, รหัส PIN, สิทธิ์เข้าถึง)
 ├── orders (คำสั่งซื้อ, ยอดรวม, สถานะการชำระ, โต๊ะ)
 │    └── order_items (รายการอาหารในออเดอร์, จำนวน, หมายเหตุ)
 └── payments (ข้อมูลการชำระเงิน, วิธีชำระ, วันที่, เลขที่ใบเสร็จ)
```

---

## 7. แผนการทดสอบและเกณฑ์การตรวจรับ (Testing & Acceptance Criteria)
- [x] **Unit & Build Testing:** ทดสอบ Build ผ่าน `npm run build` ไม่มีข้อผิดพลาด
- [x] **Authentication Flow:** ตรวจสอบการเข้าสู่ระบบ Super Admin, Store Owner และการล็อกอินด้วย PIN ของพนักงาน
- [x] **Real-time Order Lifecycle:** ลูกค้าสั่งอาหาร ➔ POS ได้รับ ➔ KDS ในครัวขึ้นเตือนทันที ➔ เชฟกดเสร็จ ➔ แคชเชียร์เช็กบิล
- [x] **Language Switching:** ทดสอบการกดเปลี่ยนภาษาไทย / ภาษาอังกฤษ ข้อมูลและป้ายสถานะสลับภาษาได้ถูกต้องครบถ้วน 100%
