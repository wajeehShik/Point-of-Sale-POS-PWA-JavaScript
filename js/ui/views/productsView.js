
/**
 * ui: حالة واجهة المستخدم، مثل نص البحث وخيار عرض جميع المنتجات.
 */
import { ui } from '../state.js';

/**
 * store: مخزن بيانات التطبيق، ويُستخدم هنا للحصول على أحدث البيانات.
 */
import { store } from '../../data/store.js';

/**
 * stockMap: حساب كمية المخزون الحالية لكل منتج.
 */
import { stockMap } from '../../domain/inventory.js';

/**
 * fmt: تنسيق الأسعار والأرقام للعرض.
 */
import { fmt } from '../../core/format.js';

/**
 * esc: حماية النصوص عند إدراجها داخل HTML.
 */
import { esc } from '../dom.js';

/**
 * onClick: التعامل مع أحداث النقر.
 * onInput: التعامل مع تغيّر محتوى حقل البحث.
 */
import { onClick, onInput } from '../actions.js';

/**
 * refresh: إعادة تحديث واجهة الصفحة.
 */
import { refresh } from '../router.js';

// العدد الافتراضي للمنتجات التي تظهر قبل الضغط على «عرض كل المنتجات».
const LIMIT = 6;

/**
 * إنشاء قائمة المنتجات.
 *
 * state: بيانات التطبيق الحالية، بما فيها المنتجات والمخزون.
 */
export function productsList(state) {

  // قراءة البحث وإزالة المسافات الزائدة وتحويله إلى أحرف صغيرة.
  const q = ui.productQuery.trim().toLowerCase();

  // الحصول على كميات المخزون الحالية لجميع المنتجات.
  const map = stockMap(state);

  // تحديد ما إذا كان مخزون المنتج منخفضًا أو وصل إلى حد التنبيه.
  // إذا لم تُحدد كمية دنيا، نعتبرها صفرًا.
  const low = x => x.qty <= (x.p.min || 0);

  // تجهيز المنتجات مع كمية المخزون الخاصة بكل منتج.
  let items = state.products.map(p => ({
    p,
    qty: map[p.id]
  }));

  // ترتيب المنتجات:
  // 1. المنتجات منخفضة المخزون أو النافدة أولًا.
  // 2. ثم ترتيب المنتجات حسب الاسم باللغة العربية.
  items.sort((a, b) =>
    low(a) === low(b)
      ? a.p.name.localeCompare(b.p.name, 'ar')
      : low(a)
        ? -1
        : 1
  );

  // إذا كتب المستخدم نصًا في البحث، نعرض المنتجات التي تحتوي أسماؤها عليه.
  if (q) {
    items = items.filter(x =>
      x.p.name.toLowerCase().includes(q)
    );
  }

  // إذا لم توجد نتائج، نعرض رسالة مناسبة.
  if (!items.length) {
    return `
      <div class="list">
        <div class="empty">
          ${
            state.products.length
              ? 'ما في منتج بهذا الاسم'
              : 'أضف منتجاً من خلال ＋ ثم شراء.'
          }
        </div>
      </div>
    `;
  }

  // تحديد عدد المنتجات المعروضة:
  // - عرض الجميع إذا فعّل المستخدم الخيار.
  // - عرض جميع نتائج البحث عند البحث.
  // - وإلا عرض أول 6 منتجات فقط.
  const limit =
    ui.showAllProducts || q
      ? items.length
      : LIMIT;

  // تحويل المنتجات إلى عناصر HTML.
  const rows = items
    .slice(0, limit)
    .map(x => `
      <!-- الضغط على المنتج يفتح تفاصيله -->
      <div
        class="row-i"
        data-action="product-open"
        data-id="${x.p.id}"
      >

        <!-- أيقونة المنتج -->
        <span class="ic">🏷️</span>

        <div class="mid">

          <!-- اسم المنتج -->
          ${esc(x.p.name)}

          <!-- إظهار تنبيه إذا نفد المخزون أو أصبح صفرًا -->
          ${
            x.qty <= 0
              ? '<em class="bdg">نفد</em>'
              : ''
          }

          <!-- تكلفة الوحدة وسعر بيعها والفرق بينهما -->
          <span>
            تكلفة ${fmt(x.p.cost)}
            · بيع ${fmt(x.p.price)}
            · ربح ${fmt(x.p.price - x.p.cost)}
          </span>

        </div>

        <!-- كمية المخزون الحالية -->
        <b class="${low(x) ? 'warn' : ''}">
          ${x.qty}
        </b>

        <!-- سهم يدل على إمكانية فتح تفاصيل المنتج -->
        <span class="chev">‹</span>

      </div>
    `)
    .join('');

  // تجهيز زر عرض المزيد أو تقليل القائمة.
  let btn = '';

  // إذا كانت هناك منتجات إضافية غير معروضة، نظهر زر «عرض كل المنتجات».
  if (items.length > limit) {
    btn = `
      <button class="btn alt" data-action="products-toggle">
        عرض كل المنتجات (${items.length})
      </button>
    `;
  }

  // إذا كانت القائمة كاملة ظاهرة ولا يوجد بحث،
  // نظهر زرًا للعودة إلى العرض المختصر.
  else if (
    ui.showAllProducts &&
    !q &&
    items.length > LIMIT
  ) {
    btn = `
      <button class="btn alt" data-action="products-toggle">
        عرض أقل
      </button>
    `;
  }

  // إرجاع القائمة مع الزر المناسب إن وُجد.
  return `
    <div class="list">${rows}</div>
    ${btn}
  `;
}

