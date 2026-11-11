'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the actual LuCI form with responses from the sign-in API.
const source = fs.readFileSync(path.join(__dirname, '../files/www/luci-static/resources/view/ffvpn/panel-5820-r1.js'), 'utf8');
const formSource = source.slice(source.indexOf('  function signinForm(){'), source.indexOf('  function saveSettings(edit){'));

function setup(initial, replies) {
 const nodes = [], writes = [], timers = [];
 function E(tag, attrs = {}, children = []) {
  const node = {tag, ...attrs, children, dataset:{}, value:attrs.value || '', textContent:'', isConnected:true,
   classList:{add(){}}, addEventListener(){},
   setAttribute(key, value){this[key] = value;}, removeAttribute(key){delete this[key];}};
  nodes.push(node);
  return node;
 }
 const context = {
  E, signup:initial, t:s=>s, checked:s=>s, note(){}, showAccounts(){context.completed = true;},
  keepSignin(id){context.signup = id;},
  callAPI:async()=>{assert.ok(replies.length, 'Unexpected sign-in poll'); return replies.shift();},
  write:async(p, body, method)=>{writes.push({path:p, body, method}); return {id:'new-session'};},
  window:{setTimeout(fn){timers.push(fn); return timers.length;}, clearTimeout(){}},
  button:(label, action)=>{const node = E('button', {label}); node.click = action; return node;},
  card:(title, children)=>E('section', {title}, children)
 };
 vm.createContext(context);
 vm.runInContext(formSource + '\nsigninForm();', context);
 return {
  nodes, writes, context,
  image:nodes.find(n=>n.tag==='img'),
  answer:nodes.find(n=>n.placeholder==='Verification code or answer'),
  click:label=>nodes.find(n=>n.label===label).click(),
  poll:async()=>{assert.ok(timers.length, 'No scheduled sign-in poll'); await timers.shift()(); await new Promise(resolve=>setImmediate(resolve));}
 };
}

async function test() {
 const first = 'data:image/png;base64,AAAA', second = 'data:image/png;base64,BBBB';
 const form = setup('session', [
  {step:'need_captcha', captcha:first},
  {step:'need_captcha', captcha:second, error:'Try again'},
  {step:'need_email_code'},
  {step:'done'}
 ]);
 await form.poll();
 assert.equal(form.image.hidden, false);
 assert.equal(form.image.src, first);
 assert.equal(form.answer.autocomplete, 'off');
 form.answer.value = 'wrong';
 await form.click('Continue');
 assert.equal(form.writes[0].path, '/signin/session');
 assert.equal(form.writes[0].body.value, 'wrong');
 assert.equal(form.image.src, second);
 assert.equal(form.answer.value, '');
 form.answer.value = 'correct';
 await form.click('Continue');
 assert.equal(form.image.hidden, true);
 assert.equal(form.image.src, undefined);
 assert.equal(form.answer.autocomplete, 'one-time-code');
 await form.click('Continue');
 assert.equal(form.context.signup, null);
 assert.equal(form.context.completed, true);

 const cancel = setup('cancel-session', [{step:'need_captcha', captcha:first}]);
 await cancel.poll();
 cancel.answer.value = 'unfinished';
 await cancel.click('Cancel');
 assert.equal(cancel.writes[0].method, 'DELETE');
 assert.equal(cancel.image.hidden, true);
 assert.equal(cancel.image.src, undefined);
 assert.equal(cancel.answer.value, '');
 assert.equal(cancel.context.signup, null);

 for (const state of [
  {step:'failed', captcha:first}, {step:'cancelled', captcha:first},
  {step:'need_captcha', captcha:'https://example.com/image.png'},
  {step:'need_captcha', captcha:'data:image/svg+xml;base64,AAAA'}
 ]) {
  const invalid = setup('session', [state]);
  await invalid.poll();
  assert.equal(invalid.image.hidden, true);
  assert.equal(invalid.image.src, undefined);
 }

 const start = setup(null, [{step:'need_captcha', captcha:first}]);
 await start.click('Sign in');
 assert.equal(start.context.signup, 'new-session');
 assert.equal(start.image.src, first);
 console.log('Sign-in CAPTCHA checks passed');
}

test().catch(error=>{console.error(error); process.exitCode = 1;});
