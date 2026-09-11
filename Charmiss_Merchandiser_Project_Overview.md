# Charmiss Merchandiser Project

## Project Overview

โครงการ **Charmiss Merchandiser** เป็นระบบสำหรับช่วยบริหารงานหน้าร้านของ Merchandiser โดยเริ่มจาก Use Case ของร้าน **Tofu Skincare** และสามารถขยายไปใช้กับลูกค้า Retail / Modern Trade อื่น เช่น Watsons, EVEANDBOY และร้านค้าอื่นในอนาคต

เป้าหมายหลักคือใช้ IT เข้ามาช่วยลดการพึ่งพา Sales รายบุคคล และทำให้ข้อมูลจากหน้าร้านถูกเก็บอย่างเป็นระบบ สามารถนำไปใช้ตรวจสอบการสั่งสินค้า, สร้าง Purchase Request (PR), ติดตามปัญหาหน้าร้าน และใช้เป็นหลักฐานย้อนหลังได้

ระบบถูกออกแบบเป็น **Mobile-first Web App / Merchandiser App** สำหรับใช้งานระหว่าง Store Visit และเชื่อมโยงกับ Back Office, Physical Inventory Website และ Workflow การสั่งสินค้า

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

---

## Project Objectives

1. ช่วย Merchandiser ทำงานหน้าร้านได้เร็วและเป็นขั้นตอน
2. แยกประเภทงานตาม Store Visit จริง
3. เก็บข้อมูล Shelf Count แบบเป็นระบบ
4. รองรับ Routine Visit / Audit โดยไม่บังคับนับสินค้าทุกครั้ง
5. เก็บ GPS, เวลา, รูป และ Notes เป็นหลักฐาน
6. เชื่อม Shelf Count กับการสร้าง PR
7. ล็อกข้อมูลการนับหลังสร้าง PR
8. ให้ Back Office ตรวจสอบ Visit และ Issue ย้อนหลังได้
9. รองรับการเชื่อมต่อกับ Inventory และ PO Analysis
10. ทำให้ข้อมูลหน้าร้านถูกใช้ต่อในการวิเคราะห์ Order และ Replenishment ได้

---

## Job Types

### 1. Shelf Count

ใช้เมื่อ Merchandiser ต้องเข้าไปนับสินค้าหน้าร้าน

**Flow**

`เลือก Customer / Branch → Check-in → Shelf Count → Review → Create PR → Lock Count → View PR`

ข้อมูลที่เก็บต่อ SKU:

- SKU
- Barcode
- Product Name
- สินค้าดี
- สินค้าชำรุด
- Tester ดี
- Tester ชำรุด
- Notes
- สถานะนับเสร็จ / ยังไม่เสร็จ

มีรูปภาพรวม Shelf / หน้าร้านแบบระดับ Visit ไม่ผูกกับ SKU รายตัว

### 2. Routine Visit / Audit

ใช้เมื่อ Merchandiser เข้าไปเติมสินค้า ตรวจความเรียบร้อย หรือทำ Audit โดยไม่จำเป็นต้องนับสินค้าทุกครั้ง

**Flow**

`Check-in → Before Photo → Product / Expiry / FIFO → Tester → POSM → Price → After Photo → Issue → Phase 3 Notes → Summary → Check-out`

---

## Check-in

ระบบ Check-in ถูกออกแบบให้:

- บันทึก GPS อัตโนมัติเมื่อเปิดหน้า Check-in
- เก็บ Check-in Time
- เก็บ Customer
- เก็บ Branch
- เก็บ Visit ID
- เก็บ Job Type
- เปรียบเทียบตำแหน่งจริงกับพิกัด Branch Master
- ถ้าอยู่นอก Allowed Radius ให้ระบุเหตุผล Manual Check-in
- ถ้าอ่าน GPS ไม่ได้ ให้ระบุเหตุผลก่อนดำเนินการต่อ

---

## Shelf Count Module

### SKU Navigation

รองรับ:

- Search SKU
- Search Barcode
- Search Product Name
- Scan Barcode
- Previous / Next SKU
- SKU Chips / Horizontal SKU Navigation
- แสดงสถานะ SKU ที่นับเสร็จแล้ว

### Product Card

แสดง:

- รูปสินค้า
- Product Name
- SKU
- Barcode

### Quantity Input

กรอกได้ 2 วิธี:

- กด `+ / -`
- พิมพ์ตัวเลขโดยตรง

ใช้กับ:

- สินค้าดี
- สินค้าชำรุด
- Tester ดี
- Tester ชำรุด

### Shelf Photos

- ถ่ายรูป
- แนบรูป
- รองรับหลายรูป
- Preview รูป
- ลบรูปก่อน Lock
- รูปเป็นระดับ Visit ไม่ผูกกับ SKU รายตัว

---

## Shelf Count Summary

แสดง:

- SKU ที่นับครบ
- จำนวนสินค้าดี / ชำรุด
- จำนวน Tester ดี / ชำรุด

ปุ่มหลัก:

**Create PR**

---

## PR Business Rule

### ก่อนสร้าง PR

Merchandiser ยังสามารถ:

