import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../lib/prisma';

// Helpers
const post = (path: string, body: object) =>
  request(app).post(path).set('Content-Type', 'application/json').send(body);

const loginAs = (email: string, password: string) =>
  post('/api/auth/login', { email, password });

// Resetea el estado de juan antes de cada test para evitar interferencias
beforeEach(async () => {
  await prisma.user.updateMany({
    where: { email: 'juan.perez@bancoUP.mx' },
    data: { failedLoginAttempts: 0, isBlocked: false },
  });
  // Limpia tokens revocados del usuario de prueba
  const user = await prisma.user.findUnique({ where: { email: 'juan.perez@bancoUP.mx' } });
  if (user) {
    await prisma.revokedToken.deleteMany();
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ── BU-5 / RF-01: Login ────────────────────────────────────────────────────

describe('BU-5 — Login (RF-01)', () => {
  it('CA-01: credenciales válidas devuelven 200 y JWT', async () => {
    const res = await loginAs('juan.perez@bancoUP.mx', 'Juan1!');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toMatchObject({ email: 'juan.perez@bancoUP.mx', firstName: 'Juan' });
  });

  it('CA-01: admin puede iniciar sesión', async () => {
    const res = await loginAs('admin@bancoUP.mx', 'Admin1!');
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('ADMIN');
  });

  it('RF-01: contraseña incorrecta → 401 sin revelar si el email existe', async () => {
    const res = await loginAs('juan.perez@bancoUP.mx', 'WrongP1!');
    expect(res.status).toBe(401);
    // El mensaje no debe mencionar email, correo, usuario, existe, registrado
    expect(res.body.error).not.toMatch(/email|correo|usuario|existe|registrado/i);
  });

  it('RF-01: email inexistente devuelve el mismo 401 que contraseña incorrecta', async () => {
    const resNoEmail = await loginAs('noexiste@bancoUP.mx', 'Noex1st!');
    const resWrongPass = await loginAs('juan.perez@bancoUP.mx', 'WrongP1!');
    expect(resNoEmail.status).toBe(401);
    expect(resWrongPass.status).toBe(401);
    expect(resNoEmail.body.error).toBe(resWrongPass.body.error);
  });
});

// ── BU-23 / RNF-03: Política de contraseña en login ───────────────────────

describe('BU-23 — Política de contraseña en login (RNF-03)', () => {
  it('CA-18: contraseña menor a 5 chars → 400', async () => {
    const res = await loginAs('juan.perez@bancoUP.mx', 'Ab1!');
    expect(res.status).toBe(400);
  });

  it('CA-18: contraseña mayor a 8 chars → 400', async () => {
    const res = await loginAs('juan.perez@bancoUP.mx', 'MuyLarga1!!');
    expect(res.status).toBe(400);
  });

  it('CA-18: contraseña sin mayúscula → 400', async () => {
    const res = await loginAs('juan.perez@bancoUP.mx', 'abc123!');
    expect(res.status).toBe(400);
  });

  it('CA-18: contraseña sin número → 400', async () => {
    const res = await loginAs('juan.perez@bancoUP.mx', 'Abcdef!');
    expect(res.status).toBe(400);
  });

  it('CA-18: contraseña sin especial → 400', async () => {
    const res = await loginAs('juan.perez@bancoUP.mx', 'Abcde1');
    expect(res.status).toBe(400);
  });

  it('RNF-09: email con formato inválido → 400', async () => {
    const res = await loginAs('no-es-un-email', 'Admin1!');
    expect(res.status).toBe(400);
  });
});

// ── BU-20 / RNF-01: Bloqueo automático ────────────────────────────────────

describe('BU-20 — Bloqueo automático (RNF-01)', () => {
  it('CA-02: 3 intentos fallidos consecutivos NO bloquean la cuenta', async () => {
    for (let i = 0; i < 3; i++) {
      await loginAs('juan.perez@bancoUP.mx', 'WrongP1!');
    }
    // Tras 3 fallos la cuenta sigue activa
    const res = await loginAs('juan.perez@bancoUP.mx', 'Juan1!');
    expect(res.status).toBe(200);
  });

  it('CA-02: el 4.° intento fallido bloquea la cuenta', async () => {
    for (let i = 0; i < 4; i++) {
      await loginAs('juan.perez@bancoUP.mx', 'WrongP1!');
    }
    // Ahora bloqueada — ni con la contraseña correcta entra
    const res = await loginAs('juan.perez@bancoUP.mx', 'Juan1!');
    expect(res.status).toBe(403);
  });

  it('cuenta bloqueada explícitamente devuelve 403', async () => {
    await prisma.user.update({
      where: { email: 'juan.perez@bancoUP.mx' },
      data: { isBlocked: true },
    });
    const res = await loginAs('juan.perez@bancoUP.mx', 'Juan1!');
    expect(res.status).toBe(403);
  });

  it('login exitoso resetea el contador de intentos fallidos', async () => {
    for (let i = 0; i < 2; i++) {
      await loginAs('juan.perez@bancoUP.mx', 'WrongP1!');
    }
    await loginAs('juan.perez@bancoUP.mx', 'Juan1!');
    const user = await prisma.user.findUnique({ where: { email: 'juan.perez@bancoUP.mx' } });
    expect(user?.failedLoginAttempts).toBe(0);
  });
});

// ── BU-6 / RF-02: Sesión indefinida ───────────────────────────────────────

describe('BU-6 — Sesión indefinida (RF-02)', () => {
  it('CA-03: el JWT emitido no tiene claim exp (no expira)', async () => {
    const res = await loginAs('juan.perez@bancoUP.mx', 'Juan1!');
    expect(res.status).toBe(200);
    const payload = JSON.parse(
      Buffer.from(res.body.token.split('.')[1], 'base64url').toString(),
    );
    expect(payload.exp).toBeUndefined();
  });

  it('el JWT incluye jti único por sesión', async () => {
    const r1 = await loginAs('juan.perez@bancoUP.mx', 'Juan1!');
    const r2 = await loginAs('juan.perez@bancoUP.mx', 'Juan1!');
    const p1 = JSON.parse(Buffer.from(r1.body.token.split('.')[1], 'base64url').toString());
    const p2 = JSON.parse(Buffer.from(r2.body.token.split('.')[1], 'base64url').toString());
    expect(p1.jti).not.toBe(p2.jti);
  });
});

// ── BU-7 / RF-03: Logout ──────────────────────────────────────────────────

describe('BU-7 — Logout (RF-03)', () => {
  it('CA-04: logout con token válido devuelve 200', async () => {
    const { body } = await loginAs('juan.perez@bancoUP.mx', 'Juan1!');
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${body.token}`);
    expect(res.status).toBe(200);
  });

  it('CA-04: token revocado es rechazado con 401 en endpoints protegidos', async () => {
    const { body } = await loginAs('juan.perez@bancoUP.mx', 'Juan1!');
    const token = body.token;

    await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    // Intento usar el mismo token después del logout
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('logout sin token devuelve 401', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });
});
