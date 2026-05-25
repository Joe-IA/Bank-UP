# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Sistema Bancario UP — backend API académico. Node.js 20+ · Express · Prisma · PostgreSQL 16 · TypeScript strict. Especificación completa en `docs/SRS_Sistema_Bancario_UP.pdf`.

## Comandos esenciales

```bash
docker compose up -d                              # levanta PostgreSQL 16 en :5432
npm install                                       # instala dependencias
npm run db:migrate                                # aplica migraciones Prisma
npm run db:seed                                   # pobla datos (idempotente — borra y recrea)
npm run db:reset                                  # drop + migrate + seed
npm run dev                                       # servidor con hot-reload en :3000
npm test                                          # suite completa
npx vitest run src/__tests__/auth.test.ts         # un archivo
npx vitest run -t "nombre del test"               # un test por nombre
```

**Prerequisito:** `.env` debe existir (`cp .env.example .env`). Los tests de integración requieren PostgreSQL corriendo.

## Flujo obligatorio al encontrar un error

1. **Replica el error primero.** No avances hasta reproducirlo de forma consistente.
2. **Escribe un test que falle** con ese error como caso de prueba en el `*.test.ts` del módulo afectado.
3. **Arregla el código** hasta que el nuevo test pase junto con todos los existentes.
4. El test queda en el repositorio como regresión permanente.

## Flujo de trabajo por ticket (BU-X)

```bash
git checkout master && git pull
git checkout -b feat/BU-X-<slug>
# implementar + tests
git commit -m "feat(BU-X): nombre"
git push -u origin feat/BU-X-<slug>
gh pr create --title "BU-X: Nombre" --base master
# avisar al usuario y esperar aprobación antes de merge
```

## Arquitectura

```
src/
├── app.ts              Express + rutas + error handler
├── server.ts           Punto de entrada (dotenv + listen)
├── lib/
│   ├── errors.ts       AppError(statusCode, message)
│   └── prisma.ts       Singleton PrismaClient
├── middleware/
│   ├── auth.ts         verifyJWT (chequea RevokedToken) · requireRole
│   ├── errorHandler.ts ZodError→400, AppError→status, default→500
│   └── validate.ts     validate(zodSchema) — wraps body validation
├── schemas/
│   ├── common.ts       accountNumberSchema · moneyAmountSchema · emailSchema · passwordSchema
│   └── auth.schema.ts  loginSchema
├── routes/
│   ├── index.ts        GET /api/health + monta sub-routers
│   └── auth.routes.ts  POST /api/auth/login · POST /api/auth/logout
├── services/
│   └── auth.service.ts login() · logout()
└── types/index.ts      JwtPayload · Role · Express.Request extension
prisma/
├── schema.prisma       User · Account · Transaction · AuditUnlock · RevokedToken
└── seed.ts             1 ADMIN + 3 USER con cuentas + 16 transacciones históricas
```

**Flujo de una petición:** `validate` → `verifyJWT` → `requireRole` → handler → service → `AppError` → `errorHandler`

**Patrón de servicio:** los servicios lanzan `AppError` con el HTTP correcto; nunca tocan `res`.

**Transacciones financieras:** `prisma.$transaction([...], { isolationLevel: 'Serializable' })`. Montos siempre como strings o `Decimal` de Prisma, nunca `number` float.

## Reglas de negocio no negociables

| Regla | Valor | RF/RNF |
|-------|-------|--------|
| Monto mínimo de transferencia | $500.00 MXN | RF-04 / BU-8 |
| Límite diario acumulado | $7,000.00 MXN (calculado dentro de la transacción) | RF-05 / BU-9 |
| Saldo máximo por cuenta | $50,000.00 MXN → rollback si se excede | RF-08 / BU-12 |
| Comisión | $0.00 | RF-07 / BU-11 |
| Bloqueo automático | 4.° intento fallido (3 permitidos) | RNF-01 / BU-20 |
| Desbloqueo | Solo ADMIN, con auditoría (timestamp + adminId) | RF-14 / BU-21 |
| Contraseñas | bcryptjs cost ≥ 12; jamás texto plano en BD ni logs | BU-22 |
| Política de contraseña | 5-8 chars, ≥1 mayúscula, ≥1 número, ≥1 especial | RNF-03 / BU-23 |
| Sesión JWT | Sin `expiresIn`; logout invalida via `RevokedToken.jti` | RF-02 / BU-6,7 |
| Login inválido | 401 sin revelar si el email existe | RF-01 / BU-5 |
| Cuenta bloqueada | 403 en login | CU-01 / BU-20 |
| Montos en BD | `DECIMAL(12,2)` — nunca float | RNF-08 |
| Número de cuenta | `CHAR(16)` + regex `/^\d{16}$/` | RNF-10 |

## Códigos HTTP

`200` OK · `201` Created · `400` Bad Request (Zod) · `401` Unauthorized · `403` Forbidden · `404` Not Found · `422` Unprocessable Entity (regla de negocio) · `500` Internal Server Error

`422` para violaciones de reglas de negocio. `400` para errores de formato de entrada.

## Seed (referencia rápida)

| Email | Contraseña | Cuenta | Saldo |
|-------|-----------|--------|-------|
| admin@bancoUP.mx | Admin1! | — | — |
| juan.perez@bancoUP.mx | Juan1! | 1234567890123456 | $9,850.00 |
| ana.gonzalez@bancoUP.mx | Ana01! | 2345678901234567 | $25,400.00 |
| carlos.reyes@bancoUP.mx | Carl1! | 3456789012345678 | $39,750.00 |

## Backlog — únicos tickets en alcance

No implementar nada fuera de esta lista.

| Branch | Tickets | Estado |
|--------|---------|--------|
| `feat/BU-5-auth-login` | BU-5, BU-6, BU-7, BU-20, BU-23 | en progreso |
| `feat/BU-11-transferencias` | BU-8, BU-9, BU-11, BU-12 | pendiente |
| `feat/BU-14-historial` | BU-14 | pendiente |
| `feat/BU-21-admin` | BU-21 | pendiente |

**BU-6** se implementa emitiendo JWT sin `expiresIn` (dentro de BU-5).
**BU-7** (logout) va en el mismo branch que BU-5 porque comparte el router de auth.
**BU-23** usa `passwordSchema` de `src/schemas/common.ts`, conectado al login de BU-5.
