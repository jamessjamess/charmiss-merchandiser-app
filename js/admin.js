/**
 * admin.js
 * -----------------------------------------------------------------------
 * ปฏิทินจัดตารางเข้าสาขา — ใช้ได้ทั้ง Admin/PIC (จัดตาราง) และ Mer (ดูตาราง
 * ของตัวเอง) เปิดหน้าเดียวกัน ไม่มีการจำกัดสิทธิ์แยก เพราะยังไม่มีระบบ login
 * จริงในเวอร์ชันนี้ ออกแบบให้ใช้งานได้ดีทั้งจอคอมพิวเตอร์ (มุมมองเดือน) และ
 * มือถือ (มุมมองสัปดาห์/วัน แบบ agenda เต็มความกว้างจอ)
 *
 * แนวคิด (ตามที่ทีมให้มา):
 *   1) Admin/PIC วางตาราง Monthly Visit ให้ Mer แต่ละคน แยกรายวัน
 *      (ปกติไม่บังคับลำดับ/เวลาเข้าในแต่ละวัน ให้ Mer บริหารเส้นทางเอง —
 *      ยกเว้นสาขาที่มีเงื่อนไขพิเศษ เช่น Tofu ที่ต้องเข้าช่วงร้านเปิด)
 *   2) ปรับ/สลับตารางระหว่างเดือนได้ — ลาก (drag & drop) การ์ดสาขาไปวางวันอื่น
 *      ได้โดยตรง หรือแตะการ์ดเพื่อเปิดเมนู "ย้ายวัน / ลบ" แบบเดียวกับปฏิทิน
 *      ทั่วไป (Google Calendar-style)
 *
 * หน้านี้ "อ่าน/เขียน" ตารางผ่าน ScheduleDataLayer เท่านั้น (ดู
 * scheduleDataLayer.js) ซึ่งเป็น data layer เดียวกับที่ Mer App ใช้อ่านคิว
 * สาขาของวันนี้ — แก้ตารางที่นี่แล้วฝั่ง Mer App จะเห็นผลทันที
 */

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];
const THAI_WEEKDAYS = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];
const THAI_WEEKDAYS_FULL = ['วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์', 'วันอาทิตย์'];

function toBuddhistYear(year) {
  return year + 543;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** วันจันทร์ของสัปดาห์ที่ date อยู่ */
function getMondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const offset = (d.getDay() + 6) % 7;
  return addDays(d, -offset);
}

const AdminState = {
  merId: MOCK_MERS[0].merId,
  view: 'month', // 'month' | 'week' | 'day'
  currentDate: new Date(), // "จุดอ้างอิง" ของมุมมองปัจจุบัน ปุ่มเปลี่ยนช่วงเวลาจะขยับค่านี้
  modal: null, // { type: 'addBranch' | 'moveBranch' | 'chipAction', ... }
};

function shiftView(delta) {
  const d = new Date(AdminState.currentDate);
  if (AdminState.view === 'month') d.setMonth(d.getMonth() + delta);
  else if (AdminState.view === 'week') d.setDate(d.getDate() + delta * 7);
  else d.setDate(d.getDate() + delta);
  AdminState.currentDate = d;
  renderAdmin();
}

function goToToday() {
  AdminState.currentDate = new Date();
  renderAdmin();
}

