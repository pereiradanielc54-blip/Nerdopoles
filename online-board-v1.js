
(function(){
'use strict';

var PIECES=[0,1,2,3,4,5].map(function(i){return './assets/tokens/token-'+i+'.png'});
var SPACE_COLORS={brown:'#9b5b3c',lightblue:'#57c9ff',pink:'#ff6fcb',orange:'#ff9b3c',nyan:'#9f7cff',red:'#ff525f',yellow:'#ffd557',green:'#4fd985',darkblue:'#5975ff',rail:'#b89cff',util:'#55e7ff',event:'#b95cff',chest:'#43d89d',tax:'#ffbf5a',jail:'#ff6a6a',goto:'#ff4b5b',free:'#63d8ff',start:'#9d6cff'};
var S=[
['Portal de Nerdora','start'],
['Vila dos Novatos','prop',60,'brown',2],
['Baú de Nerdora','chest'],
['Beco dos Aventureiros','prop',60,'brown',4],
['Tributo do Reino','tax',200],
['Estação do Nyan','rail',200],
['Distrito dos Aprendizes','prop',100,'lightblue',6],
['Carta de Evento','event'],
['Praça dos Otakus','prop',100,'lightblue',6],
['Mercado dos Heróis','prop',120,'lightblue',8],
['Calabouço Real','jail'],
['Bosque Encantado','prop',140,'pink',10],
['Fonte de Mana','util',150],
['Vila dos Magos','prop',140,'pink',10],
['Torre Arcana','prop',160,'pink',12],
['Dirigível Real','rail',200],
['Distrito dos Mercadores','prop',180,'orange',14],
['Baú de Nerdora','chest'],
['Arena dos Aventureiros','prop',180,'orange',14],
['Descanso Livre','free'],
['Grande Mercado de Nerdora','prop',200,'orange',16],
['Praça do Nyan','prop',220,'nyan',18],
['Distrito dos Guerreiros','prop',220,'red',18],
['Carta de Evento','event'],
['Fortaleza Rubra','prop',220,'red',18],
['Arena Real','prop',240,'red',20],
['Expresso de Nerdora','rail',200],
['Palácio Dourado','prop',280,'yellow',24],
['Cristal de Energia','util',150],
['Templo do Sol','prop',260,'yellow',22],
['Jardins Dourados','prop',260,'yellow',22],
['Vá para o Calabouço','goto'],
['Floresta dos Guardiões','prop',300,'green',26],
['Baú de Nerdora','chest'],
['Fortaleza dos Guardiões','prop',320,'green',28],
['Portal Dimensional','rail',200],
['Carta de Evento','event'],
['Cidade Imperial de Nerdora','prop',350,'darkblue',35],
['Taxa Imperial','tax',100],
['Castelo de Nerdora','prop',400,'darkblue',50]
];
var GROUPS={brown:[1,3],lightblue:[6,8,9],pink:[11,13,14],orange:[16,18,20],nyan:[21],red:[22,24,25],yellow:[27,29,30],green:[32,34],darkblue:[37,39]};
var HOUSE_COST={brown:50,lightblue:50,pink:100,orange:100,nyan:150,red:150,yellow:150,green:200,darkblue:200};
var POS=[
[13.2,17.8],[21.4,18.4],[27.5,18.4],[33.9,18.4],[40.2,18.4],[46.6,18.4],[53.0,18.4],[59.2,18.4],[65.3,18.4],[71.8,18.4],[87.1,17.8],
[91.2,24.5],[91.6,30.8],[92.0,37.5],[92.2,44.3],[91.8,51.2],[92.0,58.4],[92.0,65.8],[91.8,71.9],[94.2,91.2],
[77.5,92.7],[71.2,92.7],[65.0,92.7],[59.2,92.7],[52.8,92.7],[46.8,92.7],[40.6,92.7],[34.0,92.7],[27.8,92.7],[21.7,92.7],[16.4,92.7],
[6.0,91.0],[12.2,74.5],[12.2,69.5],[12.2,62.0],[12.4,54.6],[12.4,47.5],[12.4,40.0],[12.5,32.4],[12.5,25.3]
];
var SLOTS={
 top:[[-1.55,-.15],[0,-.15],[1.55,-.15],[-1.55,1.25],[0,1.25],[1.55,1.25]],
 right:[[-1.05,-1.55],[1.05,-1.55],[-1.05,0],[1.05,0],[-1.05,1.55],[1.05,1.55]],
 bottom:[[-1.55,-1.15],[0,-1.15],[1.55,-1.15],[-1.55,.55],[0,.55],[1.55,.55]],
 left:[[-1.05,-1.55],[1.05,-1.55],[-1.05,0],[1.05,0],[-1.05,1.55],[1.05,1.55]]
};
var EVENTS=[
['Quest Lendária','Receba 150 N por concluir uma missão Rank S.','plus150'],
['Ordem da Guarda Real','Vá diretamente para o Calabouço Real.','jail'],
['Fratura Temporal','Volte 3 casas.','back3'],
['Festival do Nyan','Receba 30 N de cada rival.','each30'],
['Encontro com Dragão','Pague 100 N pelos reparos da caravana.','minus100']
];
var CHESTS=[
['Herança da Guilda','Receba 200 N.','plus200'],
['Poção Restauradora','Receba 50 N.','plus50'],
['Chave do Calabouço','Guarde uma chave para sair do Calabouço.','key'],
['Baú Amaldiçoado','Pague 100 N para quebrar a maldição.','minus100'],
['Festa da Cidade','Receba 20 N de cada rival.','each20']
];

var root=null,state=null,ctx=null,offNet=null,logs=[],rolling=false,auction=null;

function $(id){return document.getElementById(id)}
function clone(v){return JSON.parse(JSON.stringify(v))}
function cash(n){return Math.max(0,Math.round(n)).toLocaleString('pt-BR')+' N'}
function delay(ms){return new Promise(function(r){setTimeout(r,ms)})}
function side(i){return i<=10?'top':i<=18?'right':i<=30?'bottom':'left'}
function base(i,slot){var p=POS[i],o=SLOTS[side(i)][slot%6];return [p[0]+o[0],p[1]+o[1]]}
function me(){return state&&state.players.find(function(p){return p.peerId===ctx.selfId})}
function current(){return state&&state.players[state.turn]}
function isMyTurn(){return !!(state&&current()&&current().peerId===ctx.selfId)}
function log(msg){logs.push(msg);if(logs.length>30)logs.shift();renderLog()}

function mount(){
  if(root)return;
  var frame=$('frame');if(!frame)return;
  root=document.createElement('div');root.id='ngoBoard';
  root.innerHTML=
  '<div id="ngoOwners"></div><div id="ngoTokens"></div>'+
  '<button id="ngoBack">← SALA</button><div id="ngoMap">ONLINE · Cidade de Nerdora</div>'+
  '<div id="ngoPlayers" class="ngo-panel"><div class="ngo-title">JOGADORES ONLINE</div><div id="ngoPlayerList"></div></div>'+
  '<div id="ngoStatus" class="ngo-panel"><div id="ngoTurn"></div><div id="ngoRound"></div><div id="ngoCash"></div><div id="ngoPosition"></div></div>'+
  '<div id="ngoSpace" class="ngo-panel"><div id="ngoSpaceName"></div><div id="ngoSpaceDesc"></div><div id="ngoTip"></div></div>'+
  '<div id="ngoDice" class="ngo-panel"><div class="ngo-dice-row"><div id="ngoD1" class="ngo-die">1</div><div id="ngoD2" class="ngo-die">1</div></div><button id="ngoRoll">🎲 ROLAR DADOS</button></div>'+
  '<div id="ngoDecks"><div class="ngo-deck"><span>⭐</span><b>EVENTOS</b></div><div class="ngo-deck chest"><span>🎁</span><b>BAÚS</b></div></div>'+
  '<div id="ngoActions"><button id="ngoBuy" class="ngo-btn gold">COMPRAR</button><button id="ngoDecline" class="ngo-btn">RECUSAR</button><button id="ngoBuild" class="ngo-btn">CONSTRUIR</button><button id="ngoMortgage" class="ngo-btn">HIPOTECAR</button><button id="ngoTrade" class="ngo-btn">NEGOCIAR</button><button id="ngoEnd" class="ngo-btn purple">ENCERRAR</button></div>'+
  '<div id="ngoLog" class="ngo-panel"></div>'+
  '<div id="ngoModal"><div class="ngo-modal-card"><div id="ngoModalTitle"></div><div id="ngoModalBody"></div><div id="ngoModalActions"></div></div></div>';
  frame.appendChild(root);

  $('ngoRoll').onclick=function(){sendAction('roll')};
  $('ngoBuy').onclick=function(){sendAction('buy')};
  $('ngoDecline').onclick=function(){sendAction('decline')};
  $('ngoBuild').onclick=chooseBuild;
  $('ngoMortgage').onclick=chooseMortgage;
  $('ngoTrade').onclick=chooseTrade;
  $('ngoEnd').onclick=function(){sendAction('end')};
  $('ngoBack').onclick=function(){
    if(confirm('Sair da partida e voltar ao lobby?'))history.back();
  };
}

function start(payload){
  mount();ctx=payload;root.classList.add('on');logs=[];
  if(offNet)offNet();
  offNet=window.NerdRoom.onGameMessage(handleNet);

  if(ctx.isHost){
    state=createState(ctx.room);
    log('<b>Partida online iniciada.</b>');
    broadcast();
  }else{
    state=payload.game||null;
    log('Conectado à partida. Aguardando sincronização...');
    render();
  }
}
function hide(){if(root)root.classList.remove('on')}

function createState(room){
  var initial=[1000,1500,2000][Number(room.config.money||1)]||1500;
  var players=room.players.slice().sort(function(a,b){return a.slot-b.slot}).map(function(p){
    return {peerId:p.peerId,name:p.name,piece:p.piece,color:p.color,slot:p.slot,money:initial,pos:0,props:[],jail:false,jailTurns:0,key:0,doubles:0,dead:false};
  });
  return {version:1,roomCode:room.code,config:room.config,players:players,turn:0,round:1,dice:[1,1],phase:'roll',pending:null,bonusRoll:false,assets:{}};
}
function handleNet(msg,from){
  if(!msg||!msg.type)return;
  if(ctx.isHost){
    if(msg.type==='game_action')hostAction(from,msg.action,msg.payload);
    else if(msg.type==='game_bid')hostBid(from,msg.amount);
    else if(msg.type==='game_trade_response')hostTradeResponse(from,msg);
  }else{
    if(msg.type==='game_state'){state=msg.state;render()}
    else if(msg.type==='game_roll_start')animateDice(msg.a,msg.b);
    else if(msg.type==='game_card')showCard(msg.title,msg.text);
    else if(msg.type==='game_notice')log(msg.text);
    else if(msg.type==='game_auction_start')guestAuction(msg);
    else if(msg.type==='game_trade_offer')guestTradeOffer(msg);
  }
}
function sendAction(action,payload){if(!state)return;window.NerdRoom.sendToHost({type:'game_action',action:action,payload:payload||null})}
function broadcast(){
  if(!ctx.isHost)return;
  window.NerdRoom.broadcastGame({type:'game_state',state:clone(state)});
  render();
}
function notice(text){if(ctx.isHost)window.NerdRoom.broadcastGame({type:'game_notice',text:text});log(text)}

function render(){
  if(!state||!root)return;
  renderPlayers();renderTokens();renderOwners();renderStatus();renderLog();
}
function renderPlayers(){
  $('ngoPlayerList').innerHTML=state.players.map(function(p,i){
    return '<div class="ngo-player '+(i===state.turn?'active':'')+'" style="--pc:'+p.color+'">'+
      '<span class="ngo-player-piece"><img src="'+PIECES[p.piece]+'?v=106" alt=""></span>'+
      '<b>'+escapeHtml(p.name)+(p.jail?' 🔒':'')+'</b><span class="ngo-money">'+cash(p.money)+'</span></div>';
  }).join('');
}
function renderTokens(){
  var e=$('ngoTokens');e.innerHTML='';
  state.players.forEach(function(p){
    if(p.dead)return;
    var xy=base(p.pos,p.slot),t=document.createElement('div');t.className='ngo-token'+(p.peerId===ctx.selfId?' me':'');
    t.style.left=xy[0]+'%';t.style.top=xy[1]+'%';t.style.setProperty('--pc',p.color);
    t.innerHTML='<img src="'+PIECES[p.piece]+'?v=106" alt="">';e.appendChild(t);
  });
}
function renderOwners(){
  var e=$('ngoOwners');e.innerHTML='';
  Object.keys(state.assets).forEach(function(k){
    var a=state.assets[k];if(a.owner==null)return;
    var idx=Number(k),p=state.players[a.owner],xy=POS[idx],flag=document.createElement('div');
    flag.className='ngo-owner';flag.style.left='calc('+xy[0]+'% - 13px)';flag.style.top='calc('+xy[1]+'% + 12px)';flag.style.setProperty('--pc',p.color);e.appendChild(flag);
    if(a.h){
      var b=document.createElement('div');b.className='ngo-buildings';b.style.left='calc('+xy[0]+'% + 12px)';b.style.top='calc('+xy[1]+'% + 12px)';b.style.setProperty('--pc',p.color);
      if(a.h>=5){var hotel=document.createElement('i');hotel.className='ngo-hotel';b.appendChild(hotel)}
      else for(var h=0;h<a.h;h++){var q=document.createElement('i');q.className='ngo-house';b.appendChild(q)}
      e.appendChild(b);
    }
  });
}
function renderStatus(){
  var p=current(),self=me(),sp=S[p.pos],mine=isMyTurn();
  $('ngoTurn').textContent=mine?'Sua vez':'Vez de '+p.name;
  $('ngoRound').textContent='Rodada '+state.round+(p.jail?' · Calabouço':'');
  $('ngoCash').textContent=self?cash(self.money):'—';
  $('ngoPosition').textContent=self?S[self.pos][0]:'';
  $('ngoD1').textContent=state.dice[0];$('ngoD2').textContent=state.dice[1];
  $('ngoSpaceName').textContent=sp[0];$('ngoSpaceDesc').innerHTML=spaceDesc(p.pos);
  $('ngoSpace').style.setProperty('--accent',SPACE_COLORS[sp[3]]||SPACE_COLORS[sp[1]]||'#a96cff');
  $('ngoTip').textContent=mine?tip():'Aguarde '+p.name+' concluir o turno.';
  $('ngoRoll').hidden=!(mine&&state.phase==='roll'&&!rolling);

  var buy=mine&&state.phase==='decide'&&state.pending!=null&&self.money>=S[state.pending][2];
  var decline=mine&&state.phase==='decide'&&state.pending!=null;
  var build=mine&&buildable(state.turn).length>0;
  var mortgage=mine&&self.props.length>0;
  var trade=mine&&state.config.trades&&self.props.length>0;
  var end=mine&&state.phase==='end';
  [['ngoBuy',buy],['ngoDecline',decline],['ngoBuild',build],['ngoMortgage',mortgage],['ngoTrade',trade],['ngoEnd',end]].forEach(function(x){$(x[0]).hidden=!x[1]});
  $('ngoActions').hidden=!(buy||decline||build||mortgage||trade||end);
}
function renderLog(){
  var e=$('ngoLog');if(!e)return;e.innerHTML=logs.slice(-6).map(function(x){return '<div>'+x+'</div>'}).join('');e.scrollTop=e.scrollHeight;
}
function tip(){
  if(state.phase==='roll')return current().doubles>0?'Dupla! Depois de resolver a casa anterior, role novamente.':'Role os dados para mover sua peça.';
  if(state.phase==='decide')return 'Compre a propriedade ou recuse. Se leilões estiverem ativos, a recusa inicia um leilão online.';
  if(buildable(state.turn).length)return 'Você pode construir em um grupo completo antes de encerrar o turno.';
  return 'Finalize suas ações e encerre o turno.';
}
function spaceDesc(idx){
  var s=S[idx],a=state.assets[idx];
  if(['prop','rail','util'].indexOf(s[1])>=0){
    if(!a)return 'Disponível por <b>'+cash(s[2])+'</b>.';
    return 'Dono: <b style="color:'+state.players[a.owner].color+'">'+escapeHtml(state.players[a.owner].name)+'</b>'+(a.h?' · '+(a.h>=5?'Hotel':a.h+' Casa(s)'):'')+(a.mort?' · Hipotecada':'');
  }
  if(s[1]==='tax')return 'Tributo de '+cash(s[2])+'.';
  if(s[1]==='event')return 'Compre uma Carta de Evento.';
  if(s[1]==='chest')return 'Abra um Baú de Nerdora.';
  if(s[1]==='goto')return 'Vá diretamente ao Calabouço Real.';
  if(s[1]==='free')return 'Descanso Livre.';
  if(s[1]==='jail')return 'Calabouço Real.';
  return 'Passe pelo Portal e receba 200 N.';
}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]})}

