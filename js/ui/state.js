/** حالة الواجهة المؤقتة (تبويبات، بحث، حدود العرض) */
export const ui = {
  tab: { home: 'all', invest: 'all' },
  limit: { home: 30, invest: 30, all: 10 },
  query: { home: '', invest: '', all: '' },
  productQuery: '',
  showAllProducts: false,
  showAllSuppliers: false,
};

export const resetLimits = () => { ui.limit.home = 30; ui.limit.invest = 30; };