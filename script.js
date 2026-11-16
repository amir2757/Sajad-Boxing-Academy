(function(){
var KEY='sajad-week-v1';
var DAYS=['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];
var sample=[
  {n:'طناب زدن',w:5,r:1},{n:'شدو بوکس',w:5,r:1},{n:'ضربه به کیسه',w:5,r:1},
  {n:'پنجه‌گیری',w:5,r:1},{n:'حرکات پا',w:5,r:1},{n:'کششی',w:5,r:1}
];
var plans=DAYS.map(function(){return sample.map(function(e){return {n:e.n,w:e.w,r:e.r}})});
try{var s=localStorage.getItem(KEY);if(s){var p=JSON.parse(s);if(Array.isArray(p)&&p.length===7)plans=p;}}catch(e){}
var day=(new Date().getDay()+1)%7; /* امروز: شنبه=۰ ... جمعه=۶ */
var plan=plans[day];
function save(){try{localStorage.setItem(KEY,JSON.stringify(plans));}catch(e){}}
function renderDays(){
  document.getElementById('days').innerHTML=DAYS.map(function(d,i){
    return '<button type="button" role="tab" class="day'+(i===day?' sel':'')+'" data-day="'+i+'" aria-selected="'+(i===day)+'">'+d+'<small>'+plans[i].length+' حرکت</small></button>';
  }).join('');
  document.getElementById('dayTitle').textContent='برنامه '+DAYS[day];
}

var $=function(i){return document.getElementById(i)};
var listEl=$('list'),timeEl=$('time'),phaseEl=$('phase'),nowEl=$('now'),ringEl=$('ring'),fg=$('fg'),startBtn=$('start');
var C=2*Math.PI*45;fg.style.strokeDasharray=C;

var st={running:false,idx:0,phase:'work',total:0,left:0,end:0,started:false,iv:null};

function fmt(sec){sec=Math.max(0,Math.ceil(sec));var m=Math.floor(sec/60),s=sec%60;return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}
function esc(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]});}

function render(){
  renderDays();
  if(!plan.length){listEl.innerHTML='<div class="empty">هنوز حرکتی اضافه نشده. یک حرکت اضافه کنید.</div>';}
  else listEl.innerHTML=plan.map(function(e,i){
    var cls='row'+(st.started&&i===st.idx?' active':'')+(st.started&&i<st.idx?' done':'');
    return '<div class="'+cls+'"><span class="idx">'+(i+1)+'</span>'+
    '<input data-i="'+i+'" data-f="n" value="'+esc(e.n)+'" aria-label="نام حرکت '+(i+1)+'">'+
    '<input type="number" min="0" step="0.5" data-i="'+i+'" data-f="w" value="'+e.w+'" aria-label="دقیقه تمرین">'+
    '<input type="number" min="0" step="0.5" data-i="'+i+'" data-f="r" value="'+e.r+'" aria-label="دقیقه استراحت">'+
    '<button class="del" data-del="'+i+'" aria-label="حذف حرکت">✕</button></div>';
  }).join('');
  var t=plan.reduce(function(a,e){return a+(+e.w||0)+(+e.r||0)},0);
  $('total').textContent='مجموع: '+t+' دقیقه';
}
listEl.addEventListener('input',function(ev){
  var t=ev.target,i=t.dataset.i;if(i==null)return;
  plan[i][t.dataset.f]=t.dataset.f==='n'?t.value:Math.max(0,parseFloat(t.value)||0);
  save();var tt=plan.reduce(function(a,e){return a+(+e.w||0)+(+e.r||0)},0);$('total').textContent='مجموع: '+tt+' دقیقه';
});
listEl.addEventListener('click',function(ev){
  var d=ev.target.dataset.del;if(d==null)return;
  plan.splice(+d,1);if(st.started){if(+d<st.idx)st.idx--;else if(+d===st.idx)loadPhase(false);}
  save();render();
});
$('add').onclick=function(){plan.push({n:'حرکت '+(plan.length+1),w:5,r:1});save();render();var ins=listEl.querySelectorAll('input[data-f=n]');if(ins.length)ins[ins.length-1].select();};

/* alarm */
var ac=null;
function ctx(){try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();}catch(e){}return ac;}
function beep(f,t0,d){var a=ctx();if(!a)return;var o=a.createOscillator(),g=a.createGain();o.type='square';o.frequency.value=f;
  g.gain.setValueAtTime(0.0001,a.currentTime+t0);g.gain.exponentialRampToValueAtTime(.35,a.currentTime+t0+.02);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+t0+d);
  o.connect(g);g.connect(a.destination);o.start(a.currentTime+t0);o.stop(a.currentTime+t0+d+.05);}
