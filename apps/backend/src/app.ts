import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import routes from './routes';

const app = express();

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    const allowedOrigins = [
      'https://frontend-production-c25c.up.railway.app',
      'http://localhost:3000',
      'http://localhost:3001',
    ];

    if (process.env.FRONTEND_URL) {
      allowedOrigins.push(process.env.FRONTEND_URL);
      allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
    }

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-slug'],
  // Expose so cross-origin clients can read the download filename.
  exposedHeaders: ['Content-Disposition'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

// Normalize every JSON response so any object with `_id` also has a sibling
// `id`. The frontend uses `obj.id` everywhere; Mongoose .lean() returns plain
// objects without the toJSON transform, so without this they'd be missing.
function addIdField(value: any): any {
  if (Array.isArray(value)) return value.map(addIdField);
  if (!value || typeof value !== 'object') return value;

  const out: any = { ...value };
  if (out._id !== undefined && out.id === undefined) {
    out.id = out._id;
  }
  for (const key of Object.keys(out)) {
    out[key] = addIdField(out[key]);
  }
  return out;
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    // Run any Mongoose / class toJSON first so we walk a plain object tree,
    // not a Document whose fields live behind getters.
    const plain = body === undefined ? body : JSON.parse(JSON.stringify(body));
    return originalJson(addIdField(plain));
  };
  next();
});

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
