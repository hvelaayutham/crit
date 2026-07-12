# Crit

**Element-pinned review comments on GitHub Pages prototypes — stored as GitHub Issues.**

Your PM opens the prototype link, clicks the actual button that feels wrong, and types. That comment lands in your repo as an issue carrying the element selector, viewport, and commit SHA of that exact deploy. Label it `agent-fix` and a coding agent can implement it and open a PR.

Think *utterances, but for visual review*. No database, no dashboard, no new accounts — GitHub is the identity and the storage. The reviewer never leaves the page; the builder never leaves GitHub.

```
reviewer clicks element ──▶ GitHub Issue (+ selector, viewport, SHA)
                                   │
                        label: agent-fix (optional)
                                   ▼
                    coding agent locates component ──▶ PR ──▶ "Fixes #N"
```

## Status

**v0 — experimental.** Built for public repos + GitHub Pages. APIs and schema may change. MIT.

## Setup (builder, ~10 minutes, once)

**1. Create a GitHub App** (Settings → Developer settings → GitHub Apps → New):
- Permissions: **Issues: Read & write**, **Metadata: Read** — nothing else.
- Callback URL: `https://<your-relay>/callback` (from step 2).
- Uncheck webhooks. Generate a **client secret**; note the **client ID**.
- Install the App on the prototype repo(s).

This scoping is the security story: even a leaked reviewer token can only touch issues on repos where *you* installed the App.

**2. Deploy the relay** (the only server — stateless, ~5 min):

```bash
cd packages/relay
npx wrangler deploy
npx wrangler secret put CLIENT_ID
npx wrangler secret put CLIENT_SECRET
```

**3. Inject the widget** into your Pages workflow, between build and upload:

```yaml
- uses: hvelaayutham/crit/packages/action@main
  with:
    dir: ./dist
    relay: https://crit-relay.<you>.workers.dev
```

No workflow? Paste one tag before `</body>` instead:

```html
<script src="https://cdn.jsdelivr.net/gh/hvelaayutham/crit@main/packages/widget/dist/crit.js"
  defer data-repo="you/your-proto" data-relay="https://crit-relay.<you>.workers.dev"></script>
```

Full example: [`examples/pages-deploy.yml`](examples/pages-deploy.yml).

## Reviewing (everyone else, ~0 minutes)

Open the Pages link → press **c** (or tap the pen) → click any element → type → send. Anything on the page is a target: buttons, images, headings, whole sections — and hovering empty background outlines the **entire page**, for feedback like "can we try a warmer background?" that isn't about one element. The pin lands on the exact spot you clicked (stored as an offset within the anchored element), so pointing at the corner of a section or one area of a large image works too. First comment asks for a one-time GitHub sign-in — enterprise SSO included. Pins from others are visible without signing in. Threads, replies, and resolve all work in-place; "Open in GitHub" is always one click away.

## How pins are stored

Each pin is one issue: your comment on top, machine block below.

````markdown
The CTA feels lost below the fold — try it inside the hero?

<details><summary>📍 Pin metadata</summary>

```json
{ "crit": 1, "page": "/checkout/",
  "anchor": { "id": "cta-primary", "css": "main > section.hero button.btn-primary",
              "nth": "body > …", "text": "BUTTON|Start free trial",
              "coords": { "xPct": 48.2, "yPct": 71.5 },
              "offset": { "xPct": 92.1, "yPct": 8.4 } },
  "viewport": { "w": 1440, "h": 900, "dpr": 2 },
  "commit": "9f31c2a", "widget": "0.1.0" }
```
</details>
````

Parsing contract (for agents too): *first fenced `json` block containing `"crit": 1`.* Issue closed = pin resolved. Issue comments = thread replies. If an element disappears in a later deploy, its pin moves to the panel's **Unanchored** list — it never floats on the wrong element.

**Labels:** reviewers usually can't set labels (GitHub requires push access), so pins are identified by the body schema, not a label. Want a `crit` label for triage? Add this tiny workflow:

```yaml
on: { issues: { types: [opened] } }
permissions: { issues: write }
jobs:
  label:
    if: startsWith(github.event.issue.title, '[crit]')
    runs-on: ubuntu-latest
    steps:
      - run: gh issue edit ${{ github.event.issue.number }} --add-label crit -R ${{ github.repository }}
        env: { GH_TOKEN: ${{ github.token }} }
```

