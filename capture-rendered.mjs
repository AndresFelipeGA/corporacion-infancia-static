import puppeteer from 'puppeteer-core';
import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, relative, dirname } from 'path';

const BASE_DIR = './output/www.corporacioninfanciaydesarrollo.org';
const SITE_URL = 'https://www.corporacioninfanciaydesarrollo.org';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// Pages to capture with rendered HTML
const PAGES = [
  { url: '/', file: 'index.html' },
  { url: '/nosotros/', file: 'nosotros/index.html' },
  { url: '/educacion-2/', file: 'educacion-2/index.html' },
  { url: '/proteccion/', file: 'proteccion/index.html' },
  { url: '/galeria/', file: 'galeria/index.html' },
  { url: '/contactenos/', file: 'contactenos/index.html' },
  { url: '/donaciones/', file: 'donaciones/index.html' },
  { url: '/que-sucede/', file: 'que-sucede/index.html' },
  { url: '/nuestros-aliados/', file: 'nuestros-aliados/index.html' },
  { url: '/trabaje-con-nosotros/', file: 'trabaje-con-nosotros/index.html' },
  { url: '/gestion-de-conocimiento/', file: 'gestion-de-conocimiento/index.html' },
  { url: '/politica-peas/', file: 'politica-peas/index.html' },
  { url: '/politicas-de-privacidad/', file: 'politicas-de-privacidad/index.html' },
];

async function captureRenderedPage(browser, pageUrl, outputFile) {
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  const fullUrl = `${SITE_URL}${pageUrl}`;
  console.log(`  📄 Loading: ${fullUrl}`);
  
  try {
    await page.goto(fullUrl, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // Wait extra time for Slider Revolution and other dynamic content
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));
    
    // Scroll down to trigger lazy loading
    await page.evaluate(async () => {
      const scrollStep = 500;
      const scrollDelay = 300;
      const maxScroll = document.body.scrollHeight;
      
      for (let i = 0; i < maxScroll; i += scrollStep) {
        window.scrollTo(0, i);
        await new Promise(resolve => setTimeout(resolve, scrollDelay));
      }
      // Scroll back to top
      window.scrollTo(0, 0);
      await new Promise(resolve => setTimeout(resolve, 1000));
    });
    
    // Get the fully rendered HTML
    const renderedHtml = await page.content();
    
    const outputPath = join(BASE_DIR, outputFile);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, renderedHtml, 'utf-8');
    
    console.log(`  ✅ Captured: ${outputFile} (${(renderedHtml.length / 1024).toFixed(1)} KB)`);
  } catch (err) {
    console.log(`  ❌ Error capturing ${pageUrl}: ${err.message}`);
  }
  
  await page.close();
}

async function main() {
  console.log('🌐 Launching Chrome to capture rendered pages...\n');
  
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  console.log('✅ Chrome launched successfully\n');
  
  for (const { url, file } of PAGES) {
    await captureRenderedPage(browser, url, file);
  }
  
  await browser.close();
  
  console.log('\n✅ All pages captured with rendered content!');
  console.log('📝 Now running cleanup to fix URLs...');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
