import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET ?? 'fallback-secret-change-in-production';

export interface JwtPayload {
  id: number;
  email: string;
  role: 'user' | 'admin';
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}
