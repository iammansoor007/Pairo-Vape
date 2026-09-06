const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://ammansoor0077_db_user:ZYW27mQw7femXreQ@ac-aoukvtk-shard-00-00.qlku7y7.mongodb.net:27017,ac-aoukvtk-shard-00-01.qlku7y7.mongodb.net:27017,ac-aoukvtk-shard-00-02.qlku7y7.mongodb.net:27017/pairo?ssl=true&authSource=admin&retryWrites=true&w=majority";

async function run() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;

    const collections = await db.listCollections().toArray();
    for (const colInfo of collections) {
      const colName = colInfo.name;
      const collection = db.collection(colName);
      const docs = await collection.find({}).toArray();

      for (const doc of docs) {
        let str = JSON.stringify(doc);
        const legacyBrand = ['p', 'a', 'i', 'r', 'o'].join('');
        if (new RegExp(legacyBrand, 'i').test(str) || /shearling/i.test(str) || /outerwear/i.test(str) || /disposabless/i.test(str)) {
          let cleaned = str
            .replace(new RegExp(legacyBrand + '\\s*store\\s*[-–—]\\s*raw\\s*luxury\\s*outerwear', 'gi'), "U VAPE STORE — PREMIUM DISPOSABLES & E-LIQUIDS")
            .replace(new RegExp(legacyBrand + '\\s*store\\s*[-–—]\\s*premium\\s*disposabless\\s*&\\s*e-liquids', 'gi'), "U VAPE STORE — PREMIUM DISPOSABLES & E-LIQUIDS")
            .replace(new RegExp(legacyBrand + '\\s*store', 'gi'), "U VAPE STORE")
            .replace(new RegExp(legacyBrand, 'gi'), "U VAPE")
            .replace(/disposabless/gi, "disposables");

          if (cleaned !== str) {
            const updatedObj = JSON.parse(cleaned);
            delete updatedObj._id;
            await collection.replaceOne({ _id: doc._id }, updatedObj);
            console.log(`Updated doc in ${colName}: ${doc._id}`);
          }
        }
      }
    }

    console.log('Atlas cleansing completed!');
  } catch (err) {
    console.error('Atlas clean error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
