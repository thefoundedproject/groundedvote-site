/**
 * Congress.gov API integration
 * Free API — register at https://api.congress.gov to get a key
 * Docs: https://api.congress.gov/
 */

const BASE_URL = 'https://api.congress.gov/v3'
const API_KEY = process.env.CONGRESS_API_KEY

async function congressFetch(path, params = {}) {
  if (!API_KEY) throw new Error('CONGRESS_API_KEY environment variable not set')

  const url = new URL(`${BASE_URL}${path}`)
  url.searchParams.set('api_key', API_KEY)
  url.searchParams.set('format', 'json')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 3600 }, // cache 1 hour
  })

  if (!res.ok) {
    throw new Error(`Congress API error ${res.status}: ${path}`)
  }

  return res.json()
}

/**
 * Get all current members of Congress
 */
export async function getCurrentMembers(congress = 119) {
  const data = await congressFetch(`/member/congress/${congress}`, { limit: 250 })
  return data.members || []
}

/**
 * Get members by state and chamber
 */
export async function getMembersByState(stateCode, chamber = 'senate', congress = 119) {
  const chamberParam = chamber === 'senate' ? 'senate' : 'house'
  const data = await congressFetch(`/member/${stateCode}/${chamberParam}`, {
    congress,
    limit: 50,
  })
  return data.members || []
}

/**
 * Get a single member's full profile
 */
export async function getMember(bioguideId) {
  const data = await congressFetch(`/member/${bioguideId}`)
  return data.member || null
}

/**
 * Get a member's voting record (sponsored bills and votes)
 */
export async function getMemberVotes(bioguideId, limit = 50) {
  const data = await congressFetch(`/member/${bioguideId}/votes`, { limit })
  return data.votes || []
}

/**
 * Get a member's sponsored legislation
 */
export async function getMemberSponsored(bioguideId, limit = 50) {
  const data = await congressFetch(`/member/${bioguideId}/sponsored-legislation`, { limit })
  return data.sponsoredLegislation || []
}

/**
 * Search bills by keyword/topic for a congress
 */
export async function searchBills(query, congress = 119, limit = 20) {
  const data = await congressFetch('/bill', {
    congress,
    query,
    limit,
    sort: 'updateDate+desc',
  })
  return data.bills || []
}

/**
 * Get roll call votes for a bill
 */
export async function getBillVotes(congress, billType, billNumber) {
  const data = await congressFetch(`/bill/${congress}/${billType}/${billNumber}/actions`, { limit: 100 })
  return data.actions || []
}