- แก้ Count
- แก้ Notes
- เพิ่ม / ลบรูป

### หลังสร้าง PR

ระบบ Lock Shelf Count ของ Visit นั้นทันที

ไม่สามารถ:

- แก้จำนวนสินค้า
- แก้ Notes
- เปลี่ยนข้อมูล Count
- แก้รูป Shelf Count

แต่สามารถเปิดดู PR ที่สร้างแล้วได้

**Data Relationship**

`Visit ID → Shelf Count → PR`

---

## Purchase Request Detail

หน้า PR รองรับการดูรายละเอียดรายสินค้า:

- PR Number
- Visit ID
- Store
- SKU
- Barcode
- Product Name
- Count
- PR Qty

หน้า Completed Visit ของงาน Shelf Count จะแสดง PR ที่เกิดจาก Visit นั้นด้วย

---

## Routine Visit / Audit

### Before Photo

ถ่ายภาพรวมหน้าร้านก่อนเริ่มงานเพื่อใช้เทียบกับ After Photo

### Product / Expiry / FIFO / Planogram

ตรวจสอบ:

- Stock / Par Level
- เติมสินค้าหน้าร้าน
- FIFO
- Expiry
- Planogram
- ความเรียบร้อยของสินค้า

รองรับ:

- Notes
- ถ่ายรูป Notes
- แนบรูป Notes

### Tester

ตรวจสอบ:

- Tester ครบหรือไม่
- Tester ต้องเปลี่ยนหรือไม่
- ปริมาณ
- ความสะอาด

รองรับ:

- Complete
- Issue
- N/A
- Notes
- ถ่ายรูป
- แนบรูป

### POSM

มีสถานะ:

- มี Campaign Running
- ไม่มี Campaign

หากเลือก **ไม่มี Campaign**

- ไม่ต้องติ๊ก POSM Checklist
- POSM จะไม่ Block การไป Phase 3

รองรับ Notes และรูปประกอบ

### Price Audit

ตรวจสอบ:

- ราคาตรงมาตรฐาน
- ป้ายราคาตรง SKU
- Promotion ถูกต้อง
- ป้ายเก่าถูกถอดออกหรือไม่

รองรับ Notes และรูปประกอบ

### After Photo

ถ่ายภาพหลังแก้ไขหรือจัด Shelf เรียบร้อยแล้ว เพื่อเทียบกับ Before Photo

---

## Issue / Action to Back Office

ใช้บันทึกปัญหาที่พบระหว่าง Visit

### ข้อมูลหลัก

1. ประเภทของปัญหา
2. SKU ที่พบปัญหา
3. รายละเอียด
4. รูปประกอบ
5. ทีมที่รับผิดชอบ

### ประเภทของปัญหา

- Out of Stock
- Expiry
- Tester
- Price
- Display
- POSM

### SKU Selection

รองรับ:

- Search SKU
- Search Barcode
- Search Product Name
- Scan Barcode
- เลือกหลาย SKU ต่อ 1 Issue

### Team Assignment

ระบบ Assign ทีมอัตโนมัติ เช่น:

| Issue Type | Assigned Team |
|---|---|
| Out of Stock | Supply Chain / Sales |
| Expiry | Supply Chain / QA |
| Tester | Trade Marketing |
| Price | Pricing / KAE |
| Display | Merchandising Supervisor |
| POSM | Trade Marketing / Brand |

ปัจจุบันไม่มี Field Severity

### Issue Photos

ใต้ Field รายละเอียดมี:

- ถ่ายรูป
- แนบรูป
- รองรับหลายรูป
- Preview รูป

---

## Phase 3 Notes

ใช้เก็บข้อมูลเพิ่มเติมจากหน้าร้าน

Tag ตัวอย่าง:

- คู่แข่ง
- คำขอจากร้าน
- Feedback หน้าร้าน
- ปัญหาร้าน
- อื่น ๆ

รองรับ:

- Notes
- ถ่ายรูป
- Upload รูป

หากไม่มีข้อมูลเพิ่มเติม สามารถเลือก:

**ไม่มีข้อมูลเพิ่มเติมจากหน้าร้าน**

---

## Summary Confirmation

เมื่อกด **สรุปงาน**

ระบบจะแสดง Confirmation Modal ก่อน เพื่อป้องกันการกดปิดงานโดยไม่ตั้งใจ

หลังยืนยันจะเข้าสู่หน้า Summary เพื่อเตรียม Check-out และปิด Visit

---

## Completed Visit

หน้า Home สามารถเปิดดู Visit ที่เสร็จแล้วแบบ Read-only

### Routine Visit

แสดง:

- Check-in
- Check-out
- GPS
- Audit Result
- Issue
- Phase 3 Notes
- รูป

### Shelf Count

แสดง:

- Shelf Count Summary
- Good / Damaged Qty
- Tester Qty
- Phase 3 Notes
- PR ที่สร้าง
- PR Detail รายสินค้า

---

## Photos Menu

มีเมนู **Photos** สำหรับดูรูปที่แนบทั้งหมดของแต่ละ Visit

รูปอาจมาจาก:

