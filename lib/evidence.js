// Whether a candidate's position is inferred from their party rather than
// drawn from their own record, statements or platform.
//
// The research step labels each answer with an evidenceType, but it sometimes
// labels an answer as record-based while its own note says the position was
// "inferred from party affiliation". The note is the more honest signal, so
// either one marks the answer as inferred.

const INFERRED_NOTE = [
  /\binferred from (?:his|her|their|the candidate's|[A-Z][a-z]+'s)?\s*(?:republican|democratic|democrat|gop|party)\b/i,
  /\binferred from (?:the )?(?:party|partisan) (?:affiliation|alignment|platform|position)/i,
  /\bposition (?:is |was )?inferred\b/i,
  /\bparty[- ]based inference\b/i,
  /\bbased (?:solely |only |mainly )?on (?:his |her |their )?party\b/i,
]

export function isPartyInferred(answer) {
  if (!answer) return false
  if (answer.evidenceType === 'PARTY_INFERENCE') return true
  const note = String(answer.sourceNote ?? '')
  return INFERRED_NOTE.some((re) => re.test(note))
}
