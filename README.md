# 🏥 HealthTech Platform (Centro Médico)

Plataforma web empresarial para la gestión integral hospitalaria y ambulatoria, desarrollada con **Domain-Driven Design (DDD)**, **Test-Driven Development (TDD)** y un stack tecnológico de última generación.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Características Destacadas |
| :--- | :--- | :--- |
| **Frontend** | **Angular 21** | Zoneless, Standalone Components, Reactive Signals, Control Flow (`@if`, `@for`). |
| **Estilos** | **TailwindCSS v4** | Motor Oxide, `@import "tailwindcss";`, glassmorphism, responsive & dark mode. |
| **Backend** | **NestJS 12** | TypeScript estricto, ECMAScript Modules (`"type": "module"`), OpenAPI / Swagger. |
| **Base de Datos** | **PostgreSQL 18** | Constraint de exclusión GIST (`tstzrange`), campos `JSONB`, Full Text Search (FTS). |
| **Arquitectura** | **DDD** | Bounded Contexts, Value Objects, Domain Services, Capas desacopladas. |
| **Calidad / Pruebas** | **TDD & Vitest** | Tests unitarios automáticos para reglas de facturación, cobertura y solapamientos. |
| **Proxy Inverso** | **Nginx** | Reverse Proxy para `/api/`, compresión Gzip, cabeceras de seguridad y SPA routing. |

---

## 🏛️ Bounded Contexts (Domain-Driven Design)

```
healthtech-platform/
├── backend/
│   ├── src/
│   │   ├── domain/                         # Capa de Dominio (Pura, sin dependencias de framework)
│   │   │   ├── value-objects/              # AppointmentSlot (validación de rangos y solapamientos)
│   │   │   └── services/                   # BillingCalculatorDomainService (cálculo de coberturas)
│   │   ├── entities/                       # Entidades TypeORM para PostgreSQL 18
│   │   └── modules/                        # Bounded Contexts (Aplicación & Presentación)
│   │       ├── clinical-scheduling/        # Turnos, Médicos, Especialidades y Consultorios
│   │       ├── patient-care/               # Pacientes, Obras Sociales y Países
│   │       ├── medical-records/            # Historias Clínicas (EHR), JSONB y Full Text Search
│   │       ├── hospital-stay/              # Censo de Camas, Habitaciones e Internaciones
│   │       ├── billing-and-claims/         # Facturación, Copagos y Liquidaciones
│   │       └── analytics/                  # Tablero de KPIs y métricas en tiempo real
│   └── test/unit/                          # Batería de pruebas TDD con Vitest
├── frontend/                               # Angular 21 Standalone + Signals + TailwindCSS v4
│   └── src/app/features/                   # Vistas: Dashboard, Turnos, Pacientes, EHR, Camas, Facturación
└── nginx/                                  # Configuración de Nginx Reverse Proxy
```

---

## ⚡ Ejecución en Modo Local (Windows con PostgreSQL 18 Local)

### 1. Asegurar la Base de Datos
Si ya ejecutaste los scripts del esquema:
```powershell
$env:PGCLIENTENCODING = "UTF8"
psql -U postgres -d centromedico -f "c:\Users\jorge\codegxx\docker-db\sqls-data\centromedico-pg18\01_schema_centromedico.sql"
psql -U postgres -d centromedico -f "c:\Users\jorge\codegxx\docker-db\sqls-data\centromedico-pg18\02_seed_centromedico.sql"
```

### 2. Iniciar el Backend (NestJS 12)
En una terminal:
```powershell
cd c:\Users\jorge\codegxx\healthtech-platform\backend
npm install
npm run start:dev
```
* API: `http://localhost:3000/api`
* Documentación Swagger interactiva: `http://localhost:3000/api/docs`

### 3. Iniciar el Frontend (Angular 21 + TailwindCSS v4)
En otra terminal:
```powershell
cd c:\Users\jorge\codegxx\healthtech-platform\frontend
npm install
npm start
```
* Accede a la aplicación en: `http://localhost:4200`

---

## 🧪 Ejecutar Pruebas TDD (Vitest)

Para ejecutar la suite de pruebas unitarias de dominio:
```powershell
cd c:\Users\jorge\codegxx\healthtech-platform\backend
npm test
```

Salida esperada:
```text
✓ test/unit/billing-calculator.domain-service.spec.ts (5 tests)
✓ test/unit/appointment-slot.vo.spec.ts (5 tests)
Test Files  2 passed (2)
     Tests  10 passed (10)
```

---

## 🐳 Despliegue con Docker Compose & Nginx (Opcional)

Para levantar la solución completa con Nginx como Reverse Proxy:
```powershell
cd c:\Users\jorge\codegxx\healthtech-platform
docker compose up -d --build
```
* Aplicación unificada en Nginx: `http://localhost` (puerto 80)
* API proxificada: `http://localhost/api`
* Swagger docs: `http://localhost/api/docs`
