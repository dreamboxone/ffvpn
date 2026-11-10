/* SPDX-License-Identifier: AGPL-3.0-or-later */
'use strict';

(() => {
  let active = false;
  let submitted = false;
  const pending = new Map();
  const status = {capabilities: {}, signedInUser: null};

  function answer(message) {
    const data = message.command === 'fxaccounts:fxa_status' ? status : {ok: true};
    const detail = {id: 'account_updates', message: {command: message.command, messageId: message.messageId, data}};
    window.dispatchEvent(new CustomEvent('WebChannelMessageToContent', {detail}));
  }

  function handle(event) {
    let detail = event.detail;
    if (typeof detail === 'string') {
      try { detail = JSON.parse(detail); } catch { return; }
    }
    if (detail?.id !== 'account_updates' || !detail.message) return;
    const message = detail.message;
    switch (message.command) {
      case 'fxaccounts:fxa_status':
      case 'fxaccounts:can_link_account':
        if (active) answer(message);
        else pending.set(message.command, message);
        break;
      case 'fxaccounts:login':
      case 'fxaccounts:oauth_login': {
        if (!active || submitted) return;
        const email = message.data?.email;
        const token = message.data?.sessionToken ?? message.data?.token;
        if (typeof email !== 'string' || typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token)) return;
        submitted = true;
        chrome.runtime.sendMessage({kind: 'session', email, token}).catch(() => {});
        break;
      }
    }
  }

  window.addEventListener('WebChannelMessageToChrome', handle, true);
  chrome.runtime.sendMessage({kind: 'ready'}).then(allowed => {
    active = allowed === true;
    if (active) pending.forEach(answer);
    else window.removeEventListener('WebChannelMessageToChrome', handle, true);
    pending.clear();
  }, () => {
    window.removeEventListener('WebChannelMessageToChrome', handle, true);
    pending.clear();
  });
})();
