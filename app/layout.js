'use client'

import './globals.css'
import { useState } from 'react'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>GroundedVote | A Civic Alignment Engine</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="GroundedVote is a nonpartisan civic alignment engine. Discover which 2026 candidates match your actual policy positions. Bias-audited AI. No party labels." />
        <meta name="keywords" content="voter alignment, nonpartisan quiz, 2026 elections, candidate match, civic alignment, policy quiz, voter guide" />
        <meta name="theme-color" content="#0F1B1F" />

        {/* Open Graph */}
        <meta property="og:site_name" content="GroundedVote" />
        <meta property="og:title" content="GroundedVote — Find candidates who match what you actually believe" />
        <meta property="og:description" content="Bias-audited quiz. No party labels. 2026 Senate &amp; House races. Enter your address, take the quiz, see your match." />
        <meta property="og:url" content="https://groundedvote.com" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://groundedvote.com/og-default.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="GroundedVote — Civic Alignment Engine" />

        {/* Twitter / X */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@groundedvote" />
        <meta name="twitter:title" content="GroundedVote — Find candidates who match what you actually believe" />
        <meta name="twitter:description" content="Bias-audited quiz. No party labels. 2026 Senate &amp; House races." />
        <meta name="twitter:image" content="https://groundedvote.com/og-default.png" />

        {/* Canonical */}
        <link rel="canonical" href="https://groundedvote.com" />

        {/* PWA */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="GroundedVote" />
        <meta name="mobile-web-app-capable" content="yes" />
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": "https://groundedvote.com/#website",
              "url": "https://groundedvote.com",
              "name": "GroundedVote",
              "description": "Nonpartisan civic alignment engine for the 2026 elections.",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://groundedvote.com/races?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            },
            {
              "@type": "Organization",
              "@id": "https://groundedvote.com/#org",
              "name": "GroundedVote",
              "url": "https://groundedvote.com",
              "logo": "https://groundedvote.com/icons/icon-512.png",
              "sameAs": ["https://twitter.com/groundedvote"],
              "parentOrganization": {
                "@type": "Organization",
                "name": "The Founded Project LLC",
                "url": "https://thefoundedproject.com"
              }
            }
          ]
        }) }}
      />
      </head>
      <body>
        <Nav />
        <main style={{ paddingTop: 89 }}>{children}</main>
        <Footer />
      </body>
    </html>
  )
}

const NAV_LINKS = [
  { href: '/map',         label: 'Race Map' },
  { href: '/races',       label: 'All Races' },
  { href: '/how-it-works',label: 'How It Works' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/about',       label: 'About' },
  { href: '/audit-trail',       label: 'Audit Trail' },
  { href: '/support',     label: 'Support' },
]

function NavLink({ href, label, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <a
      href={href}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        color: hovered ? '#F5F0E8' : 'rgba(245,240,232,0.75)',
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: '0.01em',
        textDecoration: 'none',
        transition: 'color 0.15s',
        padding: '4px 0',
        borderBottom: hovered ? '1px solid rgba(216,171,105,0.5)' : '1px solid transparent',
      }}
    >
      {label}
    </a>
  )
}

function ElectionBanner() {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    <div style={{
      backgroundColor: 'rgba(216,171,105,0.12)',
      borderBottom: '1px solid rgba(216,171,105,0.25)',
      padding: '7px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      flexWrap: 'wrap',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 60,
    }}>
      <p style={{ color: '#D8AB69', fontSize: 12, fontWeight: 700, margin: 0, letterSpacing: '0.05em' }}>
        🗳 2026 MIDTERM GENERAL ELECTION — NOVEMBER 3, 2026
      </p>
      <span style={{ color: 'rgba(245,240,232,0.4)', fontSize: 11 }}>·</span>
      <a
        href="https://vote.gov"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#5ECFA6', fontSize: 11, fontWeight: 600, textDecoration: 'underline', textDecorationColor: 'rgba(94,207,166,0.4)', letterSpacing: '0.03em' }}
      >
        Register or check registration at vote.gov →
      </a>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.3)', fontSize: 16, lineHeight: 1, padding: '0 4px', marginLeft: 8 }}
      >
        ×
      </button>
    </div>
  )
}

