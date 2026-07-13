// © 2025 The Founded Project LLC — All rights reserved.
// app/api/civic-mirror/route.js
//
// POST — saves the signed-in user's Civic Mirror (Quiz 1) results:
// raw answers, derived profile + conviction factor, and issue weights.
// Retaking the quiz replaces the previous result.
// GET — returns the current user's result (or null).

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { deriveProfile, deriveIssueWeights, CONVICTION_FACTOR } from '@/lib/civic-mirror'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })

  const result = await prisma.civicMirrorResult.findUnique({ where: { userId: user.id } })
  const priorities = await prisma.issuePriority.findMany({ where: { userId: user.id } })
  return NextResponse.json({ result, priorities })
}

export async function POST(request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })

  try {
    const { answers } = await request.json().catch(() => ({}))
    if (!Array.isArray(answers) || answers.length !== 6) {
      return NextResponse.json({ error: 'All six answers are required.' }, { status: 400 })
    }

    const { profileKey, issuePriorities } = deriveProfile(answers)
    const convictionFactor = CONVICTION_FACTOR[answers[0]?.value] ?? 0.85
    const weights = deriveIssueWeights(answers)

    await prisma.$transaction(async (tx) => {
      await tx.civicMirrorResult.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          answers,
          profile: { profileKey, convictionFactor, issuePriorities },
        },
        update: {
          answers,
          profile: { profileKey, convictionFactor, issuePriorities },
        },
      })
      await tx.issuePriority.deleteMany({ where: { userId: user.id } })
      await tx.issuePriority.createMany({
        data: Object.entries(weights).map(([issue, weight]) => ({
          userId: user.id,
          issue,
          weight,
        })),
      })
    })

    return NextResponse.json({ ok: true, profileKey })
  } catch (err) {
    console.error('[civic-mirror] error:', err)
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
  }
}
