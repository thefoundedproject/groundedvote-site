/**
 * POST /api/admin/import-questions
 * Bulk import questions from CSV for a race.
 *
 * CSV format (no header required, but accepted):
 *   questionText, topic, weight
 *
 * Example:
 *   Should the federal minimum wage be raised to $20/hr?,ECONOMY,1.5
 *   Should the US expand nuclear energy production?,ENVIRONMENT,1.2
 *
 * All imported questions get auditStatus = PENDING for admin review.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ADMIN_SECRET = process.env.ADMIN_SECRET
function auth(req) { return req.headers.get('x-admin-secret') === ADMIN_SECRET }

const VALID_TOPICS = [
  'HEALTHCARE','ECONOMY','ENVIRONMENT','EDUCATION','IMMIGRATION',
  'CRIMINAL_JUSTICE','FOREIGN_POLICY','HOUSING',
  'GUN_POLICY','TAXES','SOCIAL_SECURITY','VETERANS','TECHNOLOGY','INFRASTRUCTURE',
  'VOTING_RIGHTS','LABOR','DRUG_POLICY','OTHER'
]

function parseCSV(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  const questions = []
  const errors = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Skip header row if it starts with "questionText" or "question"
    if (i === 0 && /^(questionText|question)/i.test(line)) continue

    // Parse CSV — handle quoted fields
    const cols = []
    let current = ''
    let inQuote = false
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue }
      if (ch === ',' && !inQuote) { cols.push(current.trim()); current = '' }
      else current += ch
    }
    cols.push(current.trim())

    const [questionText, topicRaw, weightRaw] = cols
    if (!questionText || questionText.length < 10) {
      errors.push(`Row ${i + 1}: questionText too short or missing`)
      continue
    }

    const topic = (topicRaw ?? '').toUpperCase().replace(/\s+/g, '_')
    const resolvedTopic = VALID_TOPICS.includes(topic) ? topic : 'OTHER'
    const weight = parseFloat(weightRaw) || 1.0

    questions.push({ questionText, topic: resolvedTopic, weight })
  }

  return { questions, errors }
}

export async function POST(req) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contentType = req.headers.get('content-type') ?? ''

  let raceId, csvText

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    raceId = form.get('raceId')
    const file = form.get('file')
    if (!file) return NextResponse.json({ error: 'file field required' }, { status: 400 })
    csvText = await file.text()
  } else {
    const body = await req.json()
    raceId = body.raceId
    csvText = body.csv
  }

  if (!raceId) return NextResponse.json({ error: 'raceId required' }, { status: 400 })
  if (!csvText) return NextResponse.json({ error: 'csv or file required' }, { status: 400 })

  const race = await prisma.race.findUnique({ where: { id: raceId }, select: { id: true, label: true } })
  if (!race) return NextResponse.json({ error: 'Race not found' }, { status: 404 })

  const { questions, errors } = parseCSV(csvText)
  if (!questions.length) {
    return NextResponse.json({ error: 'No valid questions found in CSV', errors }, { status: 400 })
  }

  const created = await prisma.$transaction(
    questions.map(q =>
      prisma.question.create({
        data: {
          raceId,
          questionText: q.questionText,
          topic: q.topic,
          weight: q.weight,
          auditStatus: 'PENDING',
        },
      })
    )
  )

  return NextResponse.json({
    created: created.length,
    skipped: errors.length,
    errors,
    message: `Imported ${created.length} questions as PENDING. Review in admin before approving.`,
  })
}
