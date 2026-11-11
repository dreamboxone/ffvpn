'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../files/www/luci-static/resources/view/ffvpn/panel-5820-r1.js'), 'utf8');
const optionsSource = source.slice(source.indexOf('  function baseOptions(connection){'), source.indexOf('  function show(tab){'));

async function test() {
 const nodes = [], writes = [];
 function E(tag, attrs = {}, children = []) {
  const node = {tag, ...attrs, children, classList:{add(){}}, addEventListener(){}, prepend(){},
   appendChild(child){this.children.push(child);}};
  nodes.push(node);
  return node;
 }
 let saved;
 const context = {
  E, t:s=>s, note(){}, icon:()=>E('svg'), fragmentationHelp:()=>E('span'),
  select:()=>E('select'), errorMessage:s=>s,
  getSettings:async()=>({network:{api_relay:'https://relay.example/'}, proxy:{transport:'h2'}}),
  settingsSave:new Promise(resolve=>{saved = resolve;}),
  write:async(url, body)=>{writes.push({url, body}); return context.reply;},
  button:(label, action)=>{const node = E('button', {label}); node.click = action; return node;}
 };
 vm.createContext(context);
 vm.runInContext(optionsSource, context);
 await context.baseOptions(E('section'));
 const button = nodes.find(n=>n.label==='Test relay');
 const report = nodes.find(n=>n.tag==='pre');
 nodes.find(n=>n.type==='url').value = ' https://new-relay.example/ ';
 context.reply = {ok:true, steps:[{status:'ok', stage:'tls', elapsed_ms:14, detail:'Connected'}]};
 const pending = button.click();
 await Promise.resolve();
 assert.equal(writes.length, 0, 'Relay test must wait for pending settings');
 saved();
 await pending;
 assert.equal(writes[0].url, '/relay/test');
 assert.equal(writes[0].body.url, 'https://new-relay.example/');
 assert.equal(report.hidden, false);
 assert.match(report.textContent, /Relay test passed/);
 assert.match(report.textContent, /tls.*14 ms.*Connected/);
 context.reply = {ok:false, steps:[{status:'error', stage:'dns', elapsed_ms:2, detail:'No answer'}]};
 await button.click();
 assert.match(report.textContent, /Relay test failed/);
 assert.match(report.textContent, /No answer/);
 context.write = async()=>{throw new Error('Core unavailable');};
 await assert.rejects(button.click(), /Core unavailable/);
 assert.equal(report.textContent, 'Core unavailable');
 console.log('Relay diagnostic UI checks passed');
}

test().catch(error=>{console.error(error); process.exitCode = 1;});
