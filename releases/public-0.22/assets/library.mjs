document.documentElement.classList.add('js');
const $=(s,r=document)=>r.querySelector(s);
const norm=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[\s.,:·'’‘“”()\-]/g,'');
const live=s=>{const n=$('#live');if(n)n.textContent=s;};
const menu=$('.menu-toggle'),nav=$('#site-nav');
if(menu){menu.hidden=false;menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'메뉴 닫기':'메뉴 열기');});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open'))menu.click();});}

// Preserve links handed out by the initial hash-routed prototype.
if(location.hash.startsWith('#/')){
  const [route,query='']=location.hash.slice(2).split('?');const params=new URLSearchParams(query);const [kind,id]=route.split('/');
  let target='index.html';
  if(kind==='read'&&id){target='works/'+encodeURIComponent(id)+'/index.html';const ref=params.get('p');if(ref)target+='#p-'+ref.replaceAll('.','-');}
  else if(kind==='bible')target='bible/index.html'+(query?'?'+query:'');
  else if(kind==='topics')target='topics/'+(id?encodeURIComponent(id)+'/':'')+'index.html';
  else if(kind==='about')target='about/index.html';
  else if(kind==='library')target='index.html'+(query?'?'+query:'');
  location.replace("/releases/public-0.22/"+target);
}

