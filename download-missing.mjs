import { readdir, readFile, writeFile, mkdir, stat } from 'fs/promises';
import { join, relative, dirname, basename } from 'path';
import https from 'https';
import http from 'http';
import { createWriteStream } from 'fs';

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

// Extract all image URLs from data-thumbnail, data-src, data-bg, data-lazy-src, srcset attributes
function extractMissingImageUrls(content) {
  const urls = new Set();
  
  // data-thumbnail="./wp-content/uploads/..."
  const thumbnailRegex = /data-thumbnail="([^"]+)"/gi;
  let match;
  while ((match = thumbnailRegex.exec(content)) !== null) {
    urls.add(match[1]);
  }
  
  // data-src="..." (lazy loaded images)
  const dataSrcRegex = /data-src="([^"]*wp-content[^"]+)"/gi;
  while ((match = dataSrcRegex.exec(content)) !== null) {
    urls.add(match[1]);
  }
  
  // data-bg="..." (background images)
  const dataBgRegex = /data-bg="([^"]+)"/gi;
  while ((match = dataBgRegex.exec(content)) !== null) {
    urls.add(match[1]);
  }
  
  // data-lazy-src="..."
  const dataLazySrcRegex = /data-lazy-src="([^"]+)"/gi;
  while ((match = dataLazySrcRegex.exec(content)) !== null) {
    urls.add(match[1]);
  }
  
  // data-thumb="..."
  const dataThumbRegex = /data-thumb="([^"]+)"/gi;
  while ((match = dataThumbRegex.exec(content)) !== null) {
    urls.add(match[1]);
  }
  
  // Also check for background-image URLs in inline styles that reference wp-content
  const bgImageRegex = /background-image:\s*url\(['"]?([^'")\s]*wp-content[^'")\s]*)['"]?\)/gi;
  while ((match = bgImageRegex.exec(content)) !== null) {
    urls.add(match[1]);
  }
  
  // Check data-settings for image URLs (Elementor stores config in JSON)
  const dataSettingsRegex = /data-settings="([^"]*)"/gi;
  while ((match = dataSettingsRegex.exec(content)) !== null) {
    const decoded = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    const imgUrlRegex = /wp-content\/uploads\/[^"\\]+/g;
    let imgMatch;
    while ((imgMatch = imgUrlRegex.exec(decoded)) !== null) {
      urls.add('./' + imgMatch[0]);
    }
  }
  
  // Check for Slider Revolution image references
  const revSliderRegex = /setREVStartSize|rev_slider_[^"]*|data-lazyload="([^"]+)"/gi;
  while ((match = revSliderRegex.exec(content)) !== null) {
    if (match[1]) urls.add(match[1]);
  }
  
  return urls;
}

// Download a file from URL to local path
function downloadFile(url, destPath) {
  return new Promise(async (resolve, reject) => {
    try {
      await mkdir(dirname(destPath), { recursive: true });
    } catch (e) {}
    
    // Check if file already exists
    try {
      await stat(destPath);
      console.log(`  ⏭️  Already exists: ${relative(BASE_DIR, destPath)}`);
      resolve(true);
      return;
    } catch (e) {
      // File doesn't exist, download it
    }
    
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        console.log(`  ❌ Failed (${response.statusCode}): ${url}`);
        resolve(false);
        return;
      }
      
      const file = createWriteStream(destPath);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`  ✅ Downloaded: ${relative(BASE_DIR, destPath)}`);
        resolve(true);
      });
      file.on('error', (err) => {
        reject(err);
      });
    }).on('error', (err) => {
      console.log(`  ❌ Error: ${url} - ${err.message}`);
      resolve(false);
    });
  });
}

// Convert a relative URL to absolute URL and local path
function resolveUrl(url, htmlFilePath) {
  let cleanUrl = url;
  
  // Remove leading ./
  if (cleanUrl.startsWith('./')) {
    cleanUrl = cleanUrl.substring(2);
  }
  
  // If it's already an absolute URL
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    if (cleanUrl.includes('corporacioninfanciaydesarrollo.org')) {
      const urlPath = new URL(cleanUrl).pathname;
      return {
        downloadUrl: cleanUrl,
        localPath: join(BASE_DIR, urlPath)
      };
    }
    return null; // External URL
  }
  
  // If it starts with wp-content, it's relative to site root
  if (cleanUrl.startsWith('wp-content/')) {
    return {
      downloadUrl: `${SITE_URL}/${cleanUrl}`,
      localPath: join(BASE_DIR, cleanUrl)
    };
  }
  
  // Relative to the HTML file's directory
  const htmlDir = dirname(htmlFilePath);
  const relToBase = relative(BASE_DIR, htmlDir);
  
  return {
    downloadUrl: `${SITE_URL}/${relToBase ? relToBase + '/' : ''}${cleanUrl}`.replace(/\\/g, '/'),
    localPath: join(htmlDir, cleanUrl)
  };
}

async function main() {
  console.log('🔍 Scanning for missing images in all HTML files...\n');
  
  const htmlFiles = await getHtmlFiles(BASE_DIR);
  const allMissingUrls = new Map(); // url -> { downloadUrl, localPath }
  
  for (const htmlFile of htmlFiles) {
    const content = await readFile(htmlFile, 'utf-8');
    const urls = extractMissingImageUrls(content);
    
    for (const url of urls) {
      const resolved = resolveUrl(url, htmlFile);
      if (resolved && !allMissingUrls.has(resolved.downloadUrl)) {
        allMissingUrls.set(resolved.downloadUrl, resolved);
      }
    }
  }
  
  console.log(`📦 Found ${allMissingUrls.size} potentially missing images\n`);
  
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const [url, { downloadUrl, localPath }] of allMissingUrls) {
    try {
      const result = await downloadFile(downloadUrl, localPath);
      if (result) {
        downloaded++;
      } else {
        failed++;
      }
    } catch (err) {
      console.log(`  ❌ Error downloading ${url}: ${err.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Results:`);
  console.log(`  ✅ Downloaded/Existing: ${downloaded}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log('\n✅ Missing images download completed!');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
