
(function(){
'use strict';

var MENU='./assets/nerdopoles-menu.jpg';
var CREATE_ROOM='./assets/nerdopoles-create-room.png';
var LOBBY='./assets/nerdopoles-lobby.png';
var BOARD='./assets/nerdopoles-board-01.png';
var PIECES=['Nyan','Chapéu Mágico','Baú Nerdora','Espada Arcana','Escudo Nerdora','Dirigível'];
var PIECE_SRC=[0,1,2,3,4,5].map(function(i){return './assets/tokens/token-'+i+'.png'});
var SLOT_COLORS=['#ff3f5d','#3f8cff','#5adb67','#e8a93f','#b64cff','#ff8d3f'];
var MAPS=[
  {name:'Cidade de Nerdora',status:'disponível'},
  {name:'Reino Sombrio',status:'visual em preparação'},
  {name:'Ilha Celestial',status:'visual em preparação'},
  {name:'Deserto Arcano',status:'visual em preparação'},
  {name:'Floresta Élfica',status:'visual em preparação'},
  {name:'Mundo Futuro',status:'visual em preparação'}
];
var DURATIONS=[
  {label:'Rápida',desc:'Partida curta, com encerramento antecipado por patrimônio.'},
  {label:'Clássica',desc:'Segue até restar apenas um jogador solvente.'},
  {label:'Longa',desc:'Mais rodadas para negociar, construir e dominar o mapa.'}
];
var MONEY=[
  {label:'1.000',value:1000,desc:'Início apertado; cada compra exige mais cautela.'},
  {label:'1.500',value:1500,desc:'Saldo clássico e equilibrado.'},
  {label:'2.000',value:2000,desc:'Mais liberdade para investir no começo.'}
];
var BUILDS=[
  {label:'Rápida',desc:'Construção facilitada e evolução acelerada.'},
  {label:'Padrão',desc:'Casas e hotéis seguem as regras normais.'},
  {label:'Estratégica',desc:'Construções custam mais e exigem planejamento.'}
];

var setup={maxPlayers:4,map:0,piece:0,duration:1,money:1,build:1,trades:false,auctions:false,events:false,private:false,password:''};
var layer=null,setupUI=null,lobbyUI=null,browserUI=null,toastEl=null,joinModal=null;
var peer=null,hostConn=null,connections={},room=null,isHost=false,selfId=null,gameListeners=[];
var directoryPeer=null,directorySlot=null,browserPeer=null,browserRooms=[],scanToken=0,roomPassword='',pendingJoin=null;
var DIRECTORY_SLOTS=24;
var art,frame,stage,baseConfig,play;
var toastTimer=null;

function $(id){return document.getElementById(id)}
function clone(v){return JSON.parse(JSON.stringify(v))}
function normalizeCode(v){return String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6)}
function randomCode(){
  var chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',s='';
  for(var i=0;i<6;i++)s+=chars[Math.floor(Math.random()*chars.length)];
  return s;
}
function playerName(){
  return localStorage.getItem('nerdopoles-player-name')||'Jogador';
}
function savePlayerName(n){
  n=String(n||'').trim().slice(0,18);
  if(n)localStorage.setItem('nerdopoles-player-name',n);
  return n||'Jogador';
}
function friendNames(){
  var out=[];
  try{
    var raw=JSON.parse(localStorage.getItem('nerdopoles-friends')||'[]');
    if(Array.isArray(raw))raw.forEach(function(x){out.push(String(typeof x==='string'?x:(x.name||x.username||x.displayName||'')).trim().toLowerCase())});
  }catch(_){}
  try{
    if(window.NerdoraSocial&&Array.isArray(window.NerdoraSocial.friends)){
      window.NerdoraSocial.friends.forEach(function(x){out.push(String(typeof x==='string'?x:(x.name||x.username||x.displayName||'')).trim().toLowerCase())});
    }
  }catch(_){}
  return out.filter(Boolean);
}
function isFriendRoom(r){
  var friends=friendNames(),host=String(r&&r.hostName||'').trim().toLowerCase();
  return !!host&&friends.indexOf(host)>=0;
}
function beaconId(n){return 'nerdopoles-list-'+String(n).padStart(2,'0')}
function setPrivateMode(){
  if(!setup.private){
    var pwd=prompt('Defina uma senha para a sala privada (4 a 12 caracteres):',setup.password||'');
    if(pwd===null)return;
    pwd=String(pwd).trim().slice(0,12);
    if(pwd.length<4){toast('A senha precisa ter pelo menos 4 caracteres.');return}
    setup.private=true;setup.password=pwd;
  }else{
    setup.private=false;setup.password='';
  }
  renderSetup();
}
function changePrivatePassword(){
  if(!setup.private){setPrivateMode();return}
  var pwd=prompt('Nova senha da sala privada:',setup.password||'');
  if(pwd===null)return;
  pwd=String(pwd).trim().slice(0,12);
  if(pwd.length<4){toast('A senha precisa ter pelo menos 4 caracteres.');return}
  setup.password=pwd;renderSetup();
}
function setArt(src){
  if(art)art.src=src;
  if(frame&&stage){
    var w=stage.clientWidth,h=stage.clientHeight,r=16/9,fw=w,fh=fw/r;
    if(fh>h){fh=h;fw=fh*r}
    frame.style.width=fw+'px';frame.style.height=fh+'px';
  }
}
function hideBase(){
  if(play)play.hidden=true;
  if(baseConfig)baseConfig.classList.remove('on');
  if(window.NerdBoardV2&&window.NerdBoardV2.hide)window.NerdBoardV2.hide();
  if(window.NerdOnlineBoard&&window.NerdOnlineBoard.hide)window.NerdOnlineBoard.hide();
}
function showMenuControls(){
  if(!layer)return;
  layer.classList.add('on');
  $('roomMenuControls').style.display='block';
  setupUI.classList.remove('on');lobbyUI.classList.remove('on');if(browserUI)browserUI.classList.remove('on');
}
function hideMenuControls(){if($('roomMenuControls'))$('roomMenuControls').style.display='none'}
function showMenu(push){
  closeJoinModal();
  hideRoomScreen();
  setArt(MENU);
  if(play)play.hidden=false;
  showMenuControls();
  if(push)history.pushState({screen:'menu'},'',location.pathname);
}
function showSetup(push){
  stopBrowserScan();
  hideBase();setArt(CREATE_ROOM);
  layer.classList.add('on');hideMenuControls();
  setupUI.classList.add('on');lobbyUI.classList.remove('on');if(browserUI)browserUI.classList.remove('on');
  renderSetup();
  if(push)history.pushState({screen:'room-setup'},'','#criar-sala');
}
function showBrowser(push,skipScan){
  hideBase();setArt(MENU);
  layer.classList.add('on');hideMenuControls();
  setupUI.classList.remove('on');lobbyUI.classList.remove('on');browserUI.classList.add('on');
  $('browserName').value=playerName()==='Jogador'?'':playerName();
  $('browserStatus').textContent='Salas que ainda não iniciaram a partida';
  if(push)history.pushState({screen:'multiplayer-browser'},'','#multiplayer');
  if(!skipScan)scanRooms();
}
function showLobby(push){
  stopBrowserScan();
  hideBase();setArt(LOBBY);
  layer.classList.add('on');hideMenuControls();
  setupUI.classList.remove('on');lobbyUI.classList.add('on');if(browserUI)browserUI.classList.remove('on');
  renderLobby();
  if(push)history.pushState({screen:'room-lobby'},'','#sala-lobby');
}
function showOnlineBoard(push){
  hideBase();setArt(BOARD);
  layer.classList.remove('on');
  if(push)history.pushState({screen:'online-board'},'','#tabuleiro-online');
}
function hideRoomScreen(){
  if(layer){setupUI.classList.remove('on');lobbyUI.classList.remove('on');if(browserUI)browserUI.classList.remove('on')}
}
function toast(msg){
  if(!toastEl)return;toastEl.textContent=msg;toastEl.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(function(){toastEl.classList.remove('show')},1500);
}
function cycle(key,list,delta){
  setup[key]=(setup[key]+delta+list.length)%list.length;renderSetup();
}
function toggle(key){setup[key]=!setup[key];renderSetup()}

function mount(){
  if(layer)return;
  art=$('art');frame=$('frame');stage=$('stage');baseConfig=$('config');play=$('play');
  if(!frame)return;

  layer=document.createElement('div');layer.id='roomLayer';layer.className='on';
  layer.innerHTML=
  '<div id="roomMenuControls">'+
    '<button id="roomJoinHot" class="room-hot" aria-label="Multiplayer"></button>'+
    '<button id="roomQuickHot" class="room-hot" aria-label="Partida rápida"></button>'+
    '<button id="roomCreateHot" class="room-hot" aria-label="Criar sala"></button>'+
  '</div>'+
  '<section id="roomBrowserUI">'+
    '<button id="browserBack" class="browser-back">← VOLTAR</button>'+
    '<div class="browser-shell">'+
      '<div class="browser-head"><div><h2>MULTIPLAYER</h2><p>Entre por código ou escolha uma sala aguardando jogadores.</p></div><button id="browserRefresh" class="browser-small-btn">↻ Atualizar</button></div>'+
      '<div class="browser-code-card">'+
        '<input id="browserName" class="browser-input" maxlength="18" placeholder="SEU NOME">'+
        '<input id="browserCode" class="browser-input code" maxlength="6" placeholder="CÓDIGO">'+
        '<input id="browserPassword" class="browser-input" maxlength="12" placeholder="SENHA (SE PRIVADA)">'+
        '<button id="browserJoinCode" class="browser-primary">ENTRAR PELO CÓDIGO</button>'+
      '</div>'+
      '<div class="browser-tools"><span id="browserStatus">Procurando salas...</span><button id="browserQuick" class="browser-quick">⚡ PARTIDA RÁPIDA</button></div>'+
      '<div id="browserRooms" class="browser-rooms"></div>'+
    '</div>'+
  '</section>'+
  '<section id="roomSetupUI">'+
    '<button id="roomBack" class="room-hot" aria-label="Voltar"></button>'+
    '<button class="room-choice room-count" data-v="2"></button><button class="room-choice room-count" data-v="3"></button><button class="room-choice room-count" data-v="4"></button><button class="room-choice room-count" data-v="5"></button><button class="room-choice room-count" data-v="6"></button>'+
    '<button id="roomMapPrev" class="room-arrow"></button><button id="roomMapNext" class="room-arrow"></button>'+
    '<button class="room-choice room-map" data-i="0"></button><button class="room-choice room-map" data-i="1"></button><button class="room-choice room-map" data-i="2"></button><button class="room-choice room-map" data-i="3"></button><button class="room-choice room-map" data-i="4"></button><button class="room-choice room-map" data-i="5"></button>'+
    '<div id="roomMapLabel"></div>'+
    '<button class="room-piece" data-i="0"></button><button class="room-piece" data-i="1"></button><button class="room-piece" data-i="2"></button><button class="room-piece" data-i="3"></button><button class="room-piece" data-i="4"></button><button class="room-piece" data-i="5"></button>'+
    '<div id="roomSelectedPiece"></div>'+
    '<button id="roomDurPrev" class="room-arrow"></button><button id="roomDurNext" class="room-arrow"></button><div id="roomDurValue" class="room-setting-value"></div><div id="roomDurDesc" class="room-setting-desc"></div>'+
    '<button id="roomMoneyPrev" class="room-arrow"></button><button id="roomMoneyNext" class="room-arrow"></button><div id="roomMoneyValue" class="room-setting-value"></div><div id="roomMoneyDesc" class="room-setting-desc"></div>'+
    '<button id="roomBuildPrev" class="room-arrow"></button><button id="roomBuildNext" class="room-arrow"></button><div id="roomBuildValue" class="room-setting-value"></div><div id="roomBuildDesc" class="room-setting-desc"></div>'+
    '<button id="roomTrades" class="room-toggle"></button><button id="roomAuctions" class="room-toggle"></button><button id="roomEvents" class="room-toggle"></button><button id="roomPrivate" class="room-toggle"></button><button id="roomPrivateInfo" class="room-private-info" type="button"></button>'+
    '<button id="roomCreate" class="room-hot ready" aria-label="Criar sala"></button>'+
  '</section>'+
  '<section id="roomLobbyUI">'+
    '<button id="lobbyBack" class="room-hot" aria-label="Voltar"></button>'+
    '<div id="lobbyCards"></div>'+
    '<button class="lobby-piece" data-i="0"></button><button class="lobby-piece" data-i="1"></button><button class="lobby-piece" data-i="2"></button><button class="lobby-piece" data-i="3"></button><button class="lobby-piece" data-i="4"></button><button class="lobby-piece" data-i="5"></button>'+
    '<div id="roomCode"></div><button id="roomCopy" class="room-copy" aria-label="Copiar código"></button>'+
    '<div id="roomLobbyInfo"></div><button id="roomStart" class="lobby-start disabled" aria-label="Iniciar partida"></button>'+
  '</section>'+
  '<div id="roomToast"></div>'+
  '<div id="roomJoinModal"><div class="room-join-card">'+
    '<div class="room-join-title">Entrar em uma sala</div><div class="room-join-copy">Digite seu nome e o código enviado pelo anfitrião.</div>'+
    '<input id="joinName" class="room-input" maxlength="18" placeholder="SEU NOME">'+
    '<input id="joinCode" class="room-input" maxlength="6" placeholder="CÓDIGO DA SALA">'+
    '<div class="room-join-actions"><button id="joinCancel" class="room-modal-btn">Cancelar</button><button id="joinConfirm" class="room-modal-btn primary">Entrar</button></div>'+
    '<div id="joinError" class="room-modal-error"></div>'+
  '</div></div>';
  frame.appendChild(layer);

  setupUI=$('roomSetupUI');lobbyUI=$('roomLobbyUI');browserUI=$('roomBrowserUI');toastEl=$('roomToast');joinModal=$('roomJoinModal');

  /* Hotspots do menu oficial */
  $('roomJoinHot').style.cssText='left:1.55%;top:31.8%;width:21.7%;height:8.8%;';
  $('roomQuickHot').style.cssText='left:1.55%;top:41.6%;width:21.7%;height:8.8%;';
  $('roomCreateHot').style.cssText='left:1.55%;top:51.4%;width:21.7%;height:8.7%;';

  bindUI();
  renderSetup();
  showMenuControls();
}

function bindUI(){
  $('roomCreateHot').onclick=function(){showSetup(true)};
  $('roomJoinHot').onclick=function(){showBrowser(true,false)};
  $('roomQuickHot').onclick=function(){quickMatch(true)};
  $('browserBack').onclick=function(){showMenu(true)};
  $('browserRefresh').onclick=scanRooms;
  $('browserQuick').onclick=function(){quickMatch(false)};
  $('browserJoinCode').onclick=joinFromBrowser;
  $('browserCode').addEventListener('input',function(){this.value=normalizeCode(this.value)});
  $('browserCode').addEventListener('keydown',function(e){if(e.key==='Enter')joinFromBrowser()});
  if(play)play.addEventListener('click',function(){layer.classList.remove('on')});

  $('roomBack').onclick=function(){showMenu(true)};
  document.querySelectorAll('.room-count').forEach(function(b){b.onclick=function(){setup.maxPlayers=Number(b.dataset.v);renderSetup()}});
  document.querySelectorAll('.room-map').forEach(function(b){b.onclick=function(){setup.map=Number(b.dataset.i);renderSetup()}});
  $('roomMapPrev').onclick=function(){cycle('map',MAPS,-1)};
  $('roomMapNext').onclick=function(){cycle('map',MAPS,1)};
  document.querySelectorAll('.room-piece').forEach(function(b){b.onclick=function(){setup.piece=Number(b.dataset.i);renderSetup()}});

  $('roomDurPrev').onclick=function(){cycle('duration',DURATIONS,-1)};$('roomDurNext').onclick=function(){cycle('duration',DURATIONS,1)};
  $('roomMoneyPrev').onclick=function(){cycle('money',MONEY,-1)};$('roomMoneyNext').onclick=function(){cycle('money',MONEY,1)};
  $('roomBuildPrev').onclick=function(){cycle('build',BUILDS,-1)};$('roomBuildNext').onclick=function(){cycle('build',BUILDS,1)};
  $('roomTrades').onclick=function(){toggle('trades')};$('roomAuctions').onclick=function(){toggle('auctions')};$('roomEvents').onclick=function(){toggle('events')};$('roomPrivate').onclick=setPrivateMode;$('roomPrivateInfo').onclick=changePrivatePassword;
  $('roomCreate').onclick=createRoom;

  $('lobbyBack').onclick=leaveRoom;
  document.querySelectorAll('.lobby-piece').forEach(function(b){b.onclick=function(){selectLobbyPiece(Number(b.dataset.i))}});
  $('roomCopy').onclick=copyCode;
  $('roomStart').onclick=startRoomGame;

  $('joinCancel').onclick=closeJoinModal;
  $('joinConfirm').onclick=joinRoom;
  $('joinCode').addEventListener('input',function(){this.value=normalizeCode(this.value)});
  $('joinName').addEventListener('keydown',function(e){if(e.key==='Enter')$('joinCode').focus()});
  $('joinCode').addEventListener('keydown',function(e){if(e.key==='Enter')joinRoom()});

  window.addEventListener('popstate',function(){
    var h=location.hash;
    if(h==='#criar-sala'){showSetup(false);return}
    if(h==='#multiplayer'){showBrowser(false,false);return}
    if(h==='#sala-lobby'&&room){showLobby(false);return}
    if(h==='#tabuleiro-online'){showOnlineBoard(false);return}
    if(!h||h==='#'){showMenuControls()}
  });
}

function renderSetup(){
  if(!layer)return;
  document.querySelectorAll('.room-count').forEach(function(b){b.classList.toggle('selected',Number(b.dataset.v)===setup.maxPlayers)});
  document.querySelectorAll('.room-map').forEach(function(b){b.classList.toggle('selected',Number(b.dataset.i)===setup.map)});
  document.querySelectorAll('.room-piece').forEach(function(b){b.classList.toggle('selected',Number(b.dataset.i)===setup.piece)});
  $('roomMapLabel').textContent=MAPS[setup.map].name;
  $('roomSelectedPiece').innerHTML='<span>Peça selecionada: <b>'+PIECES[setup.piece]+'</b></span>';

  $('roomDurValue').textContent=DURATIONS[setup.duration].label;$('roomDurDesc').textContent=DURATIONS[setup.duration].desc;
  $('roomMoneyValue').textContent=MONEY[setup.money].label;$('roomMoneyDesc').textContent=MONEY[setup.money].desc;
  $('roomBuildValue').textContent=BUILDS[setup.build].label;$('roomBuildDesc').textContent=BUILDS[setup.build].desc;

  [['roomTrades','trades'],['roomAuctions','auctions'],['roomEvents','events'],['roomPrivate','private']].forEach(function(x){$(x[0]).classList.toggle('on',!!setup[x[1]])});
  $('roomPrivateInfo').textContent=setup.private?(setup.password?'Senha definida · alterar':'Definir senha'):'';
  $('roomPrivateInfo').classList.toggle('visible',!!setup.private);
}

function stopBrowserScan(){
  scanToken++;
  try{if(browserPeer)browserPeer.destroy()}catch(_){}
  browserPeer=null;
}
function roomAdvert(){
  if(!room||room.started)return null;
  var host=room.players&&room.players.find(function(p){return p.host})||room.players&&room.players[0];
  return {
    code:room.code,
    hostName:host?host.name:'Anfitrião',
    private:!!room.config.private,
    players:room.players.length,
    maxPlayers:room.config.maxPlayers,
    map:room.config.map,
    mapName:MAPS[room.config.map]?MAPS[room.config.map].name:'Cidade de Nerdora',
    duration:DURATIONS[room.config.duration]?DURATIONS[room.config.duration].label:'Clássica',
    createdAt:room.createdAt||Date.now(),
    beaconSlot:directorySlot
  };
}
function destroyDirectory(){
  try{if(directoryPeer)directoryPeer.destroy()}catch(_){}
  directoryPeer=null;directorySlot=null;
}
function openBeacon(slot){
  return new Promise(function(resolve,reject){
    var p=new Peer(beaconId(slot)),done=false;
    var timer=setTimeout(function(){if(done)return;done=true;try{p.destroy()}catch(_){};reject(new Error('timeout'))},2200);
    p.on('open',function(){
      if(done)return;done=true;clearTimeout(timer);resolve(p);
    });
    p.on('error',function(err){
      if(done)return;done=true;clearTimeout(timer);try{p.destroy()}catch(_){};reject(err);
    });
  });
}
async function claimDirectoryBeacon(){
  destroyDirectory();
  var order=[],start=Math.floor(Math.random()*DIRECTORY_SLOTS);
  for(var i=0;i<DIRECTORY_SLOTS;i++)order.push(((start+i)%DIRECTORY_SLOTS)+1);
  for(var j=0;j<order.length;j++){
    try{
      var p=await openBeacon(order[j]);
      directoryPeer=p;directorySlot=order[j];
      p.on('connection',function(conn){
        conn.on('open',function(){
          var adv=roomAdvert();
          if(adv)try{conn.send({type:'room_advert',room:adv})}catch(_){}
        });
      });
      p.on('error',function(){});
      return true;
    }catch(_){}
  }
  return false;
}
function roomRowHtml(r){
  var friend=isFriendRoom(r),full=r.players>=r.maxPlayers;
  return '<article class="browser-room '+(friend?'friend ':'')+(full?'full':'')+'" data-code="'+escapeHtml(r.code)+'">'+
    '<div class="browser-room-icon">'+(friend?'★':(r.private?'🔒':'🎲'))+'</div>'+
    '<div class="browser-room-main"><div class="browser-room-title">'+escapeHtml(r.hostName)+(friend?' <span>AMIGO</span>':'')+'</div>'+
      '<div class="browser-room-meta">'+escapeHtml(r.mapName)+' · '+escapeHtml(r.duration)+' · '+r.players+'/'+r.maxPlayers+' jogadores</div></div>'+
    '<div class="browser-room-type">'+(r.private?'PRIVADA':'PÚBLICA')+'</div>'+
    '<button class="browser-room-join" '+(full?'disabled':'')+'>'+(full?'CHEIA':(r.private?'SENHA':'ENTRAR'))+'</button>'+
  '</article>';
}
function renderBrowserRooms(){
  var list=browserRooms.slice().filter(function(r){return r&&r.code&&r.players<r.maxPlayers});
  list.sort(function(a,b){
    var af=isFriendRoom(a)?1:0,bf=isFriendRoom(b)?1:0;
    if(af!==bf)return bf-af;
    return (a.createdAt||0)-(b.createdAt||0);
  });
  var box=$('browserRooms');
  if(!list.length){
    box.innerHTML='<div class="browser-empty"><b>Nenhuma sala disponível agora.</b><span>Você pode entrar por código, atualizar a lista ou criar uma nova sala.</span></div>';
  }else{
    box.innerHTML=list.map(roomRowHtml).join('');
    box.querySelectorAll('.browser-room').forEach(function(row){
      var btn=row.querySelector('.browser-room-join');
      if(btn&&!btn.disabled)btn.onclick=function(){
        var code=row.dataset.code,adv=list.find(function(x){return x.code===code});
        joinAdvertisedRoom(adv);
      };
    });
  }
  $('browserStatus').textContent=list.length?(list.length+' sala'+(list.length===1?'':'s')+' aguardando jogadores'):'Nenhuma sala pública ou privada encontrada';
}
function probeRoom(slot,token){
  return new Promise(function(resolve){
    if(!browserPeer||token!==scanToken){resolve(null);return}
    var done=false,conn;
    function finish(v){
      if(done)return;done=true;
      try{if(conn)conn.close()}catch(_){}
      resolve(v||null);
    }
    try{
      conn=browserPeer.connect(beaconId(slot),{reliable:true,metadata:{purpose:'browser'}});
      conn.on('data',function(msg){
        if(msg&&msg.type==='room_advert'&&msg.room)finish(msg.room);
      });
      conn.on('error',function(){finish(null)});
      conn.on('close',function(){setTimeout(function(){finish(null)},20)});
      setTimeout(function(){finish(null)},1250);
    }catch(_){finish(null)}
  });
}
async function scanRooms(){
  if(typeof Peer==='undefined'){if($('browserStatus'))$('browserStatus').textContent='Multiplayer indisponível neste carregamento.';return []}
  stopBrowserScan();
  browserRooms=[];
  var token=scanToken;
  if($('browserStatus'))$('browserStatus').textContent='Procurando salas abertas...';
  try{
    browserPeer=new Peer();
    await new Promise(function(resolve,reject){
      var done=false,t=setTimeout(function(){if(!done){done=true;reject(new Error('timeout'))}},4500);
      browserPeer.on('open',function(){if(done)return;done=true;clearTimeout(t);resolve()});
      browserPeer.on('error',function(err){if(err&&err.type!=='peer-unavailable'&&!done){done=true;clearTimeout(t);reject(err)}});
    });
    var jobs=[];
    for(var i=1;i<=DIRECTORY_SLOTS;i++)jobs.push(probeRoom(i,token));
    var found=await Promise.all(jobs);
    if(token!==scanToken)return [];
    var seen={};
    found.forEach(function(r){if(r&&r.code&&!seen[r.code]){seen[r.code]=true;browserRooms.push(r)}});
    renderBrowserRooms();
    return browserRooms.slice();
  }catch(_){
    if(token===scanToken&&$('browserStatus'))$('browserStatus').textContent='Não foi possível atualizar as salas. Tente novamente.';
    return [];
  }
}
function joinAdvertisedRoom(adv){
  if(!adv)return;
  var pwd='';
  if(adv.private){
    pwd=prompt('Sala privada de '+adv.hostName+'. Digite a senha:','')||'';
    if(!pwd)return;
  }
  connectToRoom(adv.code,pwd,$('browserName').value||playerName(),function(msg){$('browserStatus').textContent=msg});
}
function joinFromBrowser(){
  var code=normalizeCode($('browserCode').value),pwd=$('browserPassword').value||'',name=$('browserName').value||playerName();
  if(code.length!==6){$('browserStatus').textContent='Digite um código de 6 caracteres.';return}
  connectToRoom(code,pwd,name,function(msg){$('browserStatus').textContent=msg});
}
async function quickMatch(fromMenu){
  if(fromMenu)showBrowser(true,true);
  $('browserStatus').textContent='Buscando uma sala pública livre...';
  var rooms=await scanRooms();
  var open=rooms.filter(function(r){return !r.private&&r.players<r.maxPlayers});
  if(!open.length){$('browserStatus').textContent='Nenhuma sala pública livre agora. Você pode criar uma sala ou atualizar a lista.';return}
  var pick=open[Math.floor(Math.random()*open.length)];
  $('browserStatus').textContent='Partida encontrada com '+pick.hostName+'. Entrando...';
  connectToRoom(pick.code,'',$('browserName').value||playerName(),function(msg){$('browserStatus').textContent=msg});
}

function openJoinModal(){
  $('joinName').value=playerName()==='Jogador'?'':playerName();
  $('joinCode').value='';
  $('joinError').textContent='';
  joinModal.classList.add('on');
  setTimeout(function(){$('joinName').focus()},80);
}
function closeJoinModal(){if(joinModal)joinModal.classList.remove('on')}
function joinError(msg){$('joinError').textContent=msg}

function destroyPeer(){
  try{if(hostConn)hostConn.close()}catch(_){}
  hostConn=null;
  Object.keys(connections).forEach(function(id){try{connections[id].close()}catch(_){}});
  connections={};
  try{if(peer)peer.destroy()}catch(_){}
  peer=null;selfId=null;
}
function makeConfig(){
  return {
    maxPlayers:setup.maxPlayers,map:setup.map,piece:setup.piece,
    duration:setup.duration,money:setup.money,build:setup.build,
    trades:setup.trades,auctions:setup.auctions,events:setup.events,private:setup.private
  };
}
async function createRoom(){
  if(typeof Peer==='undefined'){toast('Módulo multiplayer não carregou. Feche e abra o jogo novamente.');return}
  if(setup.private&&String(setup.password||'').length<4){toast('Defina a senha da sala privada antes de criar.');return}
  $('roomCreate').classList.add('disabled');
  destroyPeer();
  isHost=true;
  var attempts=0;
  while(attempts<5){
    attempts++;
    var code=randomCode();
    try{
      await openHostPeer(code);
      var hostName=localStorage.getItem('nerdopoles-player-name')||'Anfitrião';
      room={
        code:code,hostPeerId:selfId,config:makeConfig(),createdAt:Date.now(),started:false,
        players:[{peerId:selfId,name:hostName,slot:0,piece:setup.piece,color:SLOT_COLORS[0],host:true}]
      };
      roomPassword=setup.private?setup.password:'';
      var listed=await claimDirectoryBeacon();
      showLobby(true);broadcastRoom();
      if(!listed)toast('Sala criada. A entrada por código funciona, mas a listagem automática ficou indisponível.');
      $('roomCreate').classList.remove('disabled');return;
    }catch(e){
      destroyPeer();
      if(attempts>=5){toast('Não foi possível criar a sala. Tente novamente.')}
    }
  }
  $('roomCreate').classList.remove('disabled');
}
function openHostPeer(code){
  return new Promise(function(resolve,reject){
    peer=new Peer('nerdopoles-'+code.toLowerCase());
    var done=false;
    peer.on('open',function(id){
      if(done)return;done=true;selfId=id;
      peer.on('connection',acceptConnection);
      peer.on('error',function(err){if(err&&err.type!=='peer-unavailable')toast('Conexão multiplayer instável.')});
      resolve(id);
    });
    peer.on('error',function(err){if(done)return;done=true;reject(err)});
    setTimeout(function(){if(!done){done=true;reject(new Error('timeout'))}},8000);
  });
}
function acceptConnection(conn){
  connections[conn.peer]=conn;
  conn.on('data',function(msg){handleHostMessage(conn,msg)});
  conn.on('close',function(){removePeer(conn.peer)});
  conn.on('error',function(){removePeer(conn.peer)});
}
function handleHostMessage(conn,msg){
  if(!msg||typeof msg!=='object')return;
  if(msg.type==='join'){
    if(!room||room.started){conn.send({type:'reject',reason:'A partida já começou ou a sala não está disponível.'});return}
    if(room.config.private&&String(msg.password||'')!==String(roomPassword||'')){conn.send({type:'reject',reason:'Senha incorreta para esta sala privada.'});return}
    var existing=room.players.find(function(p){return p.peerId===conn.peer});
    if(existing){conn.send({type:'room_state',room:clone(room)});return}
    if(room.players.length>=room.config.maxPlayers){conn.send({type:'reject',reason:'A sala está cheia.'});return}
    var usedSlots=room.players.map(function(p){return p.slot}),slot=1;
    while(usedSlots.indexOf(slot)>=0)slot++;
    room.players.push({peerId:conn.peer,name:String(msg.name||'Jogador').slice(0,18),slot:slot,piece:null,color:SLOT_COLORS[slot],host:false});
    broadcastRoom();renderLobby();return;
  }
  if(msg.type==='select_piece'){
    var player=room&&room.players.find(function(p){return p.peerId===conn.peer});
    var piece=Number(msg.piece);
    if(!player||piece<0||piece>5)return;
    var occupied=room.players.some(function(p){return p.peerId!==conn.peer&&p.piece===piece});
    if(occupied){conn.send({type:'piece_rejected',piece:piece});return}
    player.piece=piece;broadcastRoom();renderLobby();return;
  }
  if(msg.type&&msg.type.indexOf('game_')===0)emitGame(msg,conn.peer);
}
function removePeer(peerId){
  delete connections[peerId];
  if(!room)return;
  var before=room.players.length;
  room.players=room.players.filter(function(p){return p.peerId!==peerId});
  if(room.players.length!==before){broadcastRoom();renderLobby()}
}
function broadcastRoom(){
  if(!room)return;
  var msg={type:'room_state',room:clone(room)};
  Object.keys(connections).forEach(function(id){try{connections[id].send(msg)}catch(_){}});
}
function sendAll(msg){
  Object.keys(connections).forEach(function(id){try{connections[id].send(msg)}catch(_){}});
}

function joinRoom(){
  var name=savePlayerName($('joinName').value||'Jogador'),code=normalizeCode($('joinCode').value);
  if(code.length!==6){joinError('Digite o código de 6 caracteres.');return}
  connectToRoom(code,'',name,joinError);
}
function connectToRoom(code,password,name,onError){
  code=normalizeCode(code);name=savePlayerName(name||'Jogador');
  if(code.length!==6){if(onError)onError('Código inválido.');return}
  if(typeof Peer==='undefined'){if(onError)onError('O multiplayer não carregou. Feche e abra o jogo novamente.');return}
  stopBrowserScan();destroyPeer();isHost=false;
  if(onError)onError('Conectando à sala '+code+'...');
  peer=new Peer();
  var finished=false;
  var timer=setTimeout(function(){
    if(finished)return;finished=true;
    if(onError)onError('Sala não encontrada ou anfitrião offline.');
    destroyPeer();
  },9000);
  pendingJoin={
    error:function(msg){if(onError)onError(msg)},
    success:function(){clearTimeout(timer);finished=true;closeJoinModal()}
  };
  peer.on('open',function(id){
    if(finished)return;selfId=id;
    hostConn=peer.connect('nerdopoles-'+code.toLowerCase(),{reliable:true});
    hostConn.on('open',function(){hostConn.send({type:'join',name:name,password:String(password||'')})});
    hostConn.on('data',handleGuestMessage);
    hostConn.on('close',function(){
      if(room){toast('O anfitrião saiu da sala.');room=null;showMenu(true)}
      else if(!finished&&onError)onError('A conexão com a sala foi encerrada.');
    });
    hostConn.on('error',function(){if(!finished&&onError)onError('Não foi possível entrar na sala.')});
  });
  peer.on('error',function(err){
    if(err&&err.type==='peer-unavailable'){if(!finished&&onError)onError('Código inválido ou anfitrião offline.')}
    else if(err&&err.type!=='peer-unavailable'){if(!finished&&onError)onError('Erro de conexão multiplayer.')}
  });
}

function handleGuestMessage(msg){
  if(!msg||typeof msg!=='object')return;
  if(msg.type==='reject'){if(pendingJoin&&pendingJoin.error)pendingJoin.error(msg.reason||'Entrada recusada.');else joinError(msg.reason||'Entrada recusada.');return}
  if(msg.type==='room_state'){
    room=msg.room;
    if(pendingJoin&&pendingJoin.success)pendingJoin.success();pendingJoin=null;
    showLobby(location.hash!=='#sala-lobby');renderLobby();return;
  }
  if(msg.type==='piece_rejected'){toast('Essa peça acabou de ser escolhida por outro jogador.');return}
  if(msg.type==='start_game'){
    room=msg.room||room;
    launchOnlineGame(false,msg.game||null);return;
  }
  if(msg.type&&msg.type.indexOf('game_')===0)emitGame(msg,room?room.hostPeerId:null);
}

function renderLobby(){
  if(!room||!lobbyUI)return;
  var cards=$('lobbyCards');cards.innerHTML='';
  for(var slot=0;slot<6;slot++){
    var card=document.createElement('div');card.className='lobby-card';card.dataset.slot=String(slot);card.style.setProperty('--slot-color',SLOT_COLORS[slot]);
    if(slot>=room.config.maxPlayers){
      card.classList.add('locked');
    }else{
      var p=room.players.find(function(q){return q.slot===slot});
      if(!p){
        card.classList.add('waiting');
        card.innerHTML='<div class="lobby-avatar"></div><div class="lobby-name">Aguardando jogador</div><div class="lobby-status">Vaga '+(slot+1)+'</div>';
      }else{
        var avatar=p.piece==null?'':('<img src="'+PIECE_SRC[p.piece]+'?v=106" alt="">');
        card.innerHTML='<div class="lobby-avatar">'+avatar+'</div><div class="lobby-name">'+escapeHtml(p.name)+(p.host?' 👑':'')+'</div><div class="lobby-status">'+(p.piece==null?'Escolhendo peça':PIECES[p.piece])+'</div>';
      }
    }
    cards.appendChild(card);
  }

  var occupied={};
  room.players.forEach(function(p){if(p.piece!=null)occupied[p.piece]=p.peerId});
  document.querySelectorAll('.lobby-piece').forEach(function(b){
    var piece=Number(b.dataset.i),owner=occupied[piece];
    b.classList.toggle('occupied',!!owner);
    b.classList.toggle('mine',owner===selfId);
  });

  $('roomCode').textContent=room.code;
  var complete=room.players.length===room.config.maxPlayers&&room.players.every(function(p){return p.piece!=null});
  $('roomLobbyInfo').textContent=room.players.length+'./'+room.config.maxPlayers+' jogadores · '+MAPS[room.config.map].name+(complete?' · Sala pronta':' · aguardando');
  var start=$('roomStart');
  start.style.display='block';
  start.classList.toggle('disabled',!isHost||!complete);
}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]})}
function selectLobbyPiece(piece){
  if(!room)return;
  var owner=room.players.find(function(p){return p.piece===piece});
  if(owner&&owner.peerId!==selfId){toast('Essa peça já está em uso.');return}
  if(isHost){
    var me=room.players.find(function(p){return p.peerId===selfId});if(!me)return;
    me.piece=piece;room.config.piece=piece;broadcastRoom();renderLobby();
  }else if(hostConn&&hostConn.open){
    hostConn.send({type:'select_piece',piece:piece});
  }
}
async function copyCode(){
  if(!room)return;
  try{await navigator.clipboard.writeText(room.code);toast('Código '+room.code+' copiado.')}
  catch(_){toast('Código da sala: '+room.code)}
}
function leaveRoom(){
  var wasHost=isHost;
  if(wasHost)destroyDirectory();
  destroyPeer();room=null;roomPassword='';isHost=false;
  if(wasHost)showSetup(true);else showMenu(true);
}
function startRoomGame(){
  if(!isHost||!room)return;
  var complete=room.players.length===room.config.maxPlayers&&room.players.every(function(p){return p.piece!=null});
  if(!complete){toast('Aguarde todos os jogadores entrarem e escolherem uma peça.');return}
  if(room.config.map!==0){
    toast('Este protótipo multiplayer inicia no mapa Cidade de Nerdora.');
    room.config.map=0;
  }
  room.started=true;destroyDirectory();
  var packet={type:'start_game',room:clone(room),game:null};
  sendAll(packet);
  launchOnlineGame(true,null);
}
function launchOnlineGame(host,game){
  showOnlineBoard(true);
  if(window.NerdOnlineBoard&&window.NerdOnlineBoard.start){
    window.NerdOnlineBoard.start({room:clone(room),isHost:host,selfId:selfId,game:game});
  }else{
    toast('Carregando tabuleiro multiplayer...');
    setTimeout(function(){if(window.NerdOnlineBoard&&window.NerdOnlineBoard.start)window.NerdOnlineBoard.start({room:clone(room),isHost:host,selfId:selfId,game:game})},500);
  }
}

