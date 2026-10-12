// استيراد دالة حساب ديون المورّدين والمبالغ المسددة والمتبقية
import { debts } from '../../domain/debts.js';

// استيراد دالة الحصول على اسم المنتج من معرّفه
import { productName } from '../../domain/lookup.js';

// استيراد دوال تنسيق المبالغ وتقريب الأرقام
import { fmt, r2 } from '../../core/format.js';

// استيراد دالة حماية النصوص قبل عرضها داخل HTML
import { esc } from '../dom.js';

// استيراد دوال التعامل مع حقول النموذج
// accountField: إنشاء حقل اختيار الحساب
// val: قراءة قيمة حقل
// setValue: تعبئة حقل بقيمة محددة
import { accountField, val, setValue } from './fields.js';

/*
 * هذا الملف مسؤول عن عرض نموذج تعديل عملية سداد دين موجودة.
 * أما إنشاء سداد جديد فيتم من نافذة المورّد.
 */
export default {

  /**
   * إنشاء HTML الخاص بنموذج السداد.
   *
   * state: بيانات التطبيق الحالية.
   * ref: معرّف عملية الشراء التي نشأ عنها الدين.
   * editId: معرّف عملية السداد إذا كنا نعدّل سداداً موجوداً.
   */
  render({ state, ref, editId }) {

    // البحث عن الدين المرتبط بعملية الشراء المحددة
    const d = debts(state).find(x => x.t.id === ref);

    // إذا لم نجد الدين، نعرض رسالة توضح أنه غير موجود
    if (!d) {
      return '<div class="empty">هذا الدين غير موجود</div>';
    }

    // عرض ملخص الدين: المنتج، الكمية، اسم المورّد، والمبلغ الإجمالي
    return `<div class="sumbox">
      <div class="stat">
        <span>
          ${esc(productName(state, d.t.productId))}
          × ${d.t.qty}
          ${d.t.supplier ? ' · ' + esc(d.t.supplier) : ''}
        </span>
        <b>${fmt(d.t.amount)}</b>
      </div>

      <!-- إجمالي ما تم سداده من هذا الدين -->
      <div class="stat">
        <span>المسدد</span>
        <b>${fmt(d.paid)}</b>
      </div>

      <!-- المبلغ الذي لا يزال مطلوباً سداده -->
      <div class="stat">
        <span>المتبقي</span>
        <b class="neg">${fmt(d.left)}</b>
      </div>
    </div>

    <!-- حقل إدخال مبلغ السداد -->
    <label>
      مبلغ السداد
      <input
        name="amount"
        type="number"
        step="any"
        min="0"
        inputmode="decimal"
        value="${editId ? '' : r2(Math.max(0, d.left))}"
      >
    </label>`

    // إضافة حقل اختيار الحساب الذي خرج منه مبلغ السداد
    + accountField(state, 'الحساب الذي دُفع منه');
  },

  /**
   * تعبئة النموذج عند تعديل عملية سداد موجودة.
   *
   * f: النموذج.
   * t: بيانات عملية السداد القديمة.
   */
  fill(f, t) {
    // وضع مبلغ السداد القديم داخل حقل المبلغ
    setValue(f, 'amount', t.amount);

    // تحديد الحساب الذي سُجلت منه عملية السداد
    setValue(f, 'account', t.account);
  },

  /**
   * قراءة البيانات التي أدخلها المستخدم في النموذج.
   *
   * تُرجع المبلغ والحساب ليستخدمهما الكود المسؤول عن الحفظ.
   */
  read: f => ({
    amount: val(f, 'amount'),
    account: val(f, 'account')
  }),
};