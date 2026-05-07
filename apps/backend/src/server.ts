import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import app from './app';
import { CronService } from './services/cron.service';
import routes from './routes';

const PORT = process.env.PORT || 3001;

CronService.init();

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

app.listen(PORT, () => {
  console.log(`🚀 SLX Backend running on http://localhost:${PORT}`);
});
