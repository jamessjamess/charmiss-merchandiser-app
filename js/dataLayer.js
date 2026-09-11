/**
 * dataLayer.js
 * -----------------------------------------------------------------------
 * ชั้นเข้าถึงข้อมูล (Data Access Layer) — แยกออกจาก UI logic โดยเจตนา
 *
 * ทุกจุดที่ app.js ต้องการอ่าน/เขียนข้อมูล ให้เรียกผ่านอ็อบเจกต์ `DataLayer`
 * เท่านั้น ห้ามแตะ localStorage ตรงๆ จาก app.js เพื่อให้วันหน้าที่ต่อ backend
 * จริง เราแค่เปลี่ยน implementation ภายในไฟล์นี้ (เช่นเปลี่ยนจาก
 * localStorage.getItem เป็น fetch('/api/...')) โดยไม่ต้องแตะ UI code เลย
 *
 * ฟังก์ชันที่เกี่ยวกับ "การเขียน" ทุกตัวถูกออกแบบให้คืนค่าเป็น Promise
 * (แม้ตอนนี้จะ resolve ทันทีเพราะเป็น localStorage) เพื่อให้ UI code
 * ที่เรียกใช้งานไม่ต้องแก้อะไรเลยตอนสลับไปเรียก API จริงที่เป็น async
 */

const STORAGE_KEYS = {
  // ทุก key ด้านล่างนี้ scope ด้วย merId + วันที่ (YYYY-MM-DD) เสมอ เพราะสาขา
  // เดียวกันอาจถูกจัดตารางให้เข้าซ้ำได้หลายวัน — ถ้าเก็บสถานะแบบ global ตาม
  // storeId เฉยๆ สาขาที่ "เสร็จแล้ว" เมื่อวานจะค้างเป็นเสร็จแล้วตลอดไปแม้จะมา
  // ในตารางวันนี้อีกครั้ง ซึ่งผิดจากพฤติกรรมจริง
  STORE_STATUS: 'mrv_store_status', // { [merId]: { [dateISO]: { [storeId]: 'pending'|'in_progress'|'completed' } } }
  ACTIVE_VISIT: 'mrv_active_visit', // { [merId]: { [dateISO]: { [storeId]: visitId } } }
  AD_HOC_STORES: 'mrv_adhoc_stores', // { [merId]: { [dateISO]: [storeId, ...] } } — สาขาที่ Mer Key In เองกรณีมีงานแทรก
  VISITS: 'mrv_visits', // { [visitId]: visitObject }
  MER_PROFILES: 'mrv_mer_profiles', // { [merId]: { displayName, phone } } — ข้อมูลโปรไฟล์ที่ Mer แก้ไขเอง
  PURCHASE_REQUESTS: 'mrv_purchase_requests', // { [prId]: prObject } — PR ที่สร้างจาก Stock Count (เฉพาะสาขาที่ requiresStockCount)
};

const STATUS_SORT_ORDER = { in_progress: 0, pending: 1, completed: 2 };

// ============================= Storage helpers =============================

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error('[DataLayer] อ่านข้อมูลผิดพลาด', key, err);
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/** ใช้ merId ที่ล็อกอินอยู่ตอนนี้ + วันที่วันนี้ เป็น scope ของสถานะ/active visit เสมอ */
function todayKey() {
  return { merId: ScheduleDataLayer.getCurrentMerId(), dateISO: ScheduleDataLayer.toDateISO(new Date()) };
}

/** อ่านค่าใน storage ที่ scope เป็น { [merId]: { [dateISO]: { [key]: value } } } */
function readScoped(storageKey, merId, dateISO) {
  const all = readJson(storageKey, {});
  return (all[merId] && all[merId][dateISO]) || {};
}

function writeScopedEntry(storageKey, merId, dateISO, entryKey, value) {
  const all = readJson(storageKey, {});
  if (!all[merId]) all[merId] = {};
  if (!all[merId][dateISO]) all[merId][dateISO] = {};
  all[merId][dateISO][entryKey] = value;
  writeJson(storageKey, all);
}

// ============================= ID generator =============================

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ============================= Visit factory =============================

