import mongoose from 'mongoose';
const recipientSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  name: { type: String, default: '' },
  mobile: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'sent', 'failed'], required: true },
  messageId: String,
  error: String,
  sentAt: Date
}, { _id: false });
const campaignSchema = new mongoose.Schema({
  subject: { type: String, required: true, trim: true },
  body: { type: String, required: true },
  recipients: [recipientSchema],
  totalRecipients: { type: Number, default: 0 },
  sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  status: { type: String, enum: ['sending', 'sent', 'partial', 'failed'], default: 'sending' },
  finishedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });
export default mongoose.model('Campaign', campaignSchema);
