import { readdir, readFile, stat } from 'fs/promises';
import { join, relative, extname } from 'path';

const BASE_DIR = './output/www.corporacioninfanciaydesarrollo.org';

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
  console.log('🔍 Verifying downloaded assets...\n');

  const allFiles = await getAllFiles(BASE_DIR);
  
  // Check for files that might be HTML error pages instead of actual CSS/JS
  let issues = 0;
  
  for (const file of allFiles) {
    const ext = extname(file).toLowerCase();
    if (ext === '.css' || ext === '.js') {
      const content = await readFile(file, 'utf-8');
      const fileStats = await stat(file);
      
      // Check if the file is actually an HTML error page
      if (content.trim().startsWith('<!DOCTYPE') || content.trim().startsWith('<html') || content.trim().startsWith('<!doctype')) {
        const shortPath = relative(BASE_DIR, file).replace(/\\/g, '/');
        console.log(`  ⚠️  HTML content in ${ext} file: ${shortPath} (${fileStats.size} bytes)`);
        issues++;
      }
      
      // Check for empty files
      if (fileStats.size === 0) {
        const shortPath = relative(BASE_DIR, file).replace(/\\/g, '/');
        console.log(`  ⚠️  Empty file: ${shortPath}`);
        issues++;
      }
    }
  }

  // Count files by type
  const counts = {};
  for (const file of allFiles) {
    const ext = extname(file).toLowerCase() || '(no ext)';
    counts[ext] = (counts[ext] || 0) + 1;
  }

  console.log('\n📊 File counts by type:');
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  for (const [ext, count] of sorted) {
    console.log(`   ${ext}: ${count}`);
  }

  console.log(`\n   Total files: ${allFiles.length}`);
  
  if (issues === 0) {
    console.log('\n✅ All CSS/JS files appear valid!');
  } else {
    console.log(`\n⚠️  Found ${issues} potential issues`);
  }

  // Also check _ver%3D files specifically
  const verFiles = allFiles.filter(f => f.includes('_ver%3D'));
  console.log(`\n📁 Files with _ver%3D encoding: ${verFiles.length}`);
  
  // Check if the serve static server can handle %3D in filenames
  // by checking a few files exist
  let verIssues = 0;
  for (const file of verFiles.slice(0, 5)) {
    const stats = await stat(file);
    if (stats.size === 0) {
      verIssues++;
      console.log(`  ⚠️  Empty ver file: ${relative(BASE_DIR, file)}`);
    }
  }
  
  if (verIssues === 0 && verFiles.length > 0) {
    console.log('   ✅ Sample _ver%3D files look good');
  }
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
