import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const OUTPUT_DIR = './output/www.corporacioninfanciaydesarrollo.org';

// CSS + JS to make e-gallery images visible from data-thumbnail
const galleryCSS = `
<style id="static-gallery-fix">
/* Elementor Gallery - Static Fix: show data-thumbnail as background */
.e-gallery-image[data-thumbnail] {
  background-size: contain !important;
  background-repeat: no-repeat !important;
  background-position: center !important;
}
.e-gallery-container {
  position: relative;
  width: 100%;
}
.e-gallery-item {
  display: inline-block;
  position: absolute;
  width: calc(var(--item-width) * (100% - var(--gap-count) * var(--hgap, 50px)));
  height: var(--item-height);
  left: calc(var(--item-start) * (100% - var(--gap-count) * var(--hgap, 50px)) + var(--item-row-index) * var(--hgap, 50px));
  top: var(--item-top);
}
.e-gallery-container.e-gallery-justified {
  padding-bottom: calc(var(--container-aspect-ratio) * 100%);
}
.e-gallery-image {
  width: 100%;
  height: 100%;
}
</style>
`;

const galleryJS = `
<script id="static-gallery-fix-js">
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    // Set background-image from data-thumbnail for all gallery images
    var galleryImages = document.querySelectorAll('.e-gallery-image[data-thumbnail]');
    galleryImages.forEach(function(img) {
      var src = img.getAttribute('data-thumbnail');
      if (src) {
        img.style.backgroundImage = 'url(' + src + ')';
      }
    });
    
    // Also handle any data-src or data-bg lazy-loaded images
    var lazySrc = document.querySelectorAll('[data-src]:not([src])');
    lazySrc.forEach(function(el) {
      var src = el.getAttribute('data-src');
      if (src && el.tagName === 'IMG') {
        el.src = src;
      }
    });
    
    var lazyBg = document.querySelectorAll('[data-bg]');
    lazyBg.forEach(function(el) {
      var bg = el.getAttribute('data-bg');
      if (bg && !el.style.backgroundImage) {
        el.style.backgroundImage = 'url(' + bg + ')';
      }
    });
  });
})();
</script>
`;

// Find all HTML files recursively
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
  
  // Only process files that have gallery images with data-thumbnail
  if (!html.includes('data-thumbnail')) {
    continue;
  }
  
  // Skip if already fixed
  if (html.includes('static-gallery-fix')) {
    console.log(`SKIP (already fixed): ${file}`);
    continue;
  }
  
  // Inject CSS before </head>
  html = html.replace('</head>', galleryCSS + '</head>');
  
  // Inject JS before </body>
  html = html.replace('</body>', galleryJS + '</body>');
  
  writeFileSync(file, html, 'utf-8');
  modified++;
  console.log(`FIXED: ${file}`);
}

console.log(`\nDone! Modified ${modified} files with gallery fix.`);
