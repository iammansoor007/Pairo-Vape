const fs = require('fs');
const path = require('path');

const OLD_NAME = ['p', 'a', 'i', 'r', 'o'].join('');

function replaceContent(content) {
  let updated = content;

  updated = updated.replace(new RegExp(OLD_NAME + 'lifestyle\\.com', 'gi'), 'uvapestore.com');
  updated = updated.replace(new RegExp(OLD_NAME + '\\.com', 'gi'), 'uvapestore.com');
  updated = updated.replace(new RegExp(OLD_NAME + '\\s+Lifestyle', 'g'), 'U Vape Store');
  updated = updated.replace(new RegExp(OLD_NAME + '\\s+lifestyle', 'gi'), 'U Vape Store');
  updated = updated.replace(new RegExp(OLD_NAME + '\\s+Store', 'g'), 'U Vape Store');
  updated = updated.replace(new RegExp(OLD_NAME + '\\s+store', 'gi'), 'U Vape Store');
  updated = updated.replace(new RegExp(OLD_NAME + '\\s+SERIES', 'g'), 'U VAPE SERIES');
  updated = updated.replace(new RegExp(OLD_NAME + '\\s+Series', 'g'), 'U Vape Series');
  updated = updated.replace(new RegExp(OLD_NAME + '\\s+series', 'gi'), 'U VAPE SERIES');
  updated = updated.replace(new RegExp(OLD_NAME + '\\s+Studio', 'g'), 'U Vape Store');
  updated = updated.replace(new RegExp('@' + OLD_NAME + 'store', 'gi'), '@uvapestore');
  updated = updated.replace(new RegExp(OLD_NAME + '_ref', 'gi'), 'uvape_ref');
  updated = updated.replace(new RegExp(OLD_NAME + '-media', 'gi'), 'uvape-media');
  updated = updated.replace(new RegExp(OLD_NAME + '-artwork', 'gi'), 'uvape-artwork');
  updated = updated.replace(new RegExp(OLD_NAME + '-kyc', 'gi'), 'uvape-kyc');
  updated = updated.replace(new RegExp(OLD_NAME + 'Events', 'g'), 'uvapeEvents');

  updated = updated.replace(new RegExp('\\b' + OLD_NAME.toUpperCase() + '\\b', 'g'), 'U VAPE');
  updated = updated.replace(new RegExp('\\b' + OLD_NAME[0].toUpperCase() + OLD_NAME.slice(1) + '\\b', 'g'), 'U Vape');
  updated = updated.replace(new RegExp('\\b' + OLD_NAME + '\\b', 'g'), 'uvape');

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
  console.log('--- PURGING ALL LEGACY BRAND REFERENCES FROM LOCAL FILES ---');
  cleanDirectory(path.join(__dirname, '../..'));
  console.log('--- FILE PURGE COMPLETE ---');
}

run();
