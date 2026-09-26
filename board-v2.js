
(function(){
'use strict';
var BOARD='/assets/nerdopoles-board-01.png';
var PIECE_SHEET='/assets/nerdopoles-pieces.png';
var PIECE_NAMES=['Nyan','Chapéu Mágico','Baú Nerdora','Espada Arcana','Escudo Nerdora','Dirigível'];
var FALLBACK=['🐱','🎩','🧰','⚔️','🛡️','🛸'];
var COLORS=['#a94cff','#39b9ff','#ff5a62','#4edb83','#ffc93f','#ff62c7'];

var S=[
['Portal de Nerdora','start'],['Vila dos Novatos','prop',60,'brown',2],['Baú de Nerdora','chest'],['Beco dos Aventureiros','prop',60,'brown',4],['Tributo do Reino','tax',200],['Estação do Nyan','rail',200],['Distrito dos Aprendizes','prop',100,'lightblue',6],['Carta de Evento','event'],['Praça dos Otakus','prop',100,'lightblue',6],['Mercado dos Heróis','prop',120,'lightblue',8],['Calabouço Real','jail'],['Bosque Encantado','prop',140,'pink',10],['Fonte de Mana','util',150],['Vila dos Magos','prop',140,'pink',10],['Torre Arcana','prop',160,'pink',12],['Dirigível Real','rail',200],['Distrito dos Mercadores','prop',180,'orange',14],['Baú de Nerdora','chest'],['Arena dos Aventureiros','prop',180,'orange',14],['Grande Mercado de Nerdora','prop',200,'orange',16],['Descanso Livre','free'],['Distrito dos Guerreiros','prop',220,'red',18],['Carta de Evento','event'],['Fortaleza Rubra','prop',220,'red',18],['Arena Real','prop',240,'red',20],['Expresso de Nerdora','rail',200],['Jardins Dourados','prop',260,'yellow',22],['Templo do Sol','prop',260,'yellow',22],['Cristal de Energia','util',150],['Palácio Dourado','prop',280,'yellow',24],['Vá para o Calabouço','goto'],['Floresta dos Guardiões','prop',300,'green',26],['Cidade Élfica','prop',300,'green',26],['Baú de Nerdora','chest'],['Fortaleza dos Guardiões','prop',320,'green',28],['Portal Dimensional','rail',200],['Carta de Evento','event'],['Cidade Imperial de Nerdora','prop',350,'darkblue',35],['Taxa Imperial','tax',100],['Castelo de Nerdora','prop',400,'darkblue',50]
];
var GROUPS={brown:[1,3],lightblue:[6,8,9],pink:[11,13,14],orange:[16,18,19],red:[21,23,24],yellow:[26,27,29],green:[31,32,34],darkblue:[37,39]};
var HOUSE_COST={brown:50,lightblue:50,pink:100,orange:100,red:150,yellow:150,green:200,darkblue:200};

var EVENT_CARDS=[
['Portal Dourado','Volte ao Portal de Nerdora e receba 200 N.','start'],
['Ordem da Guarda Real','Vá diretamente para o Calabouço Real.','jail'],
['Fratura Temporal','A magia temporal falhou: volte 3 casas.','back3'],
['Quest Lendária','Você concluiu uma missão Rank S. Receba 150 N.','+150'],
['Encontro com Dragão','Sua caravana foi danificada. Pague 100 N.','-100'],
['Selo de Fuga','Guarde uma Chave do Calabouço.','key'],
['Festival do Nyan','Cada rival paga 30 N para participar da festa.','each30'],
['Chamado Dimensional','Avance até o Portal Dimensional.','p35'],
['Guilda dos Heróis','Sua equipe venceu um contrato. Receba 100 N.','+100'],
['Tempestade Arcana','Pague 25 N por cada construção que possuir.','repairs25']
];
var CHEST_CARDS=[
['Herança da Guilda','Um antigo mestre deixou 200 N para você.','+200'],
['Poção Restauradora','Venda uma poção rara e receba 50 N.','+50'],
['Mandado do Rei','Vá diretamente para o Calabouço Real.','jail'],
['Chave do Calabouço','Guarde uma Chave para sair do Calabouço.','key'],
['Baú Amaldiçoado','Pague 100 N para quebrar a maldição.','-100'],
['Concurso de Cosplay','Você venceu o concurso da praça. Receba 75 N.','+75'],
['Festa da Cidade','Cada rival contribui com 20 N para sua celebração.','each20'],
['Doação ao Orfanato','Doe 50 N ao Orfanato dos Pequenos Heróis.','-50'],
['Mercador Misterioso','Um item raro foi vendido. Receba 100 N.','+100'],
['Taxa da Guilda','Pague 40 N de contribuição anual.','-40']
];

var positions=[],i;
for(i=0;i<=10;i++)positions.push([12+i*7.6,9.7]);
for(i=11;i<=20;i++)positions.push([91.3,17+(i-11)*7.8]);
for(i=21;i<=30;i++)positions.push([83.7-(i-21)*8.25,89.1]);
for(i=31;i<=39;i++)positions.push([8.65,81.3-(i-31)*8.2]);

var game=null,root=null,logs=[],moving=false,pieceSprites=[],piecePromise=null;

function cfg(){
  try{return JSON.parse(localStorage.getItem('nerdopoles-config')||'{}')}catch(e){return {}}
}
function shuffle(a){
  for(var j=a.length-1;j>0;j--){var k=Math.floor(Math.random()*(j+1)),t=a[j];a[j]=a[k];a[k]=t}
  return a;
}
function delay(ms){return new Promise(function(r){setTimeout(r,ms)})}
function cash(n){return Math.max(0,Math.round(n)).toLocaleString('pt-BR')+' N'}

function mount(){
  if(root)return;
  var frame=document.getElementById('frame');if(!frame)return;
  var d=document.createElement('div');d.id='ngBoard';
  d.innerHTML=
  '<div id="ngSlots"></div><div id="ngOwners"></div><div id="ngTokens"></div>'+
  '<button id="ngBack">← CONFIGURAÇÃO</button><div id="ngMap">Mapa 1 · Cidade de Nerdora</div>'+
  '<section id="ngHud"><span class="ng-crystal left"></span><span class="ng-crystal right"></span>'+
    '<div class="ng-hud-head">'+
      '<div class="ng-panel ng-turn-box"><div id="ngTurn" class="ng-turn"></div><div id="ngRound" class="ng-sub"></div></div>'+
      '<div class="ng-dice-altar"><div id="ngD1" class="ng-die">1</div><div id="ngD2" class="ng-die">1</div><button id="ngRoll" class="ng-roll">🎲 ROLAR DADOS</button></div>'+
      '<div class="ng-panel ng-wallet"><div id="ngCash" class="ng-cash"></div><div id="ngPos" class="ng-sub"></div></div>'+
    '</div>'+
    '<div class="ng-hud-body">'+
      '<div class="ng-panel ng-players"><div class="ng-title">AVENTUREIROS</div><div id="ngPlayers"></div></div>'+
      '<div class="ng-center">'+
        '<div class="ng-panel ng-location"><div id="ngSpace" class="ng-space"></div><div id="ngSpaceDesc" class="ng-space-desc"></div><div id="ngTip" class="ng-turn-tip"></div></div>'+
        '<div class="ng-actions">'+
          '<button id="ngBuy" class="ng-btn gold">COMPRAR</button><button id="ngAuction" class="ng-btn">LEILOAR</button><button id="ngBuild" class="ng-btn">CONSTRUIR</button>'+
          '<button id="ngMortgage" class="ng-btn">HIPOTECAR</button><button id="ngTrade" class="ng-btn">NEGOCIAR</button><button id="ngEnd" class="ng-btn purple">ENCERRAR TURNO</button>'+
        '</div>'+
      '</div>'+
      '<div class="ng-right"><div class="ng-decks"><button id="ngEvent" class="ng-deck">⭐<br>EVENTOS</button><button id="ngChest" class="ng-deck chest">🎁<br>BAÚS</button></div><div id="ngLog" class="ng-panel ng-log"></div></div>'+
    '</div>'+
  '</section>'+
  '<div id="ngModal"><div class="ng-modal-card"><div id="ngModalTitle" class="ng-modal-title"></div><div id="ngModalBody" class="ng-modal-body"></div><div id="ngModalActions" class="ng-modal-actions"></div></div></div>';
  frame.appendChild(d);root=d;
  for(i=0;i<40;i++){var q=document.createElement('div');q.className='ng-slot';q.style.left=positions[i][0]+'%';q.style.top=positions[i][1]+'%';document.getElementById('ngSlots').appendChild(q)}
  bind();
  if(!piecePromise)piecePromise=loadPieceSprites();
}

function bind(){
  document.getElementById('ngRoll').onclick=roll;
  document.getElementById('ngBuy').onclick=buy;
  document.getElementById('ngAuction').onclick=auction;
  document.getElementById('ngBuild').onclick=build;
  document.getElementById('ngMortgage').onclick=mortgage;
  document.getElementById('ngTrade').onclick=trade;
  document.getElementById('ngEnd').onclick=endOrDecline;
  document.getElementById('ngBack').onclick=function(){history.back()};
  document.getElementById('ngEvent').onclick=function(){modal('Cartas de Evento','<div class="ng-card-flip">⭐<br><b>EVENTOS DE NERDORA</b><br><small>Missões, portais, tributos e acontecimentos mágicos podem alterar a partida.</small></div>')};
  document.getElementById('ngChest').onclick=function(){modal('Baús de Nerdora','<div class="ng-card-flip chest">🎁<br><b>BAÚS DE NERDORA</b><br><small>Recompensas, chaves, taxas e tesouros do reino.</small></div>')};
  window.addEventListener('popstate',function(){if(location.hash!=='#tabuleiro')hide()});
}

async function loadPieceSprites(){
  return new Promise(function(resolve){
    var img=new Image();
    img.onload=function(){
      try{
        for(var n=0;n<6;n++)pieceSprites[n]=extractPiece(img,n);
      }catch(e){pieceSprites=[]}
      if(game)renderTokens();
      resolve(pieceSprites);
    };
    img.onerror=function(){resolve([])};
    img.src=PIECE_SHEET;
  });
}
function extractPiece(img,index){
  var size=512,sx=(index%3)*size,sy=Math.floor(index/3)*size;
  var c=document.createElement('canvas');c.width=size;c.height=size;
  var x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,sx,sy,size,size,0,0,size,size);
  var im=x.getImageData(0,0,size,size),d=im.data,total=size*size,seen=new Uint8Array(total),queue=new Int32Array(total),head=0,tail=0;
  function bg(p){var k=p*4,r=d[k],g=d[k+1],b=d[k+2];return Math.max(r,g,b)-Math.min(r,g,b)<=4&&r>198}
  function add(p){if(p<0||p>=total||seen[p]||!bg(p))return;seen[p]=1;queue[tail++]=p}
  for(var z=0;z<size;z++){add(z);add((size-1)*size+z);add(z*size);add(z*size+size-1)}
  while(head<tail){
    var p=queue[head++],k=p*4;d[k+3]=0;var px=p%size,py=(p/size)|0;
    if(px)add(p-1);if(px<size-1)add(p+1);if(py)add(p-size);if(py<size-1)add(p+size);
  }
  x.putImageData(im,0,0);
  var minX=size,minY=size,maxX=0,maxY=0;
  for(var yy=0;yy<size;yy++)for(var xx=0;xx<size;xx++){if(d[(yy*size+xx)*4+3]>20){if(xx<minX)minX=xx;if(xx>maxX)maxX=xx;if(yy<minY)minY=yy;if(yy>maxY)maxY=yy}}
  if(maxX<=minX||maxY<=minY)return '';
  var pad=10;minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);maxX=Math.min(size-1,maxX+pad);maxY=Math.min(size-1,maxY+pad);
  var w=maxX-minX+1,h=maxY-minY+1,out=document.createElement('canvas');out.width=240;out.height=240;var o=out.getContext('2d'),scale=Math.min(220/w,220/h),dw=w*scale,dh=h*scale;
  o.drawImage(c,minX,minY,w,h,(240-dw)/2,(240-dh)/2,dw,dh);
  return out.toDataURL('image/png');
}

