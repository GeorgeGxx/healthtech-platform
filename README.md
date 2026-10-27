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
| **Identidad & IAM** | **Keycloak 26.8.1 en Postgres 18** | Gestión de identidades conectada a PostgreSQL 18. Tres perfiles: `admin` (Keycloak master), `admin_user` (Gestión hospitalaria total y Panel Admin), `basic_user` (Portal Paciente). |
| **Caché Distribuido** | **Redis 8.8.1-alpine** | Almacenamiento en caché de alta velocidad para catálogos médicos y sesiones con fallback resiliente en memoria. |
| **API Gateway** | **Kong Gateway 3.9.4** | Gateway empresarial en modo **DB-less declarativo** (`kong.yml`) con Rate Limiting, CORS, Prometheus y ruteo unificado (:8000). |
| **Event Backbone** | **Apache Kafka 8.3.2 (KRaft)** | Clúster de eventos en modo nativo sin ZooKeeper, tópicos particionados, Kafka UI (:8085) y Transactional Outbox CDC. |
| **Patrón Saga** | **Coreográfica & Orquestada** | Sagas reactivas para notificaciones y Sagas orquestadas con compensación automática reversa (LIFO) para admisiones/reservas. |
| **Microservicio Notif.** | **Notification-Service** | Microservicio NestJS 12 + Kafka transport + Redis 8.8 (idempotencia) con despacho multicanal (Email, SMS, Push). |
| **Normativa Clínica** | **HIPAA & NOM-024** | Auto-logout por inactividad a los 15 minutos, bitácora inmutable de acceso a PHI (`registro_auditoria`). |
| **Arquitectura** | **DDD & EDA Microservices** | Bounded Contexts, Value Objects, Domain Services, Dockerfiles multi-stage con imágenes seguras de producción. |
| **Calidad / Pruebas** | **TDD & Vitest** | Pruebas unitarias automáticas para reglas de facturación, cobertura, solapamientos, auditoría, panel admin y orquestador de sagas. |
| **Proxy Inverso** | **Nginx** | Servidor web para SPA Angular 21, compresión Gzip, cabeceras de seguridad y fallback SPA routing (:80). |

---

## 🏛️ Bounded Contexts y Arquitectura Limpia

