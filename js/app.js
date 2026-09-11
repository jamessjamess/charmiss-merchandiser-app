/**
 * app.js
 * -----------------------------------------------------------------------
 * Merchandiser App — UI layer + state machine (Vanilla JS, no
 * framework, no build step).
 *
 * โครงสร้างไฟล์:
 *   1) AppState                             — state ของแอปทั้งหมดอยู่ตรงนี้ที่เดียว
 *   2) Shared components (header, modal)    — ใช้ร่วมกันหลายหน้า
 *   3) Screen: Login (จำลองการล็อกอินของ Mer)
 *   4) Screen: Store List (Phase 1 - หน้า 1)
 *   5) Screen: Check-in (Phase 1 - หน้า 2)
 *   6) Screen: Phase 2 (6 steps)
 *   7) Screen: Phase 3 (เก็บข้อมูลเชิงลึก)
 *   8) Screen: Phase 4 (สรุปงาน + เช็คเอาท์)
 *   9) Modals
 *   10) Init
 *
 * ทุกจุดที่ต้องอ่าน/เขียนข้อมูล เรียกผ่าน `DataLayer` เท่านั้น (ดู dataLayer.js)
 * เพื่อให้ UI ไม่ผูกกับ localStorage โดยตรง — วันหน้าต่อ API จริงได้ทันที
 *
 * DOM helper (h, mount, clearNode) อยู่ใน dom.js — ใช้ร่วมกับ admin.js
 */

function formatDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/**
 * นาฬิกาแบบ real-time — อัปเดต DOM node ตรงๆ ทุกวินาที โดยไม่เรียก render()
 * ของทั้งแอป (เพื่อไม่ให้กระทบ focus ของ input ที่ผู้ใช้อาจกำลังพิมพ์อยู่)
 * ทำงานได้กับทุกหน้าที่มี element id="live-clock" อยู่ ณ ขณะนั้น
 */
function startLiveClock() {
  const tick = () => {
    const el = document.getElementById('live-clock');
    if (!el) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString('th-TH', { weekday: 'short', day: '2-digit', month: 'short', year: '2-digit' });
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    el.textContent = `${dateStr} · ${timeStr} น.`;
  };
  tick();
  setInterval(tick, 1000);
}

// ============================================================================
// 1) AppState — single source of truth ของ UI state (ไม่ใช่ persisted data;
//    persisted data ของแต่ละ visit เก็บผ่าน DataLayer)
// ============================================================================

const AppState = {
  screen: 'LOGIN', // LOGIN | STORE_LIST | PROFILE | CHECKIN | PHASE2 | PHASE3 | PHASE4 | CHECKOUT
  storeId: null,
  visit: null,
  readOnly: false, // true เมื่อกลับมาดูรายงานของสาขาที่ "เสร็จแล้ว" (ดูอย่างเดียว)
  phase2Step: 1,
  ui: {
    checkinLoading: false,
    checkinPhoto: null, // ภาพหน้าสาขา (ภายนอก) ที่ถ่ายไว้ก่อนกดเช็คอิน — ยังไม่มี visit ให้เก็บตอนนี้
    loginForm: { username: '', password: '', error: '' },
    modal: null, // descriptor ของ modal ที่เปิดอยู่ (ดูหัวข้อ 9)
  },
  phase3Draft: { tag: null, text: '', photo: null },
};

function countFlags(visit) {
  if (!visit) return 0;
  return (
    visit.product.restockIssues.length +
    visit.product.belowThresholdIssues.length +
    visit.product.priceIssues.length +
    visit.tester.flagNewTesterRequest.length +
    (visit.posm.flagPendingInstall ? 1 : 0)
  );
}

// ============================================================================
// 2) Shared components
// ============================================================================

const PHASE_LABELS = { 1: 'ก่อนเข้าสาขา', 2: 'งานหลักตามหน้าที่', 3: 'เก็บข้อมูลเชิงลึก', 4: 'ปิดงาน' };

function renderVisitHeader({ phase, phase2Step, onBack, title }) {
  const flagCount = countFlags(AppState.visit);
  const steps = [1, 2, 3, 4].map((p) =>
    h('div', { class: `phase-progress__step ${p < phase ? 'is-done' : p === phase ? 'is-current' : ''}` })
  );
  const children = [
    h(
      'div',
      { class: 'app-header__top' },
      onBack ? h('button', { class: 'app-header__back', onclick: onBack }, '←') : null,
      h('div', { class: 'app-header__title' }, title || ''),
      flagCount > 0 ? h('div', { class: 'app-header__flagcount' }, `⚑ ${flagCount}`) : null
    ),
    h('div', { class: 'phase-progress' }, steps),
    h('div', { class: 'phase-progress__label' }, `Phase ${phase}/4 · ${PHASE_LABELS[phase]}`),
  ];
  if (phase === 2) {
    // แต่ละจุดกดข้ามไปมาระหว่าง step ได้อิสระ (ไม่บังคับทำตามลำดับ) — สีเขียว
    // สะท้อนว่า step นั้นครบจริงหรือยัง (เช็คจาก validator) ไม่ใช่แค่ "ผ่านมาแล้ว"
    const dots = STEP_VALIDATORS.slice(1).map((validator, idx) => {
      const stepNum = idx + 1;
      const done = AppState.visit ? validator(AppState.visit) : false;
      const isCurrent = stepNum === phase2Step;
      return h('button', {
        class: `substep-dots__dot ${done ? 'is-done' : ''} ${isCurrent ? 'is-current' : ''}`,
        onclick: () => goToPhase2Step(stepNum),
      });
    });
    children.push(h('div', { class: 'substep-dots' }, dots));
    // แสดงชื่อขั้นตอนทั้ง 6 อันในตัวเลือกเดียว กดเลือกแล้วข้ามไปขั้นตอนนั้นได้ทันที
    // (มีเครื่องหมาย ✓ กำกับขั้นตอนที่ทำครบแล้ว)
    children.push(
      h(
        'select',
        {
          class: 'phase2-step-select',
          onchange: (e) => goToPhase2Step(Number(e.target.value)),
        },
        STEP_LABELS.slice(1).map((label, idx) => {
          const stepNum = idx + 1;
          const done = AppState.visit ? STEP_VALIDATORS[stepNum](AppState.visit) : false;
          return h('option', { value: stepNum, selected: stepNum === phase2Step }, `${done ? '✓ ' : ''}${label}`);
        })
      )
    );
  }
  return h('div', { class: 'app-header' }, children);
}

function renderCheckRow({ label, sub, checked, onToggle }) {
  return h(
    'label',
    { class: 'check-row' },
    h('input', { type: 'checkbox', checked: checked, onchange: (e) => onToggle(e.target.checked) }),
    h('div', {}, h('div', { class: 'check-row__label' }, label), sub ? h('div', { class: 'check-row__sub' }, sub) : null)
  );
}

function renderCameraButton(onCapture, label) {
  const input = h('input', {
    type: 'file',
    accept: 'image/*',
    capture: 'environment',
    style: 'display:none',
    onchange: (e) => {
      const file = e.target.files[0];
      if (!file) return;
      ImageUtils.fileToDataUrl(file).then(onCapture);
    },
  });
  return h('label', { class: 'camera-btn' }, h('div', { class: 'camera-btn__icon' }, '📷'), h('div', {}, label), input);
}

function editBtn(onclick) {
  return h('button', { class: 'btn-sm btn-outline', style: 'width:auto', onclick }, 'แก้ไข');
}

// ============================================================================
// 3) Screen: Login (จำลองการล็อกอินของ Mer แต่ละคน — ยังไม่มี auth จริง)
// ============================================================================

function renderLoginScreen() {
  const form = AppState.ui.loginForm;

  const content = h(
    'div',
    { class: 'screen', style: 'justify-content:center;flex:1' },
    h('div', { class: 'big-icon' }, '🧴'),
    h('h2', { class: 'center-text', style: 'margin:4px 0 2px' }, 'Merchandiser App'),
    h('p', { class: 'muted center-text' }, 'เข้าสู่ระบบเพื่อเริ่มงาน'),
    h('div', { id: 'live-clock', class: 'muted center-text', style: 'font-weight:700;margin-bottom:6px' }),
    h(
      'div',
      { class: 'card', style: 'margin-top:6px' },
      h('label', { class: 'field-label' }, 'ชื่อผู้ใช้'),
      h('input', {
        type: 'text',
        placeholder: 'Username',
        value: form.username,
        oninput: (e) => { form.username = e.target.value; },
      }),
      h('label', { class: 'field-label', style: 'margin-top:10px' }, 'รหัสผ่าน'),
      h('input', {
        type: 'password',
        placeholder: 'Password',
        value: form.password,
        oninput: (e) => { form.password = e.target.value; },
        onkeydown: (e) => { if (e.key === 'Enter') handleLoginSubmit(); },
      }),
      form.error ? h('div', { class: 'error-box', style: 'margin-top:10px' }, form.error) : null,
      h('button', { class: 'btn btn-primary', style: 'margin-top:14px', onclick: handleLoginSubmit }, 'เข้าสู่ระบบ')
    ),
    h('p', { class: 'muted center-text', style: 'margin-top:20px;margin-bottom:2px' }, 'เข้าสู่ระบบด่วน (preset สำหรับทดสอบ)'),
    h(
      'div',
      { style: 'display:flex;flex-direction:column;gap:8px;margin-top:4px' },
      MOCK_MERS.map((m) =>
        h('button', { class: 'btn btn-ghost btn-sm', onclick: () => handleLogin(m.merId) }, `👤 ${m.merName} (${m.username}/${m.password})`)
      )
    ),
    h('button', { class: 'btn-sm btn-ghost', style: 'margin-top:28px;color:var(--color-danger)', onclick: openResetConfirmModal }, '🔄 รีเซ็ตข้อมูลทดสอบทั้งหมด')
  );
  return h('div', {}, content);
}

function handleLoginSubmit() {
  const form = AppState.ui.loginForm;
  const match = MOCK_MERS.find((m) => m.username.toLowerCase() === form.username.trim().toLowerCase());
  if (!match || DataLayer.getMerPassword(match.merId) !== form.password) {
    form.error = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
    render();
    return;
  }
  handleLogin(match.merId);
}

function handleLogin(merId) {
  ScheduleDataLayer.setCurrentMerId(merId);
  AppState.ui.loginForm = { username: '', password: '', error: '' };
  // การันตีว่า Tofu (มีเงื่อนไขพิเศษ) อยู่ในคิววันนี้เสมอ ไม่ว่าจะ login วันไหน
  // เพื่อใช้ demo flow ของสาขาที่มีเงื่อนไขพิเศษได้ทันที (idempotent — ไม่ซ้ำ)
  ScheduleDataLayer.assignStoreToDay(merId, ScheduleDataLayer.toDateISO(new Date()), 'BR11');
  AppState.screen = 'STORE_LIST';
  render();
}

function handleLogout() {
  AppState.screen = 'LOGIN';
  AppState.visit = null;
  AppState.storeId = null;
  AppState.readOnly = false;
  AppState.ui.loginForm = { username: '', password: '', error: '' };
  render();
}

// ============================================================================
// 4) Screen: Store List
// ============================================================================

function statusBadge(status) {
  if (status === 'completed') return h('span', { class: 'badge badge-success' }, '✓ เสร็จแล้ว');
  if (status === 'in_progress') return h('span', { class: 'badge badge-warning' }, '● ค้างงาน');
  return h('span', { class: 'badge badge-gray' }, 'ยังไม่ไป');
}