function newGame(){
  var c=cfg(),money=[1000,1500,2000][Number(c.money==null?1:c.money)]||1500,b=Math.max(1,Math.min(5,Number(c.bots||3))),chosen=Number(c.piece||0);
  var colors=shuffle(COLORS.slice()),avail=[0,1,2,3,4,5].filter(function(n){return n!==chosen});shuffle(avail);
  var ps=[player(0,'Você',chosen,colors[0],money)];
  for(var n=1;n<=b;n++)ps.push(player(n,'BOT '+n,avail[(n-1)%avail.length],colors[n%colors.length],money));
  return {c:c,p:ps,t:0,r:1,d:[1,1],phase:'roll',pending:null,a:{},created:Date.now()};
}
function player(id,name,piece,color,money){return{id:id,n:name,piece:piece,c:color,m:money,pos:0,props:[],jail:false,jt:0,key:0,dead:false,dbl:0}}

async function start(){
  mount();game=newGame();logs=[];root.classList.add('on');log('<b>A aventura começou.</b> Todas as peças entraram pelo Portal de Nerdora.');save();render();
  if(piecePromise)await piecePromise;
  renderTokens();
}
function resume(){
  mount();try{game=JSON.parse(localStorage.getItem('nerdopoles-game')||'null')}catch(e){game=null}
  if(!game)game=newGame();root.classList.add('on');render();
  if(game.t!==0&&game.phase==='roll')setTimeout(botTurn,900);
}
function hide(){if(root)root.classList.remove('on')}
function save(){try{localStorage.setItem('nerdopoles-game',JSON.stringify(game))}catch(e){}}
function log(s){
  logs.push(s);if(logs.length>40)logs.shift();
  var e=document.getElementById('ngLog');if(e){e.innerHTML=logs.slice(-12).map(function(x){return '<div>'+x+'</div>'}).join('');e.scrollTop=e.scrollHeight}
}
function render(){if(!game)return;renderTokens();renderOwners();renderPlayers();renderHud();save()}

