//src/utils/sitemap.js
import { SEO_CONFIG } from '../config/seo.js';

export function generateSitemap() {
  // Clean domain URL (remove trailing slash)
  let baseUrl = SEO_CONFIG.global.domain;
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }
  
  const pages = Object.keys(SEO_CONFIG.pages);
  const currentDate = new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${currentDate}</lastmod>
    <priority>1.0</priority>
  </url>
  ${pages.map(page => `
  <url>
    <loc>${baseUrl}${SEO_CONFIG.pages[page].canonical}</loc>
    <lastmod>${currentDate}</lastmod>
    <priority>0.8</priority>
  </url>`).join('')}
</urlset>`;
}