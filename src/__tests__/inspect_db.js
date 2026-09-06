const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/uvape');
  
  // Find all collections
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log('Collections in uvape database:', collections.map(c => c.name));
  
  // Check promotions
  const promotions = await db.collection('promotions').find({}).toArray();
  console.log('All promotions in database:', JSON.stringify(promotions, null, 2));

  // Check discounts
  const discounts = await db.collection('discounts').find({}).toArray();
  console.log('All discounts in database:', JSON.stringify(discounts, null, 2));
  
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
