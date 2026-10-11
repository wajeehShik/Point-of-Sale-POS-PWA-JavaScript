import { sectorOptions, accountOptions, numberField, val, setValue } from './fields.js';

export default {
  render({ state }) {
    return `<div class="row">
      <label>من قسم<select name="sector">${sectorOptions('', ['home', 'invest'])}</select></label>
      <label>إلى قسم<select name="toSector">${sectorOptions('', ['invest', 'home'])}</select></label></div>
    <div class="row">
      <label>من حساب<select name="account">${accountOptions(state)}</select></label>
      <label>إلى حساب<select name="toAccount">${accountOptions(state)}</select></label></div>`
    + numberField('amount', 'المبلغ', 'المبلغ');
  },

  fill(f, t) {
    ['sector', 'toSector', 'account', 'toAccount', 'amount'].forEach(k => setValue(f, k, t[k]));
  },

  read: f => ({
    sector: val(f, 'sector'), toSector: val(f, 'toSector'),
    account: val(f, 'account'), toAccount: val(f, 'toAccount'), amount: val(f, 'amount'),
  }),
};