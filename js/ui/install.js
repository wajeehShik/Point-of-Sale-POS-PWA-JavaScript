import { install, onInstallChange } from '../services/install.js';
import { onClick } from './actions.js';
import { $ } from './dom.js';

export function renderInstall() {
  const html = install.shouldShow() ? `<div class="inst"><span class="ii">📲</span>
    <div class="it"><b>ثبّت التطبيق على جوالك</b><span>بيفتح مثل أي تطبيق وبشتغل بدون إنترنت</span></div>
    <button class="ib" data-action="install-go">${install.event ? 'تثبيت' : 'كيف؟'}</button>
    <button class="ix" data-action="install-dismiss" aria-label="إغلاق">✕</button></div>` : '';
  document.querySelectorAll('.instbox').forEach(el => { el.innerHTML = html; });
}

function showHelp() {
  let m = $('#ihelp');
  if (!m) { m = document.createElement('div'); m.id = 'ihelp'; document.body.appendChild(m); }
  const steps = install.isIOS
    ? ['افتح الموقع من متصفح <b>Safari</b>', 'اضغط زر <b>المشاركة</b> ⬆️ أسفل الشاشة', 'اختر <b>«إضافة إلى الشاشة الرئيسية»</b>', 'اضغط <b>«إضافة»</b> وبيطلع التطبيق عندك']
    : ['اضغط على <b>⋮</b> أعلى المتصفح', 'اختر <b>«تثبيت التطبيق»</b> أو <b>«إضافة إلى الشاشة الرئيسية»</b>', 'اضغط <b>«تثبيت»</b> وبيطلع التطبيق عندك'];
  m.innerHTML = `<div class="back" data-action="install-help-close"></div><div class="ipanel"><h3>📲 كيف أثبّت التطبيق؟</h3>
    <ol>${steps.map(s => `<li>${s}</li>`).join('')}</ol><button class="btn" data-action="install-help-close">تمام</button></div>`;
  m.className = 'open';
}

export async function installGo() {
  if ((await install.prompt()) === 'manual') showHelp();
  renderInstall();
}

onClick('install-go', installGo);
onClick('install-dismiss', () => { install.dismiss(); renderInstall(); });
onClick('install-help-close', () => { const m = $('#ihelp'); if (m) m.className = ''; });
onInstallChange(renderInstall);

export const initInstall = renderInstall;