function renderStoreCard(store) {
  return h(
    'button',
    { class: 'store-card', onclick: () => handleSelectStore(store) },
    store.scheduledTime ? h('div', { class: 'store-card__time' }, store.scheduledTime) : null,
    h(
      'div',
      { class: 'store-card__body' },
      h('p', { class: 'store-card__customer' }, store.customer),
      h('p', { class: 'store-card__name' }, store.storeName),
      h('p', { class: 'store-card__addr' }, store.address),
      store.note ? h('p', { class: 'store-card__note' }, `ℹ ${store.note}`) : null,
      store.isAdHoc ? h('span', { class: 'badge badge-warning', style: 'margin-top:4px' }, '🔧 งานแทรก') : null
    ),
    statusBadge(store.status)
  );
}

/** แถบความคืบหน้ารายวัน — "ไปมาแล้ว X/Y ร้านในวันนี้" อัปเดตทุกครั้งที่กลับมาหน้านี้ */
function renderDailyProgressBar() {
  const { completed, total } = DataLayer.getTodayProgress();
  if (total === 0) return null;
  const pct = Math.round((completed / total) * 100);
  return h(
    'div',
    { class: 'daily-progress' },
    h('div', { class: 'daily-progress__label' }, `ไปมาแล้ว ${completed}/${total} ร้านในวันนี้`),
    h('div', { class: 'daily-progress__track' }, h('div', { class: 'daily-progress__fill', style: `width:${pct}%` }))
  );
}

function renderStoreListScreen() {
  const header = h('div', { class: 'app-header' }, h('div', { class: 'app-header__top' }, h('div', { class: 'app-header__title' }, 'งานที่ต้องทำ')));

  const content = h('div', { class: 'screen screen--with-nav' });
  const progressBar = renderDailyProgressBar();
  if (progressBar) content.appendChild(progressBar);

  content.appendChild(h('p', { class: 'muted', style: 'margin:14px 0 10px' }, 'รายชื่อสาขาที่ต้องเข้าเยี่ยมวันนี้'));

  const listContainer = h('div', { style: 'display:flex;flex-direction:column;gap:10px' }, h('p', { class: 'muted' }, 'กำลังโหลดรายชื่อสาขา...'));
  content.appendChild(listContainer);
  content.appendChild(h('button', { class: 'btn btn-outline btn-sm', onclick: openAddAdHocModal }, '+ เพิ่มสาขา (งานแทรก)'));

  DataLayer.getTodayStores().then((stores) => {
    clearNode(listContainer);

    if (stores.length === 0) {
      listContainer.appendChild(
        h('div', { class: 'info-box' }, 'ยังไม่มีคิวสาขาสำหรับวันนี้ — ติดต่อ Admin เพื่อจัดตารางเข้าสาขา หรือกด "+ เพิ่มสาขา (งานแทรก)" ด้านล่าง')
      );
      return;
    }

    stores.forEach((store) => listContainer.appendChild(renderStoreCard(store)));
  });

  return h('div', {}, header, content, renderBottomNav('STORE_LIST'));
}

// ============================================================================
// Bottom Nav — ใช้กับหน้าระดับบนสุดเท่านั้น (Store List, Profile) ไม่แสดงระหว่าง
// อยู่ใน flow เข้าสาขา (Check-in/Phase2-4) เพราะหน้าพวกนั้นมี back+step nav ของตัวเองแล้ว
// ============================================================================

function renderBottomNav(activeScreen) {
  const items = [
    { screen: 'STORE_LIST', icon: '📋', label: 'งานที่ต้องทำ' },
    { screen: null, icon: '📅', label: 'ปฏิทิน', href: 'admin.html' },
    { screen: 'PROFILE', icon: '👤', label: 'โปรไฟล์' },
  ];
  return h(
    'div',
    { class: 'bottom-nav' },
    items.map((item) =>
      item.href
        ? h(
            'a',
            { class: 'bottom-nav__item', href: item.href },
            h('div', { class: 'bottom-nav__icon' }, item.icon),
            h('div', { class: 'bottom-nav__label' }, item.label)
          )
        : h(
            'button',
            {
              class: `bottom-nav__item ${activeScreen === item.screen ? 'is-active' : ''}`,
              onclick: () => {
                AppState.screen = item.screen;
                render();
              },
            },
            h('div', { class: 'bottom-nav__icon' }, item.icon),
            h('div', { class: 'bottom-nav__label' }, item.label)
          )
    )
  );
}

// ============================================================================
// Screen: Profile — แก้ไขชื่อที่แสดง/เบอร์โทร (mock, ยังไม่มี backend จริง) + ออกจากระบบ
// ============================================================================

