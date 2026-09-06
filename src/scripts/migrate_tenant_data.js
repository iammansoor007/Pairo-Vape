const mongoose = require('mongoose');

const MONGODB_URI = "mongodb://ammansoor0077_db_user:ZYW27mQw7femXreQ@ac-aoukvtk-shard-00-00.qlku7y7.mongodb.net:27017,ac-aoukvtk-shard-00-01.qlku7y7.mongodb.net:27017,ac-aoukvtk-shard-00-02.qlku7y7.mongodb.net:27017/uvape?ssl=true&authSource=admin&retryWrites=true&w=majority";

async function migrate() {
    console.log("🚀 Starting FINAL Data Migration...");
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ Connected to Atlas MongoDB");

        const collections = ['products', 'promotions', 'orders'];
        
        for (const collName of collections) {
            const collection = mongoose.connection.collection(collName);
            const docs = await collection.find({ tenantId: { $exists: false } }).toArray();
            console.log(`[${collName}] Found ${docs.length} legacy documents.`);

            let success = 0;
            for (const doc of docs) {
                try {
                    const update = { tenantId: 'DEFAULT_STORE' };
                    
                    // Handle unique index conflicts
                    if (collName === 'orders' && !doc.idempotencyKey) {
                        update.idempotencyKey = `LEGACY_${doc._id}_${Math.random().toString(36).substr(2, 5)}`;
                    }
                    if (collName === 'promotions' && !doc.code) {
                        // For automatic promotions with null code, assign a temporary unique code if needed
                        // or just rely on the fact that we'll fix the index later.
                        // Actually, if code is null, let's just make it a unique string for legacy ones.
                        update.code = `AUTO_LEGACY_${doc._id}`;
                    }

                    await collection.updateOne({ _id: doc._id }, { $set: update });
                    success++;
                } catch (e) {
                    console.error(`[${collName}] Error migrating ${doc._id}: ${e.message}`);
                }
            }
            console.log(`[${collName}] Successfully migrated ${success} documents.`);
        }

        console.log("✨ Migration Complete!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration Failed:", err);
        process.exit(1);
    }
}

migrate();
