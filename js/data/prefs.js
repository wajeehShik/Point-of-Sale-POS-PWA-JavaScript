/** تفضيلات بسيطة (فلتر الفترة، القفل...) مفصولة عن بيانات المال */
export const prefs = {
  get(key, fallback = '') {
    try { const v = localStorage.getItem(key); return v === null ? fallback : v; }
    catch { return fallback; }
  },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* تجاهل */ } },
};