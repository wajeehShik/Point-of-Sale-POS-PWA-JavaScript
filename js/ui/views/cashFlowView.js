import { balances, cashFlow } from '../../domain/ledger.js';
import { inventoryValue } from '../../domain/inventory.js';
import { debtTotal } from '../../domain/debts.js';
import { EPS } from '../../core/constants.js';
import { fmt } from '../../core/format.js';
import { stat } from '../components.js';

/** «كيف انحسب رصيد الاستثمار؟» */
export function cashFlowView(state) {
  const f = cashFlow(state), cash = balances(state).invest, inv = inventoryValue(state), debt = debtTotal(state);
  return `<details class="det"><summary>كيف انحسب رصيد الاستثمار؟</summary>
    <div class="list">
      ${stat('رأس المال والتحويلات الداخلة', fmt(f.capital))}
      ${stat('＋ المبيعات (كاملة: تكلفة + ربح)', fmt(f.sales), 'pos')}
      ${stat('－ مشتريات مدفوعة', fmt(f.paidPurchases), 'neg')}
      ${f.debtPayments ? stat('－ سداد ديون', fmt(f.debtPayments), 'neg') : ''}
      ${stat('－ مصاريف', fmt(f.expenses), 'neg')}
      ${stat('= الرصيد النقدي', fmt(cash), '', true)}
    </div>
    <div class="gap"></div>
    <div class="list">
      ${stat('الرصيد النقدي', fmt(cash))}
      ${stat('＋ قيمة المخزون (بسعر التكلفة)', fmt(inv))}
      ${debt > EPS ? stat('－ ديون عليك', fmt(debt), 'neg') : ''}
      ${stat('= قيمة الاستثمار الكلية', fmt(cash + inv - debt), '', true)}
    </div>
    <div class="nt">الرصيد النقدي هو المال الموجود فعلاً بالاستثمار. المبيعات بتدخله كاملة، والمخزون ما هو داخل فيه وإنما بيتحسب بالقيمة الكلية.</div>
  </details>`;
}