/**
 * BU-21: Desbloqueo administrativo de cuentas
 *
 * Tests that an admin can unlock a locked user account,
 * that regular users cannot perform this action,
 * and that the unlocked user can login again.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { resetDb, createUser, type TestUser } from './helpers/testDb.js';
import { getDb } from '../src/database/database.js';

let admin: TestUser;
let lockedUser: TestUser;
let regularUser: TestUser;

beforeAll(() => {
  resetDb();
  admin       = createUser('Admin', 'admin@test.com', 'password123', 'admin');
  lockedUser  = createUser('Locked', 'locked@test.com', 'password123', 'user', 1000);
  regularUser = createUser('Regular', 'regular@test.com', 'password123', 'user', 1000);

  getDb()
    .prepare("UPDATE users SET is_locked = 1 WHERE id = ?")
    .run(lockedUser.id);
});

describe('BU-21: Desbloqueo administrativo — control de acceso', () => {
  it('rejects unlock request without token', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${lockedUser.id}/unlock`);

    expect(res.status).toBe(401);
  });

  it('rejects unlock request from regular user (forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${lockedUser.id}/unlock`)
      .set('Authorization', `Bearer ${regularUser.token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe('BU-21: Desbloqueo administrativo — flujo principal', () => {
  it('admin can unlock a locked user account', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${lockedUser.id}/unlock`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/unlocked/i);
  });

  it('unlocked user can now login successfully', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'locked@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('returns 404 when trying to unlock a non-existent user', async () => {
    const res = await request(app)
      .patch('/api/admin/users/99999/unlock')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('admin can also lock a user account', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${regularUser.id}/lock`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/locked/i);
  });

  it('locked user cannot login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'regular@test.com', password: 'password123' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/locked/i);
  });
});
