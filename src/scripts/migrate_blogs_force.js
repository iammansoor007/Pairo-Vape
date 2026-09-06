const mongoose = require('mongoose');

async function migrate() {
  try {
    await mongoose.connect('mongodb://localhost:27017/uvape');
    console.log('Connected to MongoDB');

    const Blog = mongoose.models.Blog || mongoose.model('Blog', new mongoose.Schema({}, { strict: false }));

    // Force update all blogs to have DEFAULT_STORE if they don't have a valid tenantId
    const result = await Blog.updateMany(
      { }, 
      { $set: { tenantId: 'DEFAULT_STORE' } }
    );

    console.log(`Successfully updated ${result.modifiedCount} blogs to DEFAULT_STORE`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
