/**
 * fix-photo-grid.mjs
 * Replaces the second static-gallery-grid on index.html (the 8-photo gallery)
 * with a full-width 4-column CSS grid layout matching the original site's mosaic.
 * The first static-gallery-grid (partner logos) is left unchanged.
 */
import { readFileSync, writeFileSync } from 'fs';

const indexPath = 'output/www.corporacioninfanciaydesarrollo.org/index.html';
let html = readFileSync(indexPath, 'utf-8');

// Find all static-gallery-grid occurrences
const regex = /<div class="static-gallery-grid"[^>]*>[\s\S]*?<\/div>/g;
let matches = [];
let m;
while ((m = regex.exec(html)) !== null) {
  matches.push({ index: m.index, length: m[0].length, content: m[0] });
}

console.log(`Found ${matches.length} static-gallery-grid sections`);

if (matches.length < 2) {
  console.log('Expected at least 2 galleries. Aborting.');
  process.exit(1);
}

// The second match is the photo gallery (8 photos)
const photoGallery = matches[1];
console.log(`Photo gallery at index ${photoGallery.index}, length ${photoGallery.length}`);

// Extract image sources and hrefs from the existing gallery
const imgRegex = /<a href="([^"]*)"[^>]*><img src="([^"]*)"[^>]*><\/a>/g;
const items = [];
let im;
while ((im = imgRegex.exec(photoGallery.content)) !== null) {
  items.push({ href: im[1], src: im[2] });
}

console.log(`Found ${items.length} photo items`);

// Build the new full-width 4-column grid
// Original site uses: columns=4, gap=0, aspect_ratio=1:1, gallery_layout=grid
let newGallery = `<div class="static-photo-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; width: 100%;">\n`;

for (const item of items) {
  newGallery += `  <a href="${item.href}" style="display: block; position: relative; padding-bottom: 100%; overflow: hidden;"><img src="${item.src}" alt="" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;" loading="lazy"></a>\n`;
}

newGallery += `</div>`;

// Replace the second gallery
html = html.substring(0, photoGallery.index) + newGallery + html.substring(photoGallery.index + photoGallery.length);

writeFileSync(indexPath, html, 'utf-8');
console.log('✅ Photo gallery replaced with full-width 4-column CSS grid layout');
