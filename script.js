(() => {
  'use strict';
  const SHEET_ID = '1VedCZeT903VN71HMJ9zK1w1MNROpfxoZmTwAPhNWZL4';
  const SHEET_GID = '0'; // 如資料位於其他分頁，改成該分頁 URL 中的 gid
  const TABLE_COLS = 7; // 網頁僅展示 A-G，且所有表頭均取自試算表
  const ROW_WIDTH = 13; // 讀取至 M 欄以支援 L/M 設定
  const CONFIG_KEY = 11; // L
  const CONFIG_VALUE = 12; // M
  const DEFAULT_TITLE = '蘇菲の存鑽與存歌';
  const DEFAULT_SUBTITLE = '';
  const $ = id => document.getElementById(id);
  const clean = v => String(v ?? '').replace(/[\u200b-\u200d\u2060\ufeff]/g, '').trim();
  const lower = v => clean(v).toLocaleLowerCase('zh-Hant-TW');
  const state = {records:[], headers:[], loaded:false, revision:0, controller:null};
  const FALLBACK_HEADERS = ['帳號','名字','歌','試音','鑽','單','更新時間'];
  const fmt = new Intl.NumberFormat('zh-Hant-TW');

  function readCell(c) {
    // 顯示格式字串優先；日期 / 數字保留在 Sheets 中的格式
    return clean(c?.f != null ? c.f : c?.v != null ? c.v : '');
  }
  function gvizToGrid(table) {
    if (!table || !Array.isArray(table.rows)) throw new Error('Google 試算表回傳格式不正確');
    return {
      labels:Array.from({length:ROW_WIDTH}, (_,i)=>clean(table.cols?.[i]?.label)),
      rows:table.rows.map(row=>Array.from({length:ROW_WIDTH},(_,i)=>readCell(row?.c?.[i])))
    };
  }
  function csvToGrid(input) {
    if (/^\s*<!doctype html|^\s*<html/i.test(input)) throw new Error('取得 HTML 而非試算表，請檢查公開權限');
    const rows=[]; let row=[], cell='', quoted=false;
    input=input.replace(/^\ufeff/,'');
    for (let i=0;i<input.length;i++) {
      const x=input[i], next=input[i+1];
      if(x==='"' && quoted && next==='"') {cell+='"';i++;}
      else if(x==='"') quoted=!quoted;
      else if(x===',' && !quoted) {row.push(cell);cell='';}
      else if((x==='\r'||x==='\n') && !quoted) {if(x==='\r'&&next==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}
      else cell+=x;
    }
    if(quoted) throw new Error('CSV 引號格式不完整');
    row.push(cell);
    if(row.some(v=>clean(v)) || !rows.length)rows.push(row);
    return {labels:[],rows:rows.map(r=>Array.from({length:ROW_WIDTH},(_,i)=>clean(r[i])))};
  }
  function configType(k) {
    const key=lower(k).replace(/[\s：:（）()_\-]/g,'');
    if(['網站標題','網頁標題','主標題','網站主標題','網站大標題','大標題','網站名稱','sitetitle','maintitle','title'].includes(key)) return 'title';
    if(['網站小標題','網頁小標題','小標題','副標題','網站副標題','網頁副標題','sitesubtitle','subtitle'].includes(key)) return 'subtitle';
    return null;
  }
  function renameLegacy(text){return clean(text).replace(/Neni/gi,'蘇菲').replace(/存鑽存歌/g,'存鑽與存歌');}
  function extractTitles(rows) {
    const config=new Map();
    for(const row of rows){const type=configType(row[CONFIG_KEY]);if(type)config.set(type,renameLegacy(row[CONFIG_VALUE]));}
    return {title:config.get('title')||DEFAULT_TITLE,subtitle:config.has('subtitle')?config.get('subtitle'):DEFAULT_SUBTITLE};
  }
  function isGenericLabel(s,i){return !s || /^(?:Col(?:umn)?\s*\d+|[A-M])$/i.test(s) || s===String.fromCharCode(65+i);}
  function parseGrid({rows,labels=[]}){
    // 首列 A-G 為真正表頭，不交給 Google 自行猜測資料型別。
    // 若 CSV 不可用而使用 GViz，優先還原 cols.label 裡的表頭。
    const firstRowIndex=rows.findIndex(row => clean(row[0]) === '帳號' && clean(row[1]) === '名字');
    const firstNonemptyIndex=rows.findIndex(row => Array.from({length:TABLE_COLS},(_,i)=>clean(row[i])).some(Boolean));
    const at=firstRowIndex>=0?firstRowIndex:firstNonemptyIndex;
    const dataHeader=at>=0?rows[at]:[];
    const sourceLabels=Array.from({length:TABLE_COLS},(_,i)=>clean(labels[i]));
    const gvizHeader=sourceLabels[0]==='帳號' && sourceLabels[1]==='名字';
    const headers=Array.from({length:TABLE_COLS},(_,i)=>
      clean(gvizHeader?sourceLabels[i]:dataHeader[i]) || FALLBACK_HEADERS[i]);
    const start=gvizHeader && firstRowIndex<0?0:at+1;
    const records=rows.slice(Math.max(0,start))
      // 只有名字的使用者也必須顯示，並且可以使用 B 欄搜尋。
      .filter(row=>clean(row[0]) || clean(row[1]))
      .filter(row=>!(clean(row[0])==='帳號'&&clean(row[1])==='名字'))
      .map(row=>Array.from({length:TABLE_COLS},(_,i)=>clean(row[i])));
    return {headers,records,titles:extractTitles(rows)};
  }
  function renderHeaders(headers){const head=$('tableHead');head.replaceChildren();headers.forEach(name=>{const th=document.createElement('th');th.scope='col';th.textContent=name;head.append(th);});}
  function showLoading(message){
    state.loaded=false;state.records=[];state.headers=[];
    $('siteTitle').textContent='';$('siteSubtitle').textContent='';
    $('siteTitle').setAttribute('aria-busy','true');document.title=DEFAULT_TITLE+'｜同步中';
    renderHeaders(FALLBACK_HEADERS);
    const td=document.createElement('td');td.colSpan=TABLE_COLS;td.textContent=message;
    const tr=document.createElement('tr');tr.className='empty-row';tr.append(td);
    $('tableBody').replaceChildren(tr);$('resultText').textContent=message;
  }
  function formatValue(value,i){
    if(i===0 || !/^[-+]?\d+(?:\.\d+)?$/.test(value.replace(/,/g,'')) || /^0\d/.test(value))return value;
    const n=Number(value.replace(/,/g,''));return Number.isFinite(n)?fmt.format(n):value;
  }
  function putValue(td,value){
    if(/^https?:\/\/\S+$/i.test(value)) {const a=document.createElement('a');a.href=value;a.target='_blank';a.rel='noopener noreferrer';a.textContent=value;td.append(a);}
    else td.textContent=value;
  }
  function render(){
    if(!state.loaded)return;
    const keyword=lower($('searchInput').value);
    const rows=keyword?state.records.filter(row=>lower(row[0]).includes(keyword) || lower(row[1]).includes(keyword)):state.records;
    renderHeaders(state.headers);const fragment=document.createDocumentFragment();
    if(!rows.length){const tr=document.createElement('tr');tr.className='empty-row';const td=document.createElement('td');td.colSpan=TABLE_COLS;td.textContent=keyword?'目前沒有符合條件的資料':'目前沒有可顯示的資料';tr.append(td);fragment.append(tr);}
    else rows.forEach(row=>{const tr=document.createElement('tr');row.forEach((value,i)=>{const td=document.createElement('td');if(i===0)td.className='name-cell';putValue(td,formatValue(value,i));tr.append(td);});fragment.append(tr);});
    $('tableBody').replaceChildren(fragment);
    $('resultText').textContent=keyword?`搜尋「${clean($('searchInput').value)}」：找到 ${rows.length} 筆資料。`: `目前共 ${rows.length} 筆資料。`;
  }
  function freshURL(source){const u=new URL(source);u.searchParams.set('_fresh',`${Date.now()}-${Math.random().toString(36).slice(2)}`);return u.href;}
  async function loadCSV(signal){
    const sources=[
      `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`,
      `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?gid=${SHEET_GID}&headers=0&tqx=out:csv`
    ];let last;
    for(const source of sources){
      try{
        const response=await fetch(freshURL(source),{cache:'no-store',credentials:'omit',signal,redirect:'follow',headers:{Accept:'text/csv,text/plain,*/*'}});
        if(!response.ok)throw new Error(`CSV HTTP ${response.status}`);
        return csvToGrid(await response.text());
      }catch(e){if(signal.aborted)throw e;last=e;}
    }
    throw last||new Error('CSV 讀取失敗');
  }
  function loadJSONP(signal){return new Promise((resolve,reject)=>{
    const cb=`__sophieSheets_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const tag=document.createElement('script');let finished=false;
    const cleanup=()=>{if(finished)return false;finished=true;clearTimeout(timer);delete window[cb];tag.remove();signal.removeEventListener('abort',abort);return true;};
    const abort=()=>{if(cleanup())reject(new DOMException('已取消舊請求','AbortError'));};
    const timer=setTimeout(()=>{if(cleanup())reject(new Error('試算表連線逾時'));},12000);
    window[cb]=response=>{if(!cleanup())return;if(!response||response.status==='error'){reject(new Error(response?.errors?.[0]?.message||'試算表查詢錯誤'));return;}try{resolve(gvizToGrid(response.table));}catch(e){reject(e);}};
    signal.addEventListener('abort',abort,{once:true});
    const url=new URL(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq`);
    url.searchParams.set('gid',SHEET_GID);url.searchParams.set('headers','0');url.searchParams.set('tq','select *');url.searchParams.set('tqx',`out:json;responseHandler:${cb}`);
    tag.src=freshURL(url.href);tag.onerror=()=>{if(cleanup())reject(new Error('無法連線試算表'));};document.body.append(tag);
    if(signal.aborted)abort();
  });}
  async function reload(){
    // 取消上一輪資料取得；請求序號阻止慢回覆覆蓋較新的結果。
    state.controller?.abort();const controller=new AbortController();state.controller=controller;
    const revision=++state.revision;showLoading('正在同步最新試算表資料…');
    try{
      let data;
      try{data=await loadCSV(controller.signal);}
      catch(e){if(controller.signal.aborted)return;console.warn('CSV 不可用，改用 Google Visualization：',e);data=await loadJSONP(controller.signal);}
      if(revision!==state.revision||controller.signal.aborted)return;
      const parsed=parseGrid(data);
      state.headers=parsed.headers;state.records=parsed.records;state.loaded=true;
      $('siteTitle').textContent=parsed.titles.title;$('siteSubtitle').textContent=parsed.titles.subtitle;
      document.title=parsed.titles.title;$('siteTitle').removeAttribute('aria-busy');render();
    }catch(e){if(revision===state.revision&&!controller.signal.aborted&&!document.hidden){console.error(e);showLoading('無法取得最新資料：請檢查試算表公開檢視權限及 gid。為避免顯示過期資料，已清空資料列表。');}}
  }
  document.addEventListener('DOMContentLoaded',()=>{
    $('searchInput').addEventListener('input',render);
    $('clearBtn').addEventListener('click',()=>{$('searchInput').value='';render();$('searchInput').focus();});
    showLoading('正在同步最新資料…');reload();
    window.addEventListener('pageshow',event=>{if(event.persisted)reload();});
    // 不使用計時器或分頁切換事件刷新；僅載入／手動重新整理時讀取。
    if('serviceWorker' in navigator)navigator.serviceWorker.getRegistrations().then(regs=>{
      const folder=new URL('./',location.href).pathname;
      regs.forEach(r=>{try{if(new URL(r.scope).pathname===folder)r.unregister();}catch(_){}});
    }).catch(()=>{});
  });
  if(typeof module!=='undefined'&&module.exports)module.exports={csvToGrid,gvizToGrid,parseGrid,extractTitles};
})();
