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
<main className="pt-16">{children}</main>
<Footer />
</body>
</html>
)
}

function Nav() {
const [menuOpen, setMenuOpen] = useState(false)

return (
<nav
style={{
backgroundColor: '#0F1B1F',
borderBottom: '1px solid rgba(232,168,32,0.1)',
}}
className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
>
<div className="max-w-6xl mx-auto flex items-center justify-between">
<a href="/" style={{ letterSpacing: '-0.02em', textDecoration: 'none' }} className="text-xl">
<span style={{ color: '#F5F0E8', fontWeight: 200 }}>Grounded</span><span style={{ color: '#E8A820', fontWeight: 700 }}>Vote</span>
</a>
<div className="hidden md:flex items-center gap-10">
<a href="/methodology" className="text-gray-400 hover:text-white text-sm transition-colors" style={{ letterSpacing: '0.02em' }}>Methodology</a>
<a href="/races" className="text-gray-400 hover:text-white text-sm transition-colors" style={{ letterSpacing: '0.02em' }}>Races</a>
<a href="/audit" className="text-gray-400 hover:text-white text-sm transition-colors" style={{ letterSpacing: '0.02em' }}>Audit Trail</a>
<a href="/about" className="text-gray-400 hover:text-white text-sm transition-colors" style={{ letterSpacing: '0.02em' }}>About</a>
<a
href="/#quiz"
style={{
backgroundColor: '#E8A820',
color: '#0F1B1F',
borderRadius: 2,
letterSpacing: '0.08em',
fontWeight: 800,
textDecoration: 'none',
}}
className="px-5 py-2 text-xs uppercase transition-opacity hover:opacity-90"
>
Take the Quiz
</a>
</div>
<button
className="md:hidden text-white"
aria-label="Menu"
onClick={() => setMenuOpen(!menuOpen)}
>
{menuOpen ? (
<svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
</svg>
) : (
<svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
</svg>
)}
</button>
</div>

{/* Mobile menu */}
{menuOpen && (
<div style={{ backgroundColor: '#0F1B1F', borderTop: '1px solid rgba(232,168,32,0.15)' }} className="md:hidden px-6 py-4 flex flex-col gap-4 mt-2">
<a href="/how-it-works" onClick={() => setMenuOpen(false)} className="text-gray-300 hover:text-white text-sm transition-colors py-2">How It Works</a>
<a href="/methodology" onClick={() => setMenuOpen(false)} className="text-gray-300 hover:text-white text-sm transition-colors py-2">Methodology</a>
<a href="/about" onClick={() => setMenuOpen(false)} className="text-gray-300 hover:text-white text-sm transition-colors py-2">About</a>
<a href="/contact" onClick={() => setMenuOpen(false)} className="text-gray-300 hover:text-white text-sm transition-colors py-2">Contact</a>
<a href="/races" onClick={() => setMenuOpen(false)} className="text-gray-300 hover:text-white text-sm transition-colors py-2">Races</a>
<a href="/audit" onClick={() => setMenuOpen(false)} className="text-gray-300 hover:text-white text-sm transition-colors py-2">Audit Trail</a>
<a href="/support" onClick={() => setMenuOpen(false)} className="text-gray-300 hover:text-white text-sm transition-colors py-2">Support</a>
<a href="/align" onClick={() => setMenuOpen(false)} style={{ backgroundColor: '#E8A820', color: '#0F1B1F', borderRadius: 2, textDecoration: 'none' }} className="px-4 py-3 text-sm font-bold text-center hover:opacity-90 transition-opacity mt-2 block">
Find My Match
</a>
</div>
)}
</nav>
)
}

function Footer() {
return (
<footer style={{ backgroundColor: '#0F1B1F' }} className="text-gray-400 py-16 px-6 mt-24">
<div className="max-w-6xl mx-auto">
<div className="grid md:grid-cols-4 gap-10 mb-12">
<div className="md:col-span-2">
<div className="text-xl mb-3" style={{ letterSpacing: '-0.02em' }}>
<span style={{ color: '#F5F0E8', fontWeight: 200 }}>Grounded</span><span style={{ color: '#E8A820', fontWeight: 700 }}>Vote</span>
</div>
<p className="text-sm leading-relaxed max-w-sm">
A nonpartisan civic alignment engine. Know what you actually believe. See who actually matches.
</p>
<div style={{ width: '40px', height: '2px', backgroundColor: '#E8A820' }} className="mt-4" />
</div>
<div>
<div className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">Platform</div>
<ul className="space-y-2 text-sm">
<li><a href="/how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
<li><a href="/methodology" className="hover:text-white transition-colors">Methodology</a></li>
<li><a href="/about" className="hover:text-white transition-colors">About</a></li>
<li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
<li><a href="/races" className="hover:text-white transition-colors">Races</a></li>
<li><a href="/audit" className="hover:text-white transition-colors">Audit Trail</a></li>
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
