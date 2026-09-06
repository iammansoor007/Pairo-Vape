/**
 * seed-from-export.js
 * Imports all collections from db-export.json into the target MongoDB cluster.
 * Safe to re-run — uses upsert on _id so existing docs are updated, not duplicated.
 *
 * Usage:
 *   node src/scripts/seed-from-export.js
 */

const { MongoClient, ObjectId } = require("mongodb");
const fs = require("fs");
const path = require("path");

const MONGO_URI =
  "mongodb+srv://ammansoor0077_db_user:j6IwD1LfEd0k5Zaj@cluster0.a5ey9cl.mongodb.net/?appName=Cluster0";
const DB_NAME = "uvape"; // change if your DB name differs

const EXPORT_PATH = path.join(__dirname, "../../db-export.json");

function toObjectId(val) {
  try {
    return new ObjectId(val);
  } catch {
    return val;
  }
}

/** Recursively convert any 24-char hex string "_id" values to ObjectId */
function fixIds(doc) {
  if (Array.isArray(doc)) return doc.map(fixIds);
  if (doc && typeof doc === "object") {
    const out = {};
    for (const [k, v] of Object.entries(doc)) {
      if (k === "_id" && typeof v === "string" && /^[a-f0-9]{24}$/i.test(v)) {
        out[k] = toObjectId(v);
      } else {
        out[k] = fixIds(v);
      }
    }
    return out;
  }
  return doc;
}

async function main() {
  console.log("📦 Reading db-export.json …");
  const raw = fs.readFileSync(EXPORT_PATH, "utf8");
  const exportData = JSON.parse(raw);
  const collections = Object.keys(exportData);
  console.log(`   Found ${collections.length} collections.\n`);

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  console.log("✅ Connected to MongoDB Atlas\n");

  const db = client.db(DB_NAME);

  for (const collectionName of collections) {
    const docs = exportData[collectionName];
    if (!Array.isArray(docs) || docs.length === 0) {
      console.log(`⏭  ${collectionName}: empty — skipped`);
      continue;
    }

    const col = db.collection(collectionName);
    const fixed = docs.map(fixIds);

    const ops = fixed.map((doc) => ({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: doc },
        upsert: true,
      },
    }));

    try {
      const result = await col.bulkWrite(ops, { ordered: false });
      console.log(
        `✅ ${collectionName}: ${result.upsertedCount} inserted, ${result.modifiedCount} updated  (${docs.length} total)`
      );
    } catch (err) {
      console.error(`❌ ${collectionName}: ${err.message}`);
    }
  }

  await client.close();
  console.log("\n🎉 Seeding complete!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
