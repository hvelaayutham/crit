/**
 * The whole in-page experience. Everything renders inside one shadow root;
 * user-generated text only ever goes through textContent.
 */

import { Anchor, Resolved, capture, resolve } from './anchors';
import { getToken, signIn, signOut } from './auth';
import { Config, pageKey } from './config';
import { GH, GHError, Me, Reply } from './gh';
import { Pin, buildBody, buildMeta, buildTitle } from './schema';

const ICONS = {
  pen: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M11.3 2.2a1.7 1.7 0 012.5 2.5L5.6 12.9l-3.3.8.8-3.3z"/></svg>',
  list: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 4.5h10M3 8h10M3 11.5h6"/></svg>',
  x: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  ext: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6.5 3.5H3.5v9h9V9.5M9.5 3h3.5v3.5M13 3L7.5 8.5"/></svg>',
};

interface ComposerState {
  el: Element;
  anchor: Anchor;
}

export class App {
  private shadow!: ShadowRoot;
  private host!: HTMLElement;
  private fab!: HTMLElement;
  private pinsLayer!: HTMLElement;
  private panelEl: HTMLElement | null = null;
  private composerEl: HTMLElement | null = null;
  private veil: HTMLElement | null = null;
  private outline: HTMLElement | null = null;
  private toastEl: HTMLElement | null = null;

  private me: Me | null = null;
  private pins: Pin[] = [];
  private hits = new Map<number, Resolved>();
  private pinEls = new Map<number, HTMLElement>();
  private replies = new Map<number, Reply[]>();

  private mode = false;
  private panelOpen = false;
  private openThread: number | null = null;
  private showResolved = false;
  private page = pageKey();
  private hoverEl: Element | null = null;
  private composer: ComposerState | null = null;
  private dirty = true;
  private loading = false;

  constructor(
    private cfg: Config,
    private gh: GH,
  ) {}

  /* ------------------------------- lifecycle ------------------------------ */

  mount(): void {
    this.host = document.createElement('crit-widget');
    this.host.style.cssText = 'position:fixed;inset:auto;z-index:2147483000;';
    this.shadow = this.host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    // STYLES imported lazily to keep this file readable
    style.textContent = (window as unknown as { __CRIT_CSS: string }).__CRIT_CSS;
    this.shadow.appendChild(style);

    this.pinsLayer = this.div('pins');
    this.shadow.appendChild(this.pinsLayer);

    this.fab = this.div(`fab ${this.cfg.position === 'bottom-left' ? 'left' : 'right'}`);
    this.shadow.appendChild(this.fab);
    this.renderFab();

    document.body.appendChild(this.host);

    document.addEventListener('keydown', this.onKey, true);
    window.addEventListener('scroll', this.markDirty, { capture: true, passive: true });
    window.addEventListener('resize', this.markDirty, { passive: true });
    this.rafLoop();
    this.patchRouter();
    this.observeDom();

    if (this.cfg.relay && getToken(this.cfg.relay)) {
      this.gh.me().then((m) => { this.me = m; this.renderPanel(); }).catch(() => signOut(this.cfg.relay));
    }
    void this.load();
  }

