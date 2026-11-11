'use strict';
'require view';
'require rpc';
'require ui';
'require poll';
'require ffvpn.i18n-5820-r1 as i18n';
'require ffvpn.theme as themeUI';
'require ffvpn.flags as flags';
'require ffvpn.logs as logText';
'require ffvpn.advanced as advanced';

var callStatus = rpc.declare({object:'luci.ffvpn', method:'status', expect:{}});
var callConnectionCheck=rpc.declare({object:'luci.ffvpn',method:'connection_check',params:['site'],expect:{}});
var callIntegration=rpc.declare({object:'luci.ffvpn',method:'integration',params:['enabled','target','confirmed'],expect:{}});
var callLogs=rpc.declare({object:'luci.ffvpn',method:'logs',expect:{}});
var callLogsClear=rpc.declare({object:'luci.ffvpn',method:'logs_clear',params:['component'],expect:{}});
var callUsage = rpc.declare({object:'luci.ffvpn', method:'usage', expect:{}});
var callAPI = rpc.declare({object:'luci.ffvpn', method:'api', params:['path'], expect:{}});
var callWrite = rpc.declare({object:'luci.ffvpn', method:'api_write', params:['method','path','body'], expect:{}});
var callPower = rpc.declare({object:'luci.ffvpn', method:'power', params:['enabled','confirmed'], expect:{}});
var callMode = rpc.declare({object:'luci.ffvpn', method:'mode', params:['value'], expect:{}});
var callTunMTU = rpc.declare({object:'luci.ffvpn', method:'tun_mtu', params:['value'], expect:{}});
var callDirectory = rpc.declare({object:'luci.ffvpn', method:'directory', params:['value'], expect:{}});
var callClock = rpc.declare({object:'luci.ffvpn', method:'clock', params:['now'], expect:{}});
var callUpdate = rpc.declare({object:'luci.ffvpn', method:'update', params:['component','action'], expect:{}});
var callUpdateStatus = rpc.declare({object:'luci.ffvpn', method:'update_status', expect:{}});
var t = function(s) { return i18n.t(s); };
function errorMessage(message){
 var text=String(message||'');
 if(/TLS handshake timeout/i.test(text))return t('The secure connection to Mozilla timed out. Check the router internet connection and clock, then try again.');
 if(/context deadline exceeded|i\/o timeout|Client.Timeout/i.test(text))return t('Mozilla did not respond in time. Check the router connection and try again.');
 if(/no such host/i.test(text))return t('The Mozilla server address could not be resolved. Check router DNS settings.');
 if(/connection refused|network is unreachable/i.test(text))return t('Cannot connect to Mozilla. Check the router internet connection.');
 return t(text);
}
function checked(result) { if (result && result.error) throw new Error(result.error); return result || {}; }
function write(path, body, method) { return callWrite(method || 'POST', path, JSON.stringify(body || {})).then(checked); }
function getSettings() {
 return write('/settings',{},'GET').then(function(r){
  if(!r.config||!r.config.network||!r.config.proxy)throw new Error(t('Could not read the core settings. Check the FFVPN service.'));
  return r.config;
 });
}
function compareVersions(candidate,installed) {
 var pattern=/^(\d+)\.(\d+)\.(\d+)(?:-r([1-9]\d*))?$/;
 var a=pattern.exec(candidate),b=pattern.exec(installed);
 if(!a||!b)return null;
 for(var i=1;i<=4;i++){
  var av=Number(a[i]||0),bv=Number(b[i]||0);
  if(!Number.isSafeInteger(av)||!Number.isSafeInteger(bv))return null;
  if(av!==bv)return av>bv?1:-1;
 }
 return 0;
}
function note(message, error, anchor) {
 if(!anchor)anchor=document.querySelector('.ffvpn main');
 if(!anchor)return;
 if(anchor.closest&&anchor.closest('.ff-account-card')){var accountHost=anchor.closest('.ff-account-card').querySelector('.ff-account-feedback');if(accountHost)anchor=accountHost;}
 if(anchor.dataset&&anchor.dataset.update){var updateCard=anchor.closest('.ff-card');var messageHost=updateCard&&updateCard.querySelector('.ff-update-message');if(messageHost)anchor=messageHost;}
 var host=anchor;
 if(anchor.tagName==='BUTTON'){
  host=anchor.parentElement;
  if(!host.classList.contains('ff-action')){var wrap=E('span',{'class':'ff-action'});host.insertBefore(wrap,anchor);wrap.appendChild(anchor);host=wrap;}
 }
 var box=host.querySelector(':scope > .ff-inline-note');
 if(!box){box=E('div',{'class':'ff-inline-note',role:'status'});host.appendChild(box);}
 box.textContent=message;box.classList.toggle('ff-error',!!error);
}
function button(label, action) {
 var result=E('button', {'class':'mk-btn','type':'button', click:function(event) {
 var el=event.currentTarget; el.disabled=true;el.classList.add('mk-running');
  var oldNote=(el.closest('.ff-account-card')||el.parentElement).querySelector('.ff-inline-note');if(oldNote)oldNote.remove();
  Promise.resolve().then(function(){return action(el);}).catch(function(e){ note(t('Operation failed') + ': ' + errorMessage(e.message),true,el); }).finally(function(){if(!el.ffBusy){el.disabled=false;el.classList.remove('mk-running');}});
 }}, t(label));
 if(['Remove','Delete','Clear logs'].indexOf(label)>=0){result.classList.add('danger');result.prepend(icon('Trash'));}
 return result;
}
function card(title, children) { return E('section', {'class':'mk-card ff-card'}, [E('h3',{},t(title))].concat(children)); }
function homeCard(title,ico,accent,children){return E('section',{'class':'mk-card ff-home-card',style:'--accent:'+accent},[E('div',{'class':'mk-card-title'},[E('span',{'class':'mk-metric-ico'},icon(ico)),E('span',{},t(title))])].concat(children));}
function formatGB(value){return (Math.max(0,Number(value)||0)/1000000000).toLocaleString(i18n.get(),{minimumFractionDigits:2,maximumFractionDigits:2});}
function accountDate(value){if(!value||!Number.isFinite(Date.parse(value)))return t('Not recorded');return new Intl.DateTimeFormat(i18n.get()==='fa'?'fa-IR-u-ca-persian':i18n.get()+'-u-ca-gregory',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));}
function formatLatency(value){var fa=i18n.get()==='fa';return E('span',{'class':'ff-latency',dir:fa?'rtl':'ltr'},[E('bdi',{dir:'ltr'},Number(value).toLocaleString(i18n.get(),{maximumFractionDigits:0})),E('span',{},fa?'م‌ثانیه':'ms')]);}
function fragmentationHelp(){
 var title=t('TLS fragmentation help'),id='ff-fragmentation-help';
 var trigger=E('button',{type:'button','class':'ff-option-help',popovertarget:id,'aria-label':title,'aria-expanded':'false'},i18n.get()==='fa'?'؟':'?');
 var popup=E('div',{id:id,'class':'ff-help-content',popover:'auto',role:'dialog','aria-label':title,dir:i18n.get()==='fa'?'rtl':'ltr'},[
  E('strong',{},title),
  E('p',{},t('TLS fragmentation splits the initial TLS handshake (ClientHello). It may help when a network filter inspects the server name.')),
  E('ul',{},[
   E('li',{},[E('strong',{},t('Off')+': '),t('Sends the initial TLS message normally.')]),
   E('li',{},[E('strong',{},'SNI: '),t('Uses three writes: before the domain name, its first letter, and the rest of the message.')]),
   E('li',{},[E('strong',{},'First byte: '),t('Sends the first byte separately, then sends the rest of the message.')]),
   E('li',{},[E('strong',{},'TLS record: '),t('Splits the message into two TLS records after the first letter of the domain name.')])
  ]),
  E('p',{},t('The domain name is not changed or encrypted. Separate TCP writes may be combined by the network; bypass is not guaranteed.')),
  E('p',{},t('This cannot fix a blocked IP or port, or a TCP connection that never opens. It does not fragment the main HTTP/3 connection, which uses QUIC.')),
  E('p',{},t('Keep this off if your connection is stable. Changes affect new connections.'))
 ]);
 function position(){var anchor=trigger.getBoundingClientRect(),box=popup.getBoundingClientRect();popup.style.left=Math.max(16,Math.min(i18n.get()==='fa'?anchor.right-box.width:anchor.left,window.innerWidth-box.width-16))+'px';popup.style.top=Math.max(16,anchor.bottom+8+box.height<=window.innerHeight-16?anchor.bottom+8:anchor.top-box.height-8)+'px';}
 popup.addEventListener('toggle',function(event){var open=event.newState==='open';trigger.setAttribute('aria-expanded',String(open));if(open){position();window.addEventListener('resize',position);document.addEventListener('scroll',position,true);}else{window.removeEventListener('resize',position);document.removeEventListener('scroll',position,true);}});
 return E('span',{'class':'ff-setting-title'},[E('label',{'for':'ff-fragmentation'},t('TLS fragmentation')),trigger,popup]);
}
function formatKB(value){return (Math.max(0,Number(value)||0)/1024).toLocaleString(i18n.get(),{maximumFractionDigits:2});}
function uptime(seconds){var n=Math.max(0,Math.floor(Number(seconds)||0));return String(Math.floor(n/3600)).padStart(2,'0')+':'+String(Math.floor(n/60)%60).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
function countryName(code,fallback){
 if(String(code).toUpperCase()==='REC'||/recom+ended/i.test(fallback||''))return t('Recommended location');
 if(i18n.get()==='fa'&&String(code).toUpperCase()==='US')return 'آمریکا';
 if(i18n.get()==='fa'&&String(code).toUpperCase()==='SE')return 'سوئد';
 var name=fallback||code||'—';
 try{if(/^[A-Z]{2}$/.test(String(code).toUpperCase()))name=new Intl.DisplayNames([i18n.get()],{type:'region'}).of(String(code).toUpperCase());}catch(e){}
 return i18n.get()==='fa'?i18n.clean(name):name;
}
function cityName(name,code){
 if(/recom+ended/i.test(name||''))return t('Recommended city');
 try{var english=new Intl.DisplayNames(['en'],{type:'region'}).of(code);if(name===english||(code==='KR'&&name==='Korea'))return countryName(code,name);}catch(e){}
 return t(name||'');
}
function flag(code,name){var key=String(code||'').toLowerCase();return flags.codes.indexOf(key)>=0?E('img',{'class':'ff-country-flag',src:L.resource('ffvpn/flags/'+key+'.svg'),alt:name||code}):icon('Globe');}
function icon(name) {
 var paths={Overview:'M3 10 12 3l9 7M5 9v12h14V9M9 21v-7h6v7',Accounts:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',Servers:'M3 3h18v7H3zM3 14h18v7H3zM7 6h.01M7 17h.01',Settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',Updates:'M21 8a9 9 0 0 0-15-4L3 7M3 2v5h5M3 16a9 9 0 0 0 15 4l3-3M21 22v-5h-5',Logs:'M4 3h16v18H4zM8 7h8M8 12h8M8 17h5'};
 paths.Home=paths.Overview;
 paths.Sun='M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5';
 paths.Moon='M21 12.8A9 9 0 0 1 11.2 3 9 9 0 1 0 21 12.8Z';
 paths.Download='M4 17v4h16v-4';
 paths.Clock='M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7v5l3 2';
 paths.Globe='M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3a18 18 0 0 1 0 18 18 18 0 0 1 0-18';
 paths.Router='M3 10h18v10H3zM7 6V2M17 6V2M7 15h.01M11 15h.01M15 15h2';
 paths.Chart='M3 3v18h18M7 17v-5M12 17V7M17 17v-9';
 paths.Pulse='M2 12h5l3-8 4 16 3-8h5';
 paths.Copy='M9 9h12v12H9zM5 15H3V3h12v2';paths.Trash='M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7';paths.Check='M5 12l4 4L19 6';
 paths.Eye='M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0';
 var svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),p=document.createElementNS('http://www.w3.org/2000/svg','path');
 svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','ff-icon mk-ico');svg.setAttribute('aria-hidden','true');
 p.setAttribute('d',paths[name]||paths.Overview);p.setAttribute('fill','none');p.setAttribute('stroke','currentColor');p.setAttribute('stroke-width','1.7');p.setAttribute('stroke-linecap','round');p.setAttribute('stroke-linejoin','round');svg.appendChild(p);
 if(name==='Download'){svg.classList.add('mk-download');var arrow=p.cloneNode();arrow.setAttribute('d','M12 3v12M7 10l5 5 5-5');arrow.setAttribute('class','mk-download-arrow');svg.appendChild(arrow);}
 return svg;
}
function select(items, value, change) {
 var el=E('select',{'class':'ff-select',change:function(){change(el.value);}},items.map(function(item){return E('option',{value:item[0]},t(item[1]));}));
 el.value=value;
 return el;
}
var warning='Enable the ffvpn SOCKS proxy for local network devices without a username or password?';

