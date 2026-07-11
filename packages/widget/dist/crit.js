"use strict";var Crit=(()=>{var A=Object.defineProperty;var Q=Object.getOwnPropertyDescriptor;var Z=Object.getOwnPropertyNames;var tt=Object.prototype.hasOwnProperty;var et=(n,t)=>{for(var e in t)A(n,e,{get:t[e],enumerable:!0})},nt=(n,t,e,i)=>{if(t&&typeof t=="object"||typeof t=="function")for(let r of Z(t))!tt.call(n,r)&&r!==e&&A(n,r,{get:()=>t[r],enumerable:!(i=Q(t,r))||i.enumerable});return n};var it=n=>nt(A({},"__esModule",{value:!0}),n);var gt={};et(gt,{version:()=>mt});function k(n){return`crit:auth:${n}`}function y(n){if(!n)return null;try{let t=localStorage.getItem(k(n));if(!t)return null;let e=JSON.parse(t);return Date.now()>e.exp-6e4?(localStorage.removeItem(k(n)),null):e.token}catch{return null}}function C(n){if(n)try{localStorage.removeItem(k(n))}catch{}}function O(n){return new Promise((t,e)=>{let i=new URL(n).origin,r=`${n}/authorize?origin=${encodeURIComponent(location.origin)}`,s=620,o=720,d=Math.max(0,(screen.width-s)/2),x=Math.max(0,(screen.height-o)/2),v=window.open(r,"crit-auth",`width=${s},height=${o},left=${d},top=${x},popup=1`);if(!v){e(new Error("popup-blocked"));return}let p=!1,u=a=>{p||(p=!0,window.removeEventListener("message",c),clearInterval(g),clearTimeout(h),a())},c=a=>{if(a.origin!==i)return;let l=a.data;if(!(!l||l.crit!=="auth"))if(typeof l.token=="string"&&l.token.length>0){let f=Date.now()+(typeof l.expiresIn=="number"?l.expiresIn*1e3:288e5);try{localStorage.setItem(k(n),JSON.stringify({token:l.token,exp:f}))}catch{}u(()=>t(l.token))}else u(()=>e(new Error(l.error||"auth-failed")))},g=setInterval(()=>{v.closed&&u(()=>e(new Error("popup-closed")))},500),h=setTimeout(()=>u(()=>e(new Error("auth-timeout"))),18e4);window.addEventListener("message",c)})}var S="0.1.0";function z(){let t=(document.currentScript||document.querySelector('script[data-repo][src*="crit"]'))?.dataset??{};return{repo:E(t.repo)&&/^[\w.-]+\/[\w.-]+$/.test(t.repo)?t.repo:null,sha:E(t.sha)?t.sha.slice(0,40):null,relay:E(t.relay)?t.relay.replace(/\/+$/,""):null,api:E(t.api)?t.api.replace(/\/+$/,""):"https://api.github.com",position:t.position==="bottom-left"?"bottom-left":"bottom-right",scope:E(t.scope)?t.scope:null}}function E(n){return typeof n=="string"&&n.length>0}function R(){let n=location.hash.length>1?location.hash:"";return location.pathname+n}function q(n,t,e){return{crit:1,page:t,url:location.href,anchor:n,viewport:{w:window.innerWidth,h:window.innerHeight,dpr:window.devicePixelRatio||1},ua:rt(),commit:e,createdAt:new Date().toISOString(),widget:S}}function F(n,t){let e=n.trim().replace(/\s+/g," ").slice(0,48),i=n.trim().length>48?"\u2026":"";return`[crit] ${e}${i} (${t})`}function U(n,t){return[n.trim(),"","<details><summary>\u{1F4CD} Pin metadata</summary>","","```json",JSON.stringify(t,null,2),"```","</details>"].join(`
`)}var B=/```json\s*\n([\s\S]*?)\n```/g;function G(n){B.lastIndex=0;let t;for(;t=B.exec(n);)try{let e=JSON.parse(t[1]);if(e&&e.crit===1&&e.anchor&&typeof e.page=="string"){let i=n.indexOf("<details>");return{text:(i>0?n.slice(0,i):n).trim(),meta:e}}}catch{}return null}function rt(){let n=navigator.userAgent,t=/Edg\//.test(n)?"Edge":/Chrome\//.test(n)?"Chrome":/Safari\//.test(n)&&!/Chrome/.test(n)?"Safari":/Firefox\//.test(n)?"Firefox":"Browser",e=/Mac/.test(n)?"macOS":/Windows/.test(n)?"Windows":/Android/.test(n)?"Android":/iPhone|iPad/.test(n)?"iOS":/Linux/.test(n)?"Linux":"OS";return`${t} / ${e}`}var w=class extends Error{constructor(e,i){super(i);this.status=e}},ot=6e4,st=3,M=class{constructor(t,e,i){this.api=t;this.repo=e;this.token=i}headers(){let t={Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"},e=this.token();return e&&(t.Authorization=`Bearer ${e}`),t}async req(t,e,i){let r=await fetch(`${this.api}${e}`,{method:t,headers:{...this.headers(),...i?{"Content-Type":"application/json"}:{}},body:i?JSON.stringify(i):void 0});if(!r.ok){let s=r.statusText;try{s=(await r.json()).message??s}catch{}throw new w(r.status,s)}return r.status===204?void 0:await r.json()}async listPins(t=!1){let e=`crit:pins:${this.repo}`;if(!t)try{let r=sessionStorage.getItem(e);if(r){let{at:s,pins:o}=JSON.parse(r);if(Date.now()-s<ot)return o}}catch{}let i=[];for(let r=1;r<=st;r++){let s=await this.req("GET",`/repos/${this.repo}/issues?state=all&per_page=100&page=${r}`);for(let o of s){if(o.pull_request||!o.body)continue;let d=G(o.body);d&&i.push({number:o.number,htmlUrl:o.html_url,state:o.state==="closed"?"closed":"open",author:{login:o.user?.login??"unknown",avatar:o.user?.avatar_url??""},text:d.text,meta:d.meta,comments:o.comments,createdAt:o.created_at})}if(s.length<100)break}try{sessionStorage.setItem(e,JSON.stringify({at:Date.now(),pins:i}))}catch{}return i}invalidate(){try{sessionStorage.removeItem(`crit:pins:${this.repo}`)}catch{}}async listReplies(t){return(await this.req("GET",`/repos/${this.repo}/issues/${t}/comments?per_page=100`)).map(i=>({id:i.id,author:{login:i.user?.login??"unknown",avatar:i.user?.avatar_url??""},text:i.body.replace(/<!--\s*crit:reply\s*-->/g,"").trim(),createdAt:i.created_at}))}async me(){let t=await this.req("GET","/user");return{login:t.login,avatar:t.avatar_url}}async createIssue(t,e){let i=await this.req("POST",`/repos/${this.repo}/issues`,{title:t,body:e});return this.invalidate(),{number:i.number,html_url:i.html_url}}async reply(t,e){await this.req("POST",`/repos/${this.repo}/issues/${t}/comments`,{body:`${e.trim()}

<!-- crit:reply -->`}),this.invalidate()}async close(t){await this.req("PATCH",`/repos/${this.repo}/issues/${t}`,{state:"closed",state_reason:"completed"}),this.invalidate()}};var K=`
:host {
  --accent: var(--crit-accent, #E8442E);
  --surface: var(--crit-surface, #ffffff);
  --ink: var(--crit-ink, #16181c);
  --ink-2: color-mix(in srgb, var(--ink) 58%, var(--surface));
  --line: color-mix(in srgb, var(--ink) 14%, var(--surface));
  --radius: var(--crit-radius, 10px);
  --shadow: 0 8px 28px rgba(10, 12, 16, 0.16), 0 1px 3px rgba(10, 12, 16, 0.12);
  --z: 2147483000;
  all: initial;
  font: 500 13px/1.45 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
}
@media (prefers-color-scheme: dark) {
  :host {
    --surface: var(--crit-surface, #1b1d22);
    --ink: var(--crit-ink, #eceef2);
    --shadow: 0 8px 28px rgba(0, 0, 0, 0.5), 0 1px 3px rgba(0, 0, 0, 0.4);
  }
}
* { box-sizing: border-box; margin: 0; padding: 0; font: inherit; color: inherit; }
button { background: none; border: 0; cursor: pointer; }
button:focus-visible, a:focus-visible, textarea:focus-visible {
  outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px;
}
a { color: inherit; text-decoration: none; }
.hidden { display: none !important; }

/* ------------------------------- FAB ------------------------------- */
.fab {
  position: fixed; bottom: 16px; z-index: var(--z);
  display: flex; align-items: stretch; overflow: hidden;
  background: var(--surface); border: 1px solid var(--line);
  border-radius: 999px; box-shadow: var(--shadow);
}
.fab.right { right: 16px; } .fab.left { left: 16px; }
.fab button { display: flex; align-items: center; gap: 6px; padding: 9px 13px; color: var(--ink-2); }
.fab button:hover { color: var(--ink); background: color-mix(in srgb, var(--ink) 5%, var(--surface)); }
.fab .mode.on { background: var(--accent); color: #fff; }
.fab .mode.on:hover { background: var(--accent); color: #fff; }
.fab .divider { width: 1px; background: var(--line); }
.fab .count {
  min-width: 17px; height: 17px; padding: 0 4px; border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 9%, var(--surface));
  font-size: 11px; font-weight: 600; display: grid; place-items: center;
}
.fab .mode.on .count { background: rgba(255,255,255,.24); }
.fab svg { width: 15px; height: 15px; display: block; }

/* --------------------------- target overlay ------------------------ */
.veil {
  position: fixed; inset: 0; z-index: calc(var(--z) - 2);
  cursor: crosshair;
}
.outline {
  position: fixed; z-index: calc(var(--z) - 1); pointer-events: none;
  border: 2px solid var(--accent); border-radius: 4px;
  box-shadow: 0 0 0 1px rgba(255,255,255,.85), 0 0 0 9999px rgba(12,14,18,.05);
  transition: all .06s linear;
}
.outline .tag {
  position: absolute; top: -24px; left: -2px;
  background: var(--accent); color: #fff; font-size: 11px; font-weight: 600;
  padding: 3px 7px; border-radius: 5px; white-space: nowrap;
}

/* -------------------------------- pins ----------------------------- */
.pins { position: fixed; inset: 0; z-index: calc(var(--z) - 3); pointer-events: none; }
.pin {
  position: fixed; width: 26px; height: 26px; pointer-events: auto;
  border-radius: 999px 999px 999px 3px;
  border: 2px solid var(--accent);
  background: var(--surface) center/cover no-repeat;
  box-shadow: 0 2px 8px rgba(10,12,16,.28);
  transform: translate(-50%, -100%);
  transition: transform .12s ease;
}
.pin:hover { transform: translate(-50%, -100%) scale(1.12); }
.pin .n {
  position: absolute; top: -7px; right: -7px; min-width: 15px; height: 15px;
  border-radius: 999px; background: var(--ink); color: var(--surface);
  font-size: 9.5px; font-weight: 700; display: grid; place-items: center; padding: 0 3px;
}
.pin.resolved { border-color: var(--ink-2); opacity: .45; filter: grayscale(1); }

/* ---------------------------- cards (shared) ----------------------- */
.card {
  position: fixed; z-index: var(--z); width: 300px;
  background: var(--surface); border: 1px solid var(--line);
  border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden;
}
.card header {
  display: flex; align-items: center; gap: 8px; padding: 10px 12px;
  border-bottom: 1px solid var(--line);
}
.card header .title { font-weight: 600; flex: 1; }
.avatar { width: 20px; height: 20px; border-radius: 999px; background: var(--line) center/cover; flex: none; }
textarea {
  width: 100%; min-height: 76px; resize: vertical; border: 0;
  padding: 12px; background: transparent; color: var(--ink);
}
textarea::placeholder { color: var(--ink-2); }
textarea:focus-visible { outline: none; }
.card footer {
  display: flex; align-items: center; gap: 8px; padding: 8px 10px;
  border-top: 1px solid var(--line);
}
.hint { color: var(--ink-2); font-size: 11px; flex: 1; }
.btn {
  padding: 6px 12px; border-radius: 7px; font-weight: 600;
  color: var(--ink-2);
}
.btn:hover { color: var(--ink); background: color-mix(in srgb, var(--ink) 6%, var(--surface)); }
.btn.primary { background: var(--accent); color: #fff; }
.btn.primary:hover { background: color-mix(in srgb, var(--accent) 88%, black); color: #fff; }
.btn.primary:disabled { opacity: .5; cursor: default; }

/* -------------------------------- panel ---------------------------- */
.panel {
  position: fixed; top: 12px; bottom: 12px; z-index: var(--z);
  width: 336px; max-width: calc(100vw - 24px);
  display: flex; flex-direction: column;
  background: var(--surface); border: 1px solid var(--line);
  border-radius: var(--radius); box-shadow: var(--shadow);
}
.panel.right { right: 12px; } .panel.left { left: 12px; }
.panel > header { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-bottom: 1px solid var(--line); }
.panel > header .title { font-weight: 700; font-size: 14px; }
.panel > header .path { color: var(--ink-2); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.panel .list { flex: 1; overflow-y: auto; padding: 6px; }
.thread { border-radius: 8px; padding: 10px 10px 8px; cursor: pointer; }
.thread:hover, .thread.open { background: color-mix(in srgb, var(--ink) 4%, var(--surface)); }
.thread .top { display: flex; align-items: center; gap: 7px; margin-bottom: 5px; }
.thread .who { font-weight: 600; font-size: 12px; }
.thread .when { color: var(--ink-2); font-size: 11px; }
.thread .chip {
  margin-left: auto; font-size: 10px; font-weight: 700; letter-spacing: .02em;
  padding: 2px 7px; border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 12%, var(--surface)); color: var(--accent);
}
.thread .chip.done { background: color-mix(in srgb, var(--ink) 8%, var(--surface)); color: var(--ink-2); }
.thread .chip.lost { background: transparent; border: 1px dashed var(--line); color: var(--ink-2); }
.thread .body { color: var(--ink); white-space: pre-wrap; word-break: break-word; }
.thread .replies { margin-top: 8px; border-left: 2px solid var(--line); padding-left: 9px; display: grid; gap: 8px; }
.thread .actions { display: flex; gap: 4px; margin-top: 8px; }
.thread .actions .btn { font-size: 12px; padding: 4px 9px; }
.replybox { display: flex; gap: 6px; margin-top: 8px; }
.replybox textarea { min-height: 34px; border: 1px solid var(--line); border-radius: 7px; padding: 7px 9px; }
.empty { padding: 34px 20px; text-align: center; color: var(--ink-2); }
.empty b { color: var(--ink); }
.section { padding: 10px 12px 4px; color: var(--ink-2); font-size: 10.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.panel > footer { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-top: 1px solid var(--line); color: var(--ink-2); font-size: 12px; }
.panel > footer .grow { flex: 1; }
.linkish { text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
.iconbtn { padding: 4px; border-radius: 6px; color: var(--ink-2); display: grid; place-items: center; }
.iconbtn:hover { color: var(--ink); background: color-mix(in srgb, var(--ink) 6%, var(--surface)); }
.iconbtn svg { width: 15px; height: 15px; }

/* -------------------------------- toast ---------------------------- */
.toast {
  position: fixed; bottom: 68px; left: 50%; transform: translateX(-50%);
  z-index: var(--z); background: var(--ink); color: var(--surface);
  padding: 9px 14px; border-radius: 9px; box-shadow: var(--shadow);
  font-weight: 600; max-width: min(420px, 90vw);
}
.toast a { color: inherit; text-decoration: underline; }

@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}
`;function V(n){let t=n.getBoundingClientRect(),e=Math.max(document.documentElement.scrollWidth,1),i=Math.max(document.documentElement.scrollHeight,1);return{reviewId:n.closest("[data-crit-id]")?.getAttribute("data-crit-id")??null,id:J(n),css:lt(n),nth:ct(n),text:T(n),coords:{xPct:j((t.left+window.scrollX+t.width/2)/e*100),yPct:j((t.top+window.scrollY)/i*100)}}}function J(n){if(!n.id)return null;try{return document.querySelectorAll(`#${CSS.escape(n.id)}`).length===1?n.id:null}catch{return null}}function at(n){return Array.from(n.classList).filter(t=>t.length>1&&t.length<=24&&!/[0-9a-f]{5,}/i.test(t)&&!/[:[\]/!]/.test(t)&&!/^(css|sc|jsx|svelte|astro|_)/.test(t)).slice(0,2)}function lt(n){let t=[],e=n;for(;e&&e!==document.body&&t.length<6;){let r=e.tagName.toLowerCase();if(e.id&&J(e)){t.unshift(`#${CSS.escape(e.id)}`);break}let s=at(e);t.unshift(s.length?`${r}.${s.map(o=>CSS.escape(o)).join(".")}`:r),e=e.parentElement}let i=t.join(" > ");try{let r=document.querySelectorAll(i).length;return r>=1&&r<=3?i:null}catch{return null}}function ct(n){let t=[],e=n;for(;e&&e!==document.documentElement;){let i=e.tagName.toLowerCase(),r=e.parentElement;if(!r)break;let o=Array.from(r.children).filter(d=>d.tagName===e.tagName).indexOf(e)+1;if(t.unshift(`${i}:nth-of-type(${o})`),r===document.body){t.unshift("body");break}e=r}return t.join(" > ")}function T(n){let t=dt(n);return t.length>=4?`${n.tagName}|${t.slice(0,64)}`:null}function dt(n){return(n.innerText??n.textContent??"").trim().replace(/\s+/g," ")}function j(n){return Math.round(n*10)/10}function X(n){if(n.reviewId){let t=document.querySelectorAll(`[data-crit-id="${CSS.escape(n.reviewId)}"]`);if(t.length===1)return{el:t[0],strategy:"reviewId"}}if(n.id){let t=document.getElementById(n.id);if(t)return{el:t,strategy:"id"}}if(n.css){let t=pt(W(n.css),n.text);if(t)return{el:t,strategy:"css"}}if(n.nth){let t=W(n.nth)[0];if(t&&ht(t,n.text))return{el:t,strategy:"nth"}}if(n.text){let t=n.text.split("|",1)[0];for(let e of Array.from(document.getElementsByTagName(t)))if(T(e)===n.text)return{el:e,strategy:"text"}}return{el:null,strategy:"none"}}function W(n){try{return Array.from(document.querySelectorAll(n))}catch{return[]}}function pt(n,t){return n.length===1?n[0]:n.length>1&&t?n.find(e=>T(e)===t)??null:null}function ht(n,t){return t===null||T(n)===t}var P={pen:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M11.3 2.2a1.7 1.7 0 012.5 2.5L5.6 12.9l-3.3.8.8-3.3z"/></svg>',list:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 4.5h10M3 8h10M3 11.5h6"/></svg>',x:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4l8 8M12 4l-8 8"/></svg>',ext:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6.5 3.5H3.5v9h9V9.5M9.5 3h3.5v3.5M13 3L7.5 8.5"/></svg>'},$=class{constructor(t,e){this.cfg=t;this.gh=e;this.panelEl=null;this.composerEl=null;this.veil=null;this.outline=null;this.toastEl=null;this.me=null;this.pins=[];this.hits=new Map;this.pinEls=new Map;this.replies=new Map;this.mode=!1;this.panelOpen=!1;this.openThread=null;this.showResolved=!1;this.page=R();this.hoverEl=null;this.composer=null;this.dirty=!0;this.loading=!1;this.markDirty=()=>{this.dirty=!0};this.onKey=t=>{let i=t.composedPath().includes(this.host),r=!i&&(["INPUT","TEXTAREA","SELECT"].includes(t.target?.tagName)||t.target?.isContentEditable);if(t.key==="Escape"){this.composerEl?this.closeComposer():this.mode?this.exitMode():this.openThread!==null?(this.openThread=null,this.renderPanel()):this.panelOpen&&this.closePanel();return}i||r||t.key==="c"&&!t.metaKey&&!t.ctrlKey&&!t.altKey&&(t.preventDefault(),this.toggleMode())}}mount(){this.host=document.createElement("crit-widget"),this.host.style.cssText="position:fixed;inset:auto;z-index:2147483000;",this.shadow=this.host.attachShadow({mode:"open"});let t=document.createElement("style");t.textContent=window.__CRIT_CSS,this.shadow.appendChild(t),this.pinsLayer=this.div("pins"),this.shadow.appendChild(this.pinsLayer),this.fab=this.div(`fab ${this.cfg.position==="bottom-left"?"left":"right"}`),this.shadow.appendChild(this.fab),this.renderFab(),document.body.appendChild(this.host),document.addEventListener("keydown",this.onKey,!0),window.addEventListener("scroll",this.markDirty,{capture:!0,passive:!0}),window.addEventListener("resize",this.markDirty,{passive:!0}),this.rafLoop(),this.patchRouter(),this.observeDom(),this.cfg.relay&&y(this.cfg.relay)&&this.gh.me().then(e=>{this.me=e,this.renderPanel()}).catch(()=>C(this.cfg.relay)),this.load()}async load(t=!1){if(!this.loading){this.loading=!0;try{this.pins=await this.gh.listPins(t),this.reresolve(),this.renderAll()}catch(e){e instanceof w&&e.status===404&&this.toast("Crit: repo not found or private \u2014 check data-repo")}finally{this.loading=!1}}}pagePins(){return this.pins.filter(t=>t.meta.page===this.page)}reresolve(){this.hits.clear();for(let t of this.pagePins())this.hits.set(t.number,X(t.meta.anchor))}renderAll(){this.renderFab(),this.renderPins(),this.renderPanel(),this.markDirty()}renderFab(){let t=this.pagePins().filter(o=>o.state==="open").length;this.fab.innerHTML="";let e=document.createElement("button");e.className=`mode${this.mode?" on":""}`,e.setAttribute("aria-label","Toggle comment mode (c)"),e.title="Comment mode (c)",e.innerHTML=P.pen;let i=document.createElement("span");i.className="count",i.textContent=String(t),e.appendChild(i),e.onclick=()=>this.toggleMode();let r=this.div("divider"),s=document.createElement("button");s.setAttribute("aria-label","Open comments panel"),s.title="Comments",s.innerHTML=P.list,s.onclick=()=>this.panelOpen?this.closePanel():this.openPanel(),this.fab.append(e,r,s)}renderPins(){this.pinsLayer.innerHTML="",this.pinEls.clear();let t=new Map;for(let e of this.pagePins()){if(e.state==="closed"&&!this.showResolved)continue;let i=this.hits.get(e.number);if(!i?.el)continue;let r=t.get(i.el)??0;t.set(i.el,r+1);let s=document.createElement("button");if(s.className=`pin${e.state==="closed"?" resolved":""}`,s.dataset.stack=String(r),s.setAttribute("aria-label",`Comment by ${e.author.login}: ${e.text.slice(0,60)}`),s.title=`${e.author.login}: ${e.text.slice(0,80)}`,/^https:\/\//.test(e.author.avatar)&&(s.style.backgroundImage=`url("${e.author.avatar}")`),e.comments>0){let o=this.div("n");o.textContent=String(e.comments+1),s.appendChild(o)}s.onclick=()=>this.openPanel(e.number),this.pinsLayer.appendChild(s),this.pinEls.set(e.number,s)}this.markDirty()}position(){for(let[t,e]of this.pinEls){let i=this.hits.get(t);if(!i?.el||!i.el.isConnected){e.style.display="none";continue}let r=i.el.getBoundingClientRect(),s=Number(e.dataset.stack||0)*16;e.style.display="",e.style.left=`${r.left+Math.min(r.width/2,40)+s}px`,e.style.top=`${r.top+2}px`}}rafLoop(){let t=()=>{this.dirty&&(this.dirty=!1,this.position(),this.composer&&this.composerEl&&this.placeCard(this.composerEl,this.composer.el)),requestAnimationFrame(t)};requestAnimationFrame(t)}toggleMode(){this.mode?this.exitMode():this.enterMode()}enterMode(){if(this.mode)return;if(!this.cfg.relay){this.toast("Crit: no relay configured \u2014 commenting is disabled. See README.");return}this.mode=!0,this.closeComposer(),this.veil=this.div("veil"),this.outline=this.div("outline hidden");let t=this.div("tag");this.outline.appendChild(t),this.shadow.append(this.veil,this.outline),this.veil.addEventListener("mousemove",e=>{this.veil.style.pointerEvents="none";let i=document.elementFromPoint(e.clientX,e.clientY);if(this.veil.style.pointerEvents="auto",!i||i===this.host||i===document.documentElement||i===document.body){this.hoverEl=null,this.outline.classList.add("hidden");return}this.hoverEl=i;let r=i.getBoundingClientRect();Object.assign(this.outline.style,{left:`${r.left-2}px`,top:`${r.top-2}px`,width:`${r.width}px`,height:`${r.height}px`}),t.textContent=i.tagName.toLowerCase()+(i.id?`#${i.id}`:""),this.outline.classList.remove("hidden")}),this.veil.addEventListener("click",e=>{e.preventDefault(),e.stopPropagation(),this.hoverEl&&this.pick(this.hoverEl)}),this.renderFab()}exitMode(){this.mode=!1,this.veil?.remove(),this.outline?.remove(),this.veil=this.outline=null,this.hoverEl=null,this.renderFab()}pick(t){let e=V(t);this.exitMode(),this.openComposer({el:t,anchor:e})}openComposer(t){this.closeComposer(),this.composer=t;let e=this.div("card"),i=document.createElement("header"),r=this.div("avatar");this.me&&/^https:\/\//.test(this.me.avatar)&&(r.style.backgroundImage=`url("${this.me.avatar}")`);let s=this.div("title");s.textContent=this.me?this.me.login:"New comment",i.append(r,s);let o=document.createElement("textarea");o.placeholder="What should change here?",o.setAttribute("aria-label","Comment");let d=document.createElement("footer"),x=this.div("hint");x.textContent="\u2318/Ctrl + \u21B5 to send";let v=this.btn("Cancel",()=>this.closeComposer()),p=this.btn(this.authed()?"Comment":"Sign in with GitHub",()=>void u(),"primary");d.append(x,v,p),e.append(i,o,d),this.shadow.appendChild(e),this.composerEl=e,this.placeCard(e,t.el),o.focus();let u=async()=>{if(!this.authed()){if(!await this.doAuth())return;s.textContent=this.me.login,/^https:\/\//.test(this.me.avatar)&&(r.style.backgroundImage=`url("${this.me.avatar}")`),p.textContent="Comment",o.focus();return}let c=o.value.trim();if(!c){o.focus();return}p.textContent="Posting\u2026",p.disabled=!0;try{let g=q(t.anchor,this.page,this.cfg.sha),h=await this.gh.createIssue(F(c,this.page),U(c,g));this.pins.unshift({number:h.number,htmlUrl:h.html_url,state:"open",author:this.me,text:c,meta:g,comments:0,createdAt:new Date().toISOString()}),this.reresolve(),this.closeComposer(),this.renderAll(),this.toast(`Comment posted \xB7 #${h.number}`,h.html_url)}catch(g){p.disabled=!1,p.textContent="Comment",this.toast(this.writeError(g,"post"))}};o.addEventListener("keydown",c=>{(c.metaKey||c.ctrlKey)&&c.key==="Enter"&&u()})}closeComposer(){this.composerEl?.remove(),this.composerEl=null,this.composer=null}placeCard(t,e){let i=e.getBoundingClientRect(),s=Math.min(Math.max(8,i.left),window.innerWidth-300-8),o=i.bottom+8;o>window.innerHeight-190&&(o=Math.max(8,i.top-190)),t.style.left=`${s}px`,t.style.top=`${o}px`}openPanel(t){this.panelOpen=!0,typeof t=="number"&&(this.openThread=t),this.renderPanel(),typeof t=="number"&&this.loadReplies(t)}closePanel(){this.panelOpen=!1,this.openThread=null,this.renderPanel()}renderPanel(){if(this.panelEl?.remove(),this.panelEl=null,!this.panelOpen)return;let t=this.div(`panel ${this.cfg.position==="bottom-left"?"left":"right"}`),e=document.createElement("header"),i=this.div("title");i.textContent="Crit";let r=this.div("path");r.textContent=this.page,r.style.flex="1";let s=this.iconBtn(P.x,"Close panel",()=>this.closePanel());e.append(i,r,s);let o=this.div("list"),d=this.pagePins(),x=d.filter(a=>a.state==="open"&&this.hits.get(a.number)?.el),v=d.filter(a=>a.state==="open"&&!this.hits.get(a.number)?.el),p=d.filter(a=>a.state==="closed");if(d.length===0){let a=this.div("empty");a.innerHTML="";let l=document.createElement("b");l.textContent="No comments on this page yet.";let f=document.createElement("div");f.textContent="Press c, then click anything.",a.append(l,f),o.appendChild(a)}for(let a of x)o.appendChild(this.thread(a,"open"));if(v.length){let a=this.div("section");a.textContent="Unanchored \u2014 element no longer found",o.appendChild(a);for(let l of v)o.appendChild(this.thread(l,"lost"))}if(this.showResolved&&p.length){let a=this.div("section");a.textContent="Resolved",o.appendChild(a);for(let l of p)o.appendChild(this.thread(l,"done"))}let u=document.createElement("footer"),c=this.div("");if(this.me){c.textContent=this.me.login+" \xB7 ";let a=document.createElement("span");a.className="linkish",a.textContent="sign out",a.onclick=()=>{C(this.cfg.relay),this.me=null,this.renderPanel()},c.appendChild(a)}else{let a=document.createElement("span");a.className="linkish",a.textContent="Sign in with GitHub",a.onclick=()=>void this.doAuth(),c.appendChild(a)}let g=this.div("grow"),h=document.createElement("span");h.className="linkish",h.textContent=this.showResolved?"Hide resolved":`Show resolved (${p.length})`,h.onclick=()=>{this.showResolved=!this.showResolved,this.renderPins(),this.renderPanel()},u.append(c,g,h),t.append(e,o,u),this.shadow.appendChild(t),this.panelEl=t}thread(t,e){let i=this.div(`thread${this.openThread===t.number?" open":""}`),r=this.div("top"),s=this.div("avatar");/^https:\/\//.test(t.author.avatar)&&(s.style.backgroundImage=`url("${t.author.avatar}")`);let o=this.div("who");o.textContent=t.author.login;let d=this.div("when");d.textContent=Y(t.createdAt);let x=this.div(`chip${e==="done"?" done":e==="lost"?" lost":""}`);x.textContent=e==="done"?"resolved":e==="lost"?"unanchored":`#${t.number}`,r.append(s,o,d,x);let v=this.div("body");if(v.textContent=t.text,i.append(r,v),i.onclick=p=>{p.target.closest(".actions,.replybox,textarea,a,button")||(this.openThread=this.openThread===t.number?null:t.number,this.renderPanel(),this.openThread===t.number&&this.loadReplies(t.number))},this.openThread===t.number){let p=this.replies.get(t.number),u=this.div("replies");if(p)for(let m of p){let b=this.div(""),H=this.div("top"),I=this.div("who");I.textContent=m.author.login;let _=this.div("when");_.textContent=Y(m.createdAt),H.append(I,_);let N=this.div("body");N.textContent=m.text,b.append(H,N),u.appendChild(b)}else{let m=this.div("when");m.textContent="Loading replies\u2026",u.appendChild(m)}i.appendChild(u);let c=this.div("replybox"),g=document.createElement("textarea");g.placeholder="Reply\u2026";let h=this.btn("Reply",()=>void a(),"primary");c.append(g,h),i.appendChild(c);let a=async()=>{let m=g.value.trim();if(m&&!(!this.authed()&&!await this.doAuth())){h.disabled=!0;try{await this.gh.reply(t.number,m);let b=this.replies.get(t.number)??[];b.push({id:Date.now(),author:this.me,text:m,createdAt:new Date().toISOString()}),this.replies.set(t.number,b),t.comments+=1,this.renderPins(),this.renderPanel()}catch(b){h.disabled=!1,this.toast(this.writeError(b,"reply"))}}},l=this.div("actions");t.state==="open"&&l.appendChild(this.btn("Resolve",async()=>{if(!(!this.authed()&&!await this.doAuth()))try{await this.gh.close(t.number),t.state="closed",this.renderPins(),this.renderPanel(),this.toast(`Resolved \xB7 #${t.number}`)}catch(m){this.toast(m instanceof w&&m.status===403?"Only the comment author or repo maintainers can resolve":this.writeError(m,"resolve"))}}));let f=document.createElement("a");f.className="btn",f.href=t.htmlUrl,f.target="_blank",f.rel="noreferrer",f.append("Open in GitHub ");let L=document.createElement("span");L.innerHTML=P.ext,L.style.cssText="display:inline-block;vertical-align:-2px",f.appendChild(L),l.appendChild(f),i.appendChild(l)}return i}async loadReplies(t){if(!this.replies.has(t)){try{this.replies.set(t,await this.gh.listReplies(t))}catch{this.replies.set(t,[])}this.renderPanel()}}authed(){return!!y(this.cfg.relay)}async doAuth(){if(!this.cfg.relay)return!1;try{return await O(this.cfg.relay),this.me=await this.gh.me(),this.renderPanel(),!0}catch(t){let e=t instanceof Error?t.message:"";return this.toast(e==="popup-blocked"?"Popup blocked \u2014 allow popups for this site and try again":e==="popup-closed"?"Sign-in cancelled":"Sign-in failed \u2014 try again"),!1}}writeError(t,e){return t instanceof w?t.status===401?(C(this.cfg.relay),"Session expired \u2014 sign in again"):t.status===403?`Can't ${e}: the Crit GitHub App may not be installed on this repo`:t.status===404?`Can't ${e}: repo not found (private repos need read access)`:`Can't ${e}: ${t.message}`:`Can't ${e}: network error`}toast(t,e){this.toastEl?.remove();let i=this.div("toast");if(i.setAttribute("role","status"),i.textContent=t,e){i.append(" ");let r=document.createElement("a");r.href=e,r.target="_blank",r.rel="noreferrer",r.textContent="View \u2197",i.appendChild(r)}this.shadow.appendChild(i),this.toastEl=i,setTimeout(()=>{this.toastEl===i&&(i.remove(),this.toastEl=null)},4e3)}patchRouter(){let t=()=>window.dispatchEvent(new Event("crit:nav")),e=r=>function(...s){let o=r.apply(this,s);return t(),o};history.pushState=e(history.pushState.bind(history)),history.replaceState=e(history.replaceState.bind(history));let i=()=>{let r=R();r!==this.page&&(this.page=r,this.openThread=null,this.closeComposer(),this.exitMode(),this.reresolve(),this.renderAll())};window.addEventListener("popstate",i),window.addEventListener("hashchange",i),window.addEventListener("crit:nav",i)}observeDom(){let t;new MutationObserver(i=>{i.every(r=>this.host.contains(r.target))||(clearTimeout(t),t=window.setTimeout(()=>{this.reresolve(),this.renderPins()},350))}).observe(document.body,{childList:!0,subtree:!0})}div(t){let e=document.createElement("div");return t&&(e.className=t),e}btn(t,e,i=""){let r=document.createElement("button");return r.className=`btn ${i}`.trim(),r.textContent=t,r.onclick=e,r}iconBtn(t,e,i){let r=document.createElement("button");return r.className="iconbtn",r.setAttribute("aria-label",e),r.innerHTML=t,r.onclick=i,r}};function Y(n){let t=Math.max(1,Math.floor((Date.now()-Date.parse(n))/1e3));return t<60?`${t}s`:t<3600?`${Math.floor(t/60)}m`:t<86400?`${Math.floor(t/3600)}h`:`${Math.floor(t/86400)}d`}function ut(){let n=z();if(n.scope&&!location.pathname.startsWith(n.scope))return;if(!n.repo){new URLSearchParams(location.search).has("crit")&&console.warn('[crit] Missing or invalid data-repo on the script tag. Expected data-repo="owner/repo". See https://github.com/hvelaayutham/crit#setup');return}n.relay||console.warn("[crit] No data-relay configured \u2014 pins are read-only on this deploy."),window.__CRIT_CSS=K;let t=new M(n.api,n.repo,()=>y(n.relay)),e=new $(n,t);document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>e.mount(),{once:!0}):e.mount()}ut();var mt=S;return it(gt);})();
