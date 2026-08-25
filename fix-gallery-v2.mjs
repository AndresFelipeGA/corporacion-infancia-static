import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const OUTPUT_DIR = './output/www.corporacioninfanciaydesarrollo.org';

// This script replaces the complex e-gallery container with a simple
// flexbox grid of <img> tags, since the Elementor e-gallery JS
// isn't properly initializing the data-thumbnail backgrounds.

function findHtmlFiles(dir) {
  let results = [];
  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(findHtmlFiles(fullPath));
    } else if (item.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

const htmlFiles = findHtmlFiles(OUTPUT_DIR);
let modified = 0;

for (const file of htmlFiles) {
  let html = readFileSync(file, 'utf-8');
  
  if (!html.includes('data-thumbnail')) continue;
  
  // Remove old gallery fix CSS/JS if present
  html = html.replace(/<style id="static-gallery-fix">[\s\S]*?<\/style>\n?/g, '');
  html = html.replace(/<script id="static-gallery-fix-js">[\s\S]*?<\/script>\n?/g, '');
  
  // Find all e-gallery-container blocks and replace them
  // Pattern: <div class="elementor-gallery__container e-gallery-container ...">...</div>
  const galleryRegex = /<div class="elementor-gallery__container e-gallery-container[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<\/div>)/g;
  
  let match;
  while ((match = galleryRegex.exec(html)) !== null) {
    const fullMatch = match[0];
    const innerContent = match[1];
    
    // Extract all data-thumbnail URLs and their hrefs
    const itemRegex = /<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?data-thumbnail="([^"]*)"[^>]*>[\s\S]*?<\/a>/g;
    const items = [];
    let itemMatch;
    while ((itemMatch = itemRegex.exec(innerContent)) !== null) {
      items.push({
        href: itemMatch[1],
        thumbnail: itemMatch[2]
      });
    }
    
    if (items.length === 0) continue;
    
    // Build a simple flexbox replacement
    let replacement = `<div class="static-gallery-grid" style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 30px 40px; padding: 20px 0;">`;
    
    for (const item of items) {
      replacement += `\n  <a href="${item.href}" style="display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; max-width: 180px; height: 70px;">`;
      replacement += `<img src="${item.thumbnail}" alt="" style="max-width: 100%; max-height: 100%; object-fit: contain;" loading="lazy">`;
      replacement += `</a>`;
    }
    
    replacement += `\n</div>`;
    
    html = html.replace(fullMatch, replacement);
    console.log(`  Replaced gallery with ${items.length} items in ${file}`);
  }
  
  writeFileSync(file, html, 'utf-8');
  modified++;
  console.log(`FIXED: ${file}`);
}

console.log(`\nDone! Modified ${modified} files.`);
