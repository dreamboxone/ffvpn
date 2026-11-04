'use strict';
'require view';
'require rpc';
'require ui';
'require poll';
'require ffvpn.i18n as i18n';
'require ffvpn.theme as themeUI';
'require ffvpn.flags as flags';

var callStatus = rpc.declare({object:'luci.ffvpn', method:'status', expect:{}});
var callUsage = rpc.declare({object:'luci.ffvpn', method:'usage', expect:{}});
var callAPI = rpc.declare({object:'luci.ffvpn', method:'api', params:['path'], expect:{}});
var callWrite = rpc.declare({object:'luci.ffvpn', method:'api_write', params:['method','path','body'], expect:{}});
var callPower = rpc.declare({object:'luci.ffvpn', method:'power', params:['enabled','confirmed'], expect:{}});
var callMode = rpc.declare({object:'luci.ffvpn', method:'mode', params:['value'], expect:{}});
var callDirectory = rpc.declare({object:'luci.ffvpn', method:'directory', params:['value'], expect:{}});
var callClock = rpc.declare({object:'luci.ffvpn', method:'clock', expect:{}});
var callUpdate = rpc.declare({object:'luci.ffvpn', method:'update', params:['component','action'], expect:{}});
var callUpdateStatus = rpc.declare({object:'luci.ffvpn', method:'update_status', expect:{}});
var t = function(s) { return i18n.t(s); };
function checked(result) { if (result && result.error) throw new Error(result.error); return result || {}; }
function write(path, body, method) { return callWrite(method || 'POST', path, JSON.stringify(body || {})).then(checked); }
function note(message, error, anchor) {
 if(!anchor)anchor=document.querySelector('.ffvpn main');
 if(!anchor)return;
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
 return E('button', {'class':'mk-btn','type':'button', click:function(event) {
 var el=event.currentTarget; el.disabled=true;el.classList.add('mk-running');
  var oldNote=el.parentElement.querySelector(':scope > .ff-inline-note');if(oldNote)oldNote.remove();
  Promise.resolve().then(function(){return action(el);}).catch(function(e){ note(t('Operation failed') + ': ' + t(e.message),true,el); }).finally(function(){if(!el.ffBusy){el.disabled=false;el.classList.remove('mk-running');}});
 }}, t(label));
}
function card(title, children) { return E('section', {'class':'mk-card ff-card'}, [E('h3',{},t(title))].concat(children)); }
function homeCard(title,ico,accent,children){return E('section',{'class':'mk-card ff-home-card',style:'--accent:'+accent},[E('div',{'class':'mk-card-title'},[E('span',{'class':'mk-metric-ico'},icon(ico)),E('span',{},t(title))])].concat(children));}
function formatGB(value){return (Math.max(0,Number(value)||0)/1000000000).toLocaleString(i18n.get(),{minimumFractionDigits:2,maximumFractionDigits:2});}
function uptime(seconds){var n=Math.max(0,Number(seconds)||0);return Math.floor(n/86400)+' '+t('Days')+' '+String(Math.floor(n/3600)%24).padStart(2,'0')+':'+String(Math.floor(n/60)%60).padStart(2,'0');}
function countryName(code,fallback){
 if(String(code).toUpperCase()==='REC'||/recom+ended/i.test(fallback||''))return t('Recommended location');
 try{if(/^[A-Z]{2}$/.test(String(code).toUpperCase()))return new Intl.DisplayNames([i18n.get()],{type:'region'}).of(String(code).toUpperCase());}catch(e){}
 return fallback||code||'—';
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
 paths.Globe='M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3a18 18 0 0 1 0 18 18 18 0 0 1 0-18';
 paths.Router='M3 10h18v10H3zM7 6V2M17 6V2M7 15h.01M11 15h.01M15 15h2';
 paths.Chart='M3 3v18h18M7 17v-5M12 17V7M17 17v-9';
 paths.Pulse='M2 12h5l3-8 4 16 3-8h5';
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
var warning='Enable ffvpn? The selected engine will use the local ffvpn SOCKS proxy. Router traffic will bypass that engine to prevent loops. The other routing engine will be disabled. These settings will be restored when ffvpn is disabled; later manual edits will be preserved.';

return view.extend({
 handleSave:null, handleSaveApply:null, handleReset:null,
 load:function(){return callStatus();},
 render:function(initial){
  var self=this, state=initial, root, content, current='Home', signup=null;
  try{signup=sessionStorage.getItem('ffvpn-signin');}catch(e){}
  function keepSignin(id){signup=id;try{if(id)sessionStorage.setItem('ffvpn-signin',id);else sessionStorage.removeItem('ffvpn-signin');}catch(e){}}
  var power=E('input',{type:'checkbox',checked:!!state.enabled,'aria-label':t('Master switch')});
  var phase=E('strong',{},t('Starting'));
  var details=E('pre',{'class':'ff-details'});
  var engines=E('div',{'class':'ff-grid'});
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
   return Promise.all([callStatus(),callAPI('/status').catch(function(){return {};})]).then(function(values){
    if(!root.isConnected)return;
    state=values[0]; var core=values[1], s=core.state||{};
    power.checked=state.busy?!!state.desired:!!state.enabled;power.disabled=!!state.busy;
    var text={running:'Running',off:'Off',starting:'Starting',error:'Error',waiting:'Connecting'}[s.phase]||'Starting';
    if(s.code==='no_accounts'||s.code==='no_usable_account')text='Waiting for an account';
    if(s.code==='waiting_for_network')text='Waiting for network';
    if(state.busy)text='Connecting';
    phase.textContent=t(text);
    details.textContent=s.message||'';
    if(state.control_error)details.textContent+='\n'+state.control_error;
    if(core.proxy)details.textContent+='\n'+(core.proxy.country_name||'')+' '+(core.proxy.upstream||'');
    if(current==='Home'&&homeFields.model){
     var router=state.router||{},proxy=core.proxy||{},exit=core.exit||{},test=core.last_test||{};
     homeFields.model.textContent=router.model||'—';homeFields.firmware.textContent=router.version?'OpenWrt '+router.version:'—';homeFields.arch.textContent=router.architecture||'—';homeFields.uptime.textContent=uptime(router.uptime);
     homeFields.memory.textContent=router.memory_total?Math.round((1-Number(router.memory_free)/Number(router.memory_total))*100)+'%':'—';homeFields.load.textContent=router.load?(Number(router.load)/65536).toFixed(2):'—';
     homeFields.country.textContent=countryName(proxy.country_code||core.selection,proxy.country_name||core.selection_name||t('Recommended location'));homeFields.server.textContent=proxy.upstream||'—';homeFields.protocol.textContent=proxy.transport?proxy.transport.toUpperCase().replace('H','HTTP/'):'—';
     homeFields.connection.textContent=!state.enabled?t('Off'):test.ok?t('Connected'):t('Not tested');homeFields.latency.textContent=test.total_ms?test.total_ms+' ms':'—';homeFields.ip.textContent=exit.ipv4||test.exit_ipv4||'—';
     homeFields.orb.replaceChildren(flag(exit.country_code||proxy.country_code,homeFields.country.textContent));
     if(homeFields.rate)homeFields.rate.textContent='↓ '+formatGB((core.traffic||{}).down_rate)+' '+t('GB')+'/s · ↑ '+formatGB((core.traffic||{}).up_rate)+' '+t('GB')+'/s';
     callUsage().then(function(data){usageData=data;renderUsage();}).catch(function(){});
    }
    engines.replaceChildren.apply(engines,['zirgozar','passwall2'].map(function(name){
     var p=state[name]||{};
     return E('div',{'class':'ff-engine-state'},[E('strong',{},name==='zirgozar'?'Zirgozar':'PassWall2'),E('span',{},t(p.installed?'Installed':'Not installed')+' · '+t(p.enabled?'Enabled':'Disabled')+' · '+t(p.running?'Running':'Stopped'))]);
    }));
    if(current==='Updates'&&updateText)return callUpdateStatus().then(function(r){
     updateText.textContent=r.message||t('No update has been run yet.');
     ['app','core'].forEach(function(c){if(updateVersions[c]){
      var installed=r[c+'_version']||'—',latest=r[c+'_latest'];
      updateVersions[c].replaceChildren(E('bdi',{'class':'mk-chip ok ff-version-chip',dir:'ltr'},'【 '+installed+' 】'),latest?(latest===installed?E('span',{'class':'mk-muted'},t('Up to date')):E('bdi',{'class':'mk-chip info ff-version-chip',dir:'ltr'},(i18n.get()==='fa'?'← ':'→ ')+latest)):E('span',{'class':'mk-muted'},t('Not checked')));
     }});
     var busy=!!r.busy||(updatePending&&Date.now()-updatePending.time<1500);
     if(!busy)updatePending=null;
     root.querySelectorAll('[data-update]').forEach(function(b){
      var active=busy&&((r.component||updatePending&&updatePending.component)===b.dataset.update)&&((r.action||updatePending&&updatePending.action)===b.dataset.action);
      b.ffBusy=busy;b.disabled=busy;b.classList.toggle('mk-running',!!active);
      if(r.component===b.dataset.update&&r.action===b.dataset.action&&r.message){var failed=!busy&&r.result&&r.result!=='0';note(busy?t(r.action==='check'?'Checking version':'Updating files'):failed?t('The operation failed. Check the router connection and try again.'):t(r.action==='check'?'Version check complete':'Update complete'),!!failed,b);}
     });
     if(updateVersions.space){var gb=Number(r.free_kb)*1024/1000000000;updateVersions.space.textContent=t('Free space')+': '+(Number.isFinite(gb)?gb.toLocaleString(i18n.get(),{maximumFractionDigits:2}):'—')+' '+t('GB');}
     if(updateVersions.path)updateVersions.path.textContent=r.core_path||'/usr/bin/ffvpn-core';
     if(updateVersions.directory&&document.activeElement!==updateVersions.directory)updateVersions.directory.value=r.core_dir||'/usr/bin';
    });
   });
  }
  power.addEventListener('change',function(){
   var enabled=power.checked;
   if(enabled&&!window.confirm(t(warning)+'\n\n'+t('LAN proxying and DNS-over-HTTPS will be enabled. If Zirgozar is the other routing engine, its kill switch will be disabled temporarily.'))){power.checked=false;return;}
   power.disabled=true;
   callPower(enabled,true).then(checked).then(function(){power.checked=enabled;}).catch(function(e){power.checked=!!state.enabled;power.disabled=false;note(e.message,true,power.closest('.ff-power'));});
  });
  function renderAccounts(){
   return callAPI('/accounts').then(checked).then(function(r){
    var list=E('div',{'class':'ff-list'});
    (r.accounts||[]).forEach(function(a,index){
     var id=encodeURIComponent(a.id);
     function move(delta){var ids=r.accounts.map(function(item){return item.id;}),to=index+delta;if(to<0||to>=ids.length)return;var swap=ids[to];ids[to]=ids[index];ids[index]=swap;return write('/accounts/order',{ids:ids}).then(showAccounts);}
     list.appendChild(card(a.email||a.name,[E('p',{},(a.status||'')+(a.used_percent!=null?' · '+a.used_percent.toFixed(1)+'%':'')),E('div',{'class':'ff-actions'},[
      button('Use now',function(){return write('/accounts/'+id+'/activate').then(showAccounts);}),
      button(a.enabled?'Disabled':'Enabled',function(){return write('/accounts/'+id+'/enabled',{enabled:!a.enabled}).then(showAccounts);}),
      button('Refresh',function(){return write('/accounts/'+id+'/refresh').then(showAccounts);}),
      button('Move up',function(){return move(-1);}),button('Move down',function(){return move(1);}),
      button('Remove',function(){if(window.confirm(t('Remove this account?')))return write('/accounts/'+id,{},'DELETE').then(showAccounts);})
     ])]));
    });
    if(!(r.accounts||[]).length)list.appendChild(E('p',{},t('No accounts yet.')));
    return list;
   });
  }
  var accountBox;
  function showAccounts(){return renderAccounts().then(function(list){accountBox.replaceChildren(list);});}
  function signinForm(){
   var email=E('input',{type:'email',placeholder:t('Email'),autocomplete:'username'});
   var password=E('input',{type:'password',placeholder:t('Password'),autocomplete:'current-password'});
   var answer=E('input',{type:'text',placeholder:t('Verification code or answer'),autocomplete:'one-time-code'});
   var result=E('div',{'class':'ff-signin-state'});
   function watch(){
    if(!signup)return Promise.resolve();
    return callAPI('/signin/'+encodeURIComponent(signup)).then(function(s){
     if(!s.step){keepSignin(null);checked(s);return;}
     var steps={working:'Signing in',need_email_code:'Enter the code sent by Mozilla.',need_unblock_code:'Enter the code sent by Mozilla.',need_totp:'Enter your authenticator code.',need_email_link:'Open the confirmation email, then continue.',done:'Sign-in complete',failed:'Sign-in failed',cancelled:'Sign-in cancelled'};
     var errors={wrong_password:'Incorrect Mozilla account password.',no_password:'This account needs a Mozilla password; set it on the official account website.',no_account:'No Mozilla account exists with this email.',too_many_attempts:'Too many attempts. Wait before trying again.',wrong_code:'Wrong or expired verification code.',wrong_totp:'Wrong or expired verification code.',unblock_code_rejected:'Wrong or expired verification code.',too_many_codes:'Wrong or expired verification code.',timed_out:'Sign-in timed out. Please start again.',network:'Cannot reach Mozilla. Check the connection settings.'};
     result.textContent=t(steps[s.step]||s.message||s.step);
     if(s.error)result.textContent+=' · '+(errors[s.error_code]?t(errors[s.error_code]):s.error);
     if(s.step==='done'){keepSignin(null);return showAccounts();}
     if(['failed','cancelled'].indexOf(s.step)>=0){keepSignin(null);return;}
     if(s.step==='working')window.setTimeout(function(){if(result.isConnected)watch().catch(function(e){note(e.message,true);});},1500);
    });
   }
   var signInButton=button('Sign in',function(){
    return write('/signin',{email:email.value,password:password.value}).then(function(s){password.value='';keepSignin(s.id);result.textContent=t('Signing in');return watch();});
   });signInButton.classList.add('primary');
   var continueButton=button('Continue',function(){
    if(!signup)return;
    return write('/signin/'+encodeURIComponent(signup),{value:answer.value}).then(function(){answer.value='';return watch();});
   });continueButton.classList.add('primary');
   if(signup)window.setTimeout(function(){watch().catch(function(e){note(e.message,true);});},0);
   return card('Sign in',[
    E('a',{'class':'mk-link',href:'https://accounts.firefox.com/',target:'_blank',rel:'noopener noreferrer'},t('Create a Mozilla account')),
    E('div',{'class':'ff-form-row'},[E('label',{},[E('span',{},t('Email')),email]),E('label',{},[E('span',{},t('Password')),password]),signInButton]),result,
    E('div',{'class':'ff-form-row'},[E('label',{},[E('span',{},t('Verification code or answer')),answer]),E('div',{'class':'ff-actions'},[continueButton,button('Cancel',function(){if(signup)return write('/signin/'+encodeURIComponent(signup),{},'DELETE').then(function(){keepSignin(null);result.textContent='';});})])])
   ]);
  }
  function show(tab){
   current=tab;content.replaceChildren();updateText=null;
   root.querySelectorAll('[data-tab]').forEach(function(el){el.classList.toggle('ff-active',el.dataset.tab===tab);});
   if(tab==='Home'){
    homeFields={};
    var statusCard=homeCard('Status','Pulse','#10b981',[phase,line('Country','country'),line('Server','server'),line('Protocol','protocol')]);statusCard.classList.add('zgz-connection-card');
    homeFields.orb=E('div',{'class':'zgz-country-orb'},[icon('Globe')]);
    statusCard.appendChild(E('div',{'class':'zgz-connection-art','aria-hidden':'true'},[E('div',{'class':'zgz-orbit zgz-orbit-one'}),E('div',{'class':'zgz-orbit zgz-orbit-two'}),homeFields.orb]));
    var routerCard=homeCard('Router information','Router','#3b82f6',[line('Model','model'),line('Firmware','firmware'),line('Architecture','arch'),line('Uptime','uptime'),line('Memory','memory'),line('CPU load','load')]);
    var testButton=button('Test connection',function(anchor){return write('/test').then(function(r){note(r.ok?t('Connected'):t(r.error||'Operation failed'),!r.ok,anchor);return status();});});testButton.prepend(icon('Globe'));testButton.classList.add('soft-blue','mk-small');
    var connectionCard=homeCard('Connection status','Globe','#3b82f6',[line('Status','connection'),line('Public IP','ip'),line('Latency','latency'),testButton]);
    homeFields.usage={};var values=E('div',{'class':'pwp-usage-values'},['up','down','total'].map(function(key){var node=E('strong',{dir:'ltr'},'—');homeFields.usage[key]=node;return E('div',{'class':'pwp-usage-value'},[E('span',{},t({up:'Upload',down:'Download',total:'Total'}[key])),node]);}));
    var periods=E('div',{'class':'pwp-usage-periods',role:'tablist'},[['today','Today'],['week','Week'],['month','Month']].map(function(item){return E('button',{'type':'button',role:'tab','data-period':item[0],'aria-selected':String(usagePeriod===item[0]),click:function(){usagePeriod=item[0];renderUsage();}},t(item[1]));}));
    homeFields.rate=E('div',{'class':'mk-muted ff-rate'});
    var usageCard=homeCard('Traffic usage','Chart','#3b82f6',[E('div',{'class':'pwp-usage-body'},[values,periods]),E('small',{},t('GB')),homeFields.rate]);usageCard.classList.add('pwp-usage-card');
    content.appendChild(E('div',{'class':'mk-grid mk-metrics pwp-status-row ff-status-row'},[statusCard,routerCard,connectionCard,usageCard]));
    content.appendChild(card('Basic settings',[engines,E('p',{},t('Whole-network routing requires PassWall2 or Zirgozar.')),E('p',{},t('TCP is limited to ports 80, 443, 8080 and 8443. UDP availability depends on the destination port.'))]));
   }else if(tab==='Accounts'){
    content.appendChild(E('p',{},t('Multiple Mozilla accounts are supported. Accounts are tried in priority order when quota runs low.')));
    accountBox=E('div');content.appendChild(accountBox);content.appendChild(signinForm());
    return showAccounts();
   }else if(tab==='Servers'){
    var locations=E('div',{'class':'ff-grid'});content.appendChild(E('div',{'class':'ff-actions'},[
     button('Recommended',function(){return write('/location',{country:'REC'}).then(status);}),
     button('Fastest',function(){return write('/location',{country:'fastest'}).then(status);}),
     button('Measure latency',function(){return write('/locations/ping').then(function(){return show('Servers');});})
    ]));content.appendChild(locations);
    return callAPI('/locations').then(checked).then(function(r){(r.locations||[]).forEach(function(l){var c=card(countryName(l.code,l.name),[E('p',{},cityName(l.city,l.code)),E('p',{},l.ping_ms?l.ping_ms+' ms':l.ping_error||''),button('Select',function(){return write('/location',{country:l.code}).then(status);})]);c.querySelector('h3').prepend(flag(l.code,countryName(l.code,l.name)));locations.appendChild(c);});});
   }else if(tab==='Updates'){
    updateText=E('pre',{'class':'ff-details',style:'display:none'});
    function updateButton(label,component,action){var b=button(label,function(){
     if(action!=='check'&&!window.confirm(t('Start the update? The connection may briefly stop.')))return;
     updatePending={component:component,action:action,time:Date.now()};
     root.querySelectorAll('[data-update]').forEach(function(el){el.disabled=true;el.ffBusy=true;});
     return callUpdate(component,action).then(checked).then(status).catch(function(e){updatePending=null;root.querySelectorAll('[data-update]').forEach(function(el){el.disabled=false;el.ffBusy=false;el.classList.remove('mk-running');});throw e;});
    });b.dataset.update=component;b.dataset.action=action;b.classList.add('mk-small',action==='check'?'soft-blue':action==='update'?'success':'primary');b.prepend(icon(action==='check'?'Updates':'Download'));return b;}
    content.appendChild(E('p',{},t('Only changed files and binary blocks are downloaded. Downloads are verified before installation.')));
    ['app','core'].forEach(function(component){
     updateVersions[component]=E('p',{});
     content.appendChild(card(component==='app'?'ffvpn':'Core',[E('div',{'class':'ff-update-row'},[
      updateVersions[component],E('div',{'class':'ff-actions'},[updateButton('Check for updates',component,'check'),updateButton('Update now',component,'update'),updateButton('Reinstall',component,'reinstall')])
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
    var logs=E('pre',{'class':'ff-details ff-log'});content.appendChild(card('Logs',[button('Refresh',function(){return callAPI('/logs').then(checked).then(function(r){logs.textContent=JSON.stringify(r,null,2);});}),logs]));
    return callAPI('/logs').then(checked).then(function(r){logs.textContent=JSON.stringify(r,null,2);});
   }else{
    var connection=E('div');
    content.appendChild(card('Settings',[E('div',{'class':'ff-setting-row'},[E('label',{},t('Routing engine')),select([['auto','Automatic'],['zirgozar','Zirgozar'],['passwall2','PassWall2']],state.integration,function(value){
     if(state.enabled){note(t('Turn ffvpn off before changing the routing engine.'),true);return show('Settings');}
     callMode(value).then(checked).then(status).catch(function(e){note(e.message,true);});
    })]),E('div',{'class':'ff-setting-row'},[button('Set router clock',function(anchor){if(window.confirm(t('Set Tehran timezone and add Iranian time servers, as in Zirgozar?')))return callClock().then(checked).then(function(){note(t('Router clock configured'),false,anchor);});})])]));
    content.appendChild(connection);
    return callAPI('/settings').then(checked).then(function(r){
     function change(section,key,value){
      return callAPI('/settings').then(checked).then(function(latest){
       var cfg=latest.config;cfg[section][key]=value;
       cfg.dashboard.listen='127.0.0.1:10820';cfg.proxy.listen='127.0.0.1:10810';
       cfg.system_proxy.mode='clear';cfg.routing.enabled=false;
       return write('/settings',{config:cfg},'PUT');
      }).then(function(){note(t('Saved'));}).catch(function(e){note(e.message,true);});
     }
     var relay=E('input',{type:'url',value:r.config.network.api_relay||'',placeholder:'https://',change:function(){change('network','api_relay',relay.value);}});
     connection.appendChild(card('Settings',[E('div',{'class':'ff-connection-grid'},[
      E('label',{'class':'ff-setting-field'},[E('span',{},t('Connection protocol')),select([['h2','HTTP/2'],['h3','HTTP/3']],r.config.proxy.transport,function(v){change('proxy','transport',v);})]),
      E('label',{'class':'ff-setting-field'},[E('span',{},t('TLS fragmentation')),select([['off','Off'],['sni','SNI'],['first-byte','First byte'],['record','TLS record']],r.config.network.hello_split||'off',function(v){change('network','hello_split',v);})]),
      E('label',{'class':'ff-setting-field'},[E('span',{},t('Relay server')),relay])
     ])]));
    });
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
   E('link',{rel:'stylesheet',href:L.resource('ffvpn/theme.css')}),E('link',{rel:'stylesheet',href:L.resource('ffvpn/app.css')}),
   E('div',{'class':'mk-hero','role':'banner'},[E('div',{'class':'mk-brand'},[E('img',{src:L.resource('ffvpn/logo.png'),alt:'ffvpn','class':'ff-logo'}),E('h2',{},'ffvpn'),E('span',{'class':'mk-version'},state.version||'')]),E('div',{'class':'mk-row mk-hero-controls'},[themes,E('div',{'class':'mk-language-column'},[lang])])]),
   E('nav',{'class':'ff-tabs'},['Home','Accounts','Servers','Settings','Updates','Logs'].map(function(tab){var b=button(tab,function(){return show(tab);});b.prepend(icon(tab));b.dataset.tab=tab;return b;})),
   E('div',{'class':'ff-power mk-card'},[E('label',{'class':'ff-switch'},[power,E('span',{'class':'ff-slider'})]),E('strong',{},t('Master switch'))]),
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
