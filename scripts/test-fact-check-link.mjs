// node scripts/test-fact-check-link.mjs
import assert from 'node:assert/strict'
import { isCheckableNote, factCheckUrl } from '../lib/fact-check-link.js'

// Notes that reached the fact checker from GroundedVote on 2026-10-12 and could not be checked.
const absence = [
  "No direct evidence was found for Rennie Mann's position on foreign assistance.",
  'Jeanine Driscoll has made no direct statements on student loan cancellation.',
  "No direct evidence on cannabis retail authority was found in Karin Housley's record.",
  "John Cornyn's record shows no direct evidence on foreign assistance levels.",
  "Rob Farnsworth's campaign website contains no direct statements on drilling.",
  'Position inferred from party platform; candidate has not addressed this directly.',
  'The candidate is silent on this issue.',
  'Could not locate a public statement on this topic.',
]
// Notes that describe the candidate and can be checked.
const checkable = [
  "Jess Hanson's campaign website emphasizes building 'a Minnesota where every family can afford a home'.",
  'Don Brown opposes a pathway to citizenship for undocumented immigrants, per his 2024 campaign site.',
  'Cosponsored H.R. 22, the SAVE Act, in the 119th Congress.',
  'Voted against the 2023 debt ceiling agreement.',
]

for (const n of absence) assert.equal(isCheckableNote(n), false, `should not link: ${n}`)
for (const n of checkable) assert.equal(isCheckableNote(n), true, `should link: ${n}`)
assert.equal(factCheckUrl('Rennie Mann', absence[0]), null)
assert.equal(
  factCheckUrl('Don Brown', checkable[1]),
  'https://rhetoricalpoints.com/check?q=' + encodeURIComponent('Don Brown: ' + checkable[1]),
)
assert.equal(isCheckableNote(''), false)
assert.equal(isCheckableNote(null), false)
console.log(`ok: ${absence.length} absence notes unlinked, ${checkable.length} checkable notes linked`)
