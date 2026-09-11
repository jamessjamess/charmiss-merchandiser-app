# Charmiss Merchandiser Project

## Project Overview

โครงการ **Charmiss Merchandiser** เป็นระบบสำหรับช่วยบริหารงานหน้าร้านของ Merchandiser โดยเริ่มจาก Use Case ของร้าน **Tofu Skincare** และสามารถขยายไปใช้กับลูกค้า Retail / Modern Trade อื่น เช่น Watsons, EVEANDBOY และร้านค้าอื่นในอนาคต

เป้าหมายหลักคือใช้ IT เข้ามาช่วยลดการพึ่งพา Sales รายบุคคล และทำให้ข้อมูลจากหน้าร้านถูกเก็บอย่างเป็นระบบ สามารถนำไปใช้ตรวจสอบการสั่งสินค้า, สร้าง Purchase Request (PR), ติดตามปัญหาหน้าร้าน และใช้เป็นหลักฐานย้อนหลังได้

ระบบถูกออกแบบเป็น **Mobile-first Web App / Merchandiser App** สำหรับใช้งานระหว่าง Store Visit และเชื่อมโยงกับ Back Office, Physical Inventory Website และ Workflow การสั่งสินค้า

**สถานะปัจจุบัน**: มี Prototype ที่ใช้งานได้จริง (ไม่ใช่แค่ Mockup นิ่ง) พัฒนาด้วย Vanilla JS ล้วน ไม่มี Framework/Build step เก็บข้อมูลด้วย `localStorage` แบ่งเป็น 2 หน้าหลัก — `index.html` (แอปของ Mer) และ `admin.html` (ปฏิทินจัดตารางเข้าสาขา ใช้ร่วมกันทั้ง Admin และ Mer)

---

## Business Pain Points

- ไม่มี Sales ดูแล Account อย่างต่อเนื่อง
- บริหาร Shelf หน้าร้านไม่ดี
- สินค้าหมด Shelf แต่ไม่มีคนเติม
- Order ที่ร้านสั่งเข้ามาไม่มีคนตรวจสอบว่าเหมาะสมหรือไม่
- ไม่มีระบบติดตามว่า Order ถูกส่งหรือดำเนินการแล้วหรือยัง
- การนับสินค้าและ Audit เดิมพึ่งพา Excel
- รูปถ่ายและ Notes กระจัดกระจาย ตรวจสอบย้อนหลังยาก
- ไม่สามารถเชื่อมข้อมูล Store Visit กับ PR / PO / Inventory ได้อย่างเป็นระบบ
- ไม่มีระบบวางตารางเข้าสาขาล่วงหน้า ทำให้ Mer/Admin ไม่เห็นภาพรวมว่าใครต้องเข้าสาขาไหนวันไหน

---

## Project Objectives

1. ช่วย Merchandiser ทำงานหน้าร้านได้เร็วและเป็นขั้นตอน
2. รองรับ Routine Visit / Audit โดยไม่บังคับนับสินค้าทุกครั้ง ยกเว้นสาขาที่กำหนดไว้เป็นพิเศษ
3. เก็บข้อมูล Stock Count แบบเป็นระบบสำหรับสาขาที่ต้องเปิด PR
4. เก็บ GPS/Manual, เวลา, รูป และ Notes เป็นหลักฐาน
5. เชื่อม Stock Count กับการสร้าง PR พร้อม Lock ข้อมูลหลังสร้าง
6. ให้ Admin/PIC วางตารางเข้าสาขาล่วงหน้า และปรับตารางกลางเดือนได้
7. ให้ Mer ดูย้อนหลัง PR ที่เคยสร้างได้เองผ่านแอป
8. รองรับการเชื่อมต่อกับ Inventory และ PO Analysis ในอนาคต
9. ทำให้ข้อมูลหน้าร้านถูกใช้ต่อในการวิเคราะห์ Order และ Replenishment ได้

---

## Job Types

ต่างจากแนวคิดเดิมที่แยก Job Type เป็น "Shelf Count" กับ "Routine Visit / Audit" คนละ Flow กัน — เวอร์ชันปัจจุบันรวมเป็น **Flow เดียว** ต่อ Visit โดยระบบตรวจจาก Store ID เองว่าสาขานั้นต้องมี Step เพิ่มหรือไม่ Mer ไม่ต้องเลือก Job Type เอง

