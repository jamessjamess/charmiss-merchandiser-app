/**
 * mockData.js
 * -----------------------------------------------------------------------
 * Mock "master data" that would normally come from a backend API:
 *   - MOCK_STORES   : สาขา/ลูกค้าทั้งหมดที่ Mer อาจต้องเข้าเยี่ยม (branch master)
 *   - MOCK_MERS     : รายชื่อ Mer ทั้งหมด (ปัจจุบันมี 2 คน)
 *   - SKU_CATALOG   : รายชื่อ SKU ทั้งหมดที่มีในระบบ
 *   - PLANOGRAM     : SKU ที่ควรมีในแต่ละสาขา พร้อม par level (จำนวนมาตรฐาน)
 *
 * "ตารางเข้าสาขารายวัน" ของแต่ละ Mer ไม่ได้อยู่ในไฟล์นี้ — Admin เป็นคนกำหนด
 * ผ่านหน้า admin.html แล้วเก็บไว้ใน ScheduleDataLayer (ดู scheduleDataLayer.js)
 * ไฟล์นี้เก็บแค่ "รายชื่อสาขาที่มีอยู่จริงทั้งหมด" ให้ Admin เลือกไปจัดตาราง
 *
 * ในเวอร์ชันถัดไปที่ต่อ backend จริง ให้แทนที่ค่าคงที่เหล่านี้ด้วยผลลัพธ์จาก
 * API call โดยไม่ต้องแก้ dataLayer.js / app.js / admin.js เลย เพราะทุกที่เรียก
 * ผ่านฟังก์ชันด้านล่างนี้เท่านั้น
 */

// สาขา/ลูกค้าทั้งหมด (branch master) — อิงจากรายชื่อลูกค้าจริงของทีม Mer
// scheduledTime ปล่อยว่างไว้เป็นค่าเริ่มต้น เพราะปกติไม่บังคับลำดับเวลาเข้า
// (Mer บริหารเส้นทางเองได้) ยกเว้นสาขาที่มี "note" กำกับเงื่อนไขพิเศษ
const MOCK_STORES = [
  { storeId: 'BR01', customer: 'EVEANDBOY', storeName: 'สาขาเกษร', address: 'เกษรวิลเลจ ถ.ราชดำริ กรุงเทพฯ', lat: 13.744, lng: 100.5405, scheduledTime: '', note: '' },
  { storeId: 'BR02', customer: 'EVEANDBOY', storeName: 'สาขาราชดำริ', address: 'ถ.ราชดำริ แขวงลุมพินี กรุงเทพฯ', lat: 13.7445, lng: 100.541, scheduledTime: '', note: '' },
  { storeId: 'BR03', customer: 'EVEANDBOY', storeName: 'สาขาเมกะบางนา', address: 'เมกาบางนา ถ.บางนา-ตราด กรุงเทพฯ', lat: 13.6417, lng: 100.6683, scheduledTime: '', note: '' },
  { storeId: 'BR04', customer: 'EVEANDBOY', storeName: 'สาขาปิ่นเกล้า', address: 'เซ็นทรัลปิ่นเกล้า กรุงเทพฯ', lat: 13.7789, lng: 100.475, scheduledTime: '', note: '' },
  { storeId: 'BR05', customer: 'EVEANDBOY', storeName: 'สาขาบรรทัดทอง', address: 'ถ.บรรทัดทอง แขวงวังใหม่ กรุงเทพฯ', lat: 13.7455, lng: 100.528, scheduledTime: '', note: '' },
  { storeId: 'BR06', customer: 'EVEANDBOY', storeName: 'สาขาเดอะมอลล์บางกะปิ', address: 'เดอะมอลล์บางกะปิ กรุงเทพฯ', lat: 13.7658, lng: 100.6432, scheduledTime: '', note: '' },
  { storeId: 'BR07', customer: 'Watsons', storeName: 'สาขาบิ๊กซีอิมพีเรียลสำโรง', address: 'บิ๊กซี สำโรง สมุทรปราการ', lat: 13.6028, lng: 100.5952, scheduledTime: '', note: '' },
  { storeId: 'BR08', customer: 'Watsons', storeName: 'สาขาโรบินสันสมุทรปราการ', address: 'โรบินสัน สมุทรปราการ', lat: 13.5991, lng: 100.5964, scheduledTime: '', note: '' },
  { storeId: 'BR09', customer: 'Beautrium', storeName: 'สาขาหลัก', address: 'สยามสแควร์ กรุงเทพฯ', lat: 13.7455, lng: 100.5325, scheduledTime: '', note: '' },
  { storeId: 'BR10', customer: 'CTW', storeName: 'Central World', address: '4 ถ.ราชดำริ แขวงปทุมวัน กรุงเทพฯ', lat: 13.7466, lng: 100.5393, scheduledTime: '', note: '' },
  {
    storeId: 'BR11',
    customer: 'Tofu',
    storeName: 'Tofu Skincare',
    address: 'สาขาหลัก กรุงเทพฯ',
    lat: 13.73,
    lng: 100.57,
    scheduledTime: '',
    note: 'ต้องเข้าในช่วงเวลาร้านเปิด (เงื่อนไขพิเศษ)',
  },
  { storeId: 'BR12', customer: '7-Eleven', storeName: 'สาขา 1', address: 'กรุงเทพฯ', lat: 13.75, lng: 100.545, scheduledTime: '', note: '' },
  { storeId: 'BR13', customer: '7-Eleven', storeName: 'สาขา 2', address: 'กรุงเทพฯ', lat: 13.755, lng: 100.55, scheduledTime: '', note: '' },
  { storeId: 'BR14', customer: 'Multy', storeName: 'สาขาหลัก', address: 'กรุงเทพฯ', lat: 13.738, lng: 100.56, scheduledTime: '', note: '' },
  { storeId: 'BR15', customer: 'One Bangkok', storeName: 'สาขาหลัก', address: 'ถ.วิทยุ กรุงเทพฯ', lat: 13.7245, lng: 100.5465, scheduledTime: '', note: '' },
  { storeId: 'BR16', customer: 'True Digital Park', storeName: 'สาขาหลัก', address: 'ถ.สุขุมวิท กรุงเทพฯ', lat: 13.705, lng: 100.59, scheduledTime: '', note: '' },
];

