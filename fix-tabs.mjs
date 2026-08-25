import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const OUTPUT_DIR = './output/www.corporacioninfanciaydesarrollo.org';

// CSS to ensure tab content panels display correctly
const tabCSS = `
<style id="static-tabs-fix">
/* Elementor Nested Tabs - Static Fix */
.e-n-tabs-content > [role="tabpanel"] {
  display: none !important;
}
.e-n-tabs-content > [role="tabpanel"].e-active {
  display: flex !important;
}
/* Remove elementor-invisible from active tab's children so animations show */
.e-n-tabs-content > [role="tabpanel"].e-active .elementor-invisible {
  visibility: visible !important;
  opacity: 1 !important;
}
/* Active tab button styling */
.e-n-tab-title[aria-selected="true"] {
  background-color: #9ca53d !important;
  color: #fff !important;
}
.e-n-tab-title {
  cursor: pointer;
  transition: background-color 0.3s ease, color 0.3s ease;
}
.e-n-tab-title:hover {
  background-color: rgba(156, 165, 61, 0.3) !important;
}
.e-n-tab-title[aria-selected="true"]:hover {
  background-color: #8b9436 !important;
}
/* Smooth content transition */
.e-n-tabs-content > [role="tabpanel"].e-active {
  animation: tabFadeIn 0.4s ease-in-out;
}
@keyframes tabFadeIn {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}
</style>
`;

// JavaScript to handle tab switching
const tabJS = `
<script id="static-tabs-fix-js">
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    // Find all tab widgets on the page
    var tabWidgets = document.querySelectorAll('.e-n-tabs');
    
    tabWidgets.forEach(function(widget) {
      var buttons = widget.querySelectorAll('.e-n-tabs-heading .e-n-tab-title');
      var panels = widget.querySelectorAll('.e-n-tabs-content > [role="tabpanel"]');
      
      buttons.forEach(function(btn) {
        btn.addEventListener('click', function() {
          var tabIndex = this.getAttribute('data-tab-index');
          
          // Deactivate all buttons
          buttons.forEach(function(b) {
            b.setAttribute('aria-selected', 'false');
            b.setAttribute('tabindex', '-1');
          });
          
          // Activate clicked button
          this.setAttribute('aria-selected', 'true');
          this.setAttribute('tabindex', '0');
          
          // Hide all panels
          panels.forEach(function(p) {
            p.classList.remove('e-active');
          });
          
          // Show target panel
          var targetId = this.getAttribute('aria-controls');
          var targetPanel = document.getElementById(targetId);
          if (targetPanel) {
            targetPanel.classList.add('e-active');
            // Remove elementor-invisible from children so they show
            targetPanel.querySelectorAll('.elementor-invisible').forEach(function(el) {
              el.classList.remove('elementor-invisible');
              // Trigger animation classes
              var settings = el.getAttribute('data-settings');
              if (settings) {
                try {
                  var s = JSON.parse(settings);
                  if (s.animation) {
                    el.classList.add('animated', s.animation);
                  }
                } catch(e) {}
              }
            });
          }
        });
      });
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
  
  // Only process files that have the nested tabs widget
  if (!html.includes('e-n-tabs')) {
    continue;
  }
  
  // Skip if already fixed
  if (html.includes('static-tabs-fix')) {
    console.log(`SKIP (already fixed): ${file}`);
    continue;
  }
  
  // Inject CSS before </head>
  html = html.replace('</head>', tabCSS + '</head>');
  
  // Inject JS before </body>
  html = html.replace('</body>', tabJS + '</body>');
  
  writeFileSync(file, html, 'utf-8');
  modified++;
  console.log(`FIXED: ${file}`);
}

console.log(`\nDone! Modified ${modified} files with tab functionality.`);
