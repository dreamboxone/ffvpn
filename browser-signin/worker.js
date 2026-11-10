/* SPDX-License-Identifier: AGPL-3.0-or-later */
'use strict';

const mozillaOrigin = 'https://accounts.firefox.com';
const loginURL = mozillaOrigin + '/?context=fx_desktop_v3&service=sync&action=email';
const firefoxAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0';
const timeout = 15 * 60 * 1000;
const launching = new Set();
const delivering = new Set();
const key = id => 'login:' + id;

function readRequest() {
  if (location.protocol !== 'https:' || !/\/admin\/services\/ffvpn\/?$/.test(location.pathname)) return;
  // A public website can imitate the LuCI markup. Only pair with local routers.
  const host = location.hostname;
  const local = host === 'localhost' || /\.(lan|local|home\.arpa)$/.test(host) ||
    /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|169\.254\.)[\d.]+$/.test(host) ||
    /^\[(::1|f[cd][0-9a-f]{2}:.*|fe[89ab][0-9a-f]:.*)\]$/i.test(host);
  if (!local) return;
  const element = document.querySelector('.ffvpn [data-ffvpn-browser-ready]');
  const request = element?.dataset.ffvpnBrowserRequest;
  if (/^[0-9a-f]{32}$/.test(request || '')) return request;
}

function deliverToLuCI(request, kind, account) {
  if (location.protocol !== 'https:' || !/\/admin\/services\/ffvpn\/?$/.test(location.pathname)) return false;
  const element = document.querySelector('.ffvpn [data-ffvpn-browser-request]');
  if (element?.dataset.ffvpnBrowserRequest !== request) return false;
  return !element.dispatchEvent(new CustomEvent('ffvpn-browser-signin', {
    cancelable: true,
    detail: {kind, account}
  }));
}

async function notify(login, kind, account = null) {
  const [result] = await chrome.scripting.executeScript({
    target: {tabId: login.source, documentIds: [login.document]},
    func: deliverToLuCI,
    args: [login.request, kind, account]
  });
  return result?.result === true;
}

async function cleanup(id) {
  await chrome.storage.session.remove(key(id));
  await chrome.declarativeNetRequest.updateSessionRules({removeRuleIds: [id]});
}

async function launch(source) {
  if (!source.id || launching.has(source.id)) return;
  launching.add(source.id);
  let tab;
  let login;
  try {
    const [current] = await chrome.scripting.executeScript({target: {tabId: source.id}, func: readRequest});
    if (!current?.result) {
      await chrome.action.setBadgeText({tabId: source.id, text: '?'});
      return;
    }
    login = {source: source.id, document: current.documentId, request: current.result, expires: Date.now() + timeout};
    if (!await notify(login, 'opened')) return;
    tab = await chrome.tabs.create({url: 'about:blank', windowId: source.windowId});
    await chrome.storage.session.set({[key(tab.id)]: login});
    // Match the Mozilla sign-in client only in the tab opened for this request.
    await chrome.declarativeNetRequest.updateSessionRules({addRules: [{
      id: tab.id,
      priority: 1,
      action: {type: 'modifyHeaders', requestHeaders: [{header: 'user-agent', operation: 'set', value: firefoxAgent}]},
      condition: {tabIds: [tab.id], regexFilter: '^https://accounts[.]firefox[.]com/', resourceTypes: ['main_frame', 'xmlhttprequest']}
    }]});
    await chrome.tabs.update(tab.id, {url: loginURL});
    await chrome.action.setBadgeText({tabId: source.id, text: ''});
  } catch {
    if (tab) {
      await cleanup(tab.id).catch(() => {});
      await chrome.tabs.remove(tab.id).catch(() => {});
    }
    if (login) await notify(login, 'failed').catch(() => {});
  } finally {
    launching.delete(source.id);
  }
}

async function receive(message, sender) {
  if (!message || !sender.tab?.id || sender.frameId !== 0 || sender.origin !== mozillaOrigin) return false;
  const id = sender.tab.id;
  const login = (await chrome.storage.session.get(key(id)))[key(id)];
  if (!login) return false;
  if (Date.now() >= login.expires) {
    await cleanup(id);
    return false;
  }
  if (message.kind === 'ready') return true;
  if (login.completed || message.kind !== 'session' || delivering.has(id) ||
      typeof message.email !== 'string' || !/^[^\s@]+@[^\s@]+$/.test(message.email) ||
      message.email.length > 254 || typeof message.token !== 'string' ||
      !/^[0-9a-f]{64}$/.test(message.token)) return false;

  delivering.add(id);
  try {
    // The same LuCI document and one-time request must still be active.
    const accepted = await notify(login, 'session', {email: message.email, token: message.token});
    if (accepted) await chrome.storage.session.set({[key(id)]: {...login, completed: true}});
    return accepted;
  } finally {
    // Leave the Mozilla tab and its WebChannel active for verification.
    delivering.delete(id);
  }
}

chrome.action.onClicked.addListener(tab => { void launch(tab); });
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id) return false;
  receive(message, sender).then(reply, () => reply(false));
  return true;
});
chrome.tabs.onRemoved.addListener(id => {
  void (async () => {
    const login = (await chrome.storage.session.get(key(id)))[key(id)];
    if (!login) return;
    await cleanup(id);
    if (!login.completed) await notify(login, 'closed');
  })().catch(() => {});
});