/**
 * สร้างโครงสร้างข้อมูล visit เปล่าสำหรับการเข้าสาขา 1 ครั้ง
 * โครงสร้างนี้อิงตาม Flow ล่าสุด (Phase 2 มี 6 ขั้นตอน): Before Photo →
 * สินค้า (เติม/เรียง/ตรวจ 4 ขั้นย่อย รวมราคาไว้ในนี้) → Tester → POSM →
 * NPD → After Photo
 */
function createEmptyVisit(storeId, storeName) {
  return {
    visitId: generateId('visit'),
    merId: ScheduleDataLayer.getCurrentMerId(),
    visitDate: ScheduleDataLayer.toDateISO(new Date()),
    storeId,
    storeName,
    checkIn: null,
    checkinPhoto: null, // ภาพหน้าสาขา (ภายนอก) ถ่ายตอนเช็คอิน ใช้เป็นหลักฐานว่าอยู่หน้าร้านจริง
    checkOut: null,
    photosBefore: [],
    // Step 2: จัดการสินค้าที่ชั้นวาง — 5 ขั้นย่อย (2.1-2.4 checklist + 2.5 ถ่ายรูป)
    // ตัด list SKU/par level ออกจาก 2.1 แล้ว (เดิมมี items สำหรับกรอกจำนวนต่อ SKU)
    // — ทุกขั้นย่อยตอนนี้เป็นแค่ checkbox + ปุ่มแจ้งปัญหาแบบเพิ่มได้หลาย SKU
    // รวดเร็ว (เลือกจาก SKU_CATALOG ทั้งระบบ ไม่ผูกกับ planogram รายสาขาอีกต่อไป)
    product: {
      // 2.1 เติมสินค้าจากสต๊อกสำรอง จัดเรียงตำแหน่ง/เฉดสีให้ตรง Planogram/Par level
      restockDone: false,
      restockIssues: [], // { type: 'no_stock' | 'shelf_full', sku }
      // 2.2 เช็ควันหมดอายุของที่วางอยู่ และเรียงไว้ตาม FIFO
      fifoDone: false,
      // 2.3 ตรวจอายุสินค้าว่ามีปัญหาต่ำกว่าเกณฑ์หรือไม่ (คนละเรื่องกับ FIFO)
      belowThresholdChecked: false, // "ตรวจสอบสินค้าอายุต่ำกว่าเกณฑ์แล้ว"
      belowThresholdIssues: [], // { sku, expired: boolean } — ถ้า expired ต้องแจ้งร้านเปิด CN
      // 2.4 ตรวจเช็คราคาและ Promotion
      priceOk: false,
      priceIssues: [], // { sku, foundPrice }
      // 2.5 ถ่ายรูปชั้นวางที่จัดเสร็จแล้ว (บังคับอย่างน้อย 1 ภาพ)
      shelfPhotos: [],
    },
    // Step 3: Tester — เช็คปริมาณคงเหลือและเติม
    tester: {
      emptySkus: [], // SKU ที่พบว่า Tester หมด/ใกล้หมด "ก่อนเติม" บันทึกไว้เป็นหลักฐาน (ไม่บังคับ)
      refillDone: false, // เติมจากของสำรองเรียบร้อย (สำหรับตัวที่มีของเติม)
      flagNewTesterRequest: [], // SKU ที่หมดและไม่มีของเติม ต้องขอเบิก/เทสเตอร์ใหม่รอบหน้า
      afterPhotos: [], // ภาพหลังทำ Tester เสร็จ (บังคับอย่างน้อย 1 ภาพ)
    },
    // Step 4: POSM — เช็คสภาพ/การติดตั้งให้ตรงจุด
    posm: {
      conditionOk: false,
      flagPendingInstall: false, // พบปัญหา POSM (ชำรุด/สื่อใหม่ยังไม่ถึง/ติดตั้งไม่ได้)
      issuePhotos: [], // ภาพ POSM ที่มีปัญหา (บังคับอย่างน้อย 1 ภาพ ถ้าติ๊ก flagPendingInstall)
    },
    // Step 5: NPD — เช็คสินค้าใหม่เข้าครบหรือยัง (3 ตัวเลือก แทน Yes/No เดิม)
    npd: {
      answered: false,
      status: null, // 'full' | 'partial' | 'none'
      missingDetail: '', // ระบุว่าตัวไหน/รายการไหนยังขาด — บังคับกรอกถ้า status === 'partial'
    },
    // "นับสต๊อก & PR" — แทรกก่อน step จัดการสินค้าที่ชั้นวาง เฉพาะสาขาที่
    // requiresStockCount() คืน true (ปัจจุบันมีแค่ Tofu) ต้องนับก่อนไปเติม/จัด
    // เรียงสินค้า ไม่งั้นตัวเลขจะไม่ตรงสภาพจริงตอนมาถึง — เก็บไว้ในทุก visit
    // เหมือนกันแม้สาขาอื่นจะไม่ได้ใช้ ก็ไม่กระทบอะไร (แค่เป็น field ว่างเปล่า)
    // นับทีละ SKU ผ่านช่องค้นหา/สแกน แล้วกด "ยืนยันรายการนี้" ต่อตัว (ตั้ง
    // counted = true) — allCounted ของทั้ง step คำนวณสดจาก counted ครบทุก SKU
    // ใน planogram เสมอ (ดู isStockCountStepValid) ไม่เก็บเป็น field แยก
    stockCount: {
      counts: getPlanogramForStore(storeId).reduce((acc, item) => {
        acc[item.sku] = { good: 0, damaged: 0, testerGood: 0, testerDamaged: 0, requestedQty: null, counted: false };
        return acc;
      }, {}),
      prCreated: false,
      prSkipped: false, // Mer ยืนยันว่าของครบตาม Par ไม่ต้องสั่งเพิ่ม (ไม่ต้องสร้าง PR)
      prId: null,
      prNumber: null,
    },
    unstructuredNotes: [],
    // step สุดท้ายของ Phase 2 (แทนที่ "ถ่ายภาพ After" เดิมที่ตัดออกเพราะซ้ำซ้อนกับ
    // รูปที่แต่ละส่วนถ่ายเองอยู่แล้ว) — ต้องกดยืนยันเองหลังทุกส่วนผ่านครบ
    mainWorkConfirmed: false,
    sentToGroupLine: false,
    status: 'in_progress',
    phaseCompleted: 1,
    // ฟิลด์เสริมสำหรับ resume งานที่ค้างอยู่ (ไม่ได้อยู่ใน spec เดิม แต่จำเป็น
    // ต่อการพากลับมาที่ step เดิมเมื่อ Mer ออกจากแอปกลางคัน)
    currentPhase: 1,
    currentPhase2Step: 1,
  };
}