```
healthtech-platform/
├── kong/                                   # API Gateway Kong 3.9 (DB-less declarativo en :8000)
│   └── kong.yml                            # Ruteo centralizado, rate-limiting, CORS y Prometheus
│
├── appointment-service/                    # Microservicio Autónomo de Turnos y Agenda Asistencial (:3001)
│   ├── Dockerfile                          # Multi-stage Dockerfile de producción
│   └── src/
│       ├── main.ts                         # Bootstrap (:3001), Swagger (/api/appointments/docs)
│       ├── domain/                         # Value Objects (AppointmentSlot anti-solapamiento)
│       ├── kafka/                          # Outbox & Saga Orchestrator SEC
│       └── appointments/                   # Citas Médicas, Sagas y Eventos Coreográficos
│
├── patient-service/                        # Microservicio Autónomo de Pacientes y Aseguradoras (:3002)
│   ├── Dockerfile                          # Multi-stage Dockerfile de producción
│   └── src/
│       ├── main.ts                         # Bootstrap (:3002), Swagger (/api/patients/docs)
│       ├── kafka/                          # Emisor Kafka (patient.registered, profile_updated)
│       └── patients/                       # Padrón de Pacientes, Catálogo de Aseguradoras y Países
│
├── billing-service/                        # Microservicio Autónomo de Caja y Facturación (:3003)
│   ├── Dockerfile                          # Multi-stage Dockerfile de producción
│   └── src/
│       ├── main.ts                         # Bootstrap (:3003), Swagger (/api/billing/docs)
│       ├── domain/                         # BillingCalculatorDomainService (coaseguros y copagos)
│       ├── kafka/                          # Emisor Kafka (billing.payment_received)
│       └── billing/                        # Facturación, Conceptos y Tarifas Hospitalarias
│
├── pharmacy-service/                       # Microservicio Autónomo de Farmacia y Existencias (:3004)
│   ├── Dockerfile                          # Multi-stage Dockerfile de producción
│   └── src/
│       ├── main.ts                         # Bootstrap (:3004), Swagger (/api/pharmacy/docs)
│       ├── kafka/                          # Emisor Kafka (pharmacy.medication_dispensed, stock_low)
│       └── pharmacy/                       # Catálogo de Fármacos, Dispensación y Almacenes
│
├── notification-service/                   # Microservicio Autónomo de Notificaciones (:3005)
│   ├── Dockerfile                          # Multi-stage Dockerfile de producción
│   └── src/
│       ├── main.ts                         # App Híbrida: Servidor HTTP (:3005) + Kafka Consumer
│       ├── redis/                          # Control de Idempotencia distribuido
│       └── notifications/                  # Despachador multicanal (Email, SMS, In-App)
│
├── clinical-records-service/               # Microservicio Autónomo de Expediente Clínico (ECE), Censo y HIPAA (:3006)
│   ├── Dockerfile                          # Multi-stage Dockerfile de producción
│   └── src/
│       ├── main.ts                         # Bootstrap (:3006), Swagger (/api/clinical-records/docs)
│       ├── medical-records/                # ECE NOM-004, FTS PostgreSQL en español y Signos Vitales
│       ├── hospitalizations/               # Censo de Camas, Habitaciones y Sincronización Elasticsearch
│       └── audit/                          # Bitácora Inmutable HIPAA § 164.312 y NOM-024
│
├── staff-service/                          # Microservicio Autónomo de Personal Médico y Consultorios (:3007)
│   ├── Dockerfile                          # Multi-stage Dockerfile de producción
│   └── src/
│       ├── main.ts                         # Bootstrap (:3007), Swagger (/api/doctors/docs)
│       ├── redis/                          # Servicio de Caché Distribuido para Catálogos Médicos
│       └── doctors/                        # Médicos, Especialidades, Consultorios y Jerarquía WITH RECURSIVE
│
├── frontend/                               # Angular 21 (HTML y TS 100% desacoplados)
│   ├── nginx.conf                          # Archivo ÚNICO Nginx con compresión GZIP y Rate Limiting
│   └── src/app/
│       ├── core/
│       │   ├── services/hipaa-session.ts   # Escucha de inactividad según HIPAA § 164.312
│       │   ├── services/auth-state.ts      # Selector reactivo de roles (admin_user vs basic_user)
│       │   └── components/hipaa-modal/     # Modal y pantalla de bloqueo de sesión
│       └── features/                       # Vistas modulares en TailwindCSS v4
│
├── database/
│   └── init/                               # Inicialización autónoma de PostgreSQL 18
│       ├── 00_init_keycloak_db.sql         # Creación de base de datos 'keycloak'
│       ├── 01_schema_centromedico.sql      # DDL Centro Médico + Tabla registro_auditoria
│       ├── 02_seed_centromedico.sql        # Población inicial de médicos, pacientes y camas
│       ├── 03_centromedico_practice_queries.sql
│       ├── 03_seed_hipaa_audit.sql
│       ├── 04_schema_saga_outbox.sql       # Tablas outbox_evento e instancia_saga
│       └── 05_schema_service_isolation.sql # Esquemas aislados por servicio y vistas
│
├── kong/
│   └── kong.yml                            # Configuración declarativa DB-less de Kong Gateway 3.9.4
│
├── observability/
│   └── elastic-agent.yml                   # Configuración de Elastic Agent 9.5.5 con APM & OTLP
│
├── keycloak/
│   └── realm-export.json                   # Definición de Realm, Roles hospitalarios y Clientes
│
└── scripts/
    └── bootstrap-keycloak.ps1              # Script de aprovisionamiento de Keycloak 26.8.1
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

### 1. Iniciar con Docker Compose (PostgreSQL 18, Redis 8.8.1, Keycloak 26.8.1, Kong 3.9.4, Elastic 9.5.5, Kibana, NestJS 12 y Nginx)
```powershell
cd c:\Users\jorge\codegxx\healthtech-platform
docker compose up -d --build
```

### 2. Aprovisionar Usuarios y Realm en Keycloak (Opcional si se requiere sincronización en caliente)
```powershell
.\scripts\bootstrap-keycloak.ps1
```

### 3. Ejecutar Suite de Verificación E2E (Sagas, Outbox CDC, Notificaciones e Idempotencia)
```powershell
node .\scripts\verify-e2e-microservices.mjs
```

### 🌐 URLs y Puertos de la Topología:
* **API Gateway Kong (DB-less):** [http://localhost:8000](http://localhost:8000) (Proxy unificado) y [http://localhost:8001](http://localhost:8001) (Admin API)
* **Plataforma Web (Angular 21 + Nginx):** [http://localhost](http://localhost) (Puerto 80)
* **Backend Monolito Estrangulado (NestJS 12):** [http://localhost:3000/api](http://localhost:3000/api)
  - Swagger OpenAPI Docs: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
  - Panel Admin Sagas & Outbox: `GET /api/admin/sagas`, `GET /api/admin/outbox/stats`
* **Microservicio de Citas (Appointment-Service):** [http://localhost:3001/api/appointments](http://localhost:3001/api/appointments)
  - Swagger OpenAPI Docs: [http://localhost:3001/api/appointments/docs](http://localhost:3001/api/appointments/docs)
  - Saga Orquestada de Reserva: `POST /api/appointments/saga-booking`
* **Microservicio de Pacientes (Patient-Service):** [http://localhost:3002/api/patients](http://localhost:3002/api/patients)
  - Swagger OpenAPI Docs: [http://localhost:3002/api/patients/docs](http://localhost:3002/api/patients/docs)
* **Microservicio de Facturación (Billing-Service):** [http://localhost:3003/api/billing](http://localhost:3003/api/billing)
  - Swagger OpenAPI Docs: [http://localhost:3003/api/billing/docs](http://localhost:3003/api/billing/docs)
  - Cálculo de Coaseguros & Eventos Kafka: `POST /api/billing`, `GET /api/billing/tariffs`
* **Microservicio de Farmacia (Pharmacy-Service):** [http://localhost:3004/api/pharmacy](http://localhost:3004/api/pharmacy)
  - Swagger OpenAPI Docs: [http://localhost:3004/api/pharmacy/docs](http://localhost:3004/api/pharmacy/docs)
  - Dispensación & Alertas de Stock: `POST /api/pharmacy/:id/dispense`, `GET /api/pharmacy/summary`
* **Microservicio de Notificaciones (Notification-Service):** [http://localhost:3005/api/notifications](http://localhost:3005/api/notifications)
  - Server-Sent Events (SSE Real-Time Stream): `GET /api/notifications/stream`
  - Dead-Letter Queue (DLQ Buffer & Reintento): `GET /api/notifications/dlq`, `POST /api/notifications/dlq/:id/retry`
  - Health & Métricas de Despacho: `GET /api/notifications/health`, `GET /api/notifications/history`
* **Apache Kafka 8.3.2 (KRaft Mode):** `localhost:9092` (externo: `localhost:29092`)
* **Kafka UI Dashboard:** [http://localhost:8085](http://localhost:8085) (Inspección de tópicos, particiones y offsets)
* **Keycloak 26.8.1 IAM (en PostgreSQL 18):** [http://localhost:8080](http://localhost:8080)
  - Master Admin: `admin` / `admin`
  - App Admin: `admin_user` / `Admin123!` (Acceso total + Panel de Administración)
  - Portal Paciente: `basic_user` / `User123!` (Mis Citas, Mi Historial y Mis Datos)
* **Kibana 9.5.5 (Dashboards & Tracing):** [http://localhost:5601](http://localhost:5601)
* **Elasticsearch Engine 9.5.5 (Single-Node):** [http://localhost:9200](http://localhost:9200)
* **Elastic Agent 9.5.5 (APM & OTLP Collector):** [http://localhost:8200](http://localhost:8200)
* **Redis 8.8.1-alpine:** `localhost:6379`
* **PostgreSQL 18:** `localhost:5432` (`centromedico` y `keycloak`)