function renderTokens(){
  if(!game)return;var e=document.getElementById('ngTokens');if(!e)return;e.innerHTML='';var count={};
  game.p.forEach(function(p,k){
    if(p.dead)return;var n=count[p.pos]||0;count[p.pos]=n+1,o=[[0,0],[11,-7],[-11,7],[12,8],[-12,-8],[0,13]][n%6],t=document.createElement('div');
    t.className='ng-token'+(k===0?' me':'');t.style.left='calc('+positions[p.pos][0]+'% + '+o[0]+'px)';t.style.top='calc('+positions[p.pos][1]+'% + '+o[1]+'px)';
    if(pieceSprites[p.piece]){var im=document.createElement('img');im.src=pieceSprites[p.piece];im.alt=PIECE_NAMES[p.piece];t.appendChild(im)}
    else{var f=document.createElement('span');f.className='fallback';f.style.setProperty('--c',p.c);f.textContent=FALLBACK[p.piece];t.appendChild(f)}
    e.appendChild(t);
  });
}
function renderOwners(){
  if(!game)return;var e=document.getElementById('ngOwners');if(!e)return;e.innerHTML='';
  Object.keys(game.a).forEach(function(k){
    var a=game.a[k];if(a.owner==null)return;var idx=Number(k),p=game.p[a.owner],flag=document.createElement('div');
    flag.className='ng-owner-flag';flag.style.left='calc('+positions[idx][0]+'% - 13px)';flag.style.top='calc('+positions[idx][1]+'% + 12px)';flag.style.setProperty('--c',p.c);e.appendChild(flag);
    if(a.h){
      var b=document.createElement('div');b.className='ng-buildings';b.style.left='calc('+positions[idx][0]+'% + 12px)';b.style.top='calc('+positions[idx][1]+'% + 12px)';b.style.setProperty('--owner',p.c);
      if(a.h>=5){var hotel=document.createElement('i');hotel.className='ng-hotel-mini';b.appendChild(hotel)}
      else for(var h=0;h<a.h;h++){var house=document.createElement('i');house.className='ng-house-mini';b.appendChild(house)}
      e.appendChild(b);
    }
  });
}
function renderPlayers(){
  var e=document.getElementById('ngPlayers');
  e.innerHTML=game.p.map(function(p,k){
    return '<div class="ng-player '+(k===game.t?'active ':'')+(p.dead?'dead':'')+'"><span class="ng-player-color" style="--pc:'+p.c+'"></span><span>'+p.n+'</span><span class="ng-pmoney">'+cash(p.m)+'</span></div>';
  }).join('');
}
function renderHud(){
  var p=game.p[game.t],s=S[p.pos],me=game.p[0],human=game.t===0&&!me.dead,pending=game.pending!=null;
  document.getElementById('ngTurn').textContent=(human?'Sua vez':'Vez de '+p.n);
  document.getElementById('ngRound').textContent='Rodada '+game.r+(p.jail?' · no Calabouço':'');
  document.getElementById('ngD1').textContent=game.d[0];document.getElementById('ngD2').textContent=game.d[1];
  document.getElementById('ngCash').textContent=cash(me.m);document.getElementById('ngPos').textContent=S[me.pos][0];
  document.getElementById('ngSpace').textContent=s[0];document.getElementById('ngSpaceDesc').innerHTML=desc(p.pos);
  document.getElementById('ngTip').textContent=tip(human,pending);
  document.getElementById('ngRoll').disabled=!(human&&game.phase==='roll'&&!moving);
  document.getElementById('ngBuy').disabled=!(human&&game.phase==='decide'&&pending&&me.m>=S[game.pending][2]);
  document.getElementById('ngAuction').disabled=!(human&&game.phase==='decide'&&pending&&game.c.auctions!==false);
  document.getElementById('ngBuild').disabled=!(human&&buildable(0).length);
  document.getElementById('ngMortgage').disabled=!(human&&me.props.length);
  document.getElementById('ngTrade').disabled=!(human&&game.c.trades!==false&&me.props.length);
  var end=document.getElementById('ngEnd');end.disabled=!(human&&(game.phase==='end'||game.phase==='decide'));end.textContent=game.phase==='decide'?'RECUSAR':'ENCERRAR TURNO';
}
function tip(human,pending){
  if(!human)return 'Os bots estão decidindo. Observe as compras, aluguéis e construções.';
  if(game.phase==='roll')return 'Role os dados. Duplas dão outra jogada; três duplas seguidas levam ao Calabouço.';
  if(pending)return game.c.auctions!==false?'Compre a propriedade ou mande-a para leilão.':'Você pode comprar ou recusar a propriedade.';
  if(buildable(0).length)return 'Você já pode construir em um grupo completo. Casas aparecem no tabuleiro com a sua cor.';
  return 'Use suas propriedades, hipotecas e negociações antes de encerrar o turno.';
}
function desc(idx){
  var s=S[idx],a=game.a[idx];
  if(['prop','rail','util'].indexOf(s[1])>=0){
    if(!a)return 'Disponível por <b>'+cash(s[2])+'</b>.';
    var owner=game.p[a.owner];return '<span style="color:'+owner.c+'">●</span> Dono: <b>'+owner.n+'</b>'+(a.mort?' · hipotecada':'')+(a.h?' · '+(a.h>=5?'Hotel':a.h+' Casa(s)'):'');
  }
  if(s[1]==='tax')return 'Tributo obrigatório de <b>'+cash(s[2])+'</b>.';
  if(s[1]==='event')return 'Uma Carta de Evento de Nerdora pode mudar seu destino.';
  if(s[1]==='chest')return 'Abra um Baú de Nerdora e descubra a recompensa ou surpresa.';
  if(s[1]==='goto')return 'A Guarda Real leva sua peça diretamente ao Calabouço.';
  if(s[1]==='jail')return 'Visitando o Calabouço — ou cumprindo sua punição.';
  if(s[1]==='free')return 'Descanso Livre. Nenhuma cobrança ou recompensa.';
  return 'Passe pelo Portal de Nerdora e receba 200 N.';
}

