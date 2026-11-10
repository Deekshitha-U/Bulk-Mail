import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';
import Campaign from './models/Campaign.js';

const port = process.env.PORT || 5000;
process.on('unhandledRejection', reason => console.error('Unhandled rejection (server kept running):', reason));

connectDB()
  .then(async () => {
    // A restart kills any in-flight background send; mark those campaigns so they are not stuck on "sending".
    const stale = await Campaign.updateMany({ status: 'sending' }, { $set: { status: 'partial' } });
    if (stale.modifiedCount) console.log(`Marked ${stale.modifiedCount} interrupted campaign(s) as partial.`);
    createApp().listen(port, () => console.log(`PulsePost API listening on http://localhost:${port}`));
  })
  .catch(error => {
    console.error('Startup failed:', error.message);
    if (mongoose.connection.readyState === 0) console.error('Check MONGODB_URI in server/.env and that MongoDB is running.');
    process.exit(1);
  });
