# SmartPOS Platform

ระบบบริหารจัดการร้านอาหารและจุดขายแบบคลาวด์ Multi-tenant (Cloud Restaurant POS & Store Management Platform)

## 📖 เอกสารโครงการ (Project Documentation)
- 📋 ข้อกำหนดความต้องการระบบ (SRS / PRD): 👉 **[REQUIREMENTS.md](file:///Users/x/Documents/GitHub/1101911/REQUIREMENTS.md)**
- 🗺️ แผนผังลำดับการใช้งาน (User Flow Specification): 👉 **[USERFLOW.md](file:///Users/x/Documents/GitHub/1101911/USERFLOW.md)**

---

## 🚀 ฟีเจอร์หลัก (Key Modules)
1. **Super Admin Platform:** จัดการร้านค้า, แพ็กเกจสมาชิก, รายได้, ผู้ใช้งาน และตั้งค่าระบบส่วนกลาง
2. **Store Owner Portal:** จัดการเมนู, ผังโต๊ะ & QR Code, สต็อกสินค้า, พนักงาน & รหัส PIN, โปรโมชัน และสถิติ
3. **Point of Sale (POS):** จุดขายหน้าร้าน, รับออเดอร์, ออกบิล, คำนวณเงิน และชำระเงินหลายรูปแบบ
4. **Kitchen Display System (KDS):** หน้าจอห้องครัวอัปเดตเรียลไทม์ พร้อมเสียงแจ้งเตือน
5. **Customer E-Menu & Ordering:** สแกน QR สั่งอาหารจากโต๊ะ หรือสั่งแบบกลับบ้าน / เดลิเวอรี
6. **Bilingual Support (i18n):** รองรับภาษาไทย (TH) และภาษาอังกฤษ (EN) แบบสมบูรณ์

---

## 💻 วิธีการติดตั้งและรันโปรเจกต์ (Getting Started)

```bash
cd platform

# ติดตั้ง Dependencies
npm install

# รัน Development Server
npm run dev

# ตรวจสอบและ Build สำหรับ Production
npm run build
```