// รายชื่อ Mer ทั้งหมด (ปัจจุบันมี 2 คน) — ยังไม่มีระบบ login จริงในเวอร์ชันนี้
// ฝั่ง Mer App ใช้ ScheduleDataLayer.getCurrentMerId()/setCurrentMerId() จำลองการสลับผู้ใช้
// username/password เป็นแค่ mock สำหรับจำลองหน้า login ให้ดูสมจริงขึ้น
// (ยังไม่มีระบบ auth จริง) — ปุ่ม preset ในหน้า login ใช้ค่านี้ login ให้อัตโนมัติ
const MOCK_MERS = [
  { merId: 'MER001', merName: 'พี่เอก', username: 'eak', password: '1234' },
  { merId: 'MER002', merName: 'น้องมิ้นท์', username: 'mint', password: '1234' },
  { merId: 'MER003', merName: 'พี่ภู่', username: 'phu', password: '1234' },
];

// แคตตาล็อก SKU ทั้งหมดในระบบ (ใช้ชื่ออ้างอิงร่วมกันทุกสาขา) — barcode ใช้จำลอง
// การค้นหา/สแกนใน Stock Count และแสดงในรายงาน PR
const SKU_CATALOG = [
  { sku: 'SKU001', name: 'ลิปสติกแมทท์ เบอร์ 01 Nude', barcode: '8857126870011' },
  { sku: 'SKU002', name: 'ลิปสติกแมทท์ เบอร์ 05 Red', barcode: '8857126870028' },
  { sku: 'SKU003', name: 'รองพื้นคุมมัน เบอร์ 21', barcode: '8857126870035' },
  { sku: 'SKU004', name: 'แป้งพัฟคอมแพค เบอร์ 02', barcode: '8857126870042' },
  { sku: 'SKU005', name: 'บลัชออน สีชมพูพีช', barcode: '8857126870059' },
  { sku: 'SKU006', name: 'มาสคาร่ากันน้ำ สีดำ', barcode: '8857126870066' },
  { sku: 'SKU007', name: 'อายไลเนอร์ลิควิด สีดำ', barcode: '8857126870073' },
];

