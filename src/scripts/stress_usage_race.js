const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const MONGODB_URI = "mongodb://ammansoor0077_db_user:ZYW27mQw7femXreQ@ac-aoukvtk-shard-00-00.qlku7y7.mongodb.net:27017,ac-aoukvtk-shard-00-01.qlku7y7.mongodb.net:27017,ac-aoukvtk-shard-00-02.qlku7y7.mongodb.net:27017/uvape?ssl=true&authSource=admin&retryWrites=true&w=majority";

async function simulateRace() {
    console.log("--- TESTING USAGE LIMIT RACE CONDITION ---");
    await mongoose.connect(MONGODB_URI);

    const Promotion = mongoose.models.Promotion || mongoose.model('Promotion', new mongoose.Schema({}, { strict: false }));

    // 1. Setup a promo with 1 usage left
    const promo = await Promotion.create({ 
        title: "Race Test", 
        usageLimits: { currentTotalUses: 0, maxTotalUses: 1 },
        adminStatus: "Active"
    });
    console.log("Created Promo:", promo._id, "Limit: 1");

    // 2. Simulate 10 concurrent requests
    // In current implementation, they check then update separately
    // But even if they use $inc (like our code does), without a filter it will over-increment
    console.log("Simulating 10 concurrent increments...");
    const increments = Array(10).fill(0).map(() => 
        Promotion.updateOne({ _id: promo._id }, { $inc: { 'usageLimits.currentTotalUses': 1 } })
    );

    await Promise.all(increments);

    // 3. Check final count
    const finalPromo = await Promotion.findById(promo._id);
    console.log("Final Usage Count:", finalPromo.usageLimits.currentTotalUses);
    
    if (finalPromo.usageLimits.currentTotalUses > 1) {
        console.log("❌ RACE CONDITION PROVEN: Usage exceeded limit!");
    }

    // Cleanup
    await Promotion.deleteOne({ _id: promo._id });
    await mongoose.connection.close();
}

simulateRace();