/**
 * إنشاء قسم المنتجات بالكامل:
 * العنوان، وعدد المنتجات، وتنبيه المخزون، وحقل البحث، والقائمة.
 */
export function productsSection(state) {

  // عدد المنتجات المسجلة في التطبيق.
  const n = state.products.length;

  // حساب كميات المخزون الحالية.
  const map = stockMap(state);

  // حساب عدد المنتجات التي وصلت إلى الحد الأدنى للمخزون أو أقل.
  const lowCount = state.products.filter(p =>
    map[p.id] <= (p.min || 0)
  ).length;

  // إظهار حقل البحث فقط عندما يتجاوز عدد المنتجات الحد الافتراضي.
  const search = n > LIMIT
    ? `
      <input
        class="search"
        type="search"
        placeholder="🔍 ابحث عن منتج"
        value="${esc(ui.productQuery)}"
        data-input="product-search"
      >
    `
    : '';

  // بناء عنوان القسم مع عدد المنتجات وتنبيه المخزون المنخفض.
  return `
    <h3>
      المنتجات · ${n}
      ${
        lowCount
          ? ` · <span class="warn">${lowCount} منخفض أو نافد</span>`
          : ''
      }
    </h3>

    ${search}

    <!-- مكان عرض قائمة المنتجات وتحديثها أثناء البحث -->
    <div id="plist">
      ${productsList(state)}
    </div>
  `;
}

/**
 * عند الكتابة في البحث:
 * 1. نحفظ النص في حالة الواجهة.
 * 2. نعيد إنشاء قائمة المنتجات فقط، دون تحديث الصفحة كاملة.
 */
onInput('product-search', (d, el) => {

  // حفظ نص البحث الحالي.
  ui.productQuery = el.value;

  // تحديث قائمة المنتجات باستخدام أحدث بيانات المخزن.
  document.getElementById('plist').innerHTML =
    productsList(store.state);
});

/**
 * عند الضغط على زر عرض كل المنتجات أو عرض أقل:
 * نعكس حالة العرض ثم نحدّث الواجهة.
 */
onClick('products-toggle', () => {

  // إذا كان العرض مختصرًا، نجعله كاملًا، والعكس صحيح.
  ui.showAllProducts = !ui.showAllProducts;

  // إعادة رسم الواجهة لإظهار العدد الجديد من المنتجات.
  refresh();
});