async function animateDice(finalA,finalB){
  var d1=document.getElementById('ngD1'),d2=document.getElementById('ngD2');d1.classList.add('rolling');d2.classList.add('rolling');
  for(var n=0;n<13;n++){d1.textContent=1+Math.floor(Math.random()*6);d2.textContent=1+Math.floor(Math.random()*6);await delay(85)}
  d1.textContent=finalA;d2.textContent=finalB;await delay(240);d1.classList.remove('rolling');d2.classList.remove('rolling');
  try{if(navigator.vibrate)navigator.vibrate([20,35,20])}catch(e){}
}

async function roll(){
  if(!game||game.t!==0||game.phase!=='roll'||moving)return;
  var p=game.p[0];
  if(p.jail){
    var acts=[['Tentar dupla','purple',function(){closeModal();doRoll(0,false)}]];
    if(p.key>0)acts.push(['Usar Chave','',function(){p.key--;p.jail=false;p.jt=0;closeModal();log('Você usou uma Chave do Calabouço.');render()}]);
    if(p.m>=50)acts.push(['Pagar 50 N','gold',function(){p.m-=50;p.jail=false;p.jt=0;closeModal();log('Você pagou 50 N e saiu do Calabouço.');render()}]);
    acts.push(['Cancelar','',closeModal]);modal('Calabouço Real','Escolha como tentar sair. Após três tentativas sem dupla, a taxa de 50 N será obrigatória.',acts);return;
  }
  await doRoll(0,false);
}
async function doRoll(pi,bot){
  if(moving)return;moving=true;var p=game.p[pi],a=1+Math.floor(Math.random()*6),b=1+Math.floor(Math.random()*6),sum=a+b;
  game.d=[a,b];renderHud();await animateDice(a,b);log('<b>'+p.n+'</b> rolou '+a+' + '+b+' = '+sum+'.');await delay(420);
  if(p.jail){
    if(a===b){p.jail=false;p.jt=0;log(p.n+' saiu do Calabouço com uma dupla.');await move(pi,sum);await land(pi,sum,bot,false)}
    else{p.jt++;if(p.jt>=3){pay(pi,50,null);p.jail=false;p.jt=0;await move(pi,sum);await land(pi,sum,bot,false)}else{game.phase='end';render();if(bot)setTimeout(endTurn,900)}}
    moving=false;return;
  }
  if(a===b){p.dbl++;log('Dupla! '+p.n+' poderá jogar novamente.');if(p.dbl>=3){jail(pi);moving=false;if(bot)setTimeout(endTurn,900);return}}
  else p.dbl=0;
  await move(pi,sum);await delay(420);await land(pi,sum,bot,a===b);moving=false;
}
async function move(pi,n){
  var p=game.p[pi];
  for(var k=0;k<n;k++){
    p.pos=(p.pos+1)%40;
    if(p.pos===0){p.m+=200;log(p.n+' passou pelo Portal e recebeu 200 N.')}
    renderTokens();renderHud();await delay(230);
  }
}
async function land(pi,dice,bot,dbl){
  var p=game.p[pi],idx=p.pos,s=S[idx],a=game.a[idx];log(p.n+' chegou a <b>'+s[0]+'</b>.');game.pending=null;render();await delay(520);
  if(['prop','rail','util'].indexOf(s[1])>=0){
    if(a&&a.owner!=null){if(a.owner!==pi&&!a.mort)pay(pi,rent(idx,dice),a.owner);finish(pi,bot,dbl);return}
    if(bot){
      await delay(650);
      var chance=[.52,.7,.84,.94][Number(game.c.difficulty||1)],reserve=[420,320,230,150][Number(game.c.difficulty||1)];
      if(p.m>s[2]+reserve&&Math.random()<chance){buySpace(pi,idx);log(p.n+' comprou <b>'+s[0]+'</b>.')}
      else if(game.c.auctions!==false)autoAuction(idx,pi);
      finish(pi,bot,dbl);return;
    }
    game.pending=idx;game.phase='decide';render();return;
  }
  if(s[1]==='tax'){pay(pi,s[2],null);finish(pi,bot,dbl);return}
  if((s[1]==='event'||s[1]==='chest')&&game.c.events!==false){await card(s[1],pi,bot);finish(pi,bot,dbl);return}
  if(s[1]==='goto'){jail(pi);finish(pi,bot,false);return}
  finish(pi,bot,dbl);
}
function finish(pi,bot,dbl){
  var p=game.p[pi];game.phase=(dbl&&!p.jail)?'roll':'end';render();
  if(bot)setTimeout(function(){botBuild(pi);if(game.phase==='roll')botTurn();else endTurn()},950);
}

