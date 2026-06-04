# Bank UP

Sistema bancario web desarrollado para Universidad Panamericana. Permite a usuarios gestionar cuentas, realizar depósitos y transferencias, y a administradores supervisar toda la actividad del sistema.

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js 22 + Express 5 + TypeScript |
| Base de datos | SQLite (node:sqlite nativo, sin ORM) |
| Autenticación | JWT (jsonwebtoken) |
| Frontend | React 19 + Vite + Zustand + React Router 7 |
| Contenedores | Docker + Docker Compose |

---

## Estructura del proyecto

```
Bank-UP/
├── Backend/
│   ├── routes/            # Definición de rutas HTTP
│   ├── src/
│   │   ├── database/      # Esquema, seed y acceso a SQLite
│   │   ├── middleware/    # Auth, validación, manejo de errores
│   │   ├── services/      # Lógica de negocio
│   │   └── utils/         # JWT, números de cuenta, AppError
│   ├── __tests__/         # Pruebas de reglas de negocio
│   ├── container/         # Dockerfile y docker-compose del backend
│   ├── app.ts             # Configuración de Express
│   └── index.ts           # Punto de entrada
├── Frontend/
│   └── src/
│       ├── api/           # Clientes HTTP por dominio
│       ├── pages/         # Vistas (Login, Dashboard, Transferencia, etc.)
│       ├── store/         # Estado global con Zustand
│       └── types/         # Tipos TypeScript compartidos
└── docker-compose.yml     # Orquestación completa (backend + frontend)
```

---

## Levantar con Docker (recomendado)

```bash
# 1. Copia y ajusta las variables de entorno
cp Backend/.env.example Backend/.env

# 2. Construye e inicia ambos servicios
docker compose up --build
```

El frontend queda disponible en `http://localhost:80` y se comunica con el backend mediante el proxy de nginx.

---

## Desarrollo local

### Backend

```bash
cd Backend
cp .env.example .env
npm install
npm run dev        # tsx watch — reinicia en cada cambio
```

El servidor escucha en `http://localhost:3000` (configurable con `PORT`).

### Frontend

```bash
cd Frontend
npm install
npm run dev        # Vite — hot reload en http://localhost:5173
```

---

## Variables de entorno (Backend)

| Variable | Valor por defecto | Descripción |
|----------|------------------|-------------|
| `PORT` | `3000` | Puerto del servidor |
| `NODE_ENV` | `development` | Entorno (`development` / `production` / `test`) |
| `JWT_SECRET` | — | Secreto para firmar tokens JWT (**cambiar en producción**) |
| `JWT_EXPIRES_IN` | `7d` | Expiración del token |
| `DB_PATH` | `./banking.db` | Ruta al archivo SQLite |
| `MAX_ACCOUNT_BALANCE` | `1000000` | Saldo máximo permitido por cuenta |
| `MIN_TRANSFER_AMOUNT` | `1` | Monto mínimo de transferencia |
| `DAILY_TRANSFER_LIMIT` | `50000` | Límite de transferencias por día |
| `MAX_LOGIN_ATTEMPTS` | `3` | Intentos fallidos antes de bloquear la cuenta |
| `ACCOUNT_NUMBER_LENGTH` | `10` | Longitud del número de cuenta generado |

---

## API REST

Base URL: `http://localhost:3000/api`

Todas las respuestas siguen el formato:
```json
{ "success": true, "data": { ... } }
```
Los errores devuelven `{ "success": false, "message": "..." }` con el código HTTP correspondiente.

### Autenticación

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/auth/register` | — | Registra un nuevo usuario |
| `POST` | `/auth/login` | — | Inicia sesión y devuelve un JWT |

**Register** — body:
```json
{
  "name": "string (requerido)",
  "email": "string (requerido, email válido)",
  "password": "string (mínimo 8 caracteres)",
  "role": "user | admin (opcional, default: user)"
}
```

**Login** — body:
```json
{ "email": "string", "password": "string" }
```
Respuesta: `{ "token": "JWT", "user": { "id", "name", "email", "role" } }`

> Las rutas protegidas requieren el header `Authorization: Bearer <token>`.

---

### Cuentas

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/accounts/me` | user / admin | Devuelve el perfil y saldo del usuario autenticado |

---

### Transacciones

> Requieren rol `user`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/transactions` | Historial de transacciones del usuario |
| `POST` | `/transactions/deposit` | Realiza un depósito |
| `POST` | `/transactions/transfer` | Realiza una transferencia |

**Deposit** — body:
```json
{ "amount": 500.00, "description": "Nómina (opcional)" }
```

**Transfer** — body:
```json
{
  "destinationAccountNumber": "ACC-000002",
  "amount": 200.00,
  "description": "Renta (opcional)"
}
```

---

### Administración

> Requieren rol `admin`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/admin/users` | Lista todos los usuarios |
| `GET` | `/admin/users/:id` | Detalle de un usuario |
| `PATCH` | `/admin/users/:id/lock` | Bloquea una cuenta |
| `PATCH` | `/admin/users/:id/unlock` | Desbloquea una cuenta |
| `GET` | `/admin/accounts` | Lista todas las cuentas |
| `GET` | `/admin/transactions` | Lista todas las transacciones |
| `GET` | `/admin/login-attempts` | Historial de intentos de login |
| `GET` | `/admin/login-attempts/:userId` | Intentos de login de un usuario |

---

## Base de datos (SQLite)

```
users
  id, name, email, password (bcrypt), role, is_locked, created_at, updated_at

accounts
  id, user_id (FK→users), account_number (único), balance, created_at, updated_at

transactions
  id, type (deposit|transfer), amount, origin_account_id (FK), destination_account_id (FK),
  description, created_at

login_attempts
  id, user_id (FK), email, success (0|1), ip_address, attempted_at
```

El acceso usa la API `node:sqlite` nativa de Node.js 22 con WAL mode y foreign keys habilitados.

---

## Reglas de negocio

- **Bloqueo automático**: la cuenta se bloquea tras `MAX_LOGIN_ATTEMPTS` fallos consecutivos desde el último login exitoso.
- **Saldo máximo**: ningún depósito o transferencia puede dejar una cuenta por encima de `MAX_ACCOUNT_BALANCE`.
- **Monto mínimo de transferencia**: `MIN_TRANSFER_AMOUNT`.
- **Límite diario de transferencias**: `DAILY_TRANSFER_LIMIT` por cuenta origen (acumulado del día).
- **Auto-transferencia prohibida**: no se puede transferir a la propia cuenta.
- **Atomicidad**: todas las operaciones que modifican saldos se ejecutan dentro de transacciones SQL.

---

## Usuarios de prueba (seed)

| Rol | Email | Contraseña |
|-----|-------|-----------|
| admin | admin@bank.com | admin123 |
| user | alice@bank.com | password123 |
| user | bob@bank.com | password123 |

---

## Pruebas

```bash
cd Backend
npm test
```

Las pruebas cubren las reglas de negocio principales: monto mínimo de transferencia (BU-08), límite diario (BU-09), transferencia exitosa (BU-11), saldo máximo (BU-12), historial de transacciones (BU-14) y desbloqueo de cuenta por admin (BU-21).