async function animateDice(a,b){
  rolling=true;var d1=$('ngoD1'),d2=$('ngoD2');d1.classList.add('rolling');d2.classList.add('rolling');
  for(var i=0;i<10;i++){d1.textContent=1+Math.floor(Math.random()*6);d2.textContent=1+Math.floor(Math.random()*6);await delay(85)}
  d1.textContent=a;d2.textContent=b;await delay(220);d1.classList.remove('rolling');d2.classList.remove('rolling');rolling=false;renderStatus();
}

async function hostAction(from,action,payload){
  if(!state)return;var p=current();
  if(!p||p.peerId!==from)return;
  if(action==='roll'){if(state.phase!=='roll')return;await hostRoll();return}
  if(action==='buy'){hostBuy();return}
  if(action==='decline'){hostDecline();return}
  if(action==='end'){if(state.phase==='end')nextTurn();return}
  if(action==='build'){hostBuild(Number(payload&&payload.index));return}
  if(action==='mortgage'){hostMortgage(Number(payload&&payload.index));return}
  if(action==='trade'){hostTrade(from,payload);return}
}
async function hostRoll(){
  var p=current(),a=1+Math.floor(Math.random()*6),b=1+Math.floor(Math.random()*6),sum=a+b;
  state.dice=[a,b];window.NerdRoom.broadcastGame({type:'game_roll_start',a:a,b:b});animateDice(a,b);await delay(1120);
  notice('<b>'+p.name+'</b> rolou '+a+' + '+b+' = '+sum+'.');
  if(p.jail){
    if(a===b){p.jail=false;p.jailTurns=0;notice(p.name+' saiu do Calabouço com uma dupla.')}
    else{p.jailTurns++;if(p.jailTurns<3){state.phase='end';broadcast();return}else{hostPay(state.turn,50,null);p.jail=false;p.jailTurns=0}}
  }
  if(a===b){p.doubles++;if(p.doubles>=3){hostJail(state.turn);broadcast();return}}else p.doubles=0;
  for(var i=0;i<sum;i++){
    p.pos=(p.pos+1)%40;if(p.pos===0){p.money+=200;notice(p.name+' passou pelo Portal e recebeu 200 N.')}
    broadcast();await delay(210);
  }
  await hostLand(sum,a===b);
}
async function hostLand(dice,dbl){
  var pi=state.turn,p=current(),idx=p.pos,s=S[idx],a=state.assets[idx];state.pending=null;state.bonusRoll=false;
  notice(p.name+' chegou a <b>'+s[0]+'</b>.');
  if(['prop','rail','util'].indexOf(s[1])>=0){
    if(a&&a.owner!=null){
      if(a.owner!==pi&&!a.mort)hostPay(pi,rent(idx,dice),a.owner);
      state.phase=dbl&&!p.jail?'roll':'end';broadcast();return;
    }
    state.pending=idx;state.bonusRoll=!!dbl;state.phase='decide';broadcast();return;
  }
  if(s[1]==='tax'){hostPay(pi,s[2],null)}
  else if(s[1]==='goto'){hostJail(pi)}
  else if((s[1]==='event'||s[1]==='chest')&&state.config.events){await hostCard(s[1],pi)}
  state.phase=dbl&&!p.jail?'roll':'end';broadcast();
}
function hostBuy(){
  if(state.phase!=='decide'||state.pending==null)return;var idx=state.pending,p=current(),s=S[idx];
  if(p.money<s[2])return;p.money-=s[2];p.props.push(idx);state.assets[idx]={owner:state.turn,h:0,mort:false};
  notice(p.name+' comprou <b>'+s[0]+'</b>.');resolveDecision();
}
function hostDecline(){
  if(state.phase!=='decide'||state.pending==null)return;
  if(state.config.auctions){startAuction(state.pending);return}
  notice(current().name+' recusou '+S[state.pending][0]+'.');resolveDecision();
}
function resolveDecision(){
  var extra=state.bonusRoll&&!current().jail;state.pending=null;state.bonusRoll=false;state.phase=extra?'roll':'end';broadcast();
}
function rent(idx,dice){
  var s=S[idx],a=state.assets[idx],owner=a.owner;
  if(s[1]==='rail'){var c=state.players[owner].props.filter(function(x){return S[x][1]==='rail'&&!state.assets[x].mort}).length;return 25*Math.pow(2,c-1)}
  if(s[1]==='util'){var u=state.players[owner].props.filter(function(x){return S[x][1]==='util'&&!state.assets[x].mort}).length;return dice*(u>1?10:4)}
  var h=a.h||0,r=s[4]*[1,5,15,45,80,125][h];if(!h&&full(owner,s[3]))r*=2;return r;
}
function full(pi,group){return GROUPS[group].every(function(x){return state.assets[x]&&state.assets[x].owner===pi&&!state.assets[x].mort})}
function hostPay(pi,amt,to){
  var p=state.players[pi],v=Math.min(p.money,amt);p.money-=v;if(to!=null)state.players[to].money+=v;
  notice(p.name+' pagou '+cash(v)+(to!=null?' para '+state.players[to].name:'')+'.');
  if(p.money<=0&&v<amt){p.dead=true;notice('<b>'+p.name+' faliu.</b>')}
}
function hostJail(pi){var p=state.players[pi];p.pos=10;p.jail=true;p.jailTurns=0;p.doubles=0;state.phase='end';notice(p.name+' foi para o Calabouço Real.')}