// ─── KEY 2026 COMPETITIVE RACES ───────────────────────────────────────────────
// These are the races most likely to determine congressional control.
// Sourced from Cook Political Report / Sabato's Crystal Ball 2026 ratings.
export const KEY_2026_RACES = [
  // SENATE — Competitive seats
  { state: 'AZ', stateFull: 'Arizona',      chamber: 'SENATE', district: null, label: 'Arizona Senate 2026' },
  { state: 'GA', stateFull: 'Georgia',       chamber: 'SENATE', district: null, label: 'Georgia Senate 2026' },
  { state: 'MI', stateFull: 'Michigan',      chamber: 'SENATE', district: null, label: 'Michigan Senate 2026' },
  { state: 'MN', stateFull: 'Minnesota',     chamber: 'SENATE', district: null, label: 'Minnesota Senate 2026' },
  { state: 'MT', stateFull: 'Montana',       chamber: 'SENATE', district: null, label: 'Montana Senate 2026' },
  { state: 'NC', stateFull: 'North Carolina',chamber: 'SENATE', district: null, label: 'North Carolina Senate 2026' },
  { state: 'NH', stateFull: 'New Hampshire', chamber: 'SENATE', district: null, label: 'New Hampshire Senate 2026' },
  { state: 'NV', stateFull: 'Nevada',        chamber: 'SENATE', district: null, label: 'Nevada Senate 2026' },
  { state: 'OH', stateFull: 'Ohio',          chamber: 'SENATE', district: null, label: 'Ohio Senate 2026' },
  { state: 'PA', stateFull: 'Pennsylvania',  chamber: 'SENATE', district: null, label: 'Pennsylvania Senate 2026' },
  { state: 'TX', stateFull: 'Texas',         chamber: 'SENATE', district: null, label: 'Texas Senate 2026' },
  { state: 'WI', stateFull: 'Wisconsin',     chamber: 'SENATE', district: null, label: 'Wisconsin Senate 2026' },

  // HOUSE — Key competitive districts
  { state: 'AZ', stateFull: 'Arizona',       chamber: 'HOUSE', district: '1',  label: 'Arizona House District 1 2026' },
  { state: 'AZ', stateFull: 'Arizona',       chamber: 'HOUSE', district: '6',  label: 'Arizona House District 6 2026' },
  { state: 'CA', stateFull: 'California',    chamber: 'HOUSE', district: '13', label: 'California House District 13 2026' },
  { state: 'CA', stateFull: 'California',    chamber: 'HOUSE', district: '27', label: 'California House District 27 2026' },
  { state: 'CO', stateFull: 'Colorado',      chamber: 'HOUSE', district: '8',  label: 'Colorado House District 8 2026' },
  { state: 'GA', stateFull: 'Georgia',       chamber: 'HOUSE', district: '7',  label: 'Georgia House District 7 2026' },
  { state: 'IA', stateFull: 'Iowa',          chamber: 'HOUSE', district: '3',  label: 'Iowa House District 3 2026' },
  { state: 'ME', stateFull: 'Maine',         chamber: 'HOUSE', district: '2',  label: 'Maine House District 2 2026' },
  { state: 'MI', stateFull: 'Michigan',      chamber: 'HOUSE', district: '7',  label: 'Michigan House District 7 2026' },
  { state: 'MI', stateFull: 'Michigan',      chamber: 'HOUSE', district: '8',  label: 'Michigan House District 8 2026' },
  { state: 'MN', stateFull: 'Minnesota',     chamber: 'HOUSE', district: '2',  label: 'Minnesota House District 2 2026' },
  { state: 'NM', stateFull: 'New Mexico',    chamber: 'HOUSE', district: '2',  label: 'New Mexico House District 2 2026' },
  { state: 'NY', stateFull: 'New York',      chamber: 'HOUSE', district: '3',  label: 'New York House District 3 2026' },
  { state: 'NY', stateFull: 'New York',      chamber: 'HOUSE', district: '4',  label: 'New York House District 4 2026' },
  { state: 'NY', stateFull: 'New York',      chamber: 'HOUSE', district: '17', label: 'New York House District 17 2026' },
  { state: 'NY', stateFull: 'New York',      chamber: 'HOUSE', district: '18', label: 'New York House District 18 2026' },
  { state: 'OR', stateFull: 'Oregon',        chamber: 'HOUSE', district: '5',  label: 'Oregon House District 5 2026' },
  { state: 'PA', stateFull: 'Pennsylvania',  chamber: 'HOUSE', district: '7',  label: 'Pennsylvania House District 7 2026' },
  { state: 'PA', stateFull: 'Pennsylvania',  chamber: 'HOUSE', district: '8',  label: 'Pennsylvania House District 8 2026' },
  { state: 'TX', stateFull: 'Texas',         chamber: 'HOUSE', district: '28', label: 'Texas House District 28 2026' },
  { state: 'VA', stateFull: 'Virginia',      chamber: 'HOUSE', district: '2',  label: 'Virginia House District 2 2026' },
  { state: 'VA', stateFull: 'Virginia',      chamber: 'HOUSE', district: '7',  label: 'Virginia House District 7 2026' },
  { state: 'WA', stateFull: 'Washington',    chamber: 'HOUSE', district: '3',  label: 'Washington House District 3 2026' },
  { state: 'WI', stateFull: 'Wisconsin',     chamber: 'HOUSE', district: '3',  label: 'Wisconsin House District 3 2026' },
]
