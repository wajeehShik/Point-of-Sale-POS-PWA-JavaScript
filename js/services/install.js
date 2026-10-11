import { prefs } from '../data/prefs.js';

const ua = navigator.userAgent;
const listeners = new Set();
const emit = () => listeners.forEach(fn => fn());

export const install = {
  event: window.__bip || null,
  isIOS: /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
  isMobile: /android|iphone|ipad|ipod|mobile/i.test(ua),

  standalone: () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
  dismissed: () => Date.now() - (+prefs.get('mali_inst', 0)) < 3 * 864e5,
  shouldShow() { return !this.standalone() && (!!this.event || this.isMobile || this.isIOS) && !this.dismissed(); },
  dismiss() { prefs.set('mali_inst', Date.now()); },

  /** 'native' إذا فتح نافذة التثبيت، 'manual' إذا لازم نشرح الخطوات */
  async prompt() {
    if (!this.event) return 'manual';
    this.event.prompt();
    try { await this.event.userChoice; } catch { /* تجاهل */ }
    this.event = null; emit();
    return 'native';
  },
};

export const onInstallChange = fn => listeners.add(fn);
addEventListener('mali:bip', () => { install.event = window.__bip; emit(); });
addEventListener('appinstalled', () => { install.event = null; emit(); });