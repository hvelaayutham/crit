/** Runtime config, read once from the <script> tag's data-* attributes. */

export interface Config {
  /** "owner/repo" — the GitHub repo whose Issues store the pins. */
  repo: string | null;
  /** Commit SHA of this deploy (provenance, not a checkout target). */
  sha: string | null;
  /** Origin of the OAuth relay, e.g. https://crit-relay.hvelu.workers.dev */
  relay: string | null;
  /** GitHub REST base. Override for GHES. */
  api: string;
  /** FAB corner. */
  position: 'bottom-right' | 'bottom-left';
  /** Optional path prefix; widget stays dormant outside it (monorepo Pages). */
  scope: string | null;
}

export const VERSION = '0.1.0';
export const SCHEMA_VERSION = 1;

export function readConfig(): Config {
  const el = (document.currentScript ||
    document.querySelector('script[data-repo][src*="crit"]')) as HTMLScriptElement | null;
  const d = el?.dataset ?? {};
  const repo = valid(d.repo) && /^[\w.-]+\/[\w.-]+$/.test(d.repo!) ? d.repo! : null;
  return {
    repo,
    sha: valid(d.sha) ? d.sha!.slice(0, 40) : null,
    relay: valid(d.relay) ? d.relay!.replace(/\/+$/, '') : null,
    api: valid(d.api) ? d.api!.replace(/\/+$/, '') : 'https://api.github.com',
    position: d.position === 'bottom-left' ? 'bottom-left' : 'bottom-right',
    scope: valid(d.scope) ? d.scope! : null,
  };
}

function valid(v: string | undefined): boolean {
  return typeof v === 'string' && v.length > 0;
}

/** Route key used to group pins per page (pathname + hash for hash routers). */
export function pageKey(): string {
  const hash = location.hash.length > 1 ? location.hash : '';
  return location.pathname + hash;
}
