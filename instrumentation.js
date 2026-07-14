// © 2025 The Founded Project LLC — All rights reserved.
// instrumentation.js
//
// Runs once per server boot (Next.js instrumentation hook). When
// ENRICHMENT_WORKER=on in the environment, starts the self-resuming
// position-enrichment worker after a short delay so the app finishes
// booting first. Remove or change the env var in Railway to disable —
// no code change needed.

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  if (process.env.ENRICHMENT_WORKER === 'on') {
    setTimeout(async () => {
      try {
        const { runEnrichmentWorker } = await import('./lib/enrichment-worker.js')
        console.log('[enrich] ENRICHMENT_WORKER=on — starting worker (boot trigger)')
        runEnrichmentWorker().catch(err => console.error('[enrich] worker crashed:', err))
      } catch (err) {
        console.error('[enrich] failed to start worker:', err)
      }
    }, 30_000)
  }

  // Weekly research snapshots: on boot, regenerate the current period's
  // snapshots if the newest one is older than 7 days (or absent).
  // Cheap DB-only work; idempotent upserts; suppressed cohorts skipped.
  setTimeout(async () => {
    try {
      const { prisma } = await import('./lib/prisma.js')
      const { generateSnapshots, currentPeriod } = await import('./lib/research.js')
      const period = currentPeriod()
      const newest = await prisma.researchSnapshot.findFirst({
        where: { period },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      })
      const weekMs = 7 * 24 * 3600 * 1000
      if (!newest || Date.now() - newest.createdAt.getTime() > weekMs) {
        const r = await generateSnapshots(period)
        console.log(`[research] weekly snapshots — period=${r.period} written=${r.written}`)
      }
    } catch (err) {
      console.error('[research] snapshot check failed:', err.message)
    }
  }, 60_000)
}
