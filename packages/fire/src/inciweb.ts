/** Official InciWeb incident publication feed (NIFC / USFS). */
export const INCIWEB_PUBLICATION_RSS =
  'https://inciweb.wildfire.gov/incident-publication/rss.xml';

export type InciwebNewsItem = {
  title: string;
  link: string;
  description: string;
  publishedAt: string;
  incidentSlug?: string;
};

const FEED_CACHE_MS = 15 * 60 * 1000;
let feedCache: { at: number; items: InciwebNewsItem[] } | null = null;

function textBetween(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = block.match(re);
  return match?.[1]?.trim() ?? '';
}

export function stripHtml(html: string): string {
  // RSS often entity-encodes markup — decode before stripping tags
  const decoded = html
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&');
  return decoded
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRssItems(xml: string): InciwebNewsItem[] {
  const items: InciwebNewsItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;
  while ((match = itemRe.exec(xml))) {
    const block = match[1] ?? '';
    const title = stripHtml(textBetween(block, 'title'));
    const rawLink = textBetween(block, 'link').replace(/\s+/g, '');
    const link = rawLink.replace(/^http:\/\//i, 'https://');
    const description = stripHtml(textBetween(block, 'description'));
    const publishedAt = textBetween(block, 'pubDate');
    const slugMatch = link.match(/incident-publication\/([^/]+)/i);
    if (!title || !link) continue;
    items.push({
      title,
      link,
      description,
      publishedAt,
      incidentSlug: slugMatch?.[1],
    });
  }
  return items;
}

export async function fetchInciwebPublicationFeed(options?: {
  force?: boolean;
}): Promise<InciwebNewsItem[]> {
  const now = Date.now();
  if (
    !options?.force &&
    feedCache &&
    now - feedCache.at < FEED_CACHE_MS
  ) {
    return feedCache.items;
  }

  const res = await fetch(INCIWEB_PUBLICATION_RSS, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`InciWeb RSS failed (${res.status})`);
  }
  const xml = await res.text();
  const items = parseRssItems(xml);
  feedCache = { at: now, items };
  return items;
}

function normalizeTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/\b(fire|complex|wildfire|incident)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

function stateAbbr(state?: string): string {
  if (!state) return '';
  return state.toUpperCase().replace(/^US-/, '').slice(0, 2).toLowerCase();
}

function scoreItem(
  item: InciwebNewsItem,
  tokens: string[],
  slugHint: string,
  state: string,
): number {
  const hay = `${item.title} ${item.link} ${item.incidentSlug ?? ''}`.toLowerCase();
  if (!tokens.length) return 0;

  let score = 0;
  let hits = 0;
  for (const token of tokens) {
    if (hay.includes(token)) {
      hits += 1;
      score += token.length >= 5 ? 3 : 2;
    }
  }

  if (hits < Math.min(tokens.length, 2) && tokens.length >= 2) {
    return 0;
  }
  if (hits === 0) return 0;

  if (slugHint && hay.includes(slugHint)) score += 8;
  if (state && (item.incidentSlug ?? '').toLowerCase().startsWith(state)) {
    score += 2;
  }
  return score;
}

export function matchInciwebNewsForFire(
  items: InciwebNewsItem[],
  fireName: string,
  options?: { state?: string; limit?: number },
): { items: InciwebNewsItem[]; incidentUrl?: string; incidentSlug?: string } {
  const limit = options?.limit ?? 3;
  const tokens = normalizeTokens(fireName);
  const slugHint = tokens.join('-');
  const state = stateAbbr(options?.state);

  const scored = items
    .map((item) => ({ item, score: scoreItem(item, tokens, slugHint, state) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { items: [] };
  }

  const bestSlug = scored[0]?.item.incidentSlug;
  const matched = bestSlug
    ? items.filter((item) => item.incidentSlug === bestSlug)
    : scored.map((row) => row.item);

  matched.sort((a, b) => {
    const da = Date.parse(a.publishedAt) || 0;
    const db = Date.parse(b.publishedAt) || 0;
    return db - da;
  });

  const top = matched.slice(0, limit);
  const incidentUrl = bestSlug
    ? `https://inciweb.wildfire.gov/incident-information/${bestSlug}`
    : undefined;

  return { items: top, incidentUrl, incidentSlug: bestSlug };
}

export async function fetchInciwebNewsForFire(
  fireName: string,
  options?: { state?: string; limit?: number },
): Promise<{ items: InciwebNewsItem[]; incidentUrl?: string; incidentSlug?: string }> {
  const feed = await fetchInciwebPublicationFeed();
  return matchInciwebNewsForFire(feed, fireName, options);
}
