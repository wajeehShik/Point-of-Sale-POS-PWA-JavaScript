import { TX_TYPES } from '../domain/txTypes.js';
import { accountName, productName } from '../domain/lookup.js';
import { inPeriod } from '../domain/ledger.js';
import { weekday } from '../core/dates.js';
import { SECTORS } from '../core/constants.js';
import { today } from '../core/format.js';

export const backupFile = state => ({
  name: `mali-backup-${today()}.json`, content: JSON.stringify(state, null, 1), mime: 'application/json',
});

export function csvFile(state, period) {
  const head = ['التاريخ', 'اليوم', 'النوع', 'القسم', 'البند', 'الكمية', 'المبلغ', 'المحفظة', 'ملاحظة'];
  const rows = state.tx.filter(t => inPeriod(t.date, period))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(t => [
      t.date, weekday(t.date), TX_TYPES[t.type].label, SECTORS[t.sector].label,
      t.productId ? productName(state, t.productId) : (t.category || ''),
      t.qty || (t.eqty ? `${t.eqty} ${t.eunit || ''}` : ''),
      t.amount, accountName(state, t.account), t.note || '',
    ]);
  const csv = '\ufeff' + [head, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const tag = typeof period === 'object' ? `${period.from}_${period.to}` : (period || 'all');
  return { name: `mali-${tag}.csv`, content: csv, mime: 'text/csv;charset=utf-8' };
}