function buildable(pi){
  var p=state.players[pi];return p.props.filter(function(idx){
    var s=S[idx],a=state.assets[idx];if(!a||s[1]!=='prop'||a.mort||a.h>=5||!full(pi,s[3]))return false;
    var vals=GROUPS[s[3]].map(function(x){return state.assets[x].h||0});
    return a.h===Math.min.apply(null,vals)&&p.money>=houseCost(idx);
  });
}
function houseCost(idx){var f=Number(state.config.build||1)===0?.75:Number(state.config.build||1)===2?1.25:1;return Math.round(HOUSE_COST[S[idx][3]]*f)}
function chooseBuild(){
  var list=buildable(state.turn);if(!list.length)return;
  var text=list.map(function(idx){return idx+' - '+S[idx][0]+' ('+cash(houseCost(idx))+')'}).join('\n');
  var idx=Number(prompt('Onde construir?\n'+text,list[0]));if(list.indexOf(idx)>=0)sendAction('build',{index:idx});
}
function hostBuild(idx){
  var list=buildable(state.turn);if(list.indexOf(idx)<0)return;var p=current(),cost=houseCost(idx);p.money-=cost;state.assets[idx].h++;
  notice(p.name+' construiu '+(state.assets[idx].h>=5?'um Hotel':'uma Casa')+' em '+S[idx][0]+'.');broadcast();
}
function chooseMortgage(){
  var p=me(),list=p.props.filter(function(idx){return state.assets[idx]&&!(state.assets[idx].h>0)});
  if(!list.length)return;var text=list.map(function(idx){return idx+' - '+S[idx][0]+(state.assets[idx].mort?' [HIPOTECADA]':'')}).join('\n');
  var idx=Number(prompt('Escolha a propriedade:\n'+text,list[0]));if(list.indexOf(idx)>=0)sendAction('mortgage',{index:idx});
}
function hostMortgage(idx){
  var p=current(),a=state.assets[idx],s=S[idx];if(!a||a.owner!==state.turn||a.h)return;
  if(a.mort){var cost=Math.ceil(s[2]*.55);if(p.money<cost)return;p.money-=cost;a.mort=false;notice(p.name+' resgatou '+s[0]+'.')}
  else{a.mort=true;p.money+=Math.floor(s[2]/2);notice(p.name+' hipotecou '+s[0]+'.')}
  broadcast();
}
function chooseTrade(){
  var p=me(),others=state.players.filter(function(x){return x.peerId!==ctx.selfId&&!x.dead});
  if(!others.length||!p.props.length)return;
  var targetName=prompt('Negociar com quem?\n'+others.map(function(x,i){return (i+1)+' - '+x.name}).join('\n'),'1');
  var oi=Number(targetName)-1;if(!others[oi])return;
  var idx=Number(prompt('Qual propriedade oferecer?\n'+p.props.map(function(x){return x+' - '+S[x][0]}).join('\n'),p.props[0]));
  if(p.props.indexOf(idx)<0)return;
  var price=Number(prompt('Preço pedido em Nerdocoins:',S[idx][2])||0);
  sendAction('trade',{targetPeerId:others[oi].peerId,index:idx,price:price});
}
function hostTrade(from,payload){
  if(!state.config.trades||!payload)return;var seller=state.players.findIndex(function(p){return p.peerId===from}),target=state.players.findIndex(function(p){return p.peerId===payload.targetPeerId});
  if(seller<0||target<0||state.players[seller].props.indexOf(payload.index)<0)return;
  window.NerdRoom.sendGameTo(payload.targetPeerId,{type:'game_trade_offer',sellerPeerId:from,sellerName:state.players[seller].name,index:payload.index,property:S[payload.index][0],price:Number(payload.price||0)});
}
function guestTradeOffer(msg){
  var ok=confirm(msg.sellerName+' oferece '+msg.property+' por '+cash(msg.price)+'. Aceitar?');
  window.NerdRoom.sendToHost({type:'game_trade_response',accept:ok,sellerPeerId:msg.sellerPeerId,index:msg.index,price:msg.price});
}
function hostTradeResponse(from,msg){
  if(!msg.accept)return;var buyer=state.players.findIndex(function(p){return p.peerId===from}),seller=state.players.findIndex(function(p){return p.peerId===msg.sellerPeerId}),a=state.assets[msg.index];
  if(buyer<0||seller<0||!a||a.owner!==seller||state.players[buyer].money<msg.price)return;
  state.players[buyer].money-=msg.price;state.players[seller].money+=msg.price;
  state.players[seller].props=state.players[seller].props.filter(function(x){return x!==msg.index});state.players[buyer].props.push(msg.index);a.owner=buyer;
  notice(state.players[buyer].name+' comprou '+S[msg.index][0]+' de '+state.players[seller].name+'.');broadcast();
}

