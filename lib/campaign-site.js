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
// links whose URL or anchor text looks like an issues/platform page,
// strip everything to plain text, cap the total. Every failure returns
// null — thin evidence falls back to party inference, as before.

const FETCH_TIMEOUT_MS = 8_000
const MAX_SUBPAGES = 3
const MAX_TOTAL_CHARS = 7_000
const UA = 'GroundedVote/2.0 (https://groundedvote.com; civic-alignment-tool)'

const ISSUE_LINK = /issue|platform|priorit|policy|policies|vision|plan|agenda|about|values|stand/i

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

function issueLinks(html, base) {
  const out = new Set()
  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi)) {
    const [, href, anchor] = m
    if (!ISSUE_LINK.test(href) && !ISSUE_LINK.test(anchor)) continue
    try {
      const u = new URL(href, base)
      if (u.origin !== new URL(base).origin) continue           // same site only
      if (/\.(pdf|jpg|png|gif|mp4|zip)(\?|$)/i.test(u.pathname)) continue
      out.add(u.href)
    } catch { /* malformed href */ }
  }
  return [...out].slice(0, MAX_SUBPAGES)
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
  if (homeText.length >= 200) chunks.push(`[Homepage] ${homeText.slice(0, 2500)}`)

  for (const link of issueLinks(home, base)) {
    const html = await fetchPage(link)
    if (!html) continue
    const text = htmlToText(html)
    if (text.length >= 200) {
      const path = new URL(link).pathname
      chunks.push(`[${path}] ${text.slice(0, 3000)}`)
    }
    if (chunks.join('\n').length >= MAX_TOTAL_CHARS) break
  }

  if (!chunks.length) return null
  const body = chunks.join('\n\n').slice(0, MAX_TOTAL_CHARS)
  return `Campaign website platform (candidate's own site, ${base} — unverified self-report; treat as CAMPAIGN_PLATFORM evidence):\n${body}`
}