  private async load(force = false): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    try {
      this.pins = await this.gh.listPins(force);
      this.reresolve();
      this.renderAll();
    } catch (e) {
      if (e instanceof GHError && e.status === 404) {
        this.toast('Crit: repo not found or private — check data-repo');
      }
    } finally {
      this.loading = false;
    }
  }

  /* -------------------------------- resolve ------------------------------- */

  private pagePins(): Pin[] {
    return this.pins.filter((p) => p.meta.page === this.page);
  }

  private reresolve(): void {
    this.hits.clear();
    for (const p of this.pagePins()) this.hits.set(p.number, resolve(p.meta.anchor));
  }

  /* --------------------------------- render ------------------------------- */

  private renderAll(): void {
    this.renderFab();
    this.renderPins();
    this.renderPanel();
    this.markDirty();
  }

  private renderFab(): void {
    const open = this.pagePins().filter((p) => p.state === 'open').length;
    this.fab.innerHTML = '';
    const mode = document.createElement('button');
    mode.className = `mode${this.mode ? ' on' : ''}`;
    mode.setAttribute('aria-label', 'Toggle comment mode (c)');
    mode.title = 'Comment mode (c)';
    mode.innerHTML = ICONS.pen;
    const count = document.createElement('span');
    count.className = 'count';
    count.textContent = String(open);
    mode.appendChild(count);
    mode.onclick = () => this.toggleMode();

    const divider = this.div('divider');
    const list = document.createElement('button');
    list.setAttribute('aria-label', 'Open comments panel');
    list.title = 'Comments';
    list.innerHTML = ICONS.list;
    list.onclick = () => (this.panelOpen ? this.closePanel() : this.openPanel());

    this.fab.append(mode, divider, list);
  }

  /* pins ------------------------------------------------------------------ */

  private renderPins(): void {
    this.pinsLayer.innerHTML = '';
    this.pinEls.clear();
    const groups = new Map<Element, number>();
    for (const p of this.pagePins()) {
      if (p.state === 'closed' && !this.showResolved) continue;
      const hit = this.hits.get(p.number);
      if (!hit?.el) continue;
      const idx = groups.get(hit.el) ?? 0;
      groups.set(hit.el, idx + 1);
      const el = document.createElement('button');
      el.className = `pin${p.state === 'closed' ? ' resolved' : ''}`;
      el.dataset.stack = String(idx);
      el.setAttribute('aria-label', `Comment by ${p.author.login}: ${p.text.slice(0, 60)}`);
      el.title = `${p.author.login}: ${p.text.slice(0, 80)}`;
      if (/^https:\/\//.test(p.author.avatar)) {
        el.style.backgroundImage = `url("${p.author.avatar}")`;
      }
      if (p.comments > 0) {
        const n = this.div('n');
        n.textContent = String(p.comments + 1);
        el.appendChild(n);
      }
      el.onclick = () => this.openPanel(p.number);
      this.pinsLayer.appendChild(el);
      this.pinEls.set(p.number, el);
    }
    this.markDirty();
  }

  private position(): void {
    for (const [num, pinEl] of this.pinEls) {
      const hit = this.hits.get(num);
      if (!hit?.el || !hit.el.isConnected) {
        pinEl.style.display = 'none';
        continue;
      }
      const r = hit.el.getBoundingClientRect();
      const shift = Number(pinEl.dataset.stack || 0) * 16;
      pinEl.style.display = '';
      pinEl.style.left = `${r.left + Math.min(r.width / 2, 40) + shift}px`;
      pinEl.style.top = `${r.top + 2}px`;
    }
  }

  private markDirty = (): void => {
    this.dirty = true;
  };

  private rafLoop(): void {
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

  private toggleMode(): void {
    this.mode ? this.exitMode() : this.enterMode();
  }

  private enterMode(): void {
    if (this.mode) return;
    if (!this.cfg.relay) {
      this.toast('Crit: no relay configured — commenting is disabled. See README.');
      return;
    }
    this.mode = true;
    this.closeComposer();
    this.veil = this.div('veil');
    this.outline = this.div('outline hidden');
    const tag = this.div('tag');
    this.outline.appendChild(tag);
    this.shadow.append(this.veil, this.outline);

    this.veil.addEventListener('mousemove', (ev) => {
      this.veil!.style.pointerEvents = 'none';
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      this.veil!.style.pointerEvents = 'auto';
      if (!el || el === this.host || el === document.documentElement || el === document.body) {
        this.hoverEl = null;
        this.outline!.classList.add('hidden');
        return;
      }
      this.hoverEl = el;
      const r = el.getBoundingClientRect();
      Object.assign(this.outline!.style, {
        left: `${r.left - 2}px`,
        top: `${r.top - 2}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
      });
      tag.textContent = el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '');
      this.outline!.classList.remove('hidden');
    });
    this.veil.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (this.hoverEl) this.pick(this.hoverEl);
    });
    this.renderFab();
  }

  private exitMode(): void {
    this.mode = false;
    this.veil?.remove();
    this.outline?.remove();
    this.veil = this.outline = null;
    this.hoverEl = null;
    this.renderFab();
  }

  private pick(el: Element): void {
    const anchor = capture(el);
    this.exitMode();
    this.openComposer({ el, anchor });
  }

  /* composer ---------------------------------------------------------------- */

  private openComposer(c: ComposerState): void {
    this.closeComposer();
    this.composer = c;
    const card = this.div('card');
    const header = document.createElement('header');
    const av = this.div('avatar');
    if (this.me && /^https:\/\//.test(this.me.avatar)) av.style.backgroundImage = `url("${this.me.avatar}")`;
    const title = this.div('title');
    title.textContent = this.me ? this.me.login : 'New comment';
    header.append(av, title);

    const ta = document.createElement('textarea');
    ta.placeholder = 'What should change here?';
    ta.setAttribute('aria-label', 'Comment');

    const footer = document.createElement('footer');
    const hint = this.div('hint');
    hint.textContent = '⌘/Ctrl + ↵ to send';
    const cancel = this.btn('Cancel', () => this.closeComposer());
    const send = this.btn(this.authed() ? 'Comment' : 'Sign in with GitHub', () => void submit(), 'primary');
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
        title.textContent = this.me!.login;
        if (/^https:\/\//.test(this.me!.avatar)) av.style.backgroundImage = `url("${this.me!.avatar}")`;
        send.textContent = 'Comment';
        ta.focus();
        return;
      }
      const text = ta.value.trim();
      if (!text) { ta.focus(); return; }
      send.textContent = 'Posting…';
      (send as HTMLButtonElement).disabled = true;
      try {
        const meta = buildMeta(c.anchor, this.page, this.cfg.sha);
        const res = await this.gh.createIssue(buildTitle(text, this.page), buildBody(text, meta));
        this.pins.unshift({
          number: res.number,
          htmlUrl: res.html_url,
          state: 'open',
          author: this.me!,
          text,
          meta,
          comments: 0,
          createdAt: new Date().toISOString(),
        });
        this.reresolve();
        this.closeComposer();
        this.renderAll();
        this.toast(`Comment posted · #${res.number}`, res.html_url);
      } catch (e) {
        (send as HTMLButtonElement).disabled = false;
        send.textContent = 'Comment';
        this.toast(this.writeError(e, 'post'));
      }
    };
    ta.addEventListener('keydown', (ev) => {
      if ((ev.metaKey || ev.ctrlKey) && ev.key === 'Enter') void submit();
    });
  }

  private closeComposer(): void {
    this.composerEl?.remove();
    this.composerEl = null;
    this.composer = null;
  }

  private placeCard(card: HTMLElement, target: Element): void {
    const r = target.getBoundingClientRect();
    const w = 300;
    const left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
    let top = r.bottom + 8;
    if (top > window.innerHeight - 190) top = Math.max(8, r.top - 190);
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  }

  /* panel -------------------------------------------------------------------- */

  private openPanel(focus?: number): void {
    this.panelOpen = true;
    if (typeof focus === 'number') this.openThread = focus;
    this.renderPanel();
    if (typeof focus === 'number') void this.loadReplies(focus);
  }

  private closePanel(): void {
    this.panelOpen = false;
    this.openThread = null;
    this.renderPanel();
  }

  private renderPanel(): void {
    this.panelEl?.remove();
    this.panelEl = null;
    if (!this.panelOpen) return;

    const panel = this.div(`panel ${this.cfg.position === 'bottom-left' ? 'left' : 'right'}`);
    const header = document.createElement('header');
    const title = this.div('title');
    title.textContent = 'Crit';
    const path = this.div('path');
    path.textContent = this.page;
    path.style.flex = '1';
    const close = this.iconBtn(ICONS.x, 'Close panel', () => this.closePanel());
    header.append(title, path, close);

    const list = this.div('list');
    const all = this.pagePins();
    const active = all.filter((p) => p.state === 'open' && this.hits.get(p.number)?.el);
    const lost = all.filter((p) => p.state === 'open' && !this.hits.get(p.number)?.el);
    const done = all.filter((p) => p.state === 'closed');

    if (all.length === 0) {
      const empty = this.div('empty');
      empty.innerHTML = '';
      const b = document.createElement('b');
      b.textContent = 'No comments on this page yet.';
      const rest = document.createElement('div');
      rest.textContent = 'Press c, then click anything.';
      empty.append(b, rest);
      list.appendChild(empty);
    }
    for (const p of active) list.appendChild(this.thread(p, 'open'));
    if (lost.length) {
      const s = this.div('section');
      s.textContent = 'Unanchored — element no longer found';
      list.appendChild(s);
      for (const p of lost) list.appendChild(this.thread(p, 'lost'));
    }
    if (this.showResolved && done.length) {
      const s = this.div('section');
      s.textContent = 'Resolved';
      list.appendChild(s);
      for (const p of done) list.appendChild(this.thread(p, 'done'));
    }

    const footer = document.createElement('footer');
    const who = this.div('');
    if (this.me) {
      who.textContent = this.me.login + ' · ';
      const out = document.createElement('span');
      out.className = 'linkish';
      out.textContent = 'sign out';
      out.onclick = () => {
        signOut(this.cfg.relay);
        this.me = null;
        this.renderPanel();
      };
      who.appendChild(out);
    } else {
      const inn = document.createElement('span');
      inn.className = 'linkish';
      inn.textContent = 'Sign in with GitHub';
      inn.onclick = () => void this.doAuth();
      who.appendChild(inn);
    }
    const grow = this.div('grow');
    const tog = document.createElement('span');
    tog.className = 'linkish';
    tog.textContent = this.showResolved ? 'Hide resolved' : `Show resolved (${done.length})`;
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

  private thread(p: Pin, kind: 'open' | 'lost' | 'done'): HTMLElement {
    const t = this.div(`thread${this.openThread === p.number ? ' open' : ''}`);
    const top = this.div('top');
    const av = this.div('avatar');
    if (/^https:\/\//.test(p.author.avatar)) av.style.backgroundImage = `url("${p.author.avatar}")`;
    const who = this.div('who');
    who.textContent = p.author.login;
    const when = this.div('when');
    when.textContent = timeAgo(p.createdAt);
    const chip = this.div(`chip${kind === 'done' ? ' done' : kind === 'lost' ? ' lost' : ''}`);
    chip.textContent = kind === 'done' ? 'resolved' : kind === 'lost' ? 'unanchored' : `#${p.number}`;
    top.append(av, who, when, chip);
    const body = this.div('body');
    body.textContent = p.text;
    t.append(top, body);

    t.onclick = (ev) => {
      if ((ev.target as HTMLElement).closest('.actions,.replybox,textarea,a,button')) return;
      this.openThread = this.openThread === p.number ? null : p.number;
      this.renderPanel();
      if (this.openThread === p.number) void this.loadReplies(p.number);
    };

    if (this.openThread === p.number) {
      const rep = this.replies.get(p.number);
      const wrap = this.div('replies');
      if (!rep) {
        const l = this.div('when');
        l.textContent = 'Loading replies…';
        wrap.appendChild(l);
      } else {
        for (const r of rep) {
          const item = this.div('');
          const rt = this.div('top');
          const rwho = this.div('who');
          rwho.textContent = r.author.login;
          const rwhen = this.div('when');
          rwhen.textContent = timeAgo(r.createdAt);
          rt.append(rwho, rwhen);
          const rb = this.div('body');
          rb.textContent = r.text;
          item.append(rt, rb);
          wrap.appendChild(item);
        }
      }
      t.appendChild(wrap);

      const rb = this.div('replybox');
      const ta = document.createElement('textarea');
      ta.placeholder = 'Reply…';
      const send = this.btn('Reply', () => void doReply(), 'primary');
      rb.append(ta, send);
      t.appendChild(rb);
      const doReply = async () => {
        const text = ta.value.trim();
        if (!text) return;
        if (!this.authed() && !(await this.doAuth())) return;
        (send as HTMLButtonElement).disabled = true;
        try {
          await this.gh.reply(p.number, text);
          const list = this.replies.get(p.number) ?? [];
          list.push({ id: Date.now(), author: this.me!, text, createdAt: new Date().toISOString() });
          this.replies.set(p.number, list);
          p.comments += 1;
          this.renderPins();
          this.renderPanel();
        } catch (e) {
          (send as HTMLButtonElement).disabled = false;
          this.toast(this.writeError(e, 'reply'));
        }
      };

      const actions = this.div('actions');
      if (p.state === 'open') {
        actions.appendChild(
          this.btn('Resolve', async () => {
            if (!this.authed() && !(await this.doAuth())) return;
            try {
              await this.gh.close(p.number);
              p.state = 'closed';
              this.renderPins();
              this.renderPanel();
              this.toast(`Resolved · #${p.number}`);
            } catch (e) {
              this.toast(
                e instanceof GHError && e.status === 403
                  ? 'Only the comment author or repo maintainers can resolve'
                  : this.writeError(e, 'resolve'),
              );
            }
          }),
        );
      }
      const gh = document.createElement('a');
      gh.className = 'btn';
      gh.href = p.htmlUrl;
      gh.target = '_blank';
      gh.rel = 'noreferrer';
      gh.append('Open in GitHub ');
      const ic = document.createElement('span');
      ic.innerHTML = ICONS.ext;
      ic.style.cssText = 'display:inline-block;vertical-align:-2px';
      gh.appendChild(ic);
      actions.appendChild(gh);
      t.appendChild(actions);
    }
    return t;
  }

  private async loadReplies(n: number): Promise<void> {
    if (this.replies.has(n)) return;
    try {
      this.replies.set(n, await this.gh.listReplies(n));
    } catch {
      this.replies.set(n, []);
    }
    this.renderPanel();
  }

  /* auth ---------------------------------------------------------------------- */

  private authed(): boolean {
    return !!getToken(this.cfg.relay);
  }

  private async doAuth(): Promise<boolean> {
    if (!this.cfg.relay) return false;
    try {
      await signIn(this.cfg.relay);
      this.me = await this.gh.me();
      this.renderPanel();
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      this.toast(
        msg === 'popup-blocked'
          ? 'Popup blocked — allow popups for this site and try again'
          : msg === 'popup-closed'
            ? 'Sign-in cancelled'
            : 'Sign-in failed — try again',
      );
      return false;
    }
  }

  private writeError(e: unknown, verb: string): string {
    if (e instanceof GHError) {
      if (e.status === 401) {
        signOut(this.cfg.relay);
        return 'Session expired — sign in again';
      }
      if (e.status === 403) return `Can't ${verb}: the Crit GitHub App may not be installed on this repo`;
      if (e.status === 404) return `Can't ${verb}: repo not found (private repos need read access)`;
      return `Can't ${verb}: ${e.message}`;
    }
    return `Can't ${verb}: network error`;
  }

  /* toast / keys / router ------------------------------------------------------ */

  private toast(msg: string, href?: string): void {
    this.toastEl?.remove();
    const t = this.div('toast');
    t.setAttribute('role', 'status');
    t.textContent = msg;
    if (href) {
      t.append(' ');
      const a = document.createElement('a');
      a.href = href;
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.textContent = 'View ↗';
      t.appendChild(a);
    }
    this.shadow.appendChild(t);
    this.toastEl = t;
    setTimeout(() => {
      if (this.toastEl === t) {
        t.remove();
        this.toastEl = null;
      }
    }, 4000);
  }

  private onKey = (ev: KeyboardEvent): void => {
    const path = ev.composedPath();
    const inWidget = path.includes(this.host);
    const typingInPage =
      !inWidget &&
      (['INPUT', 'TEXTAREA', 'SELECT'].includes((ev.target as HTMLElement)?.tagName) ||
        (ev.target as HTMLElement)?.isContentEditable);

    if (ev.key === 'Escape') {
      if (this.composerEl) this.closeComposer();
      else if (this.mode) this.exitMode();
      else if (this.openThread !== null) {
        this.openThread = null;
        this.renderPanel();
      } else if (this.panelOpen) this.closePanel();
      return;
    }
    if (inWidget || typingInPage) return;
    if (ev.key === 'c' && !ev.metaKey && !ev.ctrlKey && !ev.altKey) {
      ev.preventDefault();
      this.toggleMode();
    }
  };

  private patchRouter(): void {
    const fire = () => window.dispatchEvent(new Event('crit:nav'));
    const wrap = (fn: History['pushState']) =>
      function (this: History, ...args: Parameters<History['pushState']>) {
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
    window.addEventListener('popstate', onNav);
    window.addEventListener('hashchange', onNav);
    window.addEventListener('crit:nav', onNav);
  }

  private observeDom(): void {
    let timer: number | undefined;
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

  private div(cls: string): HTMLElement {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    return d;
  }

  private btn(label: string, onClick: () => void, extra = ''): HTMLElement {
    const b = document.createElement('button');
    b.className = `btn ${extra}`.trim();
    b.textContent = label;
    b.onclick = onClick;
    return b;
  }

  private iconBtn(svg: string, label: string, onClick: () => void): HTMLElement {
    const b = document.createElement('button');
    b.className = 'iconbtn';
    b.setAttribute('aria-label', label);
    b.innerHTML = svg;
    b.onclick = onClick;
    return b;
  }
}

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
