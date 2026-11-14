'use strict';
const $=id=>document.getElementById(id), canvas=$('scene'), ctx=canvas.getContext('2d');
const tracks=[{name:'Сухой каньон',length:420,speed:11},{name:'Красные скалы',length:620,speed:13},{name:'Долина теней',length:820,speed:15}];
const skins=[['Графит','#454939'],['Янтарь','#bb752e'],['Малахит','#348169']];
let save={best:0,wins:[],skin:0,sound:true};
try{Object.assign(save,JSON.parse(localStorage.getItem('dino-canyon-v1')))}catch{}
function persist(){try{localStorage.setItem('dino-canyon-v1',JSON.stringify(save))}catch{}}
let level=0,state='menu',dist=0,x=0,y=0,vy=0,items=[],coins=0,protectedNow=false,grace=0,elapsed=0,clock=0,last=0,foot=0;
let keys=new Set(),hold=0,acc=0,W,H,scale,ox,oy,camX,camY,camZ,yaw,pitch,faces=[],audio,wind;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),mix=(a,b,t)=>a+(b-a)*t;
function rgb(a,b,t){return 'rgb('+a.map((v,i)=>Math.round(mix(v,b[i],t))).join(',')+')'}
function rng(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
function resize(){W=canvas.clientWidth;H=canvas.clientHeight;const ratio=Math.min(devicePixelRatio||1,1.7);canvas.width=Math.round(W*ratio);canvas.height=Math.round(H*ratio);ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0)}
new ResizeObserver(resize).observe(canvas);resize();
function project(a,b,c){
 const dx=a-camX,dz=c-camZ,dy=b-camY;
 const u=dx*Math.cos(yaw)-dz*Math.sin(yaw),z=dx*Math.sin(yaw)+dz*Math.cos(yaw);
 const v=dy*Math.cos(pitch)+z*Math.sin(pitch),d=z*Math.cos(pitch)-dy*Math.sin(pitch);
 return [ox+scale*u/d,oy-scale*v/d,d];
}
function poly(p,color){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)ctx.lineTo(p[i][0],p[i][1]);ctx.closePath();ctx.fill()}
const tintCache=new Map();function tint(hex,m){const k=hex+m;if(!tintCache.has(k)){let v=parseInt(hex.slice(1),16);tintCache.set(k,'rgb('+[v>>16,(v>>8)&255,v&255].map(n=>Math.round(n*m)).join(',')+')')}return tintCache.get(k)}
// Painter-sorted, lit faces of boxes in world space. Y is up and Z follows the course.
function box(cx,base,cz,w,h,d,color){
 let p=project(cx,base+h*.5,cz);if(p[2]<.8||p[2]>170)return;
 const r=scale*(w+h+d)/p[2];if(p[0]<-r||p[0]>W+r||p[1]<-r||p[1]>H+r)return;
 const pts=[];for(let i=0;i<8;i++)pts.push(project(cx+((i&1)?.5:-.5)*w,base+((i&2)?h:0),cz+((i&4)?.5:-.5)*d));
 function face(ids,m){const vs=ids.map(i=>pts[i]);if(vs.some(v=>v[2]<.3))return;faces.push([vs.reduce((s,v)=>s+v[2],0)/4,vs,tint(color,m)])}
 if(camX<cx-w/2)face([0,4,6,2],.79);if(camX>cx+w/2)face([1,3,7,5],.88);
 if(camZ<cz-d/2)face([0,2,3,1],.71);if(camZ>cz+d/2)face([4,5,7,6],.96);
 if(camY>base+h)face([2,6,7,3],1.12);if(camY<base)face([0,1,5,4],.56);
}
function cactus(a,z,s=1){const green='#568052';
 box(a,0,z,.51*s,2.2*s,.55*s,green);box(a-.4*s,.84*s,z,.48*s,.32*s,.38*s,green);box(a-.59*s,.85*s,z,.28*s,.83*s,.37*s,green);
 box(a+.38*s,.53*s,z,.44*s,.27*s,.38*s,green);box(a+.55*s,.54*s,z,.26*s,.67*s,.36*s,green)}
