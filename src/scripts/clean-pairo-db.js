const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://ammansoor0077_db_user:ZYW27mQw7femXreQ@ac-aoukvtk-shard-00-00.qlku7y7.mongodb.net:27017,ac-aoukvtk-shard-00-01.qlku7y7.mongodb.net:27017,ac-aoukvtk-shard-00-02.qlku7y7.mongodb.net:27017/pairo?ssl=true&authSource=admin&retryWrites=true&w=majority";

async function run() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully.');

    const db = mongoose.connection.db;

    // 1. Update SiteConfig
    console.log('Updating SiteConfig collection...');
    const siteConfigColl = db.collection('siteconfigs');
    const configs = await siteConfigColl.find({}).toArray();
    for (const cfg of configs) {
      let str = JSON.stringify(cfg);
      if (/pairo/i.test(str) || /shearling/i.test(str) || /jacket/i.test(str)) {
        str = str
          .replace(/pairo\s*series/gi, "U VAPE SERIES")
          .replace(/pairo\s*store/gi, "U VAPE STORE")
          .replace(/pairo\s*studio/gi, "U VAPE STORE")
          .replace(/pairo/gi, "U VAPE")
          .replace(/raw luxury outerwear/gi, "PREMIUM VAPES & E-LIQUIDS")
          .replace(/shearling/gi, "DISPOSABLE")
          .replace(/jacket/gi, "VAPE");
        const updatedObj = JSON.parse(str);
        delete updatedObj._id;
        await siteConfigColl.replaceOne({ _id: cfg._id }, updatedObj);
        console.log(`Updated SiteConfig: ${cfg._id}`);
      }
    }

    // 2. Update Pages collection
    console.log('Updating Pages collection...');
    const pagesColl = db.collection('pages');
    const pages = await pagesColl.find({}).toArray();
    for (const page of pages) {
      let str = JSON.stringify(page);
      if (/pairo/i.test(str) || /shearling/i.test(str) || /jacket/i.test(str)) {
        str = str
          .replace(/pairo\s*series/gi, "U VAPE SERIES")
          .replace(/pairo\s*store/gi, "U VAPE STORE")
          .replace(/pairo\s*studio/gi, "U VAPE STORE")
          .replace(/pairo/gi, "U VAPE")
          .replace(/raw luxury outerwear/gi, "PREMIUM VAPES & E-LIQUIDS")
          .replace(/shearling/gi, "DISPOSABLE")
          .replace(/jacket/gi, "VAPE");
        const updatedObj = JSON.parse(str);
        delete updatedObj._id;
        await pagesColl.replaceOne({ _id: page._id }, updatedObj);
        console.log(`Updated Page: ${page.title || page.slug || page._id}`);
      }
    }

    console.log('Database migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