function buySpace(pi,idx){
  var p=game.p[pi],s=S[idx];if(p.m<s[2])return false;
  p.m-=s[2];p.props.push(idx);game.a[idx]={owner:pi,h:0,mort:false};renderOwners();render();return true;
}
function buy(){if(game.pending==null)return;if(buySpace(0,game.pending)){log('Você comprou <b>'+S[game.pending][0]+'</b>.');game.pending=null;game.phase='end';render()}}

function rent(idx,dice){
  var s=S[idx],a=game.a[idx],owner=a.owner;
  if(s[1]==='rail'){var c=game.p[owner].props.filter(function(x){return S[x][1]==='rail'&&!game.a[x].mort}).length;return 25*Math.pow(2,c-1)}
  if(s[1]==='util'){var u=game.p[owner].props.filter(function(x){return S[x][1]==='util'&&!game.a[x].mort}).length;return dice*(u>1?10:4)}
  var base=s[4],h=a.h||0,r=base*[1,5,15,45,80,125][h];if(!h&&full(owner,s[3]))r*=2;return r;
}
function full(pi,group){return GROUPS[group].every(function(x){return game.a[x]&&game.a[x].owner===pi&&!game.a[x].mort})}
function pay(pi,amt,to){
  var p=game.p[pi];raise(pi,amt);var v=Math.min(p.m,amt);p.m-=v;if(to!=null)game.p[to].m+=v;
  log(p.n+' pagou <b>'+cash(v)+'</b>'+(to!=null?' para '+game.p[to].n:'')+'.');if(v<amt)bankrupt(pi,to);render();
}
function raise(pi,need){
  var p=game.p[pi];p.props.forEach(function(idx){if(p.m>=need)return;var a=game.a[idx],s=S[idx];if(a&&!a.mort&&!a.h){a.mort=true;p.m+=Math.floor(s[2]/2);log(p.n+' hipotecou '+s[0]+' automaticamente.')}})
}
function bankrupt(pi,to){
  var p=game.p[pi];p.dead=true;p.m=0;log('<b>'+p.n+' faliu.</b>');
  p.props.forEach(function(idx){if(to!=null){game.a[idx].owner=to;game.p[to].props.push(idx)}else delete game.a[idx]});p.props=[];renderOwners();winner();
}
function jail(pi){var p=game.p[pi];p.pos=10;p.jail=true;p.jt=0;p.dbl=0;game.phase='end';log(p.n+' foi para o <b>Calabouço Real</b>.');render()}

