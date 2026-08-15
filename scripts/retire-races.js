// © 2025 The Founded Project LLC — All rights reserved.
// scripts/retire-races.js
//
// Removes races that should never have existed (e.g. Senate races seeded
// for states with no 2026 Senate election). Full subtree backup to JSON
// before any delete, same safety pattern as cleanup-duplicates.
//
//   node scripts/retire-races.js --labels "A|B|C"            # dry run
//   node scripts/retire-races.js --labels "A|B|C" --apply

const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')
const LABELS = (() => {
  const i = process.argv.indexOf('--labels')
  return i !== -1 ? process.argv[i + 1].split('|').map(s => s.trim()) : []
})()

async function main() {
  console.log(APPLY ? '=== APPLY MODE ===' : '=== DRY RUN — pass --apply to delete ===')
  if (!LABELS.length) throw new Error('--labels "Label A|Label B" required')

  const races = await prisma.race.findMany({
    where: { label: { in: LABELS } },
    include: {
      candidates: { include: { positions: true, quizAnswers: true } },
      questions: { include: { variants: true, candidateAnswers: true, userAnswers: true } },
      quizSessions: { include: { userAnswers: true, result: true, preQuizVote: true } },
    },
  })
  const found = new Set(races.map(r => r.label))
  for (const l of LABELS) if (!found.has(l)) console.error(`✗ not found: ${l}`)

  for (const r of races) {
    console.log(`\n${r.label}: ${r.candidates.length} candidates, ${r.questions.length} questions, ${r.quizSessions.length} sessions`)
  }
  if (!APPLY) return

  const backupPath = path.join(__dirname, `backup-retired-${Date.now()}.json`)
  fs.writeFileSync(backupPath, JSON.stringify(races, null, 2))
  console.log(`\nBackup written: ${backupPath}`)

  for (const r of races) {
    await prisma.$transaction(async (tx) => {
      const qIds = r.questions.map(q => q.id)
      const sIds = r.quizSessions.map(s => s.id)
      const cIds = r.candidates.map(c => c.id)
      await tx.userAnswer.deleteMany({ where: { OR: [{ questionId: { in: qIds } }, { sessionId: { in: sIds } }] } })
      await tx.candidateAnswer.deleteMany({ where: { OR: [{ questionId: { in: qIds } }, { candidateId: { in: cIds } }] } })
      await tx.questionVariant.deleteMany({ where: { questionId: { in: qIds } } })
      await tx.quizResult.deleteMany({ where: { sessionId: { in: sIds } } })
      await tx.preQuizVote.deleteMany({ where: { sessionId: { in: sIds } } })
      await tx.measureAnswer.deleteMany({ where: { sessionId: { in: sIds } } })
      await tx.quizEvent.deleteMany({ where: { sessionId: { in: sIds } } })
      await tx.question.deleteMany({ where: { id: { in: qIds } } })
      await tx.quizSession.deleteMany({ where: { id: { in: sIds } } })
      await tx.position.deleteMany({ where: { candidateId: { in: cIds } } })
      await tx.monitoringChange.deleteMany({ where: { OR: [{ raceId: r.id }, { candidateId: { in: cIds } }] } })
      await tx.candidate.deleteMany({ where: { id: { in: cIds } } })
      await tx.race.delete({ where: { id: r.id } })
    })
    console.log(`Retired: ${r.label}`)
  }
}

main().catch(e => { console.error(e); process.exitCode = 1 }).finally(() => prisma.$disconnect())