- Before
- After
- Shelf Count
- Product Notes
- Tester Notes
- POSM Notes
- Price Notes
- Issue
- Phase 3 Notes

ข้อมูลรูปควรผูกกับ:

`Visit ID + Photo Type + Timestamp + User`

---

## Main Navigation

Bottom Navigation:

- Home
- Task
- Notes
- Photos
- PR

---

## Important Business Rules

1. **One Visit Context** — Customer / Branch / Visit ID ต้องใช้ชุดเดียวกันทั้ง Flow
2. **GPS Capture** — GPS บันทึกอัตโนมัติใน Check-in
3. **Shelf Count Editable Before PR** — ก่อนสร้าง PR สามารถแก้ Count ได้
4. **Shelf Count Locked After PR** — สร้าง PR แล้ว Count ต้อง Lock
5. **PR Traceability** — PR ต้องย้อนกลับไปหา Visit และ Shelf Count ต้นทางได้
6. **Audit Does Not Require Shelf Count** — Routine Visit ไม่บังคับนับสินค้า
7. **POSM No Campaign** — หากไม่มี Campaign ต้องไม่ Block Workflow
8. **Issue Can Contain Multiple SKU** — 1 Issue ผูกหลาย SKU ได้
9. **Photos Belong to Visit** — รูปทั้งหมดต้องมี Visit ID
10. **Completed Visit Is Read-only** — Visit ที่ปิดแล้วใช้ดูย้อนหลัง

---

## Proposed Data Relationship

```text
Customer
   │
   └── Branch
         │
         └── Visit
              ├── Job Type
              ├── Check-in / Check-out
              ├── GPS
              │
              ├── Shelf Count
              │     ├── SKU Count
              │     ├── Shelf Photos
              │     └── PR
              │
              ├── Audit
              │     ├── Product / Expiry
              │     ├── Tester
              │     ├── POSM
              │     ├── Price
              │     └── Before / After Photos
              │
              ├── Issues
              │     ├── Issue Type
              │     ├── SKU(s)
              │     ├── Notes
              │     ├── Photos
              │     └── Assigned Team
              │
              └── Phase 3 Notes
                    ├── Tag
                    ├── Detail
                    └── Photos
```

---

## Integration with Tofu Skincare Management

ภาพรวม Solution:

```text
Merchandiser
   ↓
Shelf Count / Store Visit
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
- Shelf Count / Merchandiser App
   ↓
PO Recommendation / Order Review Report
   ↓
Admin
   ↓
Authorized Person Approval
```

---

## Future Development

### Phase 1

- User Login / Role Permission
- Customer Master
- Branch Master
- Product Master
- Real Database
- Save Draft
- Offline Queue
- Image Upload Storage
- GPS Validation
- Shelf Count
- Audit
- Issue
- PR
- Completed Visit

### Phase 2

- Notification
- Back Office Issue Management
- Dashboard
- Store Score
- SLA Tracking
- Route Planning
- Visit Schedule
- Supervisor Review
- Advanced Photo Comparison
- Competitor Survey
- POSM Campaign Master

### Phase 3

- Physical Inventory Integration
- PO Import
- OCR
- Automated PR / PO Recommendation
- Sales Movement
- Aging Inventory
- Replenishment Analytics
- Automated Alert

---

## Prototype Status

Prototype ปัจจุบันพัฒนามาถึงประมาณ **Version 12.2**

จุดประสงค์:

- Review UX / UI
- Validate Operation Flow
- ใช้คุยกับ Merchandiser
- ใช้คุยกับ Developer
- ใช้กำหนด Business Rule ก่อน Development จริง

Prototype ยังเป็น Single HTML และใช้ Sample Data บางส่วน จึงยังไม่ใช่ Production Application

---

## Project Success Criteria

Project ถือว่าประสบความสำเร็จเมื่อ:

- Merchandiser ทำ Store Visit โดยไม่ใช้ Excel
- ข้อมูลหน้างานครบและตรวจสอบย้อนหลังได้
- รูปและ Notes ไม่กระจัดกระจาย
- Shelf Count เชื่อม PR ได้
- PR มี Traceability กลับไปหา Visit
- Back Office รู้ Issue และทีมที่ต้องดำเนินการ
- ร้านที่ไม่มี Campaign หรือไม่มี Issue ไม่ติด Workflow
- Management ใช้ข้อมูล Store Visit ร่วมกับ Inventory และ PO เพื่อพิจารณาการสั่งสินค้าได้

---

## Summary

**Charmiss Merchandiser** ไม่ได้เป็นเพียง App สำหรับนับสินค้า แต่เป็น **Store Visit Operation Platform** ที่ครอบคลุม:

`Check-in → Shelf Count / Audit → Evidence → Issue → Notes → PR → Summary → Historical Review`

ระบบช่วยเปลี่ยนงาน Merchandiser จากกระบวนการที่อาศัย Excel, รูปถ่าย และการติดตามแบบ Manual ให้กลายเป็น Workflow ที่ตรวจสอบได้ เชื่อมข้อมูลได้ และพร้อมต่อยอดไปสู่ Order Recommendation และ Inventory Management ในอนาคต