function Nav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [bannerShown, setBannerShown] = useState(true)

  return (
    <>
      <ElectionBanner />
      <nav style={{
        backgroundColor: '#0F1B1F',
        borderBottom: '1px solid rgba(216,171,105,0.15)',
        position: 'fixed',
        top: bannerShown ? 33 : 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          {/* Logo */}
          <a href="/" style={{ color: '#F5F0E8', fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em', textDecoration: 'none', flexShrink: 0 }}>
            Grounded<span style={{ color: '#D8AB69' }}>Vote</span>
          </a>

          {/* Desktop links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}
               className="hidden md:flex">
            {NAV_LINKS.map(l => <NavLink key={l.href} href={l.href} label={l.label} />)}
            <a
              href="/#quiz"
              style={{ backgroundColor: '#D8AB69', color: '#0F1B1F', padding: '8px 18px', borderRadius: 5, fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', letterSpacing: '0.01em' }}
            >
              Take the Quiz
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F5F0E8', padding: 4, display: 'none' }}
            className="md:hidden"
          >
            {menuOpen
              ? <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              : <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            }
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ backgroundColor: '#0F1B1F', borderTop: '1px solid rgba(216,171,105,0.12)', padding: '16px 0 24px' }}>
            {NAV_LINKS.map(l => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                style={{ display: 'block', color: '#F5F0E8', fontSize: 15, fontWeight: 500, padding: '12px 0', borderBottom: '1px solid rgba(216,171,105,0.07)', textDecoration: 'none' }}
              >
                {l.label}
              </a>
            ))}
            <a
              href="/align"
              onClick={() => setMenuOpen(false)}
              style={{ display: 'block', backgroundColor: '#D8AB69', color: '#0F1B1F', textAlign: 'center', padding: '14px', borderRadius: 6, fontWeight: 700, fontSize: 14, textDecoration: 'none', marginTop: 16 }}
            >
              Find My Match
            </a>
          </div>
        )}
      </nav>
    </>
  )
}

function Footer() {
  return (
    <footer style={{ backgroundColor: '#0F1B1F' }} className="text-gray-400 py-16 px-6 mt-24">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <div className="text-white font-semibold text-lg mb-3">Grounded<span style={{ color: '#D8AB69' }}>Vote</span></div>
            <p className="text-sm leading-relaxed max-w-sm">
              A nonpartisan civic alignment engine. Know what you actually believe. See who actually matches.
            </p>
            <div style={{ width: '40px', height: '2px', backgroundColor: '#D8AB69' }} className="mt-4" />
          </div>
          <div>
            <div className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">Platform</div>
            <ul className="space-y-2 text-sm">
              <li><a href="/how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="/methodology" className="hover:text-white transition-colors">Methodology</a></li>
              <li><a href="/about" className="hover:text-white transition-colors">About</a></li>
              <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
              <li><a href="/races" className="hover:text-white transition-colors">Races</a></li>
              <li><a href="/audit-trail" className="hover:text-white transition-colors">Audit Trail</a></li>
              <li><a href="/support" className="hover:text-white transition-colors">Support</a></li>
              <li><a href="/terms" className="hover:text-white transition-colors">Terms</a></li>
              <li><a href="/privacy" className="hover:text-white transition-colors">Privacy</a></li>
            </ul>
          </div>
          <div>
            <div className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">Ecosystem</div>
            <ul className="space-y-2 text-sm">
              <li><a href="https://thefoundedproject.com" className="hover:text-white transition-colors">The Founded Project</a></li>
              <li><a href="https://thefounded.app" className="hover:text-white transition-colors">The Founded App</a></li>
              <li><a href="https://thefoundedemerging.app" className="hover:text-white transition-colors">Founded Emerging</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between gap-4">
          <p className="text-xs">© 2026 GroundedVote · An initiative of RhetoricalPoints LLC. All rights reserved.</p>
          <p className="text-xs">GroundedVote is nonpartisan. No party. No tribe. No fear.</p>
        </div>
      </div>
    </footer>
  )
}
