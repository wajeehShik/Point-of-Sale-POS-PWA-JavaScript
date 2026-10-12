
/**
 * البحث عن عملية مالية باستخدام المعرّف الخاص بها.
 * إذا لم نجد العملية، نرجع undefined.
 */
export const findTx = (s, id) =>
  s.tx.find(t => t.id === id);

// البحث عن منتج باستخدام معرّفه
// إذا لم نجده، نرجع undefined
export const findProduct = (s, id) =>
  s.products.find(p => p.id === id);

// إرجاع اسم الحساب باستخدام معرّفه
// إذا لم يكن الحساب موجودًا، نعرض شرطة بدلًا من اسم فارغ
export const accountName = (s, id) =>
  (s.accounts.find(a => a.id === id) || {}).name || '—';

// إرجاع اسم المنتج باستخدام معرّفه
// إذا كان المنتج محذوفًا أو غير موجود، نعرض "منتج محذوف"
export const productName = (s, id) =>
  (findProduct(s, id) || {}).name || 'منتج محذوف';

// استخراج أسماء الموردين من العمليات المالية
export const supplierNames = s => [
  ...new Set(
    s.tx
      .filter(t => t.supplier)  // اختيار العمليات التي تحتوي على اسم مورد
      .map(t => t.supplier)     // استخراج أسماء الموردين فقط
  ),
  // Set يحذف الأسماء المكررة، ثم نحوله إلى قائمة
];
