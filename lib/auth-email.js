// © 2025 The Founded Project LLC — All rights reserved.
// lib/auth-email.js
//
// Single-use auth tokens (email verification, password reset) and the
// Resend emails that carry them. Raw tokens exist only in the email link;
// the database stores a SHA-256 hash.

import crypto from 'crypto'
import { Resend } from 'resend'
import { prisma } from './prisma.js'

const BASE_URL = process.env.NEXTAUTH_URL || 'https://groundedvote.com'
const TOKEN_TTL_MS = { verify: 1000 * 60 * 60 * 24, reset: 1000 * 60 * 60 } // 24h / 1h

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

/** Create a token row and return the raw token for the email link. */
export async function createAuthToken(userId, type) {
  const raw = crypto.randomBytes(32).toString('hex')
  await prisma.authToken.create({
    data: {
      userId,
      type,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS[type]),
    },
  })
  return raw
}

/** Validate and consume a token. Returns the userId or null. */
export async function consumeAuthToken(raw, type) {
  if (!raw) return null
  const token = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(raw) } })
  if (!token || token.type !== type || token.usedAt || token.expiresAt < new Date()) return null
  await prisma.authToken.update({ where: { id: token.id }, data: { usedAt: new Date() } })
  return token.userId
}

export async function sendVerificationEmail(user) {
  const raw = await createAuthToken(user.id, 'verify')
  const url = `${BASE_URL}/api/auth/verify?token=${raw}`
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: 'GroundedVote <accounts@groundedvote.com>',
    to: user.email,
    subject: 'Confirm your GroundedVote email',
    text: [
      'Welcome to GroundedVote.',
      '',
      'Click to confirm your email address:',
      url,
      '',
      'The link works for 24 hours. If you did not create this account, you can ignore this email.',
    ].join('\n'),
  })
}

export async function sendPasswordResetEmail(user) {
  const raw = await createAuthToken(user.id, 'reset')
  const url = `${BASE_URL}/auth/reset-password?token=${raw}`
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: 'GroundedVote <accounts@groundedvote.com>',
    to: user.email,
    subject: 'Reset your GroundedVote password',
    text: [
      'Someone asked to reset the password for this GroundedVote account.',
      '',
      'If that was you, set a new password here:',
      url,
      '',
      'The link works for 1 hour. If you did not ask for this, you can ignore this email — your password stays as it is.',
    ].join('\n'),
  })
}
