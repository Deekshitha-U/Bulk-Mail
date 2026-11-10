import mongoose from 'mongoose';
const contactRef = new mongoose.Schema({
  email: String, name: { type: String, default: '' }, mobile: { type: String, default: '' }
}, { _id: false });
const draftSchema = new mongoose.Schema({
  subject: { type: String, default: '' },
  body: { type: String, default: '' },
  recipients: [{ type: String, lowercase: true, trim: true }], // kept for drafts saved by older versions
  contacts: [contactRef],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });
export default mongoose.model('Draft', draftSchema);
