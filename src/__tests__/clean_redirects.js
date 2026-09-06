const mongoose = require('/var/www/uvapestore.com/node_modules/mongoose');

async function main() {
  const uri = 'mongodb://uvape_user:mD%26tEam%2FpLs-19yY@127.0.0.1:27017/uvape?authSource=uvape&replicaSet=rs0';
  
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const redirectsCollection = db.collection('redirects');

    const invalidRedirects = [
      "/product/uvape-womens-brown-hooded-vape-leather-jacket-b3-bomber",
      "/product/uvape-womens-black-vape-leather-jacket-b3-biker-style",
      "/product/uvape-womens-brown-vape-leather-jacket-b3-bomber",
      "/product/uvape-womens-black-fur-black-leather-vape-jacket-b3-bomber",
      "/product/uvape-womens-black-leather-white-fur-collar-vape-jacket-b3-bomber",
      "/product/uvape-womens-brown-belted-vape-leather-long-coat-b3-style",
      "/product/uvape-womens-warm-brown-belted-vape-leather-long-coat-b3-style",
      "/product/uvape-womens-black-white-vape-leather-long-coat-b3-style",
      "/product/uvape-womens-long-brown-vape-leather-long-coat-b3-style"
    ];

    console.log('\n--- CLEANING INVALID PRODUCT REDIRECTS ON VPS ---');
    
    const result = await redirectsCollection.deleteMany({
      oldPath: { $in: invalidRedirects }
    });

    console.log(`Successfully deleted ${result.deletedCount} invalid product redirects!`);
    console.log('--- CLEANUP COMPLETED ---');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