function endOrDecline(){
  if(game.phase==='decide'&&game.pending!=null){
    if(game.c.auctions!==false){auction();return}
    log('Você recusou '+S[game.pending][0]+'.');game.pending=null;game.phase='end';render();return;
  }
  endTurn();
}
function endTurn(){
  if(!game)return;game.pending=null;var next=game.t,wrap=false;
  do{next=(next+1)%game.p.length;if(next===0)wrap=true}while(game.p[next].dead);
  game.t=next;if(wrap)game.r++;game.phase='roll';game.p[next].dbl=0;render();
  if(!winner()&&game.t!==0)setTimeout(botTurn,950);
}
async function botTurn(){if(game.t===0||game.p[game.t].dead)return;await delay(450);await doRoll(game.t,true)}

function houseCost(idx){
  var factor=Number(game.c.build||1)===0?.75:Number(game.c.build||1)===2?1.25:1;
  return Math.round(HOUSE_COST[S[idx][3]]*factor);
}
function canBuild(idx,pi){
  pi=pi==null?0:pi;var s=S[idx],a=game.a[idx];
  if(!a||a.owner!==pi||s[1]!=='prop'||a.mort||a.h>=5||!full(pi,s[3]))return false;
  var vals=GROUPS[s[3]].map(function(x){return game.a[x].h||0});
  return a.h===Math.min.apply(null,vals)&&game.p[pi].m>=houseCost(idx);
}
function buildable(pi){return game.p[pi].props.filter(function(idx){return canBuild(idx,pi)})}
function build(){
  var list=buildable(0);if(!list.length){toast('Complete um grupo de cor e construa de forma uniforme.');return}
  modal('Construir em Nerdora','Escolha onde construir. As casas usam automaticamente a cor do proprietário.',list.map(function(idx){
    return [S[idx][0]+' · '+cash(houseCost(idx)),'gold',function(){closeModal();game.p[0].m-=houseCost(idx);game.a[idx].h++;log('Você construiu '+(game.a[idx].h>=5?'um <b>Hotel</b>':'uma <b>Casa</b>')+' em '+S[idx][0]+'.');render()}]
  }).concat([['Cancelar','',closeModal]]));
}
function botBuild(pi){
  var list=buildable(pi),p=game.p[pi];if(!list.length||p.m<420||Math.random()>.42)return;
  var idx=list[Math.floor(Math.random()*list.length)],cost=houseCost(idx);p.m-=cost;game.a[idx].h++;log(p.n+' construiu '+(game.a[idx].h>=5?'um Hotel':'uma Casa')+' em '+S[idx][0]+'.');render();
}

