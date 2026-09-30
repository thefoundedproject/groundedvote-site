// © 2025 The Founded Project LLC — All rights reserved.
// app/layout.js — server root layout. Owns metadata (per-page titles via
// the template + nested metadata) and structured data; all interactive
// chrome (banner/nav/footer state) lives in components/SiteChrome.jsx.

import './globals.css'
import { Nav, Footer } from './components/SiteChrome'

const SITE = 'https://groundedvote.com'

export const metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'GroundedVote | A Civic Alignment Engine',
    template: '%s | GroundedVote',
  },
  description:
    'GroundedVote is a nonpartisan civic alignment engine. Discover which 2026 candidates match your actual policy positions. Bias-audited AI. No party labels.',
  keywords: [
    'voter alignment', 'nonpartisan quiz', '2026 elections', 'candidate match',
    'civic alignment', 'policy quiz', 'voter guide',
  ],
  // Per-page canonical (the old hardcoded canonical pointed every page at
  // the homepage, which told crawlers to ignore 500+ race pages).
  alternates: { canonical: './' },
  openGraph: {
    siteName: 'GroundedVote',
    title: 'GroundedVote — Find candidates who match what you actually believe',
    description:
      'Bias-audited quiz. No party labels. 2026 Senate & House races. Enter your address, take the quiz, see your match.',
    url: SITE,
    type: 'website',
    images: [{ url: `${SITE}/og-default.png`, width: 1200, height: 630, alt: 'GroundedVote — Civic Alignment Engine' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@groundedvote',
    title: 'GroundedVote — Find candidates who match what you actually believe',
    description: 'Bias-audited quiz. No party labels. 2026 Senate & House races.',
    images: [`${SITE}/og-default.png`],
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'GroundedVote' },
  icons: { apple: '/icons/icon-192.png' },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0F1B1F',
}

const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE}/#website`,
      url: SITE,
      name: 'GroundedVote',
      description: 'Nonpartisan civic alignment engine for the 2026 elections.',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE}/races?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE}/#org`,
      name: 'GroundedVote',
      url: SITE,
      logo: `${SITE}/icons/icon-512.png`,
      sameAs: ['https://twitter.com/groundedvote'],
      parentOrganization: {
        '@type': 'Organization',
        name: 'The Founded Project LLC',
        url: 'https://thefoundedproject.com',
      },
    },
  ],
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
