/**
 * Candidate photo resolution.
 * Priority order:
 * 1. candidate.imageUrl (manually set or previously stored)
 * 2. Congress.gov official headshot (incumbents with bioguideId)
 * 3. null (show initials avatar)
 *
 * Congress.gov headshots are publicly available at:
 * https://bioguide.congress.gov/bioguide/photo/{first_letter}/{bioguideId}.jpg
 */

export function getCandidatePhotoUrl(candidate) {
  if (candidate.imageUrl) return candidate.imageUrl
  if (candidate.bioguideId) {
    const first = candidate.bioguideId[0].toUpperCase()
    return `https://bioguide.congress.gov/bioguide/photo/${first}/${candidate.bioguideId}.jpg`
  }
  return null
}

/**
 * Generate initials for avatar fallback.
 */
export function getCandidateInitials(candidate) {
  return `${(candidate.firstName?.[0] ?? '').toUpperCase()}${(candidate.lastName?.[0] ?? '').toUpperCase()}`
}
