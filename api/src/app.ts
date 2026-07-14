import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import cors from 'cors';
import { createDb, resetDb } from './db';
import { transactionsRouter } from './routes/transactions';

export interface AppBundle {
  app: Express;
  reset: () => void;
  close: () => void;
}

/**
 * Build the Express app + companion helpers. The companion helpers are
 * exported so the test suite can reset the in-memory DB between tests and
 * close it cleanly. `server.ts` only needs `app` for production use.
 */
export function createApp(dbPath: string = process.env.DB_PATH ?? './data/diary.db'): AppBundle {
  const db = createDb(dbPath);

  const app = express();
  app.use(express.json({ limit: '100kb' }));
  app.use(cors());

  app.use('/api/transactions', transactionsRouter(db));

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } });
  });

  // 404 fallthrough (must be after all routes).
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Not found' });
  });

  // Final error handler.
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
    res.status(500).json({
      success: false,
      error: err.message && process.env.NODE_ENV !== 'production'
        ? err.message
        : 'Internal server error',
    });
  });

  return {
    app,
    reset: () => resetDb(db),
    close: () => db.close(),
  };
}
