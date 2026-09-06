const mongoose = require('mongoose');

async function migrate() {
  try {
    await mongoose.connect('mongodb://localhost:27017/uvape');
    console.log('Connected to MongoDB');

    // Define a flexible schema to update all documents
    const Blog = mongoose.models.Blog || mongoose.model('Blog', new mongoose.Schema({}, { strict: false }));

    const result = await Blog.updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: 'DEFAULT_STORE' } }
    );

    console.log(`Successfully migrated ${result.modifiedCount} blogs to DEFAULT_STORE`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
