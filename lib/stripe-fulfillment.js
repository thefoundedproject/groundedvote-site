// © 2025 The Founded Project LLC
// lib/stripe-fulfillment.js
//
// Post-payment fulfillment for the shared Founded Stripe account. The webhook
// (app/api/webhooks/stripe/route.js) verifies the signature, then hands the
// verified event here. This is the SINGLE place a payment or subscription is
// recorded — a returning browser is never trusted.
//
// Idempotency: Payment.stripeSessionId and Subscription.stripeSubscriptionId are
// unique, and every write is an upsert, so a Stripe redelivery is a safe no-op.
//
// The app / product / entity fields come straight from the Checkout session
// metadata (set by createCheckoutSession from the FOUNDED_APPS registry), so
// this handler is app-agnostic and does not hard-code the legal entity.

import { Resend } from 'resend'
import { prisma } from './prisma.js'
import { stripe } from './stripe.js'

function money(cents, currency = 'usd') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((cents ?? 0) / 100)
}

/** Upsert the email↔Stripe-customer link and return the LOCAL StripeCustomer row. */
async function linkCustomer(email, stripeCustomerId) {
  if (!stripeCustomerId) return null
  return prisma.stripeCustomer.upsert({
    where: { stripeCustomerId },
    update: email ? { email } : {},
    create: { email: email ?? `${stripeCustomerId}@stripe.local`, stripeCustomerId },
  })
}

/** Best-effort supporter receipt. Never throws — a mail hiccup must not fail
 *  the webhook, or Stripe will retry and we risk double-processing. */
async function sendReceipt({ email, app, amountCents, currency, recurring }) {
  if (!email || !process.env.RESEND_API_KEY) return
  const appLabel = app === 'groundedvote' ? 'GroundedVote' : app
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'GroundedVote <accounts@groundedvote.com>',
      to: email,
      subject: recurring ? `You're now a monthly GroundedVote supporter` : `Thank you for supporting ${appLabel}`,
      text: [
        recurring
          ? `Thank you for becoming a monthly GroundedVote supporter.`
          : `Thank you for your support of ${appLabel}.`,
        '',
        `Amount: ${money(amountCents, currency)}${recurring ? ' / month' : ''}`,
        '',
        'Your support keeps civic information free, independent, and grounded in the record.',
        recurring ? 'You can manage or cancel your monthly support anytime — just reply to this email.' : '',
        '',
        '— The Founded Project',
      ]
        .filter(Boolean)
        .join('\n'),
    })
  } catch (err) {
    console.error('[stripe-fulfillment] receipt email failed:', err?.message ?? err)
  }
}

async function onCheckoutCompleted(session) {
  const md = session.metadata ?? {}
  const app = md.app ?? 'groundedvote'
  const product = md.product ?? 'donation_once'
  const entity = md.entity ?? 'The Founded Project LLC'
  const email = session.customer_details?.email ?? session.customer_email ?? null
  const customer = await linkCustomer(email, session.customer ?? null)

  if (session.mode === 'subscription' && session.subscription) {
    const sub = await stripe.subscriptions.retrieve(session.subscription)
    // A subscription always has a Stripe customer; ensure the local link exists.
    const localCustomer = customer ?? (await linkCustomer(email, sub.customer))
    if (localCustomer) {
      await recordSubscription(sub, { app, product, entity, email, localCustomerId: localCustomer.id })
    }
    await sendReceipt({ email, app, amountCents: session.amount_total, currency: session.currency, recurring: true })
    return
  }

  // One-time payment (donation or credit pack).
  await prisma.payment.upsert({
    where: { stripeSessionId: session.id },
    update: {
      status: 'paid',
      stripePaymentIntentId: session.payment_intent ?? null,
      amountCents: session.amount_total ?? 0,
      currency: session.currency ?? 'usd',
    },
    create: {
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent ?? null,
      stripeCustomerId: customer?.id ?? null,
      app,
      product,
      entity,
      amountCents: session.amount_total ?? 0,
      currency: session.currency ?? 'usd',
      status: 'paid',
      email,
      metadata: md,
    },
  })
  await sendReceipt({ email, app, amountCents: session.amount_total, currency: session.currency, recurring: false })
}

async function recordSubscription(sub, { app, product, entity, email, localCustomerId }) {
  const data = {
    app,
    product,
    entity,
    status: sub.status,
    currentPeriodStart: new Date(sub.current_period_start * 1000),
    currentPeriodEnd: new Date(sub.current_period_end * 1000),
    cancelAtPeriodEnd: !!sub.cancel_at_period_end,
    email: email ?? undefined,
  }
  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    update: data,
    create: { stripeSubscriptionId: sub.id, stripeCustomerId: localCustomerId, ...data },
  })
}

async function onSubscriptionChanged(sub) {
  // Update only if we already track it (created via checkout). Pull app/product
  // from the subscription metadata the checkout stamped.
  const existing = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: sub.id } })
  if (!existing) return
  await prisma.subscription.update({
    where: { stripeSubscriptionId: sub.id },
    data: {
      status: sub.status,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: !!sub.cancel_at_period_end,
    },
  })
}

/** Entry point — the webhook route calls this with the verified event. */
export async function handleStripeEvent(event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await onCheckoutCompleted(event.data.object)
      break
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await onSubscriptionChanged(event.data.object)
      break
    default:
      // Unhandled types are acknowledged (200) so Stripe stops retrying.
      break
  }
}
