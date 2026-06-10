export default function manifest() {
  return {
    name: 'GroundedVote',
    short_name: 'GroundedVote',
    description: 'Nonpartisan civic alignment engine. Find candidates who match what you actually believe.',
    start_url: '/align',
    display: 'standalone',
    background_color: '#0F1B1F',
    theme_color: '#0F1B1F',
    orientation: 'portrait-primary',
    categories: ['politics', 'education', 'utilities'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
    shortcuts: [
      { name: 'Take the Quiz', url: '/align', description: 'Start your civic alignment quiz' },
      { name: 'Browse Races', url: '/races', description: 'See all covered races' },
    ],
  }
}
