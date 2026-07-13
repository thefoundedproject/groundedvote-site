// © 2025 The Founded Project LLC — All rights reserved.
// lib/auth.js
//
// NextAuth configuration: email + password (credentials provider) with
// JWT sessions. User records live in our own Prisma User model; only the
// bcrypt hash is stored. Login is allowed before email verification —
// the verified flag rides on the session so pages can nudge politely.

import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth'
import { prisma } from './prisma.js'

export const authOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/auth/login' },
  providers: [
    CredentialsProvider({
      name: 'Email and password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim()
        const password = credentials?.password
        if (!email || !password) return null

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return null

        const ok = await bcrypt.compare(password, user.passwordHash)
        if (!ok) return null

        return { id: user.id, email: user.email, emailVerified: Boolean(user.emailVerified) }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.emailVerified = user.emailVerified
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId
        session.user.emailVerified = token.emailVerified
      }
      return session
    },
  },
}

/** Server-side helper: current session user or null. */
export async function getSessionUser() {
  const session = await getServerSession(authOptions)
  return session?.user ?? null
}
