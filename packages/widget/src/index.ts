/**
 * Crit — element-pinned review comments on GitHub Pages prototypes,
 * stored as GitHub Issues. https://github.com/hvelaayutham/crit
 */

import { getToken } from './auth';
import { readConfig, VERSION } from './config';
import { GH } from './gh';
import { STYLES } from './styles';
import { App } from './ui';

function boot(): void {
  const cfg = readConfig();

  // Monorepo Pages: stay dormant outside the configured scope.
  if (cfg.scope && !location.pathname.startsWith(cfg.scope)) return;

  if (!cfg.repo) {
    if (new URLSearchParams(location.search).has('crit')) {
      console.warn(
        '[crit] Missing or invalid data-repo on the script tag. ' +
          'Expected data-repo="owner/repo". See https://github.com/hvelaayutham/crit#setup',
      );
    }
    return; // reviewers never see config errors
  }
  if (!cfg.relay) {
    console.warn('[crit] No data-relay configured — pins are read-only on this deploy.');
  }

  // Styles are passed to the shadow root via a module-scoped handoff to keep
  // ui.ts free of the CSS blob.
  (window as unknown as { __CRIT_CSS: string }).__CRIT_CSS = STYLES;

  const gh = new GH(cfg.api, cfg.repo, () => getToken(cfg.relay));
  const app = new App(cfg, gh);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.mount(), { once: true });
  } else {
    app.mount();
  }
}

boot();

export const version = VERSION;
