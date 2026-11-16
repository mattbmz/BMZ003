'use strict';
(() => {
  const $=id=>document.getElementById(id), canvas=$('run-canvas'), c=canvas.getContext('2d');
  const {FLOOR,R}=FootballRun;
  let game=FootballRun.create(), state='selection', chosen=null, best=0, last=0, width=1100, scale=1, particles=[], trail=[], lastDust=0, initialBest=0, announced=false, recordUntil=0, lastSaved=0;
  const faces=new Map(), reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  try{best=Math.max(0,Math.floor(Number(localStorage.getItem('bmz-football-run-best'))||0));if(!Number.isFinite(best))best=0;}catch{$('save-note').textContent='Record disponible pour cette session.';}
  $('record').textContent=best+' m';
  AVATARS.forEach(a=>{
    const image=new Image();image.src=a.img;faces.set(a.id,image);
    const li=document.createElement('li'),b=document.createElement('button'),img=document.createElement('img'),label=document.createElement('span');
    b.type='button';b.className='avatar';b.setAttribute('aria-pressed','false');img.src=a.img;img.alt='';label.textContent=a.nom;b.append(img,label);li.append(b);$('run-avatars').append(li);
    b.onclick=()=>{chosen=a;$('run-avatars').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('selection-label').textContent=a.nom+' est prêt. À toi de jouer !';$('start').disabled=false;};
  });
  function resize(){width=innerWidth<=600?760:1100;scale=Math.min(devicePixelRatio||1,2);canvas.width=width*scale;canvas.height=500*scale;canvas.style.aspectRatio=width+'/500';game.width=width;draw();}
  addEventListener('resize',resize);
  const metres=()=>Math.floor(game.travel/32);
  function start(){if(!chosen)return;game=FootballRun.create();game.width=width;particles=[];trail=[];lastDust=0;initialBest=best;announced=false;recordUntil=0;lastSaved=0;$('record-toast').hidden=true;state='playing';last=performance.now();$('selection').hidden=true;$('game').hidden=false;$('overlay').hidden=true;$('player-name').textContent=chosen.nom;$('player-img').src=chosen.img;$('pause').disabled=false;$('jump').disabled=false;$('distance').textContent='0 m';resize();canvas.focus({preventScroll:true});canvas.scrollIntoView({block:'center',behavior:'instant'});}
  function overlay(paused){$('overlay').hidden=false;$('end-title').textContent=paused?'Petite pause':'Tu as perdu !';$('end-kicker').textContent=paused?'On reprend quand tu veux !':announced?'Nouveau record !':'Bien tenté !';$('end-score').textContent=metres()+' m parcourus · Record : '+Math.max(best,metres())+' m';$('resume').hidden=!paused;$('retry').hidden=paused;$('pause').disabled=true;$('jump').disabled=true;$('end-title').focus({preventScroll:true});if(innerWidth<=560)$('end-title').scrollIntoView({block:'center',behavior:'instant'});}
  function saveRecord(){try{localStorage.setItem('bmz-football-run-best',String(best));}catch{$('save-note').textContent='Record disponible pour cette session.';}}
  function updateRecord(){
    const score=metres();
    if(FootballRun.recordCrossed(score,initialBest,announced)){
      announced=true;recordUntil=game.time+3;$('record-toast').hidden=false;
      $('record-toast').textContent='🏆 Nouveau record !';
      if(!reduced)for(let i=0;i<55;i++)particles.push({x:game.x,y:game.y,r:2+Math.random()*3,life:1.5,vx:(Math.random()-.5)*420,vy:-120-Math.random()*230,color:['#ffd550','#ff6aab','#a8ff70','#b3a4ff'][i%4]});
    }
    if(score>best){best=score;$('record').textContent=best+' m';if(game.time-lastSaved>=1){saveRecord();lastSaved=game.time;}}
    if(game.time>recordUntil)$('record-toast').hidden=true;
  }
  function lose(){state='over';saveRecord();overlay(false);}
  function pause(){if(state==='playing'){state='paused';saveRecord();overlay(true);}}
  function resume(){if(state!=='paused')return;state='playing';last=performance.now();$('overlay').hidden=true;$('pause').disabled=false;$('jump').disabled=false;canvas.focus({preventScroll:true});}
  const jump=()=>{if(state==='playing')game.jump();};
  $('start').onclick=start;$('retry').onclick=start;$('pause').onclick=pause;$('resume').onclick=resume;
  $('change').onclick=()=>{state='selection';$('game').hidden=true;$('selection').hidden=false;$('start').focus();};
  canvas.addEventListener('pointerdown',e=>{e.preventDefault();jump();});
  $('jump').addEventListener('pointerdown',e=>{e.preventDefault();jump();});$('jump').addEventListener('click',e=>{if(e.detail===0)jump();});
  document.addEventListener('keydown',e=>{if(e.target.closest('a,button')&&['Space','Enter'].includes(e.code))return;if(['Space','ArrowUp'].includes(e.code)&&state==='playing'){e.preventDefault();if(!e.repeat)jump();}if(e.code==='KeyP'&&!e.repeat){if(state==='playing')pause();else resume();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});addEventListener('blur',pause);addEventListener('pagehide',saveRecord);
  const ink='#101334';
  function box(x,y,w,h,color,r=0,stroke=null,line=4){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=line;c.stroke();}}
  function poly(points,color,stroke=null,line=4){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=line;c.lineJoin='round';c.stroke();}}
  function circle(x,y,r,color,stroke=null,line=4){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=line;c.stroke();}}
  function line(x,y,x2,y2,color,w=3){c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=w;c.stroke();}
  function text(s,x,y,size=20,color='#fff'){c.fillStyle=color;c.font='700 '+size+'px Fredoka, sans-serif';c.textAlign='center';c.fillText(s,x,y);}
  function football(x,y,r,angle=0){c.save();c.translate(x,y);c.rotate(angle);circle(0,0,r,'#f1efff',ink,3);poly(Array.from({length:5},(_,i)=>[Math.cos(i*Math.PI*2/5-.3)*r*.43,Math.sin(i*Math.PI*2/5-.3)*r*.43]),'#24244f');for(let i=0;i<5;i++){const a=i*Math.PI*2/5-.3;line(Math.cos(a)*r*.43,Math.sin(a)*r*.43,Math.cos(a)*r*.86,Math.sin(a)*r*.86,'#53527e',2);circle(Math.cos(a)*r*.96,Math.sin(a)*r*.96,r*.16,'#34345e');}c.restore();}
  function trophy(x,y,s){c.save();c.translate(x,y);c.scale(s,s);c.strokeStyle='#fbb42b';c.lineWidth=7;c.beginPath();c.arc(-22,-13,15,0,Math.PI*1.6);c.stroke();c.beginPath();c.arc(22,-13,15,Math.PI*1.4,Math.PI*3);c.stroke();poly([[-24,-35],[24,-35],[18,-2],[5,10],[-5,10],[-18,-2]],'#ffd44b','#f49b1a',3);box(-4,7,8,20,'#ffbf25');box(-18,25,36,8,'#ffdb50',3);poly([[-16,-29],[-8,-29],[-6,-5],[-12,-9]],'#fff39a');c.restore();}
  const palettes=[['#12164c','#3446a7','#8462b7','#5163c3'],['#27114d','#64429a','#c1649a','#8b5cc3'],['#251542','#ae5275','#e9a06c','#8251a1']];
  function scenery(){
    const d=game.travel,t=game.time,p=palettes[Math.floor(metres()/300)%palettes.length];
    const bg=c.createLinearGradient(0,0,0,430);bg.addColorStop(0,p[0]);bg.addColorStop(.65,p[1]);bg.addColorStop(1,p[2]);c.fillStyle=bg;c.fillRect(0,0,width,500);
    // Stars, moon, clouds and a distant city move at different depths.
    for(let i=0;i<45;i++){const x=(i*137.3-d*.025)%(width+80);circle(x<0?x+width+80:x,18+(i*47)%164,i%4===0?1.8:1,'#cbd2ff99');}
    circle(width-140-d*.008%50,74,30,'#c9ceff');circle(width-130-d*.008%50,65,27,p[0]);
    for(let i=-1;i<5;i++){const x=i*340-d*.045%340;c.globalAlpha=.28;circle(x+60,133,33,p[3]);circle(x+100,121,46,p[3]);circle(x+150,140,28,p[3]);box(x+28,135,155,22,p[3]);c.globalAlpha=1;}
    for(let i=-1;i<width/64+2;i++){const x=i*64-d*.07%64,h=25+(i*i*13%55);box(x,232-h,54,h,'#171b5388');for(let k=0;k<3;k++)box(x+9+k*14,240-h,4,7,'#c4b9fb55');}
    // Stadium roof, structural trusses and illuminated supporters' tiers.
    poly([[0,186],[width/2,224],[width,186],[width,225],[width/2,259],[0,225]],'#141943');
    for(let i=-1;i<width/75+2;i++){const x=i*75-d*.1%75;line(x,193,x+74,230,'#343677',4);line(x+74,193,x,230,'#343677',4);}
    for(let row=0;row<4;row++){
      const yy=241+row*28;box(0,yy,width,26,row%2?'#34295d':'#242750');
      for(let i=-1;i<width/16+2;i++){const x=i*16-d*(.12+row*.015)%16, bob=reduced?0:Math.sin(t*3+i*.8)*1.3;const colors=['#7371ac','#ae6596','#5174a5','#8c68aa'];circle(x,yy+9+bob,4,colors[(i+row+8)%4]);box(x-5,yy+13+bob,10,9,colors[(i+row+8)%4],3);}
      box(0,yy+24,width,4,row%2?'#c34f93':'#5157aa');
    }
    // Tall lighting rigs with broad, translucent beams.
    for(let i=-1;i<width/450+2;i++){
      const x=i*450+80-d*.17%450;
      const sweep=reduced?0:Math.sin(t*.7+i)*100;poly([[x-35,64],[x+45,64],[x+260+sweep,362],[x-170+sweep,362]],'#c9d6ff10');
      box(x-5,42,10,310,'#11173e');for(let j=0;j<7;j++){line(x-16,70+j*36,x+16,106+j*36,'#343f83',4);}
      c.save();c.translate(x,60);c.rotate(-.18);box(-54,-33,108,65,'#424ba2',10,ink,5);box(-45,-25,90,49,'#6476d3',5);
      c.shadowColor='#b0d4ff';c.shadowBlur=18;for(let j=0;j<8;j++)circle(-33+(j%4)*22,-13+Math.floor(j/4)*25,8,'#f4f7ff');c.restore();
    }
    // Giant crest board and suspended pennants, all behind the playable lane.
    const boardX=width/2-130-(d*.09%1400);
    for(let i=0;i<2;i++){
      const x=boardX+i*1400;box(x+42,213,13,136,'#13163e');box(x+204,213,13,136,'#13163e');box(x,88,260,146,'#111637',12,'#41449b',5);box(x+13,100,234,121,'#292c74',6,'#595cbe',3);
      football(x+130,169,28);poly([[x+110,138],[x+102,124],[x+120,129],[x+130,117],[x+140,129],[x+158,124],[x+150,138]],'#ffcc54');
      for(let j=0;j<5;j++){c.save();c.translate(x+76-j*5,194-j*10);c.rotate(-.6+j*.2);c.fillStyle='#7fa5ff';c.beginPath();c.ellipse(0,0,5,11,0,0,7);c.fill();c.restore();c.save();c.translate(x+184+j*5,194-j*10);c.rotate(.6-j*.2);c.fillStyle='#7fa5ff';c.beginPath();c.ellipse(0,0,5,11,0,0,7);c.fill();c.restore();}
    }
    for(let i=-1;i<width/530+2;i++){const x=i*530+300-d*.21%530;line(x,0,x,56,'#121439',5);poly([[x-32,0],[x+32,0],[x+32,88],[x,110],[x-32,88]],i%2?'#c63453':'#312976','#111334',5);poly([[x-25,0],[x+25,0],[x+25,82],[x,99],[x-25,82]],'transparent',i%2?'#ffc63e':'#bcbbff',3);if(i%2)trophy(x,48,.55);else football(x,49,18);}
    // Advertising, corner flags and the striped pitch surround.
    box(0,352,width,29,'#17193e');
    for(let i=-1;i<width/180+2;i++){const x=i*180-d*.5%180;box(x+4,355,171,20,i%2?'#484098':'#3c4c8a',3);text(i%2?'★ ★ ★':'❯ ❯ ❯',x+90,370,14,'#cec6ff');}
    box(0,381,width,13,'#292557');
    for(let i=-1;i<width/90+2;i++)poly([[i*90-d*.8%90,381],[i*90+35-d*.8%90,381],[i*90+10-d*.8%90,394],[i*90-25-d*.8%90,394]],'#39366e');
    for(let i=-1;i<width/680+2;i++){const x=i*680+410-d*.55%680;line(x,335,x,385,'#ffd754',4);circle(x,332,5,'#fff196');poly([[x+2,336],[x+35,347+(reduced?0:Math.sin(t*7+i)*5)],[x+2,358]],'#f84b63',ink,3);}
    if(!reduced)for(let i=0;i<17;i++){const x=(i*101-d*.22)%(width+80),y=25+(i*37+t*13)%290;c.save();c.translate(x<0?x+width+80:x,y);c.rotate(i+t);box(-2,-4,4,8,['#ffb94eaa','#777effaa','#ef6ba5aa'][i%3]);c.restore();}
  }
  function turf(x,y,w,h=110){
    box(x,y,w,h,'#50283d');
    for(let row=0;row<4;row++)for(let j=0;j<w/68;j++){const bx=x+j*68+(row%2)*26;box(bx+4,y+24+row*25,Math.min(54,x+w-bx-6),17,row%2?'#8e453a':'#a65139',3);}
    box(x,y,w,15,'#80cb17',2,ink,5);box(x+2,y-1,w-4,7,'#dfff69',2);
    for(let j=0;j<w/25;j++){const bx=x+j*25;poly([[bx,y+15],[Math.min(bx+12,x+w),y+24],[Math.min(bx+25,x+w),y+15]],'#4d9a1d');}
  }
  function ground(){
    const gaps=game.objects.filter(o=>o.kind==='gap'&&o.x<width&&o.x+o.w>0).sort((a,b)=>a.x-b.x);let start=0;
    // Clip continuous textured ground around real gaps, so visuals and collisions agree.
    c.save();c.beginPath();for(const gap of gaps){if(gap.x>start)c.rect(start,FLOOR-5,gap.x-start,115);start=Math.max(start,gap.x+gap.w);}if(start<width)c.rect(start,FLOOR-5,width-start,115);c.clip();
    for(let i=-1;i<width/220+2;i++)turf(i*220-game.travel%220,FLOOR,224,110);c.restore();
    for(const gap of gaps){box(gap.x,FLOOR+20,gap.w,90,'#080e2c');const glow=c.createLinearGradient(0,FLOOR+30,0,500);glow.addColorStop(0,'#211850');glow.addColorStop(1,'#8754ad');box(gap.x+3,FLOOR+30,gap.w-6,80,glow);for(let i=Math.max(0,Math.floor(-gap.x/25));i<Math.min(gap.w/25,(width-gap.x)/25+1);i++)poly([[gap.x+i*25,500],[gap.x+i*25+12,478],[gap.x+i*25+24,500]],'#ba8ce0');line(gap.x,FLOOR+8,gap.x,498,'#c9e86a',3);line(gap.x+gap.w,FLOOR+8,gap.x+gap.w,498,'#c9e86a',3);}
  }
  function obstacle(o){if(o.x>width+80||o.x+o.w<-80)return;const x=o.x,y=FLOOR-o.h;
    if(o.kind==='gap')return;
    if(o.kind==='platform'){
      const top=o.top,pulse=reduced?0:Math.sin(game.time*5+o.x*.006)*3;
      // A thin floating island with metal underside, grass lip and animated jets.
      c.save();c.shadowColor='#91ed4b';c.shadowBlur=12;
      box(x,top,o.w,34,'#5b3458',9,ink,5);box(x+5,top+19,o.w-10,12,'#2d2d54',3);c.restore();
      box(x+2,top,o.w-4,11,'#85d72b',4,ink,3);box(x+7,top+1,o.w-14,4,'#e6ff85',2);
      for(let i=16;i<o.w-12;i+=30){poly([[x+i-9,top+10],[x+i,top+17],[x+i+9,top+10]],'#4c9b28');}
      for(const jet of [x+30,x+o.w-30]){box(jet-10,top+29,20,8,'#7b75b1',3,ink,2);const glow=c.createLinearGradient(0,top+34,0,top+64);glow.addColorStop(0,'#97f9ffbb');glow.addColorStop(1,'#70aaff00');poly([[jet-8,top+37],[jet,top+60+pulse],[jet+8,top+37]],glow);}
      for(let i=65;i<o.w-50;i+=70){circle(x+i,top+24,3,'#b8a6db');}
      if(o.amp){line(x+o.w/2,top-19,x+o.w/2,top-33,'#d9ff83',2);poly([[x+o.w/2-5,top-28],[x+o.w/2,top-36],[x+o.w/2+5,top-28]],'#d9ff83');}
      return;
    }
    if(o.kind==='saw'){
      const cy=o.cy??o.anchorY,r=o.w/2;
      c.save();c.translate(x+r,cy);c.rotate(game.time*5);
      poly(Array.from({length:32},(_,i)=>{const a=i*Math.PI/16,rr=i%2?r*.78:r+4;return[Math.cos(a)*rr,Math.sin(a)*rr];}),'#d9d4ff',ink,3);
      circle(0,0,r*.65,'#f15e8d',ink,3);circle(0,0,r*.28,'#ffd778',ink,2);
      for(let i=0;i<4;i++){const a=i*Math.PI/2;circle(Math.cos(a)*r*.46,Math.sin(a)*r*.46,3,'#622a58');}c.restore();return;
    }
    if(o.kind==='spike'){c.save();c.shadowColor='#ffc930';c.shadowBlur=10;poly([[x,FLOOR-2],[x+o.w/2,y],[x+o.w,FLOOR-2]],'#ffe756',ink,6);c.restore();poly([[x+9,FLOOR-7],[x+o.w/2,y+17],[x+o.w/2,FLOOR-7]],'#ffb923');line(x+o.w/2+4,y+17,x+o.w-9,FLOOR-11,'#fff49d',3);}
    if(o.kind==='cone'){box(x-3,FLOOR-9,o.w+6,10,'#ff8c36',4,ink,4);poly([[x+4,FLOOR-9],[x+o.w*.42,y],[x+o.w*.58,y],[x+o.w-4,FLOOR-9]],'#ff913d',ink,4);poly([[x+o.w*.28,y+26],[x+o.w*.72,y+26],[x+o.w*.81,y+39],[x+o.w*.19,y+39]],'#fff2ca');line(x+o.w*.44,y+8,x+o.w*.22,FLOOR-15,'#ffc56b',3);}
    if(o.kind==='hurdle'){box(x+7,y+8,9,o.h-8,'#e4dff1',3,ink,3);box(x+o.w-16,y+8,9,o.h-8,'#e4dff1',3,ink,3);box(x,y,o.w,22,'#fff4d4',4,ink,4);for(let i=0;i<3;i++)poly([[x+8+i*27,y+2],[x+22+i*27,y+2],[x+13+i*27,y+20],[x+i*27,y+20]],'#fa526d');box(x+1,FLOOR-7,24,7,'#9b92b8',2,ink,2);box(x+o.w-25,FLOOR-7,24,7,'#9b92b8',2,ink,2);}
    if(o.kind==='crate'){box(x,y,o.w,o.h,'#8652b5',6,ink,5);box(x+7,y+7,o.w-14,o.h-14,'#543b83',3,'#b38bdf',3);line(x+10,y+12,x+o.w-10,FLOOR-12,'#b07bd8',6);line(x+o.w-10,y+12,x+10,FLOOR-12,'#b07bd8',6);circle(x+o.w/2,y+o.h/2,14,'#f5c449',ink,3);text('★',x+o.w/2,y+o.h/2+6,18,ink);}
    if(o.kind==='ball'){c.save();c.globalAlpha=.25;c.fillStyle='#000';c.beginPath();c.ellipse(x+o.w/2,FLOOR-2,30,5,0,0,7);c.fill();c.restore();football(x+o.w/2,o.cy??FLOOR-o.w/2,o.w/2,-game.travel/35);}
  }
  function avatar(){if(!chosen)return;const {x,y}=game;
    if(!reduced){trail.forEach((p,i)=>{c.globalAlpha=(i/trail.length)*.18;circle(p.x,p.y,R*.8,'#ddff8a');});c.globalAlpha=1;}
    c.save();c.globalAlpha=.25;c.fillStyle='#090b20';c.beginPath();c.ellipse(x,FLOOR-2,Math.max(7,26-(FLOOR-R-y)*.07),5,0,0,Math.PI*2);c.fill();c.restore();
    c.save();c.shadowColor='#d8ff59';c.shadowBlur=15;circle(x,y,R,'#c0ed67',ink,4);c.shadowBlur=0;c.beginPath();c.arc(x,y,R-3,0,Math.PI*2);c.clip();const img=faces.get(chosen.id);if(img.complete&&img.naturalWidth)c.drawImage(img,x-R+1,y-R+1,(R-1)*2,(R-1)*2);c.restore();
    c.save();c.strokeStyle='#e2ff9b';c.lineWidth=3;c.beginPath();c.arc(x,y,R-1,-2.8,-.8);c.stroke();c.restore();
  }
  function draw(){c.setTransform(scale,0,0,scale,0,0);c.clearRect(0,0,width,500);scenery();c.save();const cameraY=Math.max(0,75-game.y)*.65;c.translate(0,cameraY);ground();game.objects.forEach(obstacle);avatar();particles.forEach(p=>{c.globalAlpha=Math.min(1,p.life*1.5);circle(p.x,p.y,p.r,p.color||'#e3ffb0');});c.globalAlpha=1;c.restore();}
  function frame(now){const dt=Math.min(.05,(now-last)/1000||0);last=now;
    if(state==='playing'){
      let remain=dt;while(remain>0&&game.alive){const step=Math.min(remain,1/120);game.step(step);remain-=step;}
      if(!reduced){trail.push({x:game.x,y:game.y});if(trail.length>14)trail.shift();trail.forEach(p=>p.x-=game.speed*dt*.55);lastDust+=dt;if(game.grounded&&lastDust>.045){particles.push({x:game.x-20,y:game.y+R-4,r:2+Math.random()*3,life:.45});lastDust=0;}particles.forEach(p=>{p.x+=(p.vx??-game.speed*.6)*dt;p.y+=(p.vy??-20)*dt;if(p.vy!==undefined)p.vy+=400*dt;p.life-=dt;});particles=particles.filter(p=>p.life>0);}
      for(const event of game.events.splice(0)){if(!reduced)for(let i=0;i<(event==='land'?12:6);i++)particles.push({x:game.x,y:game.y+R-2,r:2+Math.random()*3,life:.45,vx:(Math.random()-.5)*180,vy:-Math.random()*100});}updateRecord();$('distance').textContent=metres()+' m';draw();if(!game.alive)lose();
    }requestAnimationFrame(frame);
  }
  resize();requestAnimationFrame(frame);
})();