### Routine Visit (ทุกสาขา)

Flow มาตรฐานที่ใช้กับทุกสาขา:

`เลือกสาขาจากรายชื่อวันนี้ → Check-in (ถ่ายภาพหน้าสาขา + GPS/Manual) → ถ่ายภาพ Before → จัดการสินค้าที่ชั้นวาง → Tester → POSM → NPD → ยืนยันจบงานหลัก → บันทึกข้อมูลเชิงลึก (Phase 3) → สรุปงาน/ยืนยันส่งรายงาน → Check-out`

### Stock Count & PR (เฉพาะสาขาที่กำหนด — ปัจจุบันมีแค่ Tofu Skincare)

ไม่ใช่ Job Type แยกที่เลือกเอง — ระบบแทรก Step นี้เข้าไปใน Flow เดียวกันกับ Routine Visit โดยอัตโนมัติ ทันทีที่ต่อจาก "ถ่ายภาพ Before" และก่อน "จัดการสินค้าที่ชั้นวาง" เสมอ เพราะต้องนับสภาพสต๊อกจริงตอนมาถึงก่อนเริ่มจัดเรียง/เติมของ (ไม่งั้นตัวเลขจะไม่ตรงสภาพจริง)

เผื่ออนาคตมีสาขาอื่นต้องใช้ Flow นี้เพิ่ม แค่เพิ่ม Store ID เข้ารายการเดียวในโค้ด ไม่ต้องแก้ Flow อื่น

---

## Check-in

ระบบ Check-in ปัจจุบัน:

- บังคับถ่ายภาพหน้าสาขา (ภายนอก) ก่อนกดเช็คอินได้เสมอ ใช้เป็นหลักฐานว่าอยู่หน้าร้านจริง
- พยายามอ่านพิกัด GPS อัตโนมัติเมื่อกดเช็คอิน — ถ้าอ่านได้ ถือว่าเช็คอินผ่านทันที (ตัด Feature เทียบระยะห่างกับพิกัด Branch Master ออกแล้ว)
- ถ้าอ่าน GPS ไม่ได้ (ไม่อนุญาตสิทธิ์/สัญญาณอ่อน) จะเปิดหน้าจอ Manual Check-in ให้ระบุเหตุผลก่อนไปต่อ
- เก็บ Check-in Time, Customer, Branch, Visit ID ให้อัตโนมัติ

---

## Stock Count & PR Module

*(เดิมชื่อ "Shelf Count Module" — ปรับให้ตรงกับพฤติกรรมจริง)*

### SKU Navigation

- ขอบเขต SKU: เฉพาะ Planogram ของสาขานั้น (ไม่ใช่ทั้ง Catalog ของระบบ)
- ค้นหา/สแกนได้ 2 ทาง:
  - พิมพ์ Barcode / SKU / ชื่อสินค้า แล้วกด "ค้นหา"
  - สแกนด้วยกล้อง (ใช้ `BarcodeDetector` Web API — รองรับหลักๆ บน Chrome/Android เท่านั้น เบราว์เซอร์ที่ไม่รองรับหรือขอสิทธิ์กล้องไม่ได้ จะแจ้งให้พิมพ์ค้นหาแทนโดยไม่ทำให้แอปพัง)
- แสดง SKU Chips เรียงตาม Planogram พร้อมสถานะนับแล้ว (✓) แบบ Real-time เลื่อนซ้าย/ขวาดูทั้งหมดได้
- เลือกทีละ SKU ขึ้นมาโฟกัส กรอกจำนวนแล้วกด "ยืนยันรายการนี้" ต่อตัว ระบบเลื่อนไป SKU ที่ยังไม่นับให้อัตโนมัติ

### Product Card (การ์ดสินค้าที่โฟกัสอยู่)

แสดง: ชื่อสินค้า, SKU, Barcode, Par Level

### Quantity Input

กรอกด้วยปุ่ม `+ / -` เท่านั้น (ตัดการพิมพ์ตัวเลขตรงออกเพื่อความเร็วและกันพิมพ์ผิด)

