// Copyright © 2025 The Founded Project LLC — All Rights Reserved
// Proprietary and Confidential. Unauthorized use prohibited.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

async function callMonitor(path, secret, baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/api/monitor/${path}`, {
      headers: {
        'x-monitor-secret': secret,
        'User-Agent': 'GroundedVote-Internal/1.0',
      },
      signal: AbortSignal.timeout(45000),
    })
    const data = await res.json()
    return { path, status: res.status, ...data }
  } catch (err) {
    return { path, ok: false, error: err.message }
  }
}

export async function GET(request) {
  const secret = request.headers.get('x-monitor-secret')
  if (!secret || secret !== process.env.MONITOR_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://groundedvote.com'
  const runAt = new Date().toISOString()

  try {
    const [fecResult, specialResult, raceResult] = await Promise.all([
      callMonitor('fec-new-candidates', secret, baseUrl),
      callMonitor('special-elections', secret, baseUrl),
      callMonitor('race-status', secret, baseUrl),
    ])

    const totalNew =
      (fecResult.newChanges || 0) +
      (specialResult.newChanges || 0) +
      (raceResult.summary?.totalChangesLogged || 0)

    if (totalNew > 0) {
      await prisma.monitoringChange.updateMany({
        where: { notified: false },
        data: { notified: true },
      })
    }

    const recentChanges = await prisma.monitoringChange.findMany({
      where: {
        reviewed: false,
        detectedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { detectedAt: 'desc' },
      take: 50,
      include: {
        race: { select: { label: true, state: true } },
        candidate: { select: { firstName: true, lastName: true } },
      },
    })

    return NextResponse.json({
      runAt,
      totalNew,
      fec: {
        racesChecked: fecResult.racesChecked || 0,
        newFilings: fecResult.newChanges || 0,
        changes: fecResult.changes || [],
        errors: fecResult.errorList || [],
      },
      specialElections: {
        found: specialResult.newChanges || 0,
        changes: specialResult.changes || [],
        errors: specialResult.errorList || [],
      },
      raceStatus: {
        candidatesNeedingData: raceResult.summary?.candidatesNeedingData || 0,
        possibleWithdrawals: (raceResult.changes || []).filter(c => c.type === 'CANDIDATE_WITHDREW').length,
        changes: raceResult.changes || [],
      },
      unreviewedTotal: recentChanges.length,
      unreviewedChanges: recentChanges.map(c => ({
        id: c.id,
        type: c.type,
        title: c.title,
        race: c.race?.label || null,
        candidate: c.candidate ? `${c.candidate.firstName} ${c.candidate.lastName}` : null,
        detectedAt: c.detectedAt,
        sourceUrl: c.sourceUrl,
      })),
    })
  } catch (err) {
    console.error('[monitor/run-all]', err)
    return NextResponse.json({ ok: false, error: err.message, runAt }, { status: 500 })
  }
}