// Planogram: สร้างอัตโนมัติต่อสาขา (หมุนเวียน SKU 4-5 ตัว/สาขา) เพื่อให้ทุกสาขา
// มีข้อมูลตัวอย่างสำหรับทดสอบ Phase 2 Step 2 โดยไม่ต้องเขียนมือทีละสาขา
const PLANOGRAM = {};
MOCK_STORES.forEach((store, idx) => {
  const skuCount = 4 + (idx % 2); // สลับ 4 หรือ 5 SKU ต่อสาขา
  const items = [];
  for (let i = 0; i < skuCount; i++) {
    const sku = SKU_CATALOG[(idx + i) % SKU_CATALOG.length];
    items.push({ sku: sku.sku, parLevel: 3 + ((idx + i) % 4) });
  }
  PLANOGRAM[store.storeId] = items;
});

// สินค้าจริงเพิ่มเติม (Barcode จริงที่ทดสอบสแกนจากมือถือ) — เติมหลัง PLANOGRAM
// สุ่มแจกจ่ายเสร็จแล้วโดยตั้งใจ (ไม่ให้กระทบ Planogram ของสาขาอื่นที่คำนวณจาก
// SKU_CATALOG.length ไปแล้วก่อนหน้านี้) ใช้ "Tr Code" (รหัสภายใน 5 หลัก) แทน
// รูปแบบ SKU00X เดิม เพื่อสมมติให้ใกล้เคียงรหัสสินค้าจริงของหน้าร้านมากขึ้น
SKU_CATALOG.push(
  { sku: '10281', name: 'เซรั่มบำรุงผิวหน้า วิตามินซี 30ml', barcode: '8859095816384' },
  { sku: '10282', name: 'ครีมกันแดด SPF50 PA+++ 50ml', barcode: '8859214800270' },
  { sku: '10283', name: 'โทนเนอร์น้ำแร่ผสมไนอาซินาไมด์ 150ml', barcode: '8852662200364' }
);

// เพิ่ม 3 รายการนี้เข้า Planogram ของ Tofu Skincare โดยเฉพาะ เพื่อให้ทดสอบสแกน
// Barcode จริงในหน้านับสต๊อกได้ทันที — ไม่กระทบ Planogram สาขาอื่น
PLANOGRAM.BR11.push(
  { sku: '10281', parLevel: 5 },
  { sku: '10282', parLevel: 6 },
  { sku: '10283', parLevel: 4 }
);

function getSkuName(sku) {
  const found = SKU_CATALOG.find((s) => s.sku === sku);
  return found ? found.name : sku;
}

function getSkuBarcode(sku) {
  const found = SKU_CATALOG.find((s) => s.sku === sku);
  return found ? found.barcode : '';
}

/** ค้นหา SKU จากรายการที่กำหนด (planogram ของสาขา) ด้วย SKU/Barcode ตรงตัว หรือค้นชื่อบางส่วน */
function findSkuInList(list, term) {
  const q = (term || '').trim().toLowerCase();
  if (!q) return null;
  return (
    list.find((item) => item.sku.toLowerCase() === q || getSkuBarcode(item.sku) === q) ||
    list.find((item) => getSkuName(item.sku).toLowerCase().includes(q)) ||
    null
  );
}

function getPlanogramForStore(storeId) {
  return PLANOGRAM[storeId] || [];
}

function getStoreById(storeId) {
  return MOCK_STORES.find((s) => s.storeId === storeId) || null;
}

function getMerById(merId) {
  return MOCK_MERS.find((m) => m.merId === merId) || null;
}

// สาขาที่ต้องทำ Flow พิเศษ: นับสต๊อกเพิ่มแล้วเปิด PR ก่อนเข้างานหน้าที่เดิม
// (Phase 2 step "นับสต๊อก & PR" แทรกก่อน step จัดการสินค้าที่ชั้นวาง) — ปัจจุบัน
// มีแค่ Tofu Skincare เจ้าเดียว ระบบตรวจจาก storeId ตรงนี้อัตโนมัติตอนเข้าสาขา
// ไม่ต้องให้ Mer เลือกเอง เผื่ออนาคตมีสาขาอื่นเพิ่ม แค่เติม storeId ในนี้
const STOCK_COUNT_STORE_IDS = ['BR11'];

function requiresStockCount(storeId) {
  return STOCK_COUNT_STORE_IDS.includes(storeId);
}
