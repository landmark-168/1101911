# 🗺️ SmartPOS Platform — เอกสารผังลำดับขั้นตอนการทำงานของผู้ใช้งาน (User Flow Specification)

> **โครงการ:** SmartPOS Platform (ระบบบริหารจัดการร้านอาหารและจุดขายแบบคลาวด์ Multi-tenant)  
> **เอกสารอ้างอิง:** [REQUIREMENTS.md](./REQUIREMENTS.md)

---

## สารบัญ (Table of Contents)
1. [ภาพรวมของ User Flow ในระบบ (System Architecture & Journey Overview)](#1-ภาพรวมของ-user-flow-ในระบบ)
2. [Flow 1: ลูกค้า (Customer Journey — สั่งอาหารหน้าร้าน & Delivery)](#flow-1-ลูกค้า-customer-journey)
3. [Flow 2: พนักงานแคชเชียร์และบริการ (Cashier & Service Staff Flow — POS)](#flow-2-พนักงานแคชเชียร์และบริการ-cashier--service-staff-flow)
4. [Flow 3: ห้องครัว (Kitchen Display System - KDS Flow)](#flow-3-ห้องครัว-kitchen-display-system---kds-flow)
5. [Flow 4: เจ้าของร้าน (Store Owner Flow — ตั้งค่าและจัดการร้าน)](#flow-4-เจ้าของร้าน-store-owner-flow)
6. [Flow 5: ผู้ดูแลระบบหลัก (Super Admin Flow — แพลตฟอร์มส่วนกลาง)](#flow-5-ผู้ดูแลระบบหลัก-super-admin-flow)
7. [การทำงานร่วมกันแบบเรียลไทม์ระหว่างบทบาท (Cross-Role End-to-End Flow)](#7-การทำงานร่วมกันแบบเรียลไทม์ระหว่างบทบาท-cross-role-end-to-end-flow)
8. [เส้นทางกรณีผิดพลาด (Error & Recovery Flow)](#8-เส้นทางกรณีผิดพลาด-error--recovery-flow)

---

## 1. ภาพรวมของ User Flow ในระบบ

ระบบ **SmartPOS** แบ่งกลุ่มผู้ใช้งานหลักออกเป็น 5 กลุ่มที่มีปฏิสัมพันธ์ต่อเนื่องกันแบบ Real-time:

```mermaid
graph TD
    subgraph Customers["1. ลูกค้า (Customer)"]
        C1[สแกน QR โต๊ะ / เข้าเว็บหน้าร้าน] --> C2[เลือกเมนู + Option]
        C2 --> C3[ส่งออเดอร์เข้าครัว / สั่ง Delivery]
    end

    subgraph ServicePOS["2. แคชเชียร์/พนักงาน (POS)"]
        P1[ปลดล็อก PIN หน้าร้าน] --> P2[เปิดโต๊ะ / รับออเดอร์ / สรุปบิล]
        P2 --> P3[รับชำระเงินสด / PromptPay / บัตร]
    end

    subgraph Kitchen["3. ห้องครัว (KDS)"]
        K1[จอ KDS รับออเดอร์ทันที + เสียงเตือน] --> K2[กด 'กำลังปรุง' Preparing]
        K2 --> K3[กด 'พร้อมเสิร์ฟ' Ready]
    end

    subgraph StoreOwner["4. เจ้าของร้าน (Store Owner)"]
        O1[จัดการเมนู / ราคา / ตัวเลือก]
        O2[ผังโต๊ะ & QR Code]
        O3[จัดการพนักงาน & โปรโมชัน]
        O4[ดูรายงานยอดขาย & กำไร]
    end

    subgraph SuperAdmin["5. ผู้ดูแลระบบ (Super Admin)"]
        A1[อนุมัติ/จัดการร้านค้า]
        A2[จัดการแพ็กเกจ & Subscription]
        A3[ตรวจดูรายได้รวมของ Platform]
    end

    C3 -.->|Realtime WebSocket| K1
    C3 -.->|Sync ยอด| P2
    P3 -.->|บันทึกยอดขาย| O4
    P3 -.->|บันทึกสถิติ| O4
    O4 -.->|รายงานรายได้แพลตฟอร์ม| A3
```

---

## Flow 1: ลูกค้า (Customer Journey)

### 1.1 การสั่งอาหารที่โต๊ะด้วย QR Code (Dine-in QR Ordering)
ลูกค้าเดินเข้าร้าน นั่งประจำโต๊ะ และสั่งอาหารด้วยตนเองผ่านมือถือ:

```mermaid
sequenceDiagram
    autonumber
    actor Customer as 👤 ลูกค้า
    participant Storefront as 📱 Mobile Storefront
    participant DB as ⚡ Realtime DB
    participant Kitchen as 👨‍🍳 KDS ครัว
    participant POS as 🖥️ แคชเชียร์ POS

    Customer->>Storefront: 1. สแกน QR Code ประจำโต๊ะ (เช่น โต๊ะ 04)
    Storefront->>Customer: 2. แสดงเมนูอาหาร รูปภาพ ราคา และโปรโมชัน
    Customer->>Storefront: 3. เลือกอาหาร, ตัวเลือกพิเศษ (หวานน้อย/ไม่ใส่ผัก)
    Customer->>Storefront: 4. ตรวจสอบตะกร้าสินค้า (Cart Review)
    Customer->>Storefront: 5. กดยืนยันสั่งอาหาร (Submit Order)
    Storefront->>DB: 6. บันทึก Order (status: 'pending', table: '04')
    par Realtime Broadcast
        DB-->>Kitchen: ส่งออเดอร์เข้าจอ KDS ทันที (พร้อมเสียงแจ้งเตือน)
        DB-->>POS: อัปเดตยอดโต๊ะ 04 บนผังโต๊ะของแคชเชียร์
    end
    Storefront-->>Customer: 7. แสดงหน้าติดตามสถานะอาหาร (กำลังทำ ➔ เสิร์ฟแล้ว)
```

**ขั้นตอนการทำงาน (Step-by-step):**
1. **สแกน QR Code:** ลูกค้าใช้กล้องมือถือสแกน QR Code ที่ติดอยู่บนโต๊ะ ระบบจะเปิดเว็บแอปพลิเคชันโดยระบุเลขโต๊ะโดยอัตโนมัติ
2. **เลือกเมนู:** ค้นหาและคัดกรองตามหมวดหมู่ (เครื่องดื่ม, อาหารจานหลัก, ของทานเล่น)
3. **ปรับแต่งรายการ (Item Customization):** เลือกขนาด, ระดับความหวาน, เพิ่มท็อปปิ้ง และระบุหมายเหตุ
4. **ยืนยันการสั่ง:** กดส่งรายการ ระบบส่งข้อมูลผ่าน Supabase Realtime ไปยังห้องครัวและแคชเชียร์ทันที
5. **ติดตามสถานะ & เรียกพนักงาน:** ลูกค้าดูสถานะการปรุงอาหาร และสามารถกดปุ่ม "เรียกพนักงาน" หรือ "ขอเช็กบิล" ได้

---

### 1.2 การสั่งอาหารแบบส่งถึงบ้าน (Delivery Order)

```mermaid
flowchart TD
    Start([ลูกค้าเข้าหน้าเว็บร้านค้า]) --> SelectType{เลือกรูปแบบการสั่ง}
    SelectType -->|รับที่ร้าน| Takeaway[เลือกเวลารับสินค้า]
    SelectType -->|จัดส่ง| Delivery[กรอกที่อยู่จัดส่ง & เบอร์โทร]
    
    Takeaway --> Browse[เลือกรายการอาหารลงตะกร้า]
    Delivery --> CalcDist[ระบบคำนวณระยะทาง & ค่าจัดส่ง]
    CalcDist --> Browse
    
    Browse --> Review[ตรวจสอบรายการและยอดรวม]
    Review --> PayMethod{เลือกวิธีชำระเงิน}
    PayMethod -->|PromptPay QR| QR[ลูกค้าสแกน QR Code และชำระเงิน]
    PayMethod -->|บัตรเครดิต| Stripe[ชำระผ่าน Stripe Gateway]
    PayMethod -->|เก็บเงินปลายทาง| COD[ชำระเงินสดเมื่อได้รับอาหาร]
    
    QR --> VerifyPayment{พนักงานตรวจสอบยอดชำระด้วยตนเอง}
    VerifyPayment -->|ยอดถูกต้อง| Submit[ยืนยันคำสั่งซื้อ]
    VerifyPayment -->|ยอดไม่ถูกต้อง/ไม่พบยอด| PayMethod
    Stripe --> Submit
    COD --> Submit
    
    Submit --> Track[หน้าติดตามสถานะคำสั่งซื้อแบบ Live Tracking]
```

---

## Flow 2: พนักงานแคชเชียร์และบริการ (Cashier & Service Staff Flow)

```mermaid
flowchart TD
    A([เริ่มกะการทำงาน]) --> B[เข้าสู่ระบบ / กรอกรหัส PIN 4-6 หลัก]
    B --> C{ตรวจสอบสิทธิ์}
    C -->|PIN ถูกต้อง| D[หน้าแดชบอร์ดจุดขาย POS]
    C -->|PIN ผิดพลาด| B

    D --> E{เลือกการทำงาน}
    E --> F[เปิดโต๊ะใหม่ / เลือกลูกค้า Walk-in]
    E --> G[จัดการโต๊ะปัจจุบัน]
    E --> H[ดูออเดอร์เดลิเวอรี / สั่งกลับบ้าน]

    F --> I[กดเลือกเมนูลงบิล POS]
    I --> J[เลือกท็อปปิ้ง / ส่วนลด / หมายเหตุ]
    J --> K[กดยืนยัน 'ส่งเข้าครัว']

    G --> L[ลูกค้าแจ้งขอเช็กบิล]
    L --> M[ตรวจสอบรายการอาหาร + ส่วนลดคูปอง]
    M --> N[เลือกช่องทางชำระเงิน]
    
    N -->|เงินสด| O1[กรอกเงินที่รับ -> คำนวณเงินทอน]
    N -->|PromptPay| O2[แสดง QR Code ให้ลูกค้าสแกนชำระ]
    N -->|บัตรเครดิต| O3[รูดบัตร/บันทึกการชำระ]

    O1 --> P[พิมพ์ใบเสร็จย่อ Receipt]
    O2 --> V{พนักงานตรวจสอบยอดชำระด้วยตนเอง}
    V -->|ยอดถูกต้อง| P
    V -->|ยอดไม่ถูกต้อง/ไม่พบยอด| N
    O3 --> P
    
    P --> Q[ปิดโต๊ะ -> โต๊ะเปลี่ยนสถานะเป็น 'ว่าง' พร้อมรับลูกค้าใหม่]
    Q --> R([สิ้นสุดรอบบริการ / ล็อกหน้าจอ POS])
```

---

## Flow 3: ห้องครัว (Kitchen Display System - KDS Flow)

```mermaid
stateDiagram-v2
    [*] --> เข้าคิว_Pending: ออเดอร์ใหม่เข้ามา (มีเสียงแจ้งเตือน 🔔)
    
    เข้าคิว_Pending --> กำลังปรุง_Preparing: พนักงานครัวกดปุ่ม 'เริ่มปรุง'
    note right of กำลังปรุง_Preparing
        ตัวจับเวลานับเดินหน้า
        (เขียว -> ส้ม -> แดง เมื่อรอนานเกิน 15 นาที)
    end note

    กำลังปรุง_Preparing --> ปรุงเสร็จแล้ว_Ready: พนักงานครัวกด 'พร้อมเสิร์ฟ'
    
    ปรุงเสร็จแล้ว_Ready --> เสิร์ฟแล้ว_Served: พนักงานเสิร์ฟมารับอาหารไปส่งที่โต๊ะ
    
    เข้าคิว_Pending --> ยกเลิก_Cancelled: ยกเลิกออเดอร์ (ระบุเหตุผล เช่น วัตถุดิบหมด)
    กำลังปรุง_Preparing --> ยกเลิก_Cancelled: ลูกค้ายกเลิกกะทันหัน
    
    เสิร์ฟแล้ว_Served --> เสร็จสมบูรณ์_Completed: แคชเชียร์ปิดบิล
    เสร็จสมบูรณ์_Completed --> [*]: ย้ายออเดอร์ไปแท็บประวัติ
    ยกเลิก_Cancelled --> [*]: บันทึกประวัติการยกเลิก
```

---

## Flow 4: เจ้าของร้าน (Store Owner Flow)

### 4.1 การตั้งค่าเริ่มต้นและการเตรียมเปิดร้าน (Store Onboarding & Setup)
```mermaid
flowchart TD
    Reg([สมัครสมาชิก Store Owner]) --> Verify[ยืนยันตัวตน Email]
    Verify --> CreateShop[สร้างร้านค้า: ชื่อร้าน, หมวดหมู่, เบอร์โทร]
    CreateShop --> SubPack[เลือกแพ็กเกจ: Starter / Business / Enterprise]
    SubPack --> PaySub[ชำระค่าบริการแพ็กเกจ]
    PaySub --> PayResult{ชำระเงินสำเร็จหรือไม่}
    PayResult -->|ไม่สำเร็จ| SubPack
    PayResult -->|สำเร็จ| Dash[เข้าสู่หน้าระบบจัดการร้าน Store Owner Portal]
    
    Dash --> S1[1. ตั้งค่าร้าน: เวลาเปิด-ปิด, โลโก้, ค่าส่ง, ภาษี VAT]
    S1 --> S2[2. จัดการหมวดหมู่และเมนูอาหาร + อัปโหลดรูป]
    S2 --> S3[3. จัดการผังโต๊ะ & ดาวน์โหลด QR Code ไปติดที่โต๊ะ]
    S3 --> S4[4. เพิ่มบัญชีพนักงานและกำหนดรหัส PIN แคชเชียร์]
    S4 --> S5[5. ผูกบัญชีรับเงิน PromptPay QR]
    S5 --> Ready([พร้อมเปิดร้านและรับออเดอร์!])
```

### 4.2 การจัดการประจำวัน (Daily Management & Operations)
- **จัดการโปรโมชัน (Promotions):** สร้างโค้ดส่วนลด กำหนดวันหมดอายุและเงื่อนไขยอดซื้อขั้นต่ำ
- **จัดการลูกค้า (Customer Management):** ดูข้อมูลลูกค้า ประวัติคำสั่งซื้อ จำนวนครั้งที่ใช้บริการ และยอดซื้อสะสมเฉพาะภายในร้านของตนเอง
- **จัดการ Subscription:** ดูแพ็กเกจ สถานะ วันหมดอายุ ต่ออายุหรือยกเลิกบริการ และตรวจสอบสิทธิ์ของแพ็กเกจ
- **รายงานและการเงิน (Reports & Analytics):**
  - กราฟสรุปยอดขายแบบ Live (วันนี้, สัปดาห์นี้, เดือนนี้)
  - รายงานสินค้าขายดี (Top Sellers) และช่วงเวลายอดฮิต (Peak Hours)
  - ส่งออกไฟล์รายงานยอดขาย (Export CSV / PDF) เพื่อส่งฝ่ายบัญชี

---

## Flow 5: ผู้ดูแลระบบหลัก (Super Admin Flow)

```mermaid
flowchart TD
    LoginAdmin([เข้าสู่ระบบ Super Admin Portal]) --> AdminDash[แดชบอร์ดภาพรวมทั้งแพลตฟอร์ม]
    
    AdminDash --> M1[จัดการร้านค้า Store Management]
    AdminDash --> M2[จัดการแพ็กเกจ Package Management]
    AdminDash --> M3[ตรวจสอบรายได้รวม Platform Revenue]
    AdminDash --> M4[จัดการสมาชิก Users & Roles]
    AdminDash --> M5[ตั้งค่าระบบกลาง System Settings]

    M1 -->|ตรวจสอบร้านค้าใหม่| A_Approve[อนุมัติ / ระงับการใช้งาน / ลบร้านค้า]
    M2 -->|กำหนดแผนราคา| A_Price[สร้างแพ็กเกจ, ปรับราคาเดือน/ปี, กำหนดสิทธิ์การใช้งาน]
    M3 -->|ตรวจสอบธุรกรรม| A_Rev[ดูรายงานรายได้ค่า Subscription ของทุกร้าน]
    M4 -->|ดูแลความปลอดภัย| A_User[เปลี่ยนสิทธิ์ผู้ใช้, รีเซ็ตรหัสผ่าน]
    M5 -->|โครงสร้างพื้นฐาน| A_Config[ตั้งค่าระบบอีเมล SMTP, โดเมน, และช่องทางชำระเงิน]
```

---

## 7. การทำงานร่วมกันแบบเรียลไทม์ระหว่างบทบาท (Cross-Role End-to-End Flow)

ตัวอย่างลำดับเหตุการณ์จริงเมื่อมีลูกค้าเดินเข้ามาทานอาหารในร้าน:

```mermaid
sequenceDiagram
    autonumber
    actor Customer as 👤 ลูกค้า (โต๊ะ 02)
    actor Waiter as 🧑‍💼 บริการ/แคชเชียร์ (POS)
    actor Chef as 👨‍🍳 ครัว (KDS)
    actor Owner as 👔 เจ้าของร้าน (Portal)

    Note over Customer, Waiter: ขั้นตอนที่ 1: ลูกค้าสั่งอาหาร
    Customer->>Customer: สแกน QR โต๊ะ 02 ➔ สั่ง กะเพราเนื้อไข่ดาว + ชามะนาว
    Customer->>Chef: ส่งรายการอาหารผ่าน WebSocket ไปยังจอ KDS ทันที
    Customer->>Waiter: อัปเดตสถานะโต๊ะ 02 บน POS กลายเป็น 'มีลูกค้า/กำลังทำ'

    Note over Chef, Waiter: ขั้นตอนที่ 2: ครัวเตรียมอาหาร
    Chef->>Chef: ได้ยินเสียงแจ้งเตือน 🔔 กดยอมรับออเดอร์ (Preparing)
    Chef->>Chef: ปรุงเสร็จแล้ว กดปุ่ม 'พร้อมเสิร์ฟ' (Ready)
    Chef-->>Waiter: แจ้งเตือนพนักงานให้มารับอาหารไปเสิร์ฟ
    Chef-->>Customer: หน้าจอมือถือลูกค้าขึ้นสถานะ 'อาหารพร้อมเสิร์ฟแล้ว'

    Note over Customer, Waiter: ขั้นตอนที่ 3: เช็กบิลและชำระเงิน
    Customer->>Waiter: ลูกค้าแจ้งขอเช็กบิล
    Waiter->>Waiter: เปิดโต๊ะ 02 บน POS สรุปยอดรวม (รวม VAT 7%)
    Waiter->>Customer: แสดง QR PromptPay ให้สแกนจ่าย
    Customer->>Waiter: สแกน QR และชำระเงิน
    Waiter->>Waiter: ตรวจสอบยอดชำระด้วยตนเองและกดยืนยัน
    Waiter->>Waiter: กด 'ปิดบิล' และพิมพ์ใบเสร็จ

    Note over Waiter, Owner: ขั้นตอนที่ 4: การปรับปรุงข้อมูลหลังบ้าน
    Waiter->>Owner: 1. บันทึกยอดขายและอัปเดตสถิติลูกค้าอัตโนมัติ
    Waiter->>Owner: 2. ยอดขายเพิ่มขึ้นบนแดชบอร์ดสรุปรายได้ของเจ้าของร้านทันที
    Waiter->>Customer: โต๊ะ 02 ปิดบิลเรียบร้อย สถานะกลับมาเป็น 'โต๊ะว่าง'
```

---

## 8. เส้นทางกรณีผิดพลาด (Error & Recovery Flow)

```mermaid
flowchart TD
    Start([ผู้ใช้เริ่มทำรายการ]) --> Check{ตรวจสอบรายการ}
    Check -->|QR ไม่ถูกต้อง/โต๊ะปิด| QRFail[แจ้งว่า QR ใช้งานไม่ได้และไม่เปิดออเดอร์]
    Check -->|PIN ผิด| PINFail[แจ้งข้อผิดพลาดและนับจำนวนครั้ง]
    Check -->|เมนูหมด| ItemFail[แจ้งเมนูไม่พร้อมขายและให้เลือกใหม่]
    Check -->|คูปองไม่ผ่านเงื่อนไข| CouponFail[แสดงเหตุผลและคงยอดเดิม]
    Check -->|ข้อมูลถูกต้อง| Submit[ส่งออเดอร์หรือเริ่มชำระเงิน]
    Submit --> Payment{ผลการชำระเงิน}
    Payment -->|ล้มเหลว| Retry[แจ้งข้อผิดพลาดและให้ลองใหม่หรือเปลี่ยนวิธี]
    Payment -->|สำเร็จ| Duplicate{ตรวจสอบรายการซ้ำ}
    Duplicate -->|ซ้ำ| Existing[แสดงรายการเดิมโดยไม่สร้างรายการใหม่]
    Duplicate -->|ไม่ซ้ำ| Complete([บันทึกรายการสำเร็จ])
    Submit -->|เครือข่ายขัดข้อง| Offline[เก็บสถานะชั่วคราวและแจ้งผู้ใช้]
    Offline --> Reconnect{เชื่อมต่อกลับมาแล้วหรือไม่}
    Reconnect -->|แล้ว| Duplicate
    Reconnect -->|ยัง| Offline
```

---

## สรุปคุณสมบัติเด่นของ User Flow ใน SmartPOS
1. **Near Real-time Synchronization:** ทุกการกระทำ (สั่งอาหาร, เปลี่ยนสถานะครัว, ชำระเงิน) ซิงค์ข้อมูลผ่าน Supabase Realtime โดย POS และ KDS ต้องได้รับอัปเดตภายใน 500 มิลลิวินาที
2. **Device Independence:** ใช้งานได้บนทุกอุปกรณ์ (iPad, Android Tablet, สมาร์ตโฟน, คอมพิวเตอร์ PC หน้าร้าน)
3. **Role Segregation (ความปลอดภัยแยกตามหน้าที่):** พนักงานหน้าร้านใช้รหัส PIN เข้าถึงเฉพาะ POS/KDS โดยไม่สามารถเข้าถึงข้อมูลการเงินส่วนตัวของเจ้าของร้านได้
4. **Bilingual Support:** สลับใช้งานภาษาไทยและภาษาอังกฤษได้ลื่นไหลทุกจุดสัมผัส (Touchpoints)
