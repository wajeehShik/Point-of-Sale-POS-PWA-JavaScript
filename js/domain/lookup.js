export const findTx = (s, id) => s.tx.find(t => t.id === id);
export const findProduct = (s, id) => s.products.find(p => p.id === id);
export const accountName = (s, id) => (s.accounts.find(a => a.id === id) || {}).name || '—';
export const productName = (s, id) => (findProduct(s, id) || {}).name || 'منتج محذوف';
export const supplierNames = s => [...new Set(s.tx.filter(t => t.supplier).map(t => t.supplier))];