return view.extend({
 handleSave:null, handleSaveApply:null, handleReset:null,
 load:function(){return callStatus();},
 render:function(initial){
  var self=this, state=initial, root, content, current='Home', signup=null;
  try{signup=sessionStorage.getItem('ffvpn-signin');}catch(e){}
  function keepSignin(id){signup=id;try{if(id)sessionStorage.setItem('ffvpn-signin',id);else sessionStorage.removeItem('ffvpn-signin');}catch(e){}}
  var power=E('input',{type:'checkbox',checked:!!state.enabled,'aria-label':t('Main Switch')});
  var phase=E('span',{'class':'ff-status-badge'},t('Starting'));
  var routerUptime=E('span',{'class':'mk-uptime-value',dir:'auto'},'—');
  var details=E('pre',{'class':'ff-details'});
  var engines=E('div',{'class':'ff-grid'});
  var lastCountry=null;try{lastCountry=JSON.parse(localStorage.getItem('ffvpn-last-country'));}catch(e){}
  function rememberCountry(code,name){if(!/^[A-Z]{2}$/.test(String(code||'').toUpperCase()))return;lastCountry={code:String(code).toUpperCase(),name:name||code};try{localStorage.setItem('ffvpn-last-country',JSON.stringify(lastCountry));}catch(e){}}
  var masterCard=E('div',{'class':'ff-power ff-basic-power'},[E('label',{'class':'ff-switch'},[power,E('span',{'class':'ff-slider'})]),E('strong',{},t('Main Switch'))]);
  var integrationButton=null,integrationTarget=null,integrationPending=false,tunOptions=null,tunStatus=null,settingsSave=Promise.resolve();
  var routingLabels={zirgozar:'Zirgozar',passwall2:'PassWall2',tun:'Standalone TUN'};
  function refreshTunOptions(){
   if(!tunOptions||!integrationTarget)return;
   tunOptions.hidden=!!state.target?state.target!=='tun':integrationTarget.value!=='tun';
   var active=state.tun_active_mtu;
   tunStatus.textContent=state.target==='tun'?(active?t('Active TUN MTU')+' · '+active:t('TUN is not running. Check the router log.')):'';
  }
  var refreshLogPage=null;
  var updateText=null, updateVersions={}, updatePending=null, homeFields={}, usagePeriod='today', usageData=null;
  function line(label,key){var node=E('bdi',{dir:'auto'},'—');homeFields[key]=node;return E('div',{'class':'pwp-detail-row ff-detail-row'},[E('span',{},t(label)),node]);}
  function renderUsage(){
   if(!homeFields.usage)return;
   var today=usageData&&usageData.today,days=usageData&&usageData.days||{},span=usagePeriod==='week'?7:usagePeriod==='month'?30:1;
   var start=today?new Date(Date.parse(today+'T00:00:00Z')-(span-1)*86400000).toISOString().slice(0,10):'',up=0,down=0;
   Object.keys(days).forEach(function(day){if(day>=start&&day<=today){up+=Number(days[day].up)||0;down+=Number(days[day].down)||0;}});
   ['up','down','total'].forEach(function(key){homeFields.usage[key].textContent=today?formatGB(key==='up'?up:key==='down'?down:up+down):'—';});
   root.querySelectorAll('[data-period]').forEach(function(b){b.setAttribute('aria-selected',String(b.dataset.period===usagePeriod));});
  }
  function theme(mode){
   try {localStorage.setItem('ffvpn-theme',mode);}catch(e){}
   root.classList.toggle('mk-dark',mode==='dark');
   root.classList.toggle('mk-follow',mode==='auto');
   root.querySelectorAll('[data-theme]').forEach(function(b){var selected=b.dataset.theme===mode;b.classList.toggle('mk-seg-on',selected);b.setAttribute('aria-pressed',String(selected));});
   if(mode==='auto'&&root.zgzSyncTheme)root.zgzSyncTheme();
  }
  function status(){
   if(current==='Updates'&&updateText)return refreshUpdateStatus();
   return Promise.all([callStatus(),callAPI('/status').catch(function(){return {};})]).then(function(values){
    if(!root.isConnected)return;
    if(current==='Logs'&&refreshLogPage)refreshLogPage().catch(function(){});
    state=values[0]; var core=values[1], s=core.state||{};
    if(integrationButton){var active=!!state.target;integrationButton.textContent=t(active?'Restore settings':'Apply settings')+(active?'':' · '+t(routingLabels[integrationTarget.value]||'Standalone TUN'));integrationButton.disabled=!!state.busy||integrationPending;integrationButton.classList.toggle('mk-running',!!state.busy);integrationTarget.disabled=active||!!state.busy;if(state.control_error)note(t(state.control_error),true,integrationButton);refreshTunOptions();}
    power.checked=state.busy?!!state.desired:!!state.enabled;power.disabled=!!state.busy;
    var text={running:'Running',off:'Off',starting:'Starting',error:'Error',waiting:'Connecting'}[s.phase]||'Starting';
    if(s.code==='no_accounts'||s.code==='no_usable_account')text='Waiting for an account';
    if(s.code==='waiting_for_network')text='Waiting for network';
    if(state.busy)text='Connecting';
    phase.replaceChildren(E('span',{'class':'mk-chip '+(!state.enabled?'':s.phase==='running'?'ok':s.phase==='error'?'error':'warn')},t(!state.enabled?'Off':text)));
    routerUptime.textContent=uptime((state.router||{}).uptime);
    details.textContent=s.message||'';
    if(state.control_error)details.textContent+='\n'+state.control_error;
    if(core.proxy)details.textContent+='\n'+(core.proxy.country_name||'')+' '+(core.proxy.upstream||'');
    if(current==='Home'&&homeFields.model){
     var router=state.router||{},proxy=core.proxy||{},exit=core.exit||{},test=core.last_test||{};
     homeFields.model.textContent=router.model||'—';homeFields.firmware.textContent=router.version?'OpenWrt '+router.version:'—';
     homeFields.memory.textContent=router.memory_total?Math.round((1-Number(router.memory_free)/Number(router.memory_total))*100)+'%':'—';homeFields.load.textContent=router.load?(Number(router.load)/65536).toFixed(2):'—';
     homeFields.country.textContent=countryName(proxy.country_code||core.selection,proxy.country_name||core.selection_name||t('Recommended location'));homeFields.server.textContent=proxy.upstream||'—';homeFields.protocol.textContent={h1:'HTTP/1.1',h2:'HTTP/2',h3:'HTTP/3'}[proxy.transport]||'—';
     homeFields.latency.replaceChildren(state.enabled&&(exit.latency_ms>0||test.total_ms>0)?formatLatency(exit.latency_ms||test.total_ms):'—');
     if(proxy.country_code)rememberCountry(proxy.country_code,proxy.country_name);
     else if(!lastCountry)rememberCountry(core.selection,core.selection_name);
     if(lastCountry){homeFields.country.textContent=countryName(lastCountry.code,lastCountry.name);homeFields.orb.replaceChildren(flag(lastCountry.code,homeFields.country.textContent));}
     if(homeFields.rate)homeFields.rate.textContent='↓ '+formatKB((core.traffic||{}).down_rate)+' '+(i18n.get()==='fa'?'کیلوبایت/ثانیه':'KB/s')+' · ↑ '+formatKB((core.traffic||{}).up_rate)+' '+(i18n.get()==='fa'?'کیلوبایت/ثانیه':'KB/s');
     callUsage().then(function(data){usageData=data;renderUsage();}).catch(function(){});
    }
    engines.replaceChildren.apply(engines,['zirgozar','passwall2'].map(function(name){
     var p=state[name]||{};
     return E('div',{'class':'ff-engine-state'},[E('strong',{},name==='zirgozar'?'Zirgozar':'PassWall2'),E('span',{},t(p.installed?'Installed':'Not installed')+' · '+t(p.enabled?'Enabled':'Disabled')+' · '+t(p.running?'Running':'Stopped'))]);
    }));
   });
  }
  function refreshUpdateStatus(){
   return callUpdateStatus().then(checked).then(function(r){
     if(current!=='Updates'||!updateText)return;
     updateText.textContent=r.message||t('No update has been run yet.');
     var comparisons={};
     ['app','core'].forEach(function(c){if(updateVersions[c]){
      var installed=r[c+'_version']||'—',latest=r[c+'_latest'];
      var order=compareVersions(latest,installed);
      comparisons[c]=order;
      updateVersions[c].replaceChildren(E('bdi',{'class':'mk-chip ok ff-version-chip',dir:'ltr'},'【 '+installed+' 】'),
       order===1?E('bdi',{'class':'mk-chip info ff-version-chip',dir:'ltr'},(i18n.get()==='fa'?'← ':'→ ')+latest):
        E('span',{'class':'mk-muted'},t(order===0?'Up to date':'Not checked')));
     }});
     var busy=!!r.busy||(updatePending&&Date.now()-updatePending.time<1500);
     if(!busy)updatePending=null;
     root.querySelectorAll('[data-update]').forEach(function(b){
      var active=busy&&((r.component||updatePending&&updatePending.component)===b.dataset.update)&&((r.action||updatePending&&updatePending.action)===b.dataset.action);
      var order=comparisons[b.dataset.update];
      var downgrade=b.dataset.update==='all'?(comparisons.app===-1||comparisons.core===-1):order===-1;
      b.ffBusy=busy;
      b.disabled=busy||(b.dataset.action!=='check'&&downgrade)||(b.dataset.action==='update'&&order===0);
      b.classList.toggle('mk-running',!!active);
      if(r.component===b.dataset.update&&r.action===b.dataset.action&&(busy||r.result)){var failed=!busy&&r.result!=='0';note(busy?t(r.action==='check'?'Checking version':'Updating files'):failed?t('The operation failed. Check the router connection and try again.'):t(r.action==='check'?'Version check complete':'Update complete'),!!failed,b);}
     });
     updateText.style.display=!busy&&r.result&&r.result!=='0'&&r.message?'':'none';
     if(updateVersions.space){var gb=Number(r.free_kb)*1024/1000000000;updateVersions.space.textContent=t('Free space')+': '+(Number.isFinite(gb)?gb.toLocaleString(i18n.get(),{maximumFractionDigits:2}):'—')+' '+t('GB');}
     if(updateVersions.path)updateVersions.path.textContent=r.core_path||'/usr/bin/ffvpn-core';
     if(updateVersions.directory&&document.activeElement!==updateVersions.directory)updateVersions.directory.value=r.core_dir||'/usr/bin';
   });
  }
  power.addEventListener('change',function(){
   var enabled=power.checked;
   if(enabled&&!window.confirm(t(warning))){power.checked=false;return;}
   power.disabled=true;
   callPower(enabled,true).then(checked).then(function(){power.checked=enabled;}).catch(function(e){power.checked=!!state.enabled;power.disabled=false;note(e.message,true,power.closest('.ff-power'));});
  });
  function renderAccounts(){
   return callAPI('/accounts').then(checked).then(function(r){
    var list=E('div',{'class':'ff-list'});
    (r.accounts||[]).forEach(function(a,index){
     var id=encodeURIComponent(a.id);
     function move(delta){var ids=r.accounts.map(function(item){return item.id;}),to=index+delta;if(to<0||to>=ids.length)return;ids.splice(to,0,ids.splice(index,1)[0]);return write('/accounts/order',{ids:ids}).then(showAccounts);}
     var quota=a.usage||{},limit=Number(quota.limit_bytes)||0,remaining=Number(quota.remaining_bytes)||0;
     var accountCard=card('',[E('p',{},t({ready:'Ready',reserved:'Reserved',reauth_required:'Sign in again',unavailable:'Unavailable'}[a.status]||'Unavailable')+(a.used_percent!=null?' · '+t('Quota used')+': '+a.used_percent.toLocaleString(i18n.get(),{maximumFractionDigits:1})+'%':'')),E('div',{'class':'ff-actions'},[
      (function(){var use=button('Use',function(){return write('/accounts/'+id+'/activate').then(showAccounts);});use.classList.add('success');return use;})(),
      button(a.enabled?'Disabled':'Enabled',function(){return write('/accounts/'+id+'/enabled',{enabled:!a.enabled}).then(showAccounts);}),
      button('Refresh',function(){return write('/accounts/'+id+'/refresh').then(showAccounts);}),
      button('Remove',function(){if(window.confirm(t('Remove this account?')))return write('/accounts/'+id,{},'DELETE').then(showAccounts);})
     ])]);
     var stats=E('div',{'class':'ff-account-quota'});
     var used=quota.unlimited?t('Unlimited'):limit?formatGB(Math.max(0,limit-remaining))+' '+t('GB'):t('Not recorded');
     [[t('Used traffic'),used],[t('Remaining traffic'),quota.unlimited?t('Unlimited'):limit?formatGB(remaining)+' '+t('GB'):t('Not recorded')],[t('Total quota'),quota.unlimited?t('Unlimited'):limit?formatGB(limit)+' '+t('GB'):t('Not recorded')],[t('First use'),accountDate((state.first_use||{})[a.id])],[t('Traffic reset'),quota.unlimited?'—':accountDate(quota.reset_at)]].forEach(function(item){stats.appendChild(E('div',{'class':'ff-quota-item'},[E('span',{},item[0]),E('bdi',{dir:'auto','class':'ff-quota-value'},i18n.get()==='fa'&&String(item[1]).endsWith(' '+t('GB'))?[E('bdi',{dir:'ltr'},String(item[1]).slice(0,-(' '+t('GB')).length)),E('span',{},t('GB'))]:item[1])]));});
     accountCard.appendChild(E('div',{'class':'ff-account-feedback',role:'status'}));accountCard.appendChild(stats);
     var refresh=accountCard.querySelector('.ff-actions').children[2];refresh.prepend(icon('Updates'));refresh.classList.add('primary');
     var address=E('bdi',{'dir':'ltr','class':'ff-email-hidden'},'••••••@••••••'),revealed=false;
     var eye=E('button',{'type':'button','class':'mk-icobtn ff-email-eye','aria-label':t('Show email'),'aria-pressed':'false',click:function(){
      revealed=!revealed;address.textContent=revealed?(a.email||a.name):'••••••@••••••';address.classList.toggle('ff-email-hidden',!revealed);eye.setAttribute('aria-label',t(revealed?'Hide email':'Show email'));eye.setAttribute('aria-pressed',String(revealed));
     }},[icon('Eye')]);
     accountCard.dataset.accountIndex=String(index);accountCard.classList.add('ff-account-card');
     var handle=E('button',{type:'button','class':'mk-icobtn ff-account-handle','aria-label':t('Drag to reorder'),title:t('Drag to reorder'),keydown:function(e){if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();Promise.resolve(move(e.key==='ArrowUp'?-1:1)).catch(function(err){note(err.message,true,handle);});}},pointerdown:function(e){e.preventDefault();handle.setPointerCapture(e.pointerId);accountCard.classList.add('ff-dragging');},pointerup:function(e){accountCard.classList.remove('ff-dragging');if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);var hit=document.elementFromPoint(e.clientX,e.clientY),target=hit&&hit.closest('.ff-account-card');if(target&&target!==accountCard)Promise.resolve(move(Number(target.dataset.accountIndex)-index)).catch(function(err){note(err.message,true,handle);});},pointercancel:function(){accountCard.classList.remove('ff-dragging');}},'⠿');
     var actions=accountCard.querySelector('.ff-actions'),head=accountCard.querySelector('h3');head.replaceChildren(E('span',{'class':'ff-account-identity'},[handle,address,eye]),actions);list.appendChild(accountCard);
    });
    if(!(r.accounts||[]).length)list.appendChild(E('p',{},t('No accounts yet.')));
    return list;
   });
  }
  var accountBox;
  function showAccounts(){return renderAccounts().then(function(list){accountBox.replaceChildren(list);});}
  function backupActions(){
   var path='/backup/transfer', chunkSize=12*1024;
   var file=E('input',{type:'file',accept:'.zip,application/zip'});
   async function transfer(action,run){
    var start=await write(path,{action:action});
    try{return await run(start);}
    finally{await write(path,{action:'close',id:start.id}).catch(function(){});}
   }
   return E('details',{'class':'ff-card'},[
    E('summary',{},t('Account backup')),
    E('p',{},t('Keep backup files private. They contain account credentials and settings.')),
    E('div',{'class':'ff-actions'},[
     button('Export backup',function(){return transfer('export',async function(start){
      var chunks=[];
      for(var offset=0;offset<start.size;offset+=chunkSize){
       var response=await write(path,{action:'read',id:start.id,offset:offset});
       var bytes=Uint8Array.from(atob(response.data),function(c){return c.charCodeAt(0);});
       chunks.push(bytes);
      }
      var url=URL.createObjectURL(new Blob(chunks,{type:'application/zip'}));
      var link=E('a',{href:url,download:'FFVPN-backup-'+new Date().toISOString().slice(0,10)+'.zip'});
      link.click();
      window.setTimeout(function(){URL.revokeObjectURL(url);},1000);
     });}),
     E('label',{'class':'ff-setting-field'},[E('span',{},t('Backup file')),file]),
     button('Import accounts',async function(anchor){
      var selected=file.files[0];
      if(!selected||!selected.size||selected.size>16*1024*1024)throw new Error(t('Select a ZIP backup up to 16 MB.'));
      await transfer('upload',async function(start){
       for(var offset=0;offset<selected.size;offset+=chunkSize){
        var bytes=new Uint8Array(await selected.slice(offset,offset+chunkSize).arrayBuffer());
        await write(path,{action:'append',id:start.id,offset:offset,data:btoa(String.fromCharCode.apply(null,bytes))});
       }
       var preview=await write(path,{action:'inspect',id:start.id});
       var accounts=preview.accounts||[];
       if(!accounts.length)throw new Error(t('No accounts found in the backup.'));
       if(!window.confirm(t('Import these accounts? Existing sign-ins with the same email will be updated.')+'\n\n'+accounts.map(function(a){return a.email;}).join('\n')))return;
       var result=await write(path,{action:'import',id:start.id});
       file.value='';
       await showAccounts();
       note(t('Accounts imported')+' · '+(result.added+result.updated),false,anchor);
      });
     })
    ])
   ]);
  }
  function signinForm(){
   var email=E('input',{type:'email',placeholder:t('Email'),autocomplete:'username'});
   var password=E('input',{type:'password',placeholder:t('Password'),autocomplete:'current-password'});
   var answer=E('input',{type:'text',placeholder:t('Verification code or answer'),autocomplete:'one-time-code'});
   var result=E('div',{'class':'ff-signin-state',role:'status','aria-live':'polite'});
   var captcha=E('img',{'class':'ff-signin-captcha',alt:t('CAPTCHA'),hidden:true});
   var browserRequest=E('div',{'class':'ff-signin-state',role:'status'});
   var browserTimer,signInStarting=false;
   function endBrowserRequest(){
    window.clearTimeout(browserTimer);
    delete browserRequest.dataset.ffvpnBrowserRequest;
    delete browserRequest.dataset.ffvpnBrowserReady;
   }
   var browserButton=button('Sign in with Mozilla in your browser',function(){
    if(location.protocol!=='https:')throw new Error(t('Open LuCI over HTTPS to sign in with the browser.'));
    if(signup||signInStarting||browserRequest.dataset.ffvpnBrowserRequest)throw new Error(t('A sign-in is already in progress.'));
    var nonce=Array.from(crypto.getRandomValues(new Uint8Array(16)),function(b){return b.toString(16).padStart(2,'0');}).join('');
    browserRequest.dataset.ffvpnBrowserRequest=nonce;
    browserRequest.dataset.ffvpnBrowserReady='1';
    browserRequest.textContent=t('Click the FFVPN extension icon in this tab to open Mozilla.');
    browserTimer=window.setTimeout(function(){
     endBrowserRequest();
     browserRequest.textContent=t('Browser sign-in expired. Start again.');
    },15*60*1000);
   });
   browserRequest.addEventListener('ffvpn-browser-signin',function(event){
    if(!browserRequest.dataset.ffvpnBrowserRequest||!browserRequest.isConnected)return;
    var response=event.detail||{};
    switch(response.kind){
     case 'opened':
      if(!browserRequest.dataset.ffvpnBrowserReady)return;
      event.preventDefault();
      delete browserRequest.dataset.ffvpnBrowserReady;
      browserRequest.textContent=t('Complete sign-in and any verification in the Mozilla tab.');
      break;
     case 'closed':
     case 'failed':
      event.preventDefault();
      endBrowserRequest();
      browserRequest.textContent=t(response.kind==='closed'?'The Mozilla tab was closed.':'Could not open Mozilla. Try again.');
      break;
     case 'session':
      var account=response.account||{};
      if(signup||signInStarting||typeof account.email!=='string'||!(/^[0-9a-f]{64}$/).test(account.token||''))return;
      event.preventDefault();
      endBrowserRequest();
      signInStarting=true;
      browserRequest.textContent=t('Complete any remaining verification in the Mozilla tab.');
      write('/signin/browser',{email:account.email,session_token:account.token}).then(function(s){
       if(!s.id)throw new Error(t('The installed core does not support browser sign-in.'));
       keepSignin(s.id);
       return watch();
      }).catch(function(e){note(errorMessage(e.message),true,browserRequest);}).finally(function(){signInStarting=false;});
    }
   });
   function watch(){
    if(!signup)return Promise.resolve();
    return callAPI('/signin/'+encodeURIComponent(signup)).then(function(s){
     if(!s.step){keepSignin(null);checked(s);return;}
     var steps={working:'Signing in',need_captcha:'Type the characters shown in the CAPTCHA.',need_email_code:'Enter the code sent by Mozilla.',need_unblock_code:'Enter the code sent by Mozilla.',need_totp:'Enter your authenticator code.',need_email_link:'Open the confirmation email, then continue.',done:'Sign-in complete',failed:'Sign-in failed',cancelled:'Sign-in cancelled'};
     var errors={wrong_password:'Incorrect Mozilla account password.',no_password:'This account needs a Mozilla password; set it on the official account website.',no_account:'No Mozilla account exists with this email.',too_many_attempts:'Too many attempts. Wait before trying again.',wrong_code:'Wrong or expired verification code.',wrong_totp:'Wrong or expired verification code.',unblock_code_rejected:'Wrong or expired verification code.',too_many_codes:'Wrong or expired verification code.',timed_out:'Sign-in timed out. Please start again.',network:'Cannot reach Mozilla. Check the connection settings.'};
     var image=s.step==='need_captcha'&&typeof s.captcha==='string'&&/^data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/=\s]+$/i.test(s.captcha)?s.captcha:'';
     captcha.hidden=!image;
     if(image)captcha.setAttribute('src',image);else captcha.removeAttribute('src');
     answer.autocomplete=s.step==='need_captcha'?'off':'one-time-code';
     answer.setAttribute('aria-label',t(s.step==='need_captcha'?'CAPTCHA answer':'Verification code or answer'));
     result.textContent=t(steps[s.step]||s.message||s.step);
     if(s.error)result.textContent+=' · '+(errors[s.error_code]?t(errors[s.error_code]):s.error);
     if(s.step==='done'){keepSignin(null);browserRequest.textContent='';return showAccounts();}
     if(['failed','cancelled'].indexOf(s.step)>=0){keepSignin(null);browserRequest.textContent='';return;}
     if(s.step==='working')window.setTimeout(function(){if(result.isConnected)watch().catch(function(e){note(e.message,true);});},1500);
    });
   }
   var signInButton=button('Sign in',function(){
    if(signup||signInStarting||browserRequest.dataset.ffvpnBrowserRequest)throw new Error(t('A sign-in is already in progress.'));
    signInStarting=true;
    return write('/signin',{email:email.value,password:password.value}).then(function(s){password.value='';keepSignin(s.id);result.textContent=t('Signing in');return watch();}).finally(function(){signInStarting=false;});
   });signInButton.classList.add('primary');
   var continueButton=button('Continue',function(){
    if(!signup)return;
    return write('/signin/'+encodeURIComponent(signup),{value:answer.value}).then(function(){answer.value='';return watch();});
   });continueButton.classList.add('primary');
   if(signup)window.setTimeout(function(){watch().catch(function(e){note(e.message,true);});},0);
   return card('Sign in',[
    E('a',{'class':'mk-link',href:'https://accounts.firefox.com/',target:'_blank',rel:'noopener noreferrer'},t('Create a Mozilla account')),
    E('div',{'class':'ff-actions'},[browserButton]),
    E('p',{'class':'mk-muted'},t('Extract the extension and load its folder with Load unpacked in Chrome or Edge.')),
    browserRequest,
    E('div',{'class':'ff-form-row'},[E('label',{},[E('span',{},t('Email')),email]),E('label',{},[E('span',{},t('Password')),password]),signInButton]),result,captcha,
    E('div',{'class':'ff-form-row'},[E('label',{},[E('span',{},t('Verification code or answer')),answer]),E('div',{'class':'ff-actions'},[continueButton,button('Cancel',function(){
     if(signInStarting&&!signup)throw new Error(t('A sign-in is already in progress.'));
     endBrowserRequest();
     browserRequest.textContent='';
     if(signup)return write('/signin/'+encodeURIComponent(signup),{},'DELETE').then(function(){keepSignin(null);result.textContent='';captcha.hidden=true;captcha.removeAttribute('src');answer.value='';});
    })])])
   ]);
  }
  function saveSettings(edit){
   var pending=settingsSave.then(getSettings).then(function(cfg){
    edit(cfg);
    return write('/settings',{config:cfg},'PUT').then(function(r){
     if(!r.saved)throw new Error(t('Could not save the core settings.'));
    });
   });
   settingsSave=pending.catch(function(){});
   return pending;
  }
  function baseOptions(connection){
    return getSettings().then(function(cfg){
     function change(section,key,value){
      return saveSettings(function(latest){latest[section][key]=value;}).then(function(){note(t('Saved'));}).catch(function(e){note(e.message,true);});
     }
     var network=cfg.network, proxy=cfg.proxy;
     var protocols=[['h2','HTTP/2'],['h3','HTTP/3']];
     if(proxy.ip_version!==undefined)protocols.push(['h1','HTTP/1.1']);
     var relay=E('input',{type:'url',value:network.api_relay||'',placeholder:'https://',change:function(){change('network','api_relay',relay.value);}});
     var relayReport=E('pre',{'class':'ff-relay-report',role:'status','aria-live':'polite',hidden:true});
     var relayTest=button('Test relay',async function(){
      relayReport.hidden=false;relayReport.textContent=t('Testing relay…');
      try{
       await settingsSave;
       var report=await write('/relay/test',{url:relay.value.trim()});
       relayReport.textContent=t(report.ok?'Relay test passed':'Relay test failed')+'\n'+(report.steps||[]).map(function(step){return '['+step.status+'] '+step.stage+' · '+step.elapsed_ms+' ms · '+step.detail;}).join('\n');
      }catch(e){relayReport.textContent=errorMessage(e.message);throw e;}
     });
     var fields=[
      E('label',{'class':'ff-setting-field'},[E('span',{},t('Connection protocol')),select(protocols,proxy.transport,function(v){change('proxy','transport',v);})]),
      E('div',{'class':'ff-setting-field'},[fragmentationHelp(),(function(){var field=select([['off','Off'],['sni','SNI'],['first-byte','First byte'],['record','TLS record']],network.hello_split||'off',function(v){change('network','hello_split',v);});field.id='ff-fragmentation';return field;})()]),
      E('label',{'class':'ff-setting-field'},[E('span',{},t('Relay server')),relay])
     ];
     if(proxy.ip_version!==undefined){
      var families=[['auto',t('Automatic (IPv4 first)')],['dual',t('Dual stack')],['ipv6_first',t('IPv6 first')],['ipv4',t('IPv4 only')],['ipv6',t('IPv6 only')]];
      fields.push(E('label',{'class':'ff-setting-field'},[E('span',{},t('Mozilla connection IP version')),select(families,proxy.ip_version||'auto',function(v){change('proxy','ip_version',v);})]));
     }
     [['api_relay_enabled','Use personal relay'],['shared_relay_enabled','Use shared relay for HTTP 451']].forEach(function(item){
      if(network[item[0]]===undefined)return;
      var toggle=E('input',{type:'checkbox'});
      toggle.checked=network[item[0]];
      toggle.addEventListener('change',function(){change('network',item[0],toggle.checked);});
      fields.push(E('label',{'class':'ff-setting-row'},[E('span',{},t(item[1])),toggle]));
     });
     connection.appendChild(E('div',{'class':'ff-connection-grid'},fields));
     connection.appendChild(E('div',{'class':'ff-actions'},[relayTest]));
     connection.appendChild(relayReport);
     var clock=button('Set router clock',function(anchor){return callClock(Math.floor(Date.now()/1000)).then(checked).then(function(r){note(t(r.already?'Router clock is already configured.':'Router clock configured'),false,anchor);});});clock.classList.add('primary');clock.prepend(icon('Clock'));connection.appendChild(E('div',{'class':'ff-setting-row ff-clock-row'},[clock]));
    });
  }
  function show(tab){
   current=tab;content.replaceChildren();updateText=null;
   root.querySelectorAll('[data-tab]').forEach(function(el){el.classList.toggle('ff-active',el.dataset.tab===tab);});
   if(tab==='Home'){
    homeFields={};
    var statusCard=homeCard('Status','Pulse','#10b981',[line('Country','country'),line('Server','server'),line('Protocol','protocol'),line('Latency','latency')]);statusCard.classList.add('zgz-connection-card');statusCard.querySelector('.mk-card-title').appendChild(phase);
    homeFields.orb=E('div',{'class':'zgz-country-orb'},[icon('Globe')]);
    statusCard.appendChild(E('div',{'class':'zgz-connection-art','aria-hidden':'true'},[E('div',{'class':'zgz-orbit zgz-orbit-one'}),E('div',{'class':'zgz-orbit zgz-orbit-two'}),homeFields.orb]));
    var routerCard=homeCard('Router information','Router','#3b82f6',[line('Model','model'),line('Firmware','firmware'),line('Memory','memory'),line('CPU load','load')]);
    var connectionCard=homeCard('Connection status','Globe','#3b82f6',[]);connectionCard.classList.add('pwp-social-card');
    [['arvancloud','ArvanCloud','#00a99d'],['soft98','Soft98','#339c54'],['nvidia','NVIDIA','#76b900'],['intel','Intel','#0071c5']].forEach(function(site){
     var value=E('span',{'class':'pwp-check-value'},t('Check'));
     var check=E('button',{type:'button','class':'pwp-social-check',style:'--site-colour:'+site[2],click:function(){
      var previous=connectionCard.querySelector(':scope > .ff-inline-note');if(previous)previous.remove();check.disabled=true;value.textContent=t('Connecting');value.className='pwp-check-value mk-wait';
      callConnectionCheck(site[0]).then(checked).then(function(r){var ms=Number(r.ms)||0;value.replaceChildren(ms>0&&r.http_code!=='000'?formatLatency(ms):'—');value.className='pwp-check-value '+(ms>0&&r.http_code!=='000'?'mk-on':'mk-bad');}).catch(function(e){value.textContent='—';note(t(e.message),true,connectionCard);}).finally(function(){check.disabled=false;});
     }},[E('span',{'class':'pwp-social-icon'},[E('img',{src:L.resource('ffvpn/site-icons/'+site[0]+(site[0]==='arvancloud'?'.svg':'.ico')),alt:''})]),E('span',{'class':'pwp-social-name'},site[1]),value]);connectionCard.appendChild(check);
    });
    homeFields.usage={};var values=E('div',{'class':'pwp-usage-values'},['up','down','total'].map(function(key){var node=E('strong',{dir:'ltr'},'—');homeFields.usage[key]=node;return E('div',{'class':'pwp-usage-value'},[E('span',{},t({up:'Upload',down:'Download',total:'Total'}[key])),node]);}));
    var periods=E('div',{'class':'pwp-usage-periods',role:'tablist'},[['today','Today'],['week','Week'],['month','Month']].map(function(item){return E('button',{'type':'button',role:'tab','data-period':item[0],'aria-selected':String(usagePeriod===item[0]),click:function(){usagePeriod=item[0];renderUsage();}},t(item[1]));}));
    homeFields.rate=E('div',{'class':'mk-muted ff-rate'});
    var usageCard=homeCard('Traffic usage','Chart','#3b82f6',[E('div',{'class':'pwp-usage-body'},[values,periods]),E('small',{},t('GB')),homeFields.rate]);usageCard.classList.add('pwp-usage-card');
    content.appendChild(E('div',{'class':'mk-grid mk-metrics pwp-status-row ff-status-row'},[statusCard,routerCard,connectionCard,usageCard]));
    var available=['zirgozar','passwall2'].filter(function(name){return (state[name]||{}).installed;});
    available.push('tun');
    integrationTarget=select(available.map(function(name){return [name,routingLabels[name]];}),state.target||(available.indexOf(state.integration)>=0?state.integration:available[0]),function(){refreshTunOptions();status();});
    integrationButton=button(state.target?'Restore settings':'Apply settings',function(anchor){
     var enabled=!state.target;
     var message=integrationTarget.value==='tun'?'Standalone TUN routes LAN traffic through FFVPN and pauses Zirgozar and PassWall2. It requires kmod-tun. Restore settings reverses these changes.':'This creates the ffvpn SOCKS node, enables the selected routing engine, disables its localhost proxy, and sets remote DNS to Cloudflare DoH. The other engine is disabled. Restore settings reverses these changes and preserves later manual edits.';
     if(enabled&&!window.confirm(t(message)))return;
     integrationPending=true;
     return callIntegration(enabled,integrationTarget.value,true).then(checked).then(function(){note(t('Applying settings'),false,anchor);return status();}).finally(function(){integrationPending=false;});
    });integrationButton.classList.add('primary');
    var mtu=E('input',{type:'number',min:1280,max:9000,step:1,dir:'ltr',value:state.tun_mtu||1500});
    var saveMTU=button('Apply TUN MTU',function(anchor){
     var value=Number(mtu.value);
     if(!Number.isInteger(value)||value<1280||value>9000)throw new Error(t('TUN MTU must be between 1280 and 9000.'));
     return callTunMTU(value).then(checked).then(function(r){
      if(!r.ok)throw new Error(t('Could not apply the TUN MTU.'));
      note(t('Saved'),false,anchor);
      return status();
     });
    });
    tunStatus=E('p',{role:'status'});
    tunOptions=E('div',{},[
     E('label',{'class':'ff-setting-field'},[E('span',{},t('TUN interface MTU')),mtu]),
     E('p',{'class':'mk-muted'},t('Default 1500 bytes. Applying a new MTU briefly restarts an active TUN.')),
     E('div',{'class':'ff-actions'},[saveMTU]),tunStatus
    ]);
    refreshTunOptions();
    var basic=card('Basic settings',[masterCard,engines,E('div',{'class':'ff-actions'},[integrationTarget,integrationButton]),tunOptions]);content.appendChild(basic);baseOptions(basic).catch(function(e){note(e.message,true,basic);});
   }else if(tab==='Settings'){
    var panel=E('div');
    content.appendChild(panel);
    return getSettings().then(function(cfg){
     if(panel.isConnected)advanced.render(panel,cfg,{save:saveSettings,read:callAPI,write:write,button:button,card:card,note:note,select:select});
    });
   }else if(tab==='Accounts'){
    content.appendChild(E('p',{},t('Multiple Mozilla accounts are supported. Accounts are tried in priority order when quota runs low.')));
    var addForm=signinForm();
    addForm.hidden=!signup;
    var addButton=button('Add user',function(){
     addForm.hidden=false;
     addForm.querySelector('input').focus({preventScroll:true});
    });
    addButton.classList.add('primary');
    var extension=E('a',{'class':'mk-btn soft-blue',href:L.resource('ffvpn/browser-signin.zip'),
     download:'ffvpn-browser-signin.zip'},[icon('Download'),E('span',{},t('Download the FFVPN browser extension'))]);
    accountBox=E('div');
    content.appendChild(E('div',{'class':'ff-actions'},[addButton,extension]));
    content.appendChild(addForm);
    content.appendChild(backupActions());
    content.appendChild(accountBox);
    return showAccounts();
   }else if(tab==='Servers'){
    var locations=E('div',{'class':'ff-server-list'});content.appendChild(E('div',{'class':'ff-actions'},[
     button('Recommended',function(){return write('/location',{country:'REC'}).then(status);}),
     button('Fastest',function(){return write('/location',{country:'fastest'}).then(status);}),
     button('Measure latency',function(){return write('/locations/ping').then(function(){return show('Servers');});})
    ]));content.appendChild(locations);
    return callAPI('/locations').then(checked).then(function(r){(r.locations||[]).forEach(function(l){var name=countryName(l.code,l.name);locations.appendChild(E('section',{'class':'mk-card ff-server-row'},[
     E('h3',{'class':'ff-server-name'},[flag(l.code,name),E('span',{},name)]),l.ping_ms?E('bdi',{'class':'ff-server-ping '+(l.ping_ms>3000?'ff-ping-brown':l.ping_ms>2500?'ff-ping-red':l.ping_ms>2000?'ff-ping-orange':l.ping_ms>1500?'ff-ping-yellow':'ff-ping-green'),dir:'auto'},(i18n.get()==='fa'?[E('bdi',{dir:'ltr'},Number(l.ping_ms).toLocaleString('fa')),E('span',{},'م‌ثانیه')]:formatLatency(l.ping_ms))):E('span'),button('Select',function(){return write('/location',{country:l.code}).then(function(){rememberCountry(l.code,l.name);return status();});})
    ]));});});
   }else if(tab==='Updates'){
    updateText=E('pre',{'class':'ff-details',style:'display:none'});
    function updateButton(label,component,action){var b=button(label,function(anchor){
     if(action!=='check'&&!window.confirm(t('Start the update? The connection may briefly stop.')))return;
     var old=anchor.closest('.ff-card').querySelector('.ff-update-message');if(old)old.replaceChildren();
     updatePending={component:component,action:action,time:Date.now()};
     root.querySelectorAll('[data-update]').forEach(function(el){el.disabled=true;el.ffBusy=true;});
     return callUpdate(component,action).then(checked).then(status).catch(function(e){updatePending=null;root.querySelectorAll('[data-update]').forEach(function(el){el.disabled=false;el.ffBusy=false;el.classList.remove('mk-running');});throw e;});
    });b.dataset.update=component;b.dataset.action=action;b.classList.add('mk-small',action==='check'?'soft-blue':action==='update'?'success':'primary');b.prepend(icon(action==='check'?'Updates':'Download'));return b;}
    content.appendChild(E('p',{},t('The complete release archive is downloaded and verified before installation.')));
    content.appendChild(card('Update FFVPN and core',[E('div',{'class':'ff-update-message',role:'status'}),updateButton('Update now','all','update')]));
    ['app','core'].forEach(function(component){
     updateVersions[component]=E('p',{});
     content.appendChild(card(component==='app'?'ffvpn':'Core',[E('div',{'class':'ff-update-row'},[
      E('div',{'class':'ff-update-version'},[updateVersions[component],E('div',{'class':'ff-update-message',role:'status'})]),E('div',{'class':'ff-actions'},[updateButton('Check for updates',component,'check'),updateButton('Update now',component,'update'),updateButton('Reinstall',component,'reinstall')])
     ])]));
    });
    updateVersions.path=E('code',{'dir':'ltr'});
    var folder=E('input',{type:'text',dir:'ltr',value:'/usr/bin',change:function(){
     return callDirectory(folder.value).then(checked).then(function(){note(t('Saved'),false,folder.parentElement);return status();}).catch(function(e){note(e.message,true,folder.parentElement);});
    }});updateVersions.directory=folder;
    content.appendChild(card('Storage',[
     E('div',{'class':'ff-setting-row'},[E('span',{},t('Current core path')),updateVersions.path]),
     E('label',{'class':'ff-setting-field'},[E('span',{},t('Core download folder')),folder]),
     E('p',{'class':'mk-muted'},t('The next core install or update uses this folder. Files under /tmp must be installed again after reboot.'))
    ]));
    updateVersions.space=E('p',{});content.appendChild(updateVersions.space);
    content.appendChild(updateText);
   }else if(tab==='Logs'){
    var runtime=E('pre',{'class':'mk-log'+(i18n.get()==='fa'?' mk-log-fa':''),dir:i18n.get()==='fa'?'rtl':'ltr'}),coreLog=E('pre',{'class':'mk-log'+(i18n.get()==='fa'?' mk-log-fa':''),dir:i18n.get()==='fa'?'rtl':'ltr'});
    function logTitle(entry){var m=entry.message||'';
     var patterns=[[/proxy turned on=true/,'Proxy enabled'],[/proxy turned on=false/,'Proxy disabled'],[/connection test passed/,'Connection test passed'],[/connection test failed/,'Connection test failed'],[/upstream selected/,'Connected to server'],[/service starting/,'Service started'],[/settings saved/,'Settings saved'],[/guardian request failed/,'Mozilla request failed'],[/DNS:/,'DNS settings'],[/dashboard listening/,'Interface started']];
     for(var i=0;i<patterns.length;i++)if(patterns[i][0].test(m))return t(patterns[i][1]);
     return t(entry.level==='ERROR'?'Connection error':entry.level==='WARN'?'Warning':'Service event');
    }
    function fillLog(box,text){var atEnd=box.scrollTop+box.clientHeight>=box.scrollHeight-10;box.textContent=text||t('No log entries.');if(atEnd||!box.dataset.drawn)box.scrollTop=box.scrollHeight;box.dataset.drawn='1';}
    function refreshLogs(){return callLogs().then(checked).then(function(r){
     var runtimeText=[],coreText=[],cutoff=Date.parse(r.cleared_before)||0,coreCutoff=Date.parse(r.core_cleared_before)||0;
     (r.entries||[]).forEach(function(e){var when=new Intl.DateTimeFormat(i18n.get()==='fa'?'fa-IR-u-ca-persian':i18n.get()+'-u-ca-gregory',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(e.time));var message=String(e.message||'').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'••••••@••••••');
      if(Date.parse(e.time)>cutoff)runtimeText.push(when+' · '+(i18n.get()==='fa'?logText.persian(message):message));
      if(Date.parse(e.time)>coreCutoff)coreText.push('['+when+'] ['+(i18n.get()==='fa'?({INFO:'اطلاع',WARN:'هشدار',ERROR:'خطا',DEBUG:'اشکال زدایی'}[e.level]||e.level):e.level)+'] '+(i18n.get()==='fa'?logText.persian(message):message));
     });fillLog(runtime,runtimeText.join('\n'));fillLog(coreLog,coreText.join('\n'));
    });}
    function logCard(title,description,box,component,ico,colour){
     var copy=E('button',{type:'button','class':'mk-icobtn',title:t('Copy'),'aria-label':t('Copy'),click:function(){
      function copied(){copy.replaceChildren(icon('Check'));copy.classList.add('done');window.setTimeout(function(){copy.replaceChildren(icon('Copy'));copy.classList.remove('done');},1500);}
      if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(box.textContent).then(copied).catch(function(e){note(e.message,true,copy);});else{var input=E('textarea',{},box.textContent);content.appendChild(input);input.select();var ok=document.execCommand('copy');input.remove();if(ok)copied();else note(t('Copy failed'),true,copy);}
     }},[icon('Copy')]);
     var remove=button('Delete',function(){return callLogsClear(component).then(checked).then(refreshLogs);});remove.classList.add('danger','mk-small');
     var section=card(title,[E('div',{'class':'mk-row ff-log-toolbar'},[E('span',{'class':'cbi-value-description zgz-card-help'},t(description)),E('div',{'class':'ff-log-actions'},[copy,remove])]),box]);
     section.style.setProperty('--accent',colour);section.querySelector('h3').classList.add('mk-card-title');section.querySelector('h3').prepend(icon(ico));return section;
    }
    content.appendChild(logCard('Runtime Logs','What ffvpn does is shown here, refreshed every 5 seconds.',runtime,'runtime','Logs','#1e88e5'));
    content.appendChild(logCard('Core log','The ffvpn core messages are shown here.',coreLog,'core','Router','#8b5cf6'));
    refreshLogPage=refreshLogs;return refreshLogs();
   }
   return status();
  }
  var lang=select([['fa','فارسی'],['en','English'],['zh','简体中文'],['ru','Русский']],i18n.get(),function(value){i18n.set(value);window.location.reload();});
  lang.className='mk-btn glass mk-language';lang.setAttribute('aria-label',t('Language'));
  var themes=E('div',{'class':'mk-seg','role':'group','aria-label':t('Display mode')},[['auto','Follow router theme','Sun'],['light','Light','Sun'],['dark','Dark','Moon']].map(function(item){
   return E('button',{'type':'button','class':'mk-btn glass','data-theme':item[0],click:function(){theme(item[0]);}},[icon(item[2]),E('span',{},t(item[1]))]);
  }));
  var mode='auto';try{mode=localStorage.getItem('ffvpn-theme')||'auto';}catch(e){}
  root=E('div',{'class':'mk ffvpn','dir':i18n.get()==='fa'?'rtl':'ltr'},[
   E('link',{rel:'stylesheet',href:L.resource('ffvpn/theme.css')}),E('link',{rel:'stylesheet',href:L.resource('ffvpn/app-5820-r1.css')}),
   E('div',{'class':'mk-hero','role':'banner'},[E('div',{'class':'mk-brand'},[E('img',{src:L.resource('ffvpn/logo.png'),alt:'ffvpn','class':'ff-logo'}),E('h2',{},'ffvpn'),E('span',{'class':'mk-version'},state.version||'')]),E('div',{'class':'mk-row mk-hero-controls'},[themes,E('div',{'class':'mk-language-column'},[lang,E('div',{'class':'mk-uptime'},[E('span',{},t('Activity duration')),routerUptime])])])]),
   E('nav',{'class':'ff-tabs'},['Home','Accounts','Servers','Settings','Updates','Logs'].map(function(tab){var b=button(tab,function(){return show(tab);});b.prepend(icon(tab));b.dataset.tab=tab;return b;})),
   content=E('main',{}),
   E('footer',{'class':'mk-footer'},[E('img',{src:L.resource('ffvpn/logo.png'),alt:'ffvpn','class':'ff-footer-logo'}),E('span',{},'ffvpn · Copyright © 2026 dreamboxone · GNU AGPLv3'),
    E('a',{'class':'mk-link',href:'https://t.me/routekernel1',target:'_blank',rel:'noopener noreferrer'},'Telegram · t.me/routekernel1'),
    E('a',{'class':'mk-link',href:'https://github.com/dreamboxone/ffvpn',target:'_blank',rel:'noopener noreferrer'},t('Website')+' · '+t('Source code'))])
  ]);
  root.zgzSyncTheme=themeUI.attach(root);
  window.setTimeout(function(){theme(mode);show('Home').catch(function(e){note(e.message,true);});},0);
  poll.add(function(){if(!root.isConnected)return Promise.resolve();theme(localStorage.getItem('ffvpn-theme')||'auto');return status();},5);
  return root;
 }
});