ใช้กับ: สินค้าดี, สินค้าชำรุด, Tester ดี, Tester ชำรุด

### Suggest PR

- **ไม่โชว์อัตโนมัติ** ทันทีที่นับครบทุก SKU — ต้องกดปุ่ม "สร้าง PR" ก่อน ถึงจะคำนวณและแสดงรายการแนะนำ
- คำนวณจาก `Par Level − จำนวนสินค้าดีที่นับได้` เฉพาะ SKU ที่ยังขาด (SKU ที่ครบ/เกิน Par จะไม่ขึ้นในรายการ)
- แก้จำนวนที่แนะนำได้อิสระก่อนกดยืนยันจริง
- ถ้าไม่มี SKU ไหนขาดเลย ระบบแจ้ง "สินค้าครบตาม Par ทุกรายการ" และให้กดยืนยันว่าไม่ต้องสั่งแทน

### ยืนยันก่อน Lock

ทั้งกด **"สร้าง PR"** และ **"ยืนยันไม่ต้องสั่ง PR"** ต้องผ่าน Confirmation Modal เตือนก่อนเสมอว่า "หลังจากนี้จะแก้ไขจำนวนที่นับสต๊อกไม่ได้อีก" ก่อนจะ Lock จริง

### หลัง Lock

หน้าจอเปลี่ยนเป็นสรุปอย่างเดียว (อ่านง่ายแบบเดียวกับการ์ดในรายงาน PR — ไม่ใช่ตัวเลขเรียงกันเป็นบรรทัดเดียวแบบเดิม) ไม่มีช่องค้นหา/ปุ่มแก้ไขเหลือให้กด เพื่อไม่ให้เข้าใจผิดว่าใช้งานไม่ได้

---

## PR Business Rule

### ก่อนสร้าง PR

Merchandiser ยังสามารถแก้จำนวนที่นับ และแก้จำนวนที่แนะนำสั่งได้อิสระ

### หลังสร้าง PR (หรือยืนยันไม่ต้องสั่ง)

ระบบ Lock Stock Count ของ Visit นั้นทันที แก้จำนวนไม่ได้อีก แต่เปิดดูผลที่บันทึกไว้ได้ตลอด

**Data Relationship**

`Visit ID → Stock Count → PR`

---

## Purchase Request Report

*(เดิมชื่อ "Purchase Request Detail" — เพิ่มเป็นหน้ารายงานแยกใน Bottom Nav)*

เข้าถึงได้จากแท็บ **"รายงาน PR"** ใน Bottom Nav ดูย้อนหลังได้ทุก PR ที่เคยสร้าง (ทุกสาขา/ทุก Mer ไม่กรองเฉพาะของตัวเอง)

รูปแบบเลขที่ PR: `PR-YYYYMMDD-NNN` (นับต่อวัน)

การ์ดแต่ละใบแสดง:

- Header: เลขที่ PR, สาขา, วันที่สร้าง, Badge สถานะ "Created"
- แถวสถิติ 3 กล่อง: จำนวน SKU, จำนวนชิ้นรวม, รหัสอ้างอิง Visit แบบย่อ
- รายละเอียดรายสินค้า: SKU chip, ชื่อสินค้า, Barcode, Count ดี/ชำรุดที่นับได้, จำนวนที่แนะนำสั่ง

---

## Routine Visit / Audit

### Before Photo

ถ่ายภาพรวมหน้าร้าน/เคาน์เตอร์ก่อนเริ่มงาน (มุมเดิมทุกรอบ) — เป็น **Hard Gate**: ต้องถ่ายอย่างน้อย 1 ภาพก่อนถึงจะไป Step อื่นในหน้าเดียวกันได้

### จัดการสินค้าที่ชั้นวาง (Product)

ตัด List SKU + Par Level ที่ต้องกรอกทีละตัวออกแล้ว (เพื่อความเร็ว) เหลือ Checklist 4 ข้อ แต่ละข้อมีปุ่ม "แจ้งปัญหา" แบบเลือกได้หลาย SKU ต่อเนื่อง (พิมพ์ค้นหา/สแกนได้เหมือน Stock Count):

