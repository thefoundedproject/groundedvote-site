// © 2025 The Founded Project LLC — All rights reserved.
// app/api/auth/signup/route.js
//
// POST { email, password, researchOptIn } → creates the account and sends
// the verification email. The client signs in with the same credentials
// right after. researchOptIn is the explicit standalone consent choice —
// it defaults to false and is never inferred.

import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/auth-email'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = body.email?.toLowerCase().trim()
    const password = body.password
    const researchOptIn = body.researchOptIn === true

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
    }
    if (!password || password.length < 10) {
      return NextResponse.json({ error: 'Password must be at least 10 characters.' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      // Same response shape as success — account existence is not disclosed
      return NextResponse.json({ ok: true })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { email, passwordHash, researchOptIn },
    })

    try {
      await sendVerificationEmail(user)
    } catch (err) {
      // Account exists either way — verification can be resent later
      console.error('[signup] verification email failed:', err.message)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[signup] error:', err)
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
  }
}
