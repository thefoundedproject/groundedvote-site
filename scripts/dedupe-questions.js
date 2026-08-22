// © 2025 The Founded Project LLC — All rights reserved.
// scripts/dedupe-questions.js
//
// Finds near-duplicate APPROVED questions within each race and retires the
// weaker twin of every pair by setting auditStatus = ARCHIVED. Nothing is
// deleted: archived questions drop out of quizzes, counts and the audit
// trail (all of which filter on APPROVED) but keep their candidateAnswers
// and any userAnswers from past sessions.
//
// Why this exists: the 15-question base set and the 6-question House
// add-on re-asked the same topics in different words (carbon 50%/2035 x2,
// background checks x2, citizenship pathway x2 ...). The bias audit scores
// each question alone, so it never saw the siblings. A duplicated topic
// counts double in the alignment math.
//
//   node scripts/dedupe-questions.js                 # dry run, prints pairs
//   node scripts/dedupe-questions.js --json out.json # dry run + JSON report
//   node scripts/dedupe-questions.js --threshold 0.4 # looser matching
//   node scripts/dedupe-questions.js --apply         # archive the losers
//
// Pairing rule: same race, same topic, token Jaccard >= threshold (0.35
// default) after dropping quiz boilerplate ("would you support federal
// legislation ...") but keeping numbers. Calibrated against the live set:
// real twins score 0.36-0.88, the nearest non-duplicate (top individual
// rate vs corporate rate) scores 0.31. Keep rule: lower biasScore wins; tie -> more
// candidateAnswers; tie -> older row. Transitive groups (A~B, B~C) keep
// one and archive the rest.

const fs = require('fs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const argv = process.argv.slice(2)
const APPLY = argv.includes('--apply')
const arg = (flag, dflt) => { const i = argv.indexOf(flag); return i !== -1 ? argv[i + 1] : dflt }
const THRESHOLD = Number(arg('--threshold', 0.35))
const JSON_OUT = arg('--json', null)

// Words that appear in nearly every question and carry no topic signal.
const STOP = new Set([
  'would', 'support', 'federal', 'legislation', 'policy', 'states', 'united',
  'national', 'government', 'require', 'requiring', 'allow', 'allowing',
  'should', 'that', 'with', 'from', 'this', 'their', 'which', 'into', 'than',
  'more', 'less', 'over', 'under', 'year', 'years', 'annually', 'percent',
  'the', 'and', 'for', 'you', 'are', 'per', 'not', 'any', 'its', 'all', 'who',
])

// Numbers ("50", "10", "2035", "28") are the strongest signal in policy
// questions — "top rate to 50% over $10M" vs "corporate rate 21% to 28%"
// share every word except the numbers. Keep them, plus words of 3+ letters.
const tokens = (text) => new Set(
  text.toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(w => /^\d+$/.test(w) || (w.length >= 3 && !STOP.has(w)))
)

const jaccard = (a, b) => {
  let inter = 0
  for (const w of a) if (b.has(w)) inter++
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}

// Higher = better twin to keep.
const rank = (q) => [
  -(q.biasScore ?? 100),          // more neutral first
  q._count.candidateAnswers,      // better enriched
  -q.createdAt.getTime(),         // older (original) first
]
const better = (a, b) => {
  const ra = rank(a), rb = rank(b)
  for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] > rb[i] ? a : b
  return a
}

async function main() {
  console.log(APPLY ? '=== APPLY MODE — archiving duplicates ===' : `=== DRY RUN (threshold ${THRESHOLD}) — pass --apply to archive ===`)

  const races = await prisma.race.findMany({
    orderBy: { label: 'asc' },
    include: {
      questions: {
        where: { auditStatus: 'APPROVED' },
        include: { _count: { select: { candidateAnswers: true } } },
      },
    },
  })

  const report = []
  let archiveIds = []

  for (const race of races) {
    const qs = race.questions.map(q => ({ ...q, tok: tokens(q.questionText) }))
    // Union-find over similar pairs so A~B~C collapses to one survivor.
    const parent = Object.fromEntries(qs.map(q => [q.id, q.id]))
    const find = id => parent[id] === id ? id : (parent[id] = find(parent[id]))
    const pairs = []
    for (let i = 0; i < qs.length; i++) {
      for (let j = i + 1; j < qs.length; j++) {
        if (qs[i].topic !== qs[j].topic) continue
        const sim = jaccard(qs[i].tok, qs[j].tok)
        if (sim >= THRESHOLD) {
          pairs.push({ a: qs[i], b: qs[j], sim })
          parent[find(qs[i].id)] = find(qs[j].id)
        }
      }
    }
    if (!pairs.length) continue

    const groups = {}
    for (const q of qs) {
      const root = find(q.id)
      if (root !== q.id || pairs.some(p => p.a.id === q.id || p.b.id === q.id)) {
        (groups[root] ??= []).push(q)
      }
    }

    console.log(`\n${race.label} — ${qs.length} approved, ${pairs.length} pair(s)`)
    for (const members of Object.values(groups)) {
      if (members.length < 2) continue
      const keep = members.reduce(better)
      const drop = members.filter(m => m.id !== keep.id)
      archiveIds.push(...drop.map(d => d.id))
      const sims = pairs.filter(p => members.includes(p.a) && members.includes(p.b)).map(p => p.sim)
      const simLabel = sims.length ? `sim ${Math.max(...sims).toFixed(2)}` : ''
      console.log(`  KEEP  [${keep.topic}] bias ${keep.biasScore ?? '—'} · ${keep._count.candidateAnswers} answers · ${keep.questionText}`)
      for (const d of drop) {
        console.log(`  DROP  [${d.topic}] bias ${d.biasScore ?? '—'} · ${d._count.candidateAnswers} answers · ${d.questionText}  (${simLabel})`)
      }
      report.push({
        race: race.label,
        topic: keep.topic,
        similarity: sims.length ? Math.max(...sims) : null,
        keep: { id: keep.id, text: keep.questionText, biasScore: keep.biasScore, answers: keep._count.candidateAnswers },
        drop: drop.map(d => ({ id: d.id, text: d.questionText, biasScore: d.biasScore, answers: d._count.candidateAnswers })),
      })
    }
  }

  console.log(`\nGroups: ${report.length} · questions to archive: ${archiveIds.length} · races affected: ${new Set(report.map(r => r.race)).size}`)
  if (JSON_OUT) {
    fs.writeFileSync(JSON_OUT, JSON.stringify({ generatedAt: new Date().toISOString(), threshold: THRESHOLD, groups: report }, null, 2))
    console.log(`Report written: ${JSON_OUT}`)
  }
  if (!APPLY) return

  const res = await prisma.question.updateMany({
    where: { id: { in: archiveIds }, auditStatus: 'APPROVED' },
    data: { auditStatus: 'ARCHIVED' },
  })
  console.log(`Archived: ${res.count}`)
}

main().catch(e => { console.error(e); process.exitCode = 1 }).finally(() => prisma.$disconnect())
