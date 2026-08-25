import { readdir, readFile, writeFile, mkdir, access, stat } from 'fs/promises';
import { join, relative, dirname, basename } from 'path';
import { execSync } from 'child_process';

const BASE_DIR = './output/www.corporacioninfanciaydesarrollo.org';
const SITE_URL = 'https://www.corporacioninfanciaydesarrollo.org';

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

// Check if a file exists
async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Extract all CSS/JS references from HTML files
async function findMissingAssets() {
  const htmlFiles = await getHtmlFiles(BASE_DIR);
  console.log(`Scanning ${htmlFiles.length} HTML files for asset references...\n`);

  const allRefs = new Set();
  const missingFiles = new Map(); // localPath -> remoteURL

  for (const htmlFile of htmlFiles) {
    const content = await readFile(htmlFile, 'utf-8');
    const htmlDir = dirname(htmlFile);

    // Find all href/src references to CSS and JS files
    const patterns = [
      /(?:href|src)="([^"]*?\.(?:css|js)(?:\?[^"]*)?)"/gi,
      /(?:href|src)='([^']*?\.(?:css|js)(?:\?[^']*)?)'/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        let ref = match[1];
        
        // Skip external CDN, data URIs, etc.
        if (ref.startsWith('data:') || ref.startsWith('//') || ref.startsWith('http://') || ref.startsWith('https://')) {
          // For absolute URLs to the same site, convert to local path
          if (ref.startsWith(SITE_URL)) {
            ref = ref.replace(SITE_URL, '');
          } else {
            continue;
          }
        }

        // Resolve relative path to absolute local path
        let localPath;
        if (ref.startsWith('/')) {
          localPath = join(BASE_DIR, ref);
        } else {
          localPath = join(htmlDir, ref);
        }

        // Normalize the path (remove .. etc)
        localPath = localPath.replace(/\\/g, '/');
        
        // The file might have _ver%3D encoding
        // Check both the direct path and the encoded version
        const exists = await fileExists(localPath);
        
        if (!exists) {
          // Determine the remote URL
          let remotePath = ref;
          if (!remotePath.startsWith('/')) {
            // Make it relative to the base
            remotePath = '/' + relative(BASE_DIR, join(htmlDir, ref)).replace(/\\/g, '/');
          }
          
          // Convert _ver%3D back to ?ver= for the remote URL
          let remoteUrl = remotePath.replace(/_ver%3D([^.]+)\.(css|js)/g, '.$2?ver=$1');
          
          if (!remoteUrl.startsWith('http')) {
            remoteUrl = SITE_URL + remoteUrl;
          }

          missingFiles.set(localPath, remoteUrl);
        }
      }
    }
  }

  return missingFiles;
}

async function downloadFile(url, localPath) {
  try {
    // Create directory if needed
    const dir = dirname(localPath);
    await mkdir(dir, { recursive: true });

    // Use curl to download - escape the URL properly for Windows cmd
    const safeUrl = url.replace(/&/g, '^&');
    const safePath = localPath.replace(/\//g, '\\');
    
    execSync(`curl -sL -o "${safePath}" "${safeUrl}"`, {
      timeout: 30000,
      stdio: 'pipe'
    });

    // Check if file was actually downloaded (not empty or error page)
    try {
      const stats = await stat(localPath);
      if (stats.size > 0) {
        return true;
      } else {
        return false;
      }
    } catch {
      return false;
    }
  } catch (err) {
    return false;
  }
}

async function main() {
  console.log('🔍 Scanning for missing CSS/JS assets...\n');

  const missingFiles = await findMissingAssets();

  console.log(`Found ${missingFiles.size} missing asset references\n`);

  if (missingFiles.size === 0) {
    console.log('✅ No missing assets found!');
    return;
  }

  // Show what we found
  let downloaded = 0;
  let failed = 0;
  let skipped = 0;

  for (const [localPath, remoteUrl] of missingFiles) {
    // Skip duplicates and already-tried files
    const shortPath = relative(BASE_DIR, localPath).replace(/\\/g, '/');
    
    console.log(`  📥 Downloading: ${shortPath}`);
    console.log(`     From: ${remoteUrl}`);

    const success = await downloadFile(remoteUrl, localPath);
    if (success) {
      console.log(`     ✅ Success`);
      downloaded++;
    } else {
      console.log(`     ❌ Failed`);
      failed++;
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`   Downloaded: ${downloaded}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total: ${missingFiles.size}`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
