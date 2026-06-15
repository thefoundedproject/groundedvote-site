export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/'],
      },
    ],
    sitemap: 'https://groundedvote.com/sitemap.xml',
    host: 'https://groundedvote.com',
  }
}
