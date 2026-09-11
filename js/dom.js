/**
 * dom.js
 * -----------------------------------------------------------------------
 * Hyperscript-style DOM builder ใช้ร่วมกันทั้งฝั่ง Mer App (app.js) และ
 * ฝั่ง Admin (admin.js) เพื่อไม่ให้มีโค้ดสร้าง element ซ้ำกันสองที่
 */

function h(tag, attrs, ...children) {
  const node = document.createElement(tag);
  attrs = attrs || {};
  Object.keys(attrs).forEach((key) => {
    const value = attrs[key];
    if (value === false || value === null || value === undefined) return;
    if (key === 'class') {
      node.className = value;
    } else if (key === 'html') {
      node.innerHTML = value;
    } else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) {
      node.setAttribute(key, '');
    } else {
      node.setAttribute(key, value);
    }
  });
  children.flat(Infinity).forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    node.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  });
  return node;
}

function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** mount(node, rootId) — rootId ค่าเริ่มต้นคือ 'app' (ใช้ 'admin-app' ฝั่ง Admin) */
function mount(node, rootId) {
  const root = document.getElementById(rootId || 'app');
  clearNode(root);
  root.appendChild(node);
}
