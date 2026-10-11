/**
 * ربط الواجهة بالمنطق بدون onclick داخل HTML:
 *   data-action="name"  → onClick('name', (dataset, el, event) => ...)
 *   data-input="name"   → onInput(...)
 *   data-change="name"  → onChange(...)
 */
const maps = { click: new Map(), input: new Map(), change: new Map() };

export const onClick = (name, fn) => maps.click.set(name, fn);
export const onInput = (name, fn) => maps.input.set(name, fn);
export const onChange = (name, fn) => maps.change.set(name, fn);

export function bindActions() {
  const listen = (event, attr) => document.addEventListener(event, e => {
    const el = e.target.closest(`[${attr}]`);
    if (!el) return;
    const fn = maps[event].get(el.getAttribute(attr));
    if (fn) fn(el.dataset, el, e);
  });
  listen('click', 'data-action');
  listen('input', 'data-input');
  listen('change', 'data-change');
}