/**
 * Anchoring: how a pin remembers which element it belongs to.
 *
 * Capture records EVERY strategy at comment time; resolve tries them in
 * order of reliability at render time. If nothing resolves, the pin is
 * "orphaned" — shown in the panel list, never floated on a wrong element.
 */

export interface Anchor {
  reviewId: string | null; // explicit data-crit-id escape hatch
  id: string | null;       // unique #id
  css: string | null;      // stable-class selector path
  nth: string | null;      // structural nth-of-type path (always present)
  text: string | null;     // "TAG|normalized innerText (≤64)"
  coords: { xPct: number; yPct: number }; // document-relative fallback
}

export interface Resolved {
  el: Element | null;
  strategy: 'reviewId' | 'id' | 'css' | 'nth' | 'text' | 'none';
}

/* ---------------------------------- capture --------------------------------- */

export function capture(el: Element): Anchor {
  const rect = el.getBoundingClientRect();
  const docW = Math.max(document.documentElement.scrollWidth, 1);
  const docH = Math.max(document.documentElement.scrollHeight, 1);
  return {
    reviewId: el.closest('[data-crit-id]')?.getAttribute('data-crit-id') ?? null,
    id: uniqueId(el),
    css: cssPath(el),
    nth: nthPath(el),
    text: fingerprint(el),
    coords: {
      xPct: round(((rect.left + window.scrollX + rect.width / 2) / docW) * 100),
      yPct: round(((rect.top + window.scrollY) / docH) * 100),
    },
  };
}

function uniqueId(el: Element): string | null {
  if (!el.id) return null;
  try {
    return document.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1 ? el.id : null;
  } catch {
    return null;
  }
}

/**
 * Classes that survive rebuilds are usable; generated/utility ones are not.
 * Heuristic, documented in SPEC §6.3 — errs toward dropping.
 */
function stableClasses(el: Element): string[] {
  return Array.from(el.classList)
    .filter(
      (c) =>
        c.length > 1 &&
        c.length <= 24 &&
        !/[0-9a-f]{5,}/i.test(c) &&           // content hashes
        !/[:[\]/!]/.test(c) &&                 // tailwind variants/arbitrary
        !/^(css|sc|jsx|svelte|astro|_)/.test(c),
    )
    .slice(0, 2);
}

function cssPath(el: Element): string | null {
  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur && cur !== document.body && parts.length < 6) {
    const tag = cur.tagName.toLowerCase();
    if (cur.id && uniqueId(cur)) {
      parts.unshift(`#${CSS.escape(cur.id)}`);
      break;
    }
    const cls = stableClasses(cur);
    parts.unshift(cls.length ? `${tag}.${cls.map((c) => CSS.escape(c)).join('.')}` : tag);
    cur = cur.parentElement;
  }
  const sel = parts.join(' > ');
  try {
    const n = document.querySelectorAll(sel).length;
    return n >= 1 && n <= 3 ? sel : null; // tolerate small ambiguity; text disambiguates
  } catch {
    return null;
  }
}

function nthPath(el: Element): string {
  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur && cur !== document.documentElement) {
    const tag = cur.tagName.toLowerCase();
    const parent: Element | null = cur.parentElement;
    if (!parent) break;
    const same = Array.from(parent.children).filter((c) => c.tagName === cur!.tagName);
    const idx = same.indexOf(cur) + 1;
    parts.unshift(`${tag}:nth-of-type(${idx})`);
    if (parent === document.body) {
      parts.unshift('body');
      break;
    }
    cur = parent;
  }
  return parts.join(' > ');
}

export function fingerprint(el: Element): string | null {
  const t = normText(el);
  return t.length >= 4 ? `${el.tagName}|${t.slice(0, 64)}` : null;
}

function normText(el: Element): string {
  const raw = (el as HTMLElement).innerText ?? el.textContent ?? '';
  return raw.trim().replace(/\s+/g, ' ');
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

/* ---------------------------------- resolve --------------------------------- */

export function resolve(a: Anchor): Resolved {
  if (a.reviewId) {
    const els = document.querySelectorAll(`[data-crit-id="${CSS.escape(a.reviewId)}"]`);
    if (els.length === 1) return { el: els[0], strategy: 'reviewId' };
  }
  if (a.id) {
    const el = document.getElementById(a.id);
    if (el) return { el, strategy: 'id' };
  }
  if (a.css) {
    const el = pick(safeQuery(a.css), a.text);
    if (el) return { el, strategy: 'css' };
  }
  if (a.nth) {
    const el = safeQuery(a.nth)[0];
    if (el && matchesFingerprint(el, a.text)) return { el, strategy: 'nth' };
  }
  if (a.text) {
    const tag = a.text.split('|', 1)[0];
    for (const el of Array.from(document.getElementsByTagName(tag))) {
      if (fingerprint(el) === a.text) return { el, strategy: 'text' };
    }
  }
  return { el: null, strategy: 'none' };
}

function safeQuery(sel: string): Element[] {
  try {
    return Array.from(document.querySelectorAll(sel));
  } catch {
    return [];
  }
}

/** Among candidates, prefer the fingerprint match; unique candidate wins outright. */
function pick(els: Element[], fp: string | null): Element | null {
  if (els.length === 1) return els[0];
  if (els.length > 1 && fp) return els.find((e) => fingerprint(e) === fp) ?? null;
  return null;
}

function matchesFingerprint(el: Element, fp: string | null): boolean {
  return fp === null || fingerprint(el) === fp;
}
