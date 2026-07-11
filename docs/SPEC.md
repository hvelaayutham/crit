# Crit — Product & Technical Spec

**Working name:** Crit (naming open — see §14)
**One-liner:** Element-pinned review comments on GitHub Pages prototypes, stored as GitHub Issues. *Utterances for visual review.*
**License:** MIT · **Author:** Hari (@hvelu_) · **Status:** Draft v0.1 · July 2026

---

## 1. Problem

Builders ship prototypes to GitHub Pages and share the link. Reviewers — PMs, design managers, stakeholders — respond by pasting screenshots into docs and describing what they mean. GitHub's own review surface (PR diffs) is built for code, not rendered UI, so non-engineer reviewers never use it. Feedback loses its anchor to the actual element, the version it was given on, and any machine-readable structure an agent could act on.

Existing tools (BugHerd, Pastel, Vercel Comments) solve this with their own accounts, their own databases, and their own dashboards. That's a fourth tool, a new identity, and a SaaS bill — for feedback about code that already lives in GitHub.

## 2. Solution

A zero-backend, open-source review layer:

- A **widget** injected into any GitHub Pages deploy. Reviewers click the actual element, type a comment, done.
- **GitHub is the identity** — reviewers sign in with the GitHub account they already have (enterprise SSO included).
- **GitHub is the database** — every comment becomes a GitHub Issue in the prototype's repo, carrying the element selector, viewport, and commit SHA of that deploy.
- **Agents close the loop** — label an issue `agent-fix` and a coding agent (Claude Code, Copilot) can locate the element, patch it, and open a PR. Feedback becomes a work item, not a screenshot.

**Core property:** the reviewer never leaves the page; the builder never leaves GitHub.

## 3. Principles

1. **Zero backend.** The only server is a stateless OAuth relay. No database, no user table, nothing to operate at 3 a.m.
2. **Lean on GitHub's UI, never rebuild it.** Threading = issue comments. Resolve = close issue. Triage = labels. No dashboards.
3. **Reviewer effort ≈ zero.** No install, no new account, one OAuth click ever.
4. **Machine-readable by design.** Every comment carries structured metadata an agent can parse without heuristics.
5. **Self-hostable end to end.** Hosted defaults for convenience; nothing proprietary in the path.
6. **The widget is a guest.** It must never break, restyle, or slow down the prototype it sits on.

## 4. Personas & flows

### 4.1 Builder (setup, once)

Design technologist / engineer / AI-assisted PM who deploys prototypes via GitHub Pages.

1. Installs the GitHub App on the repo (grants `issues: write` on that repo only).
2. Adds the inject step to their Pages workflow **or** pastes one script tag into their HTML.
3. Pushes. The deployed prototype now shows a floating Review button.
4. Shares the same Pages URL they always shared.

### 4.2 Reviewer (every review)

PM / design manager / stakeholder with a GitHub account (enterprise SSO or personal).

1. Opens the link. Prototype renders normally; pins from prior reviewers are already visible (public repos need no auth to read).
2. Clicks **Review** → GitHub sign-in popup (first time only).
3. Cursor becomes a crosshair. Clicks the element in question → anchored comment box → types → **Send**.
4. Can reply to existing pins in-place. Never sees github.com.

### 4.3 Builder (triage)

1. Gets a normal GitHub notification: new issue, labeled `crit`, titled with the comment excerpt and page path.
2. Issue body shows the comment plus a metadata block: page, selector, viewport, commit SHA.
3. Fixes and pushes → Pages redeploys → replies or closes the issue → pin turns resolved on the page.

### 4.4 Agent loop (optional)

1. Builder adds label `agent-fix` to an issue.
2. A repo workflow triggers a coding agent with the issue body as the task.
3. Agent uses `anchor.css` / `anchor.text` to locate the component in source, patches it, opens a PR with `Fixes #N`.
4. Merge → redeploy → issue auto-closes → pin resolves. Reviewer verifies on the same URL.

## 5. Scope

### v1 — must ship

| Capability | Detail |
|---|---|
| Pin & comment | Click any element, compose, submit → creates GitHub Issue |
| Read pins | Anyone (no auth) sees pins + threads on public repos |
| Threads | Replies from the widget post as issue comments |
| Resolve | Closing the issue (from GitHub or widget) marks the pin resolved |
| Anchor capture | Multi-strategy selector + viewport + commit SHA + page path |
| Auth | GitHub App user-access-token flow via hosted or self-hosted relay |
| Inject Action | GitHub Action that injects the script tag into every HTML file at build time |
| Manual embed | Documented one-line `<script>` alternative |
| SPA support | History API + hash routing; pins scoped per route |
| Orphan handling | Pins whose anchor no longer resolves appear in a side list, not floating wrong |
| Agent example | Reference workflow: `agent-fix` label → Claude Code → PR |

