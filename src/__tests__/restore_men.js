const mongoose = require('/var/www/uvapestore.com/node_modules/mongoose');

async function main() {
  const uri = 'mongodb://uvape_user:mD%26tEam%2FpLs-19yY@127.0.0.1:27017/uvape?authSource=uvape&replicaSet=rs0';
  
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const categoriesCollection = db.collection('categories');

    console.log('\n--- RESTORING SOFT-DELETED "MEN" CATEGORY ON VPS ---');
    
    const result = await categoriesCollection.updateOne(
      { _id: new mongoose.Types.ObjectId("6a1ec0555915f768a26f1b68") },
      { $set: { isDeleted: false } }
    );

    if (result.modifiedCount > 0) {
      console.log('Successfully restored "Men" category! It is now active and visible in your Admin Dashboard.');
    } else {
      console.log('Category was not modified. (It might already be restored).');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
