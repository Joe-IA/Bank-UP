import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

// RNF-01: se permiten 3 errores; el 4.° bloquea
const MAX_FAILED_ATTEMPTS = 3;

function getSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET no configurado');
  return s;
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  // RF-01: mismo 401 si email no existe o contraseña incorrecta (no revelar cual)
  if (!user) throw new AppError(401, 'Credenciales inválidas');

  // CU-01 FA2: cuenta bloqueada → 403
  if (user.isBlocked) {
    throw new AppError(403, 'Cuenta bloqueada. Contacta al administrador.');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    const newAttempts = user.failedLoginAttempts + 1;
    // RNF-01: bloquear al superar el límite de intentos permitidos
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: newAttempts,
        isBlocked: newAttempts > MAX_FAILED_ATTEMPTS,
      },
    });
    // Siempre 401, incluso si ahora quedó bloqueado (RF-01)
    throw new AppError(401, 'Credenciales inválidas');
  }

  // Login exitoso: resetea contador
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0 },
  });

  // RF-02: JWT sin expiración — sesión indefinida hasta logout explícito
  const jti = randomUUID();
  const token = jwt.sign({ sub: user.id, role: user.role, jti }, getSecret());

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  };
}

export async function logout(jti: string) {
  // BU-7: invalida el token en el servidor registrando su jti
  await prisma.revokedToken.create({ data: { jti } });
}
