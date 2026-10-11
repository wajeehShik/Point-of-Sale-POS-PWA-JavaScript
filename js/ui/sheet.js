import { $ } from './dom.js';
import { onClick } from './actions.js';

let handlers = {};

/** النافذة المنبثقة العامة: تفتح بمحتوى وتستقبل أحداث النموذج */
export const sheet = {
  open({ title, html = '', onSubmit, onInput, onChange, onClose }) {
    handlers = { onSubmit, onInput, onChange, onClose };
    $('.bar h3').textContent = title;
    $('#form').innerHTML = html;
    $('#sheet').classList.add('open');
    document.body.style.overflow = 'hidden';
  },
  setTitle: t => { $('.bar h3').textContent = t; },
  setBody: html => { $('#form').innerHTML = html; },
  get form() { return $('#form'); },
  get isOpen() { return $('#sheet').classList.contains('open'); },

  close() {
    if (!this.isOpen) return;
    $('#sheet').classList.remove('open');
    document.body.style.overflow = '';
    const onClose = handlers.onClose;
    handlers = {};
    onClose?.();
  },

  bind() {
    const f = $('#form');
    f.addEventListener('submit', e => { e.preventDefault(); handlers.onSubmit?.(e); });
    f.addEventListener('input', e => handlers.onInput?.(e));
    f.addEventListener('change', e => handlers.onChange?.(e));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });
    onClick('sheet-close', () => this.close());
  },
};