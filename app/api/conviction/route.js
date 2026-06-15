import { NextResponse } from 'next/server'
import { checkConvictions, summarizeConvictions } from '@/lib/conviction'
import { applyRateLimit } from '@/lib/rate-limit'

export async function GET(req) {
  // Each request makes Congress.gov API calls + Claude inference — expensive.
  // 5 per minute per IP is generous for a per-candidate lookup.
  const limited = applyRateLimit(req, 'conviction', 5, 60)
  if (limited) return limited

  const { searchParams } = new URL(req.url)
  const candidateId = searchParams.get('candidateId')
  if (!candidateId) return NextResponse.json({ error: 'candidateId required' }, { status: 400 })

  try {
    const convictions = await checkConvictions(candidateId)
    const summary = summarizeConvictions(convictions)
    return NextResponse.json({ convictions, summary })
  } catch (err) {
    console.error('conviction error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