function renderProfileScreen() {
  const merId = ScheduleDataLayer.getCurrentMerId();
  const mer = getMerById(merId);
  const savedProfile = DataLayer.getMerProfile(merId);
  const form = { displayName: savedProfile.displayName || (mer ? mer.merName : ''), phone: savedProfile.phone || '' };
  const pwForm = { current: '', next: '', confirm: '' };

  const header = h(
    'div',
    { class: 'app-header' },
    h('div', { class: 'app-header__top' }, h('div', { class: 'app-header__title' }, 'โปรไฟล์')),
    h('div', { class: 'muted' }, `เข้าสู่ระบบด้วย username: ${mer ? mer.username : '-'}`)
  );

  const photoInput = h('input', {
    type: 'file',
    accept: 'image/*',
    style: 'display:none',
    onchange: (e) => {
      const file = e.target.files[0];
      if (!file) return;
      ImageUtils.fileToDataUrl(file).then((url) => {
        DataLayer.saveMerProfile(merId, { photoDataUrl: url }).then(() => render());
      });
    },
  });

  const avatarBlock = h(
    'div',
    { class: 'card center-text' },
    savedProfile.photoDataUrl ? h('img', { class: 'profile-avatar', src: savedProfile.photoDataUrl }) : h('div', { class: 'big-icon' }, '👤'),
    h('h2', { style: 'margin:6px 0 0' }, mer ? mer.merName : ''),
    h('label', { class: 'btn-sm btn-outline', style: 'width:auto;display:inline-block;margin-top:10px;cursor:pointer' }, '📷 เปลี่ยนรูปโปรไฟล์', photoInput)
  );

  const savedMsgBox = h('div', {});

  const generalCard = h(
    'div',
    { class: 'card' },
    h('label', { class: 'field-label' }, 'ชื่อที่แสดง'),
    h('input', { type: 'text', value: form.displayName, oninput: (e) => { form.displayName = e.target.value; } }),
    h('label', { class: 'field-label', style: 'margin-top:10px' }, 'เบอร์โทรติดต่อ (ไม่บังคับ)'),
    h('input', { type: 'text', placeholder: '08X-XXX-XXXX', value: form.phone, oninput: (e) => { form.phone = e.target.value; } }),
    savedMsgBox,
    h(
      'button',
      {
        class: 'btn btn-primary',
        style: 'margin-top:12px',
        onclick: () => {
          DataLayer.saveMerProfile(merId, { displayName: form.displayName.trim(), phone: form.phone.trim() });
          clearNode(savedMsgBox);
          savedMsgBox.appendChild(h('div', { class: 'info-box', style: 'margin-top:10px' }, '✓ บันทึกโปรไฟล์แล้ว'));
        },
      },
      'บันทึก'
    )
  );

  const pwMsgBox = h('div', {});
  const currentPwInput = h('input', { type: 'password', placeholder: 'รหัสผ่านเดิม', oninput: (e) => { pwForm.current = e.target.value; } });
  const nextPwInput = h('input', { type: 'password', placeholder: 'รหัสผ่านใหม่', oninput: (e) => { pwForm.next = e.target.value; } });
  const confirmPwInput = h('input', { type: 'password', placeholder: 'ยืนยันรหัสผ่านใหม่', oninput: (e) => { pwForm.confirm = e.target.value; } });

  const passwordCard = h(
    'div',
    { class: 'card' },
    h('div', { class: 'section-title' }, 'เปลี่ยนรหัสผ่าน'),
    h('label', { class: 'field-label', style: 'margin-top:6px' }, 'รหัสผ่านเดิม'),
    currentPwInput,
    h('label', { class: 'field-label', style: 'margin-top:10px' }, 'รหัสผ่านใหม่'),
    nextPwInput,
    h('label', { class: 'field-label', style: 'margin-top:10px' }, 'ยืนยันรหัสผ่านใหม่'),
    confirmPwInput,
    pwMsgBox,
    h(
      'button',
      {
        class: 'btn btn-primary',
        style: 'margin-top:12px',
        onclick: () => {
          clearNode(pwMsgBox);
          if (pwForm.current !== DataLayer.getMerPassword(merId)) {
            pwMsgBox.appendChild(h('div', { class: 'error-box' }, 'รหัสผ่านเดิมไม่ถูกต้อง'));
            return;
          }
          if (!pwForm.next || pwForm.next.length < 4) {
            pwMsgBox.appendChild(h('div', { class: 'error-box' }, 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร'));
            return;
          }
          if (pwForm.next !== pwForm.confirm) {
            pwMsgBox.appendChild(h('div', { class: 'error-box' }, 'ยืนยันรหัสผ่านใหม่ไม่ตรงกัน'));
            return;
          }
          DataLayer.saveMerProfile(merId, { password: pwForm.next });
          pwForm.current = '';
          pwForm.next = '';
          pwForm.confirm = '';
          currentPwInput.value = '';
          nextPwInput.value = '';
          confirmPwInput.value = '';
          pwMsgBox.appendChild(h('div', { class: 'info-box' }, '✓ เปลี่ยนรหัสผ่านแล้ว'));
        },
      },
      'เปลี่ยนรหัสผ่าน'
    )
  );

  const content = h(
    'div',
    { class: 'screen screen--with-nav' },
    avatarBlock,
    generalCard,
    passwordCard,
    h('button', { class: 'btn btn-ghost', onclick: handleLogout }, 'ออกจากระบบ'),
    h('button', { class: 'btn btn-danger', style: 'margin-top:8px', onclick: openResetConfirmModal }, '🔄 รีเซ็ตข้อมูล Demo')
  );

  return h('div', {}, header, content, renderBottomNav('PROFILE'));
}

function openAddAdHocModal() {
  AppState.ui.modal = { type: 'addAdHoc', selectedStoreId: '' };
  render();
}

function handleSelectStore(store) {
  const status = DataLayer.getStoreStatus(store.storeId);
  AppState.storeId = store.storeId;
  AppState.ui.checkinPhoto = null; // เคลียร์ภาพหน้าสาขาที่อาจค้างจากการเลือกสาขาอื่นก่อนหน้า

  if (status === 'completed') {
    AppState.visit = DataLayer.getResumableVisit(store.storeId);
    AppState.readOnly = true;
    AppState.screen = 'PHASE4';
    render();
    return;
  }

  if (status === 'in_progress') {
    // getResumableVisit คืน null ถ้าข้อมูลเก่า/พังจนต่อไม่ได้ (เคลียร์และรีเซ็ต
    // สถานะเป็น "ยังไม่ไป" ให้แล้วภายใน) — resumeToVisitScreen(null) จะพา
    // กลับไปหน้าเช็คอินให้เริ่มใหม่โดยอัตโนมัติแทนที่จะทำให้แอปพัง
    const visit = DataLayer.getResumableVisit(store.storeId);
    AppState.visit = visit;
    AppState.readOnly = false;
    resumeToVisitScreen(visit);
    render();
    return;
  }

  // pending — ยังไม่เคยเข้าสาขานี้วันนี้
  AppState.visit = null;
  AppState.readOnly = false;
  AppState.screen = 'CHECKIN';
  render();
}

function resumeToVisitScreen(visit) {
  if (!visit || !visit.checkIn) {
    AppState.screen = 'CHECKIN';
    return;
  }
  const phase = visit.currentPhase || 2;
  AppState.screen = phase >= 4 ? 'PHASE4' : phase === 3 ? 'PHASE3' : 'PHASE2';
  AppState.phase2Step = visit.currentPhase2Step || 1;
}

// ============================================================================
// 5) Screen: Check-in
// ============================================================================

const MANUAL_REASON_OPTIONS = [
  { value: 'gps_weak', label: 'สัญญาณ GPS อ่อน/ไม่แม่นยำ' },
  { value: 'out_of_radius', label: 'อยู่นอกรัศมีที่กำหนด (แต่ยืนยันว่าอยู่หน้าร้านจริง)' },
  { value: 'device_issue', label: 'อุปกรณ์/แอปมีปัญหาในการดึงพิกัด' },
  { value: 'other', label: 'อื่นๆ (ระบุเพิ่มเติม)' },
];

function manualReasonLabel(value) {
  const found = MANUAL_REASON_OPTIONS.find((o) => o.value === value);
  return found ? found.label : value;
}

function renderCheckinScreen() {
  const store = getStoreById(AppState.storeId);
  const header = renderVisitHeader({
    phase: 1,
    onBack: () => {
      AppState.screen = 'STORE_LIST';
      render();
    },
    title: store.storeName,
  });

  const hasPhoto = !!AppState.ui.checkinPhoto;

  const photoCard = h(
    'div',
    { class: 'card' },
    h('div', { class: 'section-title', style: 'margin-top:0' }, '📷 ถ่ายภาพหน้าสาขา (ภายนอก)'),
    h('p', { class: 'section-hint' }, 'ใช้เป็นหลักฐานยืนยันว่าอยู่หน้าร้านจริง (บังคับก่อนเช็คอิน)'),
    hasPhoto
      ? h(
          'div',
          { class: 'photo-grid' },
          h(
            'div',
            { class: 'photo-thumb' },
            h('img', { src: AppState.ui.checkinPhoto }),
            h(
              'button',
              {
                class: 'photo-thumb__remove',
                onclick: () => {
                  AppState.ui.checkinPhoto = null;
                  render();
                },
              },
              '✕'
            )
          )
        )
      : h(
          'div',
          { class: 'photo-grid' },
          renderCameraButton((dataUrl) => {
            AppState.ui.checkinPhoto = dataUrl;
            render();
          }, 'ถ่ายภาพ')
        )
  );

  const content = h(
    'div',
    { class: 'screen' },
    h(
      'div',
      { class: 'card center-text' },
      h('div', { class: 'big-icon' }, '📍'),
      h('p', { class: 'store-card__customer', style: 'text-align:center' }, store.customer),
      h('h2', { style: 'margin:0' }, store.storeName),
      h('p', { class: 'muted' }, store.address),
      store.scheduledTime ? h('p', { class: 'muted' }, `เวลานัดหมาย ${store.scheduledTime}`) : null,
      store.note ? h('div', { class: 'flag-note', style: 'margin-top:8px;text-align:left' }, `ℹ ${store.note}`) : null,
      h('div', { id: 'live-clock', class: 'muted', style: 'margin-top:10px;font-weight:700' })
    ),
    photoCard,
    h(
      'button',
      { class: 'btn btn-primary', disabled: AppState.ui.checkinLoading || !hasPhoto, onclick: handleCheckin },
      AppState.ui.checkinLoading ? 'กำลังตรวจสอบตำแหน่ง...' : '📍 เช็คอิน'
    ),
    !hasPhoto ? h('p', { class: 'muted center-text' }, 'ต้องถ่ายภาพหน้าสาขาก่อนจึงจะเช็คอินได้') : null,
    h('p', { class: 'muted center-text' }, 'หากจับสัญญาณ GPS ไม่ได้ ระบบจะให้บันทึกตำแหน่งแบบ Manual แทน')
  );

  return h('div', {}, header, content);
}

/**
 * ตัดการเช็คระยะห่างจากพิกัดสาขา (200 เมตร) ออกไปก่อนตามที่ขอ — แค่ดึง GPS
 * ได้สำเร็จก็ถือว่าเช็คอินผ่านทันที ไม่เทียบระยะทางอีกต่อไป fallback แบบ
 * manual จะขึ้นเฉพาะตอนดึงพิกัด GPS ไม่ได้เลย (ไม่ได้อนุญาตสิทธิ์/สัญญาณหลุด)
 */
function handleCheckin() {
  AppState.ui.checkinLoading = true;
  render();
  GeoUtils.getCurrentPosition()
    .then((pos) => {
      AppState.ui.checkinLoading = false;
      completeCheckin({ lat: pos.lat, lng: pos.lng, gpsMatched: true, manualReason: null });
    })
    .catch(() => {
      AppState.ui.checkinLoading = false;
      openManualCheckinModal({ lat: null, lng: null, autoNote: 'ไม่สามารถดึงพิกัด GPS ได้ (อาจไม่ได้อนุญาตสิทธิ์ตำแหน่ง หรือสัญญาณอ่อน)' });
    });
}

function openManualCheckinModal({ lat, lng, autoNote }) {
  AppState.ui.modal = { type: 'manualCheckin', lat, lng, autoNote, reasonOption: 'gps_weak', reasonText: '' };
  render();
}

function confirmManualCheckin(modalState) {
  const reasonText = `${manualReasonLabel(modalState.reasonOption)}${modalState.reasonText ? ' - ' + modalState.reasonText : ''}`;
  AppState.ui.modal = null;
  completeCheckin({ lat: modalState.lat, lng: modalState.lng, gpsMatched: false, manualReason: reasonText });
}

function completeCheckin({ lat, lng, gpsMatched, manualReason }) {
  const store = getStoreById(AppState.storeId);
  DataLayer.getOrCreateVisit(store.storeId, store.storeName).then((visit) => {
    visit.checkIn = { timestamp: new Date().toISOString(), gpsLat: lat, gpsLng: lng, gpsMatched, manualReason: manualReason || null };
    visit.checkinPhoto = AppState.ui.checkinPhoto;
    visit.currentPhase = 2;
    visit.phaseCompleted = 1;
    DataLayer.saveVisit(visit);
    AppState.visit = visit;
    AppState.ui.checkinPhoto = null;
    AppState.screen = 'PHASE2';
    AppState.phase2Step = 1;
    render();
  });
}

// ============================================================================
// 6) Screen: Phase 2 (6 steps)
// ============================================================================

function isStep1Valid(v) {
  return v.photosBefore.length >= 1;
}
function isStep2Valid(v) {
  const p = v.product;
  const restockOk = p.restockDone || p.restockIssues.length > 0;
  const priceOk = p.priceOk || p.priceIssues.length > 0;
  const thresholdOk = p.belowThresholdChecked || p.belowThresholdIssues.length > 0;
  const photoOk = p.shelfPhotos.length >= 1;
  return restockOk && p.fifoDone && thresholdOk && priceOk && photoOk;
}
function isStep3Valid(v) {
  const t = v.tester;
  const workOk = t.refillDone || t.flagNewTesterRequest.length > 0;
  return workOk && t.afterPhotos.length >= 1;
}
function isStep4Valid(v) {
  const p = v.posm;
  if (p.conditionOk) return true;
  return p.flagPendingInstall && p.issuePhotos.length >= 1;
}
function isStep5Valid(v) {
  return v.npd.answered;
}
function isStep6Valid(v) {
  return v.photosAfter.length >= 1;
}

const STEP_VALIDATORS = [null, isStep1Valid, isStep2Valid, isStep3Valid, isStep4Valid, isStep5Valid, isStep6Valid];
const STEP_LABELS = [null, '1. ถ่ายภาพ Before', '2. จัดการสินค้าที่ชั้นวาง', '3. Tester', '4. POSM', '5. NPD', '6. ถ่ายภาพ After'];

function getIncompletePhase2Steps(visit) {
  const missing = [];
  for (let i = 1; i <= 6; i++) {
    if (!STEP_VALIDATORS[i](visit)) missing.push(STEP_LABELS[i]);
  }
  return missing;
}

/**
 * ทุก step ข้ามไปมาได้อิสระ ยกเว้น Step 1 (ถ่ายภาพ Before) ที่ต้องทำให้เสร็จ
 * ก่อนเสมอ — เพราะเป็นหลักฐาน "ก่อน" ที่ step อื่นๆ (โดยเฉพาะภาพ After ใน
 * step 6) ต้องใช้เทียบ ถ้ายังไม่ถ่าย จะดีดกลับไป step 1 พร้อมแจ้งเตือน
 */
function goToPhase2Step(n) {
  if (n !== 1 && !isStep1Valid(AppState.visit)) {
    AppState.phase2Step = 1;
    AppState.visit.currentPhase2Step = 1;
    DataLayer.saveVisit(AppState.visit);
    AppState.ui.modal = { type: 'stepGate' };
    render();
    return;
  }
  AppState.phase2Step = n;
  AppState.visit.currentPhase2Step = n;
  DataLayer.saveVisit(AppState.visit);
  render();
}

/**
 * แต่ละ Step ใน Phase 2 สลับไปมาได้อิสระ ไม่บังคับทำให้ครบก่อนถึงจะไปต่อได้
 * (เดิม disable ปุ่ม "ถัดไป" จนกว่า step ปัจจุบันจะครบ — ตัดออกแล้ว) ความครบถ้วน
 * จะถูกตรวจอีกทีตอนกด "จบงาน Phase 2" เท่านั้น (ดู handleFinishPhase2) ส่วน hint
 * ที่นี่เหลือไว้เป็นแค่คำเตือนเบาๆ ไม่ block การกดผ่าน
 */
function renderStepFooter(stepNum, valid, hint, isLast) {
  const row = h('div', { class: 'btn-row' });
  if (stepNum > 1) {
    row.appendChild(h('button', { class: 'btn btn-ghost', onclick: () => goToPhase2Step(stepNum - 1) }, '← ย้อนกลับ'));
  }
  if (!isLast) {
    row.appendChild(h('button', { class: 'btn btn-primary', onclick: () => goToPhase2Step(stepNum + 1) }, 'ถัดไป →'));
  } else {
    row.appendChild(h('button', { class: 'btn btn-success', onclick: handleFinishPhase2 }, '✓ จบงาน Phase 2'));
  }
  return h('div', { class: 'footer-bar' }, !valid && hint ? h('div', { class: 'info-box' }, hint) : null, row);
}

function handleFinishPhase2() {
  const missing = getIncompletePhase2Steps(AppState.visit);
  if (missing.length > 0) {
    AppState.ui.modal = { type: 'infoMissing', missing };
    render();
    return;
  }
  AppState.visit.phaseCompleted = 2;
  AppState.visit.currentPhase = 3;
  DataLayer.saveVisit(AppState.visit);
  AppState.screen = 'PHASE3';
  render();
}

function renderPhase2Screen() {
  const header = renderVisitHeader({
    phase: 2,
    phase2Step: AppState.phase2Step,
    onBack: () => {
      AppState.screen = 'STORE_LIST';
      render();
    },
    title: AppState.visit.storeName,
  });
  const stepRenderers = {
    1: renderStep1Photos,
    2: renderStep2Product,
    3: renderStep3Tester,
    4: renderStep4Posm,
    5: renderStep5Npd,
    6: renderStep6PhotosAfter,
  };
  return h('div', {}, header, stepRenderers[AppState.phase2Step]());
}

// --- Step 1: Photo Before ---
function renderStep1Photos() {
  const v = AppState.visit;
  const grid = h('div', { class: 'photo-grid' });
  v.photosBefore.forEach((photo, idx) => {
    grid.appendChild(
      h(
        'div',
        { class: 'photo-thumb' },
        h('img', { src: photo }),
        h(
          'button',
          {
            class: 'photo-thumb__remove',
            onclick: () => {
              v.photosBefore.splice(idx, 1);
              DataLayer.saveVisit(v);
              render();
            },
          },
          '✕'
        )
      )
    );
  });
  grid.appendChild(
    renderCameraButton((dataUrl) => {
      v.photosBefore.push(dataUrl);
      DataLayer.saveVisit(v);
      render();
    }, v.photosBefore.length === 0 ? 'ถ่ายภาพ' : 'ถ่ายเพิ่ม')
  );

  return h(
    'div',
    { class: 'screen' },
    h('div', { class: 'section-title' }, '📷 ถ่ายภาพ Before'),
    h(
      'p',
      { class: 'section-hint' },
      'ถ่ายภาพรวมเคาน์เตอร์/ชั้นวางจากมุมมาตรฐาน (มุมเดิมทุกรอบ เพื่อเทียบกับภาพ After ได้ง่าย) บังคับอย่างน้อย 1 ภาพ — ถ่ายเพิ่มได้หากมีจุดที่มีปัญหาเด่นชัด'
    ),
    grid,
    renderStepFooter(1, isStep1Valid(v), 'ต้องถ่ายภาพอย่างน้อย 1 ภาพก่อนไปขั้นตอนถัดไป', false)
  );
}

// --- Step 2: จัดการสินค้าที่ชั้นวาง — 4 checklist ย่อย (2.1-2.4) + ถ่ายรูป (2.5) ---
function renderStep2Product() {
  const v = AppState.visit;
  const p = v.product;

  // ---------- 2.1 เติมสินค้าจากสต๊อกสำรอง จัดเรียงตำแหน่ง/เฉดสีให้ตรง Planogram/Par level ----------
  const restockCard = h(
    'div',
    { class: 'card' },
    renderCheckRow({
      label: 'จัดเติมสินค้าเรียบร้อย',
      sub: 'เติมจากสต๊อกสำรองเข้าช่องว่าง จัดเรียงตำแหน่ง/เฉดสีให้ตรงผัง Planogram หรือ Par level',
      checked: p.restockDone,
      onToggle: (val) => {
        p.restockDone = val;
        DataLayer.saveVisit(v);
        render();
      },
    })
  );
  p.restockIssues.forEach((f, idx) => {
    const typeLabel = f.type === 'shelf_full' ? 'ชั้นวางไม่พอ' : 'ไม่มีของให้เติม/ของหมด';
    restockCard.appendChild(
      h(
        'div',
        { class: 'flag-note' },
        h('span', {}, `⚑ ${typeLabel} — ${getSkuName(f.sku)}`),
        h(
          'button',
          {
            class: 'btn-sm btn-ghost',
            style: 'width:auto;margin-left:auto',
            onclick: () => {
              p.restockIssues.splice(idx, 1);
              DataLayer.saveVisit(v);
              render();
            },
          },
          'ลบ'
        )
      )
    );
  });
  restockCard.appendChild(h('button', { class: 'btn btn-outline btn-sm', onclick: openRestockIssueModal }, '+ แจ้งปัญหาการเติมสินค้า'));

  // ---------- 2.2 เช็ควันหมดอายุของที่วางอยู่ และเรียงไว้ตาม FIFO ----------
  const fifoCard = h(
    'div',
    { class: 'card' },
    renderCheckRow({
      label: 'เช็ควันหมดอายุ + เรียงตาม FIFO เรียบร้อย',
      sub: 'เช็ควันหมดอายุของที่วางอยู่ และเรียงไว้ตาม FIFO (ของเก่าอยู่หน้า ของใหม่อยู่หลัง)',
      checked: p.fifoDone,
      onToggle: (val) => {
        p.fifoDone = val;
        DataLayer.saveVisit(v);
        render();
      },
    })
  );

  // ---------- 2.3 ตรวจอายุสินค้าว่ามีปัญหาต่ำกว่าเกณฑ์หรือไม่ ----------
  const thresholdCard = h(
    'div',
    { class: 'card' },
    renderCheckRow({
      label: 'ตรวจสอบสินค้าอายุต่ำกว่าเกณฑ์แล้ว',
      sub: 'ตรวจอายุสินค้า (คนละเรื่องกับ FIFO) ว่ามีสินค้าอายุต่ำกว่าเกณฑ์ที่ขายได้หรือไม่',
      checked: p.belowThresholdChecked,
      onToggle: (val) => {
        p.belowThresholdChecked = val;
        DataLayer.saveVisit(v);
        render();
      },
    })
  );
  p.belowThresholdIssues.forEach((f, idx) => {
    thresholdCard.appendChild(
      h(
        'div',
        { class: 'flag-note' },
        h('span', {}, `⚑ ${getSkuName(f.sku)}${f.expired ? ' — ดึงออกแล้ว (หมดอายุ) ต้องแจ้งร้านเปิด CN' : ' — อายุต่ำกว่าเกณฑ์'}`),
        h(
          'button',
          {
            class: 'btn-sm btn-ghost',
            style: 'width:auto;margin-left:auto',
            onclick: () => {
              p.belowThresholdIssues.splice(idx, 1);
              DataLayer.saveVisit(v);
              render();
            },
          },
          'ลบ'
        )
      )
    );
  });
  thresholdCard.appendChild(h('button', { class: 'btn btn-outline btn-sm', onclick: openBelowThresholdModal }, '+ แจ้งสินค้าอายุต่ำกว่าเกณฑ์'));

  // ---------- 2.4 ตรวจเช็คราคาและ Promotion ----------
  const priceCard = h(
    'div',
    { class: 'card' },
    renderCheckRow({
      label: 'ราคา/ป้าย/โปรโมชั่นถูกต้อง',
      sub: 'เช็คป้ายตรง SKU และเช็คราคา/Promotion ความถูกต้อง (รวมกรณีแก้ไขแล้ว)',
      checked: p.priceOk,
      onToggle: (val) => {
        p.priceOk = val;
        DataLayer.saveVisit(v);
        render();
      },
    })
  );
  p.priceIssues.forEach((f, idx) => {
    priceCard.appendChild(
      h(
        'div',
        { class: 'flag-note' },
        h('span', {}, `⚑ ${getSkuName(f.sku)} — พบราคา ${f.foundPrice} บาท`),
        h(
          'button',
          {
            class: 'btn-sm btn-ghost',
            style: 'width:auto;margin-left:auto',
            onclick: () => {
              p.priceIssues.splice(idx, 1);
              DataLayer.saveVisit(v);
              render();
            },
          },
          'ลบ'
        )
      )
    );
  });
  priceCard.appendChild(h('button', { class: 'btn btn-outline btn-sm', onclick: openPriceFlagModal }, '+ แจ้งราคาไม่ตรง (ส่งส่วนกลางตรวจสอบ)'));

  // ---------- 2.5 ถ่ายรูปชั้นวางที่จัดเสร็จแล้ว ----------
  const shelfPhotoGrid = h('div', { class: 'photo-grid' });
  p.shelfPhotos.forEach((photo, idx) => {
    shelfPhotoGrid.appendChild(
      h(
        'div',
        { class: 'photo-thumb' },
        h('img', { src: photo }),
        h(
          'button',
          {
            class: 'photo-thumb__remove',
            onclick: () => {
              p.shelfPhotos.splice(idx, 1);
              DataLayer.saveVisit(v);
              render();
            },
          },
          '✕'
        )
      )
    );
  });
  shelfPhotoGrid.appendChild(
    renderCameraButton((dataUrl) => {
      p.shelfPhotos.push(dataUrl);
      DataLayer.saveVisit(v);
      render();
    }, p.shelfPhotos.length === 0 ? 'ถ่ายภาพ' : 'ถ่ายเพิ่ม')
  );

  return h(
    'div',
    { class: 'screen' },
    h('div', { class: 'section-title' }, '📦 จัดการสินค้าที่ชั้นวาง'),
    h('div', { class: 'section-title', style: 'font-size:13px;margin-top:2px' }, '2.1 เติมสินค้า/จัดเรียงตาม Planogram'),
    restockCard,
    h('div', { class: 'section-title', style: 'font-size:13px' }, '2.2 วันหมดอายุ + FIFO'),
    fifoCard,
    h('div', { class: 'section-title', style: 'font-size:13px' }, '2.3 อายุสินค้าต่ำกว่าเกณฑ์'),
    thresholdCard,
    h('div', { class: 'section-title', style: 'font-size:13px' }, '2.4 ราคาและ Promotion'),
    priceCard,
    h('div', { class: 'section-title', style: 'font-size:13px' }, '2.5 ถ่ายรูปชั้นวางที่จัดเสร็จแล้ว'),
    h('p', { class: 'section-hint' }, 'บังคับอย่างน้อย 1 ภาพ หลังจัดสินค้า/POSM/ราคาเรียบร้อยแล้ว'),
    shelfPhotoGrid,
    renderStepFooter(2, isStep2Valid(v), 'ยังมีข้อย่อยที่ยังไม่ได้ติ๊กครบ แจ้งปัญหา หรือถ่ายรูปชั้นวางให้ครบ', false)
  );
}

// --- Step 3: Tester ---
function renderStep3Tester() {
  const v = AppState.visit;
  const t = v.tester;

  // บันทึก Tester ที่พบว่าหมดก่อนเติม (หลักฐาน ไม่บังคับ ไม่ผูกกับความครบถ้วนของ step)
  const emptyCard = h(
    'div',
    { class: 'card' },
    h('div', { class: 'section-title', style: 'margin-top:0' }, 'บันทึก Tester ที่พบว่าหมดก่อนเติม'),
    h('p', { class: 'section-hint' }, 'เผื่อตรวจสอบย้อนหลังว่าก่อนเติมมีตัวไหนหมดบ้าง (ไม่บังคับ)')
  );
  t.emptySkus.forEach((sku, idx) => {
    emptyCard.appendChild(
      h(
        'div',
        { class: 'flag-note' },
        h('span', {}, getSkuName(sku)),
        h(
          'button',
          {
            class: 'btn-sm btn-ghost',
            style: 'width:auto;margin-left:auto',
            onclick: () => {
              t.emptySkus.splice(idx, 1);
              DataLayer.saveVisit(v);
              render();
            },
          },
          'ลบ'
        )
      )
    );
  });
  emptyCard.appendChild(h('button', { class: 'btn btn-outline btn-sm', onclick: openTesterEmptyModal }, '+ บันทึก Tester ที่หมด'));

  const refillCard = h(
    'div',
    { class: 'card' },
    renderCheckRow({
      label: 'เช็คปริมาณคงเหลือ และเติมเรียบร้อย',
      sub: 'เติมจากของสำรองให้ตัวที่หมด/ของไม่พอ',
      checked: t.refillDone,
      onToggle: (val) => {
        t.refillDone = val;
        DataLayer.saveVisit(v);
        render();
      },
    })
  );

  // หมดและไม่มีของเติม -> ต้องขอเบิก/เทสเตอร์ใหม่รอบหน้า (เพิ่มได้หลาย SKU ต่อเนื่อง)
  const flagCard = h('div', { class: 'card' }, h('div', { class: 'section-title', style: 'margin-top:0' }, 'หมดและไม่มีของเติม'));
  t.flagNewTesterRequest.forEach((sku, idx) => {
    flagCard.appendChild(
      h(
        'div',
        { class: 'flag-note' },
        h('span', {}, `⚑ ${getSkuName(sku)}`),
        h(
          'button',
          {
            class: 'btn-sm btn-ghost',
            style: 'width:auto;margin-left:auto',
            onclick: () => {
              t.flagNewTesterRequest.splice(idx, 1);
              DataLayer.saveVisit(v);
              render();
            },
          },
          'ลบ'
        )
      )
    );
  });
  flagCard.appendChild(h('button', { class: 'btn btn-outline btn-sm', onclick: openTesterFlagModal }, '+ ขอเทสเตอร์ใหม่/เบิกรอบหน้า'));

  // ถ่ายภาพหลังทำงานเสร็จ (บังคับอย่างน้อย 1 ภาพ)
  const photoGrid = h('div', { class: 'photo-grid' });
  t.afterPhotos.forEach((photo, idx) => {
    photoGrid.appendChild(
      h(
        'div',
        { class: 'photo-thumb' },
        h('img', { src: photo }),
        h(
          'button',
          {
            class: 'photo-thumb__remove',
            onclick: () => {
              t.afterPhotos.splice(idx, 1);
              DataLayer.saveVisit(v);
              render();
            },
          },
          '✕'
        )
      )
    );
  });
  photoGrid.appendChild(
    renderCameraButton((dataUrl) => {
      t.afterPhotos.push(dataUrl);
      DataLayer.saveVisit(v);
      render();
    }, t.afterPhotos.length === 0 ? 'ถ่ายภาพ' : 'ถ่ายเพิ่ม')
  );

  return h(
    'div',
    { class: 'screen' },
    h('div', { class: 'section-title' }, '💄 Tester'),
    emptyCard,
    refillCard,
    flagCard,
    h('div', { class: 'section-title', style: 'font-size:13px' }, 'ถ่ายภาพหลังทำงานเสร็จ'),
    h('p', { class: 'section-hint' }, 'บังคับอย่างน้อย 1 ภาพ'),
    photoGrid,
    renderStepFooter(3, isStep3Valid(v), 'ติ๊กให้เรียบร้อยหรือแจ้งขอเทสเตอร์ใหม่แทนอย่างน้อย 1 รายการ พร้อมถ่ายภาพหลังทำงานเสร็จ', false)
  );
}

// --- Step 4: POSM ---
function renderStep4Posm() {
  const v = AppState.visit;
  const p = v.posm;
  const card = h(
    'div',
    { class: 'card' },
    renderCheckRow({
      label: 'เช็คสภาพชิ้นงาน การติดตั้ง/ปรับตำแหน่งเรียบร้อย',
      sub: 'ให้ตรงจุดที่กำหนดทันที',
      checked: p.conditionOk,
      onToggle: (val) => {
        p.conditionOk = val;
        DataLayer.saveVisit(v);
        render();
      },
    })
  );

  const issueCard = h(
    'div',
    { class: 'card' },
    renderCheckRow({
      label: 'พบปัญหา POSM (ชำรุด/สื่อใหม่ยังไม่ถึง/ติดตั้งไม่ได้)',
      checked: p.flagPendingInstall,
      onToggle: (val) => {
        p.flagPendingInstall = val;
        DataLayer.saveVisit(v);
        render();
      },
    })
  );

  if (p.flagPendingInstall) {
    const photoGrid = h('div', { class: 'photo-grid' });
    p.issuePhotos.forEach((photo, idx) => {
      photoGrid.appendChild(
        h(
          'div',
          { class: 'photo-thumb' },
          h('img', { src: photo }),
          h(
            'button',
            {
              class: 'photo-thumb__remove',
              onclick: () => {
                p.issuePhotos.splice(idx, 1);
                DataLayer.saveVisit(v);
                render();
              },
            },
            '✕'
          )
        )
      );
    });
    photoGrid.appendChild(
      renderCameraButton((dataUrl) => {
        p.issuePhotos.push(dataUrl);
        DataLayer.saveVisit(v);
        render();
      }, p.issuePhotos.length === 0 ? 'ถ่ายภาพ' : 'ถ่ายเพิ่ม')
    );
    issueCard.appendChild(h('label', { class: 'field-label', style: 'margin-top:10px' }, 'ถ่ายรูป POSM ที่มีปัญหา (บังคับอย่างน้อย 1 ภาพ)'));
    issueCard.appendChild(photoGrid);
  }

  return h(
    'div',
    { class: 'screen' },
    h('div', { class: 'section-title' }, '🖼 POSM'),
    card,
    issueCard,
    renderStepFooter(4, isStep4Valid(v), 'ติ๊กให้เรียบร้อย หรือติ๊ก "พบปัญหา POSM" พร้อมถ่ายรูปประกอบ', false)
  );
}

// --- Step 5: NPD ---
function renderStep5Npd() {
  const v = AppState.visit;
  const npd = v.npd;

  const setAnswer = (value) => {
    npd.answered = true;
    npd.hasNewNpd = value;
    DataLayer.saveVisit(v);
    render();
  };

  const card = h(
    'div',
    { class: 'card' },
    h('p', { class: 'section-hint', style: 'margin-top:0' }, 'เช็ค NPD (New Product Development) ใหม่เข้าแล้วหรือยัง'),
    h(
      'div',
      { class: 'btn-row' },
      h(
        'button',
        { class: `btn ${npd.answered && npd.hasNewNpd === true ? 'btn-success' : 'btn-outline'}`, onclick: () => setAnswer(true) },
        'Yes — เข้าแล้ว'
      ),
      h(
        'button',
        { class: `btn ${npd.answered && npd.hasNewNpd === false ? 'btn-success' : 'btn-outline'}`, onclick: () => setAnswer(false) },
        'No — ยังไม่เข้า'
      )
    )
  );

  return h(
    'div',
    { class: 'screen' },
    h('div', { class: 'section-title' }, '🆕 NPD'),
    card,
    renderStepFooter(5, isStep5Valid(v), 'กรุณาตอบ Yes/No ก่อนไปขั้นตอนถัดไป', false)
  );
}

// --- Step 6: Photo After ---
function renderStep6PhotosAfter() {
  const v = AppState.visit;
  const grid = h('div', { class: 'photo-grid' });
  v.photosAfter.forEach((photo, idx) => {
    grid.appendChild(
      h(
        'div',
        { class: 'photo-thumb' },
        h('img', { src: photo }),
        h(
          'button',
          {
            class: 'photo-thumb__remove',
            onclick: () => {
              v.photosAfter.splice(idx, 1);
              DataLayer.saveVisit(v);
              render();
            },
          },
          '✕'
        )
      )
    );
  });
  grid.appendChild(
    renderCameraButton((dataUrl) => {
      v.photosAfter.push(dataUrl);
      DataLayer.saveVisit(v);
      render();
    }, v.photosAfter.length === 0 ? 'ถ่ายภาพ' : 'ถ่ายจุดที่แก้ไข')
  );

  const beforeRef = v.photosBefore[0]
    ? h(
        'div',
        {},
        h('label', { class: 'field-label' }, 'ภาพ Before (อ้างอิงมุมถ่าย)'),
        h('div', { class: 'photo-before-ref' }, h('img', { src: v.photosBefore[0] }))
      )
    : null;

  return h(
    'div',
    { class: 'screen' },
    h('div', { class: 'section-title' }, '📷 ถ่ายภาพ After'),
    h('p', { class: 'section-hint' }, 'ถ่ายภาพมุมเดียวกับ Before เพื่อเทียบก่อน-หลัง (บังคับอย่างน้อย 1 ภาพ)'),
    beforeRef,
    grid,
    renderStepFooter(6, isStep6Valid(v), 'ต้องถ่ายภาพอย่างน้อย 1 ภาพก่อนจบงาน Phase 2', true)
  );
}

// ============================================================================
// 7) Screen: Phase 3 — เก็บข้อมูลเชิงลึก (optional)
// ============================================================================

const PHASE3_TAGS = [
  { id: 'traffic', label: 'เช็ค Traffic ร้านค้า', placeholder: 'เช็คเพื่อตรวจสอบว่าเข้าเยอะไหม ปัจจุบันใช้เผื่ออนาคตขยายสาขา' },
  { id: 'competitor', label: 'ตรวจสอบคู่แข่ง', placeholder: 'เช่น โปรโมชั่นหรือของแถมใหม่ สินค้าหรือเฉดสีใหม่ พื้นที่ขายที่คู่แข่งได้เพิ่มขึ้น ราคาที่ผิดสังเกต' },
  { id: 'store_issue', label: 'บันทึกปัญหาร้าน', placeholder: 'เช่น ปัญหาหน้างานที่ไม่มีในหมวด checklist พื้นที่ขายของเราเองที่ถูกลดลง หรือถูกย้าย' },
  { id: 'other', label: 'เรื่องอื่นๆ', placeholder: 'พิมพ์รายละเอียดที่ต้องการบันทึก...' },
];

function renderPhase3Screen() {
  const v = AppState.visit;
  const header = renderVisitHeader({
    phase: 3,
    onBack: () => {
      AppState.screen = 'STORE_LIST';
      render();
    },
    title: v.storeName,
  });

  const draft = AppState.phase3Draft;
  const tagGrid = h('div', { class: 'tag-grid' });
  PHASE3_TAGS.forEach((tag) => {
    tagGrid.appendChild(
      h(
        'button',
        {
          class: `tag-btn ${draft.tag === tag.id ? 'is-selected' : ''}`,
          onclick: () => {
            draft.tag = tag.id;
            render();
          },
        },
        tag.label
      )
    );
  });

  const content = h(
    'div',
    { class: 'screen' },
    h('div', { class: 'section-title' }, '📝 เก็บข้อมูลเชิงลึก'),
    h('p', { class: 'section-hint' }, 'ไม่บังคับ — บันทึกได้หลายรายการ เลือกหมวดหมู่ก่อนพิมพ์'),
    tagGrid
  );

  if (draft.tag) {
    const currentTag = PHASE3_TAGS.find((t) => t.id === draft.tag);
    const photoRow = h('div', { style: 'margin-top:10px' });
    if (draft.photo) {
      photoRow.appendChild(
        h(
          'div',
          { class: 'photo-thumb', style: 'width:90px' },
          h('img', { src: draft.photo }),
          h(
            'button',
            {
              class: 'photo-thumb__remove',
              onclick: () => {
                draft.photo = null;
                render();
              },
            },
            '✕'
          )
        )
      );
    } else {
      photoRow.appendChild(
        h(
          'label',
          { class: 'btn btn-outline btn-sm', style: 'display:inline-flex;width:auto' },
          '+ แนบภาพประกอบ (ไม่บังคับ)',
          h('input', {
            type: 'file',
            accept: 'image/*',
            capture: 'environment',
            style: 'display:none',
            onchange: (e) => {
              const file = e.target.files[0];
              if (!file) return;
              ImageUtils.fileToDataUrl(file).then((url) => {
                draft.photo = url;
                render();
              });
            },
          })
        )
      );
    }

    const card = h(
      'div',
      { class: 'card' },
      h('label', { class: 'field-label' }, `รายละเอียด — ${currentTag.label}`),
      h('textarea', {
        placeholder: currentTag.placeholder,
        oninput: (e) => {
          draft.text = e.target.value;
        },
      }, draft.text),
      photoRow,
      h(
        'button',
        {
          class: 'btn btn-primary',
          style: 'margin-top:12px',
          onclick: () => {
            if (!draft.text.trim()) return;
            v.unstructuredNotes.push({ tag: currentTag.label, text: draft.text.trim(), photo: draft.photo, timestamp: new Date().toISOString() });
            DataLayer.saveVisit(v);
            AppState.phase3Draft = { tag: null, text: '', photo: null };
            render();
          },
        },
        '+ บันทึกรายการนี้'
      )
    );
    content.appendChild(card);
  }

  if (v.unstructuredNotes.length > 0) {
    content.appendChild(h('div', { class: 'section-title' }, `รายการที่บันทึกแล้ว (${v.unstructuredNotes.length})`));
    v.unstructuredNotes.forEach((note, idx) => {
      content.appendChild(
        h(
          'div',
          { class: 'note-entry' },
          h('div', { class: 'note-entry__tag' }, note.tag),
          h('div', { class: 'note-entry__text' }, note.text),
          note.photo ? h('div', { class: 'photo-thumb', style: 'width:70px;margin-top:8px' }, h('img', { src: note.photo })) : null,
          h(
            'button',
            {
              class: 'btn-sm btn-ghost',
              style: 'margin-top:8px;width:auto',
              onclick: () => {
                v.unstructuredNotes.splice(idx, 1);
                DataLayer.saveVisit(v);
                render();
              },
            },
            'ลบรายการนี้'
          )
        )
      );
    });
  }

  const footer = h(
    'div',
    { class: 'footer-bar' },
    h(
      'div',
      { class: 'btn-row' },
      h('button', { class: 'btn btn-ghost', onclick: goToPhase4 }, 'ข้ามขั้นตอนนี้ →'),
      h('button', { class: 'btn btn-primary', onclick: goToPhase4 }, 'ไปหน้าสรุป →')
    )
  );

  return h('div', {}, header, content, footer);
}

function goToPhase4() {
  AppState.visit.phaseCompleted = 3;
  AppState.visit.currentPhase = 4;
  DataLayer.saveVisit(AppState.visit);
  AppState.phase3Draft = { tag: null, text: '', photo: null };
  AppState.screen = 'PHASE4';
  render();
}

// ============================================================================
// 8) Screen: Phase 4 — สรุปงาน + เช็คเอาท์
// ============================================================================

function jumpToPhase2Step(step) {
  AppState.screen = 'PHASE2';
  AppState.phase2Step = step;
  render();
}

function renderPhase4Screen() {
  const v = AppState.visit;
  const header = renderVisitHeader({
    phase: 4,
    onBack: () => {
      AppState.screen = 'STORE_LIST';
      AppState.readOnly = false;
      render();
    },
    title: v.storeName,
  });

  const content = h('div', { class: 'screen' });

  content.appendChild(
    AppState.readOnly
      ? h('div', { class: 'info-box' }, '✓ เข้าเยี่ยมสาขานี้เสร็จสมบูรณ์แล้ว (ดูรายงานอย่างเดียว)')
      : h('div', {}, h('div', { class: 'section-title' }, '📋 สรุปงานก่อนส่งรายงาน'), h('p', { class: 'section-hint' }, 'ตรวจสอบข้อมูลทั้งหมด กด "แก้ไข" หากต้องการย้อนกลับไปแก้ไขก่อน'))
  );

  content.appendChild(
    h(
      'div',
      { class: 'summary-block' },
      h('div', { class: 'summary-block__head' }, h('div', { class: 'summary-block__title' }, '📍 เช็คอิน')),
      h('div', { class: 'summary-row' }, h('span', {}, 'เวลาเช็คอิน'), h('strong', {}, formatDateTime(v.checkIn && v.checkIn.timestamp))),
      h(
        'div',
        { class: 'summary-row' },
        h('span', {}, 'ตำแหน่ง GPS'),
        h('strong', {}, v.checkIn && v.checkIn.gpsMatched ? 'ตรงตำแหน่งสาขา' : `Manual (${(v.checkIn && v.checkIn.manualReason) || '-'})`)
      ),
      v.checkinPhoto
        ? h('div', { class: 'photo-thumb', style: 'width:90px;margin-top:8px' }, h('img', { src: v.checkinPhoto }))
        : null
    )
  );

  content.appendChild(
    h(
      'div',
      { class: 'summary-block' },
      h(
        'div',
        { class: 'summary-block__head' },
        h('div', { class: 'summary-block__title' }, '📷 ภาพ Before / After'),
        !AppState.readOnly ? editBtn(() => jumpToPhase2Step(1)) : null
      ),
      h('div', { class: 'photo-grid' }, v.photosBefore.map((p) => h('div', { class: 'photo-thumb' }, h('img', { src: p })))),
      h('div', { class: 'photo-grid', style: 'margin-top:8px' }, v.photosAfter.map((p) => h('div', { class: 'photo-thumb' }, h('img', { src: p }))))
    )
  );

  content.appendChild(
    h(
      'div',
      { class: 'summary-block' },
      h(
        'div',
        { class: 'summary-block__head' },
        h('div', { class: 'summary-block__title' }, '📦 จัดการสินค้าที่ชั้นวาง'),
        !AppState.readOnly ? editBtn(() => jumpToPhase2Step(2)) : null
      ),
      h('div', { class: 'summary-row' }, h('span', {}, 'เติม/จัดเรียง'), h('strong', {}, v.product.restockDone ? 'เรียบร้อย' : 'มีรายการที่ต้องติดตาม')),
      h('div', { class: 'summary-row' }, h('span', {}, 'FIFO / วันหมดอายุ'), h('strong', {}, v.product.fifoDone ? 'เรียบร้อย' : 'ยังไม่ได้เช็ค')),
      h('div', { class: 'summary-row' }, h('span', {}, 'ราคา/Promotion'), h('strong', {}, v.product.priceOk ? 'ถูกต้อง' : 'มีรายการที่ต้องติดตาม')),
      v.product.restockIssues.map((f) => h('div', { class: 'flag-note' }, `⚑ ${f.type === 'shelf_full' ? 'ชั้นวางไม่พอ' : 'ของหมด'} — ${getSkuName(f.sku)}`)),
      v.product.belowThresholdIssues.map((f) =>
        h('div', { class: 'flag-note' }, `⚑ ${getSkuName(f.sku)}${f.expired ? ' — ดึงออกแล้ว ต้องแจ้งร้านเปิด CN' : ' — อายุต่ำกว่าเกณฑ์'}`)
      ),
      v.product.priceIssues.map((f) => h('div', { class: 'flag-note' }, `⚑ ราคาไม่ตรง — ${getSkuName(f.sku)} พบราคา ${f.foundPrice} บาท`)),
      h('div', { class: 'photo-grid', style: 'margin-top:8px' }, v.product.shelfPhotos.map((photo) => h('div', { class: 'photo-thumb' }, h('img', { src: photo }))))
    )
  );

  content.appendChild(
    h(
      'div',
      { class: 'summary-block' },
      h(
        'div',
        { class: 'summary-block__head' },
        h('div', { class: 'summary-block__title' }, '💄 Tester'),
        !AppState.readOnly ? editBtn(() => jumpToPhase2Step(3)) : null
      ),
      v.tester.emptySkus.length > 0
        ? h('div', { class: 'summary-row' }, h('span', {}, 'พบว่าหมดก่อนเติม'), h('strong', {}, v.tester.emptySkus.map(getSkuName).join(', ')))
        : null,
      h('div', { class: 'summary-row' }, h('span', {}, 'สถานะ'), h('strong', {}, v.tester.refillDone ? 'ครบถ้วน' : 'มีรายการที่ต้องติดตาม')),
      v.tester.flagNewTesterRequest.map((sku) => h('div', { class: 'flag-note' }, `⚑ ขอเทสเตอร์ใหม่/เบิกรอบหน้า — ${getSkuName(sku)}`)),
      h('div', { class: 'photo-grid', style: 'margin-top:8px' }, v.tester.afterPhotos.map((photo) => h('div', { class: 'photo-thumb' }, h('img', { src: photo }))))
    )
  );

  content.appendChild(
    h(
      'div',
      { class: 'summary-block' },
      h(
        'div',
        { class: 'summary-block__head' },
        h('div', { class: 'summary-block__title' }, '🖼 POSM'),
        !AppState.readOnly ? editBtn(() => jumpToPhase2Step(4)) : null
      ),
      v.posm.flagPendingInstall
        ? h(
            'div',
            {},
            h('div', { class: 'flag-note' }, '⚑ พบปัญหา POSM — ส่งเข้าส่วนกลาง'),
            h('div', { class: 'photo-grid', style: 'margin-top:8px' }, v.posm.issuePhotos.map((photo) => h('div', { class: 'photo-thumb' }, h('img', { src: photo }))))
          )
        : h('div', { class: 'summary-row' }, h('span', {}, 'สถานะ'), h('strong', {}, 'ติดตั้งครบถ้วน'))
    )
  );

  content.appendChild(
    h(
      'div',
      { class: 'summary-block' },
      h(
        'div',
        { class: 'summary-block__head' },
        h('div', { class: 'summary-block__title' }, '🆕 NPD'),
        !AppState.readOnly ? editBtn(() => jumpToPhase2Step(5)) : null
      ),
      h('div', { class: 'summary-row' }, h('span', {}, 'NPD ใหม่เข้าแล้วหรือยัง'), h('strong', {}, v.npd.answered ? (v.npd.hasNewNpd ? 'Yes — เข้าแล้ว' : 'No — ยังไม่เข้า') : 'ยังไม่ตอบ'))
    )
  );

  content.appendChild(
    h(
      'div',
      { class: 'summary-block' },
      h(
        'div',
        { class: 'summary-block__head' },
        h('div', { class: 'summary-block__title' }, '📝 บันทึกเพิ่มเติม'),
        !AppState.readOnly ? editBtn(() => { AppState.screen = 'PHASE3'; render(); }) : null
      ),
      v.unstructuredNotes.length === 0
        ? h('p', { class: 'muted' }, 'ไม่มีบันทึกเพิ่มเติม')
        : v.unstructuredNotes.map((n) =>
            h('div', { class: 'note-entry', style: 'margin-bottom:8px' }, h('div', { class: 'note-entry__tag' }, n.tag), h('div', { class: 'note-entry__text' }, n.text))
          )
    )
  );

  const totalFlags = countFlags(v);
  content.appendChild(
    h('div', { class: totalFlags > 0 ? 'error-box' : 'info-box' }, totalFlags > 0 ? `⚑ มีรายการค้าง/ต้องติดตามทั้งหมด ${totalFlags} รายการ` : '✓ ไม่มีรายการค้าง')
  );

  let footer;
  if (AppState.readOnly) {
    footer = h(
      'div',
      { class: 'footer-bar' },
      h('button', { class: 'btn btn-primary', onclick: () => { AppState.screen = 'STORE_LIST'; AppState.readOnly = false; render(); } }, 'กลับหน้ารายชื่อสาขา')
    );
  } else if (v.status === 'completed') {
    footer = h('div', { class: 'footer-bar' }, h('button', { class: 'btn btn-primary', onclick: () => { AppState.screen = 'CHECKOUT'; render(); } }, 'ไปหน้าเช็คเอาท์ →'));
  } else {
    footer = h('div', { class: 'footer-bar' }, h('button', { class: 'btn btn-success', onclick: handleConfirmSubmit }, '✓ ยืนยันส่งรายงาน'));
  }

  return h('div', {}, header, content, footer);
}

/** กด "ยืนยันส่งรายงาน" → เปิด Confirmation Modal ก่อนเสมอ กันกดปิดงานพลาด */
function handleConfirmSubmit() {
  AppState.ui.modal = { type: 'confirmSubmit' };
  render();
}

function renderConfirmSubmitModal() {
  return h(
    'div',
    { class: 'modal-overlay' },
    h(
      'div',
      { class: 'modal-sheet' },
      h('div', { class: 'modal-title' }, 'ยืนยันส่งรายงาน?'),
      h('p', { class: 'muted' }, 'ระบบจะรวบรวม checklist + ภาพ Before/After + บันทึกเป็นสรุปเดียว แล้วยิงเข้า Group Line ทันที หลังจากนี้จะแก้ไขข้อมูลไม่ได้'),
      h(
        'div',
        { class: 'btn-row' },
        h('button', { class: 'btn btn-ghost', onclick: closeModal }, 'ยกเลิก'),
        h('button', { class: 'btn btn-success', onclick: doSubmitVisit }, '✓ ยืนยันส่ง')
      )
    )
  );
}

function doSubmitVisit() {
  AppState.ui.modal = null;
  const v = AppState.visit;
  v.sentToGroupLine = true;
  DataLayer.completeVisit(v).then((visit) => {
    AppState.visit = visit;
    AppState.screen = 'CHECKOUT';
    render();
  });
}

// --- Checkout (optional) ---
function renderCheckoutScreen() {
  const v = AppState.visit;
  const header = renderVisitHeader({ phase: 4, onBack: null, title: v.storeName });

  const content = h(
    'div',
    { class: 'screen' },
    h(
      'div',
      { class: 'card center-text' },
      h('div', { class: 'big-icon' }, '✅'),
      h('h2', {}, 'ส่งรายงานเรียบร้อยแล้ว'),
      h('p', { class: 'muted' }, v.storeName),
      v.sentToGroupLine ? h('div', { class: 'info-box', style: 'margin-top:10px' }, '📨 ส่งสรุปงานเข้า Group Line เรียบร้อยแล้ว') : null
    )
  );

  if (v.checkOut) {
    content.appendChild(
      h(
        'div',
        { class: 'summary-block' },
        h('div', { class: 'summary-row' }, h('span', {}, 'เวลาเช็คเอาท์'), h('strong', {}, formatDateTime(v.checkOut.timestamp))),
        h('div', { class: 'summary-row' }, h('span', {}, 'ระยะเวลาที่ใช้ในสาขา'), h('strong', {}, `${v.checkOut.durationMinutes} นาที`))
      )
    );
    content.appendChild(h('button', { class: 'btn btn-primary', onclick: backToStoreList }, 'กลับหน้ารายชื่อสาขา'));
  } else {
    content.appendChild(h('p', { class: 'section-hint' }, 'เช็คเอาท์ (ไม่บังคับ) เพื่อบันทึกเวลาออกและระยะเวลาที่ใช้ในสาขานี้'));
    content.appendChild(h('button', { class: 'btn btn-outline', onclick: handleCheckout }, '📍 เช็คเอาท์'));
    content.appendChild(h('button', { class: 'btn btn-ghost', onclick: backToStoreList }, 'ข้าม / กลับหน้ารายชื่อสาขา'));
  }

  return h('div', {}, header, content);
}

function backToStoreList() {
  AppState.screen = 'STORE_LIST';
  AppState.visit = null;
  AppState.storeId = null;
  AppState.readOnly = false;
  render();
}

function handleCheckout() {
  const v = AppState.visit;
  GeoUtils.getCurrentPosition()
    .then((pos) => finishCheckout(v, pos.lat, pos.lng))
    .catch(() => finishCheckout(v, null, null));
}

function finishCheckout(v, lat, lng) {
  const now = new Date();
  const checkInTime = v.checkIn ? new Date(v.checkIn.timestamp) : now;
  const durationMinutes = Math.max(0, Math.round((now - checkInTime) / 60000));
  v.checkOut = { timestamp: now.toISOString(), gpsLat: lat, gpsLng: lng, durationMinutes };
  DataLayer.saveVisit(v);
  render();
}

// ============================================================================
// 9) Modals
// ============================================================================

function closeModal() {
  AppState.ui.modal = null;
  render();
}

function renderModal() {
  const root = document.getElementById('modal-root');
  clearNode(root);
  const m = AppState.ui.modal;
  if (!m) return;
  const renderers = {
    manualCheckin: renderManualCheckinModal,
    restockIssue: renderRestockIssueModal,
    belowThreshold: renderBelowThresholdModal,
    testerEmpty: renderTesterEmptyModal,
    testerFlag: renderTesterFlagModal,
    priceFlag: renderPriceFlagModal,
    infoMissing: renderInfoMissingModal,
    stepGate: renderStepGateModal,
    addAdHoc: renderAddAdHocModal,
    confirmSubmit: renderConfirmSubmitModal,
    resetConfirm: renderResetConfirmModal,
  };
  const node = renderers[m.type] ? renderers[m.type](m) : null;
  if (node) root.appendChild(node);
}

function renderManualCheckinModal(m) {
  return h(
    'div',
    { class: 'modal-overlay' },
    h(
      'div',
      { class: 'modal-sheet' },
      h('div', { class: 'modal-title' }, 'ยืนยันตำแหน่งแบบ Manual'),
      m.autoNote ? h('div', { class: 'info-box' }, m.autoNote) : null,
      h(
        'div',
        {},
        h('label', { class: 'field-label' }, 'เหตุผลที่เช็คอินแบบ manual'),
        h(
          'select',
          { onchange: (e) => { m.reasonOption = e.target.value; } },
          MANUAL_REASON_OPTIONS.map((o) => h('option', { value: o.value, selected: o.value === m.reasonOption }, o.label))
        )
      ),
      h(
        'div',
        {},
        h('label', { class: 'field-label' }, 'รายละเอียดเพิ่มเติม (ไม่บังคับ)'),
        h('textarea', { placeholder: 'ระบุรายละเอียดเพิ่มเติม...', oninput: (e) => { m.reasonText = e.target.value; } })
      ),
      h(
        'div',
        { class: 'btn-row' },
        h('button', { class: 'btn btn-ghost', onclick: closeModal }, 'ยกเลิก'),
        h('button', { class: 'btn btn-primary', onclick: () => confirmManualCheckin(m) }, 'ยืนยันเช็คอิน')
      )
    )
  );
}

/**
 * modal แจ้งปัญหา 3 แบบด้านล่าง (เติมสินค้า/อายุต่ำกว่าเกณฑ์/ราคา) ใช้ pattern
 * "เพิ่มได้หลาย SKU ต่อเนื่องแบบเร็ว" เหมือนกัน: เลือก/พิมพ์ SKU แล้วกด "+ เพิ่ม"
 * ครั้งเดียวก็ push เข้า visit ทันที (ไม่ต้องกรอก note ทีละตัว) โดยไม่ปิด modal
 * ทำให้ยิงเพิ่มได้เรื่อยๆ ต่อเนื่อง จนกว่าจะกด "เสร็จสิ้น" — ตัด note รายตัวออก
 * เพื่อความเร็ว (จำลองความเร็วแบบ scan บาร์โค้ด/กรอกรหัสต่อเนื่อง)
 */

function openRestockIssueModal() {
  AppState.ui.modal = { type: 'restockIssue', restockType: 'no_stock', selectedSku: SKU_CATALOG[0].sku };
  render();
}

function renderRestockIssueModal(m) {
  const v = AppState.visit;
  return h(
    'div',
    { class: 'modal-overlay' },
    h(
      'div',
      { class: 'modal-sheet' },
      h('div', { class: 'modal-title' }, 'แจ้งปัญหาการเติมสินค้า'),
      h('label', { class: 'field-label' }, 'ประเภทปัญหา'),
      h(
        'select',
        { onchange: (e) => { m.restockType = e.target.value; } },
        h('option', { value: 'no_stock', selected: m.restockType === 'no_stock' }, 'ไม่มีของให้เติม/ของหมด'),
        h('option', { value: 'shelf_full', selected: m.restockType === 'shelf_full' }, 'ชั้นวางไม่พอ (ของเก่าขายไม่หมด)')
      ),
      h('label', { class: 'field-label' }, 'เลือก SKU แล้วกด + เพิ่ม (เพิ่มได้หลายรายการต่อเนื่อง)'),
      h(
        'div',
        { class: 'btn-row' },
        h(
          'select',
          { style: 'flex:1', onchange: (e) => { m.selectedSku = e.target.value; } },
          SKU_CATALOG.map((s) => h('option', { value: s.sku, selected: s.sku === m.selectedSku }, s.name))
        ),
        h(
          'button',
          {
            class: 'btn btn-primary btn-sm',
            style: 'width:auto',
            onclick: () => {
              v.product.restockIssues.push({ type: m.restockType, sku: m.selectedSku });
              DataLayer.saveVisit(v);
              render();
            },
          },
          '+ เพิ่ม'
        )
      ),
      v.product.restockIssues.length > 0
        ? h(
            'div',
            { style: 'display:flex;flex-direction:column;gap:6px' },
            v.product.restockIssues.map((f, idx) =>
              h(
                'div',
                { class: 'flag-note' },
                h('span', {}, `${f.type === 'shelf_full' ? 'ชั้นวางไม่พอ' : 'ของหมด'} — ${getSkuName(f.sku)}`),
                h(
                  'button',
                  {
                    class: 'btn-sm btn-ghost',
                    style: 'width:auto;margin-left:auto',
                    onclick: () => {
                      v.product.restockIssues.splice(idx, 1);
                      DataLayer.saveVisit(v);
                      render();
                    },
                  },
                  'ลบ'
                )
              )
            )
          )
        : null,
      h('button', { class: 'btn btn-primary', onclick: closeModal }, 'เสร็จสิ้น')
    )
  );
}

function openBelowThresholdModal() {
  AppState.ui.modal = { type: 'belowThreshold', expired: false, selectedSku: SKU_CATALOG[0].sku };
  render();
}

function renderBelowThresholdModal(m) {
  const v = AppState.visit;
  return h(
    'div',
    { class: 'modal-overlay' },
    h(
      'div',
      { class: 'modal-sheet' },
      h('div', { class: 'modal-title' }, 'แจ้งสินค้าอายุต่ำกว่าเกณฑ์'),
      renderCheckRow({
        label: 'หมดอายุแล้ว (ดึงออกจากชั้นแล้ว)',
        sub: 'ใช้กับทุก SKU ที่เพิ่มด้านล่างนี้ — ถ้าติ๊ก ต้องแจ้งร้านให้เปิด CN ด้วย',
        checked: m.expired,
        onToggle: (val) => { m.expired = val; render(); },
      }),
      h('label', { class: 'field-label' }, 'เลือก SKU แล้วกด + เพิ่ม (เพิ่มได้หลายรายการต่อเนื่อง)'),
      h(
        'div',
        { class: 'btn-row' },
        h(
          'select',
          { style: 'flex:1', onchange: (e) => { m.selectedSku = e.target.value; } },
          SKU_CATALOG.map((s) => h('option', { value: s.sku, selected: s.sku === m.selectedSku }, s.name))
        ),
        h(
          'button',
          {
            class: 'btn btn-primary btn-sm',
            style: 'width:auto',
            onclick: () => {
              v.product.belowThresholdIssues.push({ sku: m.selectedSku, expired: m.expired });
              DataLayer.saveVisit(v);
              render();
            },
          },
          '+ เพิ่ม'
        )
      ),
      v.product.belowThresholdIssues.length > 0
        ? h(
            'div',
            { style: 'display:flex;flex-direction:column;gap:6px' },
            v.product.belowThresholdIssues.map((f, idx) =>
              h(
                'div',
                { class: 'flag-note' },
                h('span', {}, `${getSkuName(f.sku)}${f.expired ? ' — ดึงออกแล้ว ต้องแจ้งร้านเปิด CN' : ' — อายุต่ำกว่าเกณฑ์'}`),
                h(
                  'button',
                  {
                    class: 'btn-sm btn-ghost',
                    style: 'width:auto;margin-left:auto',
                    onclick: () => {
                      v.product.belowThresholdIssues.splice(idx, 1);
                      DataLayer.saveVisit(v);
                      render();
                    },
                  },
                  'ลบ'
                )
              )
            )
          )
        : null,
      h('button', { class: 'btn btn-primary', onclick: closeModal }, 'เสร็จสิ้น')
    )
  );
}

function openTesterEmptyModal() {
  AppState.ui.modal = { type: 'testerEmpty', selectedSku: SKU_CATALOG[0].sku };
  render();
}

function renderTesterEmptyModal(m) {
  const v = AppState.visit;
  return h(
    'div',
    { class: 'modal-overlay' },
    h(
      'div',
      { class: 'modal-sheet' },
      h('div', { class: 'modal-title' }, 'บันทึก Tester ที่พบว่าหมดก่อนเติม'),
      h('label', { class: 'field-label' }, 'เลือก SKU แล้วกด + เพิ่ม (เพิ่มได้หลายรายการต่อเนื่อง)'),
      h(
        'div',
        { class: 'btn-row' },
        h(
          'select',
          { style: 'flex:1', onchange: (e) => { m.selectedSku = e.target.value; } },
          SKU_CATALOG.map((s) => h('option', { value: s.sku, selected: s.sku === m.selectedSku }, s.name))
        ),
        h(
          'button',
          {
            class: 'btn btn-primary btn-sm',
            style: 'width:auto',
            onclick: () => {
              if (!v.tester.emptySkus.includes(m.selectedSku)) v.tester.emptySkus.push(m.selectedSku);
              DataLayer.saveVisit(v);
              render();
            },
          },
          '+ เพิ่ม'
        )
      ),
      v.tester.emptySkus.length > 0
        ? h(
            'div',
            { style: 'display:flex;flex-direction:column;gap:6px' },
            v.tester.emptySkus.map((sku, idx) =>
              h(
                'div',
                { class: 'flag-note' },
                h('span', {}, getSkuName(sku)),
                h(
                  'button',
                  {
                    class: 'btn-sm btn-ghost',
                    style: 'width:auto;margin-left:auto',
                    onclick: () => {
                      v.tester.emptySkus.splice(idx, 1);
                      DataLayer.saveVisit(v);
                      render();
                    },
                  },
                  'ลบ'
                )
              )
            )
          )
        : null,
      h('button', { class: 'btn btn-primary', onclick: closeModal }, 'เสร็จสิ้น')
    )
  );
}

function openTesterFlagModal() {
  AppState.ui.modal = { type: 'testerFlag', selectedSku: SKU_CATALOG[0].sku };
  render();
}

function renderTesterFlagModal(m) {
  const v = AppState.visit;
  return h(
    'div',
    { class: 'modal-overlay' },
    h(
      'div',
      { class: 'modal-sheet' },
      h('div', { class: 'modal-title' }, 'ขอเทสเตอร์ใหม่ / เบิกรอบหน้า'),
      h('p', { class: 'muted' }, 'ใช้เมื่อ Tester หมดและไม่มีของสำรองให้เติม'),
      h('label', { class: 'field-label' }, 'เลือก SKU แล้วกด + เพิ่ม (เพิ่มได้หลายรายการต่อเนื่อง)'),
      h(
        'div',
        { class: 'btn-row' },
        h(
          'select',
          { style: 'flex:1', onchange: (e) => { m.selectedSku = e.target.value; } },
          SKU_CATALOG.map((s) => h('option', { value: s.sku, selected: s.sku === m.selectedSku }, s.name))
        ),
        h(
          'button',
          {
            class: 'btn btn-primary btn-sm',
            style: 'width:auto',
            onclick: () => {
              if (!v.tester.flagNewTesterRequest.includes(m.selectedSku)) v.tester.flagNewTesterRequest.push(m.selectedSku);
              DataLayer.saveVisit(v);
              render();
            },
          },
          '+ เพิ่ม'
        )
      ),
      v.tester.flagNewTesterRequest.length > 0
        ? h(
            'div',
            { style: 'display:flex;flex-direction:column;gap:6px' },
            v.tester.flagNewTesterRequest.map((sku, idx) =>
              h(
                'div',
                { class: 'flag-note' },
                h('span', {}, `⚑ ${getSkuName(sku)}`),
                h(
                  'button',
                  {
                    class: 'btn-sm btn-ghost',
                    style: 'width:auto;margin-left:auto',
                    onclick: () => {
                      v.tester.flagNewTesterRequest.splice(idx, 1);
                      DataLayer.saveVisit(v);
                      render();
                    },
                  },
                  'ลบ'
                )
              )
            )
          )
        : null,
      h('button', { class: 'btn btn-primary', onclick: closeModal }, 'เสร็จสิ้น')
    )
  );
}

function openPriceFlagModal() {
  AppState.ui.modal = { type: 'priceFlag', selectedSku: SKU_CATALOG[0].sku, foundPrice: 0 };
  render();
}

function renderPriceFlagModal(m) {
  const v = AppState.visit;
  return h(
    'div',
    { class: 'modal-overlay' },
    h(
      'div',
      { class: 'modal-sheet' },
      h('div', { class: 'modal-title' }, 'แจ้งราคาไม่ตรง/ผิดปกติ'),
      h('label', { class: 'field-label' }, 'เลือก SKU'),
      h(
        'select',
        { onchange: (e) => { m.selectedSku = e.target.value; } },
        SKU_CATALOG.map((s) => h('option', { value: s.sku, selected: s.sku === m.selectedSku }, s.name))
      ),
      h('label', { class: 'field-label' }, 'ราคาที่พบหน้าร้าน (บาท)'),
      h('input', { type: 'number', min: '0', placeholder: '0', value: m.foundPrice, oninput: (e) => { m.foundPrice = Number(e.target.value) || 0; } }),
      h(
        'button',
        {
          class: 'btn btn-primary btn-sm',
          style: 'margin-top:4px',
          onclick: () => {
            v.product.priceIssues.push({ sku: m.selectedSku, foundPrice: m.foundPrice });
            DataLayer.saveVisit(v);
            m.foundPrice = 0;
            render();
          },
        },
        '+ เพิ่มรายการนี้ (เพิ่มได้หลายรายการต่อเนื่อง)'
      ),
      v.product.priceIssues.length > 0
        ? h(
            'div',
            { style: 'display:flex;flex-direction:column;gap:6px' },
            v.product.priceIssues.map((f, idx) =>
              h(
                'div',
                { class: 'flag-note' },
                h('span', {}, `${getSkuName(f.sku)} — พบราคา ${f.foundPrice} บาท`),
                h(
                  'button',
                  {
                    class: 'btn-sm btn-ghost',
                    style: 'width:auto;margin-left:auto',
                    onclick: () => {
                      v.product.priceIssues.splice(idx, 1);
                      DataLayer.saveVisit(v);
                      render();
                    },
                  },
                  'ลบ'
                )
              )
            )
          )
        : null,
      h('button', { class: 'btn btn-primary', onclick: closeModal }, 'เสร็จสิ้น')
    )
  );
}

function renderInfoMissingModal(m) {
  return h(
    'div',
    { class: 'modal-overlay' },
    h(
      'div',
      { class: 'modal-sheet' },
      h('div', { class: 'modal-title' }, 'ยังทำไม่ครบทุกขั้นตอน'),
      h('p', { class: 'muted' }, 'กรุณาทำขั้นตอนต่อไปนี้ให้ครบก่อนจบงาน Phase 2:'),
      h('ul', { class: 'missing-list' }, m.missing.map((t) => h('li', {}, t))),
      h('button', { class: 'btn btn-primary', onclick: closeModal }, 'เข้าใจแล้ว')
    )
  );
}

function renderStepGateModal() {
  return h(
    'div',
    { class: 'modal-overlay' },
    h(
      'div',
      { class: 'modal-sheet' },
      h('div', { class: 'modal-title' }, 'ต้องถ่ายภาพ Before ก่อน'),
      h('p', { class: 'muted' }, 'กรุณาถ่ายภาพ Before ให้ครบอย่างน้อย 1 ภาพก่อน จึงจะไปขั้นตอนอื่นได้'),
      h('button', { class: 'btn btn-primary', onclick: closeModal }, 'เข้าใจแล้ว')
    )
  );
}

function openResetConfirmModal() {
  AppState.ui.modal = { type: 'resetConfirm' };
  render();
}

function renderResetConfirmModal() {
  return h(
    'div',
    { class: 'modal-overlay' },
    h(
      'div',
      { class: 'modal-sheet' },
      h('div', { class: 'modal-title' }, 'รีเซ็ตข้อมูลทดสอบทั้งหมด?'),
      h(
        'p',
        { class: 'muted' },
        'จะล้างตารางเข้าสาขาที่ Admin จัดไว้ สถานะสาขาทุกสาขา และงานที่บันทึกไว้ทั้งหมด กลับไปเป็นข้อมูลตั้งต้น — ทำแล้วกู้คืนไม่ได้'
      ),
      h(
        'div',
        { class: 'btn-row' },
        h('button', { class: 'btn btn-ghost', onclick: closeModal }, 'ยกเลิก'),
        h(
          'button',
          {
            class: 'btn btn-danger',
            onclick: () => {
              DataLayer.resetAll();
              location.reload();
            },
          },
          'รีเซ็ตเลย'
        )
      )
    )
  );
}

function renderAddAdHocModal(m) {
  return h(
    'div',
    { class: 'modal-overlay' },
    h(
      'div',
      { class: 'modal-sheet' },
      h('div', { class: 'modal-title' }, 'เพิ่มสาขา (งานแทรก)'),
      h('p', { class: 'muted' }, 'ใช้เมื่อมีงานเร่งด่วนที่ไม่ได้อยู่ในตารางของวันนี้'),
      h(
        'select',
        { onchange: (e) => { m.selectedStoreId = e.target.value; } },
        h('option', { value: '', selected: m.selectedStoreId === '' }, '-- เลือกสาขา --'),
        MOCK_STORES.map((s) => h('option', { value: s.storeId, selected: s.storeId === m.selectedStoreId }, `${s.customer} - ${s.storeName}`))
      ),
      h(
        'div',
        { class: 'btn-row' },
        h('button', { class: 'btn btn-ghost', onclick: closeModal }, 'ยกเลิก'),
        h(
          'button',
          {
            class: 'btn btn-primary',
            onclick: () => {
              if (!m.selectedStoreId) return;
              DataLayer.addAdHocStore(m.selectedStoreId);
              closeModal();
            },
          },
          '+ เพิ่ม'
        )
      )
    )
  );
}

// ============================================================================
// 10) Render dispatcher + Init
// ============================================================================

function render() {
  const screensThatNeedVisit = ['PHASE2', 'PHASE3', 'PHASE4', 'CHECKOUT'];
  if (screensThatNeedVisit.includes(AppState.screen) && !AppState.visit) {
    AppState.screen = 'STORE_LIST';
  }

  const screenRenderers = {
    LOGIN: renderLoginScreen,
    STORE_LIST: renderStoreListScreen,
    PROFILE: renderProfileScreen,
    CHECKIN: renderCheckinScreen,
    PHASE2: renderPhase2Screen,
    PHASE3: renderPhase3Screen,
    PHASE4: renderPhase4Screen,
    CHECKOUT: renderCheckoutScreen,
  };
  const renderFn = screenRenderers[AppState.screen] || renderLoginScreen;
  mount(renderFn());
  renderModal();
}

function init() {
  ScheduleDataLayer.seedDefaultScheduleIfEmpty();
  startLiveClock();
  render();
}

document.addEventListener('DOMContentLoaded', init);
