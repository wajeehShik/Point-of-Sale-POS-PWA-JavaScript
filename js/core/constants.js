export const STORAGE_KEY = 'mali_v1';
export const EPS = 0.005;

export const SECTORS = {
  home:   { icon: '🏡', label: 'البيت' },
  invest: { icon: '📦', label: 'الاستثمار' },
};
export const sectorLabel = k => `${SECTORS[k].icon} ${SECTORS[k].label}`;

export const UNITS = ['كيلو', 'غرام', 'لتر', 'قطعة', 'علبة', 'كيس'];

export const INCOME_SOURCES = {
  home:   ['راتب', 'مساعدة', 'عمل', 'دخل آخر'],
  invest: ['رأس مال جديد', 'قرض أو دين', 'دخل آخر'],
};

export const EXPENSE_DEFAULTS = {
  home:   ['طعام', 'مواصلات', 'فواتير', 'صحة', 'أطفال', 'منزل'],
  invest: ['شحن', 'توصيل', 'تغليف', 'إعلان', 'أدوات', 'مواصلات للعمل'],
};