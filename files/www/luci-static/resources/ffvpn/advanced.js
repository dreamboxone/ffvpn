'use strict';
'require baseclass';
'require ffvpn.i18n-105 as i18n';

var t=i18n.t;

function field(label,input){
 return E('label',{'class':'ff-setting-field'},[E('span',{},t(label)),input]);
}
function text(value,type){
 return E('input',{type:type||'text',value:value==null?'':value,autocomplete:'off',dir:'ltr'});
}
function toggle(enabled){
 var input=E('input',{type:'checkbox'});input.checked=!!enabled;return input;
}
function list(values){
 return E('textarea',{rows:5,dir:'ltr'},(values||[]).join('\n'));
}
function lines(input){
 return input.value.split('\n').map(function(line){return line.trim();}).filter(Boolean);
}

return baseclass.extend({
 render:function(panel,cfg,ui){
  function save(label,edit){
   return ui.button(label,function(anchor){
    return ui.save(edit).then(function(){ui.note(t('Saved'),false,anchor);});
   });
  }
  function grid(fields){return E('div',{'class':'ff-connection-grid'},fields);}
  function actions(children){return E('div',{'class':'ff-actions'},children);}

  var enabled=toggle(cfg.network.upstream_proxy_enabled);
  var proxy=text(cfg.network.upstream_proxy), user=text(cfg.network.upstream_proxy_username), password=text(cfg.network.upstream_proxy_password,'password');
  var ech=ui.select([['on','Automatic'],['require','Require ECH'],['off','Off']],cfg.network.api_relay_ech||'on',function(){});
  var echSource=text(cfg.network.api_relay_ech_config);
  panel.appendChild(ui.card('Upstream SOCKS5 and relay',[
   E('p',{},t('Upstream SOCKS5 carries the core connection to Mozilla. HTTP/3 uses HTTP/2 while this proxy is active.')),
   grid([field('Enable upstream SOCKS5',enabled),field('SOCKS5 address (host:port)',proxy),field('SOCKS5 username',user),
    field('SOCKS5 password',password),field('Relay ECH',ech),field('Relay ECH hostname or key',echSource)]),
   actions([save('Save connection settings',function(latest){
    var network=latest.network;
    network.upstream_proxy_enabled=enabled.checked;
    network.upstream_proxy=proxy.value.trim();
    network.upstream_proxy_username=user.value;
    network.upstream_proxy_password=password.value;
    network.api_relay_ech=ech.value;
    network.api_relay_ech_config=echSource.value.trim();
   })])
  ]));

  var servers=list(cfg.dns.servers), fallback=toggle(cfg.dns.fallback_to_system), dnsResult=E('pre',{'class':'ff-details',hidden:true,dir:'ltr'});
  panel.appendChild(ui.card('Core DNS',[
   E('p',{},t('Enter one DNS server per line. Use https:// for DoH, tls:// for DoT, or an IP address for plain DNS. An empty list uses the router resolver.')),
   grid([field('DNS servers',servers),field('Fall back to router DNS',fallback)]),
   actions([save('Save DNS settings',function(latest){
    latest.dns.servers=lines(servers);
    latest.dns.fallback_to_system=fallback.checked;
   }),ui.button('Test DNS',function(){
    return ui.write('/dns/test',{servers:lines(servers)}).then(function(r){
     if(!Array.isArray(r.results))throw new Error(t('Could not test DNS.'));
     dnsResult.hidden=false;
     dnsResult.textContent=(r.results||[]).map(function(item){
      var core=item.error||(item.addrs||[]).join(', ');
      var system=item.system_error||(item.system_addrs||[]).join(', ');
      return [item.host,t('Core DNS')+' · '+core+' · '+item.ms+' ms',
       t('Router DNS')+' · '+system+' · '+item.system_ms+' ms',
       item.filtered?t('Possible DNS filtering detected'):''].filter(Boolean).join('\n');
     }).join('\n\n');
    });
   })]),dnsResult
  ]));

  var routing=cfg.routing, routeEnabled=toggle(routing.enabled), resolve=toggle(routing.resolve_domains);
  var direct=list(routing.direct), block=list(routing.block);
  var region=ui.select([['','Private networks'],['ir','Iran'],['cn','China'],['ru','Russia'],
   ['af','Afghanistan'],['tr','Turkey'],['id','Indonesia'],['br','Brazil']],routing.region,function(){});
  var geoSite=text(routing.geosite_url,'url'), geoIP=text(routing.geoip_url,'url'), interval=text(routing.update_interval);
  var routeTarget=text(''), routeResult=E('pre',{'class':'ff-details',hidden:true,dir:'ltr'}), routeState=E('p',{role:'status'});
  var routeCard=ui.card('Split routing',[
   E('p',{},t('Rules apply to traffic that reaches FFVPN. A block rule takes priority over a direct rule. Enter one domain, IP address, CIDR, geosite or geoip rule per line.')),
   grid([field('Enable split routing',routeEnabled),field('Direct routing region',region),field('Resolve domains for IP rules',resolve),
    field('Direct rules',direct),field('Block rules',block),field('GeoSite list URL',geoSite),field('GeoIP list URL',geoIP),field('List refresh interval',interval)]),
   actions([ui.button('Save routing settings',function(anchor){
    return ui.save(function(latest){
     Object.assign(latest.routing,{enabled:routeEnabled.checked,region:region.value,resolve_domains:resolve.checked,
      direct:lines(direct),block:lines(block),geosite_url:geoSite.value.trim(),geoip_url:geoIP.value.trim(),update_interval:interval.value.trim()});
    }).then(function(){
     ui.note(t('Saved'),false,anchor);
     return refreshRouting(true);
    });
   }),ui.button('Refresh routing lists',function(){
    return ui.write('/routing/update/start').then(function(r){
     if(!r.updating)throw new Error(t('Could not start the list refresh.'));
     return refreshRouting(false);
    });
   })]),routeState,
   actions([field('Destination to test',routeTarget),ui.button('Test route',function(){
    return ui.write('/routing/test',{target:routeTarget.value.trim()}).then(function(r){
     if(!r.route)throw new Error(t('Could not test the route.'));
     routeResult.hidden=false;
     var routeLabels={direct:'Direct route',proxy:'Mozilla tunnel',block:'Blocked route'};
     routeResult.textContent=[t(routeLabels[r.route]||r.route),r.rule,r.resolved,r.note,
      r.port_refused?t('Mozilla does not carry this port.'):''].filter(Boolean).join('\n');
    });
   })]),routeResult
  ]);
  var refreshTimer;
  function refreshRouting(syncRules){
   window.clearTimeout(refreshTimer);
   return ui.read('/routing').then(function(r){
    if(!routeCard.isConnected)return;
    if(!r||typeof r.enabled!=='boolean')throw new Error(r&&r.error||t('Could not read the routing status.'));
    if(syncRules)direct.value=(r.direct||[]).join('\n');
    routeState.textContent=r.updating?t('Downloading routing lists'):r.last_error||r.error||r.summary||'';
    if(r.updating)refreshTimer=window.setTimeout(function(){
     if(routeCard.isConnected)refreshRouting(false).catch(function(e){ui.note(e.message,true,routeState);});
    },2000);
   });
  }
  panel.appendChild(routeCard);
  refreshRouting(false).catch(function(e){ui.note(e.message,true,routeState);});

  var quota=text(cfg.accounts.switch_threshold_percent,'number'), idle=text(cfg.proxy.idle_sleep);
  var upstream=text(cfg.proxy.upstream_connections,'number'), max=text(cfg.proxy.max_connections,'number'), verbose=toggle(cfg.logging.verbose);
  panel.appendChild(ui.card('Connection limits and logs',[
   grid([field('Account switch threshold (%)',quota),field('Idle sleep duration',idle),field('Connections to Mozilla',upstream),
    field('Maximum client connections',max),field('Log connection destinations',verbose)]),
   actions([save('Save connection limits',function(latest){
    latest.accounts.switch_threshold_percent=Number(quota.value);
    latest.proxy.idle_sleep=idle.value.trim();
    latest.proxy.upstream_connections=Number(upstream.value);
    latest.proxy.max_connections=Number(max.value);
    latest.logging.verbose=verbose.checked;
   })])
  ]));
 }
});