const catalog=$('.catalog-page');
if(catalog){
  const params=new URLSearchParams(location.search);let corpus=params.get('corpus')||params.get('group')||'all',author=params.get('author')||'all';
  const input=$('#q');input.value=params.get('q')||'';const rows=[...document.querySelectorAll('.catalog-row')];
  const refresh=(update=true)=>{
    let total=0;const q=norm(input.value.trim());
    for(const row of rows){const visible=(corpus==='all'||row.dataset.corpus===corpus)&&(author==='all'||row.dataset.author===author)&&(!q||norm(row.dataset.search).includes(q));row.hidden=!visible;if(visible)total++;}
    $('.result-count').textContent=total+'편';$('.empty-result').hidden=total!==0;
    document.querySelectorAll('[data-filter-group] a').forEach(a=>{const group=a.closest('[data-filter-group]').dataset.filterGroup;a.setAttribute('aria-current',String(a.dataset.filter===(group==='corpus'?corpus:author)));});
    if(update){const p=new URLSearchParams();if(input.value.trim())p.set('q',input.value.trim());if(corpus!=='all')p.set('corpus',corpus);if(author!=='all')p.set('author',author);history.replaceState(null,'',location.pathname+(p.size?'?'+p:''));}
  };
  input.addEventListener('input',()=>refresh());$('.search').addEventListener('submit',e=>{e.preventDefault();refresh();live($('.result-count').textContent);});
  document.querySelectorAll('[data-filter-group] a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const group=a.closest('[data-filter-group]').dataset.filterGroup;if(group==='corpus')corpus=a.dataset.filter;else author=a.dataset.filter;refresh();}));
  refresh(false);
}

const bookNames={막:'마가복음',고전:'고린도전서',행:'사도행전',롬:'로마서',갈:'갈라디아서',살전:'데살로니가전서',눅:'누가복음',빌:'빌립보서',몬:'빌레몬서',고후:'고린도후서'};
function parseBible(input){let s=input;for(const [a,b] of Object.entries(bookNames))s=s.replace(b,a);const m=s.trim().match(/^([가-힣]+)\s*(\d+)(?::(\d+)(?:-(\d+))?)?$/);return m?{book:m[1],chapter:+m[2],start:+(m[3]||0),end:+(m[4]||m[3]||999)}:null;}
if($('#bible-search')){
  const input=$('#bible-q');input.value=new URLSearchParams(location.search).get('q')||'';const rows=[...document.querySelectorAll('.bible-row')];
  const refresh=()=>{let count=0;const q=input.value.trim(),search=parseBible(q);for(const row of rows){const ref=row.dataset.reference,actual=parseBible(ref);let show=!q;if(q&&actual&&search)show=actual.book===search.book&&actual.chapter===search.chapter&&actual.start<=search.end&&search.start<=actual.end;else if(q)show=norm(ref+' '+bookNames[actual?.book]).includes(norm(q));row.hidden=!show;if(show)count++;}$('.bible-count').textContent=count+'개 연결';$('.empty-result').hidden=count!==0;history.replaceState(null,'',location.pathname+(q?'?q='+encodeURIComponent(q):''));};
  input.addEventListener('input',refresh);$('#bible-search').addEventListener('submit',e=>{e.preventDefault();refresh();});refresh();
}

if($('.reader')){
  const store=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
  const read=(key,fallback)=>{try{return localStorage.getItem(key)||fallback;}catch{return fallback;}};
  let scale=Number(read('nt-reading-scale','100'));if(!Number.isFinite(scale)||scale<85||scale>140)scale=100;
  const fonts=$('.font-controls');fonts.hidden=false;
  function setSize(){document.documentElement.style.setProperty('--reader-size',(18*scale/100)+'px');$('#font-size').textContent=scale+'%';$('[data-size="-1"]').disabled=scale<=85;$('[data-size="1"]').disabled=scale>=140;store('nt-reading-scale',String(scale));}
  document.querySelectorAll('[data-size]').forEach(b=>b.addEventListener('click',()=>{scale=b.dataset.size==='reset'?100:Math.max(85,Math.min(140,scale+Number(b.dataset.size)*5));setSize();}));setSize();
  const source=$('.source-toggle');source.hidden=false;const toggle=$('#show-original');toggle.checked=read('nt-reading-original','true')==='true';
  const setSource=()=>{document.body.classList.toggle('hide-source',!toggle.checked);store('nt-reading-original',String(toggle.checked));};toggle.addEventListener('change',setSource);setSource();
  document.querySelectorAll('.chapter-menu a').forEach(a=>a.addEventListener('click',()=>a.closest('details').open=false));
  const passageIndexes=new Map([...document.querySelectorAll('.passage')].map((p,i)=>[p.dataset.ref,i]));
  const markRange=ref=>{const i=passageIndexes.get(ref);document.querySelectorAll('[data-chapter-link]').forEach(a=>a.setAttribute('aria-current',String(i!==undefined&&i>=Number(a.dataset.rangeStart)&&i<=Number(a.dataset.rangeEnd))));};
  const columnLinks=[...document.querySelectorAll('.chapter-index a[data-source-column]')];
  const lineTargets=[...document.querySelectorAll('.original [id][data-source-column]')];
  const passages=[...document.querySelectorAll('.passage')];
  const markColumn=column=>document.querySelectorAll('[data-chapter-link][data-source-column]').forEach(a=>a.setAttribute('aria-current',String(a.dataset.sourceColumn===column)));
  function targetHash(){let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}const target=document.getElementById(id);if(!target)return;if(id.startsWith('note-')){const details=target.closest('details');if(details)details.open=true;}const ref=target.closest('[data-ref]')?.dataset.ref;markRange(ref);if(target.dataset.sourceColumn)markColumn(target.dataset.sourceColumn);requestAnimationFrame(()=>{target.scrollIntoView({block:'start'});scheduleRange();});}
  let frame=null;
  function refreshRange(){
    frame=null;const y=innerHeight*.18;
    if(columnLinks.length&&!document.body.classList.contains('hide-source')){
      const positions=lineTargets.map(target=>({target,top:target.getBoundingClientRect().top}));
      const before=positions.filter(x=>x.top<=y);const selected=before.at(-1)||positions[0];
      if(selected)markColumn(selected.target.dataset.sourceColumn);
      return;
    }
    const positions=passages.map(target=>({target,rect:target.getBoundingClientRect()}));
    const selected=positions.find(x=>x.rect.top<=y&&x.rect.bottom>y)||positions.find(x=>x.rect.top>y);
    if(selected)markRange(selected.target.dataset.ref);
  }
  function scheduleRange(){if(frame===null)frame=requestAnimationFrame(refreshRange);}
  window.addEventListener('hashchange',targetHash);targetHash();
  window.addEventListener('scroll',scheduleRange,{passive:true});window.addEventListener('resize',scheduleRange);
  toggle.addEventListener('change',scheduleRange);
  if('IntersectionObserver' in window){const observer=new IntersectionObserver(scheduleRange,{rootMargin:'-10% 0px -70% 0px'});passages.forEach(p=>observer.observe(p));}
  scheduleRange();
}
