/**
 * The Founded Project LLC — API Key & Credit System
 *
 * Reusable blueprint for any Founded app that sells API access.
 * Currently used by: RhetoricalPoints
 * Pattern can be copied to: any future API product
 *
 * Flow:
 *   1. User buys credit pack via Stripe Checkout
 *   2. Webhook fires → provisionApiCredits() creates/tops up key
 *   3. User gets their key via email (never stored plaintext)
 *   4. Each API call runs through checkApiKey() middleware
 *   5. On success, deductCredits() decrements balance
 */

import { prisma } from './prisma.js'
import crypto from 'crypto'

// ─── KEY GENERATION ───────────────────────────────────────────────────────────

/**
 * Generate a new API key for a user.
 * Returns { rawKey, apiKey } — rawKey is shown ONCE and never stored.
 */
export async function generateApiKey({ email, app, stripeCustomerId = null }) {
  const rawKey = `fp_live_${crypto.randomBytes(20).toString('hex')}`
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
  const keyPrefix = rawKey.slice(0, 15) // fp_live_xxxxxxxx

  const apiKey = await prisma.apiKey.create({
    data: {
      key: keyHash,
      keyPrefix,
      app,
      email,
      stripeCustomerId: stripeCustomerId || null,
      creditBalance: 0,
      totalCredits: 0,
    },
  })

  return { rawKey, apiKey }
}

// ─── CREDIT MANAGEMENT ────────────────────────────────────────────────────────

export async function addCredits({ apiKeyId, amount, description, paymentId = null }) {
  const key = await prisma.apiKey.findUnique({ where: { id: apiKeyId } })
  if (!key) throw new Error('API key not found')

  const newBalance = key.creditBalance + amount

  await prisma.$transaction([
    prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { creditBalance: newBalance, totalCredits: { increment: amount } },
    }),
    prisma.apiKeyTransaction.create({
      data: {
        apiKeyId,
        type: 'credit',
        amount,
        balance: newBalance,
        description: description || `${amount} credits added`,
        paymentId,
      },
    }),
  ])

  return newBalance
}

export async function deductCredits({ apiKeyId, amount, description }) {
  const key = await prisma.apiKey.findUnique({ where: { id: apiKeyId } })
  if (!key) throw new Error('API key not found')
  if (key.creditBalance < amount) throw new Error('Insufficient credits')

  const newBalance = key.creditBalance - amount

  await prisma.$transaction([
    prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { creditBalance: newBalance, lastUsedAt: new Date() },
    }),
    prisma.apiKeyTransaction.create({
      data: {
        apiKeyId,
        type: 'debit',
        amount: -amount,
        balance: newBalance,
        description: description || 'API call',
      },
    }),
  ])

  return newBalance
}

// ─── KEY VALIDATION MIDDLEWARE ────────────────────────────────────────────────

/**
 * Validate an API key from a request header.
 * Use in any API route: const { valid, apiKey, error } = await validateApiKey(request, 'rhetoricalpoints')
 *
 * Expects header: Authorization: Bearer fp_live_xxxxxxxxxxxx
 */
export async function validateApiKey(request, app) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing API key. Include Authorization: Bearer <your_key>' }
  }

  const rawKey = authHeader.slice(7).trim()

  if (!rawKey.startsWith('fp_live_')) {
    return { valid: false, error: 'Invalid API key format' }
  }

  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')

  const apiKey = await prisma.apiKey.findUnique({
    where: { key: keyHash },
  })

  if (!apiKey) return { valid: false, error: 'Invalid API key' }
  if (!apiKey.active) return { valid: false, error: 'API key has been deactivated' }
  if (apiKey.app !== app) return { valid: false, error: `This key is not valid for ${app}` }
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return { valid: false, error: 'API key has expired' }
  if (apiKey.creditBalance <= 0) {
    return {
      valid: false,
      error: 'Insufficient credits. Purchase more at https://rhetoricalpoints.com/credits',
      code: 'INSUFFICIENT_CREDITS',
    }
  }

  return { valid: true, apiKey }
}

/**
 * Higher-order helper: validate key, deduct credits, run handler.
 * Use this to wrap any credit-gated API route.
 *
 * Example:
 *   export async function POST(request) {
 *     return withApiCredits(request, 'rhetoricalpoints', 1, async (apiKey) => {
 *       // your logic here
 *       return NextResponse.json({ result: '...' })
 *     })
 *   }
 */
export async function withApiCredits(request, app, creditsPerCall, handler) {
  const { NextResponse } = await import('next/server')

  const { valid, apiKey, error, code } = await validateApiKey(request, app)

  if (!valid) {
    return NextResponse.json(
      { error, code: code || 'UNAUTHORIZED' },
      { status: code === 'INSUFFICIENT_CREDITS' ? 402 : 401 }
    )
  }

  try {
    // Deduct before running — prevents double-dipping on retries
    await deductCredits({
      apiKeyId: apiKey.id,
      amount: creditsPerCall,
      description: `${request.method} ${new URL(request.url).pathname}`,
    })

    const result = await handler(apiKey)

    // Add credit balance to response headers so client can track
    const response = result.clone ? result.clone() : result
    response.headers?.set('X-Credits-Remaining', String(apiKey.creditBalance - creditsPerCall))

    return result
  } catch (err) {
    // Refund credits on handler error
    await addCredits({
      apiKeyId: apiKey.id,
      amount: creditsPerCall,
      description: 'Credit refund — handler error',
    }).catch(() => {})

    throw err
  }
}

// ─── KEY LOOKUP FOR USER DASHBOARDS ──────────────────────────────────────────

export async function getKeysForEmail(email, app = null) {
  return prisma.apiKey.findMany({
    where: {
      email,
      active: true,
      ...(app ? { app } : {}),
    },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })
}
