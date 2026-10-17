# 🏥 HealthTech Platform (Centro Médico Nacional)

Plataforma web hospitalaria y ambulatoria de grado productivo para México, desarrollada con **Domain-Driven Design (DDD)**, **Test-Driven Development (TDD)**, cumplimiento normativo **HIPAA / NOM-024-SSA3-2012** y arquitectura desacoplada en archivos limpios (`.ts`, `.html`).

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Características Destacadas |
| :--- | :--- | :--- |
| **Frontend** | **Angular 21** | Zoneless, Standalone Components, Reactive Signals, plantillas desacopladas (`.html`). |
| **Estilos** | **TailwindCSS v4** | Motor Oxide, directivas modernas `@import "tailwindcss";`, dark/light mode. |
| **Backend** | **NestJS 12** | TypeScript estricto, ECMAScript Modules (`"type": "module"`), OpenAPI / Swagger. |
| **Base de Datos** | **PostgreSQL 18** | Exclusión GIST (`tstzrange`), campos `JSONB`, Full Text Search (FTS) en español. |
| **Normativa Clínica** | **HIPAA & NOM-024** | Auto-logout por inactividad a los 15 minutos con aviso preventivo y bloqueo de PHI. |
| **Arquitectura** | **DDD** | Bounded Contexts, Value Objects, Domain Services, Capas de Infraestructura y Aplicación. |
| **Calidad / Pruebas** | **TDD & Vitest** | Pruebas unitarias automáticas para reglas de facturación, cobertura y solapamientos. |
| **Proxy Inverso** | **Nginx** | Reverse Proxy para `/api/`, compresión Gzip, cabeceras de seguridad y SPA routing. |

---

## 🏛️ Bounded Contexts y Arquitectura Limpia

```
healthtech-platform/
├── backend/
│   ├── src/
│   │   ├── domain/                         # Capa de Dominio (Pura, sin dependencias de framework)
│   │   │   ├── value-objects/              # AppointmentSlot (validación de rangos y solapamientos)
│   │   │   └── services/                   # BillingCalculatorDomainService (cálculo de coberturas)
│   │   ├── entities/                       # Entidades TypeORM para PostgreSQL 18
│   │   └── modules/                        # Bounded Contexts (Aplicación & Presentación)
│   │       ├── clinical-scheduling/        # Citas Médicas, Especialistas, Consultorios
│   │       ├── patient-care/               # Padrón de Pacientes, Aseguradoras y CURP
│   │       ├── medical-records/            # Expediente Clínico (ECE NOM-004), JSONB y FTS
│   │       ├── hospital-stay/              # Censo de Camas, Habitaciones e Internaciones
│   │       ├── billing-and-claims/         # Facturación, Coaseguros y Liquidaciones
│   │       └── analytics/                  # Tablero de Indicadores en tiempo real
│   └── test/unit/                          # Pruebas TDD ejecutadas con Vitest
│
├── frontend/                               # Angular 21 (HTML y TS 100% desacoplados)
│   └── src/app/
│       ├── core/
│       │   ├── services/hipaa-session.ts   # Escucha de inactividad según HIPAA § 164.312
│       │   └── components/hipaa-modal/     # Modal y pantalla de bloqueo de sesión
│       └── features/
│           ├── dashboard/                  # dashboard.component.ts & .html
│           ├── appointments/               # appointments.component.ts & .html
│           ├── patients/                   # patients.component.ts & .html
│           ├── medical-records/            # medical-records.component.ts & .html
│           ├── hospitalizations/           # hospitalizations.component.ts & .html
│           ├── billing/                    # billing.component.ts & .html
│           └── staff/                      # staff.component.ts & .html
│
└── nginx/
    └── nginx.conf                          # Reverse Proxy y servidor web de producción
```

---

## 🔒 Cumplimiento HIPAA & NOM-024-SSA3-2012 (Auto-Logout)

Para cumplir con la directiva **HIPAA Security Rule § 164.312(a)(2)(iii)** (*Automatic Logoff*) y la norma mexicana **NOM-024-SSA3-2012** sobre Sistemas de Información de Registro Electrónico para la Salud:
* El servicio `HipaaSessionService` rastrea la actividad del usuario (`mousemove`, `keydown`, `touchstart`, `scroll`, `click`).
* Si transcurren **14 minutos de inactividad**, se despliega un modal emergente de advertencia con cuenta regresiva en segundos.
* A los **15 minutos de inactividad**, se destruye la sesión en memoria (`sessionStorage.clear()`) y se bloquea la pantalla para impedir la exposición de **PHI (Protected Health Information)**.
* El profesional de la salud puede reanudar su sesión de forma segura haciendo clic en el botón de reactivación.

---

## ⚡ Ejecución en Modo Local (Windows con PostgreSQL 18 Local)

### 1. Iniciar el Backend (NestJS 12)
```powershell
cd c:\Users\jorge\codegxx\healthtech-platform\backend
npm run start:dev
```
* **API REST**: `http://localhost:3000/api`
* **Swagger Interactivo**: `http://localhost:3000/api/docs`

### 2. Iniciar el Frontend (Angular 21 + TailwindCSS v4)
```powershell
cd c:\Users\jorge\codegxx\healthtech-platform\frontend
npm start
```
* **Aplicación Web**: `http://localhost:4200`

### 3. Ejecutar los Tests TDD
```powershell
cd c:\Users\jorge\codegxx\healthtech-platform\backend
npm test
```

---

## 🐳 Despliegue con Docker Compose & Nginx

```powershell
cd c:\Users\jorge\codegxx\healthtech-platform
docker compose up -d --build
```
* Aplicación unificada en Nginx: `http://localhost` (puerto 80)
* API proxificada: `http://localhost/api`
* Swagger docs: `http://localhost/api/docs`
