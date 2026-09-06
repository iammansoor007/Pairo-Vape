const mongoose = require('/var/www/uvapestore.com/node_modules/mongoose');

async function run() {
  const uri = "mongodb://uvapestore_user:mD%26tEam%2FpLs-19yY@127.0.0.1:27017/uvape?authSource=uvape&replicaSet=rs0";
  await mongoose.connect(uri);
  const home = await mongoose.connection.db.collection('pages').findOne({ slug: 'home', tenantId: 'DEFAULT_STORE' });
  console.log("HOMEPAGE HERO SLIDER CONFIG:");
  if (home && home.sections) {
    home.sections.forEach(s => {
      if (s.type === 'hero_slider') {
        console.log(JSON.stringify(s.config, null, 2));
      }
      if (s.type === 'banner_feature') {
        console.log("HOMEPAGE FEATURED BANNER CONFIG:");
        console.log(JSON.stringify(s.config, null, 2));
      }
    });
  }
  await mongoose.disconnect();
}
run().catch(console.error);
