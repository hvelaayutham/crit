/**
 * Thin GitHub REST client. Reads work unauthenticated on public repos
 * (60 req/h per IP — pins are cached in sessionStorage for 60s).
 * Writes require the user access token from the relay flow.
 */

import { Pin, parseBody } from './schema';

export class GHError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface Me {
  login: string;
  avatar: string;
}

interface RawIssue {
  number: number;
  title: string;
  body: string | null;
  state: string;
  html_url: string;
  comments: number;
  created_at: string;
  pull_request?: unknown;
  user: { login: string; avatar_url: string } | null;
}

export interface Reply {
  id: number;
  author: { login: string; avatar: string };
  text: string;
  createdAt: string;
}

const CACHE_TTL = 60_000;
const MAX_PAGES = 3; // 300 most recent issues — plenty for prototype repos

export class GH {
  constructor(
    private api: string,
    private repo: string,
    private token: () => string | null,
  ) {}

  private headers(): HeadersInit {
    const h: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    const t = this.token();
    if (t) h.Authorization = `Bearer ${t}`;
    return h;
  }

  private async req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.api}${path}`, {
      method,
      headers: { ...this.headers(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      let msg = res.statusText;
      try {
        msg = (await res.json()).message ?? msg;
      } catch { /* keep statusText */ }
      throw new GHError(res.status, msg);
    }
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  }

  /* ------------------------------ reads ------------------------------ */

  async listPins(force = false): Promise<Pin[]> {
    const key = `crit:pins:${this.repo}`;
    if (!force) {
      try {
        const hit = sessionStorage.getItem(key);
        if (hit) {
          const { at, pins } = JSON.parse(hit);
          if (Date.now() - at < CACHE_TTL) return pins as Pin[];
        }
      } catch { /* cache is best-effort */ }
    }
    const pins: Pin[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const batch = await this.req<RawIssue[]>(
        'GET',
        `/repos/${this.repo}/issues?state=all&per_page=100&page=${page}`,
      );
      for (const it of batch) {
        if (it.pull_request || !it.body) continue;
        const parsed = parseBody(it.body);
        if (!parsed) continue;
        pins.push({
          number: it.number,
          htmlUrl: it.html_url,
          state: it.state === 'closed' ? 'closed' : 'open',
          author: {
            login: it.user?.login ?? 'unknown',
            avatar: it.user?.avatar_url ?? '',
          },
          text: parsed.text,
          meta: parsed.meta,
          comments: it.comments,
          createdAt: it.created_at,
        });
      }
      if (batch.length < 100) break;
    }
    try {
      sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), pins }));
    } catch { /* quota — fine */ }
    return pins;
  }

  invalidate(): void {
    try {
      sessionStorage.removeItem(`crit:pins:${this.repo}`);
    } catch { /* ignore */ }
  }

  async listReplies(issue: number): Promise<Reply[]> {
    const raw = await this.req<
      { id: number; body: string; created_at: string; user: RawIssue['user'] }[]
    >('GET', `/repos/${this.repo}/issues/${issue}/comments?per_page=100`);
    return raw.map((c) => ({
      id: c.id,
      author: { login: c.user?.login ?? 'unknown', avatar: c.user?.avatar_url ?? '' },
      text: c.body.replace(/<!--\s*crit:reply\s*-->/g, '').trim(),
      createdAt: c.created_at,
    }));
  }

  async me(): Promise<Me> {
    const u = await this.req<{ login: string; avatar_url: string }>('GET', '/user');
    return { login: u.login, avatar: u.avatar_url };
  }

  /* ------------------------------ writes ----------------------------- */

  async createIssue(title: string, body: string): Promise<{ number: number; html_url: string }> {
    const r = await this.req<RawIssue>('POST', `/repos/${this.repo}/issues`, { title, body });
    this.invalidate();
    return { number: r.number, html_url: r.html_url };
  }

  async reply(issue: number, text: string): Promise<void> {
    await this.req('POST', `/repos/${this.repo}/issues/${issue}/comments`, {
      body: `${text.trim()}\n\n<!-- crit:reply -->`,
    });
    this.invalidate();
  }

  async close(issue: number): Promise<void> {
    await this.req('PATCH', `/repos/${this.repo}/issues/${issue}`, {
      state: 'closed',
      state_reason: 'completed',
    });
    this.invalidate();
  }
}
