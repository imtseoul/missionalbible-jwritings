document.documentElement.classList.add('js');
const $=(s,r=document)=>r.querySelector(s);
// A query that starts with a Latin letter (an abbreviation such as Ant.) must not begin inside a longer Latin word (Plant.).
const hit=(text,q)=>{if(!/^[a-z]/.test(q))return text.includes(q);for(let i=text.indexOf(q);i>=0;i=text.indexOf(q,i+1))if(i===0||!/[a-z]/.test(text[i-1]))return true;return false;};
const norm=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().normalize('NFC').replace(/[\s.,:·'’‘“”()\-]/g,'');
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
  location.replace("/releases/public-0.36.2/"+target);
}

const narrow=window.matchMedia('(max-width:700px)');
for(const panel of document.querySelectorAll('.author-menu,.reading-settings'))panel.open=!narrow.matches;
narrow.addEventListener('change',()=>{for(const panel of document.querySelectorAll('.author-menu,.reading-settings'))panel.open=!narrow.matches;});
document.addEventListener('keydown',e=>{if(e.key==='Escape')for(const panel of document.querySelectorAll('.chapter-menu,.reading-settings,.author-menu'))if(narrow.matches&&panel.open){panel.open=false;panel.querySelector('summary')?.focus();}});
const catalog=$('.catalog-page');
if(catalog){
  const params=new URLSearchParams(location.search);let corpus=params.get('corpus')||params.get('group')||'all',author=params.get('author')||'all';
  const input=$('#q');input.value=params.get('q')||'';const rows=[...document.querySelectorAll('.catalog-row')];
  const metadata=new Map(rows.map(row=>[row.dataset.work,norm(row.dataset.search)]));
  let bodyIndex=null,bodyRequest=null,bodyFailed=false;
  const loadBodyIndex=()=>{
    if(bodyRequest)return;
    bodyRequest=fetch(new URL('../data/search.json',import.meta.url)).then(response=>{
      if(!response.ok)throw Error('Search index request failed');
      return response.json();
    }).then(data=>{
      if(data.schema_version!=='ancient-library-search-1'||!rows.every(row=>typeof data.works?.[row.dataset.work]==='string'))throw Error('Search index format differs');
      bodyIndex=new Map(Object.entries(data.works));bodyFailed=false;refresh(false);
    }).catch(()=>{bodyRequest=null;bodyFailed=true;refresh(false);});
  };
  const refresh=(update=true)=>{
    let total=0;const q=norm(input.value.trim());
    const loading=Boolean(q&&!bodyIndex&&!bodyFailed);
    // Title, author and abbreviation matches come first; works found only in the text open with the more button.
    const filtered=rows.filter(row=>(corpus==='all'||row.dataset.corpus===corpus)&&(author==='all'||row.dataset.author===author));
    const byMeta=new Set(q?filtered.filter(row=>hit(metadata.get(row.dataset.work),q)):filtered);
    const byBody=q&&bodyIndex?filtered.filter(row=>!byMeta.has(row)&&hit(bodyIndex.get(row.dataset.work),q)):[];
    const showBody=expanded||byMeta.size===0;
    for(const row of rows){const visible=byMeta.has(row)||(showBody&&byBody.includes(row));row.hidden=!visible;if(visible)total++;}
    more.hidden=showBody||!byBody.length;more.textContent='본문·주제에서 찾은 '+byBody.length+'편 더 보기';
    // Author and corpus headings follow their works: a heading with no visible work is hidden.
    for(const group of document.querySelectorAll('.author-group'))group.hidden=!group.querySelector('.catalog-row:not([hidden])');
    for(const group of document.querySelectorAll('.corpus-group'))group.hidden=!group.querySelector('.author-group:not([hidden])');
    $('.catalog-results').setAttribute('aria-busy',String(loading));
    $('.result-count').textContent=loading?'본문 검색 중…':total+'편'+(q&&bodyFailed?' · 문헌 정보 검색 결과입니다. 본문 검색을 불러오지 못했습니다.':'');$('#selected-author').textContent=author==='all'?'전체 저자':author;$('.empty-result').hidden=loading||total!==0;
    document.querySelectorAll('[data-filter-group] a').forEach(a=>{const group=a.closest('[data-filter-group]').dataset.filterGroup;a.setAttribute('aria-current',String(a.dataset.filter===(group==='corpus'?corpus:author)));});
    if(update){const p=new URLSearchParams();if(input.value.trim())p.set('q',input.value.trim());if(corpus!=='all')p.set('corpus',corpus);if(author!=='all')p.set('author',author);history.replaceState(null,'',location.pathname+(p.size?'?'+p:''));}
    if(loading)loadBodyIndex();
  };
  const more=document.createElement('button');more.type='button';more.className='more-results';more.hidden=true;$('.result-count').after(more);
  let expanded=false;more.addEventListener('click',()=>{expanded=true;refresh(false);live($('.result-count').textContent);});
  input.addEventListener('input',()=>{bodyFailed=false;expanded=false;refresh();});$('.search').addEventListener('submit',e=>{e.preventDefault();bodyFailed=false;refresh();live($('.result-count').textContent);});
  document.querySelectorAll('[data-filter-group] a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const group=a.closest('[data-filter-group]').dataset.filterGroup;if(group==='corpus')corpus=a.dataset.filter;else{author=a.dataset.filter;if(narrow.matches)a.closest('details').open=false;}refresh();}));
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
  document.querySelectorAll('.reading-tools>details').forEach(panel=>panel.addEventListener('toggle',()=>{if(narrow.matches&&panel.open)document.querySelectorAll('.reading-tools>details').forEach(other=>{if(other!==panel)other.open=false;});}));
  document.addEventListener('click',e=>{if(narrow.matches&&!e.target.closest('.reading-tools'))document.querySelectorAll('.reading-tools>details').forEach(panel=>panel.open=false);});
  document.querySelectorAll('.chapter-menu a').forEach(a=>a.addEventListener('click',()=>a.closest('.chapter-menu').open=false));
  const reader=$('.reader'),passages=[...document.querySelectorAll('.passage')];
  const passageIndexes=new Map(passages.map((p,i)=>[p.dataset.ref,i]));
  // The text is one tab stop: up and down move between passages, right or Enter explores the phrase alignment.
  const noteLinks=new Map();
  for(const passage of passages){const link=passage.querySelector('.note-link');if(link){link.tabIndex=-1;noteLinks.set(passage,link);}}
  for(const unit of reader.querySelectorAll('[data-align]'))unit.tabIndex=-1;
  const keys=document.createElement('p');keys.id='reader-keys';keys.className='sr-only';keys.textContent='위아래 화살표로 대목을 옮깁니다. 오른쪽 화살표나 Enter로 표현 대응을 살펴보고 Esc로 대목에 돌아옵니다.';reader.append(keys);
  let roving=null,hinted=false;
  function setRoving(passage){
    if(!passage||passage===roving)return;
    if(roving){roving.removeAttribute('tabindex');roving.removeAttribute('aria-label');roving.removeAttribute('aria-describedby');noteLinks.get(roving)?.setAttribute('tabindex','-1');}
    roving=passage;passage.tabIndex=0;passage.setAttribute('aria-label',passage.querySelector('.passage-number').textContent.trim());
    if(!hinted)passage.setAttribute('aria-describedby','reader-keys');
    noteLinks.get(passage)?.removeAttribute('tabindex');
  }
  setRoving(passages[0]);
  reader.addEventListener('focusin',e=>{const passage=e.target.closest?.('.passage');if(passage)setRoving(passage);});
  reader.addEventListener('keydown',e=>{
    const passage=e.target;if(!passage.classList?.contains('passage')||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)return;
    if(e.key==='ArrowRight'||e.key==='Enter'){const unit=passage.querySelector('.translation [data-align]');if(unit){e.preventDefault();unit.focus();}return;}
    const i=passageIndexes.get(passage.dataset.ref);
    const next=e.key==='ArrowDown'?passages[i+1]:e.key==='ArrowUp'?passages[i-1]:e.key==='Home'?passages[0]:e.key==='End'?passages.at(-1):undefined;
    if(next===undefined&&!['ArrowDown','ArrowUp'].includes(e.key))return;
    e.preventDefault();if(!next)return;
    if(!hinted){hinted=true;passage.removeAttribute('aria-describedby');}
    setRoving(next);next.focus();
  });
  const chapterLinks=[...document.querySelectorAll('[data-chapter-link]')],rangeGroups=new Map(),columnGroups=new Map();
  for(const link of chapterLinks){
    const key=link.dataset.rangeStart+':'+link.dataset.rangeEnd;
    if(!rangeGroups.has(key))rangeGroups.set(key,{start:Number(link.dataset.rangeStart),end:Number(link.dataset.rangeEnd),links:[]});
    rangeGroups.get(key).links.push(link);link.setAttribute('aria-current','false');
    if(link.dataset.sourceColumn){if(!columnGroups.has(link.dataset.sourceColumn))columnGroups.set(link.dataset.sourceColumn,[]);columnGroups.get(link.dataset.sourceColumn).push(link);}
  }
  const ranges=[...rangeGroups.values()];let markedLinks=[],openBook=null;
  // Multi-book works: a row of book buttons stays on top of the index and shows one book's ranges at a time.
  const showBook=book=>{for(const group of document.querySelectorAll('.nav-book'))group.open=group.dataset.book===book;for(const button of document.querySelectorAll('.nav-book-switch button'))button.setAttribute('aria-pressed',String(button.dataset.book===book));};
  for(const index of document.querySelectorAll('.grouped-nav')){
    const switcher=document.createElement('div');switcher.className='nav-book-switch';switcher.setAttribute('role','group');switcher.setAttribute('aria-label','권 선택');
    for(const group of index.querySelectorAll('.nav-book')){const button=document.createElement('button');button.type='button';button.textContent=button.dataset.book=group.dataset.book;button.setAttribute('aria-pressed',String(group.open));button.addEventListener('click',()=>showBook(group.dataset.book));switcher.append(button);}
    index.prepend(switcher);
  }
  // The book being read opens when the reading position enters it.
  const followBook=links=>{const group=links[0]?.closest('.nav-book');if(!group||group.dataset.book===openBook)return;openBook=group.dataset.book;showBook(openBook);};
  const position=$('.tools-range');
  const showPosition=link=>{if(!position)return;const book=link?.closest('.nav-book')?.dataset.book,label=link?.textContent.trim()||'';position.textContent=book&&!label.includes(book)?book+' '+label:label;};
  const markLinks=links=>{if(links===markedLinks)return;for(const link of markedLinks)link.setAttribute('aria-current','false');for(const link of links)link.setAttribute('aria-current','true');markedLinks=links;followBook(links);showPosition(links[0]);};
  function firstAfter(items,before){let lo=0,hi=items.length;while(lo<hi){const mid=(lo+hi)>>>1;if(before(items[mid]))lo=mid+1;else hi=mid;}return lo;}
  const markRange=ref=>{const i=passageIndexes.get(ref);const range=i===undefined?null:ranges[firstAfter(ranges,r=>r.end<i)];markLinks(range&&range.start<=i?range.links:[]);};
  const columnLinks=[...document.querySelectorAll('.chapter-index a[data-source-column]')];
  const lineTargets=[...document.querySelectorAll('.original [id][data-source-column]')];
  const markColumn=column=>markLinks(columnGroups.get(column)||[]);
  // Long works are split into book (or letter-group) pages; an address for another part moves there.
  const partFor=id=>{if(!reader.dataset.parts)return null;const m=id.match(/^(?:p|note)-(\d+)/);if(!m)return null;const n=Number(m[1]),parts=JSON.parse(reader.dataset.parts);
    if(reader.dataset.partScheme==='book')return parts[m[1]]??null;
    for(const [key,path] of Object.entries(parts)){const [a,b=a]=key.split('-').map(Number);if(n>=a&&n<=b)return path;}return null;};
  function targetHash(){let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}const target=document.getElementById(id);if(!target){const path=partFor(id);if(path)location.replace(reader.dataset.partRoot+path+'#'+id);return;}if(id.startsWith('note-')){const details=target.closest('details');if(details)details.open=true;}const ref=target.closest('[data-ref]')?.dataset.ref;markRange(ref);if(target.dataset.sourceColumn)markColumn(target.dataset.sourceColumn);requestAnimationFrame(()=>{target.scrollIntoView({block:'start'});scheduleRange();});}
  let frame=null;
  function refreshRange(){
    frame=null;const y=innerHeight*.18;
    const selected=passages[Math.min(passages.length-1,firstAfter(passages,target=>target.getBoundingClientRect().bottom<=y))];
    if(selected&&!reader.contains(document.activeElement))setRoving(selected);
    if(columnLinks.length&&!document.body.classList.contains('hide-source')){
      const line=lineTargets[Math.max(0,firstAfter(lineTargets,target=>target.getBoundingClientRect().top<=y)-1)];
      if(line)markColumn(line.dataset.sourceColumn);
      return;
    }
    if(selected)markRange(selected.dataset.ref);
  }
  function scheduleRange(){if(frame===null)frame=requestAnimationFrame(refreshRange);}
  window.addEventListener('hashchange',targetHash);targetHash();
  window.addEventListener('scroll',scheduleRange,{passive:true});window.addEventListener('resize',scheduleRange);
  toggle.addEventListener('change',scheduleRange);
  if('ResizeObserver' in window)new ResizeObserver(scheduleRange).observe($('.reader'));
  document.fonts?.ready.then(scheduleRange);
  scheduleRange();
}

// Back to top: appears once the reader has scrolled a screen or more.
{
  const top=document.createElement('button');top.type='button';top.className='to-top';top.hidden=true;top.textContent='맨 위로';top.setAttribute('aria-label','맨 위로 이동');document.body.append(top);
  let shown=false,queued=false;
  const update=()=>{queued=false;const on=scrollY>innerHeight*1.2;if(on!==shown){shown=on;top.hidden=!on;}};
  addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(update);}},{passive:true});update();
  top.addEventListener('click',()=>{scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});(document.querySelector('h1')||document.body).focus?.({preventScroll:true});});
}
