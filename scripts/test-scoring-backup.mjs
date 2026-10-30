// node scripts/test-scoring-backup.mjs
import assert from 'node:assert/strict'
import { completeWithBackup, scoreWithBackup, PRIMARY_MODEL, BACKUP_MODEL } from '../lib/scoring-model.mjs'

const reply = JSON.stringify({ scores: [
  { loaded_language: 1, false_equivalence: 2, asymmetric_framing: 3, cultural_assumption: 4, total: 10 },
  { loaded_language: 5, false_equivalence: 5, asymmetric_framing: 5, cultural_assumption: 5 },
] })
const openaiReturning = (text, log = []) => () => ({ chat: { completions: { create: async () => { log.push('openai'); return { choices: [{ message: { content: text } }] } } } } })
const openaiThrowing = (err, log = []) => () => ({ chat: { completions: { create: async () => { log.push('openai'); throw err } } } })
const claudeReturning = (text, log = []) => () => ({ messages: { create: async () => { log.push('claude'); return { content: [{ type: 'text', text }] } } } })
const claudeThrowing = () => () => ({ messages: { create: async () => { throw new Error('claude down') } } })
const silence = console.warn
console.warn = () => {}

let log = []
let scores = await scoreWithBackup('p', 2, { clients: { openai: openaiReturning(reply, log), anthropic: claudeReturning(reply, log) } })
assert.deepEqual(log, ['openai'], 'a healthy OpenAI never calls Claude')
assert.equal(scores[0].scoredBy, PRIMARY_MODEL)
assert.equal(scores[1].total, 20, 'a missing total is recomputed')

log = []
const noCredit = Object.assign(new Error('You have no credits remaining'), { status: 429, code: 'insufficient_quota' })
scores = await scoreWithBackup('p', 2, { clients: { openai: openaiThrowing(noCredit, log), anthropic: claudeReturning(reply, log) } })
assert.deepEqual(log, ['openai', 'claude'], 'out of credit goes straight to Claude without a retry')
assert.equal(scores[0].scoredBy, BACKUP_MODEL, 'the backup model is recorded')

log = []
scores = await scoreWithBackup('p', 2, { clients: { openai: openaiReturning('not json', log), anthropic: claudeReturning('Here you go:\n```json\n' + reply + '\n```', log) } })
assert.equal(scores[0].scoredBy, BACKUP_MODEL, 'an unusable OpenAI reply falls back, and fenced Claude JSON parses')

scores = await scoreWithBackup('p', 2, { clients: { openai: () => { throw new Error('missing key') }, anthropic: claudeReturning(reply) } })
assert.equal(scores[0].scoredBy, BACKUP_MODEL, 'a missing OpenAI key falls back')

log = []
const outage = Object.assign(new Error('bad gateway'), { status: 502 })
await completeWithBackup('p', { clients: { openai: openaiThrowing(outage, log), anthropic: claudeReturning('ok', log) } })
assert.deepEqual(log, ['openai', 'openai', 'claude'], 'a transient failure retries once first')

await assert.rejects(
  scoreWithBackup('p', 2, { clients: { openai: openaiThrowing(noCredit), anthropic: claudeThrowing() } }),
  /Both scoring models failed/,
)
console.warn = silence
console.log('scoring backup: all checks passed')
