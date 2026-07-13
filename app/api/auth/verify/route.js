// © 2025 The Founded Project LLC — All rights reserved.
// app/api/auth/verify/route.js
//
// GET ?token=... — consumes the emailed verification token and redirects
// to login with a status flag the page can read.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { consumeAuthToken } from '@/lib/auth-email'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const token = new URL(request.url).searchParams.get('token')
  const userId = await consumeAuthToken(token, 'verify')

  const base = process.env.NEXTAUTH_URL || 'https://groundedvote.com'
  if (!userId) {
    return NextResponse.redirect(`${base}/auth/login?verified=expired`)
  }

  await prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } })
  return NextResponse.redirect(`${base}/auth/login?verified=1`)
}