1. เติมสินค้า/จัดเรียงตาม Planogram
2. เช็ควันหมดอายุ + เรียงตาม FIFO
3. ตรวจสอบสินค้าอายุต่ำกว่าเกณฑ์
4. ราคา/ป้าย/โปรโมชั่นถูกต้อง

ปิดท้ายด้วยถ่ายรูปชั้นวางที่จัดเสร็จแล้ว (บังคับอย่างน้อย 1 ภาพ)

แต่ละ Checklist ถือว่า "ผ่าน" ได้ 2 ทาง: ติ๊กว่าเรียบร้อย **หรือ** แจ้งปัญหาไว้แทน (ขึ้น Badge "✓ ผ่าน" / "⚠ ต้องทำ" กำกับให้เห็นชัด)

### Tester

- บันทึก Tester ที่พบว่าหมด "ก่อนเติม" (ไม่บังคับ ไว้เป็นหลักฐานย้อนหลัง)
- เช็คปริมาณ + เติมเรียบร้อย (Checklist)
- หมดและไม่มีของเติม → ขอเทสเตอร์ใหม่/เบิกรอบหน้า (แจ้งได้หลาย SKU ต่อเนื่อง)
- ถ่ายรูปชั้น/Zone ที่วาง Tester หลังทำเสร็จ (บังคับอย่างน้อย 1 ภาพ)

### POSM

Checklist เดียว: เช็คสภาพ/การติดตั้ง/ตำแหน่งเรียบร้อย **หรือ** ติ๊ก "พบปัญหา POSM (ชำรุด/สื่อใหม่ยังไม่ถึง/ติดตั้งไม่ได้)" พร้อมถ่ายรูปประกอบ (บังคับถ้าติ๊กว่าพบปัญหา)

### NPD

เช็คว่าสินค้าใหม่ (NPD) เข้าครบตามที่ควรมีหรือยัง มี 3 ตัวเลือก:

1. ✅ เข้าครบแล้ว
2. ⚠ เข้าเพียงบางส่วน — ต้องระบุเพิ่มว่าตัวไหน/รายการไหนยังขาด
3. ❌ ยังไม่มีเข้า

### ยืนยันจบงานหลัก

*(แทนที่ "After Photo" เดิม)* — ตัดการถ่ายภาพ After แยกออก เพราะซ้ำซ้อนกับรูปที่แต่ละส่วนถ่ายเองอยู่แล้ว (Product/Tester/POSM) แทนที่ด้วยหน้าเช็คลิสต์สรุปสถานะทุก Step ในหน้านี้ (✓ ผ่าน / ⚠ ยังไม่เสร็จ ต่อ Step) พร้อมปุ่ม **"ยืนยันงานหลักเสร็จสมบูรณ์"** — กดได้ก็ต่อเมื่อทุก Step ก่อนหน้าผ่านครบเท่านั้น

---

## Issue / Action to Back Office

**สถานะ: ยังไม่ Implement เป็น Module รวมศูนย์** — แนวคิดเดิม (ประเภทปัญหา + Team Assignment อัตโนมัติ + Severity) ยังไม่ได้สร้างเป็นหน้าจอแยก

ปัจจุบันปัญหาแต่ละประเภทถูกบันทึกกระจายอยู่ในแต่ละ Step แทน (ไม่มี Team Assignment/Severity แนบมาด้วย):

| เก็บอยู่ใน Step | ข้อมูลที่บันทึก |
|---|---|
| Product | รายการ SKU ที่แจ้งปัญหาการเติม / อายุต่ำกว่าเกณฑ์ / ราคาไม่ตรง |
| Tester | SKU ที่ขอเทสเตอร์ใหม่/เบิกรอบหน้า |
| POSM | Flag พบปัญหา POSM + รูปประกอบ |

