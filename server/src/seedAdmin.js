import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Admin from './models/Admin.js';
const run = async () => {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env');
  await mongoose.connect(process.env.MONGODB_URI);
  const email = process.env.ADMIN_EMAIL.toLowerCase().trim();
  const password = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
  await Admin.findOneAndUpdate({ email }, {
    name: process.env.ADMIN_NAME || 'Administrator', email, password, verified: true, onboarded: true
  }, { upsert: true, new: true, setDefaultsOnInsert: true });
  console.log(`Admin ready: ${email}`);
  await mongoose.disconnect();
};
run().catch(error => { console.error(error); process.exit(1); });
