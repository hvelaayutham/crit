"use strict";
var Crit = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key2 of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key2) && key2 !== except)
          __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    version: () => version
  });

  // src/auth.ts
  var DEFAULT_TTL = 8 * 3600 * 1e3;
  function key(relay) {
    return `crit:auth:${relay}`;
  }
  function getToken(relay) {
    if (!relay) return null;
    try {
      const raw = localStorage.getItem(key(relay));
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (Date.now() > s.exp - 6e4) {
        localStorage.removeItem(key(relay));
        return null;
      }
      return s.token;
    } catch {
      return null;
    }
  }
  function signOut(relay) {
    if (!relay) return;
    try {
      localStorage.removeItem(key(relay));
    } catch {
    }
  }
  function signIn(relay) {
    return new Promise((resolve2, reject) => {
      const relayOrigin = new URL(relay).origin;
      const url = `${relay}/authorize?origin=${encodeURIComponent(location.origin)}`;
      const w = 620;
      const h = 720;
      const left = Math.max(0, (screen.width - w) / 2);
      const top = Math.max(0, (screen.height - h) / 2);
      const popup = window.open(
        url,
        "crit-auth",
        `width=${w},height=${h},left=${left},top=${top},popup=1`
      );
      if (!popup) {
        reject(new Error("popup-blocked"));
        return;
      }
      let settled = false;
      const finish = (fn) => {
        if (settled) return;
        settled = true;
        window.removeEventListener("message", onMsg);
        clearInterval(closedPoll);
        clearTimeout(timeout);
        fn();
      };
      const onMsg = (ev) => {
        if (ev.origin !== relayOrigin) return;
        const d = ev.data;
        if (!d || d.crit !== "auth") return;
        if (typeof d.token === "string" && d.token.length > 0) {
          const exp = Date.now() + (typeof d.expiresIn === "number" ? d.expiresIn * 1e3 : DEFAULT_TTL);
          try {
            localStorage.setItem(key(relay), JSON.stringify({ token: d.token, exp }));
          } catch {
          }
          finish(() => resolve2(d.token));
        } else {
          finish(() => reject(new Error(d.error || "auth-failed")));
        }
      };
      const closedPoll = setInterval(() => {
        if (popup.closed) finish(() => reject(new Error("popup-closed")));
      }, 500);
      const timeout = setTimeout(() => finish(() => reject(new Error("auth-timeout"))), 18e4);
      window.addEventListener("message", onMsg);
    });
  }

  // src/config.ts
  var VERSION = "0.1.0";
  var SCHEMA_VERSION = 1;
  function readConfig() {
    const el = document.currentScript || document.querySelector('script[data-repo][src*="crit"]');
    const d = el?.dataset ?? {};
    const repo = valid(d.repo) && /^[\w.-]+\/[\w.-]+$/.test(d.repo) ? d.repo : null;
    return {
      repo,
      sha: valid(d.sha) ? d.sha.slice(0, 40) : null,
      relay: valid(d.relay) ? d.relay.replace(/\/+$/, "") : null,
      api: valid(d.api) ? d.api.replace(/\/+$/, "") : "https://api.github.com",
      position: d.position === "bottom-left" ? "bottom-left" : "bottom-right",
      scope: valid(d.scope) ? d.scope : null
    };
  }
  function valid(v) {
    return typeof v === "string" && v.length > 0;
  }
  function pageKey() {
    const hash = location.hash.length > 1 ? location.hash : "";
    return location.pathname + hash;
  }

  // src/schema.ts
  function buildMeta(anchor, page, sha) {
    return {
      crit: SCHEMA_VERSION,
      page,
      url: location.href,
      anchor,
      viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 },
      ua: shortUA(),
      commit: sha,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      widget: VERSION
    };
  }
  function buildTitle(text, page) {
    const head = text.trim().replace(/\s+/g, " ").slice(0, 48);
    const ellipsis = text.trim().length > 48 ? "\u2026" : "";
    return `[crit] ${head}${ellipsis} (${page})`;
  }
  function buildBody(text, meta) {
    return [
      text.trim(),
      "",
      "<details><summary>\u{1F4CD} Pin metadata</summary>",
      "",
      "```json",
      JSON.stringify(meta, null, 2),
      "```",
      "</details>"
    ].join("\n");
  }
  var FENCE = /```json\s*\n([\s\S]*?)\n```/g;
  function parseBody(body) {
    FENCE.lastIndex = 0;
    let m;
    while (m = FENCE.exec(body)) {
      try {
        const obj = JSON.parse(m[1]);
        if (obj && obj.crit === SCHEMA_VERSION && obj.anchor && typeof obj.page === "string") {
          const cut = body.indexOf("<details>");
          const text = (cut > 0 ? body.slice(0, cut) : body).trim();
          return { text, meta: obj };
        }
      } catch {
      }
    }
    return null;
  }
  function shortUA() {
    const ua = navigator.userAgent;
    const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) && !/Chrome/.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "Browser";
    const os = /Mac/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "OS";
    return `${browser} / ${os}`;
  }

  // src/gh.ts
  var GHError = class extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
    }
  };
  var CACHE_TTL = 6e4;
  var MAX_PAGES = 3;
  var GH = class {
    constructor(api, repo, token) {
      this.api = api;
      this.repo = repo;
      this.token = token;
    }
    headers() {
      const h = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      };
      const t = this.token();
      if (t) h.Authorization = `Bearer ${t}`;
      return h;
    }
    async req(method, path, body) {
      const res = await fetch(`${this.api}${path}`, {
        method,
        headers: { ...this.headers(), ...body ? { "Content-Type": "application/json" } : {} },
        body: body ? JSON.stringify(body) : void 0
      });
      if (!res.ok) {
        let msg = res.statusText;
        try {
          msg = (await res.json()).message ?? msg;
        } catch {
        }
        throw new GHError(res.status, msg);
      }
      return res.status === 204 ? void 0 : await res.json();
    }
    /* ------------------------------ reads ------------------------------ */
    async listPins(force = false) {
      const key2 = `crit:pins:${this.repo}`;
      if (!force) {
        try {
          const hit = sessionStorage.getItem(key2);
          if (hit) {
            const { at, pins: pins2 } = JSON.parse(hit);
            if (Date.now() - at < CACHE_TTL) return pins2;
          }
        } catch {
        }
      }
      const pins = [];
      for (let page = 1; page <= MAX_PAGES; page++) {
        const batch = await this.req(
          "GET",
          `/repos/${this.repo}/issues?state=all&per_page=100&page=${page}`
        );
        for (const it of batch) {
          if (it.pull_request || !it.body) continue;
          const parsed = parseBody(it.body);
          if (!parsed) continue;
          pins.push({
            number: it.number,
            htmlUrl: it.html_url,
            state: it.state === "closed" ? "closed" : "open",
            author: {
              login: it.user?.login ?? "unknown",
              avatar: it.user?.avatar_url ?? ""
            },
            text: parsed.text,
            meta: parsed.meta,
            comments: it.comments,
            createdAt: it.created_at
          });
        }
        if (batch.length < 100) break;
      }
      try {
        sessionStorage.setItem(key2, JSON.stringify({ at: Date.now(), pins }));
      } catch {
      }
      return pins;
    }
    invalidate() {
      try {
        sessionStorage.removeItem(`crit:pins:${this.repo}`);
      } catch {
      }
    }
    async listReplies(issue) {
      const raw = await this.req("GET", `/repos/${this.repo}/issues/${issue}/comments?per_page=100`);
      return raw.map((c) => ({
        id: c.id,
        author: { login: c.user?.login ?? "unknown", avatar: c.user?.avatar_url ?? "" },
        text: c.body.replace(/<!--\s*crit:reply\s*-->/g, "").trim(),
        createdAt: c.created_at
      }));
    }
    async me() {
      const u = await this.req("GET", "/user");
      return { login: u.login, avatar: u.avatar_url };
    }
    /* ------------------------------ writes ----------------------------- */
    async createIssue(title, body) {
      const r = await this.req("POST", `/repos/${this.repo}/issues`, { title, body });
      this.invalidate();
      return { number: r.number, html_url: r.html_url };
    }
    async reply(issue, text) {
      await this.req("POST", `/repos/${this.repo}/issues/${issue}/comments`, {
        body: `${text.trim()}

<!-- crit:reply -->`
      });
      this.invalidate();
    }
    async close(issue) {
      await this.req("PATCH", `/repos/${this.repo}/issues/${issue}`, {
        state: "closed",
        state_reason: "completed"
      });
      this.invalidate();
    }
  };

  // src/styles.ts
  var STYLES = (
    /* css */
    `
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
`
  );

  // src/anchors.ts
  function capture(el) {
    const rect = el.getBoundingClientRect();
    const docW = Math.max(document.documentElement.scrollWidth, 1);
    const docH = Math.max(document.documentElement.scrollHeight, 1);
    return {
      reviewId: el.closest("[data-crit-id]")?.getAttribute("data-crit-id") ?? null,
      id: uniqueId(el),
      css: cssPath(el),
      nth: nthPath(el),
      text: fingerprint(el),
      coords: {
        xPct: round((rect.left + window.scrollX + rect.width / 2) / docW * 100),
        yPct: round((rect.top + window.scrollY) / docH * 100)
      }
    };
  }
  function uniqueId(el) {
    if (!el.id) return null;
    try {
      return document.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1 ? el.id : null;
    } catch {
      return null;
    }
  }
  function stableClasses(el) {
    return Array.from(el.classList).filter(
      (c) => c.length > 1 && c.length <= 24 && !/[0-9a-f]{5,}/i.test(c) && // content hashes
      !/[:[\]/!]/.test(c) && // tailwind variants/arbitrary
      !/^(css|sc|jsx|svelte|astro|_)/.test(c)
    ).slice(0, 2);
  }
  function cssPath(el) {
    const parts = [];
    let cur = el;
    while (cur && cur !== document.body && parts.length < 6) {
      const tag = cur.tagName.toLowerCase();
      if (cur.id && uniqueId(cur)) {
        parts.unshift(`#${CSS.escape(cur.id)}`);
        break;
      }
      const cls = stableClasses(cur);
      parts.unshift(cls.length ? `${tag}.${cls.map((c) => CSS.escape(c)).join(".")}` : tag);
      cur = cur.parentElement;
    }
    const sel = parts.join(" > ");
    try {
      const n = document.querySelectorAll(sel).length;
      return n >= 1 && n <= 3 ? sel : null;
    } catch {
      return null;
    }
  }
  function nthPath(el) {
    const parts = [];
    let cur = el;
    while (cur && cur !== document.documentElement) {
      const tag = cur.tagName.toLowerCase();
      const parent = cur.parentElement;
      if (!parent) break;
      const same = Array.from(parent.children).filter((c) => c.tagName === cur.tagName);
      const idx = same.indexOf(cur) + 1;
      parts.unshift(`${tag}:nth-of-type(${idx})`);
      if (parent === document.body) {
        parts.unshift("body");
        break;
      }
      cur = parent;
    }
    return parts.join(" > ");
  }
  function fingerprint(el) {
    const t = normText(el);
    return t.length >= 4 ? `${el.tagName}|${t.slice(0, 64)}` : null;
  }
  function normText(el) {
    const raw = el.innerText ?? el.textContent ?? "";
    return raw.trim().replace(/\s+/g, " ");
  }
  function round(n) {
    return Math.round(n * 10) / 10;
  }
  function resolve(a) {
    if (a.reviewId) {
      const els = document.querySelectorAll(`[data-crit-id="${CSS.escape(a.reviewId)}"]`);
      if (els.length === 1) return { el: els[0], strategy: "reviewId" };
    }
    if (a.id) {
      const el = document.getElementById(a.id);
      if (el) return { el, strategy: "id" };
    }
    if (a.css) {
      const el = pick(safeQuery(a.css), a.text);
      if (el) return { el, strategy: "css" };
    }
    if (a.nth) {
      const el = safeQuery(a.nth)[0];
      if (el && matchesFingerprint(el, a.text)) return { el, strategy: "nth" };
    }
    if (a.text) {
      const tag = a.text.split("|", 1)[0];
      for (const el of Array.from(document.getElementsByTagName(tag))) {
        if (fingerprint(el) === a.text) return { el, strategy: "text" };
      }
    }
    return { el: null, strategy: "none" };
  }
  function safeQuery(sel) {
    try {
      return Array.from(document.querySelectorAll(sel));
    } catch {
      return [];
    }
  }
  function pick(els, fp) {
    if (els.length === 1) return els[0];
    if (els.length > 1 && fp) return els.find((e) => fingerprint(e) === fp) ?? null;
    return null;
  }
  function matchesFingerprint(el, fp) {
    return fp === null || fingerprint(el) === fp;
  }

  // src/ui.ts
  var ICONS = {
    pen: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M11.3 2.2a1.7 1.7 0 012.5 2.5L5.6 12.9l-3.3.8.8-3.3z"/></svg>',
    list: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 4.5h10M3 8h10M3 11.5h6"/></svg>',
    x: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
    ext: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6.5 3.5H3.5v9h9V9.5M9.5 3h3.5v3.5M13 3L7.5 8.5"/></svg>'
  };
  var App = class {
    constructor(cfg, gh) {
      this.cfg = cfg;
      this.gh = gh;
      this.panelEl = null;
      this.composerEl = null;
      this.veil = null;
      this.outline = null;
      this.toastEl = null;
      this.me = null;
      this.pins = [];
      this.hits = /* @__PURE__ */ new Map();
      this.pinEls = /* @__PURE__ */ new Map();
      this.replies = /* @__PURE__ */ new Map();
      this.mode = false;
      this.panelOpen = false;
      this.openThread = null;
      this.showResolved = false;
      this.page = pageKey();
      this.hoverEl = null;
      this.composer = null;
      this.dirty = true;
      this.loading = false;
      this.markDirty = () => {
        this.dirty = true;
      };
      this.onKey = (ev) => {
        const path = ev.composedPath();
        const inWidget = path.includes(this.host);
        const typingInPage = !inWidget && (["INPUT", "TEXTAREA", "SELECT"].includes(ev.target?.tagName) || ev.target?.isContentEditable);
        if (ev.key === "Escape") {
          if (this.composerEl) this.closeComposer();
          else if (this.mode) this.exitMode();
          else if (this.openThread !== null) {
            this.openThread = null;
            this.renderPanel();
          } else if (this.panelOpen) this.closePanel();
          return;
        }
        if (inWidget || typingInPage) return;
        if (ev.key === "c" && !ev.metaKey && !ev.ctrlKey && !ev.altKey) {
          ev.preventDefault();
          this.toggleMode();
        }
      };
    }
    /* ------------------------------- lifecycle ------------------------------ */
    mount() {
      this.host = document.createElement("crit-widget");
      this.host.style.cssText = "position:fixed;inset:auto;z-index:2147483000;";
      this.shadow = this.host.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = window.__CRIT_CSS;
      this.shadow.appendChild(style);
      this.pinsLayer = this.div("pins");
      this.shadow.appendChild(this.pinsLayer);
      this.fab = this.div(`fab ${this.cfg.position === "bottom-left" ? "left" : "right"}`);
      this.shadow.appendChild(this.fab);
      this.renderFab();
      document.body.appendChild(this.host);
      document.addEventListener("keydown", this.onKey, true);
      window.addEventListener("scroll", this.markDirty, { capture: true, passive: true });
      window.addEventListener("resize", this.markDirty, { passive: true });
      this.rafLoop();
      this.patchRouter();
      this.observeDom();
      if (this.cfg.relay && getToken(this.cfg.relay)) {
        this.gh.me().then((m) => {
          this.me = m;
          this.renderPanel();
        }).catch(() => signOut(this.cfg.relay));
      }
      void this.load();
    }
    async load(force = false) {
      if (this.loading) return;
      this.loading = true;
      try {
        this.pins = await this.gh.listPins(force);
        this.reresolve();
        this.renderAll();
      } catch (e) {
        if (e instanceof GHError && e.status === 404) {
          this.toast("Crit: repo not found or private \u2014 check data-repo");
        }
      } finally {
        this.loading = false;
      }
    }
    /* -------------------------------- resolve ------------------------------- */
    pagePins() {
      return this.pins.filter((p) => p.meta.page === this.page);
    }
    reresolve() {
      this.hits.clear();
      for (const p of this.pagePins()) this.hits.set(p.number, resolve(p.meta.anchor));
    }
    /* --------------------------------- render ------------------------------- */
    renderAll() {
      this.renderFab();
      this.renderPins();
      this.renderPanel();
      this.markDirty();
    }
    renderFab() {
      const open = this.pagePins().filter((p) => p.state === "open").length;
      this.fab.innerHTML = "";
      const mode = document.createElement("button");
      mode.className = `mode${this.mode ? " on" : ""}`;
      mode.setAttribute("aria-label", "Toggle comment mode (c)");
      mode.title = "Comment mode (c)";
      mode.innerHTML = ICONS.pen;
      const count = document.createElement("span");
      count.className = "count";
      count.textContent = String(open);
      mode.appendChild(count);
      mode.onclick = () => this.toggleMode();
      const divider = this.div("divider");
      const list = document.createElement("button");
      list.setAttribute("aria-label", "Open comments panel");
      list.title = "Comments";
      list.innerHTML = ICONS.list;
      list.onclick = () => this.panelOpen ? this.closePanel() : this.openPanel();
      this.fab.append(mode, divider, list);
    }
    /* pins ------------------------------------------------------------------ */
    renderPins() {
      this.pinsLayer.innerHTML = "";
      this.pinEls.clear();
      const groups = /* @__PURE__ */ new Map();
      for (const p of this.pagePins()) {
        if (p.state === "closed" && !this.showResolved) continue;
        const hit = this.hits.get(p.number);
        if (!hit?.el) continue;
        const idx = groups.get(hit.el) ?? 0;
        groups.set(hit.el, idx + 1);
        const el = document.createElement("button");
        el.className = `pin${p.state === "closed" ? " resolved" : ""}`;
        el.dataset.stack = String(idx);
        el.setAttribute("aria-label", `Comment by ${p.author.login}: ${p.text.slice(0, 60)}`);
        el.title = `${p.author.login}: ${p.text.slice(0, 80)}`;
        if (/^https:\/\//.test(p.author.avatar)) {
          el.style.backgroundImage = `url("${p.author.avatar}")`;
        }
        if (p.comments > 0) {
          const n = this.div("n");
          n.textContent = String(p.comments + 1);
          el.appendChild(n);
        }
        el.onclick = () => this.openPanel(p.number);
        this.pinsLayer.appendChild(el);
        this.pinEls.set(p.number, el);
      }
      this.markDirty();
    }
    position() {
      for (const [num, pinEl] of this.pinEls) {
        const hit = this.hits.get(num);
        if (!hit?.el || !hit.el.isConnected) {
          pinEl.style.display = "none";
          continue;
        }
        const r = hit.el.getBoundingClientRect();
        const shift = Number(pinEl.dataset.stack || 0) * 16;
        pinEl.style.display = "";
        pinEl.style.left = `${r.left + Math.min(r.width / 2, 40) + shift}px`;
        pinEl.style.top = `${r.top + 2}px`;
      }
    }
    rafLoop() {
      const tick = () => {
        if (this.dirty) {
          this.dirty = false;
          this.position();
          if (this.composer && this.composerEl) this.placeCard(this.composerEl, this.composer.el);
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    /* targeting --------------------------------------------------------------- */
    toggleMode() {
      this.mode ? this.exitMode() : this.enterMode();
    }
    enterMode() {
      if (this.mode) return;
      if (!this.cfg.relay) {
        this.toast("Crit: no relay configured \u2014 commenting is disabled. See README.");
        return;
      }
      this.mode = true;
      this.closeComposer();
      this.veil = this.div("veil");
      this.outline = this.div("outline hidden");
      const tag = this.div("tag");
      this.outline.appendChild(tag);
      this.shadow.append(this.veil, this.outline);
      this.veil.addEventListener("mousemove", (ev) => {
        this.veil.style.pointerEvents = "none";
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        this.veil.style.pointerEvents = "auto";
        if (!el || el === this.host || el === document.documentElement || el === document.body) {
          this.hoverEl = null;
          this.outline.classList.add("hidden");
          return;
        }
        this.hoverEl = el;
        const r = el.getBoundingClientRect();
        Object.assign(this.outline.style, {
          left: `${r.left - 2}px`,
          top: `${r.top - 2}px`,
          width: `${r.width}px`,
          height: `${r.height}px`
        });
        tag.textContent = el.tagName.toLowerCase() + (el.id ? `#${el.id}` : "");
        this.outline.classList.remove("hidden");
      });
      this.veil.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (this.hoverEl) this.pick(this.hoverEl);
      });
      this.renderFab();
    }
    exitMode() {
      this.mode = false;
      this.veil?.remove();
      this.outline?.remove();
      this.veil = this.outline = null;
      this.hoverEl = null;
      this.renderFab();
    }
    pick(el) {
      const anchor = capture(el);
      this.exitMode();
      this.openComposer({ el, anchor });
    }
    /* composer ---------------------------------------------------------------- */
    openComposer(c) {
      this.closeComposer();
      this.composer = c;
      const card = this.div("card");
      const header = document.createElement("header");
      const av = this.div("avatar");
      if (this.me && /^https:\/\//.test(this.me.avatar)) av.style.backgroundImage = `url("${this.me.avatar}")`;
      const title = this.div("title");
      title.textContent = this.me ? this.me.login : "New comment";
      header.append(av, title);
      const ta = document.createElement("textarea");
      ta.placeholder = "What should change here?";
      ta.setAttribute("aria-label", "Comment");
      const footer = document.createElement("footer");
      const hint = this.div("hint");
      hint.textContent = "\u2318/Ctrl + \u21B5 to send";
      const cancel = this.btn("Cancel", () => this.closeComposer());
      const send = this.btn(this.authed() ? "Comment" : "Sign in with GitHub", () => void submit(), "primary");
      footer.append(hint, cancel, send);
      card.append(header, ta, footer);
      this.shadow.appendChild(card);
      this.composerEl = card;
      this.placeCard(card, c.el);
      ta.focus();
      const submit = async () => {
        if (!this.authed()) {
          const ok = await this.doAuth();
          if (!ok) return;
          title.textContent = this.me.login;
          if (/^https:\/\//.test(this.me.avatar)) av.style.backgroundImage = `url("${this.me.avatar}")`;
          send.textContent = "Comment";
          ta.focus();
          return;
        }
        const text = ta.value.trim();
        if (!text) {
          ta.focus();
          return;
        }
        send.textContent = "Posting\u2026";
        send.disabled = true;
        try {
          const meta = buildMeta(c.anchor, this.page, this.cfg.sha);
          const res = await this.gh.createIssue(buildTitle(text, this.page), buildBody(text, meta));
          this.pins.unshift({
            number: res.number,
            htmlUrl: res.html_url,
            state: "open",
            author: this.me,
            text,
            meta,
            comments: 0,
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          });
          this.reresolve();
          this.closeComposer();
          this.renderAll();
          this.toast(`Comment posted \xB7 #${res.number}`, res.html_url);
        } catch (e) {
          send.disabled = false;
          send.textContent = "Comment";
          this.toast(this.writeError(e, "post"));
        }
      };
      ta.addEventListener("keydown", (ev) => {
        if ((ev.metaKey || ev.ctrlKey) && ev.key === "Enter") void submit();
      });
    }
    closeComposer() {
      this.composerEl?.remove();
      this.composerEl = null;
      this.composer = null;
    }
    placeCard(card, target) {
      const r = target.getBoundingClientRect();
      const w = 300;
      const left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
      let top = r.bottom + 8;
      if (top > window.innerHeight - 190) top = Math.max(8, r.top - 190);
      card.style.left = `${left}px`;
      card.style.top = `${top}px`;
    }
    /* panel -------------------------------------------------------------------- */
    openPanel(focus) {
      this.panelOpen = true;
      if (typeof focus === "number") this.openThread = focus;
      this.renderPanel();
      if (typeof focus === "number") void this.loadReplies(focus);
    }
    closePanel() {
      this.panelOpen = false;
      this.openThread = null;
      this.renderPanel();
    }
    renderPanel() {
      this.panelEl?.remove();
      this.panelEl = null;
      if (!this.panelOpen) return;
      const panel = this.div(`panel ${this.cfg.position === "bottom-left" ? "left" : "right"}`);
      const header = document.createElement("header");
      const title = this.div("title");
      title.textContent = "Crit";
      const path = this.div("path");
      path.textContent = this.page;
      path.style.flex = "1";
      const close = this.iconBtn(ICONS.x, "Close panel", () => this.closePanel());
      header.append(title, path, close);
      const list = this.div("list");
      const all = this.pagePins();
      const active = all.filter((p) => p.state === "open" && this.hits.get(p.number)?.el);
      const lost = all.filter((p) => p.state === "open" && !this.hits.get(p.number)?.el);
      const done = all.filter((p) => p.state === "closed");
      if (all.length === 0) {
        const empty = this.div("empty");
        empty.innerHTML = "";
        const b = document.createElement("b");
        b.textContent = "No comments on this page yet.";
        const rest = document.createElement("div");
        rest.textContent = "Press c, then click anything.";
        empty.append(b, rest);
        list.appendChild(empty);
      }
      for (const p of active) list.appendChild(this.thread(p, "open"));
      if (lost.length) {
        const s = this.div("section");
        s.textContent = "Unanchored \u2014 element no longer found";
        list.appendChild(s);
        for (const p of lost) list.appendChild(this.thread(p, "lost"));
      }
      if (this.showResolved && done.length) {
        const s = this.div("section");
        s.textContent = "Resolved";
        list.appendChild(s);
        for (const p of done) list.appendChild(this.thread(p, "done"));
      }
      const footer = document.createElement("footer");
      const who = this.div("");
      if (this.me) {
        who.textContent = this.me.login + " \xB7 ";
        const out = document.createElement("span");
        out.className = "linkish";
        out.textContent = "sign out";
        out.onclick = () => {
          signOut(this.cfg.relay);
          this.me = null;
          this.renderPanel();
        };
        who.appendChild(out);
      } else {
        const inn = document.createElement("span");
        inn.className = "linkish";
        inn.textContent = "Sign in with GitHub";
        inn.onclick = () => void this.doAuth();
        who.appendChild(inn);
      }
      const grow = this.div("grow");
      const tog = document.createElement("span");
      tog.className = "linkish";
      tog.textContent = this.showResolved ? "Hide resolved" : `Show resolved (${done.length})`;
      tog.onclick = () => {
        this.showResolved = !this.showResolved;
        this.renderPins();
        this.renderPanel();
      };
      footer.append(who, grow, tog);
      panel.append(header, list, footer);
      this.shadow.appendChild(panel);
      this.panelEl = panel;
    }
    thread(p, kind) {
      const t = this.div(`thread${this.openThread === p.number ? " open" : ""}`);
      const top = this.div("top");
      const av = this.div("avatar");
      if (/^https:\/\//.test(p.author.avatar)) av.style.backgroundImage = `url("${p.author.avatar}")`;
      const who = this.div("who");
      who.textContent = p.author.login;
      const when = this.div("when");
      when.textContent = timeAgo(p.createdAt);
      const chip = this.div(`chip${kind === "done" ? " done" : kind === "lost" ? " lost" : ""}`);
      chip.textContent = kind === "done" ? "resolved" : kind === "lost" ? "unanchored" : `#${p.number}`;
      top.append(av, who, when, chip);
      const body = this.div("body");
      body.textContent = p.text;
      t.append(top, body);
      t.onclick = (ev) => {
        if (ev.target.closest(".actions,.replybox,textarea,a,button")) return;
        this.openThread = this.openThread === p.number ? null : p.number;
        this.renderPanel();
        if (this.openThread === p.number) void this.loadReplies(p.number);
      };
      if (this.openThread === p.number) {
        const rep = this.replies.get(p.number);
        const wrap = this.div("replies");
        if (!rep) {
          const l = this.div("when");
          l.textContent = "Loading replies\u2026";
          wrap.appendChild(l);
        } else {
          for (const r of rep) {
            const item = this.div("");
            const rt = this.div("top");
            const rwho = this.div("who");
            rwho.textContent = r.author.login;
            const rwhen = this.div("when");
            rwhen.textContent = timeAgo(r.createdAt);
            rt.append(rwho, rwhen);
            const rb2 = this.div("body");
            rb2.textContent = r.text;
            item.append(rt, rb2);
            wrap.appendChild(item);
          }
        }
        t.appendChild(wrap);
        const rb = this.div("replybox");
        const ta = document.createElement("textarea");
        ta.placeholder = "Reply\u2026";
        const send = this.btn("Reply", () => void doReply(), "primary");
        rb.append(ta, send);
        t.appendChild(rb);
        const doReply = async () => {
          const text = ta.value.trim();
          if (!text) return;
          if (!this.authed() && !await this.doAuth()) return;
          send.disabled = true;
          try {
            await this.gh.reply(p.number, text);
            const list = this.replies.get(p.number) ?? [];
            list.push({ id: Date.now(), author: this.me, text, createdAt: (/* @__PURE__ */ new Date()).toISOString() });
            this.replies.set(p.number, list);
            p.comments += 1;
            this.renderPins();
            this.renderPanel();
          } catch (e) {
            send.disabled = false;
            this.toast(this.writeError(e, "reply"));
          }
        };
        const actions = this.div("actions");
        if (p.state === "open") {
          actions.appendChild(
            this.btn("Resolve", async () => {
              if (!this.authed() && !await this.doAuth()) return;
              try {
                await this.gh.close(p.number);
                p.state = "closed";
                this.renderPins();
                this.renderPanel();
                this.toast(`Resolved \xB7 #${p.number}`);
              } catch (e) {
                this.toast(
                  e instanceof GHError && e.status === 403 ? "Only the comment author or repo maintainers can resolve" : this.writeError(e, "resolve")
                );
              }
            })
          );
        }
        const gh = document.createElement("a");
        gh.className = "btn";
        gh.href = p.htmlUrl;
        gh.target = "_blank";
        gh.rel = "noreferrer";
        gh.append("Open in GitHub ");
        const ic = document.createElement("span");
        ic.innerHTML = ICONS.ext;
        ic.style.cssText = "display:inline-block;vertical-align:-2px";
        gh.appendChild(ic);
        actions.appendChild(gh);
        t.appendChild(actions);
      }
      return t;
    }
    async loadReplies(n) {
      if (this.replies.has(n)) return;
      try {
        this.replies.set(n, await this.gh.listReplies(n));
      } catch {
        this.replies.set(n, []);
      }
      this.renderPanel();
    }
    /* auth ---------------------------------------------------------------------- */
    authed() {
      return !!getToken(this.cfg.relay);
    }
    async doAuth() {
      if (!this.cfg.relay) return false;
      try {
        await signIn(this.cfg.relay);
        this.me = await this.gh.me();
        this.renderPanel();
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        this.toast(
          msg === "popup-blocked" ? "Popup blocked \u2014 allow popups for this site and try again" : msg === "popup-closed" ? "Sign-in cancelled" : "Sign-in failed \u2014 try again"
        );
        return false;
      }
    }
    writeError(e, verb) {
      if (e instanceof GHError) {
        if (e.status === 401) {
          signOut(this.cfg.relay);
          return "Session expired \u2014 sign in again";
        }
        if (e.status === 403) return `Can't ${verb}: the Crit GitHub App may not be installed on this repo`;
        if (e.status === 404) return `Can't ${verb}: repo not found (private repos need read access)`;
        return `Can't ${verb}: ${e.message}`;
      }
      return `Can't ${verb}: network error`;
    }
    /* toast / keys / router ------------------------------------------------------ */
    toast(msg, href) {
      this.toastEl?.remove();
      const t = this.div("toast");
      t.setAttribute("role", "status");
      t.textContent = msg;
      if (href) {
        t.append(" ");
        const a = document.createElement("a");
        a.href = href;
        a.target = "_blank";
        a.rel = "noreferrer";
        a.textContent = "View \u2197";
        t.appendChild(a);
      }
      this.shadow.appendChild(t);
      this.toastEl = t;
      setTimeout(() => {
        if (this.toastEl === t) {
          t.remove();
          this.toastEl = null;
        }
      }, 4e3);
    }
    patchRouter() {
      const fire = () => window.dispatchEvent(new Event("crit:nav"));
      const wrap = (fn) => function(...args) {
        const r = fn.apply(this, args);
        fire();
        return r;
      };
      history.pushState = wrap(history.pushState.bind(history));
      history.replaceState = wrap(history.replaceState.bind(history));
      const onNav = () => {
        const np = pageKey();
        if (np === this.page) return;
        this.page = np;
        this.openThread = null;
        this.closeComposer();
        this.exitMode();
        this.reresolve();
        this.renderAll();
      };
      window.addEventListener("popstate", onNav);
      window.addEventListener("hashchange", onNav);
      window.addEventListener("crit:nav", onNav);
    }
    observeDom() {
      let timer;
      const mo = new MutationObserver((muts) => {
        if (muts.every((m) => this.host.contains(m.target))) return;
        clearTimeout(timer);
        timer = window.setTimeout(() => {
          this.reresolve();
          this.renderPins();
        }, 350);
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }
    /* helpers ---------------------------------------------------------------------- */
    div(cls) {
      const d = document.createElement("div");
      if (cls) d.className = cls;
      return d;
    }
    btn(label, onClick, extra = "") {
      const b = document.createElement("button");
      b.className = `btn ${extra}`.trim();
      b.textContent = label;
      b.onclick = onClick;
      return b;
    }
    iconBtn(svg, label, onClick) {
      const b = document.createElement("button");
      b.className = "iconbtn";
      b.setAttribute("aria-label", label);
      b.innerHTML = svg;
      b.onclick = onClick;
      return b;
    }
  };
  function timeAgo(iso) {
    const s = Math.max(1, Math.floor((Date.now() - Date.parse(iso)) / 1e3));
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
  }

  // src/index.ts
  function boot() {
    const cfg = readConfig();
    if (cfg.scope && !location.pathname.startsWith(cfg.scope)) return;
    if (!cfg.repo) {
      if (new URLSearchParams(location.search).has("crit")) {
        console.warn(
          '[crit] Missing or invalid data-repo on the script tag. Expected data-repo="owner/repo". See https://github.com/hvelaayutham/crit#setup'
        );
      }
      return;
    }
    if (!cfg.relay) {
      console.warn("[crit] No data-relay configured \u2014 pins are read-only on this deploy.");
    }
    window.__CRIT_CSS = STYLES;
    const gh = new GH(cfg.api, cfg.repo, () => getToken(cfg.relay));
    const app = new App(cfg, gh);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => app.mount(), { once: true });
    } else {
      app.mount();
    }
  }
  boot();
  var version = VERSION;
  return __toCommonJS(index_exports);
})();
