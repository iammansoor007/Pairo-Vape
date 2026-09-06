const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

// CONFIGURATION
const LOCAL_URI = "mongodb://localhost:27017/pairo_ecommerce";
const ATLAS_URI = "mongodb://ammansoor0077_db_user:ZYW27mQw7femXreQ@ac-aoukvtk-shard-00-00.qlku7y7.mongodb.net:27017,ac-aoukvtk-shard-00-01.qlku7y7.mongodb.net:27017,ac-aoukvtk-shard-00-02.qlku7y7.mongodb.net:27017/uvape?ssl=true&authSource=admin&retryWrites=true&w=majority";

async function migrate() {
  let localConn, atlasConn;

  try {
    console.log('🚀 Starting Full Migration...');

    // 1. Connect to Local
    console.log('📡 Connecting to Local MongoDB...');
    localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
    console.log('✅ Connected to Local.');

    // 2. Connect to Atlas
    console.log('☁️ Connecting to MongoDB Atlas...');
    atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
    console.log('✅ Connected to Atlas.');

    // 3. Get all collections from Local
    const collections = await localConn.db.listCollections().toArray();
    console.log(`📦 Found ${collections.length} collections to migrate.`);

    for (const colDef of collections) {
      const colName = colDef.name;
      if (colName.startsWith('system.')) continue; // Skip system collections

      console.log(`  ➡️ Migrating: ${colName}...`);

      // Get data from local
      const data = await localConn.db.collection(colName).find({}).toArray();
      
      if (data.length > 0) {
        // Clear Atlas collection first (optional, but ensures a clean copy)
        await atlasConn.db.collection(colName).deleteMany({});
        
        // Insert into Atlas
        await atlasConn.db.collection(colName).insertMany(data);
        console.log(`    ✅ Success: ${data.length} documents moved.`);
      } else {
        console.log(`    ℹ️ Skipping: Collection is empty.`);
      }
    }

    console.log('\n✨ ALL DATA MIGRATED SUCCESSFULLY!');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Migration Failed:', err);
    process.exit(1);
  } finally {
    if (localConn) await localConn.close();
    if (atlasConn) await atlasConn.close();
  }
}

migrate();
