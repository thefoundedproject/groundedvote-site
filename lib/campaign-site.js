// © 2025 The Founded Project LLC — All rights reserved.
// lib/campaign-site.js
//
// Campaign-site position extractor — the VoteSmart replacement for
// evidence density. Fetches a candidate's own campaign website (the URL
// comes from a reviewed source such as the state's candidate filing,
// never from automated discovery — attributing the wrong site would be
// worse than no evidence) and returns the platform text for the scoring
// model, labeled as CAMPAIGN_PLATFORM: an unverified self-report.
//
// Strategy: fetch the homepage, follow up to MAX_SUBPAGES same-origin
// links that look like an issues/platform page (issue pages before about
// pages; legal and fundraising pages never), probe the usual paths when the
// homepage links none, strip to plain text, cap the total. Every failure
// returns null — thin evidence falls back to party inference, as before.
// Sites that render only with JavaScript come back empty; that is accepted.

const FETCH_TIMEOUT_MS = 8_000
const MAX_SUBPAGES = 3
const HOME_CHARS = 1_500
const PAGE_CHARS = 6_000
const MAX_TOTAL_CHARS = 14_000
const UA = 'GroundedVote/2.0 (https://groundedvote.com; civic-alignment-tool)'

// Issue pages state positions; about pages sometimes do. Ranked in that order.
const ISSUE_LINK = /issue|platform|priorit|polic(y|ies)(?!-?(privacy))|agenda|plan\b|plans\b|where-?(i|he|she)-?stand|position/i
const ABOUT_LINK = /about|meet|vision|values|bio\b/i
const NEVER_LINK = /privacy|terms|\btos\b|cookie|disclaimer|accessibility|donat|contribut|volunteer|shop|store|merch|event|news|press|login|signup|sign-up|contact|careers|jobs|rsvp/i
const PROBE_PATHS = ['/issues', '/priorities', '/platform', '/policy', '/agenda']

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html' },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) return null
    const type = res.headers.get('content-type') || ''
    if (!type.includes('html')) return null
    return await res.text()
  } catch { return null }
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

export function issueLinks(html, base) {
  const issue = new Map(), about = new Map()
  const home = new URL(base)
  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]{0,160}?)<\/a>/gi)) {
    const [, href, rawAnchor] = m
    const anchor = rawAnchor.replace(/<[^>]+>/g, ' ')
    const label = `${href} ${anchor}`
    if (NEVER_LINK.test(label)) continue
    try {
      const u = new URL(href, base)
      if (u.origin !== home.origin) continue                    // same site only
      if (/\.(pdf|jpg|png|gif|mp4|zip)(\?|$)/i.test(u.pathname)) continue
      const path = u.pathname.replace(/\/$/, '')
      if (!path || path === home.pathname.replace(/\/$/, '')) continue // the homepage again
      const key = `${u.origin}${path}`
      if (ISSUE_LINK.test(label)) issue.set(key, u.href)
      else if (ABOUT_LINK.test(label)) about.set(key, u.href)
    } catch { /* malformed href */ }
  }
  return { issue: [...issue.values()], about: [...about.values()] }
}

/**
 * Fetch a candidate's campaign platform text.
 * Returns a labeled evidence block string, or null when nothing usable.
 */
export async function fetchCampaignPlatform(websiteUrl) {
  if (!websiteUrl) return null
  let base = websiteUrl.trim()
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`

  const home = await fetchPage(base)
  if (!home) return null

  const chunks = []
  const homeText = htmlToText(home)
  if (homeText.length >= 200) chunks.push(`[Homepage] ${homeText.slice(0, HOME_CHARS)}`)

  let { issue, about } = issueLinks(home, base)
  // No issues page linked from the homepage (menus built by script): try the usual paths.
  if (!issue.length) issue = PROBE_PATHS.map((p) => new URL(p, base).href)
  const seen = new Set([homeText.slice(0, 500)])
  let pages = 0
  for (const link of [...issue, ...about]) {
    if (pages >= MAX_SUBPAGES || chunks.join('\n').length >= MAX_TOTAL_CHARS) break
    const html = await fetchPage(link)
    if (!html) continue
    const text = htmlToText(html)
    if (text.length < 200 || seen.has(text.slice(0, 500))) continue // empty, or the same page again
    seen.add(text.slice(0, 500))
    chunks.push(`[${new URL(link).pathname}] ${text.slice(0, PAGE_CHARS)}`)
    pages++
  }

  if (!chunks.length) return null
  const body = chunks.join('\n\n').slice(0, MAX_TOTAL_CHARS)
  return `Campaign website platform (candidate's own site, ${base} — unverified self-report; treat as CAMPAIGN_PLATFORM evidence):\n${body}`
}
