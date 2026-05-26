import mongoose from 'mongoose';

const MONGO_URI = process.env.DATABASE_URL || process.env.MONGO_URL || '';

if (!MONGO_URI) {
  console.error('❌ DATABASE_URL (or MONGO_URL) is not set');
}

mongoose.set('strictQuery', true);

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  await mongoose.connect(MONGO_URI);
  console.log(`🍃 MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  return mongoose.connection;
}

export default mongoose;
