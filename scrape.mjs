import scrape from 'website-scraper';

const options = {
  urls: ['https://www.corporacioninfanciaydesarrollo.org/'],
  directory: './output',
  recursive: true,
  maxRecursiveDepth: 5,
  filenameGenerator: 'bySiteStructure',
  urlFilter: function(url) {
    // Only download resources from the same domain or common CDNs
    if (url.includes('corporacioninfanciaydesarrollo.org')) return true;
    // Allow common CDN resources (fonts, CSS, JS)
    if (url.includes('googleapis.com')) return true;
    if (url.includes('gstatic.com')) return true;
    if (url.includes('wp.com')) return true;
    if (url.includes('gravatar.com')) return true;
    if (url.includes('fontawesome')) return true;
    if (url.includes('cdnjs.cloudflare.com')) return true;
    if (url.includes('stackpath.bootstrapcdn.com')) return true;
    if (url.includes('maxcdn.bootstrapcdn.com')) return true;
    // Block external links to other sites
    return false;
  },
  request: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  },
  sources: [
    { selector: 'img', attr: 'src' },
    { selector: 'img', attr: 'srcset' },
    { selector: 'link[rel="stylesheet"]', attr: 'href' },
    { selector: 'script', attr: 'src' },
    { selector: 'a', attr: 'href' },
    { selector: 'link[rel="icon"]', attr: 'href' },
    { selector: 'link[rel="shortcut icon"]', attr: 'href' },
    { selector: 'source', attr: 'src' },
    { selector: 'source', attr: 'srcset' },
    { selector: 'video', attr: 'src' },
    { selector: 'video', attr: 'poster' },
    { selector: 'link[rel="preload"]', attr: 'href' },
  ]
};

console.log('🚀 Starting to scrape https://www.corporacioninfanciaydesarrollo.org/');
console.log('This may take several minutes...\n');

try {
  const result = await scrape(options);
  console.log('\n✅ Scraping completed successfully!');
  console.log(`📁 Downloaded ${result.length} pages/resources`);
  console.log('📂 Output saved to: ./output');
} catch (err) {
  console.error('❌ Error during scraping:', err.message);
  if (err.message.includes('directory')) {
    console.log('\n💡 Tip: Delete the ./output folder and try again if it already exists.');
  }
}
