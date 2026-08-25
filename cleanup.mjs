import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join, relative, dirname } from 'path';

const BASE_DIR = './output/www.corporacioninfanciaydesarrollo.org';
const SITE_URL = 'https://www.corporacioninfanciaydesarrollo.org';
const SITE_URL_HTTP = 'http://www.corporacioninfanciaydesarrollo.org';

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

// Calculate relative path from one HTML file to the site root
function getRelativeRoot(htmlFilePath) {
  const relPath = relative(dirname(htmlFilePath), BASE_DIR);
  if (relPath === '') return '.';
  return relPath.replace(/\\/g, '/');
}

async function processHtmlFile(filePath) {
  let content = await readFile(filePath, 'utf-8');
  const relRoot = getRelativeRoot(filePath);
  
  // Remove WordPress API/JSON links that won't work statically
  content = content.replace(/<link\s+rel="https:\/\/api\.w\.org\/[^>]*>/gi, '');
  content = content.replace(/<link\s+rel="alternate"[^>]*application\/json\+oembed[^>]*>/gi, '');
  content = content.replace(/<link\s+rel="alternate"[^>]*text\/xml\+oembed[^>]*>/gi, '');
  content = content.replace(/<link\s+rel="alternate"[^>]*application\/json[^>]*wp-json[^>]*>/gi, '');
  content = content.replace(/<link\s+rel="EditURI"[^>]*>/gi, '');
  content = content.replace(/<link\s+rel="pingback"[^>]*>/gi, '');
  content = content.replace(/<link\s+rel="wlwmanifest"[^>]*>/gi, '');
  
  // Remove WordPress generator meta tags
  content = content.replace(/<meta\s+name="generator"\s+content="WordPress[^"]*"[^>]*>/gi, '');
  
  // Fix remaining absolute URLs to the site - convert to relative
  // Handle href="https://www.corporacioninfanciaydesarrollo.org/something"
  content = content.replace(
    new RegExp(`(href|src|content|action)=["']${escapeRegex(SITE_URL)}/([^"']*)["']`, 'gi'),
    (match, attr, path) => {
      // If path is empty, point to index
      if (!path || path === '') {
        return `${attr}="${relRoot}/index.html"`;
      }
      return `${attr}="${relRoot}/${path}"`;
    }
  );
  
  // Handle href="https://www.corporacioninfanciaydesarrollo.org" (no trailing slash)
  content = content.replace(
    new RegExp(`(href|src|content|action)=["']${escapeRegex(SITE_URL)}["']`, 'gi'),
    (match, attr) => `${attr}="${relRoot}/index.html"`
  );
  
  // Handle HTTP version too
  content = content.replace(
    new RegExp(`(href|src|content|action)=["']${escapeRegex(SITE_URL_HTTP)}/([^"']*)["']`, 'gi'),
    (match, attr, path) => {
      if (!path || path === '') {
        return `${attr}="${relRoot}/index.html"`;
      }
      return `${attr}="${relRoot}/${path}"`;
    }
  );
  
  content = content.replace(
    new RegExp(`(href|src|content|action)=["']${escapeRegex(SITE_URL_HTTP)}["']`, 'gi'),
    (match, attr) => `${attr}="${relRoot}/index.html"`
  );

  // Fix URLs in inline JavaScript/CSS that reference the site
  content = content.replace(
    new RegExp(escapeRegex(SITE_URL) + '/', 'g'),
    relRoot + '/'
  );
  
  // Fix canonical and shortlink to be relative
  content = content.replace(
    new RegExp(`<link\\s+rel="canonical"\\s+href="${escapeRegex(SITE_URL)}[^"]*"[^>]*>`, 'gi'),
    ''
  );
  content = content.replace(
    new RegExp(`<link\\s+rel="shortlink"\\s+href="${escapeRegex(SITE_URL)}[^"]*"[^>]*>`, 'gi'),
    ''
  );
  
  // Remove comments feed links
  content = content.replace(/<link\s+rel="alternate"[^>]*type="application\/rss\+xml"[^>]*>/gi, '');
  
  // Remove xmlrpc references
  content = content.replace(/https?:\/\/www\.corporacioninfanciaydesarrollo\.org\/xmlrpc\.php[^"']*/gi, '#');
  
  // Fix any remaining double slashes in paths (but not in http://)
  content = content.replace(/([^:])\/\//g, '$1/');
  
  // Ensure internal page links point to index.html within directories
  // e.g., href="nosotros/" should become href="nosotros/index.html"
  content = content.replace(
    /href="([^"]*?)\/"(?!\s*>)/gi,
    (match, path) => {
      // Skip external URLs and anchors
      if (path.startsWith('http') || path.startsWith('#') || path.startsWith('mailto') || path.startsWith('tel')) {
        return match;
      }
      return `href="${path}/index.html"`;
    }
  );
  
  // Also fix href that end with / right before >
  content = content.replace(
    /href="([^"]*?)\/"(\s*>)/gi,
    (match, path, closing) => {
      if (path.startsWith('http') || path.startsWith('#') || path.startsWith('mailto') || path.startsWith('tel')) {
        return match;
      }
      return `href="${path}/index.html"${closing}`;
    }
  );

  await writeFile(filePath, content, 'utf-8');
  console.log(`  ✅ Processed: ${relative(BASE_DIR, filePath)}`);
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Also process CSS files to fix absolute URLs
async function getCssFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await getCssFiles(fullPath));
    } else if (entry.name.endsWith('.css')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function processCssFile(filePath) {
  let content = await readFile(filePath, 'utf-8');
  const relRoot = getRelativeRoot(filePath);
  
  // Fix absolute URLs in CSS
  content = content.replace(
    new RegExp(`url\\(['"]?${escapeRegex(SITE_URL)}/([^'")]+)['"]?\\)`, 'gi'),
    (match, path) => `url('${relRoot}/${path}')`
  );
  
  await writeFile(filePath, content, 'utf-8');
}

async function main() {
  console.log('🧹 Starting cleanup of static site...\n');
  
  // Process HTML files
  console.log('📄 Processing HTML files...');
  const htmlFiles = await getHtmlFiles(BASE_DIR);
  console.log(`   Found ${htmlFiles.length} HTML files\n`);
  
  for (const file of htmlFiles) {
    await processHtmlFile(file);
  }
  
  // Process CSS files
  console.log('\n🎨 Processing CSS files...');
  const cssFiles = await getCssFiles(BASE_DIR);
  console.log(`   Found ${cssFiles.length} CSS files\n`);
  
  for (const file of cssFiles) {
    await processCssFile(file);
  }
  
  console.log('\n✅ Cleanup completed successfully!');
  console.log(`\n📂 Your static site is ready at: ${BASE_DIR}`);
  console.log('🌐 To test locally, run: npx serve ./output/www.corporacioninfanciaydesarrollo.org');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
