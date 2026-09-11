/**
 * scheduleDataLayer.js
 * -----------------------------------------------------------------------
 * Data layer สำหรับ "จัดตารางเข้าสาขา" (Admin/PIC เป็นคนจัด, Mer ดูได้ด้วย)
 *
 * Admin เป็นคนกำหนดว่า Mer แต่ละคนต้องเข้าสาขาไหนบ้างในแต่ละวันของเดือน
 * ("Monthly Visit" ตาม concept ที่ให้มา) ผ่านหน้า admin.html — Mer เปิดดู
 * ปฏิทินเดียวกันนี้ได้เช่นกัน ส่วน Mer App (app.js) แค่ "อ่าน" ตารางของวันนี้
 * ผ่าน getStoresForDate() มาแสดงเป็นรายชื่อสาขาที่ต้องไป (แทนที่การ hardcode
 * รายชื่อสาขาแบบเดิม)
 *
 * เก็บข้อมูลด้วย localStorage เหมือน dataLayer.js อื่นๆ ในโปรเจกต์นี้ —
 * โครงสร้าง: { [merId]: { [dateISO]: [storeId, storeId, ...] } }
 */

const SCHEDULE_STORAGE_KEYS = {
  SCHEDULE: 'mrv_schedule', // { [merId]: { [dateISO]: [storeId, ...] } }
  CURRENT_MER: 'mrv_current_mer', // merId ที่ "ล็อกอิน" อยู่ฝั่ง Mer App ตอนนี้ (mock)
};

function readScheduleJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error('[ScheduleDataLayer] อ่านข้อมูลผิดพลาด', key, err);
    return fallback;
  }
}

function writeScheduleJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/** แปลง Date เป็น 'YYYY-MM-DD' ตามเวลาเครื่อง (ไม่ใช้ toISOString เพราะจะเพี้ยนข้ามวันได้ถ้า timezone ต่างจาก UTC) */
function toDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateISO(dateISO) {
  const [y, m, d] = dateISO.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const ScheduleDataLayer = {
  // ---------- Mer ที่ "ล็อกอิน" อยู่ฝั่งมือถือตอนนี้ (mock, ยังไม่มีระบบ auth จริง) ----------
  getCurrentMerId() {
    return localStorage.getItem(SCHEDULE_STORAGE_KEYS.CURRENT_MER) || MOCK_MERS[0].merId;
  },

  setCurrentMerId(merId) {
    localStorage.setItem(SCHEDULE_STORAGE_KEYS.CURRENT_MER, merId);
  },

  // ---------- Schedule CRUD ----------
  getAllSchedules() {
    return readScheduleJson(SCHEDULE_STORAGE_KEYS.SCHEDULE, {});
  },

  getMerSchedule(merId) {
    const all = this.getAllSchedules();
    return all[merId] || {};
  },

  getStoresForDate(merId, dateISO) {
    const merSchedule = this.getMerSchedule(merId);
    return merSchedule[dateISO] || [];
  },

  /** คืนเฉพาะวันในเดือน/ปีที่ระบุ ({ [dateISO]: [storeId,...] }) ใช้แสดงปฏิทินฝั่ง Admin */
  getMonthSchedule(merId, year, month) {
    const merSchedule = this.getMerSchedule(merId);
    const result = {};
    Object.keys(merSchedule).forEach((dateISO) => {
      const d = parseDateISO(dateISO);
      if (d.getFullYear() === year && d.getMonth() === month) {
        result[dateISO] = merSchedule[dateISO];
      }
    });
    return result;
  },

  assignStoreToDay(merId, dateISO, storeId) {
    const all = this.getAllSchedules();
    if (!all[merId]) all[merId] = {};
    if (!all[merId][dateISO]) all[merId][dateISO] = [];
    if (!all[merId][dateISO].includes(storeId)) all[merId][dateISO].push(storeId);
    writeScheduleJson(SCHEDULE_STORAGE_KEYS.SCHEDULE, all);
  },

  removeStoreFromDay(merId, dateISO, storeId) {
    const all = this.getAllSchedules();
    if (all[merId] && all[merId][dateISO]) {
      all[merId][dateISO] = all[merId][dateISO].filter((id) => id !== storeId);
      writeScheduleJson(SCHEDULE_STORAGE_KEYS.SCHEDULE, all);
    }
  },

  /** ใช้สำหรับ "ขอสลับตาราง Visit ระหว่างเดือน" — ย้ายสาขาจากวันหนึ่งไปอีกวันหนึ่ง */
  moveStoreToDay(merId, fromDateISO, toDateISO, storeId) {
    this.removeStoreFromDay(merId, fromDateISO, storeId);
    this.assignStoreToDay(merId, toDateISO, storeId);
  },

  /**
   * ตั้งค่าเริ่มต้นให้ตารางไม่ว่างเปล่าตอนเปิดใช้งานครั้งแรก (ทั้งฝั่ง Mer App และ Admin)
   * จะทำงานเฉพาะตอนที่ยังไม่มีตารางของใครเลยเท่านั้น (ไม่ทับข้อมูลที่ Admin แก้ไขแล้ว)
   * สุ่มแบบ deterministic: วันธรรมดา (จ-ศ) ของเดือนปัจจุบันจะได้สาขา 2 แห่ง/Mer/วัน
   * เสาร์-อาทิตย์ปล่อยว่าง (วันหยุด) ตาม concept ที่ Admin ให้มา
   */
  seedDefaultScheduleIfEmpty() {
    const all = this.getAllSchedules();
    if (Object.keys(all).length > 0) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const branchIds = MOCK_STORES.map((s) => s.storeId);
    const n = branchIds.length;

    const schedule = {};
    MOCK_MERS.forEach((mer) => {
      schedule[mer.merId] = {};
    });

    let weekdayIndex = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dow = date.getDay(); // 0 = อาทิตย์, 6 = เสาร์
      if (dow === 0 || dow === 6) continue;
      const dateISO = toDateISO(date);
      const spread = Math.max(1, Math.floor(n / MOCK_MERS.length));
      MOCK_MERS.forEach((mer, merIdx) => {
        const base = weekdayIndex * 2 + merIdx * spread;
        schedule[mer.merId][dateISO] = [branchIds[base % n], branchIds[(base + 1) % n]];
      });
      weekdayIndex++;
    }

    writeScheduleJson(SCHEDULE_STORAGE_KEYS.SCHEDULE, schedule);
  },

  toDateISO,
  parseDateISO,
};
