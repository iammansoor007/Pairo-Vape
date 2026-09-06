const fs = require('fs');
const path = require('path');

function replaceContent(content) {
  let updated = content;

  // Specific domain / store phrases first
  updated = updated.replace(/pairolifestyle\.com/gi, 'uvapestore.com');
  updated = updated.replace(/pairo\.com/gi, 'uvapestore.com');
  updated = updated.replace(/PAIRO\s+Lifestyle/g, 'U Vape Store');
  updated = updated.replace(/Pairo\s+Lifestyle/g, 'U Vape Store');
  updated = updated.replace(/pairo\s+lifestyle/gi, 'U Vape Store');
  updated = updated.replace(/PAIRO\s+Store/g, 'U Vape Store');
  updated = updated.replace(/Pairo\s+Store/g, 'U Vape Store');
  updated = updated.replace(/pairo\s+store/gi, 'U Vape Store');
  updated = updated.replace(/PAIRO\s+SERIES/g, 'U VAPE SERIES');
  updated = updated.replace(/Pairo\s+Series/g, 'U Vape Series');
  updated = updated.replace(/pairo\s+series/gi, 'U VAPE SERIES');
  updated = updated.replace(/PAIRO\s+Studio/g, 'U Vape Store');
  updated = updated.replace(/Pairo\s+Studio/g, 'U Vape Store');
  updated = updated.replace(/@pairostore/gi, '@uvapestore');
  updated = updated.replace(/pairo_ref/gi, 'uvape_ref');
  updated = updated.replace(/pairo-media/gi, 'uvape-media');
  updated = updated.replace(/pairo-artwork/gi, 'uvape-artwork');
  updated = updated.replace(/pairo-kyc/gi, 'uvape-kyc');
  updated = updated.replace(/pairoEvents/g, 'uvapeEvents');

  // Single word PAIRO / Pairo / pairo
  updated = updated.replace(/\bPAIRO\b/g, 'U VAPE');
  updated = updated.replace(/\bPairo\b/g, 'U Vape');
  updated = updated.replace(/\bpairo\b/g, 'uvape');

  // Related outerwear terms in text/SEO strings
  updated = updated.replace(/handcrafted shearling/gi, 'premium vape');
  updated = updated.replace(/shearling outerwear/gi, 'vape devices & e-liquids');
  updated = updated.replace(/shearling jackets, coats/gi, 'vape devices, disposables,');
  updated = updated.replace(/shearling jackets/gi, 'vape devices');
  updated = updated.replace(/shearling/gi, 'vape');
  updated = updated.replace(/bespoke leather jackets/gi, 'custom vape kits');

  return updated;
}

const ignoredDirs = ['node_modules', '.next', '.git', 'antigravity-ide'];
const validExts = ['.js', '.jsx', '.ts', '.tsx', '.json', '.css', '.md', '.html'];

function cleanDirectory(dirPath) {
  let fileCount = 0;
  let modifiedCount = 0;

  function walk(currentDir) {
    const items = fs.readdirSync(currentDir);
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!ignoredDirs.includes(item)) {
          walk(fullPath);
        }
      } else {
        const ext = path.extname(item).toLowerCase();
        if (validExts.includes(ext)) {
          if (item === 'purge-all-pairo.js') continue;
          fileCount++;
          try {
            const original = fs.readFileSync(fullPath, 'utf8');
            const cleaned = replaceContent(original);
            if (original !== cleaned) {
              fs.writeFileSync(fullPath, cleaned, 'utf8');
              console.log(`[Cleaned File] ${fullPath}`);
              modifiedCount++;
            }
          } catch (e) {
            console.error(`Error reading ${fullPath}:`, e.message);
          }
        }
      }
    }
  }

  walk(dirPath);
  console.log(`Finished processing ${dirPath}: ${modifiedCount}/${fileCount} files modified.`);
}

function run() {
  console.log('--- PURGING ALL PAIRO REFERENCES FROM LOCAL FILES ---');
  cleanDirectory(path.join(__dirname, '../..'));
  console.log('--- FILE PURGE COMPLETE ---');
}

run();
