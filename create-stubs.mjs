import { readdir, readFile, writeFile, stat } from 'fs/promises';
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
  console.log('🔧 Creating stub files for remaining bad _ver%3D files...\n');

  const allFiles = await getAllFiles(BASE_DIR);
  let fixed = 0;
  
  for (const file of allFiles) {
    if (file.includes('_ver%3D')) {
      const content = await readFile(file, 'utf-8');
      const stats = await stat(file);
      
      // Check if it's still an HTML error page (small file with HTML content)
      if (stats.size < 600 && (content.trim().startsWith('<!DOCTYPE') || content.trim().startsWith('<html') || content.trim().startsWith('<!doctype') || content.includes('<head>') || content.includes('<body>'))) {
        const ext = extname(file).toLowerCase();
        const shortPath = relative(BASE_DIR, file).replace(/\\/g, '/');
        
        if (ext === '.css') {
          // Write empty CSS with a comment
          await writeFile(file, '/* File not available on source server */\n', 'utf-8');
          console.log(`  ✅ Stubbed CSS: ${shortPath}`);
          fixed++;
        } else if (ext === '.js') {
          // Write empty JS with a comment
          await writeFile(file, '/* File not available on source server */\n', 'utf-8');
          console.log(`  ✅ Stubbed JS: ${shortPath}`);
          fixed++;
        }
      }
    }
  }

  console.log(`\n✅ Created ${fixed} stub files`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
