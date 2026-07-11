/**
 * The Issue is the database row. Human text on top, machine block below.
 *
 * Parsing contract (for this widget AND for coding agents):
 *   the first fenced ```json block whose object contains "crit": 1.
 * Additive changes only within a schema version.
 */

import { Anchor } from './anchors';
import { SCHEMA_VERSION, VERSION } from './config';

export interface PinMeta {
  crit: number;
  page: string;
  url: string;
  anchor: Anchor;
  viewport: { w: number; h: number; dpr: number };
  ua: string;
  commit: string | null;
  createdAt: string;
  widget: string;
}

export interface Pin {
  number: number;
  htmlUrl: string;
  state: 'open' | 'closed';
  author: { login: string; avatar: string };
  text: string;
  meta: PinMeta;
  comments: number;
  createdAt: string;
}

export const REPLY_MARKER = '<!-- crit:reply -->';

export function buildMeta(anchor: Anchor, page: string, sha: string | null): PinMeta {
  return {
    crit: SCHEMA_VERSION,
    page,
    url: location.href,
    anchor,
    viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 },
    ua: shortUA(),
    commit: sha,
    createdAt: new Date().toISOString(),
    widget: VERSION,
  };
}

export function buildTitle(text: string, page: string): string {
  const head = text.trim().replace(/\s+/g, ' ').slice(0, 48);
  const ellipsis = text.trim().length > 48 ? '…' : '';
  return `[crit] ${head}${ellipsis} (${page})`;
}

export function buildBody(text: string, meta: PinMeta): string {
  return [
    text.trim(),
    '',
    '<details><summary>📍 Pin metadata</summary>',
    '',
    '```json',
    JSON.stringify(meta, null, 2),
    '```',
    '</details>',
  ].join('\n');
}

const FENCE = /```json\s*\n([\s\S]*?)\n```/g;

/** Returns null for issues that are not Crit pins. */
export function parseBody(body: string): { text: string; meta: PinMeta } | null {
  FENCE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = FENCE.exec(body))) {
    try {
      const obj = JSON.parse(m[1]);
      if (obj && obj.crit === SCHEMA_VERSION && obj.anchor && typeof obj.page === 'string') {
        const cut = body.indexOf('<details>');
        const text = (cut > 0 ? body.slice(0, cut) : body).trim();
        return { text, meta: obj as PinMeta };
      }
    } catch {
      /* not ours; keep scanning */
    }
  }
  return null;
}

function shortUA(): string {
  const ua = navigator.userAgent;
  const browser =
    /Edg\//.test(ua) ? 'Edge' :
    /Chrome\//.test(ua) ? 'Chrome' :
    /Safari\//.test(ua) && !/Chrome/.test(ua) ? 'Safari' :
    /Firefox\//.test(ua) ? 'Firefox' : 'Browser';
  const os =
    /Mac/.test(ua) ? 'macOS' :
    /Windows/.test(ua) ? 'Windows' :
    /Android/.test(ua) ? 'Android' :
    /iPhone|iPad/.test(ua) ? 'iOS' :
    /Linux/.test(ua) ? 'Linux' : 'OS';
  return `${browser} / ${os}`;
}
