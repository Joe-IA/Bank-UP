# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Sistema Bancario UP — backend API académico. Node.js 20+ · Express · Prisma · PostgreSQL 16 · TypeScript strict. Especificación completa en `docs/SRS_Sistema_Bancario_UP.pdf`.

## Comandos esenciales

```bash
# Infraestructura
docker compose up -d          # levanta PostgreSQL 16 en :5432

# Base de datos
npm run db:migrate            # aplica migraciones Prisma (dev)
npm run db:seed               # pobla datos iniciales (idempotente — borra y recrea)
npm run db:reset              # drop + migrate + seed (entorno limpio)

# Desarrollo
npm run dev                   # servidor con hot-reload en :3000

# Tests
npm test                      # suite completa (vitest run)
npx vitest run src/__tests__/schemas.test.ts   # un archivo
npx vitest run -t "nombre del test"            # un test por nombre
npm run test:coverage         # reporte de cobertura
```

**Prerequisito:** el archivo `.env` debe existir (`cp .env.example .env`) con `DATABASE_URL` y `JWT_SECRET`.

## Flujo obligatorio al encontrar un error

1. **Replica el error primero.** No avances hasta reproducirlo de forma consistente.
2. **Escribe un test que falle** con ese error como caso de prueba (en el archivo `*.test.ts` del módulo afectado).
3. **Arregla el código** hasta que el nuevo test pase junto con todos los existentes.
4. El test queda en el repositorio como regresión permanente.

## Flujo de trabajo por ticket (BU-X)

```bash
git checkout master && git pull
git checkout -b feat/BU-X-<slug>   # o fix/ o chore/
# implementar + tests
git commit -m "feat(BU-X): nombre del requerimiento"
git push -u origin feat/BU-X-<slug>
gh pr create --title "BU-X: Nombre" --base master
```

- Un branch + un PR + un commit por ticket.
- RFs que forman una sola operación atómica (e.g. BU-8/9/11/12/13 = módulo de transferencias) se agrupan en un branch y el PR referencia todos.
- Después de abrir el PR, **avisar al usuario** y esperar su aprobación antes de hacer merge.
- Formato de commit: `feat(BU-X): ...` / `fix(BU-X): ...` / `chore(BU-X): ...`

## Arquitectura

```
src/
├── app.ts              Express + middleware + rutas + error handler
├── server.ts           Punto de entrada HTTP (dotenv + listen)
├── lib/
│   ├── errors.ts       AppError(statusCode, message, code?)
│   └── prisma.ts       Singleton de PrismaClient
├── middleware/
│   ├── auth.ts         verifyJWT · requireRole(...roles)
│   ├── errorHandler.ts ZodError→400, AppError→status, default→500
│   └── validate.ts     validate(zodSchema) — middleware de validación de body
├── schemas/
│   └── common.ts       accountNumberSchema · moneyAmountSchema · emailSchema · passwordSchema
├── routes/             Routers Express (montados en app.ts bajo /api)
├── services/           Lógica de negocio (cada servicio corresponde a un BU-X)
└── types/index.ts      JwtPayload · Role · extensión de Express.Request
prisma/
├── schema.prisma       Modelos User, Account, Transaction, AuditUnlock, RevokedToken
└── seed.ts             1 ADMIN + 3 USER con cuentas + 16 transacciones históricas
```

**Flujo de una petición:**
`validate(schema)` → `verifyJWT` → `requireRole` → route handler → service → `AppError` o resultado → `errorHandler`

**Patrón de servicio:** cada función de servicio lanza `AppError` con el código HTTP correcto cuando viola una regla de negocio. El `errorHandler` global la captura; los servicios nunca llaman `res.status(...)` directamente.

**Transacciones financieras:** siempre con `prisma.$transaction([...], { isolationLevel: 'Serializable' })`. Nunca aritmética float — usar `Decimal` de `@prisma/client/runtime/library` o strings para valores monetarios en Prisma.

## Reglas de negocio no negociables (SRS)

| Regla | Valor | RF/RNF |
|-------|-------|--------|
| Monto mínimo de transferencia | $500.00 MXN | RF-04 |
| Límite diario acumulado de envíos | $7,000.00 MXN (calculado dentro de la transacción) | RF-05 |
| Saldo máximo por cuenta | $50,000.00 MXN → ROLLBACK si se excede | RF-08, RF-09 |
| Comisión por transferencia | $0.00 | RF-07 |
| Bloqueo automático | Al 4.° intento fallido (3 permitidos) | RNF-01 |
| Desbloqueo | Solo rol ADMIN, con auditoría (timestamp + adminId) | RF-14 |
| Hash de contraseñas | bcryptjs cost ≥ 12 — jamás texto plano en BD ni logs | RNF-02 |
| Política de contraseña | 5-8 chars, ≥1 mayúscula, ≥1 número, ≥1 especial | RNF-03 |
| Sesión JWT | Sin expiración (`expiresIn` omitido); logout invalida via `RevokedToken.jti` | RF-02 |
| Login inválido | HTTP 401 sin revelar si el email existe | RF-01 |
| Cuenta bloqueada en login | HTTP 403 | CU-01 FA2 |
| Montos en BD | `DECIMAL(12,2)` — sin float | RNF-08 |
| Número de cuenta | Exactamente 16 dígitos — `CHAR(16)` en BD + regex `/^\d{16}$/` | RNF-10 |
| Aislamiento de transacciones | SERIALIZABLE | RNF-04 |

## Códigos HTTP (sección 9.4 del SRS)

`200` OK · `201` Created · `400` Bad Request (Zod/formato) · `401` Unauthorized · `403` Forbidden · `404` Not Found · `422` Unprocessable Entity (regla de negocio) · `500` Internal Server Error

Usar `422` para violaciones de reglas de negocio (monto bajo, límite diario, saldo máximo). Usar `400` para errores de formato/validación de entrada.

## Datos de seed (referencia rápida)

| Rol | Email | Contraseña | Cuenta | Saldo |
|-----|-------|-----------|--------|-------|
| ADMIN | admin@bancoUP.mx | Admin1! | — | — |
| USER | juan.perez@bancoUP.mx | Juan1! | 1234567890123456 | $9,850.00 |
| USER | ana.gonzalez@bancoUP.mx | Ana01! | 2345678901234567 | $25,400.00 |
| USER | carlos.reyes@bancoUP.mx | Carl1! | 3456789012345678 | $39,750.00 |

## Trazabilidad BU-X → implementación

| Tickets | Branch | Contenido |
|---------|--------|-----------|
| BU-25 | `chore/BU-25-scaffold` | Scaffold Node+TS+Express+Prisma+Vitest |
| BU-30,32,33,34 | `feat/BU-30-db-seed` | Schema Prisma + migración + seed + Zod validators |
| BU-5,6,20,22,23 | `feat/BU-5-auth-login` | Login, JWT, bloqueo automático, bcrypt, policy |
| BU-7 | `feat/BU-7-logout` | Logout + RevokedToken blacklist |
| BU-8,9,11,12,13,17,18,24 | `feat/BU-11-transferencias` | Módulo completo de transferencias SERIALIZABLE |
| BU-14,15 | `feat/BU-14-historial` | Historial paginado de movimientos |
| BU-21 | `feat/BU-21-admin` | Panel admin: listar usuarios + desbloqueo con auditoría |