### v2 — explicitly deferred

Screenshots attached to comments (html-to-image is a tar pit — selector + SHA already reproduces the state), region/rectangle pins, private Pages (GitHub Enterprise Cloud), GitHub Discussions as an alternative backend, mobile compose, re-anchoring assistant for orphaned pins, in-widget markdown rendering, localization.

### Non-goals — permanently

Own database or user accounts. Task management, boards, or dashboards. Non-GitHub auth. Arbitrary-website extension mode. Video/screen recording. Figma integration.

## 6. Architecture

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

Three deliverables in one monorepo:

```
crit/
├── packages/widget/    # vanilla TS, zero deps, shadow DOM, <20 KB gz
├── packages/relay/     # Cloudflare Worker, ~100 LOC, deploy button
├── packages/action/    # composite GitHub Action (inject step)
├── examples/agent-fix/ # reference Claude Code workflow
└── docs/               # itself a Pages site running the widget (dogfood)
```

### 6.1 Widget

- **Vanilla TypeScript, zero runtime dependencies.** Budget: ≤ 20 KB gzipped. No framework.
- **Shadow DOM** for all UI. Prototype CSS cannot leak in; widget CSS cannot leak out.
- Renders comment bodies as **plain text** in v1 (no markdown → no sanitizer dependency → no XSS surface). "Open in GitHub" link for the rich view.
- Reads config from `data-*` attributes on its own script tag.
- All positioning recomputed on resize/scroll via a single rAF loop; `IntersectionObserver` culls offscreen pins.

### 6.2 Auth — GitHub App with user access tokens

**Decision: GitHub App, not OAuth App.** An OAuth App's `public_repo` scope grants write access to *all* the user's public repos — unacceptable. A GitHub App is installed per-repo by the builder with `Issues: read/write` + `Metadata: read` only. Reviewers sign in through the App's OAuth flow and receive a **user access token**: actions are attributed to the reviewer (issue shows their avatar/name) but constrained to the intersection of the App's per-repo permissions and the user's own rights.

Flow: widget opens popup → GitHub authorize → redirect to relay callback → relay exchanges code (holds client secret) → returns token to opener via `postMessage` (origin-checked) → widget stores token in `localStorage` (documented tradeoff; **Sign out** clears it; tokens expire in 8 h with refresh).

Relay: stateless, no logging, no persistence. Env: `APP_CLIENT_ID`, `APP_CLIENT_SECRET`. One-click deploy to Cloudflare Workers for self-hosters; a hosted instance is the default for zero-config adoption.

Unauthenticated reads: listing issues on public repos needs no token (60 req/h per IP — sufficient for pin display; responses cached in `sessionStorage`).

### 6.3 Anchoring (the hard problem)

Every pin captures **all** strategies at comment time; resolution tries them in order at render time:

1. `data-review-id` — documented escape hatch builders can add to key elements
2. `id`, if unique in document
3. **Stable CSS path** — classes filtered through a heuristic that drops hashed/utility classes (`css-1x2y3z`, `sc-*`, `jsx-*`, single-purpose Tailwind runs)
4. Structural `nth-child` path
5. **Text fingerprint** — `tagName + normalized innerText (first 64 chars)`
6. Viewport-relative coordinates (`xPct`, `yPct`) — display fallback only

If only (6) matches, or nothing does, the pin is **orphaned**: it leaves the canvas and appears in the panel's "Unanchored" section with its original page/SHA context. Never render a pin on a wrong element.

New deploys don't invalidate pins by default — anchors usually survive. The stored `commit` tells the builder exactly which version the feedback referenced.

### 6.4 SPA support

Patch `history.pushState`/`replaceState` + listen to `popstate`/`hashchange` → recompute `page` key → re-resolve pins for the route. A debounced `MutationObserver` retries unresolved anchors for 10 s after route change (late-rendered components).

## 7. Data model — the Issue schema

One issue per pin (thread). Label: `crit` (created by the App on install). Title:

```
[review] The CTA feels lost below the fold… (/checkout/)
```