ดู [Future Development](#future-development) สำหรับแผนทำเป็น Module รวมในอนาคต

---

## Phase 3 Notes

ใช้เก็บข้อมูลเพิ่มเติมจากหน้าร้าน ไม่บังคับ บันทึกได้หลายรายการ

Tag ตัวอย่าง: คู่แข่ง, คำขอจากร้าน, Feedback หน้าร้าน, ปัญหาร้าน, อื่น ๆ

รองรับ Notes + ถ่ายรูป/Upload รูป หรือเลือก "ไม่มีข้อมูลเพิ่มเติมจากหน้าร้าน" ถ้าไม่มีอะไรจะบันทึก

---

## Summary Confirmation

เมื่อกด **"ยืนยันส่งรายงาน"** ระบบแสดง Confirmation Modal ก่อนเสมอ กันกดปิดงานโดยไม่ตั้งใจ ยืนยันแล้วเข้าสู่หน้า Check-out และปิด Visit (จำลองการส่งเข้า Group Line)

---

## Completed Visit

กลับไปดู Visit ที่เสร็จแล้วได้โดยกดเข้าสาขาเดิมซ้ำจากหน้า "งานที่ต้องทำ" — ระบบรู้จากสถานะ "เสร็จแล้ว" แล้วพาไปหน้าสรุป (Phase 4) แบบ Read-only ให้ดูข้อมูลทั้งหมดของ Visit นั้น

**ยังไม่มี** หน้า "Home" แยกที่ List ประวัติ Visit ทั้งหมดไว้ดูย้อนหลังทีเดียว (ดู Future Development)

---

## Photos Menu

**สถานะ: ยังไม่ Implement เป็นเมนูแยก** — รูปทั้งหมดอยู่กระจายตามแต่ละ Step (Before, Product, Tester, POSM, Phase 3 Notes) และแสดงรวมกันเฉพาะในหน้าสรุป Phase 4 ของ Visit นั้นเท่านั้น ยังไม่มีหน้ารวมรูปข้าม Visit/ข้ามสาขา

---

## Main Navigation

Bottom Navigation (4 รายการ ใช้ร่วมกันหน้า "งานที่ต้องทำ" และ "โปรไฟล์"):

- 📋 **งานที่ต้องทำ** — รายชื่อสาขาที่ต้องเข้าวันนี้ + ความคืบหน้ารายวัน
- 📅 **ปฏิทิน** — ตารางเข้าสาขา (ลิงก์ไป `admin.html`)
- 🧾 **รายงาน PR** — ดู PR ย้อนหลังทั้งหมด
- 👤 **โปรไฟล์** — แก้ไขข้อมูลส่วนตัว/เปลี่ยนรหัสผ่าน/ออกจากระบบ

ไม่แสดง Bottom Nav ระหว่างอยู่ใน Flow เข้าสาขา (Check-in/ทุก Step ของ Routine Visit) เพราะมีปุ่มย้อนกลับ + Step Navigation ของตัวเองอยู่แล้ว

---

## Admin Scheduling Calendar

*(ใหม่ — ไม่มีในแนวคิดตั้งต้น)*

หน้า `admin.html` ใช้ร่วมกันทั้ง Admin/PIC (จัดตาราง) และ Mer (ดูตารางของตัวเอง) ยังไม่มีระบบสิทธิ์แยกในเวอร์ชันนี้

- Admin/PIC วางตาราง Monthly Visit ต่อ Mer เป็นรายวัน ไม่บังคับลำดับ/เวลาเข้าในแต่ละวัน ยกเว้นสาขาที่มีเงื่อนไขพิเศษ (เช่น Tofu ต้องเข้าช่วงร้านเปิด — ไฮไลท์เป็นสีต่างให้เห็นชัด)
- ลากการ์ดสาขา (Drag & Drop) ย้ายวันได้โดยตรง หรือแตะการ์ดเปิดเมนู "ย้ายวัน / ลบ" แบบ Google Calendar
- สลับมุมมอง เดือน / สัปดาห์ / วัน ได้
- Default เป็น **มุมมองสัปดาห์แบบ Mobile-first** เสมอ (อ่านง่ายกว่าบนจอเล็ก) มีปุ่ม **"โหมด Desktop"** ให้สลับเป็นมุมมองเดือนแบบ Grid เต็มจอเอง
- ปุ่ม Reset ข้อมูลทดสอบทั้งหมด (มี Confirm ก่อนเสมอ)

---

## Login & Profile

*(ใหม่ — ยังเป็น Mock ไม่ใช่ Auth จริง)*

- หน้า Login แบบ Username + Password จำลอง พร้อมปุ่ม Preset เข้าสู่ระบบด่วนสำหรับ Mer 3 คน (ไว้ทดสอบ/Demo)
- หน้าโปรไฟล์: แก้ไขชื่อที่แสดง, เบอร์โทรติดต่อ, รูปโปรไฟล์, เปลี่ยนรหัสผ่าน (ตรวจรหัสเดิมก่อนเปลี่ยน)
- ปุ่ม **"รีเซ็ตข้อมูลทดสอบ/Demo"** เข้าถึงได้ 3 จุด (หน้า Login, หน้า Admin Calendar, หน้าโปรไฟล์) ต้อง Confirm ก่อนเสมอ ล้าง `localStorage` ทั้งหมดแล้วเริ่มข้อมูลใหม่

---

## Important Business Rules

1. **One Visit Context** — Customer / Branch / Visit ID ต้องใช้ชุดเดียวกันทั้ง Flow
2. **Store-scoped Stock Count** — เฉพาะสาขาที่ระบุไว้เท่านั้นที่มี Step "นับสต๊อก & PR" (ปัจจุบันคือ Tofu) ระบบตรวจจาก Store ID อัตโนมัติ ไม่ให้ Mer เลือกเอง
3. **Stock Count Editable Before PR / Locked After** — ก่อนสร้าง PR แก้จำนวนได้ สร้าง PR (หรือยืนยันไม่ต้องสั่ง) แล้ว Lock ทันที
4. **Confirm Before Lock** — ต้องผ่าน Modal เตือนก่อนทุกครั้งที่จะ Lock Stock Count
5. **PR Traceability** — PR ต้องย้อนกลับไปหา Visit และ Stock Count ต้นทางได้
6. **Before Photo Hard Gate** — ต้องถ่ายภาพ Before ก่อน ถึงจะไป Step อื่นในหน้าเข้าสาขาได้
7. **Sub-item Satisfied Two Ways** — Checklist ที่บังคับ ผ่านได้ทั้งติ๊กว่าเรียบร้อย หรือแจ้งปัญหาไว้แทน แสดง Badge ผ่าน/ต้องทำกำกับเสมอ
8. **Main Work Confirmation Instead of Duplicate After Photo** — Step สุดท้ายของ Routine Visit เป็นการยืนยันแบบเช็คลิสต์ ไม่ใช่การถ่ายภาพซ้ำ
9. **POSM No Issue = No Block** — ถ้าไม่พบปัญหา POSM ไม่ต้องถ่ายรูป ไม่ Block การไป Step อื่น
10. **Photos Belong to Visit** — รูปทั้งหมดผูกกับ Visit ที่กำลังทำอยู่
11. **Completed Visit Is Read-only** — Visit ที่ปิดแล้วเปิดดูซ้ำได้แต่แก้ไขไม่ได้
12. **Manual Reset Only** — ล้างข้อมูลทดสอบต้องกดเองเท่านั้น ห้าม Auto-clear ตอนโหลดหน้า เพราะ `index.html`/`admin.html` ใช้ `localStorage` ร่วมกัน

---

## Proposed Data Relationship

```text
Customer
   │
   └── Branch
         │
         └── Visit
              ├── Check-in / Check-out
              ├── GPS / Manual Reason
              ├── Before Photo
              │
              ├── Stock Count & PR (เฉพาะสาขาที่กำหนด)
              │     ├── SKU Count (ดี/ชำรุด/Tester ดี/ชำรุด)
              │     └── PR
              │
              ├── Product / Tester / POSM / NPD
              │     ├── Checklist ผ่าน/ไม่ผ่าน
              │     ├── รายการแจ้งปัญหาแต่ละ Step
              │     └── รูปประกอบแต่ละ Step
              │
              ├── ยืนยันจบงานหลัก
              │
              └── Phase 3 Notes
                    ├── Tag
                    ├── Detail
                    └── Photos
```

---

## Integration with Tofu Skincare Management

ภาพรวม Solution (เป้าหมายระยะยาว — ปัจจุบัน Implement ถึงขั้นตอน "Purchase Request" เท่านั้น):

```text
Merchandiser
   ↓
Stock Count / Store Visit
   ↓
Purchase Request
   ↓
Tofu Skincare
   ↓
Purchase Order
   ↓
Charmiss
   ↓
Import PO เข้า Physical Inventory Website
   ↓
OCR อ่าน PO
   ↓
รวมข้อมูล
- PO
- Warehouse Inventory
- Stock Count / Merchandiser App
   ↓
PO Recommendation / Order Review Report
   ↓
Admin
   ↓
Authorized Person Approval
```

---

## Future Development

### Phase 1 (ต่อยอดจาก Prototype ปัจจุบัน)

- Real Auth / Role Permission (ปัจจุบัน Login ยังเป็น Mock)
- Real Database (ปัจจุบันเก็บใน `localStorage` ของเบราว์เซอร์ ไม่ Sync ข้ามเครื่อง)
- Customer / Branch / Product Master ที่แก้ไขได้จริง (ปัจจุบันเป็น Mock Data ในโค้ด)
- Save Draft / Offline Queue
- Image Upload Storage จริง (ปัจจุบันเก็บเป็น Base64 ใน `localStorage`)
- Issue / Action to Back Office เป็น Module รวมศูนย์ (พร้อม Team Assignment + Severity)
- Photos Menu แบบรวมรูปข้าม Visit
- หน้า "Home" List ประวัติ Visit ที่เสร็จแล้วทั้งหมด
- เสถียรภาพการสแกน Barcode ข้าม Browser (ปัจจุบันรองรับหลักบน Chrome/Android ผ่าน `BarcodeDetector`)

### Phase 2

- Notification
- Dashboard / Store Score / SLA Tracking
- Route Planning ต่อยอดจาก Admin Scheduling Calendar
- Supervisor Review
- Advanced Photo Comparison (Before/After)
- Competitor Survey
- POSM Campaign Master

### Phase 3

- Physical Inventory Integration
- PO Import / OCR
- Automated PR / PO Recommendation
- Sales Movement / Aging Inventory / Replenishment Analytics
- Automated Alert

---

## Prototype Status

Prototype ปัจจุบันพัฒนาไกลกว่า Static Mockup เดิม (v12.2) แล้ว — เป็น **Vanilla JS Web App ที่ใช้งานได้จริงระหว่างพัฒนา** (ไม่มี Framework/Build step) แบ่งเป็น `index.html` (แอป Mer) + `admin.html` (ปฏิทิน Admin) เก็บข้อมูลด้วย `localStorage`

จุดประสงค์ยังเหมือนเดิม:

- Review UX / UI
- Validate Operation Flow
- ใช้คุยกับ Merchandiser และ Developer
- ใช้กำหนด Business Rule ก่อน Development จริง

ยังไม่เชื่อมต่อ Database/Backend จริง จึงยังไม่ใช่ Production Application

---

## Project Success Criteria

Project ถือว่าประสบความสำเร็จเมื่อ:

- Merchandiser ทำ Store Visit โดยไม่ใช้ Excel
- ข้อมูลหน้างานครบและตรวจสอบย้อนหลังได้
- Stock Count เชื่อม PR ได้ พร้อม Lock ข้อมูลหลังสร้าง
- PR มี Traceability กลับไปหา Visit ต้นทางได้
- Admin วางตารางเข้าสาขาล่วงหน้าได้ และปรับกลางเดือนได้สะดวก
- ร้านที่ไม่มีปัญหา POSM ไม่ติด Workflow
- Management ใช้ข้อมูล Store Visit ร่วมกับ Inventory และ PO เพื่อพิจารณาการสั่งสินค้าได้ในอนาคต

---

## Summary

**Charmiss Merchandiser** ไม่ได้เป็นเพียง App สำหรับนับสินค้า แต่เป็น **Store Visit Operation Platform** ที่ครอบคลุม:

`Check-in → [Stock Count & PR เฉพาะสาขาที่กำหนด] → Product / Tester / POSM / NPD → ยืนยันจบงานหลัก → Notes → สรุปงาน → Historical Review`

ระบบช่วยเปลี่ยนงาน Merchandiser จากกระบวนการที่อาศัย Excel, รูปถ่าย และการติดตามแบบ Manual ให้กลายเป็น Workflow ที่ตรวจสอบได้ เชื่อมข้อมูลได้ พร้อมตารางเข้าสาขาที่วางแผนล่วงหน้าได้ และพร้อมต่อยอดไปสู่ Order Recommendation และ Inventory Management ในอนาคต
