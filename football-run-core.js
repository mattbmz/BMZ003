/* Physics and obstacle generation, independent of the page. */
'use strict';
(function(root) {
  const FLOOR = 394, R = 25, PX = 160, GRAVITY = 2400, JUMP = -920;
  function circleRect(cx, cy, r, box) {
    const x = Math.max(box.x, Math.min(cx, box.x + box.w));
    const y = Math.max(box.y, Math.min(cy, box.y + box.h));
    return (cx-x)**2 + (cy-y)**2 < r*r;
  }
  function circlePolygon(cx, cy, r, points) {
    let inside = false;
    for (let i=0,j=points.length-1;i<points.length;j=i++) {
      const a=points[j],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1];
      const t=Math.max(0,Math.min(1,((cx-a[0])*dx+(cy-a[1])*dy)/(dx*dx+dy*dy)));
      if ((cx-a[0]-t*dx)**2+(cy-a[1]-t*dy)**2 < r*r) return true;
      if ((a[1]>cy)!==(b[1]>cy) && cx<(b[0]-a[0])*(cy-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
    }
    return inside;
  }
  function create(random = Math.random) {
    const g={width:1100,x:PX,y:FLOOR-R,vy:0,speed:540,travel:0,time:0,objects:[],alive:true,grounded:true,buffer:0,coyote:.075,nextX:1050,section:0,support:null,events:[]};
    g.jump=()=>{g.buffer=.12;};
    g.add=(kind,x,w,h,extra={})=>{const o={kind,x,w,h,base:FLOOR,top:FLOOR-h,...extra};g.objects.push(o);return o;};
    // Every route crosses a real void. The green decks are required footholds.
    g.route=function(x,variant=0){
      const scale=g.speed/540;
      const profiles=[[344,280,216,260,322],[330,230,300,210,320],[340,270,200,270,340]];
      const heights=profiles[variant%3], stride=450*scale, deck=340*scale;
      const end=x+4*stride+deck;
      g.add('gap',x+95*scale,end-x,0);
      heights.forEach((top,i)=>g.add('platform',x+i*stride,deck,34,{top,originTop:top,float:true,amp:variant===2&&i%2===1?13:0,phase:i*1.4}));
      // Blades hang below the landing surfaces: missing a jump has a visible danger.
      for(let i=0;i<4;i++)g.add('saw',x+(i+.85)*stride,48,48,{anchorY:420,cy:420,amp:14,phase:i});
      return end+95*scale;
    };
    g.generate=function(){
      const scale=g.speed/540;
      if(g.section%2===0){g.nextX=g.route(g.nextX,Math.floor(g.section/2)%3)+440*scale;}
      else{
        const types=['hurdle','spikes','ball','saw'];
        const first=types[Math.floor(random()*types.length)];
        const spawn=(type,x)=>{
          if(type==='spikes'){for(let i=0;i<3;i++)g.add('spike',x+i*40,40,50+(i%2)*16);}
          if(type==='hurdle')g.add('hurdle',x,110,86);
          if(type==='ball')g.add('ball',x,64,64,{phase:random()*6});
          if(type==='saw')g.add('saw',x,62,62,{anchorY:FLOOR-35,cy:FLOOR-35,amp:12,phase:0});
        };
        spawn(first,g.nextX);spawn(types[(types.indexOf(first)+1)%4],g.nextX+680*scale);
        g.nextX+=1430*scale;
      }
      g.section++;
    };
    g.step=function(dt){
      if(!g.alive)return;
      g.time+=dt;g.speed=540+320*(1-Math.exp(-g.time/60));
      const dx=g.speed*dt;g.travel+=dx;g.nextX-=dx;g.buffer-=dt;
      g.objects.forEach(o=>{o.x-=dx;o.previousTop=o.top;if(o.kind==='platform'&&o.amp)o.top=o.originTop+Math.sin(g.time*2+o.phase)*o.amp;});
      while(g.nextX<g.width+1500)g.generate();
      if(g.support&&g.grounded){g.y+=g.support.top-g.support.previousTop;}
      if(g.grounded)g.coyote=.075;else g.coyote-=dt;
      if(g.buffer>0&&g.coyote>0){g.vy=JUMP;g.grounded=false;g.support=null;g.coyote=0;g.buffer=0;g.events.push('jump');}
      const oldBottom=g.y+R,wasGrounded=g.grounded;
      g.vy+=GRAVITY*dt;g.y+=g.vy*dt;g.grounded=false;g.support=null;
      const platforms=g.objects.filter(o=>o.kind==='platform').sort((a,b)=>a.top-b.top);
      for(const o of platforms){
        if(g.x+R-7>o.x&&g.x-R+7<o.x+o.w&&g.vy>=0&&oldBottom<=(o.previousTop??o.top)+3&&g.y+R>=o.top){g.y=o.top-R;g.vy=0;g.grounded=true;g.support=o;break;}
      }
      const overGap=g.objects.some(o=>o.kind==='gap'&&g.x>o.x&&g.x<o.x+o.w);
      if(!overGap&&g.vy>=0&&oldBottom<=FLOOR+6&&g.y+R>=FLOOR){g.y=FLOOR-R;g.vy=0;g.grounded=true;}
      if(g.grounded&&!wasGrounded)g.events.push('land');
      const r=R-4;
      for(const o of g.objects){let hit=false;
        if(o.kind==='spike'||o.kind==='cone')hit=circlePolygon(g.x,g.y,r,[[o.x,o.base],[o.x+o.w/2,o.base-o.h],[o.x+o.w,o.base]]);
        if(o.kind==='crate'||o.kind==='hurdle')hit=circleRect(g.x,g.y,r,{x:o.x+3,y:o.base-o.h,w:o.w-6,h:o.h});
        if(o.kind==='ball'||o.kind==='saw'){
          o.cy=o.kind==='ball'?FLOOR-o.w/2-20*(1+Math.sin(g.time*5+o.phase)):o.anchorY+Math.sin(g.time*3+o.phase)*o.amp;
          hit=(g.x-o.x-o.w/2)**2+(g.y-o.cy)**2<(r+o.w/2-4)**2;
        }
        if(hit)g.alive=false;
      }
      if(g.y>540)g.alive=false;
      g.objects=g.objects.filter(o=>o.x+o.w>-100);
    };
    return g;
  }
  function recordCrossed(score,initial,announced){return !announced&&score>initial;}
  const api={create,FLOOR,R,PX,circleRect,circlePolygon,recordCrossed};
  if(typeof module!=='undefined')module.exports=api;else root.FootballRun=api;
})(typeof window!=='undefined'?window:globalThis);