function rex(a,b,z,s,angle,step,duck){
 const color=skins[save.skin]?.[1]||skins[0][1],sy=duck?.49:1;
 function part(i,j,k,w,h,d,c=color){const cs=Math.cos(angle),sn=Math.sin(angle);box(a+(i*cs+k*sn)*s,b+j*s*sy,z+(k*cs-i*sn)*s,(Math.abs(cs)*w+Math.abs(sn)*d)*s,h*s*sy,(Math.abs(cs)*d+Math.abs(sn)*w)*s,c)}
 part(0,.6,0,.82,.95,1.05);part(0,1.08,.27,.76,.75,.72);part(0,1.64,.45,.94,.72,.9);part(0,1.68,1,.9,.36,.41);part(0,1.53,.90,.77,.13,.42);
 part(0,.87,-.75,.61,.56,.62);part(0,1.02,-1.23,.4,.36,.46);part(0,1.17,-1.54,.24,.27,.25);
 for(const side of [-1,1]){let f=Math.sin(step)*side;part(side*.25,.22+Math.max(0,f)*.14,f*.25,.31,.57,.37);part(side*.25,.04+Math.max(0,f)*.14,.11+f*.25,.33,.21,.49);part(side*.46,1.12,.47,.17,.19,.36);part(side*.48,2.08,.59,.045,.16,.17,'#fff6cc');part(side*.51,2.10,.62,.035,.09,.08,'#272b22')}
}
function bird(a,z,t){const wing=Math.sin(t*8)*.35;box(a,1.46,z,.52,.36,.85,'#704a43');box(a,1.68,z-.42,.32,.34,.45,'#784c45');box(a,1.64,z-.77,.23,.13,.35,'#d2975d');for(const side of [-1,1]){box(a+side*.66,1.56,z,.87,.15,.58,'#965e48');box(a+side*1.26,1.58+wing,z+.12,.48,.13,.31,'#ab7655')}}
function shadow(a,z,w,d){let p=[[a-w,0,z-d],[a+w,0,z-d],[a+w,0,z+d],[a-w,0,z+d]].map(v=>project(...v));if(p.every(v=>v[2]>.4))poly(p,'#865b383d')}
let terrain=[];{const rand=rng(23);for(let i=0;i<92;i++)for(const side of [-1,1])terrain.push({z:i*3.5+rand()*2,side,n:rand(),a:6+rand()*11,h:2+rand()*8,w:5+rand()*9})}
function course(){let rand=rng(1907+level*754),list=[];
 for(let z=26,i=0;z<tracks[level].length-14;i++,z+=14+rand()*5-level){let a=i===0?0:(rand()-.5)*7,type=i%4===2?'bird':'cactus';
 list.push({z,a,type});if(level>0&&i%5===3)list.push({z:z+1,a:a>0?-2.7:2.7,type:'cactus'});
 list.push({z:z-6,a:clamp(a+(i%2?2:-2),-3.8,3.8),type:i%7===3?'shield':'gem'})}return list}
