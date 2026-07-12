"use strict";var Crit=(()=>{var R=Object.defineProperty;var tt=Object.getOwnPropertyDescriptor;var et=Object.getOwnPropertyNames;var nt=Object.prototype.hasOwnProperty;var rt=(n,t)=>{for(var e in t)R(n,e,{get:t[e],enumerable:!0})},it=(n,t,e,r)=>{if(t&&typeof t=="object"||typeof t=="function")for(let i of et(t))!nt.call(n,i)&&i!==e&&R(n,i,{get:()=>t[i],enumerable:!(r=tt(t,i))||r.enumerable});return n};var ot=n=>it(R({},"__esModule",{value:!0}),n);var xt={};rt(xt,{version:()=>ft});function P(n){return`crit:auth:${n}`}function E(n){if(!n)return null;try{let t=localStorage.getItem(P(n));if(!t)return null;let e=JSON.parse(t);return Date.now()>e.exp-6e4?(localStorage.removeItem(P(n)),null):e.token}catch{return null}}function S(n){if(n)try{localStorage.removeItem(P(n))}catch{}}function B(n){return new Promise((t,e)=>{let r=new URL(n).origin,i=`${n}/authorize?origin=${encodeURIComponent(location.origin)}`,o=620,s=720,l=Math.max(0,(screen.width-o)/2),x=Math.max(0,(screen.height-s)/2),g=window.open(i,"crit-auth",`width=${o},height=${s},left=${l},top=${x},popup=1`);if(!g){e(new Error("popup-blocked"));return}let p=!1,h=a=>{p||(p=!0,window.removeEventListener("message",d),clearInterval(f),clearTimeout(u),a())},d=a=>{if(a.origin!==r)return;let c=a.data;if(!(!c||c.crit!=="auth"))if(typeof c.token=="string"&&c.token.length>0){let b=Date.now()+(typeof c.expiresIn=="number"?c.expiresIn*1e3:288e5);try{localStorage.setItem(P(n),JSON.stringify({token:c.token,exp:b}))}catch{}h(()=>t(c.token))}else h(()=>e(new Error(c.error||"auth-failed")))},f=setInterval(()=>{g.closed&&h(()=>e(new Error("popup-closed")))},500),u=setTimeout(()=>h(()=>e(new Error("auth-timeout"))),18e4);window.addEventListener("message",d)})}var M="0.1.0";function D(){let t=(document.currentScript||document.querySelector('script[data-repo][src*="crit"]'))?.dataset??{};return{repo:C(t.repo)&&/^[\w.-]+\/[\w.-]+$/.test(t.repo)?t.repo:null,sha:C(t.sha)?t.sha.slice(0,40):null,relay:C(t.relay)?t.relay.replace(/\/+$/,""):null,api:C(t.api)?t.api.replace(/\/+$/,""):"https://api.github.com",position:t.position==="bottom-left"?"bottom-left":"bottom-right",scope:C(t.scope)?t.scope:null}}function C(n){return typeof n=="string"&&n.length>0}function I(){let n=location.hash.length>1?location.hash:"";return location.pathname+n}function j(n,t,e){return{crit:1,page:t,url:location.href,anchor:n,viewport:{w:window.innerWidth,h:window.innerHeight,dpr:window.devicePixelRatio||1},ua:st(),commit:e,createdAt:new Date().toISOString(),widget:M}}function K(n,t){let e=n.trim().replace(/\s+/g," ").slice(0,48),r=n.trim().length>48?"\u2026":"";return`[crit] ${e}${r} (${t})`}function U(n,t){return[n.trim(),"","<details><summary>\u{1F4CD} Pin metadata</summary>","","```json",JSON.stringify(t,null,2),"```","</details>"].join(`
`)}var q=/```json\s*\n([\s\S]*?)\n```/g;function G(n){q.lastIndex=0;let t;for(;t=q.exec(n);)try{let e=JSON.parse(t[1]);if(e&&e.crit===1&&e.anchor&&typeof e.page=="string"){let r=n.indexOf("<details>");return{text:(r>0?n.slice(0,r):n).trim(),meta:e}}}catch{}return null}function st(){let n=navigator.userAgent,t=/Edg\//.test(n)?"Edge":/Chrome\//.test(n)?"Chrome":/Safari\//.test(n)&&!/Chrome/.test(n)?"Safari":/Firefox\//.test(n)?"Firefox":"Browser",e=/Mac/.test(n)?"macOS":/Windows/.test(n)?"Windows":/Android/.test(n)?"Android":/iPhone|iPad/.test(n)?"iOS":/Linux/.test(n)?"Linux":"OS";return`${t} / ${e}`}var y=class extends Error{constructor(e,r){super(r);this.status=e}},at=6e4,lt=3,T=class{constructor(t,e,r){this.api=t;this.repo=e;this.token=r}headers(){let t={Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"},e=this.token();return e&&(t.Authorization=`Bearer ${e}`),t}async req(t,e,r){let i=await fetch(`${this.api}${e}`,{method:t,headers:{...this.headers(),...r?{"Content-Type":"application/json"}:{}},body:r?JSON.stringify(r):void 0});if(!i.ok){let o=i.statusText;try{o=(await i.json()).message??o}catch{}throw new y(i.status,o)}return i.status===204?void 0:await i.json()}async listPins(t=!1){let e=`crit:pins:${this.repo}`;if(!t)try{let i=sessionStorage.getItem(e);if(i){let{at:o,pins:s}=JSON.parse(i);if(Date.now()-o<at)return s}}catch{}let r=[];for(let i=1;i<=lt;i++){let o=await this.req("GET",`/repos/${this.repo}/issues?state=all&per_page=100&page=${i}`);for(let s of o){if(s.pull_request||!s.body)continue;let l=G(s.body);l&&r.push({number:s.number,htmlUrl:s.html_url,state:s.state==="closed"?"closed":"open",author:{login:s.user?.login??"unknown",avatar:s.user?.avatar_url??""},text:l.text,meta:l.meta,comments:s.comments,createdAt:s.created_at})}if(o.length<100)break}try{sessionStorage.setItem(e,JSON.stringify({at:Date.now(),pins:r}))}catch{}return r}invalidate(){try{sessionStorage.removeItem(`crit:pins:${this.repo}`)}catch{}}async listReplies(t){return(await this.req("GET",`/repos/${this.repo}/issues/${t}/comments?per_page=100`)).map(r=>({id:r.id,author:{login:r.user?.login??"unknown",avatar:r.user?.avatar_url??""},text:r.body.replace(/<!--\s*crit:reply\s*-->/g,"").trim(),createdAt:r.created_at}))}async me(){let t=await this.req("GET","/user");return{login:t.login,avatar:t.avatar_url}}async createIssue(t,e){let r=await this.req("POST",`/repos/${this.repo}/issues`,{title:t,body:e});return this.invalidate(),{number:r.number,html_url:r.html_url}}async reply(t,e){await this.req("POST",`/repos/${this.repo}/issues/${t}/comments`,{body:`${e.trim()}

<!-- crit:reply -->`}),this.invalidate()}async close(t){await this.req("PATCH",`/repos/${this.repo}/issues/${t}`,{state:"closed",state_reason:"completed"}),this.invalidate()}};var W=`
:host {
  --accent: var(--crit-accent, #E8442E);
  --surface: var(--crit-surface, #ffffff);
  --ink: var(--crit-ink, #16181c);
  --ink-2: color-mix(in srgb, var(--ink) 58%, var(--surface));
  --line: color-mix(in srgb, var(--ink) 14%, var(--surface));
  --radius: var(--crit-radius, 14px);
  --z: 2147483000;
  --glass-bg: rgba(255, 255, 255, 0.68);
  --glass-border: rgba(255, 255, 255, 0.55);
  --glass-shadow:
    0 0 0 0.5px rgba(0, 0, 0, 0.06),
    0 4px 24px rgba(0, 0, 0, 0.08),
    inset 0 0.5px 0 rgba(255, 255, 255, 0.75);
  all: initial;
  font: 500 13px/1.45 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
}
@media (prefers-color-scheme: dark) {
  :host {
    --surface: var(--crit-surface, #1b1d22);
    --ink: var(--crit-ink, #eceef2);
    --glass-bg: rgba(28, 28, 30, 0.72);
    --glass-border: rgba(255, 255, 255, 0.12);
    --glass-shadow:
      0 0 0 0.5px rgba(255, 255, 255, 0.08),
      0 8px 32px rgba(0, 0, 0, 0.45),
      inset 0 0.5px 0 rgba(255, 255, 255, 0.08);
  }
}
* { box-sizing: border-box; margin: 0; padding: 0; font: inherit; color: inherit; }
button { background: none; border: 0; cursor: pointer; }
button:focus-visible, a:focus-visible, textarea:focus-visible {
  outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px;
}
a { color: inherit; text-decoration: none; }
.hidden { display: none !important; }

/* shared frosted-glass surface */
.glass {
  background: var(--glass-bg);
  border: 0.5px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
}

/* ------------------------------- FAB ------------------------------- */
.fab {
  position: fixed; bottom: 20px; z-index: var(--z);
  display: flex; align-items: stretch;
  border-radius: 999px; overflow: hidden;
  background: var(--glass-bg);
  border: 0.5px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
}
.fab.right { right: 20px; } .fab.left { left: 20px; }
.fab button {
  position: relative;
  display: grid; place-items: center;
  width: 44px; height: 44px;
  color: var(--ink-2);
  transition: color 150ms ease, background 150ms ease;
}
.fab button:hover { color: var(--ink); background: color-mix(in srgb, var(--ink) 5%, transparent); }
.fab .mode.on {
  color: #fff;
  background: color-mix(in srgb, var(--accent) 88%, transparent);
}
.fab .mode.on:hover { background: var(--accent); }
.fab .divider {
  width: 0.5px; align-self: stretch; margin: 10px 0;
  background: color-mix(in srgb, var(--ink) 12%, transparent);
}
.fab .count {
  position: absolute; top: 7px; right: 7px;
  min-width: 15px; height: 15px; padding: 0 4px;
  border-radius: 999px; font-size: 9px; font-weight: 700;
  display: grid; place-items: center;
  background: var(--accent); color: #fff;
  box-shadow: 0 0 0 1.5px var(--glass-bg);
}
.fab svg { width: 17px; height: 17px; display: block; }

kbd {
  font: 600 10px/1 ui-sans-serif, system-ui, sans-serif;
  padding: 2px 5px; border-radius: 4px;
  background: color-mix(in srgb, var(--ink) 7%, var(--surface));
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--ink) 14%, transparent),
              inset 0 0 0 0.5px color-mix(in srgb, var(--ink) 12%, transparent);
}
.modehint kbd, .hintline kbd, .hint kbd {
  margin: 0 1px;
}

/* hint bar \u2014 same glass, shown only in comment mode */
.modehint {
  position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
  z-index: var(--z); pointer-events: none;
  display: flex; align-items: center; gap: 4px;
  font-size: 12px; font-weight: 600; color: var(--ink);
  padding: 8px 14px; border-radius: 999px;
  background: var(--glass-bg);
  border: 0.5px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
}
.modehint kbd {
  background: color-mix(in srgb, var(--ink) 8%, transparent);
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--ink) 16%, transparent),
              inset 0 0 0 0.5px color-mix(in srgb, var(--ink) 12%, transparent);
}

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
  border-radius: var(--radius); overflow: hidden;
  background: var(--glass-bg);
  border: 0.5px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
}
.card header {
  display: flex; align-items: center; gap: 8px; padding: 10px 12px;
  border-bottom: 0.5px solid color-mix(in srgb, var(--ink) 10%, transparent);
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
  border-top: 0.5px solid color-mix(in srgb, var(--ink) 10%, transparent);
}
.hint { color: var(--ink-2); font-size: 11px; flex: 1; display: flex; align-items: center; gap: 4px; }
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
  border-radius: var(--radius);
  background: var(--glass-bg);
  border: 0.5px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
}
.panel.right { right: 12px; } .panel.left { left: 12px; }
.panel > header {
  display: flex; align-items: center; gap: 8px; padding: 12px 14px;
  border-bottom: 0.5px solid color-mix(in srgb, var(--ink) 10%, transparent);
}
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
.empty b { display: block; color: var(--ink); font-size: 14px; margin-bottom: 8px; }
.hintline {
  display: flex; align-items: center; justify-content: center; gap: 5px;
  font-size: 12px; color: var(--ink-2);
}
.section { padding: 10px 12px 4px; color: var(--ink-2); font-size: 10.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.panel > footer {
  display: flex; align-items: center; gap: 8px; padding: 10px 12px;
  border-top: 0.5px solid color-mix(in srgb, var(--ink) 10%, transparent);
  color: var(--ink-2); font-size: 12px;
}
.panel > footer .grow { flex: 1; }
.linkish { text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
.iconbtn { padding: 4px; border-radius: 6px; color: var(--ink-2); display: grid; place-items: center; }
.iconbtn:hover { color: var(--ink); background: color-mix(in srgb, var(--ink) 6%, var(--surface)); }
.iconbtn svg { width: 15px; height: 15px; }

/* -------------------------------- toast ---------------------------- */
.toast {
  position: fixed; bottom: 76px; left: 50%; transform: translateX(-50%);
  z-index: var(--z);
  padding: 9px 14px; border-radius: 12px;
  font-weight: 600; max-width: min(420px, 90vw);
  background: var(--glass-bg);
  border: 0.5px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
}
.toast a { color: inherit; text-decoration: underline; }

@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}
`;function J(n,t){let e=Math.max(document.documentElement.scrollWidth,1),r=Math.max(document.documentElement.scrollHeight,1);if(n===document.body||n===document.documentElement)return{reviewId:null,id:null,css:"body",nth:"body",text:null,coords:t?{xPct:k((t.x+window.scrollX)/e*100),yPct:k((t.y+window.scrollY)/r*100)}:{xPct:50,yPct:0},offset:V(document.body,t)};let i=n.getBoundingClientRect();return{reviewId:n.closest("[data-crit-id]")?.getAttribute("data-crit-id")??null,id:Y(n),css:ct(n),nth:pt(n),text:$(n),coords:{xPct:k((i.left+window.scrollX+i.width/2)/e*100),yPct:k((i.top+window.scrollY)/r*100)},offset:V(n,t)}}function V(n,t){if(!t)return null;let e=n.getBoundingClientRect();return e.width<1||e.height<1?null:{xPct:k((t.x-e.left)/e.width*100),yPct:k((t.y-e.top)/e.height*100)}}function Y(n){if(!n.id)return null;try{return document.querySelectorAll(`#${CSS.escape(n.id)}`).length===1?n.id:null}catch{return null}}function dt(n){return Array.from(n.classList).filter(t=>t.length>1&&t.length<=24&&!/[0-9a-f]{5,}/i.test(t)&&!/[:[\]/!]/.test(t)&&!/^(css|sc|jsx|svelte|astro|_)/.test(t)).slice(0,2)}function ct(n){let t=[],e=n;for(;e&&e!==document.body&&t.length<6;){let i=e.tagName.toLowerCase();if(e.id&&Y(e)){t.unshift(`#${CSS.escape(e.id)}`);break}let o=dt(e);t.unshift(o.length?`${i}.${o.map(s=>CSS.escape(s)).join(".")}`:i),e=e.parentElement}let r=t.join(" > ");try{let i=document.querySelectorAll(r).length;return i>=1&&i<=3?r:null}catch{return null}}function pt(n){let t=[],e=n;for(;e&&e!==document.documentElement;){let r=e.tagName.toLowerCase(),i=e.parentElement;if(!i)break;let s=Array.from(i.children).filter(l=>l.tagName===e.tagName).indexOf(e)+1;if(t.unshift(`${r}:nth-of-type(${s})`),i===document.body){t.unshift("body");break}e=i}return t.join(" > ")}function $(n){if(n.tagName==="IMG"||n.tagName==="VIDEO"){let e=(n.getAttribute("alt")??"").trim().replace(/\s+/g," "),i=(n.getAttribute("src")??n.getAttribute("poster")??"").split(/[?#]/,1)[0].split("/").pop()??"",o=e||i;return o.length>=3?`${n.tagName}|${o.slice(0,64)}`:null}let t=ht(n);return t.length>=4?`${n.tagName}|${t.slice(0,64)}`:null}function ht(n){return(n.innerText??n.textContent??"").trim().replace(/\s+/g," ")}function k(n){return Math.round(n*10)/10}function Q(n){if(n.reviewId){let t=document.querySelectorAll(`[data-crit-id="${CSS.escape(n.reviewId)}"]`);if(t.length===1)return{el:t[0],strategy:"reviewId"}}if(n.id){let t=document.getElementById(n.id);if(t)return{el:t,strategy:"id"}}if(n.css){let t=ut(X(n.css),n.text);if(t)return{el:t,strategy:"css"}}if(n.nth){let t=X(n.nth)[0];if(t&&mt(t,n.text))return{el:t,strategy:"nth"}}if(n.text){let t=n.text.split("|",1)[0];for(let e of Array.from(document.getElementsByTagName(t)))if($(e)===n.text)return{el:e,strategy:"text"}}return{el:null,strategy:"none"}}function X(n){try{return Array.from(document.querySelectorAll(n))}catch{return[]}}function ut(n,t){return n.length===1?n[0]:n.length>1&&t?n.find(e=>$(e)===t)??null:null}function mt(n,t){return t===null||$(n)===t}var L={comment:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M2.5 3.5h11a1 1 0 011 1v5.5a1 1 0 01-1 1H6.2L2.5 14V4.5a1 1 0 011-1z"/></svg>',list:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 4.5h10M3 8h10M3 11.5h6"/></svg>',x:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4l8 8M12 4l-8 8"/></svg>',ext:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6.5 3.5H3.5v9h9V9.5M9.5 3h3.5v3.5M13 3L7.5 8.5"/></svg>'},A=class{constructor(t,e){this.cfg=t;this.gh=e;this.panelEl=null;this.composerEl=null;this.veil=null;this.outline=null;this.modeHint=null;this.toastEl=null;this.me=null;this.pins=[];this.hits=new Map;this.pinEls=new Map;this.replies=new Map;this.mode=!1;this.panelOpen=!1;this.openThread=null;this.showResolved=!1;this.page=I();this.hoverEl=null;this.composer=null;this.dirty=!0;this.loading=!1;this.markDirty=()=>{this.dirty=!0};this.onKey=t=>{let r=t.composedPath().includes(this.host),i=!r&&(["INPUT","TEXTAREA","SELECT"].includes(t.target?.tagName)||t.target?.isContentEditable);if(t.key==="Escape"){this.composerEl?this.closeComposer():this.mode?this.exitMode():this.openThread!==null?(this.openThread=null,this.renderPanel()):this.panelOpen&&this.closePanel();return}r||i||t.key==="c"&&!t.metaKey&&!t.ctrlKey&&!t.altKey&&(t.preventDefault(),this.toggleMode())}}mount(){this.host=document.createElement("crit-widget"),this.host.style.cssText="position:fixed;inset:auto;z-index:2147483000;",this.shadow=this.host.attachShadow({mode:"open"});let t=document.createElement("style");t.textContent=window.__CRIT_CSS,this.shadow.appendChild(t),this.pinsLayer=this.div("pins"),this.shadow.appendChild(this.pinsLayer),this.fab=this.div(`fab ${this.cfg.position==="bottom-left"?"left":"right"}`),this.shadow.appendChild(this.fab),this.renderFab(),document.body.appendChild(this.host),document.addEventListener("keydown",this.onKey,!0),window.addEventListener("scroll",this.markDirty,{capture:!0,passive:!0}),window.addEventListener("resize",this.markDirty,{passive:!0}),this.rafLoop(),this.patchRouter(),this.observeDom(),this.cfg.relay&&E(this.cfg.relay)&&this.gh.me().then(e=>{this.me=e,this.renderPanel()}).catch(()=>S(this.cfg.relay)),this.load()}async load(t=!1){if(!this.loading){this.loading=!0;try{this.pins=await this.gh.listPins(t),this.reresolve(),this.renderAll()}catch(e){e instanceof y&&e.status===404&&this.toast("Crit: repo not found or private \u2014 check data-repo")}finally{this.loading=!1}}}pagePins(){return this.pins.filter(t=>t.meta.page===this.page)}reresolve(){this.hits.clear();for(let t of this.pagePins())this.hits.set(t.number,Q(t.meta.anchor))}renderAll(){this.renderFab(),this.renderPins(),this.renderPanel(),this.markDirty()}renderFab(){let t=this.pagePins().filter(o=>o.state==="open").length;this.fab.innerHTML="";let e=document.createElement("button");if(e.className=`mode${this.mode?" on":""}`,e.setAttribute("aria-label","Comment on page (c)"),e.title=this.mode?"Exit comment mode (Esc)":"Comment on page (c)",e.innerHTML=L.comment,t>0){let o=document.createElement("span");o.className="count",o.textContent=String(t),e.appendChild(o)}e.onclick=()=>this.toggleMode();let r=this.div("divider"),i=document.createElement("button");i.setAttribute("aria-label","Open comments"),i.title="Comments",i.innerHTML=L.list,i.onclick=()=>this.panelOpen?this.closePanel():this.openPanel(),this.fab.append(e,r,i)}renderPins(){this.pinsLayer.innerHTML="",this.pinEls.clear();let t=new Map;for(let e of this.pagePins()){if(e.state==="closed"&&!this.showResolved)continue;let r=this.hits.get(e.number);if(!r?.el)continue;let i=t.get(r.el)??0;t.set(r.el,i+1);let o=document.createElement("button");o.className=`pin${e.state==="closed"?" resolved":""}`,o.dataset.stack=String(i);let s=e.meta.anchor.offset;if(s&&(o.dataset.ox=String(s.xPct),o.dataset.oy=String(s.yPct)),o.setAttribute("aria-label",`Comment by ${e.author.login}: ${e.text.slice(0,60)}`),o.title=`${e.author.login}: ${e.text.slice(0,80)}`,/^https:\/\//.test(e.author.avatar)&&(o.style.backgroundImage=`url("${e.author.avatar}")`),e.comments>0){let l=this.div("n");l.textContent=String(e.comments+1),o.appendChild(l)}o.onclick=()=>this.openPanel(e.number),this.pinsLayer.appendChild(o),this.pinEls.set(e.number,o)}this.markDirty()}position(){for(let[t,e]of this.pinEls){let r=this.hits.get(t);if(!r?.el||!r.el.isConnected){e.style.display="none";continue}let i=r.el.getBoundingClientRect(),o=Number(e.dataset.stack||0)*16;e.style.display="",e.dataset.ox!==void 0?(e.style.left=`${i.left+i.width*Number(e.dataset.ox)/100+o}px`,e.style.top=`${i.top+i.height*Number(e.dataset.oy)/100}px`):(e.style.left=`${i.left+Math.min(i.width/2,40)+o}px`,e.style.top=`${i.top+2}px`)}}rafLoop(){let t=()=>{this.dirty&&(this.dirty=!1,this.position(),this.composer&&this.composerEl&&this.placeCard(this.composerEl,this.composer.el)),requestAnimationFrame(t)};requestAnimationFrame(t)}toggleMode(){this.mode?this.exitMode():this.enterMode()}enterMode(){if(this.mode)return;if(!this.cfg.relay){this.toast("Crit: no relay configured \u2014 commenting is disabled. See README.");return}this.mode=!0,this.closeComposer(),this.veil=this.div("veil"),this.outline=this.div("outline hidden");let t=this.div("tag");this.outline.appendChild(t),this.modeHint=this.div("modehint"),this.modeHint.append(document.createTextNode("Click to comment \xB7 "),this.kbd("esc"),document.createTextNode(" exit")),this.shadow.append(this.veil,this.outline,this.modeHint),this.veil.addEventListener("mousemove",e=>{this.veil.style.pointerEvents="none";let r=document.elementFromPoint(e.clientX,e.clientY);if(this.veil.style.pointerEvents="auto",!r||r===this.host){this.hoverEl=null,this.outline.classList.add("hidden");return}let i=r===document.documentElement||r===document.body;if(this.hoverEl=i?document.body:r,i)Object.assign(this.outline.style,{left:"4px",top:"4px",width:`${window.innerWidth-12}px`,height:`${window.innerHeight-12}px`}),t.textContent="entire page",t.style.top="8px",t.style.left="8px";else{let o=r.getBoundingClientRect();Object.assign(this.outline.style,{left:`${o.left-2}px`,top:`${o.top-2}px`,width:`${o.width}px`,height:`${o.height}px`}),t.textContent=r.tagName.toLowerCase()+(r.id?`#${r.id}`:""),t.style.top="",t.style.left=""}this.outline.classList.remove("hidden")}),this.veil.addEventListener("click",e=>{e.preventDefault(),e.stopPropagation(),this.hoverEl&&this.pick(this.hoverEl,{x:e.clientX,y:e.clientY})}),this.renderFab()}exitMode(){this.mode=!1,this.veil?.remove(),this.outline?.remove(),this.modeHint?.remove(),this.veil=this.outline=this.modeHint=null,this.hoverEl=null,this.renderFab()}pick(t,e){let r=J(t,e);this.exitMode(),this.openComposer({el:t,anchor:r})}openComposer(t){this.closeComposer(),this.composer=t;let e=this.div("card"),r=document.createElement("header"),i=this.div("avatar");this.me&&/^https:\/\//.test(this.me.avatar)&&(i.style.backgroundImage=`url("${this.me.avatar}")`);let o=this.div("title");o.textContent=this.me?this.me.login:"New comment",r.append(i,o);let s=document.createElement("textarea");s.placeholder="What should change here?",s.setAttribute("aria-label","Comment");let l=document.createElement("footer"),x=this.div("hint");x.append(this.kbd(this.sendKey()),document.createTextNode(" send"));let g=this.btn("Cancel",()=>this.closeComposer()),p=this.btn(this.authed()?"Comment":"Sign in with GitHub",()=>void h(),"primary");l.append(x,g,p),e.append(r,s,l),this.shadow.appendChild(e),this.composerEl=e,this.placeCard(e,t.el),s.focus();let h=async()=>{if(!this.authed()){if(!await this.doAuth())return;o.textContent=this.me.login,/^https:\/\//.test(this.me.avatar)&&(i.style.backgroundImage=`url("${this.me.avatar}")`),p.textContent="Comment",s.focus();return}let d=s.value.trim();if(!d){s.focus();return}p.textContent="Posting\u2026",p.disabled=!0;try{let f=j(t.anchor,this.page,this.cfg.sha),u=await this.gh.createIssue(K(d,this.page),U(d,f));this.pins.unshift({number:u.number,htmlUrl:u.html_url,state:"open",author:this.me,text:d,meta:f,comments:0,createdAt:new Date().toISOString()}),this.reresolve(),this.closeComposer(),this.renderAll(),this.toast(`Comment posted \xB7 #${u.number}`,u.html_url)}catch(f){p.disabled=!1,p.textContent="Comment",this.toast(this.writeError(f,"post"))}};s.addEventListener("keydown",d=>{(d.metaKey||d.ctrlKey)&&d.key==="Enter"&&h()})}closeComposer(){this.composerEl?.remove(),this.composerEl=null,this.composer=null}placeCard(t,e){let r=e.getBoundingClientRect(),i=this.composer?.anchor.offset,o=i?r.left+r.width*i.xPct/100:r.left,s=i?r.top+r.height*i.yPct/100:r.bottom,x=Math.min(Math.max(8,o),window.innerWidth-300-8),g=s+8;g>window.innerHeight-190&&(g=Math.max(8,s-198)),t.style.left=`${x}px`,t.style.top=`${g}px`}openPanel(t){this.panelOpen=!0,typeof t=="number"&&(this.openThread=t),this.renderPanel(),typeof t=="number"&&this.loadReplies(t)}closePanel(){this.panelOpen=!1,this.openThread=null,this.renderPanel()}renderPanel(){if(this.panelEl?.remove(),this.panelEl=null,!this.panelOpen)return;let t=this.div(`panel ${this.cfg.position==="bottom-left"?"left":"right"}`),e=document.createElement("header"),r=this.div("title");r.textContent="Crit";let i=this.div("path");i.textContent=this.page,i.style.flex="1";let o=this.iconBtn(L.x,"Close panel",()=>this.closePanel());e.append(r,i,o);let s=this.div("list"),l=this.pagePins(),x=l.filter(a=>a.state==="open"&&this.hits.get(a.number)?.el),g=l.filter(a=>a.state==="open"&&!this.hits.get(a.number)?.el),p=l.filter(a=>a.state==="closed");if(l.length===0){let a=this.div("empty");a.innerHTML="";let c=document.createElement("b");c.textContent="No comments yet";let b=this.div("hintline");b.append(this.kbd("c"),document.createTextNode(" then click anything on the page")),a.append(c,b),s.appendChild(a)}for(let a of x)s.appendChild(this.thread(a,"open"));if(g.length){let a=this.div("section");a.textContent="Unanchored \u2014 element no longer found",s.appendChild(a);for(let c of g)s.appendChild(this.thread(c,"lost"))}if(this.showResolved&&p.length){let a=this.div("section");a.textContent="Resolved",s.appendChild(a);for(let c of p)s.appendChild(this.thread(c,"done"))}let h=document.createElement("footer"),d=this.div("");if(this.me){d.textContent=this.me.login+" \xB7 ";let a=document.createElement("span");a.className="linkish",a.textContent="sign out",a.onclick=()=>{S(this.cfg.relay),this.me=null,this.renderPanel()},d.appendChild(a)}else{let a=document.createElement("span");a.className="linkish",a.textContent="Sign in with GitHub",a.onclick=()=>void this.doAuth(),d.appendChild(a)}let f=this.div("grow"),u=document.createElement("span");u.className="linkish",u.textContent=this.showResolved?"Hide resolved":`Show resolved (${p.length})`,u.onclick=()=>{this.showResolved=!this.showResolved,this.renderPins(),this.renderPanel()},h.append(d,f,u),t.append(e,s,h),this.shadow.appendChild(t),this.panelEl=t}thread(t,e){let r=this.div(`thread${this.openThread===t.number?" open":""}`),i=this.div("top"),o=this.div("avatar");/^https:\/\//.test(t.author.avatar)&&(o.style.backgroundImage=`url("${t.author.avatar}")`);let s=this.div("who");s.textContent=t.author.login;let l=this.div("when");l.textContent=Z(t.createdAt);let x=this.div(`chip${e==="done"?" done":e==="lost"?" lost":""}`),g=t.meta.anchor.css==="body"&&!t.meta.anchor.id&&!t.meta.anchor.reviewId;x.textContent=e==="done"?"resolved":e==="lost"?"unanchored":g?`page #${t.number}`:`#${t.number}`,i.append(o,s,l,x);let p=this.div("body");if(p.textContent=t.text,r.append(i,p),r.onclick=h=>{h.target.closest(".actions,.replybox,textarea,a,button")||(this.openThread=this.openThread===t.number?null:t.number,this.renderPanel(),this.openThread===t.number&&this.loadReplies(t.number))},this.openThread===t.number){let h=this.replies.get(t.number),d=this.div("replies");if(h)for(let m of h){let w=this.div(""),N=this.div("top"),_=this.div("who");_.textContent=m.author.login;let O=this.div("when");O.textContent=Z(m.createdAt),N.append(_,O);let z=this.div("body");z.textContent=m.text,w.append(N,z),d.appendChild(w)}else{let m=this.div("when");m.textContent="Loading replies\u2026",d.appendChild(m)}r.appendChild(d);let f=this.div("replybox"),u=document.createElement("textarea");u.placeholder="Reply\u2026";let a=this.btn("Reply",()=>void c(),"primary");f.append(u,a),r.appendChild(f);let c=async()=>{let m=u.value.trim();if(m&&!(!this.authed()&&!await this.doAuth())){a.disabled=!0;try{await this.gh.reply(t.number,m);let w=this.replies.get(t.number)??[];w.push({id:Date.now(),author:this.me,text:m,createdAt:new Date().toISOString()}),this.replies.set(t.number,w),t.comments+=1,this.renderPins(),this.renderPanel()}catch(w){a.disabled=!1,this.toast(this.writeError(w,"reply"))}}},b=this.div("actions");t.state==="open"&&b.appendChild(this.btn("Resolve",async()=>{if(!(!this.authed()&&!await this.doAuth()))try{await this.gh.close(t.number),t.state="closed",this.renderPins(),this.renderPanel(),this.toast(`Resolved \xB7 #${t.number}`)}catch(m){this.toast(m instanceof y&&m.status===403?"Only the comment author or repo maintainers can resolve":this.writeError(m,"resolve"))}}));let v=document.createElement("a");v.className="btn",v.href=t.htmlUrl,v.target="_blank",v.rel="noreferrer",v.append("Open in GitHub ");let H=document.createElement("span");H.innerHTML=L.ext,H.style.cssText="display:inline-block;vertical-align:-2px",v.appendChild(H),b.appendChild(v),r.appendChild(b)}return r}async loadReplies(t){if(!this.replies.has(t)){try{this.replies.set(t,await this.gh.listReplies(t))}catch{this.replies.set(t,[])}this.renderPanel()}}authed(){return!!E(this.cfg.relay)}async doAuth(){if(!this.cfg.relay)return!1;try{return await B(this.cfg.relay),this.me=await this.gh.me(),this.renderPanel(),!0}catch(t){let e=t instanceof Error?t.message:"";return this.toast(e==="popup-blocked"?"Popup blocked \u2014 allow popups for this site and try again":e==="popup-closed"?"Sign-in cancelled":"Sign-in failed \u2014 try again"),!1}}writeError(t,e){return t instanceof y?t.status===401?(S(this.cfg.relay),"Session expired \u2014 sign in again"):t.status===403?`Can't ${e}: the Crit GitHub App may not be installed on this repo`:t.status===404?`Can't ${e}: repo not found (private repos need read access)`:`Can't ${e}: ${t.message}`:`Can't ${e}: network error`}toast(t,e){this.toastEl?.remove();let r=this.div("toast");if(r.setAttribute("role","status"),r.textContent=t,e){r.append(" ");let i=document.createElement("a");i.href=e,i.target="_blank",i.rel="noreferrer",i.textContent="View \u2197",r.appendChild(i)}this.shadow.appendChild(r),this.toastEl=r,setTimeout(()=>{this.toastEl===r&&(r.remove(),this.toastEl=null)},4e3)}patchRouter(){let t=()=>window.dispatchEvent(new Event("crit:nav")),e=i=>function(...o){let s=i.apply(this,o);return t(),s};history.pushState=e(history.pushState.bind(history)),history.replaceState=e(history.replaceState.bind(history));let r=()=>{let i=I();i!==this.page&&(this.page=i,this.openThread=null,this.closeComposer(),this.exitMode(),this.reresolve(),this.renderAll())};window.addEventListener("popstate",r),window.addEventListener("hashchange",r),window.addEventListener("crit:nav",r)}observeDom(){let t;new MutationObserver(r=>{r.every(i=>this.host.contains(i.target))||(clearTimeout(t),t=window.setTimeout(()=>{this.reresolve(),this.renderPins()},350))}).observe(document.body,{childList:!0,subtree:!0})}div(t){let e=document.createElement("div");return t&&(e.className=t),e}btn(t,e,r=""){let i=document.createElement("button");return i.className=`btn ${r}`.trim(),i.textContent=t,i.onclick=e,i}iconBtn(t,e,r){let i=document.createElement("button");return i.className="iconbtn",i.setAttribute("aria-label",e),i.innerHTML=t,i.onclick=r,i}kbd(t){let e=document.createElement("kbd");return e.textContent=t,e}sendKey(){return/Mac|iPhone|iPad/.test(navigator.platform)?"\u2318\u21B5":"Ctrl\u21B5"}};function Z(n){let t=Math.max(1,Math.floor((Date.now()-Date.parse(n))/1e3));return t<60?`${t}s`:t<3600?`${Math.floor(t/60)}m`:t<86400?`${Math.floor(t/3600)}h`:`${Math.floor(t/86400)}d`}function gt(){let n=D();if(n.scope&&!location.pathname.startsWith(n.scope))return;if(!n.repo){new URLSearchParams(location.search).has("crit")&&console.warn('[crit] Missing or invalid data-repo on the script tag. Expected data-repo="owner/repo". See https://github.com/hvelaayutham/crit#setup');return}n.relay||console.warn("[crit] No data-relay configured \u2014 pins are read-only on this deploy."),window.__CRIT_CSS=W;let t=new T(n.api,n.repo,()=>E(n.relay)),e=new A(n,t);document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>e.mount(),{once:!0}):e.mount()}gt();var ft=M;return ot(xt);})();
