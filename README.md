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
| **Observabilidad** | **Elastic 9.5.5 & OpenTelemetry** | **Elasticsearch 9.5.5** (single-node), **Kibana 9.5.5**, **Elastic Agent 9.5.5** (APM & OTLP), Metrics, Logs ECS y Traces nativos. |
| **Identidad & IAM** | **Keycloak 26** | Control de Acceso Basado en Roles (RBAC): `admin_user`, `doctor_user`, `nurse_user`, `receptionist_user`, `patient_user`. |
| **Caché Distribuido** | **Redis 7** | Almacenamiento en caché de catálogos clínicos (Especialidades, Obras Sociales, Consultorios) con fallback resiliente. |
| **Normativa Clínica** | **HIPAA & NOM-024** | Auto-logout por inactividad a los 15 minutos, bitácora inmutable de acceso a PHI (`registro_auditoria`). |
| **Arquitectura** | **DDD** | Bounded Contexts, Value Objects, Domain Services, Capas de Infraestructura y Aplicación. |
| **Calidad / Pruebas** | **TDD & Vitest** | Pruebas unitarias automáticas para reglas de facturación, cobertura, solapamientos y auditoría (15 tests). |
| **Proxy Inverso** | **Nginx** | Reverse Proxy para `/api/`, compresión Gzip, cabeceras de seguridad, Rate Limiting y SPA routing. |

---

## 🏛️ Bounded Contexts y Arquitectura Limpia

```
healthtech-platform/
├── backend/
│   ├── src/
│   │   ├── domain/                         # Capa de Dominio (Pura, sin dependencias de framework)
│   │   │   ├── value-objects/              # AppointmentSlot (validación de rangos y solapamientos)
│   │   │   └── services/                   # BillingCalculatorDomainService (cálculo de coberturas)
│   │   ├── telemetry/                      # Observabilidad Nativa (OpenTelemetry + Elastic ECS)
│   │   │   ├── tracer.ts                   # Bootstrap de NodeSDK, OTLP Trace y Metric Exporters
│   │   │   ├── logger.service.ts           # Logger Winston estructurado en Elastic Common Schema (ECS)
│   │   │   └── metrics.service.ts          # Métricas de negocio y de latencia clínica
│   │   ├── auth/                           # Capa de Seguridad e Identidad Keycloak
│   │   │   ├── keycloak.guard.ts           # JWT Token Validator y decodificación de roles
│   │   │   └── roles.guard.ts              # Guard RBAC hospitalario
│   │   ├── redis/                          # Servicio de Caché Distribuido (ioredis con fallback)
│   │   ├── entities/                       # Entidades TypeORM para PostgreSQL 18
│   │   └── modules/                        # Bounded Contexts (Aplicación & Presentación)
│   │       ├── clinical-scheduling/        # Citas Médicas, Especialistas, Consultorios
│   │       ├── patient-care/               # Padrón de Pacientes, Aseguradoras y CURP
│   │       ├── medical-records/            # Expediente Clínico (ECE NOM-004), JSONB y FTS
│   │       ├── hospital-stay/              # Censo de Camas, Habitaciones e Internaciones
│   │       ├── billing-and-claims/         # Facturación, Coaseguros y Liquidaciones
│   │       ├── audit/                      # Trazabilidad y Bitácora de Acceso PHI (HIPAA)
│   │       └── analytics/                  # Tablero de Indicadores en tiempo real
│   └── test/unit/                          # Pruebas TDD ejecutadas con Vitest (15 tests pasando)
│
├── frontend/                               # Angular 21 (HTML y TS 100% desacoplados)
│   └── src/app/
│       ├── core/
│       │   ├── services/hipaa-session.ts   # Escucha de inactividad según HIPAA § 164.312
│       │   └── components/hipaa-modal/     # Modal y pantalla de bloqueo de sesión
│       └── features/                       # Vistas modulares en TailwindCSS v4
│
├── observability/
│   └── elastic-agent.yml                   # Configuración de Elastic Agent 9.5.5 con APM & OTLP
│
├── keycloak/
│   └── realm-export.json                   # Definición de Realm, Roles hospitalarios y Clientes
│
└── frontend/nginx.conf                     # Nginx Reverse Proxy, Rate Limiting y CSP
```

---

## 📊 Observabilidad Integral con Elastic Stack 9.5.5 y OpenTelemetry

La plataforma implementa los 3 pilares de la observabilidad moderna mediante dependencias estables nativas:
1. **Traces Distribuidos:** Instrumentación automática mediante `@opentelemetry/sdk-node` y `@opentelemetry/auto-instrumentations-node`, exportando trazas vía OTLP HTTP al Elastic Agent (puerto `8200` / `/v1/traces`).
2. **Métricas de Rendimiento y Negocio:** Contadores y cronogramas exportados vía OTLP HTTP (`/v1/metrics`) registrando:
   - `healthtech_appointments_total`: Citas creadas, confirmadas y canceladas.
   - `healthtech_phi_access_total`: Consultas y descargas de expedientes clínicos por rol.
   - `healthtech_billing_amount_total`: Montos facturados y cobrados en pesos mexicanos.
   - `healthtech_hospitalizations_total`: Ingresos y egresos en el censo hospitalario.
3. **Logs Estructurados (Elastic Common Schema - ECS):** Todos los registros emitidos por NestJS incluyen `@timestamp`, `log.level`, `service.name`, `context`, y se correlacionan automáticamente con el `trace.id` y `span.id` de la transacción activa.

---

## 🔒 Cumplimiento HIPAA & NOM-024-SSA3-2012

1. **Auto-Logout por Inactividad:**
   - Rastreo de actividad del usuario en el cliente Angular.
   - Advertencia preventiva a los **14 minutos** con cuenta regresiva.
   - Bloqueo y destrucción de sesión a los **15 minutos** conforme a HIPAA § 164.312(a)(2)(iii).
2. **Bitácora Inmutable de PHI (Audit Trail):**
   - Tabla PostgreSQL `registro_auditoria` con índices optimizados.
   - Interceptor `PhiAuditInterceptor` que audita automáticamente toda lectura y mutación sobre historias clínicas y pacientes.

---

## ⚡ Despliegue de la Plataforma Completa

### 1. Iniciar con Docker Compose (PostgreSQL 18, Redis 7, Elastic 9.5.5, Kibana, Elastic Agent, Keycloak, NestJS y Nginx)
```powershell
cd c:\Users\jorge\codegxx\healthtech-platform
docker compose up -d --build
```

### URLs de Acceso Rápido:
* **Plataforma Web (Angular 21 + Nginx):** [http://localhost](http://localhost)
* **Backend API (NestJS 12):** [http://localhost/api](http://localhost/api) o [http://localhost:3000/api](http://localhost:3000/api)
* **Swagger OpenAPI Docs:** [http://localhost/api/docs](http://localhost/api/docs)
* **Kibana (Dashboards y APM):** [http://localhost:5601](http://localhost:5601)
* **Elasticsearch Engine (Single-Node):** [http://localhost:9200](http://localhost:9200)
* **Elastic Agent (APM & OTLP Collector):** [http://localhost:8200](http://localhost:8200)
* **Keycloak IAM:** [http://localhost:8080](http://localhost:8080) (Usuario: `admin` / Clave: `admin`)
* **Redis Cache:** `localhost:6379`
