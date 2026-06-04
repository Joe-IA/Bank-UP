import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { initializeDatabase } from './src/database/seed.js';
import { errorHandler } from './src/middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import accountRoutes from './routes/accounts.routes.js';
import transactionRoutes from './routes/transactions.routes.js';
import adminRoutes from './routes/admin.routes.js';

// Inicializa el esquema y siembra datos de prueba si la BD está vacía.
initializeDatabase();

const app = express();

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(helmet());          // Cabeceras de seguridad HTTP
app.use(cors());            // Permite peticiones desde el frontend
app.use(express.json());    // Parsea el body como JSON
if (process.env.NODE_ENV !== 'test') {
  // Morgan se omite en pruebas para no ensuciar la salida del test runner.
  app.use(morgan('dev'));
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/accounts',     accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin',        adminRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Centralized error handler (must be last) ──────────────────────────────────
// Express identifica los manejadores de error por su aridad de 4 parámetros.
app.use(errorHandler);

export default app;
