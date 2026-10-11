import { today } from './format.js';

export const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export const MONTHS = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
  'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];

const pad = n => String(n).padStart(2, '0');

/** يقبل شهراً/يوماً خارج المدى (مثلاً شهر -1) ويصحّحه تلقائياً */
export const ymd = (y, m, d) => {
  const dt = new Date(y, m, d);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
};

export const shortDate = s => { const [, m, d] = s.split('-'); return `${+d}/${+m}`; };
export const monthName = m => `${MONTHS[+m.slice(5, 7) - 1]} ${m.slice(0, 4)}`;

export const weekday = ds => {
  const [y, m, d] = ds.split('-').map(Number);
  return DAYS[new Date(y, m - 1, d).getDay()];
};

export function dayLabel(ds) {
  const [y, m, d] = ds.split('-').map(Number);
  const year = y !== new Date().getFullYear() ? '/' + y : '';
  const base = `${weekday(ds)} ${d}/${m}${year}`;
  if (ds === today()) return 'اليوم · ' + base;
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  return ds === yesterday.toLocaleDateString('sv') ? 'أمس · ' + base : base;
}