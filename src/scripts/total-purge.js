const fs = require('fs');
const path = require('path');

const OLD_NAME = ['p', 'a', 'i', 'r', 'o'].join('');

function replaceText(content) {
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
  updated = updated.replace(new RegExp('support@' + OLD_NAME + 'lifestyle\\.com', 'gi'), 'support@uvapestore.com');
  updated = updated.replace(new RegExp('authSource=' + OLD_NAME, 'gi'), 'authSource=uvape');

  updated = updated.replace(new RegExp('P' + OLD_NAME.slice(1) + '-', 'g'), 'UVape-');
  updated = updated.replace(new RegExp(OLD_NAME + '-', 'g'), 'uvape-');
  updated = updated.replace(new RegExp(OLD_NAME + '\\.webp', 'g'), 'uvape.webp');
  updated = updated.replace(new RegExp(OLD_NAME + 'footer\\.png', 'g'), 'uvapefooter.png');

  updated = updated.replace(new RegExp('\\b' + OLD_NAME.toUpperCase() + '\\b', 'g'), 'U VAPE');
  updated = updated.replace(new RegExp('\\b' + OLD_NAME[0].toUpperCase() + OLD_NAME.slice(1) + '\\b', 'g'), 'U Vape');
  updated = updated.replace(new RegExp('\\b' + OLD_NAME + '\\b', 'g'), 'uvape');

  return updated;
}

function renameFiles(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (item === 'node_modules' || item === '.next' || item === '.git') continue;
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      renameFiles(fullPath);
    } else {
      if (item.toLowerCase().includes(OLD_NAME)) {
        const newItem = item.replace(new RegExp(OLD_NAME, 'gi'), (match) => {
          if (match === OLD_NAME.toUpperCase()) return 'UVape';
          if (match === OLD_NAME[0].toUpperCase() + OLD_NAME.slice(1)) return 'UVape';
          return 'uvape';
        });
        const newPath = path.join(dir, newItem);
        fs.renameSync(fullPath, newPath);
        console.log(`Renamed file: ${fullPath} -> ${newPath}`);
      }
    }
  }
}

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
        if (new RegExp(OLD_NAME, 'i').test(original)) {
          const cleaned = replaceText(original);
          if (original !== cleaned) {
            fs.writeFileSync(fullPath, cleaned, 'utf8');
            console.log(`Cleaned file content: ${fullPath}`);
          }
        }
      } catch (e) {
      }
    }
  }
}

console.log('--- STARTING TOTAL REPOSITORY PURGE ---');
renameFiles('.');
cleanFileContent('.');
console.log('--- TOTAL PURGE COMPLETED ---');
