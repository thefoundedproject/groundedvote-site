'use client'

// © 2025 The Founded Project LLC — All rights reserved.
// app/components/SiteChrome.jsx — banner + nav + footer (client state lives
// here so the root layout can be a server component and own real metadata).

import { useState, useEffect } from 'react'

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

// All states + DC, for the registration dropdown (vote.gov/register/{code})
const STATES = [
  ['al','Alabama'],['ak','Alaska'],['az','Arizona'],['ar','Arkansas'],['ca','California'],
  ['co','Colorado'],['ct','Connecticut'],['de','Delaware'],['dc','District of Columbia'],
  ['fl','Florida'],['ga','Georgia'],['hi','Hawaii'],['id','Idaho'],['il','Illinois'],
  ['in','Indiana'],['ia','Iowa'],['ks','Kansas'],['ky','Kentucky'],['la','Louisiana'],
  ['me','Maine'],['md','Maryland'],['ma','Massachusetts'],['mi','Michigan'],['mn','Minnesota'],
  ['ms','Mississippi'],['mo','Missouri'],['mt','Montana'],['ne','Nebraska'],['nv','Nevada'],
  ['nh','New Hampshire'],['nj','New Jersey'],['nm','New Mexico'],['ny','New York'],
  ['nc','North Carolina'],['nd','North Dakota'],['oh','Ohio'],['ok','Oklahoma'],['or','Oregon'],
  ['pa','Pennsylvania'],['ri','Rhode Island'],['sc','South Carolina'],['sd','South Dakota'],
  ['tn','Tennessee'],['tx','Texas'],['ut','Utah'],['vt','Vermont'],['va','Virginia'],
  ['wa','Washington'],['wv','West Virginia'],['wi','Wisconsin'],['wy','Wyoming'],
]

function ElectionBanner({ onDismiss }) {
  // Days until Nov 3, 2026, computed after mount so the server render
  // (which may sit on a different day) never mismatches hydration.
  const [days, setDays] = useState(null)
  useEffect(() => {
    const electionDay = new Date(2026, 10, 3) // local midnight, Nov 3 2026
    const today = new Date(); today.setHours(0, 0, 0, 0)
    setDays(Math.round((electionDay - today) / 86400000))
  }, [])

  const headline = days === null
    ? '2026 MIDTERM GENERAL ELECTION \u2014 NOVEMBER 3'
    : days > 1 ? `${days} DAYS UNTIL THE MIDTERMS \u2014 NOVEMBER 3`
    : days === 1 ? '1 DAY UNTIL THE MIDTERMS \u2014 TOMORROW'
    : days === 0 ? 'ELECTION DAY \u2014 POLLS ARE OPEN TODAY'
    : '2026 MIDTERM GENERAL ELECTION \u2014 NOVEMBER 3'

  return (
    <div style={{
      // Solid navy base with the gold tint layered on top \u2014 fully opaque,
      // so scrolling content can never bleed through the fixed header.
      backgroundColor: '#0F1B1F',
      backgroundImage: 'linear-gradient(rgba(216,171,105,0.12), rgba(216,171,105,0.12))',
      borderBottom: '1px solid rgba(216,171,105,0.25)',
      padding: '7px 40px 7px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px 14px',
      flexWrap: 'wrap',
      position: 'relative',
      textAlign: 'center',
    }}>
      <p style={{ color: '#D8AB69', fontSize: 12, fontWeight: 700, margin: 0, letterSpacing: '0.05em' }}>
        🗳 {headline}
      </p>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#5ECFA6', fontSize: 11, fontWeight: 600, letterSpacing: '0.03em' }}>
          Check your registration:
        </span>
        <select
          defaultValue=""
          aria-label="Check voter registration in your state"
          onChange={(e) => {
            const code = e.target.value
            e.target.value = ''
            if (!code) return
            const url = `https://vote.gov/register/${code}`
            // In-app browsers (LinkedIn/Facebook webviews) block popups even
            // on real taps; fall back to same-tab navigation so the link
            // always works where launch traffic actually lands.
            const w = window.open(url, '_blank', 'noopener')
            if (!w) window.location.href = url
          }}
          style={{
            backgroundColor: 'rgba(255,255,255,0.06)', color: '#5ECFA6',
            border: '1px solid rgba(94,207,166,0.35)', borderRadius: 4,
            fontSize: 11, fontWeight: 600, padding: '2px 4px', fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          <option value="" disabled>Select your state</option>
          {STATES.map(([code, name]) => (
            <option key={code} value={code} style={{ color: '#0F1B1F' }}>{name}</option>
          ))}
        </select>
      </label>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.3)', fontSize: 16, lineHeight: 1, padding: '2px 6px', position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
      >
        ×
      </button>
    </div>
  )
}

export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  // One sticky header holds banner + nav: their heights compose naturally,
  // so the banner can wrap on mobile or be dismissed with no hardcoded
  // offsets to drift out of sync.
  return (
    <header style={{ position: 'sticky', top: 0, left: 0, right: 0, zIndex: 60 }}>
      {!bannerDismissed && <ElectionBanner onDismiss={() => setBannerDismissed(true)} />}
      <nav style={{
        backgroundColor: '#0F1B1F',
        borderBottom: '1px solid rgba(216,171,105,0.15)',
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          {/* Logo */}
          <a href="/" style={{ color: '#F5F0E8', fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em', textDecoration: 'none', flexShrink: 0 }}>
            Grounded<span style={{ color: '#D8AB69' }}>Vote</span>
          </a>

          {/* Desktop links */}
          {/* Visibility lives in classes only — an inline display would
              override Tailwind's responsive hidden/flex and break mobile */}
          <div style={{ alignItems: 'center', gap: 24 }}
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
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F5F0E8', padding: 4 }}
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
    </header>
  )
}

export function Footer() {
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
              <li><a href="/races" className="hover:text-white transition-colors">Races</a></li>
              <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
              <li><a href="/audit-trail" className="hover:text-white transition-colors">Audit Trail</a></li>
              <li><a href="/research" className="hover:text-white transition-colors">Research</a></li>
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
          <p className="text-xs">© 2026 GroundedVote · An initiative of The Founded Project LLC. All rights reserved.</p>
          <p className="text-xs">GroundedVote is nonpartisan. No party. No tribe. No fear.</p>
        </div>
      </div>
    </footer>
  )
}
