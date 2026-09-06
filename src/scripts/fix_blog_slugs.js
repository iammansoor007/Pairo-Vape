const mongoose = require('mongoose');

const ATLAS_URI = "mongodb://ammansoor0077_db_user:ZYW27mQw7femXreQ@ac-aoukvtk-shard-00-00.qlku7y7.mongodb.net:27017,ac-aoukvtk-shard-00-01.qlku7y7.mongodb.net:27017,ac-aoukvtk-shard-00-02.qlku7y7.mongodb.net:27017/uvape?ssl=true&authSource=admin&retryWrites=true&w=majority";

async function migrate() {
  try {
    console.log('Connecting to Atlas...');
    await mongoose.connect(ATLAS_URI);
    console.log('Connected to Atlas!');

    const Blog = mongoose.models.Blog || mongoose.model('Blog', new mongoose.Schema({}, { strict: false }));

    const blogs = await Blog.find({ $or: [{ slug: { $exists: false } }, { slug: "" }, { slug: null }] });
    console.log(`Found ${blogs.length} blogs without slugs`);

    for (const blog of blogs) {
      if (blog.title) {
        const slug = blog.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
        await Blog.updateOne({ _id: blog._id }, { $set: { slug } });
        console.log(`Generated slug for "${blog.title}": ${slug}`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
