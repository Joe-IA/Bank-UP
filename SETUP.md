# Bank UP — Guía de levantamiento

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo
- Git

---

## Opción A — Stack completo con Docker (recomendado)

Levanta el backend **y** el frontend en un solo comando.

```bash
# 1. Clonar el repositorio
git clone https://github.com/Joe-IA/Bank-UP.git
cd Bank-UP

# 2. Crear el archivo de variables de entorno del backend
cp Backend/.env.example Backend/.env
```

Edita `Backend/.env` y asigna un valor seguro a `JWT_SECRET`:

```env
NODE_ENV=production
PORT=3000

JWT_SECRET=cambia_esto_por_una_clave_segura
JWT_EXPIRES_IN=7d

MAX_ACCOUNT_BALANCE=1000000
MIN_TRANSFER_AMOUNT=1
ACCOUNT_NUMBER_LENGTH=10
MAX_LOGIN_ATTEMPTS=3

DB_PATH=./banking.db
```

```bash
# 3. Construir las imágenes (solo la primera vez o tras cambios de código)
docker compose build

# 4. Levantar
docker compose up -d
```

| Servicio   | URL                        |
|------------|----------------------------|
| Frontend   | http://localhost            |
| API        | http://localhost/api        |

```bash
# Bajar los contenedores
docker compose down

# Ver logs en tiempo real
docker compose logs -f

# Reconstruir tras cambios en el código
docker compose build && docker compose up -d
```

---

## Opción B — Solo backend (desarrollo de API)

Útil para trabajar solo en el backend sin construir el frontend.

```bash
cd Backend

# Crear .env si no existe
cp .env.example .env   # editar JWT_SECRET

cd container
docker compose up -d
```

El API queda disponible en `http://localhost:3000`.

```bash
# Bajar
docker compose down
```

---

## Opción C — Frontend en modo desarrollo (Vite)

Requiere que el backend ya esté corriendo (Opción B o Opción A).

```bash
cd Frontend
npm install
npm run dev
```

El frontend queda en `http://localhost:5173` y apunta automáticamente al backend en `http://localhost:3000`.

---

## Usuarios de prueba

| Rol   | Email                  | Contraseña    |
|-------|------------------------|---------------|
| Admin | admin@bank.com         | admin123      |
| User  | alice@bank.com         | password123   |
| User  | bob@bank.com           | password123   |

> El seed se ejecuta automáticamente la primera vez que el contenedor arranca y no encuentra datos en la base.

---

## Resetear la base de datos

```bash
# Borrar los archivos de la DB (el seed corre solo al reiniciar)
docker compose down
rm Backend/data/banking.db Backend/data/banking.db-shm Backend/data/banking.db-wal 2>/dev/null
docker compose up -d
```

---

## Estructura del proyecto

```
Bank-UP/
├── docker-compose.yml        ← stack completo (Opción A)
├── Backend/
│   ├── container/
│   │   ├── Dockerfile
│   │   └── docker-compose.yml  ← solo backend (Opción B)
│   ├── data/                   ← volumen de la DB (SQLite)
│   ├── .env                    ← variables de entorno (crear desde .env.example)
│   └── .env.example
└── Frontend/
    ├── Dockerfile              ← build de producción con nginx
    ├── nginx.conf              ← proxy /api → backend
    └── src/
```