function draw(){
 const menu=state==='menu',fraction=menu?0:clamp(dist/tracks[level].length,0,1),night=clamp((fraction-.42)/.58,0,1);
 const horizon=H*(menu?.48:.42);let sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,rgb([130,195,192],[28,37,73],night));sky.addColorStop(.46,rgb([252,216,156],[157,107,127],night));sky.addColorStop(.7,rgb([242,189,120],[129,101,107],night));ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 const sunX=menu?W*.73:W*.68,sunY=horizon-H*.21+night*H*.17,sun=Math.min(58,H*.075);ctx.fillStyle='#fff1b8';for(let i=-5;i<=5;i++){let k=Math.floor(Math.sqrt(33-i*i));ctx.fillRect(sunX-k*sun/5,sunY+i*sun/5,k*2*sun/5,sun/5+1)}
 if(night>.25){ctx.fillStyle='rgba(255,245,212,'+night+')';const r=rng(57);for(let i=0;i<48;i++)ctx.fillRect(r()*W,r()*horizon*.77,2,2)}
 for(let layer=0;layer<2;layer++){const r=rng(90+layer);let xx=-60;ctx.fillStyle=layer?rgb([190,134,99],[87,75,94],night):rgb([215,165,121],[115,89,110],night);
 while(xx<W){let ww=30+r()*W*.11,hh=(.02+r()*.11)*H;ctx.fillRect(xx,horizon-hh+layer*12,ww,hh+12);ctx.fillRect(xx+ww*.17,horizon-hh-8+layer*12,ww*.61,14);xx+=ww-1}}
 ctx.fillStyle=rgb([216,165,107],[109,99,99],night);ctx.fillRect(0,horizon,W,H-horizon);
 camX=menu?4.0:x*.38;camZ=menu?-6.8:-6.5;camY=menu?2.9:3.55;yaw=menu?-.39:0;pitch=menu?.11:.17;scale=menu?Math.min(H*.99,W*.97):Math.min(H*.89,W*.98);ox=W*(menu?(W<630?.73:.69):.5);oy=horizon+scale*Math.tan(pitch);
 const road=(a,b,z0,z1,c)=>{
  const path=[[a,0,z0],[b,0,z0],[b,0,z1],[a,0,z1]],clipped=[];
  for(let i=0;i<4;i++){
   const v=path[i],u=path[(i+1)%4],d=project(...v)[2],e=project(...u)[2];
   if(d>=.3)clipped.push(v);
   if((d>=.3)!==(e>=.3)){const t=(.3-d)/(e-d);clipped.push([mix(v[0],u[0],t),0,mix(v[2],u[2],t)])}
  }
  if(clipped.length>=3)poly(clipped.map(v=>project(...v)),c)
 };
 let start=-dist%5-14;
 for(let i=32;i>=0;i--){let z=start+i*5;road(-4.9,4.9,z,z+5.02,rgb([239,194,132],[144,123,121],night));for(let side of [-1,1]){const a=side*4.9;road(a-.09,a+.09,z,z+5.02,'#bf945f');road(side*4.56-.05,side*4.56+.05,z,z+2,'#f8d6a4')}}
 faces=[];for(const t of terrain){let z=((t.z-dist+3300)%322+322)%322-10;if(z>125||z< -5)continue;let a=t.side*t.a;
 if(t.n>.66){let rock=t.side===1?'#b7724b':'#bc7f55';box(a+t.side*8,0,z,t.w,t.h*.6,5,rock);box(a+t.side*8,t.h*.6,z,t.w*.78,t.h*.28,4,'#ce885c');box(a+t.side*8,t.h*.88,z,t.w*.60,t.h*.13,3.5,'#dfa170')}
 else if(t.n>.24)cactus(a,z,.6+t.n);else box(a,0,z,.8+t.n,.3,.8,'#b79162')}
 const things=menu?[{type:'cactus',a:-2,z:9},{type:'gem',a:1,z:12},{type:'cactus',a:2,z:20}]:items;
 for(const item of things){const z=item.z-(menu?0:dist);if(item.gone||z< -3||z>105)continue;let a=item.a;shadow(a,z,.56,.48);if(item.type==='cactus')cactus(a,z,.82);else if(item.type==='bird')bird(a,z,clock);else{let c=item.type==='shield'?'#62e5d1':'#f4ab38',b=.68+Math.sin(clock*3+z)*.08;box(a,b,z,.51,.52,.34,c);box(a,b+.13,z-.18,.27,.25,.025,'#ffecae')}}
 if(!menu){const z=tracks[level].length-dist;if(z<100&&z> -4){for(const side of [-1,1])box(4.7*side,0,z,.32,4.1,.32,'#45483c');for(let i=0;i<12;i++)for(let j=0;j<2;j++)box(-4.32+i*.785,3.5+j*.34,z,.79,.34,.35,(i+j)%2?'#34382e':'#fff1cb')}}
 const heroX=menu?0:x;shadow(heroX,.03,menu?.99:.66,1.15);rex(heroX,y,0,menu?1.35:1,menu?Math.PI/2:0,menu?clock*2:elapsed*12,state==='run'&&keys.has('duck')&&y<=.01);
 faces.sort((a,b)=>b[0]-a[0]);for(const [,p,c] of faces)poly(p,c);
 if(!menu&&(protectedNow||grace>0)){const p=project(x,y+1,0);ctx.strokeStyle='#b1fff2';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(p[0],p[1],scale*.82/p[2],scale*1.5/p[2],0,0,2*Math.PI);ctx.stroke()}
 if(night){ctx.fillStyle='rgba(41,39,81,'+(night*.24)+')';ctx.fillRect(0,0,W,H)}
}
function soundInit(){try{if(!audio){audio=new AudioContext();const buf=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate);const a=buf.getChannelData(0);let prev=0;for(let i=0;i<a.length;i++){prev=(prev+.08*(Math.random()*2-1))/1.08;a[i]=prev}const noise=audio.createBufferSource();noise.buffer=buf;noise.loop=true;wind=audio.createGain();wind.gain.value=0;noise.connect(wind).connect(audio.destination);noise.start()}audio.resume().catch(()=>{})}catch{}}
function thump(freq,duration,loud){if(!audio||!save.sound)return;const osc=audio.createOscillator(),g=audio.createGain(),now=audio.currentTime;osc.type='sine';osc.frequency.setValueAtTime(freq,now);osc.frequency.exponentialRampToValueAtTime(freq*.52,now+duration);g.gain.setValueAtTime(loud,now);g.gain.exponentialRampToValueAtTime(.001,now+duration);osc.connect(g).connect(audio.destination);osc.start();osc.stop(now+duration)}
const points=()=>Math.floor(dist)+coins*25;
function updateHud(){$('track').textContent=tracks[level].name;$('meters').textContent=Math.floor(dist)+' / '+tracks[level].length+' м';$('score').textContent=String(points()).padStart(5,'0');$('shield').textContent=protectedNow?'◈ ЩИТ':'';$('bar').style.width=100*dist/tracks[level].length+'%'}
function ui(){const menu=state==='menu',run=state==='run';document.body.classList.toggle('playing',!menu);$('intro').hidden=$('picker').hidden=!menu;$('hud').hidden=menu;$('modal').hidden=run||menu;$('pause').hidden=!run;$('touch').hidden=!run||!(navigator.maxTouchPoints||matchMedia('(pointer:coarse)').matches);
 $('record').querySelector('strong').textContent=String(save.best).padStart(5,'0');$('skins').querySelector('b').textContent=skins[save.skin][0];$('desc').textContent=tracks[level].name+' · '+tracks[level].length+' метров';$('sound').textContent=save.sound?'♪':'×';$('sound').setAttribute('aria-label',save.sound?'Выключить звук':'Включить звук');$('sound').setAttribute('aria-pressed',String(save.sound));
 if(wind)wind.gain.setTargetAtTime(run&&save.sound?.24:0,audio.currentTime,.08);
 document.querySelectorAll('.level').forEach((el,i)=>{el.classList.toggle('active',i===level);el.setAttribute('aria-pressed',String(i===level))});updateHud()}
