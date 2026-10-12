
/**
 * تنسيق الأرقام والمبالغ المالية لعرضها للمستخدم.
 */
import { fmt } from '../../core/format.js';

/**
 * البحث عن منتج باستخدام معرّفه.
 */
import { findProduct } from '../../domain/lookup.js';

/**
 * حساب الكمية المتوفرة من المنتج في المخزون.
 */
import { stock } from '../../domain/inventory.js';

/**
 * الوصول إلى عناصر واجهة المستخدم.
 */
import { $ } from '../dom.js';

/**
 * أدوات مشتركة لإنشاء الحقول وقراءة قيمها وتعديلها.
 */
import {
  opts,
  numberField,
  accountField,
  val,
  setValue
} from './fields.js';

export default {
  /**
   * بناء واجهة نموذج البيع.
   * state تحتوي على بيانات التطبيق الحالية،
   * ومنها المنتجات والحسابات.
   */
  render({ state }) {
    return `
      <!-- اختيار المنتج المراد بيعه -->
      <label>
        المنتج
        <select name="product">
          ${opts(state.products.map(p => [p.id, p.name]))}
        </select>
      </label>

      <!-- إدخال كمية البيع وإجمالي المبلغ المستلم -->
      <div class="row">
        ${numberField('qty', 'الكمية', '', '1')}
        ${numberField('amount', 'إجمالي البيع', 'الإجمالي')}
      </div>

      <!-- صندوق يعرض تفاصيل عملية البيع -->
      <div class="sumbox">

        <!-- سعر بيع الوحدة الواحدة -->
        <div class="stat">
          <span>سعر الوحدة</span>
          <b id="tot">—</b>
        </div>

        <!-- تكلفة شراء الوحدة الواحدة -->
        <div class="stat">
          <span>تكلفة الوحدة</span>
          <b id="cst">—</b>
        </div>

        <!-- الربح أو الخسارة المتوقعة من العملية -->
        <div class="stat">
          <span>الربح</span>
          <b id="prf">—</b>
        </div>

        <!-- عرض الكمية المتوفرة في المخزون -->
        <div class="note" id="stk"></div>
      </div>
    `
    // اختيار الحساب الذي استلم المال من خلاله.
    + accountField(state, 'الحساب الذي استلم المال');
  },

  /**
   * تسجيل أن المستخدم كتب إجمالي البيع يدويًا.
   * عندها لن نغيّر المبلغ تلقائيًا بناءً على سعر المنتج.
   */
  input(f, e) {
    if (e.target.name === 'amount') {
      f.dataset.amtT = '1';
    }
  },

  /**
   * عند تغيير المنتج في عملية بيع جديدة،
   * نسمح للنظام بتعبئة الإجمالي تلقائيًا من سعر المنتج.
   *
   * أما عند تعديل عملية قديمة، فلا نمسح هذه العلامة هنا.
   */
  change(f, e, { editId }) {
    if (e.target.name === 'product' && !editId) {
      f.dataset.amtT = '';
    }
  },

  /**
   * تحديث الحسابات المعروضة في النموذج.
   */
  sync(f, { state }) {
    // البحث عن المنتج الذي اختاره المستخدم.
    const p = findProduct(state, val(f, 'product'));

    // قراءة كمية البيع وتحويلها إلى رقم.
    // إذا كانت القيمة غير صالحة، نستخدم صفرًا.
    const q = +val(f, 'qty') || 0;

    /**
     * إذا لم يكتب المستخدم الإجمالي يدويًا،
     * وكان للمنتج سعر بيع صالح والكمية موجبة،
     * نحسب الإجمالي تلقائيًا:
     * إجمالي البيع = سعر الوحدة × الكمية.
     */
    if (!f.dataset.amtT && p && p.price > 0 && q > 0) {
      f.elements.amount.value = +(q * p.price).toFixed(2);
    }

    // قراءة إجمالي البيع.
    const a = +val(f, 'amount') || 0;

    // تكلفة الوحدة من بيانات المنتج.
    const cost = p ? p.cost : 0;

    // الربح المتوقع = إجمالي البيع - تكلفة البضاعة المباعة.
    const profit = a - cost * q;

    // عرض سعر بيع الوحدة الواحدة.
    $('#tot').textContent =
      q > 0 && a > 0
        ? fmt(a / q)
        : '—';

    // عرض تكلفة شراء الوحدة الواحدة.
    $('#cst').textContent =
      p
        ? fmt(cost)
        : '—';

    // الوصول إلى عنصر عرض الربح.
    const out = $('#prf');

    // لا نحسب الربح المعروض إلا إذا كانت الكمية والإجمالي موجبين.
    if (q > 0 && a > 0) {
      // إضافة علامة + إذا كان الربح موجبًا أو صفرًا.
      out.textContent =
        (profit >= 0 ? '+' : '') + fmt(profit);

      // تمييز الربح والخسارة باستخدام CSS.
      out.className = profit >= 0 ? 'pos' : 'neg';
    } else {
      // إخفاء النتيجة إلى أن تصبح البيانات صالحة للعرض.
      out.textContent = '—';
      out.className = '';
    }

    // عرض المخزون الحالي للمنتج المختار.
    $('#stk').textContent = p
      ? `المتوفر في المخزون: ${stock(state, p.id)}`
      : '';
  },

  /**
   * تعبئة النموذج ببيانات عملية بيع سابقة عند تعديلها.
   */
  fill(f, t) {
    setValue(f, 'product', t.productId);
    setValue(f, 'qty', t.qty);
    setValue(f, 'amount', t.amount);
    setValue(f, 'account', t.account);
  },

  /**
   * قراءة بيانات النموذج وإعادتها للجزء المسؤول عن الحفظ.
   * هذه الدالة لا تحفظ العملية بنفسها.
   */
  read: f => ({
    productId: val(f, 'product'), // معرّف المنتج المباع
    qty: val(f, 'qty'),           // الكمية المباعة
    amount: val(f, 'amount'),     // إجمالي البيع
    account: val(f, 'account'),   // الحساب الذي استلم المال
  }),
};
