// node scripts/test-evidence.mjs
import assert from 'node:assert/strict'
import { isPartyInferred } from '../lib/evidence.js'

assert.equal(isPartyInferred({ evidenceType: 'PARTY_INFERENCE', sourceNote: '' }), true)
// Labeled as record-based, but the note says it was inferred (live Ciscomani page, 2026-10-12).
assert.equal(isPartyInferred({ evidenceType: 'VOTING_RECORD', sourceNote: "No direct evidence on minimum wage in Ciscomani's legislative record; position inferred from his Republican affiliation, general conservative economic positions." }), true)
assert.equal(isPartyInferred({ evidenceType: 'CAMPAIGN_PLATFORM', sourceNote: "Ciscomani's sponsored legislation focuses on housing, veterans, public lands, and immigration enforcement, with no clear evidence of a position on tariffs tied to labor or environmental standards, requiring party-based inference as the primary signal." }), true)
// Genuinely record-based.
assert.equal(isPartyInferred({ evidenceType: 'VOTING_RECORD', sourceNote: 'Voted against the 2023 debt ceiling agreement.' }), false)
assert.equal(isPartyInferred({ evidenceType: 'CAMPAIGN_PLATFORM', sourceNote: "Hanson's site emphasizes building 'a Minnesota where every family can afford a home'." }), false)
assert.equal(isPartyInferred(null), false)
console.log('ok: party-inference detection')