function emitGame(msg,from){gameListeners.slice().forEach(function(fn){try{fn(msg,from)}catch(_){}})}
function sendToHost(msg){
  if(isHost){emitGame(msg,selfId);return}
  if(hostConn&&hostConn.open)hostConn.send(msg);
}
function broadcastGame(msg){if(isHost)sendAll(msg)}
function sendGameTo(peerId,msg){if(isHost&&connections[peerId]&&connections[peerId].open)connections[peerId].send(msg)}

window.NerdRoom={
  mount:mount,
  handleHash:function(hash){
    if(hash==='#criar-sala'){showSetup(false);return true}
    if(hash==='#multiplayer'){showBrowser(false,false);return true}
    if(hash==='#sala-lobby'&&room){showLobby(false);return true}
    if(hash==='#tabuleiro-online'){showOnlineBoard(false);return true}
    return false;
  },
  getRoom:function(){return room?clone(room):null},
  isHost:function(){return isHost},
  selfId:function(){return selfId},
  onGameMessage:function(fn){gameListeners.push(fn);return function(){gameListeners=gameListeners.filter(function(x){return x!==fn})}},
  sendToHost:sendToHost,
  broadcastGame:broadcastGame,
  sendGameTo:sendGameTo,
  showLobby:showLobby,
  showMenu:showMenu,
  showOnlineBoard:showOnlineBoard
};

window.addEventListener('load',function(){
  mount();
  if(location.hash==='#criar-sala')showSetup(false);
  else if(location.hash==='#multiplayer')showBrowser(false,false);
  else if(!location.hash)showMenuControls();
});
})();