function startAuction(idx){
  auction={idx:idx,bids:{},ends:Date.now()+8000};
  window.NerdRoom.broadcastGame({type:'game_auction_start',idx:idx,property:S[idx][0],price:S[idx][2],ends:auction.ends});
  guestAuction({idx:idx,property:S[idx][0],price:S[idx][2],ends:auction.ends});
  notice('Leilão online iniciado para '+S[idx][0]+'.');setTimeout(finishAuction,8200);
}
function guestAuction(msg){
  if(!state)return;var self=me();if(!self||self.dead)return;
  setTimeout(function(){
    var max=Number(prompt('Leilão: '+msg.property+'\nDigite seu lance máximo (0 para passar):',Math.min(self.money,msg.price))||0);
    if(max>0)window.NerdRoom.sendToHost({type:'game_bid',amount:max});
  },250);
}
function hostBid(from,amount){
  if(!auction)return;var pi=state.players.findIndex(function(p){return p.peerId===from});if(pi<0)return;
  amount=Math.floor(Number(amount||0));if(amount<=0||amount>state.players[pi].money)return;auction.bids[from]=amount;
}
function finishAuction(){
  if(!auction)return;var bestPeer=null,best=0;
  Object.keys(auction.bids).forEach(function(id){if(auction.bids[id]>best){best=auction.bids[id];bestPeer=id}});
  if(bestPeer){var pi=state.players.findIndex(function(p){return p.peerId===bestPeer});state.players[pi].money-=best;state.players[pi].props.push(auction.idx);state.assets[auction.idx]={owner:pi,h:0,mort:false};notice(state.players[pi].name+' venceu o leilão por '+cash(best)+'.')}
  else notice('O leilão terminou sem lances.');
  auction=null;resolveDecision();
}