## The agent loop

Copy [`examples/agent-fix.yml`](examples/agent-fix.yml) into `.github/workflows/`, add `ANTHROPIC_API_KEY` to repo secrets, and label any pin `agent-fix`. Claude Code parses the metadata, locates the component via the anchor, implements the change, and opens a PR with `Fixes #N` — merge, redeploy, and the pin resolves on the same URL the reviewer already has open.

## Security model

- **Blast radius**: the GitHub App grants issue read/write on installed repos only. Reviewer tokens inherit that ceiling.
- **Relay**: stateless code-for-token exchange; no storage, no logs, no cookies. Self-host it — you should.
- **Token** sits in `localStorage` so reviewers aren't re-prompted each visit; sign-out clears it and GitHub App user tokens expire (~8 h) regardless.
- **Widget** is zero-dependency, renders all user text as plain text, and lives entirely in shadow DOM.
- **Spam surface** is GitHub's own — anyone with a GitHub account can already open issues on a public repo; Crit adds no new capability.
- CSP: allow `script-src` for the widget host and `connect-src` for `api.github.com` + your relay.

## How it works

```
┌─────────────────────────────┐
│  GitHub Pages (prototype)   │
│  └── widget.js (shadow DOM) │
└──────┬──────────────┬───────┘
       │ OAuth code   │ REST (user access token)
       ▼              ▼
┌─────────────┐   ┌──────────────────────┐
│ OAuth relay │   │ GitHub API           │
│ (CF Worker, │   │  Issues on the repo  │
│  stateless) │   │  = the database      │
└─────────────┘   └──────────┬───────────┘
                             │ label: agent-fix
                             ▼
                  ┌──────────────────────┐
                  │ Actions workflow →   │
                  │ coding agent → PR    │
                  └──────────────────────┘
```

- **Widget** (`packages/widget/`) — vanilla TypeScript, zero runtime dependencies, everything in a shadow DOM so it can't clash with the prototype. When a reviewer pins an element it captures five anchoring strategies at once (explicit `data-crit-id`, unique `#id`, a stable-class CSS path, an `nth-of-type` path, and a text fingerprint) plus coordinates; at render time they're tried in order of reliability. Anchors that no longer resolve go to an "Unanchored" list — a pin is never floated on the wrong element.
- **Relay** (`packages/relay/`) — a ~120-line stateless Cloudflare Worker, the only server. It exists purely because a static page can't hold the GitHub App client secret: it redirects to GitHub OAuth, exchanges the code for a user access token, and `postMessage`s it back to the opener (origin-checked). No storage, no logs, no cookies.
- **Action** (`packages/action/`) — a composite GitHub Action that injects the widget `<script>` tag before `</body>` in every built HTML file, stamping in the repo, commit SHA, and relay origin. Idempotent; fails loudly if the directory has no HTML.

Reads (listing pins) work unauthenticated on public repos and are cached 60 s in `sessionStorage`; only writes require the sign-in flow.

## Development

```bash
cd packages/widget
npm install
npm run check   # tsc --noEmit
npm run build   # dist/crit.js (min) + dist/crit.dev.js
```

Widget budget: ≤ 20 KB gzipped (currently ~10.6 KB). No runtime dependencies, ever.

### Try it locally

A self-contained demo page lives in [`demo/`](demo/). It embeds the locally built widget on a fake landing page:

```bash
cd packages/widget && npm install && npm run build && cd ../..
python3 -m http.server 8642
# open http://localhost:8642/demo/
```

Press **c** and click any element — the crosshair, composer, and panel all work. Posting a comment requires a deployed relay + GitHub App (see Setup above); until then the widget correctly falls back to "Sign in with GitHub" and read-only mode.

## Repo layout

```
packages/widget/   TypeScript source → dist/crit.js
packages/relay/    Cloudflare Worker (OAuth code exchange)
packages/action/   composite Action: inject the tag at build time
examples/          Pages deploy + agent-fix workflows
demo/              local demo page for widget development
docs/SPEC.md       full product & technical spec
```

## Not doing

Own database, dashboards, task management, non-GitHub auth, screenshots (v1), arbitrary-site extension mode. See `docs/SPEC.md` §5 for the reasoning.

---

Made by [Hari Velu](https://hvelu.com) · [@hvelu_](https://x.com/hvelu_)
