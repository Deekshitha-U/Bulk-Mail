import mongoose from 'mongoose';
const adminSchema = new mongoose.Schema({
  name: { type: String, trim: true, default: '' },
  firstName: { type: String, trim: true, default: '' },
  lastName: { type: String, trim: true, default: '' },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  mobile: { type: String, default: '', trim: true },
  // Existing accounts default to verified/onboarded so nobody is locked out after an upgrade.
  verified: { type: Boolean, default: true },
  verifyToken: { type: String, default: '', index: true },
  verifyExpires: { type: Date },
  onboarded: { type: Boolean, default: true },
  plan: { type: String, enum: ['free', 'starter', 'business'], default: 'free' },
  prefs: { tips: { type: Boolean, default: true }, signature: { type: Boolean, default: false } }
}, { timestamps: true });
export default mongoose.model('Admin', adminSchema);