async function hostCard(kind,pi){
  var deck=kind==='event'?EVENTS:CHESTS,c=deck[Math.floor(Math.random()*deck.length)];
  window.NerdRoom.broadcastGame({type:'game_card',title:c[0],text:c[1]});showCard(c[0],c[1]);notice(state.players[pi].name+' recebeu '+c[0]+'.');await delay(700);
  var p=state.players[pi],e=c[2];
  if(e==='plus150')p.money+=150;else if(e==='plus200')p.money+=200;else if(e==='plus50')p.money+=50;
  else if(e==='minus100')hostPay(pi,100,null);else if(e==='key')p.key++;
  else if(e==='back3')p.pos=(p.pos+37)%40;else if(e==='jail')hostJail(pi);
  else if(e==='each30'||e==='each20'){var v=e==='each30'?30:20;state.players.forEach(function(q,j){if(j!==pi&&!q.dead){var amt=Math.min(q.money,v);q.money-=amt;p.money+=amt}})}
}
function showCard(title,text){modal(title,text,[['Continuar','purple',closeModal]])}
function modal(title,body,actions){
  $('ngoModalTitle').textContent=title;$('ngoModalBody').innerHTML=body;var a=$('ngoModalActions');a.innerHTML='';
  (actions||[['Fechar','',closeModal]]).forEach(function(x){var b=document.createElement('button');b.className='ngo-modal-btn '+(x[1]||'');b.textContent=x[0];b.onclick=x[2];a.appendChild(b)});
  $('ngoModal').classList.add('on');
}
function closeModal(){$('ngoModal').classList.remove('on')}

function nextTurn(){
  var next=state.turn,wrapped=false,guard=0;
  do{next=(next+1)%state.players.length;if(next===0)wrapped=true;guard++}while(state.players[next].dead&&guard<20);
  state.turn=next;if(wrapped)state.round++;state.phase='roll';state.pending=null;state.bonusRoll=false;state.players[next].doubles=0;broadcast();
}
function winner(){
  var alive=state.players.filter(function(p){return !p.dead});
  if(alive.length===1){notice('<b>'+alive[0].name+' venceu Nerdópoles!</b>');return true}
  return false;
}

window.NerdOnlineBoard={start:start,hide:hide};
})();