function start(){dist=x=y=vy=elapsed=hold=acc=grace=foot=coins=0;protectedNow=false;keys.clear();items=course();state='run';soundInit();ui()}
function stop(won){state=won?'win':'lost';keys.clear();save.best=Math.max(save.best,points());const before=save.wins.length;if(won&&!save.wins.includes(level))save.wins.push(level);persist();
 $('tag').textContent=tracks[level].name.toUpperCase();$('title').textContent=won?'Финиш!':'Столкновение';$('detail').textContent=Math.floor(dist)+' м · '+coins+' крист. · '+points()+' очк.'+(save.wins.length>before&&before<2?' Открыт облик «'+skins[before+1][0]+'».':'');$('again').textContent=won&&level<2?'Следующая трасса →':'Ещё один забег ↻';thump(won?310:95,.28,.12);ui();$('again').focus()}
function pause(){if(state!=='run')return;state='paused';keys.clear();$('tag').textContent='ЗАБЕГ';$('title').textContent='Пауза';$('detail').textContent=tracks[level].name+' · '+Math.floor(dist)+' м';$('again').textContent='Продолжить ▶';ui();$('again').focus()}
function next(){if(state==='paused'){state='run';ui();return}if(state==='win'&&level<2)level++;start()}
function goMenu(){state='menu';keys.clear();dist=x=y=0;ui()}
function input(k,on){if(state!=='run')return;if(on){if(k==='jump'&&!keys.has(k)&&y===0&&!keys.has('duck')){vy=7.9;hold=.2;thump(150,.1,.04)}keys.add(k)}else{keys.delete(k);if(k==='jump')hold=0}}
function tick(dt){elapsed+=dt;dist=Math.min(tracks[level].length,dist+(tracks[level].speed+5*dist/tracks[level].length)*dt);grace=Math.max(0,grace-dt);x=clamp(x+((keys.has('right')?1:0)-(keys.has('left')?1:0))*7.4*dt,-4.28,4.28);
 const light=hold>0&&vy>0&&keys.has('jump');hold-=dt;vy-=(light?9:23)*dt;y=Math.max(0,y+vy*dt);if(y===0){vy=0;if(elapsed>foot){thump(70,.046,.033);foot=elapsed+.24}}
 for(const item of items){let z=item.z-dist;if(item.gone||Math.abs(z)>.64)continue;
 const dx=Math.abs(item.a-x);if(item.type==='gem'||item.type==='shield'){if(dx<.78&&y<1.45){item.gone=true;if(item.type==='shield')protectedNow=true;else coins++;thump(item.type==='gem'?600:320,.1,.06)}}
 else if(dx<(item.type==='bird'?1.39:.69)&&(item.type==='bird'?!(keys.has('duck')&&y<.01)&&y<1.94:y<1.60)){if(grace>0)continue;if(protectedNow){protectedNow=false;grace=1.35;item.gone=true;thump(235,.2,.1)}else{stop(false);return}}}
 if(dist>=tracks[level].length)stop(true)}
