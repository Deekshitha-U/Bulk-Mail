import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';
import Campaign from './models/Campaign.js';

const port = process.env.PORT || 5000;

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

async function startServer() {
  try {
    await connectDB();

    const stale = await Campaign.updateMany(
      { status: 'sending' },
      { $set: { status: 'partial' } }
    );

    if (stale.modifiedCount) {
      console.log(
        `Marked ${stale.modifiedCount} interrupted campaigns as partial.`
      );
    }

    const app = createApp();

    app.listen(port, '0.0.0.0', () => {
      console.log(`PulsePost API listening on port ${port}`);
    });
  } catch (error) {
    console.error('Startup failed:', error.message);

    if (mongoose.connection.readyState === 0) {
      console.error('Check your MONGODB_URI environment variable.');
    }

    process.exit(1);
  }
}

startServer();