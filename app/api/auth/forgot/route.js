// © 2025 The Founded Project LLC — All rights reserved.
// app/api/auth/forgot/route.js
//
// POST { email } — sends a password reset link if the account exists.
// The response is identical either way, so the endpoint cannot be used
// to probe which emails have accounts.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/auth-email'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = body.email?.toLowerCase().trim()
    if (email) {
      const user = await prisma.user.findUnique({ where: { email } })
      if (user) {
        await sendPasswordResetEmail(user).catch(err =>
          console.error('[forgot] reset email failed:', err.message)
        )
      }
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[forgot] error:', err)
    return NextResponse.json({ ok: true })
  }
}
