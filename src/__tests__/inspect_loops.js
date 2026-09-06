const mongoose = require('/var/www/uvapestore.com/node_modules/mongoose');

async function main() {
  const uri = 'mongodb://pairolifestyle_user:mD%26tEam%2FpLs-19yY@127.0.0.1:27017/uvape?authSource=uvape&replicaSet=rs0';
  
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    const products = await db.collection('products').find({ isDeleted: { $ne: true } }).toArray();
    const redirects = await db.collection('redirects').find({}).toArray();

    console.log('\n--- SCANNING FOR PRODUCT REDIRECT LOOPS AND MISMATCHES ---');
    console.log(`Found ${products.length} products and ${redirects.length} redirects.`);

    let issuesFound = 0;

    for (let product of products) {
      const slug = product.slug;
      if (!slug) continue;

      const productPath = `/product/${slug}`;

      // Check if there is a redirect originating from the product's active slug
      const matchingRedirect = redirects.find(r => r.oldPath === productPath);

      if (matchingRedirect) {
        console.log(`\n[ISSUE] Product "${product.name}" (ID: ${product._id}) has slug "${slug}"`);
        console.log(`  - BUT a redirect exists: "${matchingRedirect.oldPath}" -> "${matchingRedirect.newPath}"`);
        
        // Check if this redirect destination points to another product page
        if (matchingRedirect.newPath.startsWith('/product/')) {
          const destSlug = matchingRedirect.newPath.replace('/product/', '').split('?')[0];
          console.log(`  - Destination slug is: "${destSlug}"`);
          
          // Check if there is another product with this destination slug
          const destProduct = products.find(p => p.slug === destSlug);
          if (destProduct) {
            console.log(`  - Found another product with destination slug! Name: "${destProduct.name}" (ID: ${destProduct._id})`);
          } else {
            console.log(`  - WARNING: No product exists in the DB with slug "${destSlug}"! This will lead to a 404.`);
          }
        }
        issuesFound++;
      }
    }

    // Also scan redirects collection for loops containing "/product/"
    console.log('\n--- SCANNING FOR REDIRECT LOOPS IN REDIRECTS TABLE ---');
    redirects.forEach(r => {
      if (r.oldPath.startsWith('/product/')) {
        let current = r;
        const visited = new Set([current.oldPath]);
        let loop = false;
        
        for (let i = 0; i < 10; i++) {
          const next = redirects.find(x => x.oldPath === current.newPath.split('?')[0]);
          if (!next) break;
          if (visited.has(next.oldPath)) {
            loop = true;
            break;
          }
          visited.add(next.oldPath);
          current = next;
        }

        if (loop) {
          console.log(`[LOOP DETECTED] Redirect chain loops: ${Array.from(visited).join(' -> ')} -> ${current.newPath}`);
          issuesFound++;
        }
      }
    });

    console.log(`\nScan completed. Total issues/mismatches found: ${issuesFound}`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
