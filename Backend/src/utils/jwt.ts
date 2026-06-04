import jwt from 'jsonwebtoken';

/** Clave de firma leída de la variable de entorno JWT_SECRET. */
const SECRET = process.env.JWT_SECRET ?? 'fallback-secret-change-in-production';

/** Datos que se codifican dentro del token JWT. */
export interface JwtPayload {
  id: number;
  email: string;
  role: 'user' | 'admin';
}

/**
 * Genera un JWT firmado con los datos del usuario.
 * La expiración está configurada con JWT_EXPIRES_IN (default 7d en .env).
 */
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: '24h' });
}

/**
 * Verifica la firma del token y devuelve el payload.
 * Lanza un error si el token es inválido o ha expirado.
 */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}
