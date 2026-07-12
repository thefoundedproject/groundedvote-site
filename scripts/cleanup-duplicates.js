// © 2025 The Founded Project LLC — All rights reserved.
// scripts/cleanup-duplicates.js
//
// One-shot data cleanup for the duplicate-seeding incident:
//   1. Deduplicates races that share (state, chamber, district, year).
//      The winner is the copy with more candidates, then more approved
//      questions, then the older record. The loser's candidates and quiz
//      sessions move to the winner; its questions (duplicates of the
//      winner's set) are deleted along with their variants and answers.
//   2. Deduplicates candidates within each race (same normalized name,
//      middle initials ignored). Positions, answers, and profile fields
//      merge into the winner.
//   3. Fixes lowercase name segments ("Galan-woods" → "Galan-Woods").
//
// Dry-run by default — prints the full plan and writes nothing.
//
// Usage:
//   node scripts/cleanup-duplicates.js            # dry run (report only)
//   node scripts/cleanup-duplicates.js --apply    # execute (writes backup first)
//
// On --apply, a full JSON backup of every affected race subtree is written
// to scripts/backup-cleanup-<timestamp>.json BEFORE any write.

const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

// ─── helpers ──────────────────────────────────────────────────────────────────

// Normalized key for candidate identity: case-insensitive, middle
// initials and punctuation ignored ("Gary C. Peters" ≡ "Gary Peters").
function candidateKey(c) {
  const strip = (s) =>
    s.toLowerCase()
      .replace(/\b[a-z]\.?\s/g, ' ') // drop single-letter middle initials
      .replace(/[^a-z\s-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  return `${strip(c.firstName)}|${strip(c.lastName)}`
}

// Uppercase the first letter of any word or hyphen segment that starts
// lowercase. Leaves interior capitals alone (McBride stays McBride).
function fixCasing(name) {
  return name.replace(/(^|[\s-])([a-z])/g, (m, sep, ch) => sep + ch.toUpperCase())
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(APPLY ? '=== APPLY MODE ===' : '=== DRY RUN (no writes) — pass --apply to execute ===')

  const races = await prisma.race.findMany({
    include: {
      candidates: { include: { positions: true, quizAnswers: true } },
      questions: true,
      quizSessions: { select: { id: true } },
    },
  })

  // Group races by identity
  const groups = new Map()
  for (const r of races) {
    const key = `${r.state}|${r.chamber}|${r.district ?? ''}|${r.year}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(r)
  }

  const dupGroups = [...groups.values()].filter((g) => g.length > 1)
  console.log(`\nRaces: ${races.length} total, ${dupGroups.length} duplicate group(s)`)

  const backup = { createdAt: new Date().toISOString(), raceGroups: [], candidateMerges: [], nameFixes: [] }

  // ── 1. race dedup plan ──
  const racePlans = []
  for (const group of dupGroups) {
    const approvedCount = (r) => r.questions.filter((q) => q.auditStatus === 'APPROVED').length
    const sorted = [...group].sort(
      (a, b) =>
        b.candidates.length - a.candidates.length ||
        approvedCount(b) - approvedCount(a) ||
        a.createdAt - b.createdAt
    )
    const [winner, ...losers] = sorted
    racePlans.push({ winner, losers })
    console.log(`\n• ${winner.label}`)
    console.log(`    keep   ${winner.id} (${winner.candidates.length} candidates, ${approvedCount(winner)} approved Qs)`)
    for (const l of losers) {
      console.log(`    remove ${l.id} (${l.candidates.length} candidates, ${approvedCount(l)} approved Qs, ${l.quizSessions.length} sessions)`)
    }
    backup.raceGroups.push(group)
  }

  // ── 2. candidate dedup plan (within winner races, after hypothetical moves) ──
  const candPlans = []
  for (const group of groups.values()) {
    // candidates that will live in this group's surviving race
    const all = group.flatMap((r) => r.candidates)
    const byKey = new Map()
    for (const c of all) {
      const k = candidateKey(c)
      if (!byKey.has(k)) byKey.set(k, [])
      byKey.get(k).push(c)
    }
    for (const [, dupes] of byKey) {
      if (dupes.length < 2) continue
      const richness = (c) => c.positions.length + c.quizAnswers.length + (c.bioguideId ? 5 : 0) + (c.fecCandidateId ? 2 : 0)
      const sorted = [...dupes].sort((a, b) => richness(b) - richness(a) || a.createdAt - b.createdAt)
      const [keep, ...merge] = sorted
      candPlans.push({ keep, merge })
      console.log(`\n• Candidate merge in ${group[0].label}: keep "${keep.firstName} ${keep.lastName}" (${keep.id})`)
      for (const m of merge) console.log(`    merge  "${m.firstName} ${m.lastName}" (${m.id}, ${m.positions.length} positions, ${m.quizAnswers.length} answers)`)
      backup.candidateMerges.push(dupes)
    }
  }

  // ── 3. name casing plan ──
  const allCandidates = races.flatMap((r) => r.candidates)
  const nameFixes = []
  for (const c of allCandidates) {
    const first = fixCasing(c.firstName)
    const last = fixCasing(c.lastName)
    if (first !== c.firstName || last !== c.lastName) {
      nameFixes.push({ id: c.id, from: `${c.firstName} ${c.lastName}`, to: `${first} ${last}`, first, last })
    }
  }
  console.log(`\nName casing fixes: ${nameFixes.length}`)
  for (const f of nameFixes) console.log(`    "${f.from}" → "${f.to}"`)
  backup.nameFixes = nameFixes

  if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to execute.')
    return
  }

  // ── backup before any write ──
  const backupPath = path.join(__dirname, `backup-cleanup-${Date.now()}.json`)
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2))
  console.log(`\nBackup written: ${backupPath}`)

  // ── execute race dedup ──
  for (const { winner, losers } of racePlans) {
    for (const loser of losers) {
      await prisma.$transaction(async (tx) => {
        const loserQuestionIds = loser.questions.map((q) => q.id)
        // Delete the loser's duplicate question set and its dependents
        if (loserQuestionIds.length) {
          await tx.userAnswer.deleteMany({ where: { questionId: { in: loserQuestionIds } } })
          await tx.candidateAnswer.deleteMany({ where: { questionId: { in: loserQuestionIds } } })
          await tx.questionVariant.deleteMany({ where: { questionId: { in: loserQuestionIds } } })
          await tx.question.deleteMany({ where: { id: { in: loserQuestionIds } } })
        }
        // Move children to the winner
        await tx.candidate.updateMany({ where: { raceId: loser.id }, data: { raceId: winner.id } })
        await tx.quizSession.updateMany({ where: { raceId: loser.id }, data: { raceId: winner.id } })
        await tx.monitoringChange.updateMany({ where: { raceId: loser.id }, data: { raceId: winner.id } })
        await tx.race.delete({ where: { id: loser.id } })
      })
      console.log(`Merged race ${loser.id} → ${winner.id} (${winner.label})`)
    }
  }

  // ── execute candidate merges ──
  for (const { keep, merge } of candPlans) {
    for (const loser of merge) {
      await prisma.$transaction(async (tx) => {
        await tx.position.updateMany({ where: { candidateId: loser.id }, data: { candidateId: keep.id } })
        // Move answers unless the winner already answered that question
        const keepAnswers = await tx.candidateAnswer.findMany({ where: { candidateId: keep.id }, select: { questionId: true } })
        const answered = new Set(keepAnswers.map((a) => a.questionId))
        const loserAnswers = await tx.candidateAnswer.findMany({ where: { candidateId: loser.id } })
        for (const a of loserAnswers) {
          if (answered.has(a.questionId)) {
            await tx.candidateAnswer.delete({ where: { id: a.id } })
          } else {
            await tx.candidateAnswer.update({ where: { id: a.id }, data: { candidateId: keep.id } })
          }
        }
        await tx.monitoringChange.updateMany({ where: { candidateId: loser.id }, data: { candidateId: keep.id } })
        // Backfill profile fields the winner is missing
        await tx.candidate.update({
          where: { id: keep.id },
          data: {
            bioguideId: keep.bioguideId ?? loser.bioguideId,
            fecCandidateId: keep.fecCandidateId ?? loser.fecCandidateId,
            website: keep.website ?? loser.website,
            imageUrl: keep.imageUrl ?? loser.imageUrl,
            incumbent: keep.incumbent || loser.incumbent,
          },
        })
        await tx.candidate.delete({ where: { id: loser.id } })
      })
      console.log(`Merged candidate ${loser.firstName} ${loser.lastName} (${loser.id}) → ${keep.id}`)
    }
  }

  // ── execute name fixes ──
  for (const f of nameFixes) {
    // Skip candidates that were merged away above
    const exists = await prisma.candidate.findUnique({ where: { id: f.id }, select: { id: true } })
    if (!exists) continue
    await prisma.candidate.update({ where: { id: f.id }, data: { firstName: f.first, lastName: f.last } })
    console.log(`Renamed → ${f.first} ${f.last}`)
  }

  console.log('\nCleanup complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
