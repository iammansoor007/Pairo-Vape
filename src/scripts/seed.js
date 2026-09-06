const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://ammansoor0077_db_user:ZYW27mQw7femXreQ@ac-aoukvtk-shard-00-00.qlku7y7.mongodb.net:27017,ac-aoukvtk-shard-00-01.qlku7y7.mongodb.net:27017,ac-aoukvtk-shard-00-02.qlku7y7.mongodb.net:27017/uvape?ssl=true&authSource=admin&retryWrites=true&w=majority";

const CategorySchema = new mongoose.Schema({ name: String, slug: String, description: String, image: String, isDeleted: { type: Boolean, default: false } });
const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);

const ProductSchema = new mongoose.Schema({
  name: String, slug: String, shortDescription: String, description: String,
  price: Number, compareAtPrice: Number, sku: String, stock: Number, manageStock: { type: Boolean, default: true },
  status: { type: String, default: 'Published' }, type: String, image: String, images: [String],
  variants: [{ name: String, values: [String] }], variantCombinations: [{ title: String, price: Number, stock: Number, sku: String }],
  narrative: { title: String, content: String }, categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  isDeleted: { type: Boolean, default: false }, rating: { type: Number, default: 5 }
});
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

async function seed() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    // Clear existing products to avoid duplicates
    console.log('Clearing old products...');
    await Product.deleteMany({});
    
    // Get Categories or create defaults
    let categories = await Category.find({});
    if (categories.length === 0) {
      categories = await Category.insertMany([
        { name: "Disposables", slug: "disposables", description: "Long-lasting disposable vapes" },
        { name: "E-Liquids", slug: "e-liquids", description: "Premium salt nics and freebase e-liquids" },
        { name: "Vape Kits", slug: "vape-kits", description: "Pod systems and sub-ohm kits" }
      ]);
    }

    const disposableId = categories.find(c => c.slug === 'disposables')?._id || categories[0]?._id;
    const eLiquidId = categories.find(c => c.slug === 'e-liquids')?._id || categories[1]?._id;
    const kitId = categories.find(c => c.slug === 'vape-kits')?._id || categories[2]?._id;

    console.log('Seeding Premium Vape Products...');
    
    const dummyProducts = [
      {
        name: "U Vape Pro 10,000 Puffs Disposable",
        slug: "u-vape-pro-10k",
        shortDescription: "Rechargeable mesh coil disposable vape with smart LED display.",
        description: "<p>The U Vape Pro offers up to 10,000 puffs of dense, vibrant flavor with dual mesh coils and Type-C charging.</p>",
        price: 24,
        compareAtPrice: 32,
        sku: "UV-DISP-01",
        stock: 50,
        type: "newArrival",
        image: "https://images.unsplash.com/photo-1539185441755-769473a23570?q=80&w=1000&auto=format&fit=crop",
        categories: [disposableId],
        variants: [{ name: "Nicotine", values: ["20mg", "50mg"] }, { name: "Flavor", values: ["Cool Mint", "Blue Razz Ice", "Watermelon"] }]
      },
      {
        name: "Tropical Mango Salt Nic E-Liquid 30ml",
        slug: "tropical-mango-salt-nic",
        shortDescription: "Ultra-smooth tropical mango salt nicotine e-liquid.",
        description: "<p>A lush blend of sweet mangos formulated with premium nicotine salts for instant satisfaction.</p>",
        price: 18,
        compareAtPrice: 22,
        sku: "UV-LIQ-02",
        stock: 40,
        type: "topSelling",
        image: "https://images.unsplash.com/photo-1527661591475-527312dd65f5?q=80&w=1000&auto=format&fit=crop",
        categories: [eLiquidId],
        variants: [{ name: "Strength", values: ["25mg", "50mg"] }]
      },
      {
        name: "U Vape Aegis Pod Kit",
        slug: "u-vape-aegis-pod-kit",
        shortDescription: "High-performance pod mod with 80W max output.",
        description: "<p>Built tough with zinc-alloy chassis, 2000mAh integrated battery, and leak-resistant pod design.</p>",
        price: 45,
        compareAtPrice: 55,
        sku: "UV-KIT-03",
        stock: 25,
        type: "newArrival",
        image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1000&auto=format&fit=crop",
        categories: [kitId],
        variants: [{ name: "Color", values: ["Gunmetal", "Space Black", "Navy"] }]
      }
    ];

    await Product.insertMany(dummyProducts);
    console.log('Successfully seeded U Vape products!');
    process.exit(0);
  } catch (err) {
    console.error('Seed Error:', err);
    process.exit(1);
  }
}

seed();
