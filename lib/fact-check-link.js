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

ABSENCE.push(/\b(does|do|did) not (directly )?(address|cover|mention|state)\b/i)
// An inference is our reasoning, not the candidate's record; it can't be fact-checked.
ABSENCE.push(/\binferred\b|\binference\b|\bnot explicitly documented\b/i)

/** True when the note says something about the candidate that can be checked. */
export function isCheckableNote(note) {
  const text = String(note ?? '').trim()
  if (text.length < 20) return false
  return !ABSENCE.some((re) => re.test(text))
}

// Where a note turns from what the record shows to what we inferred.
const HEDGE = /;|,?\s+(?:but|though|although|suggesting|requiring|with no|with moderate|inferred|as a (?:republican|democrat|house|senate)\b)|\.\s/i

/**
 * The checkable part of a note, or null. Many notes open with a record fact
 * ("sponsored the Shadow Wolves Improvement Act") and then explain an
 * inference ("position inferred from party affiliation"). The fact can be
 * checked; the inference cannot. Returns the leading fact when it stands on
 * its own, the whole note when it is all fact, otherwise null.
 */
export function checkableClaim(note) {
  const text = String(note ?? '').trim().replace(/\s+/g, ' ')
  if (isCheckableNote(text)) return text
  const lead = text.split(HEDGE)[0].trim().replace(/[,;:]$/, '')
  if (lead.length < 40 || lead === text) return null
  return isCheckableNote(lead) ? lead : null
}

/** The RhetoricalPoints link for a note's checkable part, or null. */
export function factCheckUrl(candidateName, note) {
  const claim = checkableClaim(note)
  if (!claim) return null
  return `https://rhetoricalpoints.com/check?q=${encodeURIComponent(`${candidateName}: ${claim}`)}`
}
