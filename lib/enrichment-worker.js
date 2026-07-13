// © 2025 The Founded Project LLC — All rights reserved.
// lib/enrichment-worker.js
//
// Self-resuming position-enrichment worker. Started from instrumentation.js
// on every server boot when ENRICHMENT_WORKER=on, so a redeploy pauses the
// run for the length of the build and then picks up where it left off —
// extractPositionsForRace skips every candidate/question pair that already
// has an answer.
//
// Runs one race at a time, sequentially, inside the web container. The work
// is almost entirely network waits (evidence fetches + model calls), so it
// coexists with normal traffic. Writes are idempotent upserts, so even two
// replicas running the worker at once cannot corrupt data — they would only
// duplicate API spend. Keep replicas at 1 while the worker is on.

import { prisma } from './prisma.js'
import { extractPositionsForRace } from './candidate-positions.js'

// Shared via globalThis — the instrumentation hook and API routes are
// bundled separately, so a plain module-level object would give each
// bundle its own copy and the status route would never see the worker.
const state = (globalThis.__enrichmentWorkerState ??= {
  running: false,
  stopRequested: false,
  startedAt: null,
  currentRace: null,
  completed: [],   // { label, created, skipped, failed }
  errors: [],      // { label, message }
})

export function getWorkerState() {
  return {
    running: state.running,
    startedAt: state.startedAt,
    currentRace: state.currentRace,
    completed: state.completed,
    errors: state.errors,
  }
}

export function requestStop() {
  if (!state.running) return false
  state.stopRequested = true
  return true
}

/**
 * Aggregate progress across all races: how many candidate/question pairs
 * exist vs. how many are answered. Safe to expose publicly (counts only).
 */
export async function getProgress() {
  const races = await prisma.race.findMany({
    select: {
      id: true,
      label: true,
      _count: { select: { candidates: true } },
      questions: { where: { auditStatus: 'APPROVED' }, select: { id: true } },
    },
    orderBy: { label: 'asc' },
  })

  const perRace = []
  for (const r of races) {
    const totalPairs = r._count.candidates * r.questions.length
    const answered = await prisma.candidateAnswer.count({
      where: { questionId: { in: r.questions.map(q => q.id) } },
    })
    perRace.push({ label: r.label, answered, totalPairs })
  }

  const totals = perRace.reduce(
    (acc, r) => ({ answered: acc.answered + r.answered, totalPairs: acc.totalPairs + r.totalPairs }),
    { answered: 0, totalPairs: 0 }
  )

  return { ...totals, races: perRace }
}

/**
 * Process every race that still has unanswered pairs. Returns when all
 * races are complete or a stop was requested.
 */
export async function runEnrichmentWorker() {
  if (state.running) {
    console.log('[enrich] worker already running — ignoring start request')
    return { alreadyRunning: true }
  }

  state.running = true
  state.stopRequested = false
  state.startedAt = new Date().toISOString()
  state.currentRace = null
  state.completed = []
  state.errors = []

  console.log('[enrich] worker starting')

  try {
    const races = await prisma.race.findMany({
      select: { id: true, label: true },
      orderBy: { label: 'asc' },
    })

    for (const race of races) {
      if (state.stopRequested) {
        console.log('[enrich] stop requested — exiting cleanly')
        break
      }

      // Cheap pre-check: skip races with no remaining work
      const [candidates, questions] = await Promise.all([
        prisma.candidate.count({ where: { raceId: race.id } }),
        prisma.question.findMany({
          where: { raceId: race.id, auditStatus: 'APPROVED' },
          select: { id: true },
        }),
      ])
      const totalPairs = candidates * questions.length
      if (totalPairs === 0) continue
      const answered = await prisma.candidateAnswer.count({
        where: { questionId: { in: questions.map(q => q.id) } },
      })
      if (answered >= totalPairs) continue

      state.currentRace = race.label
      console.log(`[enrich] ${race.label}: ${answered}/${totalPairs} answered — starting`)

      try {
        const s = await extractPositionsForRace(race.id)
        state.completed.push({ label: race.label, created: s.created, skipped: s.skipped, failed: s.failed })
        console.log(`[enrich] ${race.label}: done — created=${s.created} skipped=${s.skipped} failed=${s.failed}`)
      } catch (err) {
        state.errors.push({ label: race.label, message: err.message })
        console.error(`[enrich] ${race.label}: race failed — ${err.message}`)
      }

      // Brief pause between races to let the event loop breathe
      await new Promise(r => setTimeout(r, 5_000))
    }

    console.log(`[enrich] worker finished — ${state.completed.length} race(s) processed, ${state.errors.length} error(s)`)
    return { completed: state.completed, errors: state.errors }
  } finally {
    state.running = false
    state.currentRace = null
  }
}