Body = human comment + collapsed machine block:

````markdown
The CTA feels lost below the fold on laptop — can we try it inside the hero?

<details><summary>📍 Pin metadata</summary>

```json
{
  "crit": 1,
  "page": "/checkout/",
  "url": "https://hvelu.github.io/proto-x/checkout/",
  "anchor": {
    "reviewId": null,
    "id": "cta-primary",
    "css": "main > section.hero button.btn-primary",
    "nth": "body > div:nth-child(2) > section:nth-child(1) > button",
    "text": "BUTTON|Start free trial",
    "coords": { "xPct": 48.2, "yPct": 71.5 }
  },
  "viewport": { "w": 1440, "h": 900, "dpr": 2 },
  "ua": "Chrome 138 / macOS",
  "commit": "9f31c2a",
  "deployedAt": "2026-07-11T09:12:33Z",
  "widget": "0.1.0"
}
```
</details>
````

Parsing contract for agents and the widget: *first fenced `json` block containing `"crit": 1`.* Everything above the `<details>` tag is the human comment. Schema is versioned by the `crit` integer; additive changes only within a version.

State mapping: issue `open` ↔ pin active · issue `closed` ↔ pin resolved · issue comments ↔ thread replies (widget replies append a hidden `<!-- crit:reply -->` marker so programmatic and manual comments are distinguishable but rendered identically).

## 8. Inject Action

Composite Action that runs between build and `actions/upload-pages-artifact`:

```yaml
- uses: hvelaayutham/crit/packages/action@main
  with:
    dir: ./dist            # built site root
    repo: ${{ github.repository }}
    sha:  ${{ github.sha }}
    # relay: https://relay.your-domain.dev   (optional, self-hosted)
    # position: bottom-right                  (default)
```

Behavior: glob `**/*.html` under `dir`, insert before `</body>`:

```html
<script src="https://cdn.crit.dev/widget@1.js" defer
  data-repo="hvelu/proto-x" data-sha="9f31c2a"
  data-relay="https://relay.crit.dev"></script>
```

Idempotent (skips files already injected). Fails the build loudly if `dir` contains no HTML. The manual snippet is the same tag with a hardcoded repo and `data-sha` omitted (widget then records `"commit": null`).

## 9. Widget UX spec

**Entry.** Floating pill button, bottom-right (configurable corner), 40 px, offset 16 px. Icon + count of open pins. States: idle / active (comment mode) / signed-out. Fully keyboard reachable; `c` toggles comment mode, `Esc` exits.

**Comment mode.** Cursor becomes crosshair. Hover draws a 2 px outline + subtle scrim on the hovered element (outline only — no layout shift). Click freezes the target, opens composer anchored to it: avatar, textarea (autofocus), `⌘/Ctrl+Enter` to send, character guidance at 400+. Signed-out click routes to auth first, then restores the pending pin.

**Pins.** 24 px circle, reviewer avatar, count badge for threads ≥ 2. Resolved pins: 40% opacity, check glyph, hidden by default behind a "Show resolved" toggle. Overlapping pins cluster with a count and fan out on hover.

**Panel.** Slide-in from the pin or the entry button: thread view, reply box, Resolve button (closes the issue), "Open in GitHub" link, and the Unanchored section (§6.3). Per-route filter is automatic.

**States to design explicitly:** first-run empty state ("No comments yet — press c"), auth popup blocked, token expired mid-compose (draft preserved in memory), API rate-limited, repo App not installed (widget renders a builder-facing setup hint only when `?crit=setup` is in the URL — reviewers never see config errors), offline.

**Accessibility.** Focus trap in composer/panel, ARIA labels on pins (`"Comment by <user>, <excerpt>"`), full keyboard pin navigation (`[` / `]`), respects `prefers-reduced-motion`, WCAG AA contrast in both themes.

**Theming.** Light/dark via `prefers-color-scheme`; overridable with CSS custom properties (`--rl-accent`, `--rl-surface`, `--rl-radius`) on `:host`.

**Mobile (v1).** Pins and threads are viewable; composing is desktop-only (a tooltip says so). Compose needs precise targeting — deferred rather than shipped badly.

## 10. Security & privacy

