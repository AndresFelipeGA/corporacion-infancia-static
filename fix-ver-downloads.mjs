import { readdir, readFile, writeFile, mkdir, stat } from 'fs/promises';
import { join, relative, dirname, extname } from 'path';
import { execSync } from 'child_process';

const BASE_DIR = './output/www.corporacioninfanciaydesarrollo.org';
const SITE_URL = 'https://www.corporacioninfanciaydesarrollo.org';

// Recursively get all files
async function getAllFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  console.log('🔧 Re-downloading _ver%3D files with correct URLs...\n');

  const allFiles = await getAllFiles(BASE_DIR);
  
  // Find all files with _ver%3D that are HTML error pages (355 bytes)
  const badFiles = [];
  for (const file of allFiles) {
    if (file.includes('_ver%3D')) {
      const content = await readFile(file, 'utf-8');
      if (content.trim().startsWith('<!DOCTYPE') || content.trim().startsWith('<html') || content.trim().startsWith('<!doctype') || content.length < 500) {
        badFiles.push(file);
      }
    }
  }

  console.log(`Found ${badFiles.length} bad _ver%3D files to re-download\n`);

  let downloaded = 0;
  let failed = 0;

  for (const localPath of badFiles) {
    const shortPath = relative(BASE_DIR, localPath).replace(/\\/g, '/');
    
    // Parse the filename to extract the base path, version, and extension
    // Pattern: something_ver%3Dversion.ext
    // Examples:
    //   frontend.min_ver%3D4.2.3.css -> frontend.min.css?ver=4.2.3
    //   main_ver%3D4.43.css -> main.css?ver=4.43
    //   jquery.min_ver%3D3.7.1.js -> jquery.min.js?ver=3.7.1
    //   rs6_ver%3D6.6.16.css -> rs6.css?ver=6.6.16
    
    // Split on _ver%3D
    const verIdx = shortPath.indexOf('_ver%3D');
    if (verIdx === -1) {
      console.log(`  ⚠️  No _ver%3D found: ${shortPath}`);
      failed++;
      continue;
    }
    
    const basePart = shortPath.substring(0, verIdx); // e.g., "wp-content/.../frontend.min"
    const afterVer = shortPath.substring(verIdx + '_ver%3D'.length); // e.g., "4.2.3.css"
    
    // The extension is the last .xxx part
    const lastDotIdx = afterVer.lastIndexOf('.');
    if (lastDotIdx === -1) {
      console.log(`  ⚠️  No extension found: ${shortPath}`);
      failed++;
      continue;
    }
    
    const version = afterVer.substring(0, lastDotIdx); // e.g., "4.2.3"
    const ext = afterVer.substring(lastDotIdx); // e.g., ".css"
    
    // Build the correct remote URL: basePart + ext + ?ver= + version
    const remoteUrl = `${SITE_URL}/${basePart}${ext}?ver=${version}`;
    
    console.log(`  📥 ${shortPath}`);
    console.log(`     URL: ${remoteUrl}`);

    try {
      const safePath = localPath.replace(/\//g, '\\');
      
      execSync(`curl -sL -o "${safePath}" "${remoteUrl}"`, {
        timeout: 30000,
        stdio: 'pipe'
      });

      // Verify the download
      const newContent = await readFile(localPath, 'utf-8');
      const stats = await stat(localPath);
      
      if (stats.size > 500 && !newContent.trim().startsWith('<!DOCTYPE') && !newContent.trim().startsWith('<html') && !newContent.trim().startsWith('<!doctype')) {
        console.log(`     ✅ Success (${stats.size} bytes)`);
        downloaded++;
      } else {
        // Try without ?ver= parameter
        const altUrl = `${SITE_URL}/${basePart}${ext}`;
        console.log(`     ⚠️  Still error (${stats.size}b), trying without version: ${altUrl}`);
        
        execSync(`curl -sL -o "${safePath}" "${altUrl}"`, {
          timeout: 30000,
          stdio: 'pipe'
        });
        
        const altContent = await readFile(localPath, 'utf-8');
        const altStats = await stat(localPath);
        
        if (altStats.size > 500 && !altContent.trim().startsWith('<!DOCTYPE') && !altContent.trim().startsWith('<html') && !altContent.trim().startsWith('<!doctype')) {
          console.log(`     ✅ Success without version (${altStats.size} bytes)`);
          downloaded++;
        } else {
          console.log(`     ❌ Failed (${altStats.size} bytes)`);
          failed++;
        }
      }
    } catch (err) {
      console.log(`     ❌ Error: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`   Downloaded: ${downloaded}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total: ${badFiles.length}`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
