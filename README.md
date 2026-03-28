# CMDR Backend — Hospital Militar Central

API REST para el portal de gestión de turnos del Centro Médico de Diagnóstico Radioisotópico.

## Requisitos

- [Node.js 18+](https://nodejs.org/) — si no lo tenés instalado, descargarlo desde nodejs.org
- El `index.html` del frontend

---

## Instalación y arranque

```bash
# 1. Abrir una terminal (CMD o PowerShell) en esta carpeta
cd C:\Users\tomas\Documents\Claude\cmdr-backend

# 2. Instalar dependencias (solo la primera vez)
npm install

# 3. Copiar variables de entorno (ya está hecho si usás .env)
# Editar .env si querés cambiar el puerto o la contraseña del admin

# 4. Iniciar el servidor
npm start

# O en modo desarrollo (se reinicia solo al guardar cambios)
npm run dev
```

El servidor queda corriendo en **http://localhost:3000**

---

## Endpoints

### Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/paciente` | Login paciente (dni + nacimiento) |
| POST | `/api/auth/admin` | Login admin (username + password) |

**Login paciente:**
```json
POST /api/auth/paciente
{ "dni": "12.345.678", "nacimiento": "1980-05-15" }
```

**Login admin:**
```json
POST /api/auth/admin
{ "username": "admin", "password": "cmdr2025" }
```

Ambos devuelven un `token` JWT que se debe enviar en el header:
```
Authorization: Bearer <token>
```

---

### Turnos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/turnos` | Listar turnos (admin: todos, paciente: los suyos) |
| GET | `/api/turnos/:id` | Ver detalle de un turno |
| POST | `/api/turnos` | Crear nuevo turno |
| PUT | `/api/turnos/:id` | Actualizar turno |
| DELETE | `/api/turnos/:id` | Eliminar turno (solo admin) |
| GET | `/api/turnos/horarios/disponibles?fecha=2026-04-01` | Horarios libres del día |

**Crear turno:**
```json
POST /api/turnos
{
  "estudio": "Centellograma Óseo",
  "fecha": "2026-04-10",
  "hora": "09:00",
  "cobertura": "OISFA",
  "email": "paciente@email.com",
  "peso": 75, "altura": 175, "edad": 45,
  "sexo": "Masculino",
  "alergias": "ninguna",
  "medicacion": "ninguna",
  "motivo": "Control oncológico"
}
```

**Estados de turno:** `pendiente` → `confirmado` → `realizado` | `cancelado`

---

### Pacientes

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/pacientes` | Listar todos (solo admin) |
| GET | `/api/pacientes/:dni` | Ver perfil |
| POST | `/api/pacientes` | Alta paciente (solo admin) |
| PUT | `/api/pacientes/:dni` | Actualizar perfil |
| DELETE | `/api/pacientes/:dni` | Eliminar (solo admin) |

---

### Facturación

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/facturacion?mes=2026-04` | Resumen mensual |
| GET | `/api/facturacion/turnos?mes=2026-04&cobertura=OISFA` | Turnos facturables |

---

### Chat

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/chat` | Historial de mensajes |
| POST | `/api/chat` | Enviar mensaje (respuesta automática por palabras clave) |

---

### Archivos (órdenes médicas)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/archivos/upload` | Subir orden médica (form-data, campo `orden`) |
| GET | `/api/archivos/:filename` | Descargar archivo |
| DELETE | `/api/archivos/:filename` | Eliminar (solo admin) |

---

## Conectar el frontend (index.html)

Para que el `index.html` use este backend en lugar de los datos hardcodeados, hay que
reemplazar las funciones de login y carga de turnos. Ejemplo de cómo hacerlo:

```javascript
// BASE URL del backend
const API = 'http://localhost:3000/api';
let TOKEN = null;

// Login paciente
async function loginPaciente(dni, nacimiento) {
  const res = await fetch(`${API}/auth/paciente`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dni, nacimiento })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  TOKEN = data.token;
  return data.paciente;
}

// Obtener turnos del paciente
async function obtenerTurnos() {
  const res = await fetch(`${API}/turnos`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  return await res.json();
}

// Crear turno
async function crearTurno(datos) {
  const res = await fetch(`${API}/turnos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`
    },
    body: JSON.stringify(datos)
  });
  return await res.json();
}
```

---

## Estructura del proyecto

```
cmdr-backend/
├── src/
│   ├── server.js              # Entrada principal
│   ├── database/
│   │   └── db.js              # SQLite + datos de muestra
│   ├── middleware/
│   │   └── auth.js            # Verificación JWT
│   └── routes/
│       ├── auth.js            # Login paciente y admin
│       ├── turnos.js          # CRUD de turnos
│       ├── pacientes.js       # CRUD de pacientes
│       ├── facturacion.js     # Estadísticas de facturación
│       ├── chat.js            # Chat con respuestas automáticas
│       └── archivos.js        # Subida de órdenes médicas
├── uploads/                   # Archivos subidos (órdenes)
├── cmdr.db                    # Base de datos SQLite (se crea al iniciar)
├── .env                       # Variables de entorno
└── package.json
```

---

## Datos de prueba (ya cargados al iniciar)

| Paciente | DNI | Nacimiento |
|----------|-----|------------|
| Juan Carlos García | 12.345.678 | 1980-05-15 |
| María Elena López | 23.456.789 | 1975-03-22 |
| Roberto Martínez | 34.567.890 | 1965-11-08 |
| Ana Beatriz Torres | 45.678.901 | 1990-07-30 |

**Admin:** usuario `admin` / contraseña `cmdr2025`
