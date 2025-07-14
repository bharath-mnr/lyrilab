//generate-sitemap.js

import fs from 'fs';
import { generateSitemap } from './src/utils/sitemap.js';

const sitemap = generateSitemap();
fs.writeFileSync('./public/sitemap.xml', sitemap);
console.log('✅ Sitemap saved to public/sitemap.xml');
