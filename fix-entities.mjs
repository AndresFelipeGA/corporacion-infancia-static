import { readdir, readFile, writeFile } from 'fs/promises';
import { join, relative, dirname } from 'path';

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

function getRelativeRoot(htmlFilePath) {
  const relPath = relative(dirname(htmlFilePath), BASE_DIR);
  if (relPath === '') return '.';
  return relPath.replace(/\\/g, '/');
}

async function fixHtmlFile(filePath) {
  let content = await readFile(filePath, 'utf-8');
  const relRoot = getRelativeRoot(filePath);
  let changed = false;
  
  // Fix data-thumbnail with &quot; entities
  // e.g., data-thumbnail="&quot;../wp-content/..." -> data-thumbnail="../wp-content/..."
  const beforeLen = content.length;
  content = content.replace(/data-thumbnail="&quot;([^"]*?)&quot;"/gi, 'data-thumbnail="$1"');
  content = content.replace(/data-src="&quot;([^"]*?)&quot;"/gi, 'data-src="$1"');
  content = content.replace(/data-thumb="&quot;([^"]*?)&quot;"/gi, 'data-thumb="$1"');
  
  // Fix any remaining absolute URLs that the cleanup might have missed
  // (from Puppeteer-rendered content)
  const SITE_URL = 'https://www.corporacioninfanciaydesarrollo.org';
  
  // Fix src attributes with absolute URLs
  content = content.replace(
    /src="https:\/\/www\.corporacioninfanciaydesarrollo\.org\/([^"]*)"/gi,
    (match, path) => `src="${relRoot}/${path}"`
  );
  
  // Fix href attributes with absolute URLs  
  content = content.replace(
    /href="https:\/\/www\.corporacioninfanciaydesarrollo\.org\/([^"]*)"/gi,
    (match, path) => {
      if (!path || path === '') return `href="${relRoot}/index.html"`;
      return `href="${relRoot}/${path}"`;
    }
  );
  
  // Fix href to root
  content = content.replace(
    /href="https:\/\/www\.corporacioninfanciaydesarrollo\.org"/gi,
    `href="${relRoot}/index.html"`
  );
  
  // Fix background-image URLs in inline styles
  content = content.replace(
    /url\("https:\/\/www\.corporacioninfanciaydesarrollo\.org\/([^"]*?)"\)/gi,
    (match, path) => `url("${relRoot}/${path}")`
  );
  
  content = content.replace(
    /url\('https:\/\/www\.corporacioninfanciaydesarrollo\.org\/([^']*?)'\)/gi,
    (match, path) => `url('${relRoot}/${path}')`
  );
  
  content = content.replace(
    /url\(https:\/\/www\.corporacioninfanciaydesarrollo\.org\/([^)]*?)\)/gi,
    (match, path) => `url(${relRoot}/${path})`
  );
  
  // Fix data-thumbnail with absolute URLs
  content = content.replace(
    /data-thumbnail="https:\/\/www\.corporacioninfanciaydesarrollo\.org\/([^"]*)"/gi,
    (match, path) => `data-thumbnail="${relRoot}/${path}"`
  );
  
  // Fix data-src with absolute URLs
  content = content.replace(
    /data-src="https:\/\/www\.corporacioninfanciaydesarrollo\.org\/([^"]*)"/gi,
    (match, path) => `data-src="${relRoot}/${path}"`
  );
  
  // Fix data-lazyload with absolute URLs (Slider Revolution)
  content = content.replace(
    /data-lazyload="https:\/\/www\.corporacioninfanciaydesarrollo\.org\/([^"]*)"/gi,
    (match, path) => `data-lazyload="${relRoot}/${path}"`
  );
  
  // Fix remaining absolute URLs in JavaScript strings
  content = content.replace(
    /"https:\/\/www\.corporacioninfanciaydesarrollo\.org\/wp-content\//g,
    `"${relRoot}/wp-content/`
  );
  
  content = content.replace(
    /'https:\/\/www\.corporacioninfanciaydesarrollo\.org\/wp-content\//g,
    `'${relRoot}/wp-content/`
  );
  
  // Fix srcset attributes
  content = content.replace(
    /https:\/\/www\.corporacioninfanciaydesarrollo\.org\/wp-content\/uploads\//g,
    `${relRoot}/wp-content/uploads/`
  );
  
  if (content.length !== beforeLen) {
    changed = true;
  }
  
  await writeFile(filePath, content, 'utf-8');
  if (changed) {
    console.log(`  ✅ Fixed: ${relative(BASE_DIR, filePath)}`);
  } else {
    console.log(`  ⏭️  No changes: ${relative(BASE_DIR, filePath)}`);
  }
}

async function main() {
  console.log('🔧 Fixing HTML entities and remaining absolute URLs...\n');
  
  const htmlFiles = await getHtmlFiles(BASE_DIR);
  console.log(`Found ${htmlFiles.length} HTML files\n`);
  
  for (const file of htmlFiles) {
    await fixHtmlFile(file);
  }
  
  console.log('\n✅ All fixes applied!');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
