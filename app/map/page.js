import USMapClient from './USMapClient'

export const metadata = {
  title: '2026 Race Map',
  description: 'See which states have active 2026 midterm races on GroundedVote. Click any state to explore Senate and House races.',
}

export default function MapPage() {
  return <USMapClient />
}