function mortgage(){
  var p=game.p[0];if(!p.props.length)return;
  modal('Hipotecas','Hipoteque uma propriedade sem construções ou resgate uma hipoteca.',p.props.map(function(idx){
    var a=game.a[idx],s=S[idx],label=a.mort?'Resgatar '+s[0]+' · '+cash(Math.ceil(s[2]*.55)):'Hipotecar '+s[0]+' · +'+cash(Math.floor(s[2]/2));
    return [label,a.mort?'gold':'',function(){closeModal();if(a.mort){var cost=Math.ceil(s[2]*.55);if(p.m<cost){toast('Saldo insuficiente.');return}p.m-=cost;a.mort=false;log('Você resgatou '+s[0]+'.')}else{if(a.h){toast('Venda as construções antes de hipotecar.');return}a.mort=true;p.m+=Math.floor(s[2]/2);log('Você hipotecou '+s[0]+'.')}render()}]
  }).concat([['Cancelar','',closeModal]]));
}

function auction(){
  if(game.pending==null)return;var idx=game.pending,s=S[idx],bid=Number(prompt('Sua oferta por '+s[0]+' (0 para não participar):',Math.min(game.p[0].m,s[2]))||0),best={pi:0,b:Math.min(game.p[0].m,bid)};
  for(var j=1;j<game.p.length;j++){if(game.p[j].dead)continue;var b=Math.min(game.p[j].m,Math.floor(s[2]*(.65+Math.random()*.55)/10)*10);if(b>best.b)best={pi:j,b:b}}
  if(best.b>0){game.p[best.pi].m-=best.b;game.p[best.pi].props.push(idx);game.a[idx]={owner:best.pi,h:0,mort:false};log(game.p[best.pi].n+' venceu o leilão por '+cash(best.b)+'.')}
  else log('Ninguém fez oferta por '+s[0]+'.');
  game.pending=null;game.phase='end';render();
}
function autoAuction(idx,skip){
  var s=S[idx],best={pi:-1,b:0};
  for(var j=0;j<game.p.length;j++){if(j===skip||game.p[j].dead)continue;var b=Math.min(game.p[j].m,Math.floor(s[2]*(.6+Math.random()*.5)/10)*10);if(b>best.b)best={pi:j,b:b}}
  if(best.pi>=0){game.p[best.pi].m-=best.b;game.p[best.pi].props.push(idx);game.a[idx]={owner:best.pi,h:0,mort:false};log(game.p[best.pi].n+' venceu o leilão de '+s[0]+' por '+cash(best.b)+'.')}
}
function trade(){
  if(game.c.trades===false){toast('Trocas estão desativadas nesta partida.');return}
  var me=game.p[0];if(!me.props.length)return;
  var list=me.props.map(function(x){return x+': '+S[x][0]}).join('\n'),idx=Number(prompt('Qual propriedade deseja oferecer?\n'+list,me.props[0]));if(me.props.indexOf(idx)<0)return;
  var target=Number(prompt('BOT destino (1 a '+(game.p.length-1)+'):',1));if(!game.p[target]||game.p[target].dead)return;
  var price=Number(prompt('Preço pedido:',S[idx][2])||0),bot=game.p[target];
  if(bot.m>=price&&price<=S[idx][2]*1.25){me.m+=price;bot.m-=price;me.props=me.props.filter(function(x){return x!==idx});bot.props.push(idx);game.a[idx].owner=target;log(bot.n+' aceitou a troca de '+S[idx][0]+'.')}
  else log(bot.n+' recusou sua proposta.');render();
}

