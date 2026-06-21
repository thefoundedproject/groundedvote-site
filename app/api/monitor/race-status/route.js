// Copyright © 2025 The Founded Project LLC — All Rights Reserved
// Proprietary and Confidential. Unauthorized use prohibited.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request) {
  const secret = request.headers.get('x-monitor-secret')
  if (!secret || secret !== process.env.MONITOR_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const changes = []
  const summary = {}

  try {
    // Candidates in competitive races with zero CandidateAnswer records
    const candidatesNoData = await prisma.candidate.findMany({
      where: {
        status: 'ACTIVE',
        quizAnswers: { none: {} },
        race: { isCompetitive: true },
      },
      include: {
        race: { select: { id: true, label: true, isCompetitive: true } }
      },
      orderBy: { createdAt: 'asc' },
    })

    summary.candidatesNeedingData = candidatesNoData.length

    if (candidatesNoData.length > 0) {
      const recentCandidateIds = new Set(
        (await prisma.monitoringChange.findMany({
          where: {
            type: 'POSITION_DATA_NEEDED',
            detectedAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
            candidateId: { not: null },
          },
          select: { candidateId: true },
        })).map(c => c.candidateId)
      )

      const newGaps = candidatesNoData.filter(c => !recentCandidateIds.has(c.id))
      if (newGaps.length > 0) {
        await prisma.monitoringChange.createMany({
          data: newGaps.map(c => ({
            type: 'POSITION_DATA_NEEDED',
            raceId: c.raceId,
            candidateId: c.id,
            title: `No position data: ${c.firstName} ${c.lastName} -- ${c.race.label}`,
            description: `${c.firstName} ${c.lastName} (${c.party}) is ACTIVE in competitive race "${c.race.label}" but has zero CandidateAnswer records. Run Ballotpedia scraper + position extractor to populate.`,
            sourceUrl: `https://ballotpedia.org/${encodeURIComponent(c.firstName + '_' + c.lastName)}`,
          }))
        })
        changes.push(...newGaps.map(c => ({
          type: 'POSITION_DATA_NEEDED',
          name: `${c.firstName} ${c.lastName}`,
          race: c.race.label,
        })))
      }
    }

    // Sample top 5 toss-up races for possible withdrawals
    const tossUpRaces = await prisma.race.findMany({
      where: { cookRating: 'TOSS_UP', year: 2026 },
      include: {
        candidates: {
          where: { status: 'ACTIVE' },
          select: { id: true, firstName: true, lastName: true, party: true }
        }
      },
      take: 5,
    })

    for (const race of tossUpRaces) {
      try {
        const bpUrl = `https://ballotpedia.org/${encodeURIComponent(race.stateFull)}_${race.chamber === 'HOUSE' ? `${race.district}th_Congressional_District_election,_2026` : `United_States_Senate_election,_2026`}`
        const res = await fetch(bpUrl, {
          headers: { 'User-Agent': 'GroundedVote-Monitor/1.0' },
          signal: AbortSignal.timeout(8000),
        })
        if (!res.ok) continue
        const html = await res.text()
        const withdrawalKeywords = /withdrew|withdrawal|dropping out|suspended|ended.*campaign|no longer.*running/i
        if (withdrawalKeywords.test(html)) {
          for (const candidate of race.candidates) {
            if (html.toLowerCase().includes(candidate.lastName.toLowerCase())) {
              const snippet = html.match(new RegExp(`.{0,100}${candidate.lastName}.{150}`, 'i'))?.[0]
                ?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || ''
              if (withdrawalKeywords.test(snippet)) {
                changes.push({
                  type: 'CANDIDATE_WITHDREW',
                  raceId: race.id,
                  candidateId: candidate.id,
                  title: `Possible withdrawal: ${candidate.firstName} ${candidate.lastName} -- ${race.label}`,
                  description: `Ballotpedia page for ${race.label} may indicate ${candidate.firstName} ${candidate.lastName} withdrew. Snippet: "${snippet.substring(0, 300)}". Verify and update candidate.status = WITHDREW if confirmed.`,
                  sourceUrl: bpUrl,
                })
              }
            }
          }
        }
      } catch (_) { }
    }

    const withdrawChanges = changes.filter(c => c.type === 'CANDIDATE_WITHDREW')
    if (withdrawChanges.length > 0) {
      await prisma.monitoringChange.createMany({
        data: withdrawChanges.map(c => ({
          type: c.type,
          raceId: c.raceId || null,
          candidateId: c.candidateId || null,
          title: c.title,
          description: c.description,
          sourceUrl: c.sourceUrl || null,
        }))
      })
    }

    summary.competitiveRaces = await prisma.race.count({ where: { isCompetitive: true } })
    summary.tossUpRaces = await prisma.race.count({ where: { cookRating: 'TOSS_UP' } })
    summary.activeWithdrewCandidates = await prisma.candidate.count({ where: { status: 'WITHDREW' } })
    summary.totalChangesLogged = changes.length

    return NextResponse.json({ ok: true, summary, changes: changes.map(c => ({ type: c.type, title: c.title })) })
  } catch (err) {
    console.error('[monitor/race-status]', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
