
/**
 * استيراد الأدوات المشتركة الخاصة ببناء حقول النموذج:
 *
 * sectorOptions: إنشاء خيارات الأقسام.
 * accountOptions: إنشاء خيارات الحسابات والمحافظ.
 * numberField: إنشاء حقل إدخال رقمي.
 * val: قراءة قيمة حقل من النموذج.
 * setValue: تعبئة حقل بقيمة محددة.
 */
import {
  sectorOptions,
  accountOptions,
  numberField,
  val,
  setValue
} from './fields.js';

export default {
  /**
   * إنشاء واجهة نموذج تحويل الأموال.
   * state تحتوي على بيانات التطبيق، ومنها الحسابات.
   */
  render({ state }) {
    return `
      <div class="row">

        <!-- القسم الذي سيخرج منه المبلغ -->
        <label>
          من قسم
          <select name="sector">
            ${sectorOptions('', ['home', 'invest'])}
          </select>
        </label>

        <!-- القسم الذي سيستقبل المبلغ -->
        <label>
          إلى قسم
          <select name="toSector">
            ${sectorOptions('', ['invest', 'home'])}
          </select>
        </label>

      </div>

      <div class="row">

        <!-- الحساب أو المحفظة التي سيُخصم منها المبلغ -->
        <label>
          من حساب
          <select name="account">
            ${accountOptions(state)}
          </select>
        </label>

        <!-- الحساب أو المحفظة التي سيُضاف إليها المبلغ -->
        <label>
          إلى حساب
          <select name="toAccount">
            ${accountOptions(state)}
          </select>
        </label>

      </div>
    `
    // حقل إدخال المبلغ المراد تحويله.
    + numberField('amount', 'المبلغ', 'المبلغ');
  },

  /**
   * تعبئة النموذج ببيانات تحويل سابق عند تعديله.
   *
   * f: النموذج.
   * t: بيانات عملية التحويل القديمة.
   */
  fill(f, t) {
    // المرور على أسماء الحقول وتعبئة كل حقل
    // بالقيمة المقابلة له في بيانات العملية.
    [
      'sector',
      'toSector',
      'account',
      'toAccount',
      'amount'
    ].forEach(k => setValue(f, k, t[k]));
  },

  /**
   * قراءة بيانات التحويل من النموذج.
   * تُعاد البيانات للجزء المسؤول عن حفظ العملية.
   */
  read: f => ({
    sector: val(f, 'sector'),       // القسم الذي خرج منه المال
    toSector: val(f, 'toSector'),   // القسم الذي دخل إليه المال
    account: val(f, 'account'),     // الحساب المصدر
    toAccount: val(f, 'toAccount'), // الحساب المستقبِل
    amount: val(f, 'amount'),       // مبلغ التحويل
  }),
};
