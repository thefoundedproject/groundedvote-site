// node scripts/test-roll-calls.mjs — offline checks for lib/roll-calls.js
import assert from 'node:assert/strict'
import { enactedTitle, formatVotes, isSubstantive, parseCsv, relevantVotes } from '../lib/roll-calls.js'

const rows = parseCsv('a,b,c\n1,"x, ""quoted""",3\r\n4,5,6\n')
assert.equal(rows.length, 2)
assert.equal(rows[0].b, 'x, "quoted"')
assert.equal(rows[1].c, '6')

const v = (title, position = 'Yea', bill = null) => ({ date: '2025-01-01', chamber: 'House', bill, title, detail: '', question: 'On Passage', result: 'Passed', yea: 220, nay: 210, position })
const votes = [
  v('Secure the Border Act of 2023', 'Yea', 'HR2'),
  v('Laken Riley Act', 'Did not vote', 'S5'),
  v('National Defense Authorization Act'),
  v('Waste Emissions Charge disapproval', 'Yea', 'HJRES35'),
]
const border = relevantVotes(votes, { topic: 'IMMIGRATION', questionText: 'Would you support significantly increasing federal funding for border security?' })
assert.deepEqual(border.map((x) => x.bill), ['HR2'], 'topic match kept, "did not vote" dropped, off-topic dropped')
assert.equal(relevantVotes(votes, { topic: 'HOUSING', questionText: 'Should rent be capped?' }).length, 0)
assert.match(formatVotes(border), /HR2 · Secure the Border Act of 2023 .* VOTED YEA$/)
assert.equal(formatVotes([]), '')
// Vehicle bills: the enacted law's name on passage votes after the substitution
// date; earlier votes and amendment votes keep their own text.
const rc = (date, question) => ({ bill_number: 'S2938', date, vote_question: question, vote_desc: 'To designate the United States Courthouse' })
assert.match(enactedTitle(117, rc('2022-06-24', 'On Concurring in the Senate Amendments to the House Amendment')), /^Bipartisan Safer Communities Act/)
assert.match(enactedTitle(117, rc('2022-03-30', 'On Motion to Suspend the Rules and Pass')), /Courthouse/)
assert.match(enactedTitle(117, rc('2022-06-23', 'On the Amendment')), /Courthouse/)
assert.match(enactedTitle(118, rc('2023-06-23', 'On Passage')), /Courthouse/)
assert.ok(isSubstantive({ vote_question: 'On Concurring in the Senate Amendments to the House Amendment', vote_desc: 'x' }))
assert.ok(!isSubstantive({ vote_question: 'On Passage', vote_desc: 'Providing for consideration of H.R. 1' }))

console.log('roll-calls: all checks passed')
