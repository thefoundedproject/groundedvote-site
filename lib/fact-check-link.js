// Which candidate notes get a "Fact-check this →" link to RhetoricalPoints.
//
// A note can describe the candidate ("Hanson's site emphasizes building a
// Minnesota where…") or describe our own research ("No direct evidence was found
// for Mann's position on foreign assistance"). Only the first is a claim a fact
// checker can test. Sending the second produced checks like "Driscoll has made no
// direct statements on student loan cancellation", which no model can verify and
// which came back Unverifiable or wrong (RhetoricalPoints prod, 2026-10-12).

const ABSENCE = [
  /\bno (direct |clear |public |explicit |specific |recorded |available |documented )*(evidence|statements?|record|records|position|positions|information|mention|mentions|data|votes?|comments?|remarks?)\b/i,
  /\b(contains|includes|has|have|had|made|makes|offers|provides|shows|gives) no\b/i,
  /\b(was|were|is|are) not (found|available|located|identified|stated|addressed|mentioned|specified|disclosed)\b/i,
  /\b(could|did|does) not (find|locate|identify|determine|confirm|address|mention|state|specify)\b/i,
  /\b(not|never) (publicly )?(addressed|stated|disclosed|specified|mentioned)\b/i,
  /\b(none|nothing) (found|located|identified|available|on record)\b/i,
  /\b(silent|unclear|unknown|unspecified|undisclosed) on\b/i,
  /\b(inferred|estimated|extrapolated) from\b/i,
  /\binsufficient (evidence|information|data)\b/i,
]

/** True when the note says something about the candidate that can be checked. */
export function isCheckableNote(note) {
  const text = String(note ?? '').trim()
  if (text.length < 20) return false
  return !ABSENCE.some((re) => re.test(text))
}

/** The RhetoricalPoints link for a checkable note, or null. */
export function factCheckUrl(candidateName, note) {
  if (!isCheckableNote(note)) return null
  return `https://rhetoricalpoints.com/check?q=${encodeURIComponent(`${candidateName}: ${String(note).trim()}`)}`
}
