import mongoose from "mongoose";

const ProcessStepSchema = new mongoose.Schema({
  id: { type: String, default: () => Math.random().toString(36).substring(2, 11) },
  image: { type: String, required: true },
  heading: { type: String, required: true },
  subheading: { type: String },
  description: { type: String },
  order: { type: Number, default: 0 }
});

const ProductProcessSchema = new mongoose.Schema({
  key: { type: String, default: "global", unique: true },
  title: { type: String, required: true, default: "Our Product Process" },
  subtitle: { type: String, default: "How we ensure premium vape quality & flavor" },
  steps: [ProcessStepSchema]
}, { timestamps: true });

delete mongoose.models.ProductProcess;
export default mongoose.models.ProductProcess || mongoose.model("ProductProcess", ProductProcessSchema);