function getViewLabel() {
  const d = AdminState.currentDate;
  if (AdminState.view === 'month') return `${THAI_MONTHS[d.getMonth()]} ${toBuddhistYear(d.getFullYear())}`;
  if (AdminState.view === 'day') {
    return `${THAI_WEEKDAYS_FULL[(d.getDay() + 6) % 7]} ${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${toBuddhistYear(d.getFullYear())}`;
  }
  const monday = getMondayOf(d);
  const sunday = addDays(monday, 6);
  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.getDate()}-${sunday.getDate()} ${THAI_MONTHS[monday.getMonth()]} ${toBuddhistYear(monday.getFullYear())}`;
  }
  return `${monday.getDate()} ${THAI_MONTHS[monday.getMonth()]} - ${sunday.getDate()} ${THAI_MONTHS[sunday.getMonth()]} ${toBuddhistYear(sunday.getFullYear())}`;
}

// ============================================================================
// Header: เลือก Mer + สลับมุมมอง (เดือน/สัปดาห์/วัน) + เปลี่ยนช่วงเวลา
// ============================================================================

function renderAdminHeader() {
  const merSelect = h(
    'select',
    {
      onchange: (e) => {
        AdminState.merId = e.target.value;
        renderAdmin();
      },
    },
    MOCK_MERS.map((m) => h('option', { value: m.merId, selected: m.merId === AdminState.merId }, m.merName))
  );

  const viewTabs = h(
    'div',
    { class: 'admin-view-tabs' },
    [
      { id: 'month', label: 'เดือน' },
      { id: 'week', label: 'สัปดาห์' },
      { id: 'day', label: 'วัน' },
    ].map((v) =>
      h(
        'button',
        {
          class: `admin-view-tab ${AdminState.view === v.id ? 'is-active' : ''}`,
          onclick: () => {
            AdminState.view = v.id;
            renderAdmin();
          },
        },
        v.label
      )
    )
  );

  return h(
    'div',
    { class: 'admin-header' },
    h(
      'div',
      { class: 'admin-header__brand' },
      h('h1', {}, '📅 จัดตารางเข้าสาขา'),
      h('p', {}, 'ตารางเข้าสาขารายวันของแต่ละ Mer — ลากการ์ดเพื่อย้ายวัน หรือแตะการ์ดเพื่อย้าย/ลบ')
    ),
    h(
      'div',
      { class: 'admin-header__controls' },
      h('label', { class: 'admin-field' }, 'Mer', merSelect),
      viewTabs,
      h(
        'div',
        { class: 'admin-month-nav' },
        h('button', { class: 'admin-nav-btn', onclick: () => shiftView(-1) }, '‹'),
        h('div', { class: 'admin-month-label' }, getViewLabel()),
        h('button', { class: 'admin-nav-btn', onclick: () => shiftView(1) }, '›'),
        h('button', { class: 'admin-nav-btn admin-nav-btn--today', onclick: goToToday }, 'วันนี้')
      ),
      h('button', { class: 'admin-nav-btn', style: 'color:#ffb4b4', onclick: openResetConfirmModal }, '🔄 รีเซ็ตข้อมูลทดสอบ')
    )
  );
}

// ============================================================================
// เซลล์วัน (ใช้ร่วมกันทั้ง 3 มุมมอง) — รับ drag & drop, แสดง chip + ปุ่มเพิ่ม
// ============================================================================

function renderDayCell(date, mode) {
  const dateISO = ScheduleDataLayer.toDateISO(date);
  const dow = date.getDay();
  const isWeekend = dow === 0 || dow === 6;
  const storeIds = ScheduleDataLayer.getStoresForDate(AdminState.merId, dateISO);
  const big = mode !== 'month';

  const body =
    storeIds.length === 0 && isWeekend
      ? h('div', { class: 'cal-holiday' }, 'วันหยุด')
      : h('div', { class: `cal-chips ${big ? 'cal-chips--big' : ''}` }, storeIds.map((id) => renderBranchChip(dateISO, id, big)));

  const header =
    mode === 'month'
      ? h('div', { class: 'cal-daynum' }, String(date.getDate()))
      : h(
          'div',
          { class: 'cal-daynum cal-daynum--big' },
          `${THAI_WEEKDAYS_FULL[(date.getDay() + 6) % 7]} ${date.getDate()} ${THAI_MONTHS[date.getMonth()]}`
        );

  return h(
    'div',
    {
      class: mode === 'month' ? `cal-cell ${isWeekend ? 'cal-cell--weekend' : ''}` : `cal-agenda-row ${isWeekend ? 'cal-agenda-row--weekend' : ''}`,
      ondragover: (e) => e.preventDefault(),
      ondrop: (e) => {
        e.preventDefault();
        let data;
        try {
          data = JSON.parse(e.dataTransfer.getData('text/plain'));
        } catch (err) {
          return;
        }
        if (data && data.fromDateISO && data.fromDateISO !== dateISO) {
          ScheduleDataLayer.moveStoreToDay(AdminState.merId, data.fromDateISO, dateISO, data.storeId);
          renderAdmin();
        }
      },
    },
    header,
    body,
    h('button', { class: 'cal-addbtn', onclick: () => openAddBranchModal(dateISO) }, '+ เพิ่มสาขา')
  );
}

function renderBranchChip(dateISO, storeId, big) {
  const store = getStoreById(storeId);
  const label = store ? `${store.customer} - ${store.storeName}` : storeId;
  const hasNote = !!(store && store.note);
  return h(
    'div',
    {
      class: `branch-chip ${big ? 'branch-chip--big' : ''} ${hasNote ? 'branch-chip--special' : ''}`,
      title: hasNote ? store.note : '',
      draggable: 'true',
      ondragstart: (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ storeId, fromDateISO: dateISO }));
      },
      onclick: () => openChipActionModal(dateISO, storeId),
    },
    hasNote ? h('span', { class: 'chip-note-flag' }, '⚠') : null,
    h('span', { class: 'chip-label' }, label)
  );
}

// ============================================================================
// 3 มุมมอง: เดือน (grid) / สัปดาห์ (agenda 7 วัน) / วัน (agenda 1 วัน)
// ============================================================================

function renderMonthView() {
  const d = AdminState.currentDate;
  const year = d.getFullYear();
  const month = d.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // getDay(): 0=อาทิตย์..6=เสาร์ → แปลงให้สัปดาห์เริ่มวันจันทร์ (0=จันทร์..6=อาทิตย์)
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;

  const cells = [];
  for (let i = 0; i < mondayOffset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);

  const headRow = h('div', { class: 'cal-row cal-head' }, THAI_WEEKDAYS.map((wd) => h('div', { class: 'cal-headcell' }, wd)));

  const weekRows = [];
  for (let i = 0; i < cells.length; i += 7) {
    weekRows.push(
      h(
        'div',
        { class: 'cal-row' },
        cells.slice(i, i + 7).map((date) => (date ? renderDayCell(date, 'month') : h('div', { class: 'cal-cell cal-cell--empty' })))
      )
    );
  }

  return h('div', { class: 'cal-wrap' }, headRow, weekRows);
}

function renderWeekView() {
  const monday = getMondayOf(AdminState.currentDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  return h('div', { class: 'cal-agenda' }, days.map((date) => renderDayCell(date, 'week')));
}

function renderDayView() {
  return h('div', { class: 'cal-agenda' }, renderDayCell(AdminState.currentDate, 'day'));
}

function renderCalendar() {
  if (AdminState.view === 'week') return renderWeekView();
  if (AdminState.view === 'day') return renderDayView();
  return renderMonthView();
}

// ============================================================================
// Legend: เงื่อนไขพิเศษ (เช่น Tofu ต้องเข้าช่วงร้านเปิด)
// ============================================================================

function renderSpecialNotesLegend() {
  const specialStores = MOCK_STORES.filter((s) => s.note);
  if (specialStores.length === 0) return null;
  return h(
    'div',
    { class: 'admin-legend' },
    h('div', { class: 'admin-legend__title' }, '⚠ เงื่อนไขพิเศษที่ต้องระวังเวลาจัดตาราง'),
    specialStores.map((s) => h('div', { class: 'admin-legend__item' }, `${s.customer} - ${s.storeName}: ${s.note}`))
  );
}

// ============================================================================
// Modals: เพิ่มสาขา / เมนูจัดการการ์ด (ย้าย-ลบ) / ย้ายไปวันอื่น
// ============================================================================

function closeAdminModal() {
  AdminState.modal = null;
  renderAdmin();
}

function openAddBranchModal(dateISO) {
  AdminState.modal = { type: 'addBranch', dateISO, selectedStoreId: MOCK_STORES[0].storeId };
  renderAdmin();
}

function renderAddBranchModal(m) {
  return h(
    'div',
    { class: 'admin-modal-overlay' },
    h(
      'div',
      { class: 'admin-modal-sheet' },
      h('div', { class: 'admin-modal-title' }, `เพิ่มสาขาในวันที่ ${m.dateISO}`),
      h(
        'select',
        { onchange: (e) => { m.selectedStoreId = e.target.value; } },
        MOCK_STORES.map((s) => h('option', { value: s.storeId, selected: s.storeId === m.selectedStoreId }, `${s.customer} - ${s.storeName}`))
      ),
      h(
        'div',
        { class: 'admin-btn-row' },
        h('button', { class: 'admin-btn admin-btn--ghost', onclick: closeAdminModal }, 'ยกเลิก'),
        h(
          'button',
          {
            class: 'admin-btn admin-btn--primary',
            onclick: () => {
              ScheduleDataLayer.assignStoreToDay(AdminState.merId, m.dateISO, m.selectedStoreId);
              closeAdminModal();
            },
          },
          '+ เพิ่ม'
        )
      )
    )
  );
}

/** แตะที่การ์ดสาขา → เปิดเมนูคล้าย Google Calendar เลือกย้ายวันหรือลบ */
function openChipActionModal(dateISO, storeId) {
  AdminState.modal = { type: 'chipAction', dateISO, storeId };
  renderAdmin();
}

function renderChipActionModal(m) {
  const store = getStoreById(m.storeId);
  return h(
    'div',
    { class: 'admin-modal-overlay' },
    h(
      'div',
      { class: 'admin-modal-sheet' },
      h('div', { class: 'admin-modal-title' }, store ? `${store.customer} - ${store.storeName}` : m.storeId),
      h('p', { class: 'admin-muted' }, `วันที่ ${m.dateISO}${store && store.note ? ' · ⚠ ' + store.note : ''}`),
      h('button', { class: 'admin-btn admin-btn--primary', onclick: () => openMoveBranchModal(m.dateISO, m.storeId) }, '📅 ย้ายไปวันอื่น'),
      h(
        'button',
        {
          class: 'admin-btn admin-btn--danger',
          onclick: () => {
            ScheduleDataLayer.removeStoreFromDay(AdminState.merId, m.dateISO, m.storeId);
            closeAdminModal();
          },
        },
        '🗑 ลบออกจากวันนี้'
      ),
      h('button', { class: 'admin-btn admin-btn--ghost', onclick: closeAdminModal }, 'ปิด')
    )
  );
}

function openMoveBranchModal(dateISO, storeId) {
  AdminState.modal = { type: 'moveBranch', dateISO, storeId, targetDate: '' };
  renderAdmin();
}

function renderMoveBranchModal(m) {
  const store = getStoreById(m.storeId);
  return h(
    'div',
    { class: 'admin-modal-overlay' },
    h(
      'div',
      { class: 'admin-modal-sheet' },
      h('div', { class: 'admin-modal-title' }, `ย้าย "${store ? store.storeName : m.storeId}" ไปวันอื่น`),
      h('p', { class: 'admin-muted' }, `จากวันที่ ${m.dateISO} — ใช้สำหรับขอสลับตาราง Visit ระหว่างเดือน (หรือลากการ์ดบนปฏิทินแทนก็ได้)`),
      h('input', { type: 'date', onchange: (e) => { m.targetDate = e.target.value; } }),
      h(
        'div',
        { class: 'admin-btn-row' },
        h('button', { class: 'admin-btn admin-btn--ghost', onclick: closeAdminModal }, 'ยกเลิก'),
        h(
          'button',
          {
            class: 'admin-btn admin-btn--primary',
            onclick: () => {
              if (!m.targetDate) return;
              ScheduleDataLayer.moveStoreToDay(AdminState.merId, m.dateISO, m.targetDate, m.storeId);
              closeAdminModal();
            },
          },
          'ย้าย'
        )
      )
    )
  );
}

function renderAdminModal() {
  const root = document.getElementById('admin-modal-root');
  clearNode(root);
  const m = AdminState.modal;
  if (!m) return;
  const renderers = {
    addBranch: renderAddBranchModal,
    moveBranch: renderMoveBranchModal,
    chipAction: renderChipActionModal,
  };
  const node = renderers[m.type] ? renderers[m.type](m) : null;
  if (node) root.appendChild(node);
}

// ============================================================================
// Render dispatcher + Init
// ============================================================================

function renderAdmin() {
  const page = h('div', { class: 'admin-page' }, renderAdminHeader(), renderCalendar(), renderSpecialNotesLegend());
  mount(page, 'admin-app');
  renderAdminModal();
}

function initAdmin() {
  ScheduleDataLayer.seedDefaultScheduleIfEmpty();
  renderAdmin();
}

document.addEventListener('DOMContentLoaded', initAdmin);
