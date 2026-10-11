/**
 * كل نوع عملية = وصف لتأثيره على الأرصدة.
 * effects(t) ترجع قائمة {sector, account, delta}. sign للعرض فقط.
 */
const money = (t, sign) => [{ sector: t.sector, account: t.account, delta: sign * t.amount }];

export const TX_TYPES = {
  income:   { icon: '💰', label: 'إيراد',    sign: +1, effects: t => money(t, +1) },
  sale:     { icon: '🛒', label: 'بيع',      sign: +1, effects: t => money(t, +1) },
  expense:  { icon: '💸', label: 'مصروف',    sign: -1, effects: t => money(t, -1) },
  purchase: { icon: '📦', label: 'شراء',     sign: -1, effects: t => (t.credit ? [] : money(t, -1)) },
  debtpay:  { icon: '🤝', label: 'سداد دين', sign: -1, effects: t => money(t, -1) },
  transfer: { icon: '🔄', label: 'تحويل',    sign:  0, effects: t => [
    { sector: t.sector,   account: t.account,   delta: -t.amount },
    { sector: t.toSector, account: t.toAccount, delta: +t.amount },
  ] },
};

/** الأثر النقدي المعروض (الشراء بالدين والتحويل = صفر) */
export const signed = t => (t.credit ? 0 : TX_TYPES[t.type].sign * t.amount);