import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { handleStripeEvent } from '@/lib/stripe-fulfillment';

// Created on first use — module-scope construction crashes `next build`
// when STRIPE_SECRET_KEY is absent.
let _stripe;
const stripe = () => (_stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
}));

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// NOTE: No `export const config` here — that's the deprecated Pages Router pattern.
// In the App Router, use req.text() to get the raw body for Stripe signature verification.

export async function POST(req) {
  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  console.log(`[stripe-webhook] Event received: ${event.type} (${event.id})`);

  try {
    // Records the payment/subscription and sends the receipt. Idempotent, so a
    // Stripe redelivery is safe.
    await handleStripeEvent(event);
  } catch (err) {
    // 500 → Stripe retries with backoff; the upserts make retries harmless.
    console.error('[stripe-webhook] Handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
