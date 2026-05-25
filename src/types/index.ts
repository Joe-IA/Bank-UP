export type Role = 'USER' | 'ADMIN';

export interface JwtPayload {
  sub: string;
  role: Role;
  jti: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
