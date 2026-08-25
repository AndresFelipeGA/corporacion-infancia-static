import { readdir, readFile, writeFile } from 'fs/promises';
import { join, relative } from 'path';

const BASE_DIR = './output/www.corporacioninfanciaydesarrollo.org';

// Recursively get all HTML files
async function getHtmlFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await getHtmlFiles(fullPath));
    } else if (entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

// Custom CSS for the dropdown menu - improved styling
const dropdownCSS = `
<style id="custom-dropdown-fix">
/* Fix dropdown menu for static site */
.ekit-wid-con .elementskit-navbar-nav .elementskit-dropdown,
.elementor-nav-menu--dropdown {
  display: none !important;
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 9999;
  min-width: 220px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  padding: 8px 0;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.3s ease, transform 0.3s ease, visibility 0.3s ease;
  visibility: hidden;
  border: 1px solid rgba(0, 128, 0, 0.1);
}

.menu-item-has-children:hover > .elementor-nav-menu--dropdown,
.menu-item-has-children:hover > .elementskit-dropdown,
.ekit-wid-con .elementskit-navbar-nav .elementskit-dropdown-has:hover > .elementskit-dropdown {
  display: block !important;
  opacity: 1;
  transform: translateY(0);
  visibility: visible;
}

.elementor-nav-menu--dropdown .elementor-sub-item,
.elementskit-dropdown .elementskit-dropdown-menu-nav a {
  display: block;
  padding: 10px 20px;
  color: #333333 !important;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  white-space: nowrap;
  font-family: 'Lato', sans-serif;
}

.elementor-nav-menu--dropdown .elementor-sub-item:hover,
.elementskit-dropdown .elementskit-dropdown-menu-nav a:hover {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  color: #2e7d32 !important;
  padding-left: 25px;
}

/* Ensure parent menu item is positioned relative */
.menu-item-has-children,
.elementskit-dropdown-has {
  position: relative;
}

/* Arrow indicator styling */
.menu-item-has-children > a .sub-arrow svg,
.elementskit-dropdown-has > a .elementskit-submenu-indicator svg {
  transition: transform 0.3s ease;
}

.menu-item-has-children:hover > a .sub-arrow svg,
.elementskit-dropdown-has:hover > a .elementskit-submenu-indicator svg {
  transform: rotate(180deg);
}

/* Mobile responsive */
@media (max-width: 1024px) {
  .elementor-nav-menu--dropdown,
  .elementskit-dropdown {
    position: static;
    box-shadow: none;
    border: none;
    border-radius: 0;
    padding-left: 15px;
    background: rgba(0, 128, 0, 0.05);
  }
  
  .elementor-nav-menu--dropdown .elementor-sub-item:hover,
  .elementskit-dropdown .elementskit-dropdown-menu-nav a:hover {
    padding-left: 30px;
  }
}
</style>
`;

// JavaScript to make the dropdown work without smartmenus
const dropdownJS = `
<script id="custom-dropdown-fix-js">
document.addEventListener('DOMContentLoaded', function() {
  // Fix dropdown menus - make them work with pure CSS hover
  var dropdownParents = document.querySelectorAll('.menu-item-has-children, .elementskit-dropdown-has');
  
  dropdownParents.forEach(function(parent) {
    var link = parent.querySelector(':scope > a');
    var dropdown = parent.querySelector(':scope > ul, :scope > .elementskit-dropdown');
    
    if (dropdown) {
      // Remove aria-hidden to allow display
      dropdown.removeAttribute('aria-hidden');
      dropdown.style.display = '';
      
      // Make the parent link clickable to toggle on mobile
      if (link && !link.getAttribute('href')) {
        link.style.cursor = 'pointer';
        
        link.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          var isVisible = dropdown.classList.contains('show-dropdown');
          
          // Close all other dropdowns
          document.querySelectorAll('.show-dropdown').forEach(function(d) {
            d.classList.remove('show-dropdown');
          });
          
          if (!isVisible) {
            dropdown.classList.add('show-dropdown');
          }
        });
      }
    }
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.menu-item-has-children, .elementskit-dropdown-has')) {
      document.querySelectorAll('.show-dropdown').forEach(function(d) {
        d.classList.remove('show-dropdown');
      });
    }
  });
});
</script>
`;

// Additional CSS for the JS toggle class
const toggleCSS = `
<style id="dropdown-toggle-css">
.show-dropdown {
  display: block !important;
  opacity: 1 !important;
  transform: translateY(0) !important;
  visibility: visible !important;
}
</style>
`;

async function main() {
  console.log('🔧 Fixing dropdown menu functionality...\n');

  const htmlFiles = await getHtmlFiles(BASE_DIR);
  let fixed = 0;

  for (const file of htmlFiles) {
    let content = await readFile(file, 'utf-8');
    const original = content;

    // Skip if already fixed
    if (content.includes('custom-dropdown-fix')) {
      console.log(`  ⏭️  Already fixed: ${relative(BASE_DIR, file)}`);
      continue;
    }

    // Insert the CSS before </head>
    content = content.replace('</head>', dropdownCSS + toggleCSS + '</head>');

    // Insert the JS before </body>
    content = content.replace('</body>', dropdownJS + '</body>');

    if (content !== original) {
      await writeFile(file, content, 'utf-8');
      console.log(`  ✅ Fixed: ${relative(BASE_DIR, file)}`);
      fixed++;
    }
  }

  console.log(`\n✅ Fixed dropdown menu in ${fixed} HTML files`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
