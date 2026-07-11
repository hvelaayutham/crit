/**
 * GitHub App user-access-token flow via the stateless relay.
 * The widget never sees the client secret; the relay never stores anything.
 *
 * Storage tradeoff (documented in SPEC §10): token lives in localStorage so
 * reviewers aren't re-prompted every visit. Sign out clears it; GitHub App
 * user tokens expire server-side (~8h) regardless.
 */

interface Stored {
  token: string;
  exp: number; // epoch ms
}

const DEFAULT_TTL = 8 * 3600 * 1000;

function key(relay: string): string {
  return `crit:auth:${relay}`;
}

export function getToken(relay: string | null): string | null {
  if (!relay) return null;
  try {
    const raw = localStorage.getItem(key(relay));
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored;
    if (Date.now() > s.exp - 60_000) {
      localStorage.removeItem(key(relay));
      return null;
    }
    return s.token;
  } catch {
    return null;
  }
}

export function signOut(relay: string | null): void {
  if (!relay) return;
  try {
    localStorage.removeItem(key(relay));
  } catch { /* ignore */ }
}

export function signIn(relay: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const relayOrigin = new URL(relay).origin;
    const url = `${relay}/authorize?origin=${encodeURIComponent(location.origin)}`;
    const w = 620;
    const h = 720;
    const left = Math.max(0, (screen.width - w) / 2);
    const top = Math.max(0, (screen.height - h) / 2);
    const popup = window.open(
      url,
      'crit-auth',
      `width=${w},height=${h},left=${left},top=${top},popup=1`,
    );
    if (!popup) {
      reject(new Error('popup-blocked'));
      return;
    }

    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMsg);
      clearInterval(closedPoll);
      clearTimeout(timeout);
      fn();
    };

    const onMsg = (ev: MessageEvent) => {
      if (ev.origin !== relayOrigin) return;
      const d = ev.data;
      if (!d || d.crit !== 'auth') return;
      if (typeof d.token === 'string' && d.token.length > 0) {
        const exp = Date.now() + (typeof d.expiresIn === 'number' ? d.expiresIn * 1000 : DEFAULT_TTL);
        try {
          localStorage.setItem(key(relay), JSON.stringify({ token: d.token, exp } satisfies Stored));
        } catch { /* private mode — session-only auth still works via resolve */ }
        finish(() => resolve(d.token));
      } else {
        finish(() => reject(new Error(d.error || 'auth-failed')));
      }
    };

    const closedPoll = setInterval(() => {
      if (popup.closed) finish(() => reject(new Error('popup-closed')));
    }, 500);
    const timeout = setTimeout(() => finish(() => reject(new Error('auth-timeout'))), 180_000);

    window.addEventListener('message', onMsg);
  });
}
