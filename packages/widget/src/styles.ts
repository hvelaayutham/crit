/**
 * All UI lives in shadow DOM; nothing leaks in or out.
 * Design language: quiet studio tool. One expressive element — the marker-red
 * target outline and pins, the digital red pen of a design crit. Everything
 * else is neutral ink on paper, system stack, compact type.
 * Overridable via CSS custom properties on the host: --crit-accent,
 * --crit-surface, --crit-ink, --crit-radius.
 */

export const STYLES = /* css */ `
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
`;
