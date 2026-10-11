export const r2 = n => Math.round(n * 100) / 100;
export const fmt = n => r2(n).toLocaleString('en-US') + ' ₪';
export const today = () => new Date().toLocaleDateString('sv');
export const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) + '%' : '—');