function frame(t){const dt=last?Math.min((t-last)/1000,.08):0;last=t;clock+=dt;if(state==='run'){acc+=dt;while(acc>=1/120&&state==='run'){acc-=1/120;tick(1/120)}updateHud()}draw();requestAnimationFrame(frame)}
tracks.forEach((tr,i)=>{const el=document.createElement('button');el.className='level';el.innerHTML='<span>0'+(i+1)+'</span><b>'+tr.name+'</b>';el.onclick=()=>{level=i;ui()};$('levels').append(el)});
$('start').onclick=start;$('again').onclick=next;$('pause').onclick=pause;$('menu').onclick=goMenu;
$('sound').onclick=()=>{save.sound=!save.sound;soundInit();persist();ui()};
$('skins').onclick=()=>{const n=Math.min(3,save.wins.length+1);if(n===1){$('desc').textContent='Новый облик откроется за первый финиш.';return}save.skin=(save.skin+1)%n;persist();ui()};
const actions={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'jump',ArrowUp:'jump',ArrowDown:'duck',KeyS:'duck'};
addEventListener('keydown',e=>{if(state==='menu')return;if(e.code==='Escape'){e.preventDefault();if(!e.repeat){if(state==='run')pause();else if(state==='paused')next()}return}if(state!=='run')return;if(actions[e.code]){e.preventDefault();if(!e.repeat)input(actions[e.code],true)}});
addEventListener('keyup',e=>{if(actions[e.code])input(actions[e.code],false)});
for(const el of document.querySelectorAll('[data-action]')){el.onpointerdown=e=>{e.preventDefault();el.setPointerCapture(e.pointerId);input(el.dataset.action,true)};el.onlostpointercapture=()=>input(el.dataset.action,false)}
addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});ui();requestAnimationFrame(frame);
