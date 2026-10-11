export function monthsChart(series) {
  const max = Math.max(1, ...series.flatMap(d => [d.income, d.expense, d.profit]));
  const slot = 320 / series.length, bar = Math.min(14, slot / 4.2);
  let bars = '';
  series.forEach((d, k) => {
    const cx = slot * k + slot / 2;
    [[d.income, '#16A34A'], [d.expense, '#DC2626'], [d.profit, '#2563EB']].forEach(([value, color], j) => {
      const h = Math.max(value > 0 ? 2 : 0, (value / max) * 110);
      bars += `<rect x="${cx + (j - 1) * (bar + 2) - bar / 2}" y="${130 - h}" width="${bar}" height="${h}" rx="3" fill="${color}"/>`;
    });
    bars += `<text x="${cx}" y="147" text-anchor="middle" font-size="11" fill="#64748B">${+d.month.slice(5)}</text>`;
  });
  return `<div class="card"><svg viewBox="0 0 320 152" width="100%" role="img" aria-label="مقارنة آخر ستة أشهر">
    <line x1="0" y1="130" x2="320" y2="130" stroke="#E2E8F0"/>${bars}</svg>
    <div class="legend"><span><i style="background:#16A34A"></i>دخل البيت</span><span><i style="background:#DC2626"></i>مصروف البيت</span><span><i style="background:#2563EB"></i>ربح الاستثمار</span></div></div>`;
}