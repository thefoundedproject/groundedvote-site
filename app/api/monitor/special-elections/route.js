// Copyright © 2025 The Founded Project LLC — All Rights Reserved
// Proprietary and Confidential. Unauthorized use prohibited.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Known state abbreviation map for parsing
const STATE_NAMES = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA',
  Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA',
  Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS',
  Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK',
  Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT',
  Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV',
  Wisconsin: 'WI', Wyoming: 'WY',
}

export async function GET(request) {
  const secret = request.headers.get('x-monitor-secret')
  if (!secret || secret !== process.env.MONITOR_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const changes = []
  const errors = []

  try {
    // Get existing special election races from DB
    const existingSpecials = await prisma.race.findMany({
      where: { raceType: 'SPECIAL' },
      select: { state: true, district: true, label: true }
    })
    const existingLabels = new Set(existingSpecials.map(r => r.label.toLowerCase()))

    // --- Source 1: Ballotpedia special elections 2025-2026 ---
    try {
      const bpRes = await fetch(
        'https://ballotpedia.org/United_States_special_elections,_2025-2026',
        {
          headers: { 'User-Agent': 'GroundedVote-Monitor/1.0 contact:monitoring@groundedvote.com' },
          signal: AbortSignal.timeout(10000),
        }
      )
      if (bpRes.ok) {
        const html = await bpRes.text()
        // Strip scripts/styles for cleaner parsing
        const cleanHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')

        // Look for table rows or list items mentioning congressional races
        const congressPattern = /(?:U.?S.?\s*)?(?:House|Senate|Congress(?:ional)?)[^<\n]{0,200}/gi
        const matches = cleanHtml.match(congressPattern) || []

        for (const match of matches.slice(0, 30)) {
          const clean = match.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
          if (clean.length < 15) continue

          // Check if any state name appears
          const foundState = Object.keys(STATE_NAMES).find(s =>
            clean.includes(s)
          )
          if (!foundState) continue

          const stateCode = STATE_NAMES[foundState]
          const alreadyTracked = Array.from(existingLabels).some(l =>
            l.includes(stateCode.toLowerCase()) && l.includes('special')
          )

          if (!alreadyTracked && clean.match(/special election/i)) {
            changes.push({
              type: 'SPECIAL_ELECTION_ANNOUNCED',
              title: `Possible special election: ${foundState}`,
              description: `Ballotpedia mentions a special congressional election in ${foundState}. Snippet: "${clean.substring(0, 400)}". Verify and add to GroundedVote DB if confirmed.`,
              sourceUrl: 'https://ballotpedia.org/United_States_special_elections,_2025-2026',
            })
          }
        }
      }
    } catch (bpErr) {
      errors.push(`Ballotpedia fetch: ${bpErr.message}`)
    }

    // --- Source 2: House Clerk vacancy page ---
    try {
      const clerkRes = await fetch(
        'https://clerk.house.gov/member_info/vacancies.aspx',
        {
          headers: { 'User-Agent': 'GroundedVote-Monitor/1.0' },
          signal: AbortSignal.timeout(8000),
        }
      )
      if (clerkRes.ok) {
        const html = await clerkRes.text()
        const statePattern = new RegExp(Object.keys(STATE_NAMES).join('|'), 'g')
        const stateMatches = [...new Set(html.match(statePattern) || [])]

        for (const stateName of stateMatches) {
          const stateCode = STATE_NAMES[stateName]
          const alreadyTracked = existingSpecials.some(r => r.state === stateCode)
          if (!alreadyTracked) {
            changes.push({
              type: 'VACANCY_ANNOUNCED',
              title: `House vacancy detected: ${stateName}`,
              description: `Hecuse Clerk vacancy page lists ${stateName} (${stateCode}). A special election may be pending. Check clerk.house.gov for details and confirm district.`,
              sourceUrl: 'https://clerk.house.gov/member_info/vacancies.aspx',
            })
          }
        }
      }
    } catch (clerkErr) {
      errors.push(`House Clerk fetch: ${clerkErr.message}`)
    }

    // Deduplicate by title before writing
    const uniqueChanges = changes.filter((c, i) =>
      changes.findIndex(x => x.title === c.title) === i
    )

    if (uniqueChanges.length > 0) {
      await prisma.monitoringChange.createMany({
        data: uniqueChanges.map(c => ({
          type: c.type,
          title: c.title,
          description: c.description,
          sourceUrl: c.sourceUrl || null,
        }))
      })
    }

    return NextResponse.json({
      ok: true,
      existingSpecials: existingSpecials.length,
      newChanges: uniqueChanges.length,
      errors: errors.length,
      changes: uniqueChanges.map(c => c.title),
      errorList: errors,
    })
  } catch (err) {
    console.error('[monitor/special-elections]', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
