import express from 'express'; // Server restart triggered by env update
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import routes from './routes';

const app = express();

app.use(cors());
app.use(express.json());

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
