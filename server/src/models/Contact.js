import mongoose from 'mongoose';
const contactSchema = new mongoose.Schema({
  name: { type: String, default: '', trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  mobile: { type: String, default: '', trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });
contactSchema.index({ createdBy: 1, email: 1 }, { unique: true });
export default mongoose.model('Contact', contactSchema);
