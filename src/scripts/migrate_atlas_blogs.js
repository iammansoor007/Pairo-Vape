const mongoose = require('mongoose');

const ATLAS_URI = "mongodb://ammansoor0077_db_user:ZYW27mQw7femXreQ@ac-aoukvtk-shard-00-00.qlku7y7.mongodb.net:27017,ac-aoukvtk-shard-00-01.qlku7y7.mongodb.net:27017,ac-aoukvtk-shard-00-02.qlku7y7.mongodb.net:27017/uvape?ssl=true&authSource=admin&retryWrites=true&w=majority";

async function migrate() {
  try {
    console.log('Connecting to Atlas...');
    await mongoose.connect(ATLAS_URI);
    console.log('Connected to Atlas!');

    const Blog = mongoose.models.Blog || mongoose.model('Blog', new mongoose.Schema({}, { strict: false }));

    // Force update all blogs to have DEFAULT_STORE if they don't have it
    const result = await Blog.updateMany(
      { tenantId: { $ne: 'DEFAULT_STORE' } }, 
      { $set: { tenantId: 'DEFAULT_STORE' } }
    );

    console.log(`Successfully updated ${result.modifiedCount} blogs in Atlas to DEFAULT_STORE`);
    
    // Also check for isDeleted consistency
    const result2 = await Blog.updateMany(
      { isDeleted: { $exists: false } },
      { $set: { isDeleted: false } }
    );
    console.log(`Set isDeleted: false on ${result2.modifiedCount} blogs`);

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
