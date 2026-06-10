/**
 * Shared API error helper for GroundedVote routes.
 *
 * Provides:
 * - Consistent JSON error shape across all routes
 * - Structured console logging with route context and a correlation ID
 * - Correlation IDs in the response header so errors can be traced in Railway logs
 *
 * Usage:
 *   import { apiError } from '@/lib/api-error'
 *   return apiError(err, 'quiz-session:submit', 500)
 */

/**
 * Log a structured error and return a Next.js-compatible Response.
 *
 * @param {unknown} err - the caught error
 * @param {string}  route - short route label, e.g. "quiz-session:submit"
 * @param {number}  status - HTTP status code (default 500)
 * @param {string}  [userMessage] - optional user-facing message (hides internal detail)
 * @returns {Response}
 */
export function apiError(err, route, status = 500, userMessage) {
  const correlationId = generateId()
  const message = userMessage ?? 'An unexpected error occurred. Please try again.'

  // Structured log — visible in Railway's log stream
  console.error(JSON.stringify({
    level: 'error',
    correlationId,
    route,
    status,
    errorType: err?.constructor?.name ?? 'Unknown',
    errorMessage: err?.message ?? String(err),
    stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined,
    timestamp: new Date().toISOString(),
  }))

  return Response.json(
    { error: message, correlationId },
    {
      status,
      headers: {
        'X-Correlation-Id': correlationId,
      },
    }
  )
}

/**
 * Validate that required fields are present in a parsed request body.
 * Returns a 400 Response if any are missing, or null if all present.
 *
 * Usage:
 *   const invalid = requireFields({ sessionId, answers }, ['sessionId', 'answers'])
 *   if (invalid) return invalid
 */
export function requireFields(obj, fields) {
  const missing = fields.filter(f => obj[f] == null || obj[f] === '')
  if (missing.length === 0) return null
  return Response.json(
    { error: `Missing required fields: ${missing.join(', ')}` },
    { status: 400 }
  )
}

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}