- **Token scope** is the headline: App permissions cap damage to *issues on that one repo*, even if a token leaks. Document this prominently — it's also the adoption argument for security-conscious orgs.
- `localStorage` token storage is a deliberate tradeoff (persistence across visits vs. XSS exposure). Mitigations: widget injects zero third-party code, renders plain text only, shadow DOM isolation. Sign-out and 8 h expiry bound the window. Documented, not hidden.
- Relay: stateless, no logs, CORS-agnostic by design (token returned only via `postMessage` to the opener with origin check against the initiating page).
- **Spam surface** = GitHub's own: any GitHub user can open issues on a public repo today; Crit adds no new capability. Builders can rate-limit via GitHub's interaction limits.
- **CSP:** document required directives (`script-src` for the CDN, `connect-src` for `api.github.com` + relay). The Action can optionally patch a meta CSP.
- Telemetry: **none**. Adoption measured by Marketplace installs and stars only.

## 11. Agent-fix reference workflow

Shipped as `examples/agent-fix/workflow.yml`, documented, not installed by default:

```yaml
on:
  issues:
    types: [labeled]
jobs:
  fix:
    if: github.event.label.name == 'agent-fix'
    runs-on: ubuntu-latest
    permissions: { contents: write, pull-requests: write, issues: read }
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          prompt: >
            Read issue #${{ github.event.issue.number }}. Parse the crit
            JSON block. Use anchor.css / anchor.text to locate the component
            in source. Implement the requested change. Open a PR titled
            "fix: <issue title>" with body "Fixes #${{ github.event.issue.number }}".
```

Guidance in docs: agent edits the **default branch head**, not the pinned SHA — the SHA is provenance, not a checkout target. `Fixes #N` auto-closes the issue on merge → pin resolves on next deploy.

## 12. Milestones

**M0 — Dogfood (weeks 1–3).** Widget + relay + manual script tag on one personal prototype repo. Hari's own PM/design manager leave 10+ real comments. *Exit criteria: a non-engineer completes sign-in → pin → comment unassisted; zero prototype breakage; anchors survive one redeploy.*

**M1 — OSS release (weeks 4–6).** Inject Action on Marketplace, docs site (running the widget on itself), README with 30-second GIF of the full loop, `deploy-relay` button. *Exit: a stranger goes zero-to-first-pin in under 10 minutes using docs alone.*

**M2 — Launch (weeks 7–8).** Show HN / X thread under @hvelu_. The demo is the agent loop: comment on the page → issue → Claude Code PR → merged → pin resolves. Title the launch around that, not the widget.

**M3 — v2 triage.** Prioritize from real issues; screenshots and private Pages are the expected front-runners.

## 13. Success criteria (12 months)

- 1,000+ GitHub stars; 200+ repos with the Action installed.
- ≥ 3 external contributors with merged PRs.
- The agent-fix demo reproduced publicly by someone who isn't Hari.
- Zero security incidents attributable to the token model.

## 14. Open questions

1. **Name.** "Crit" is design-native (redlining = markup) but collides with existing dev tools — shortlist and trademark-check before M1. Candidates worth exploring: something ownable under the hvelu brand.
2. **Issues vs. Discussions.** Issues pollute the tracker on active repos; Discussions have a weaker API and no `Fixes #N` auto-close. v1 = Issues; revisit if users complain.
3. **Monorepo / multi-prototype repos.** Path-prefix config (`data-scope="/proto-x/"`) so one repo can host several reviewable prototypes — likely cheap, confirm in M0.
4. **Org-level install story.** Can a design-systems team install the App org-wide so every Pages repo is one script tag away? Matters for the Intuit-shaped adoption path.
5. **Hosted relay governance.** Who pays for and operates `relay.crit.dev` long-term; document a sunset promise (self-host path guarantees continuity).

---

## 15. Implementation deltas (v0 code vs. this spec)

1. **No label at creation.** GitHub only lets users with push access set labels via the API, so reviewer-created issues can't carry a `crit` label. Pins are identified by the body schema (`"crit": 1`) instead; an optional one-step workflow (README) adds the label for triage. §7's "label created by the App" is superseded.
2. **Issue listing** paginates `/issues?state=all` (≤300 most recent) and filters by schema client-side, cached 60 s in sessionStorage.
3. **Token refresh** is out of v0 relay scope — on expiry the widget clears the token and re-prompts. The 8 h expiry stands.
4. **Resolve permissions**: GitHub allows authors to close their own issues; others need triage/push. The widget attempts and surfaces a clear 403 message.
5. **CSS-path ambiguity** is tolerated up to 3 matches; the text fingerprint disambiguates (spec implied strict uniqueness).