async function card(kind,pi,bot){
  var deck=kind==='event'?EVENT_CARDS:CHEST_CARDS,c=deck[Math.floor(Math.random()*deck.length)];log(game.p[pi].n+' recebeu a carta <b>'+c[0]+'</b>.');
  if(!bot)await cardModal(c[0],c[1],kind);else await delay(800);
  await effect(c[2],pi);
}
function cardModal(t,b,kind){
  return new Promise(function(ok){modal(t,'<div class="ng-card-flip '+(kind==='chest'?'chest':'')+'">'+(kind==='chest'?'🎁':'⭐')+'<br><b>'+b+'</b></div>',[['Continuar','purple',function(){closeModal();ok()}]])})
}
async function effect(e,pi){
  var p=game.p[pi];
  if(e==='start'){p.pos=0;p.m+=200}
  else if(e==='jail')jail(pi);
  else if(e==='back3'){p.pos=(p.pos+37)%40;renderTokens()}
  else if(e==='+150')p.m+=150;else if(e==='+200')p.m+=200;else if(e==='+100')p.m+=100;else if(e==='+50')p.m+=50;else if(e==='+75')p.m+=75;
  else if(e==='-100')pay(pi,100,null);else if(e==='-50')pay(pi,50,null);else if(e==='-40')pay(pi,40,null);
  else if(e==='key')p.key++;
  else if(e==='each30'||e==='each20'){var v=e==='each30'?30:20;game.p.forEach(function(q,j){if(j!==pi&&!q.dead){var x=Math.min(q.m,v);q.m-=x;p.m+=x}})}
  else if(e==='p35'){var steps=(35-p.pos+40)%40;await move(pi,steps)}
  else if(e==='repairs25'){var buildings=p.props.reduce(function(sum,idx){var a=game.a[idx];return sum+(a?a.h||0:0)},0);if(buildings)pay(pi,buildings*25,null)}
  render();
}

function modal(t,b,acts){
  document.getElementById('ngModalTitle').textContent=t;document.getElementById('ngModalBody').innerHTML=b;var a=document.getElementById('ngModalActions');a.innerHTML='';
  (acts||[['Fechar','',closeModal]]).forEach(function(x){var q=document.createElement('button');q.className='ng-modal-btn '+(x[1]||'');q.textContent=x[0];q.onclick=x[2];a.appendChild(q)});
  document.getElementById('ngModal').classList.add('on');
}
function closeModal(){document.getElementById('ngModal').classList.remove('on')}
function toast(t){log('<b>'+t+'</b>')}
function winner(){var alive=game.p.filter(function(p){return !p.dead});if(alive.length===1){modal('Vitória em Nerdora',alive[0].n+' conquistou Nerdópoles!');return true}return false}

var startBtn=document.getElementById('start');if(startBtn)startBtn.addEventListener('click',function(){setTimeout(start,0)});
window.addEventListener('load',function(){if(location.hash==='#tabuleiro')setTimeout(resume,0)});
window.NerdBoardV2={start:start,resume:resume,hide:hide};
})();
