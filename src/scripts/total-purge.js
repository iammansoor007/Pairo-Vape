const fs = require('fs');
const path = require('path');

function replaceText(content) {
  let updated = content;
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
  updated = updated.replace(/support@pairolifestyle\.com/gi, 'support@uvapestore.com');
  updated = updated.replace(/authSource=pairo/gi, 'authSource=uvape');
  updated = updated.replace(/\/pairo\?/gi, '/uvape?');
  
  // Replace references to image filenames like Pairo-Mens-... with UVape-Mens-...
  updated = updated.replace(/Pairo-/g, 'UVape-');
  updated = updated.replace(/pairo-/g, 'uvape-');
  updated = updated.replace(/pairo\.webp/g, 'uvape.webp');
  updated = updated.replace(/pairofooter\.png/g, 'uvapefooter.png');

  // Standalone word replacements
  updated = updated.replace(/\bPAIRO\b/g, 'U VAPE');
  updated = updated.replace(/\bPairo\b/g, 'U Vape');
  updated = updated.replace(/\bpairo\b/g, 'uvape');

  return updated;
}

// 1. Rename files with pairo in their name
function renameFiles(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (item === 'node_modules' || item === '.next' || item === '.git') continue;
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      renameFiles(fullPath);
    } else {
      if (item.toLowerCase().includes('pairo')) {
        const newItem = item.replace(/pairo/gi, (match) => {
          if (match === 'PAIRO') return 'UVape';
          if (match === 'Pairo') return 'UVape';
          return 'uvape';
        });
        const newPath = path.join(dir, newItem);
        fs.renameSync(fullPath, newPath);
        console.log(`Renamed file: ${fullPath} -> ${newPath}`);
      }
    }
  }
}

// 2. Clean content in all text files
function cleanFileContent(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (item === 'node_modules' || item === '.next' || item === '.git' || item === 'total-purge.js') continue;
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      cleanFileContent(fullPath);
    } else {
      try {
        const original = fs.readFileSync(fullPath, 'utf8');
        if (/pairo/i.test(original)) {
          const cleaned = replaceText(original);
          if (original !== cleaned) {
            fs.writeFileSync(fullPath, cleaned, 'utf8');
            console.log(`Cleaned file content: ${fullPath}`);
          }
        }
      } catch (e) {
        // Skip unreadable files
      }
    }
  }
}

console.log('--- STARTING TOTAL REPOSITORY PURGE ---');
renameFiles('.');
cleanFileContent('.');
console.log('--- TOTAL PURGE COMPLETED ---');
