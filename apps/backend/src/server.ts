import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import app from './app';
import { connectDB } from './config/db';
import { CronService } from './services/cron.service';

const PORT = process.env.PORT || 3001;

app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

connectDB()
  .then(() => {
    CronService.init();
    app.listen(PORT, () => {
      console.log(`🚀 SLX Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB:', err);
    process.exit(1);
  });
