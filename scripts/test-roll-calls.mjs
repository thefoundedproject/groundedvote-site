// node scripts/test-roll-calls.mjs — offline checks for lib/roll-calls.js
import assert from 'node:assert/strict'
import { formatVotes, parseCsv, relevantVotes } from '../lib/roll-calls.js'

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
console.log('roll-calls: all checks passed')
