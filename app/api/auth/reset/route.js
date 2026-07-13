// © 2025 The Founded Project LLC — All rights reserved.
// app/api/auth/reset/route.js
//
// POST { token, password } — consumes a reset token and sets the new password.

import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { consumeAuthToken } from '@/lib/auth-email'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { token, password } = await request.json().catch(() => ({}))

    if (!password || password.length < 10) {
      return NextResponse.json({ error: 'Password must be at least 10 characters.' }, { status: 400 })
    }

    const userId = await consumeAuthToken(token, 'reset')
    if (!userId) {
      return NextResponse.json({ error: 'This link has expired. Request a new one.' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[reset] error:', err)
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
  }
}
