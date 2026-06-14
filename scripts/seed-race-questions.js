#!/usr/bin/env node
/**
 * seed-race-questions.js
 * Seeds the 15-question policy template into the database for a given raceId.
 * Questions are created as unapproved — run through the bias audit pipeline before going live.
 *
 * Usage:
 *   node scripts/seed-race-questions.js <raceId>
 *   node scripts/seed-race-questions.js <raceId> --approve   (skip audit, mark approved directly)
 *   node scripts/seed-race-questions.js --list-races          (show all raceIds)
 *
 * Example:
 *   node scripts/seed-race-questions.js mn-senate-2026
 */

const { PrismaClient } = require('@prisma/client')
const path = require('path')
const fs = require('fs')

const prisma = new PrismaClient()
const template = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'seed-questions-template.json'), 'utf-8')
)

const LIKERT_OPTIONS = [
  { label: 'Strongly Oppose', value: 1 },
  { label: 'Oppose',          value: 2 },
  { label: 'Neutral',         value: 3 },
  { label: 'Support',         value: 4 },
  { label: 'Strongly Support', value: 5 },
]

async function listRaces() {
  const races = await prisma.race.findMany({
    select: { id: true, name: true, state: true, chamber: true, status: true },
    orderBy: [{ state: 'asc' }, { chamber: 'asc' }],
  })
  if (!races.length) {
    console.log('No races found in database.')
    return
  }
  console.log('\nAvailable races:')
  console.log('─'.repeat(72))
  races.forEach(r => {
    console.log(`  ${r.id.padEnd(36)} ${r.state} · ${r.chamber} · ${r.status}`)
  })
  console.log()
}

async function getExistingQuestionTopics(raceId) {
  const existing = await prisma.question.findMany({
    where: { raceId },
    select: { topic: true, questionText: true },
  })
  return existing
}

async function seedRaceQuestions(raceId, forceApprove = false) {
  // Verify race exists
  const race = await prisma.race.findUnique({ where: { id: raceId } })
  if (!race) {
    console.error(`\n✗ Race "${raceId}" not found. Run --list-races to see available IDs.\n`)
    process.exit(1)
  }

  console.log(`\nSeeding questions for: ${race.name} (${race.state} · ${race.chamber})`)
  console.log(`Race ID: ${raceId}`)
  console.log(`Approve immediately: ${forceApprove ? 'yes' : 'no — needs bias audit'}`)
  console.log('─'.repeat(72))

  // Check for existing questions to avoid duplicates
  const existing = await getExistingQuestionTopics(raceId)
  const existingTexts = new Set(existing.map(q => q.questionText.toLowerCase().trim()))

  let created = 0
  let skipped = 0
  const results = []

  for (const q of template.questions) {
    const normalizedText = q.questionText.toLowerCase().trim()

    if (existingTexts.has(normalizedText)) {
      console.log(`  ↩  SKIP  ${q.topic.padEnd(20)} ${q.subtopic} (already exists)`)
      skipped++
      continue
    }

    try {
      // Prisma schema may vary — adjust field names to match your actual Question model.
      // Common fields: raceId, topic, questionText, approved, biasScore, options (JSON)
      const question = await prisma.question.create({
        data: {
          raceId,
          topic:        q.topic,
          questionText: q.questionText,
          approved:     forceApprove,
          biasScore:    forceApprove ? 0.0 : null,

          // Store issueKey and metadata — adjust to match your schema.
          // If your schema doesn't have these fields, move them into a JSON `metadata` column.
          ...(prisma.question.fields?.issueKey      ? { issueKey: q.issueKey }           : {}),
          ...(prisma.question.fields?.subtopic      ? { subtopic: q.subtopic }           : {}),
          ...(prisma.question.fields?.candidateDataField ? { candidateDataField: q.candidateDataField } : {}),

          // If your schema has a `metadata` JSON field:
          metadata: {
            issueKey:           q.issueKey,
            subtopic:           q.subtopic,
            rationale:          q.rationale,
            biasRisk:           q.biasRisk,
            candidateDataField: q.candidateDataField,
            auditNote:          q.auditNote ?? null,
            seededFrom:         `seed-questions-template.json v${template.version}`,
            seededAt:           new Date().toISOString(),
          },

          // Likert options — stored as JSON if your schema supports it
          options: LIKERT_OPTIONS,
        },
      })

      results.push(question)
      created++
      const status = forceApprove ? 'APPROVED' : 'PENDING '
      console.log(`  ✓  ${status}  ${q.topic.padEnd(20)} ${q.subtopic}`)
    } catch (err) {
      console.error(`  ✗  ERROR    ${q.topic.padEnd(20)} ${q.subtopic}: ${err.message}`)
    }
  }

  console.log('─'.repeat(72))
  console.log(`Created: ${created}   Skipped: ${skipped}   Total template questions: ${template.questions.length}`)

  if (!forceApprove && created > 0) {
    console.log(`
Next step — run the bias audit pipeline on the new questions:
  node scripts/run-bias-audit.js --raceId ${raceId} --unapproved-only

Or approve manually via the admin dashboard at /admin/races/${raceId}/questions
`)
  }

  if (forceApprove && created > 0) {
    console.log(`
Questions approved directly (bias audit skipped).
For production use, always run through the bias audit pipeline first.
`)
  }

  await prisma.$disconnect()
}

// ─── CLI entry point ───────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--list-races')) {
    await listRaces()
    await prisma.$disconnect()
    return
  }

  const raceId = args[0]
  if (!raceId || raceId.startsWith('--')) {
    console.error(`
Usage:
  node scripts/seed-race-questions.js <raceId>
  node scripts/seed-race-questions.js <raceId> --approve
  node scripts/seed-race-questions.js --list-races
`)
    process.exit(1)
  }

  const forceApprove = args.includes('--approve')
  await seedRaceQuestions(raceId, forceApprove)
}

main().catch(async err => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
