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
  if (process.env.ENRICHMENT_WORKER !== 'on') return

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
