import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('BU-25 — Scaffold: Health check', () => {
  it('GET /api/health devuelve 200 con status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', service: 'Bank-UP API' });
  });

  it('Ruta desconocida devuelve 404', async () => {
    const res = await request(app).get('/api/ruta-inexistente');
    expect(res.status).toBe(404);
  });
});
