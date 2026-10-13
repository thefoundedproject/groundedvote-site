// node scripts/test-fact-check-link.mjs
import assert from 'node:assert/strict'
import { checkableClaim, isCheckableNote, factCheckUrl } from '../lib/fact-check-link.js'

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

// Mixed notes from a live candidate page (2026-10-12): the record fact is linked, the inference is not.
const mixed = [
  ["Ciscomani's sponsored legislation includes multiple defense and veterans bills (Vets CLEAR Act, Pay Our Homeland Defenders Act, Veterans Economic Opportunity and Transition Administration Act), suggesting general support for defense spending, but no direct evidence exists on this specific question of increasing the defense budget above 5% per year above inflation.",
   "Ciscomani's sponsored legislation includes multiple defense and veterans bills (Vets CLEAR Act, Pay Our Homeland Defenders Act, Veterans Economic Opportunity and Transition Administration Act)"],
  ["Ciscomani sponsored the Shadow Wolves Improvement Act (related to border security personnel) and represents a competitive southern Arizona district bordering Mexico; as a House Republican he has consistently aligned with strong border security positions, though direct statements on federal funding levels for border infrastructure are inferred rather than explicitly documented here.",
   'Ciscomani sponsored the Shadow Wolves Improvement Act (related to border security personnel) and represents a competitive southern Arizona district bordering Mexico'],
  ["Ciscomani's sponsored legislation focuses on housing, veterans, public lands, and immigration enforcement, with no clear evidence of a position on tariffs tied to labor or environmental standards, requiring party-based inference as the primary signal.",
   "Ciscomani's sponsored legislation focuses on housing, veterans, public lands, and immigration enforcement"],
]
for (const [note, want] of mixed) assert.equal(checkableClaim(note), want)
const nothing = [
  "Ciscomani's sponsored legislation does not directly address oil and gas permitting, but as a Republican representing a competitive Arizona district, his general legislative profile and party alignment suggest opposition to halting new federal energy permits, inferred from overall policy stance.",
  'No direct evidence in Ciscomani\'s sponsored legislation addresses foreign assistance; position is inferred from Republican Party alignment and general conservative fiscal priorities.',
]
for (const n of nothing) assert.equal(checkableClaim(n), null, n)
for (const n of absence) assert.equal(checkableClaim(n), null, n)

console.log(`ok: ${absence.length} absence notes unlinked, ${checkable.length} checkable notes linked, ${mixed.length} mixed notes link their record fact`)
