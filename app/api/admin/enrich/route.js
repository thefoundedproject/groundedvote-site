// © 2025 The Founded Project LLC — All rights reserved.
// app/api/admin/enrich/route.js
//
// Enrichment worker control.
//   GET  /api/admin/enrich            → aggregate progress (public: counts only)
//   POST /api/admin/enrich            → { action: "start" | "stop" }
//        Headers: Authorization: Bearer <ADMIN_SECRET>

import { NextResponse } from 'next/server'
import { getWorkerState, getProgress, runEnrichmentWorker, requestStop } from '@/lib/enrichment-worker'

export const dynamic = 'force-dynamic'

function isAuthorized(request) {
  const auth = request.headers.get('Authorization')
  return process.env.ADMIN_SECRET && auth === `Bearer ${process.env.ADMIN_SECRET}`
}

export async function GET() {
  try {
    const [progress, worker] = [await getProgress(), getWorkerState()]
    return NextResponse.json({ worker, progress })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { action } = await request.json().catch(() => ({}))

  if (action === 'start') {
    if (getWorkerState().running) {
      return NextResponse.json({ started: false, reason: 'already running' })
    }
    // Fire and forget — progress is visible via GET and server logs
    runEnrichmentWorker().catch(err => console.error('[enrich] worker crashed:', err))
    return NextResponse.json({ started: true })
  }

  if (action === 'stop') {
    const accepted = requestStop()
    return NextResponse.json({ stopping: accepted })
  }

  return NextResponse.json({ error: 'action must be "start" or "stop"' }, { status: 400 })
}