function alarm(kind){
  if(kind==='rest'){beep(660,0,.25);beep(660,.35,.25);beep(660,.7,.25);}
  else if(kind==='work'){beep(880,0,.18);beep(1100,.22,.18);beep(1320,.44,.35);}
  else{[0,.4,.8,1.2].forEach(function(t){beep(1000,t,.3)});}
  try{navigator.vibrate&&navigator.vibrate([300,120,300]);}catch(e){}
}

/* timer */
function loadPhase(autoStart){
  var e=plan[st.idx];if(!e){return finish();}
  st.total=Math.round((st.phase==='work'?+e.w:+e.r)*60);
  st.left=st.total;st.end=Date.now()+st.left*1000;
  show();render();
}
function show(){
  var e=plan[st.idx];
  timeEl.textContent=fmt(st.left);
  fg.style.strokeDashoffset=st.total?C*(1-st.left/st.total):0;
  ringEl.className='ring'+(st.phase==='rest'?' rest':'');
  phaseEl.className='phase '+st.phase;
  phaseEl.textContent=st.phase==='work'?'تمرین':'استراحت';
  nowEl.textContent=e?(st.idx+1)+' از '+plan.length+' — '+e.n:'';
}
function next(){
  var e=plan[st.idx];
  if(st.phase==='work'&&e&&+e.r>0){st.phase='rest';alarm('rest');}
  else{
    st.idx++;st.phase='work';
    if(st.idx>=plan.length){alarm('end');return finish();}
    alarm('work');
  }
  loadPhase();
  if(st.total===0)next();
}
function tick(){
  if(!st.running)return;
  st.left=(st.end-Date.now())/1000;
  if(st.left<=0){st.left=0;show();next();return;}
  show();
}
function run(){clearInterval(st.iv);st.iv=setInterval(tick,200);}
function finish(){
  clearInterval(st.iv);st.running=false;st.started=false;st.idx=0;st.phase='work';
  phaseEl.className='phase';phaseEl.textContent='تمرین تمام شد. آفرین!';
  timeEl.textContent='00:00';fg.style.strokeDashoffset=0;nowEl.textContent='';startBtn.textContent='شروع دوباره';render();
}
startBtn.onclick=function(){
  ctx();
  if(!plan.length)return;
  if(!st.started){st.started=true;st.idx=0;st.phase='work';loadPhase();st.running=true;startBtn.textContent='مکث';run();alarm('work');return;}
  if(st.running){st.running=false;st.left=(st.end-Date.now())/1000;clearInterval(st.iv);startBtn.textContent='ادامه';}
  else{st.running=true;st.end=Date.now()+st.left*1000;startBtn.textContent='مکث';run();}
};
$('skip').onclick=function(){if(st.started){st.running=true;startBtn.textContent='مکث';run();next();}};
function resetAll(){
  clearInterval(st.iv);st.running=false;st.started=false;st.idx=0;st.phase='work';
  phaseEl.className='phase';phaseEl.textContent='آماده شروع';timeEl.textContent='00:00';fg.style.strokeDashoffset=0;
  nowEl.textContent='';startBtn.textContent='شروع تمرین';ringEl.className='ring';render();
}
$('reset').onclick=resetAll;
document.addEventListener('visibilitychange',tick);

/* galaxy stars */
(function(){
  var cv=$('stars'),g=cv.getContext('2d'),S=[];
  function size(){cv.width=innerWidth;cv.height=innerHeight;S=[];for(var i=0;i<130;i++)S.push({x:Math.random()*cv.width,y:Math.random()*cv.height,r:Math.random()*1.4+.3,p:Math.random()*6.28,s:Math.random()*.02+.005});draw();}
  var still=matchMedia('(prefers-reduced-motion:reduce)').matches;
  function draw(){g.clearRect(0,0,cv.width,cv.height);S.forEach(function(s){s.p+=s.s;g.globalAlpha=.35+.65*Math.abs(Math.sin(s.p));g.fillStyle='#fff';g.beginPath();g.arc(s.x,s.y,s.r,0,6.28);g.fill();});if(!still)requestAnimationFrame(draw);}
  addEventListener('resize',size);size();
})();

document.getElementById('days').addEventListener('click',function(ev){
  var b=ev.target.closest('[data-day]');if(!b)return;
  day=+b.dataset.day;plan=plans[day];resetAll();
});
$('clear').onclick=function(){if(!plan.length)return;if(confirm('همه حرکت‌های '+DAYS[day]+' پاک شود؟')){plan.length=0;save();resetAll();}};
render();
})();
