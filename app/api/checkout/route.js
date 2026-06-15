import { NextResponse } from 'next/server'
import { createCheckoutSession } from '@/lib/stripe'

export async function POST(request) {
  try {
    const { app, product, email, amount } = await request.json()
    if (!app || !product) return NextResponse.json({ error: 'app and product required' }, { status: 400 })

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://groundedvote.com'

    const session = await createCheckoutSession({
      app,
      product,
      email: email || undefined,
      amount: amount || undefined,
      successUrl: `${baseUrl}/support/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/support`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
