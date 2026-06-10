import { prisma } from '@/lib/prisma'

export default async function sitemap() {
  const base = 'https://groundedvote.com'

  // Static routes
  const staticRoutes = [
    { url: base, priority: 1.0, changeFrequency: 'weekly' },
    { url: `${base}/align`, priority: 0.9, changeFrequency: 'weekly' },
    { url: `${base}/races`, priority: 0.9, changeFrequency: 'daily' },
    { url: `${base}/how-it-works`, priority: 0.7, changeFrequency: 'monthly' },
    { url: `${base}/methodology`, priority: 0.7, changeFrequency: 'monthly' },
    { url: `${base}/about`, priority: 0.6, changeFrequency: 'monthly' },
    { url: `${base}/audit`, priority: 0.6, changeFrequency: 'weekly' },
    { url: `${base}/support`, priority: 0.5, changeFrequency: 'monthly' },
  ].map(r => ({ ...r, lastModified: new Date() }))

  // Dynamic candidate pages
  let candidateRoutes = []
  try {
    const candidates = await prisma.candidate.findMany({
      select: { id: true, updatedAt: true },
    })
    candidateRoutes = candidates.map(c => ({
      url: `${base}/candidates/${c.id}`,
      lastModified: c.updatedAt ?? new Date(),
      priority: 0.6,
      changeFrequency: 'weekly',
    }))
  } catch { /* DB may not be available at build time */ }

  return [...staticRoutes, ...candidateRoutes]
}
