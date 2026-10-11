import { bindActions } from './ui/actions.js';
import { sheet } from './ui/sheet.js';
import { register, startRouter, refresh } from './ui/router.js';
import { bindLogin, showLogin } from './ui/login.js';
import { initInstall } from './ui/install.js';
import { auth } from './services/auth.js';

import './ui/entry.js';
import './ui/productSheet.js';
import './ui/supplierSheet.js';

import dashboard from './ui/pages/dashboard.js';
import home from './ui/pages/home.js';
import invest from './ui/pages/invest.js';
import reports from './ui/pages/reports.js';
import settings from './ui/pages/settings.js';

bindActions();
sheet.bind();
bindLogin();
initInstall();

register('dashboard', dashboard);
register('home', home);
register('invest', invest);
register('reports', reports);
register('settings', settings);

let started = false;
function boot() {
  document.body.classList.remove('locked');
  if (started) refresh();
  else { started = true; startRouter(); }
}

if (auth.isLoggedIn()) boot(); else showLogin(boot);
auth.watchAway(() => { sheet.close(); showLogin(boot); });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');