/**
 * fix-hotspots.mjs
 * Injects JS into index.html to make Elementor Pro hotspot tooltips
 * work on hover (show department name when hovering over map dots).
 * The CSS already handles visibility via .e-hotspot--active class;
 * we just need JS to toggle that class on mouseenter/mouseleave.
 */
import { readFileSync, writeFileSync } from 'fs';

const indexPath = 'output/www.corporacioninfanciaydesarrollo.org/index.html';
let html = readFileSync(indexPath, 'utf-8');

// Check if already injected
if (html.includes('hotspot-hover-fix')) {
  console.log('Hotspot fix already injected. Skipping.');
  process.exit(0);
}

const hotspotScript = `
<!-- hotspot-hover-fix -->
<script>
document.addEventListener('DOMContentLoaded', function() {
  var hotspots = document.querySelectorAll('.e-hotspot');
  hotspots.forEach(function(hotspot) {
    hotspot.addEventListener('mouseenter', function() {
      // Remove active from all others first
      hotspots.forEach(function(h) { h.classList.remove('e-hotspot--active'); });
      hotspot.classList.add('e-hotspot--active');
    });
    hotspot.addEventListener('mouseleave', function() {
      hotspot.classList.remove('e-hotspot--active');
    });
  });
});
</script>
`;

// Also need to ensure the slide-direction tooltips start hidden (opacity 0)
// The CSS already handles this via .e-hotspot--slide-direction default state
// But we need to make sure the direction-mask is visible enough to show tooltip
const hotspotCSS = `
<!-- hotspot-hover-css-fix -->
<style>
/* Ensure tooltips start hidden and animate in on hover */
.e-hotspot .e-hotspot__direction-mask .e-hotspot--slide-direction {
  opacity: 0;
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.e-hotspot.e-hotspot--active .e-hotspot__direction-mask .e-hotspot--slide-direction {
  opacity: 1;
  transform: translate(0) scale(1) !important;
}
/* Make hotspot buttons have pointer cursor */
.e-hotspot__button {
  cursor: pointer;
}
</style>
`;

// Inject CSS before </head> and JS before </body>
html = html.replace('</head>', hotspotCSS + '\n</head>');
html = html.replace('</body>', hotspotScript + '\n</body>');

writeFileSync(indexPath, html, 'utf-8');
console.log('✅ Hotspot hover tooltips fix injected into index.html');
