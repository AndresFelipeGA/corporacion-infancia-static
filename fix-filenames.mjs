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

async function fixHtmlFile(filePath) {
  let content = await readFile(filePath, 'utf-8');
  const original = content;
  
  // The Puppeteer-rendered HTML has URLs like:
  //   /wp-content/plugins/elementor/assets/css/frontend.min.css?ver=4.2.3
  // But the downloaded files are named:
  //   wp-content/plugins/elementor/assets/css/frontend.min_ver%3D4.2.3.css
  
  // Fix CSS file references: file.css?ver=X.X.X -> file_ver%3DX.X.X.css
  content = content.replace(
    /(href|src)="([^"]*?)\.css\?ver=([^"]+)"/gi,
    (match, attr, path, ver) => {
      return `${attr}="${path}_ver%3D${ver}.css"`;
    }
  );
  
  // Fix JS file references: file.js?ver=X.X.X -> file_ver%3DX.X.X.js
  content = content.replace(
    /(href|src)="([^"]*?)\.js\?ver=([^"]+)"/gi,
    (match, attr, path, ver) => {
      return `${attr}="${path}_ver%3D${ver}.js"`;
    }
  );
  
  // Also fix any remaining ?ver= in other attributes
  content = content.replace(
    /(href|src)="([^"]*?)\?ver=([^"]+)"/gi,
    (match, attr, path, ver) => {
      // Determine file extension
      const extMatch = path.match(/\.(\w+)$/);
      if (extMatch) {
        const ext = extMatch[1];
        const basePath = path.substring(0, path.length - ext.length - 1);
        return `${attr}="${basePath}_ver%3D${ver}.${ext}"`;
      }
      return match;
    }
  );
  
  // Fix wp-emoji-release.min.js which might have a different pattern
  content = content.replace(
    /src="([^"]*?)wp-emoji-release\.min\.js\?ver=([^"]+)"/gi,
    (match, path, ver) => {
      // This file might not have been downloaded, remove the script
      return `src="${path}wp-emoji-release.min_ver%3D${ver}.js"`;
    }
  );
  
  if (content !== original) {
    await writeFile(filePath, content, 'utf-8');
    const changes = (original.length !== content.length) ? 'modified' : 'fixed URLs';
    console.log(`  ✅ Fixed: ${relative(BASE_DIR, filePath)}`);
  } else {
    console.log(`  ⏭️  No changes: ${relative(BASE_DIR, filePath)}`);
  }
}

async function main() {
  console.log('🔧 Fixing CSS/JS filename format (query strings -> encoded filenames)...\n');
  
  const htmlFiles = await getHtmlFiles(BASE_DIR);
  console.log(`Found ${htmlFiles.length} HTML files\n`);
  
  for (const file of htmlFiles) {
    await fixHtmlFile(file);
  }
  
  console.log('\n✅ All filename fixes applied!');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
