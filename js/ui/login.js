import { $ } from './dom.js';
import { auth } from '../services/auth.js';
import { install } from '../services/install.js';

let afterLogin = () => {};

export function bindLogin() {
  $('#leye').onclick = () => {
    const input = $('#lp'), show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    $('#leye').textContent = show ? '🙈' : '👁';
  };
  $('#lform').onsubmit = async e => {
    e.preventDefault();
    if (await auth.check($('#lu').value, $('#lp').value)) {
      auth.login(); $('#lp').value = ''; $('#lerr').textContent = '';
      afterLogin();
    } else {
      $('#lerr').textContent = 'اسم المستخدم أو كلمة السر غير صحيحة';
      $('#lp').value = ''; $('#lp').focus();
    }
  };
}

export function showLogin(onSuccess) {
  afterLogin = onSuccess;
  document.body.classList.add('locked');
  $('#lp').value = ''; $('#lerr').textContent = '';
  $('#lhint').textContent = auth.isDefault() ? 'أول دخول: اسم المستخدم 123 · كلمة السر 123' : '';
  if (!install.isMobile) setTimeout(() => $('#lu').focus(), 150);
}