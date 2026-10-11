export const card = (label, value, cls = '', extra = '') =>
  `<div class="card${extra ? ' ' + extra : ''}"><small>${label}</small><b class="${cls}">${value}</b></div>`;

export const stat = (label, value, cls = '', isSum = false) =>
  `<div class="stat${isSum ? ' sum' : ''}"><span>${label}</span><b class="${cls}">${value}</b></div>`;

export const grid = (cards, style = '') => `<div class="grid"${style ? ` style="${style}"` : ''}>${cards}</div>`;
export const listBox = rows => `<div class="list">${rows}</div>`;
export const emptyBox = msg => `<div class="list"><div class="empty">${msg}</div></div>`;
export const signCls = n => (n > 0 ? 'pos' : n < 0 ? 'neg' : '');