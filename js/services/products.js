import { store } from '../data/store.js';
import { findProduct } from '../domain/lookup.js';
import { stock, hasNegativeStock } from '../domain/inventory.js';

const fail = error => ({ error });

export function saveProduct(id, f) {
  return store.transact(s => {
    const p = findProduct(s, id);
    if (!p) return fail('المنتج غير موجود');
    const name = (f.name || '').trim();
    if (!name) return fail('اكتب اسم المنتج');
    const target = +f.stock;
    if (!(target >= 0)) return fail('الكمية غير صحيحة');

    const current = stock(s, id);
    Object.assign(p, { name, cost: +f.cost || 0, price: +f.price || 0, min: +f.min || 0 });
    p.qty0 = Math.round(((+p.qty0 || 0) + target - current) * 1e6) / 1e6; // تعديل الكمية = جرد
    if (hasNegativeStock(s)) return fail('الكمية بتخلي المخزون سالب');
  });
}

export function deleteProduct(id) {
  return store.transact(s => {
    if (s.tx.some(t => t.productId === id)) return fail('المنتج عليه عمليات، احذفها أولاً');
    s.products = s.products.filter(p => p.id !== id);
  });
}