/**
 * ตรวจว่า visit ที่โหลดมาจาก localStorage ตรงกับโครงสร้างข้อมูลปัจจุบันไหม
 * ใช้ป้องกันแอปพังตอน resume visit เก่าที่ถูกสร้างไว้ก่อนหน้านี้ด้วย schema
 * รุ่นก่อน (เช่น field `stockCheck`/`price` แบบเดิม ก่อนจะเปลี่ยนเป็น
 * `product`/`npd` ตาม Flow ใหม่) ซึ่ง field ที่ UI ปัจจุบันอ้างถึงจะไม่มีอยู่
 */
function isVisitSchemaCurrent(visit) {
  return !!(
    visit &&
    visit.product &&
    Array.isArray(visit.product.shelfPhotos) &&
    visit.npd &&
    visit.tester &&
    Array.isArray(visit.tester.afterPhotos) &&
    Array.isArray(visit.tester.emptySkus) &&
    visit.posm &&
    Array.isArray(visit.posm.issuePhotos) &&
    visit.stockCount &&
    typeof visit.stockCount.counts === 'object'
  );
}

// ============================= DataLayer API =============================

const DataLayer = {
  // ---------- Store status (scope: Mer ที่ล็อกอินอยู่ + วันนี้) ----------
  getStoreStatus(storeId) {
    const { merId, dateISO } = todayKey();
    const statuses = readScoped(STORAGE_KEYS.STORE_STATUS, merId, dateISO);
    return statuses[storeId] || 'pending'; // pending | in_progress | completed
  },

  setStoreStatus(storeId, status) {
    const { merId, dateISO } = todayKey();
    writeScopedEntry(STORAGE_KEYS.STORE_STATUS, merId, dateISO, storeId, status);
    return Promise.resolve();
  },

  // ---------- สาขาที่ Mer Key In เองวันนี้ (กรณีมีงานแทรก ไม่ได้อยู่ในตารางของ Admin) ----------
  getAdHocStoreIds() {
    const { merId, dateISO } = todayKey();
    const all = readJson(STORAGE_KEYS.AD_HOC_STORES, {});
    return (all[merId] && all[merId][dateISO]) || [];
  },

  addAdHocStore(storeId) {
    const { merId, dateISO } = todayKey();
    const all = readJson(STORAGE_KEYS.AD_HOC_STORES, {});
    if (!all[merId]) all[merId] = {};
    if (!all[merId][dateISO]) all[merId][dateISO] = [];
    if (!all[merId][dateISO].includes(storeId)) all[merId][dateISO].push(storeId);
    writeJson(STORAGE_KEYS.AD_HOC_STORES, all);
  },

  // ---------- Today's store list ----------
  /**
   * คำนวณรายชื่อสาขาที่ต้องเข้าวันนี้ = ตารางที่ Admin จัดไว้ (scheduleDataLayer.js)
   * รวมกับสาขาที่ Mer Key In เองกรณีมีงานแทรก แล้วเรียงตามสถานะ (ค้างงาน → ยังไม่ไป
   * → เสร็จแล้ว) เพื่อให้ Mer เห็นงานที่ต้องทำก่อนอยู่บนสุดเสมอ เป็น sync ล้วนๆ
   * (อ่าน localStorage เท่านั้น) เผื่อจุดอื่นในแอปต้องใช้ทันทีโดยไม่รอ Promise
   * เช่นแถบความคืบหน้ารายวัน — ส่วน getTodayStores() ยังคง wrap เป็น Promise
   * ตามธรรมเนียมของ DataLayer เพื่อให้สลับไปเรียก API จริงในอนาคตได้ไม่กระทบ UI
   */
  _computeTodayStores() {
    const merId = ScheduleDataLayer.getCurrentMerId();
    const todayISO = ScheduleDataLayer.toDateISO(new Date());
    const scheduledIds = ScheduleDataLayer.getStoresForDate(merId, todayISO);
    const adHocIds = this.getAdHocStoreIds();
    const allIds = [...scheduledIds, ...adHocIds.filter((id) => !scheduledIds.includes(id))];

    return allIds
      .map((id) => getStoreById(id))
      .filter(Boolean)
      .map((s) => ({
        ...s,
        status: this.getStoreStatus(s.storeId),
        isAdHoc: adHocIds.includes(s.storeId) && !scheduledIds.includes(s.storeId),
      }))
      .sort((a, b) => (STATUS_SORT_ORDER[a.status] ?? 9) - (STATUS_SORT_ORDER[b.status] ?? 9));
  },

  /** ถ้า Admin ยังไม่ได้จัดตารางของวันนี้ไว้เลยและไม่มีงานแทรก จะคืน array ว่าง */
  getTodayStores() {
    return Promise.resolve(this._computeTodayStores());
  },

  /** ใช้แสดงแถบความคืบหน้ารายวัน เช่น "ไปมาแล้ว 2/5 ร้านในวันนี้" */
  getTodayProgress() {
    const stores = this._computeTodayStores();
    const total = stores.length;
    const completed = stores.filter((s) => s.status === 'completed').length;
    return { completed, total };
  },

  // ---------- Active visit lookup (สำหรับ resume งานค้าง, scope: Mer + วันนี้) ----------
  getActiveVisitId(storeId) {
    const { merId, dateISO } = todayKey();
    return readScoped(STORAGE_KEYS.ACTIVE_VISIT, merId, dateISO)[storeId] || null;
  },

  setActiveVisitId(storeId, visitId) {
    const { merId, dateISO } = todayKey();
    writeScopedEntry(STORAGE_KEYS.ACTIVE_VISIT, merId, dateISO, storeId, visitId);
  },

  clearActiveVisitId(storeId) {
    const { merId, dateISO } = todayKey();
    const all = readJson(STORAGE_KEYS.ACTIVE_VISIT, {});
    if (all[merId] && all[merId][dateISO]) delete all[merId][dateISO][storeId];
    writeJson(STORAGE_KEYS.ACTIVE_VISIT, all);
  },

  // ---------- Visits ----------
  getVisit(visitId) {
    const all = readJson(STORAGE_KEYS.VISITS, {});
    return all[visitId] || null;
  },

  saveVisit(visit) {
    const all = readJson(STORAGE_KEYS.VISITS, {});
    all[visit.visitId] = visit;
    writeJson(STORAGE_KEYS.VISITS, all);
    return Promise.resolve(visit);
  },

  /**
   * ดึง visit ที่ค้างงาน (in_progress) ของสาขานี้กลับมา สำหรับ resume — คืน
   * null ถ้าไม่มี หรือถ้าข้อมูลเป็นโครงสร้างเก่า (จาก build ก่อนหน้าที่ field
   * ของ Phase 2 เปลี่ยนไป เช่น stockCheck → product) ซึ่ง render ต่อไม่ได้
   * เพราะ field ที่ UI ปัจจุบันต้องใช้ไม่มีอยู่ ในกรณีนั้นจะเคลียร์ reference
   * ทิ้งและรีเซ็ตสถานะกลับเป็น "ยังไม่ไป" แทนที่จะปล่อยให้แอปพังตอน render
   */
  getResumableVisit(storeId) {
    const visitId = this.getActiveVisitId(storeId);
    if (!visitId) return null;
    const visit = this.getVisit(visitId);
    if (visit && isVisitSchemaCurrent(visit)) return visit;

    this.clearActiveVisitId(storeId);
    if (this.getStoreStatus(storeId) === 'in_progress') this.setStoreStatus(storeId, 'pending');
    return null;
  },

  /** เริ่ม visit ใหม่ หรือดึง visit ที่ค้างอยู่ (in_progress) ของสาขานี้กลับมา */
  getOrCreateVisit(storeId, storeName) {
    const existing = this.getResumableVisit(storeId);
    if (existing && existing.status === 'in_progress') {
      return Promise.resolve(existing);
    }
    const visit = createEmptyVisit(storeId, storeName);
    this.saveVisit(visit);
    this.setActiveVisitId(storeId, visit.visitId);
    this.setStoreStatus(storeId, 'in_progress');
    return Promise.resolve(visit);
  },

  completeVisit(visit) {
    visit.status = 'completed';
    visit.phaseCompleted = 4;
    this.saveVisit(visit);
    // เจตนาไม่เคลียร์ active visit mapping: เก็บไว้ให้ Mer เปิดดูรายงานที่ส่งแล้ว
    // ซ้ำได้จากหน้ารายชื่อสาขา (getOrCreateVisit จะสร้าง visit ใหม่ให้เองเมื่อ
    // สถานะ visit เดิมไม่ใช่ in_progress แล้ว)
    this.setStoreStatus(visit.storeId, 'completed');
    return Promise.resolve(visit);
  },

  // ---------- โปรไฟล์ Mer (ชื่อที่แสดง/เบอร์โทร/รูปโปรไฟล์/รหัสผ่าน) — แก้ไขได้จากหน้าโปรไฟล์ ----------
  getMerProfile(merId) {
    const all = readJson(STORAGE_KEYS.MER_PROFILES, {});
    return all[merId] || { displayName: '', phone: '' };
  },

  /** merge เข้ากับโปรไฟล์เดิมเสมอ (ไม่ทับทั้งก้อน) เพราะแต่ละฟอร์ม (ข้อมูลทั่วไป/
   *  เปลี่ยนรหัสผ่าน/เปลี่ยนรูป) แก้คนละฟิลด์กัน — ถ้า set ทั้งก้อนจะไปลบฟิลด์ที่
   *  ฟอร์มอื่นเพิ่งบันทึกไว้ */
  saveMerProfile(merId, partialProfile) {
    const all = readJson(STORAGE_KEYS.MER_PROFILES, {});
    const existing = all[merId] || { displayName: '', phone: '' };
    all[merId] = { ...existing, ...partialProfile };
    writeJson(STORAGE_KEYS.MER_PROFILES, all);
    return Promise.resolve(all[merId]);
  },

  /** ชื่อที่ควรแสดงจริง — ใช้ชื่อที่ Mer ตั้งเองถ้ามี ไม่งั้น fallback เป็นชื่อ mock เดิม */
  getMerDisplayName(merId) {
    const mer = getMerById(merId);
    const profile = this.getMerProfile(merId);
    return (profile.displayName && profile.displayName.trim()) || (mer ? mer.merName : '');
  },

  /** รหัสผ่านที่ใช้ล็อกอินจริง — ใช้รหัสที่ Mer เปลี่ยนเองถ้ามี ไม่งั้น fallback เป็นค่า mock เดิม */
  getMerPassword(merId) {
    const profile = this.getMerProfile(merId);
    if (profile.password) return profile.password;
    const mer = getMerById(merId);
    return mer ? mer.password : null;
  },

  // ---------- Purchase Request (สร้างจาก Stock Count เฉพาะสาขาที่ requiresStockCount) ----------
  /** เลขที่ PR รูปแบบ PR-YYYYMMDD-NNN นับต่อวัน ไม่ผูกกับสาขา/Mer */
  createPurchaseRequest({ visitId, visitDate, merId, storeId, storeName, items }) {
    const all = readJson(STORAGE_KEYS.PURCHASE_REQUESTS, {});
    const dateKey = ScheduleDataLayer.toDateISO(new Date()).replace(/-/g, '');
    const countToday = Object.values(all).filter((pr) => pr.prNumber.startsWith(`PR-${dateKey}`)).length;
    const pr = {
      prId: generateId('pr'),
      prNumber: `PR-${dateKey}-${String(countToday + 1).padStart(3, '0')}`,
      visitId,
      visitDate,
      merId,
      storeId,
      storeName,
      createdAt: new Date().toISOString(),
      items, // [{ sku, skuName, barcode, parLevel, good, damaged, requestedQty }]
    };
    all[pr.prId] = pr;
    writeJson(STORAGE_KEYS.PURCHASE_REQUESTS, all);
    return Promise.resolve(pr);
  },

  /** รายการ PR ทั้งหมด (ทุกสาขา/ทุก Mer) เรียงใหม่สุดก่อน — ใช้กับหน้า "รายงาน PR" */
  getAllPurchaseRequests() {
    const all = readJson(STORAGE_KEYS.PURCHASE_REQUESTS, {});
    return Promise.resolve(Object.values(all).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  },

  /**
   * ล้างข้อมูลทดสอบทั้งหมด (ตาราง Admin, สถานะสาขา, visit ทุกใบ, โปรไฟล์) เพื่อเริ่ม
   * เดโมใหม่ตั้งแต่ต้น — ต้องเป็นปุ่มที่ผู้ใช้กดเองเท่านั้น (ห้าม auto-clear ตอนโหลด
   * หน้าเพราะ index.html กับ admin.html ใช้ localStorage ร่วมกัน ถ้า clear อัตโนมัติ
   * ทุกครั้งที่เปิด index.html จะไปล้างตารางที่ Admin เพิ่งจัดไว้ใน admin.html ด้วย)
   */
  resetAll() {
    localStorage.clear();
  },

  generateId,
};

// ============================= Geo helpers =============================

/**
 * เดิมมีการเทียบระยะห่างจากพิกัดสาขา (ACCEPT_RADIUS_METERS / distanceMeters)
 * เพื่อตัดสินว่า GPS "ตรง" กับสาขาไหม แต่ตัด feature นี้ออกไปก่อนตามที่ขอ —
 * ตอนนี้ดึงพิกัด GPS ได้สำเร็จก็ถือว่าเช็คอินผ่านทันที ไม่เทียบระยะทางอีก
 */
const GeoUtils = {
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('เบราว์เซอร์นี้ไม่รองรับ GPS'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  },
};

// ============================= File/image helper =============================

const ImageUtils = {
  /** อ่านไฟล์รูปที่ผู้ใช้เลือก/ถ่าย แล้วแปลงเป็น base64 data URL สำหรับ preview + เก็บใน localStorage */
  fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  },
};
