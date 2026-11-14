# 🏥 HealthTech Platform (National Medical Center)

Production-grade hospital and outpatient web platform for Mexico, built with **Domain-Driven Design (DDD)**, **Test-Driven Development (TDD)**, **HIPAA / NOM-024-SSA3-2012** regulatory compliance, and a clean decoupled file architecture (`.ts`, `.html`).

---

## 🛠️ Tech Stack

| Layer | Technology | Key Features |
| :--- | :--- | :--- |
| **Frontend** | **Angular 21** | Zoneless, Standalone Components, Reactive Signals, decoupled templates (`.html`). |
| **Styling** | **TailwindCSS v4** | Oxide engine, modern `@import "tailwindcss";` directives, dark/light mode. |
| **Backend** | **NestJS 12** | Strict TypeScript, ECMAScript Modules (`"type": "module"`), OpenAPI / Swagger. |
| **Database** | **PostgreSQL 18** | GIST exclusion (`tstzrange`), `JSONB` fields, Spanish Full Text Search (FTS). |
| **Observability** | **Elastic 9.5.5 & OpenTelemetry** | **Elasticsearch 9.5.5** (single-node), **Kibana 9.5.5**, **Elastic Agent 9.5.5** (APM & OTLP), native Metrics, ECS Logs, and Traces. |
| **Identity & IAM** | **Keycloak 26.8.1 on Postgres 18** | Identity management connected to PostgreSQL 18. Three profiles: `admin` (Keycloak master), `admin_user` (Full hospital management & Admin Panel), `basic_user` (Patient Portal). |
| **Distributed Cache** | **Redis 8.8.1-alpine** | High-speed caching for medical catalogs and sessions with resilient in-memory fallback. |
| **API Gateway** | **Kong Gateway 3.9.4** | Enterprise gateway in **declarative DB-less mode** (`kong.yml`) with Rate Limiting, CORS, Prometheus, and unified routing (:8000). |
| **Event Backbone** | **Apache Kafka 8.3.2 (KRaft)** | Native ZooKeeper-less event cluster, partitioned topics, Kafka UI (:8085), and Transactional Outbox CDC. |
| **Saga Pattern** | **Choreographed & Orchestrated** | Reactive sagas for notifications and orchestrated sagas with automatic reverse compensation (LIFO) for admissions/bookings. |
| **Notif. Microservice** | **Notification-Service** | NestJS 12 microservice + Kafka transport + Redis 8.8 (idempotency) with multi-channel dispatch (Email, SMS, Push). |
| **Clinical Compliance** | **HIPAA & NOM-024** | 15-minute inactivity auto-logout, immutable PHI access log (`registro_auditoria`). |
| **Architecture** | **DDD & EDA Microservices** | Bounded Contexts, Value Objects, Domain Services, multi-stage Dockerfiles with hardened production images. |
| **Quality / Testing** | **TDD & Vitest** | Automated unit tests for billing rules, coverage, overlaps, auditing, admin panel, and saga orchestrator. |
| **Reverse Proxy** | **Nginx** | Web server for Angular 21 SPA, Gzip compression, security headers, and SPA routing fallback (:80). |

---

## 🏛️ Bounded Contexts & Clean Architecture

```
healthtech-platform/
├── kong/                                   # Kong 3.9 API Gateway (declarative DB-less on :8000)
│   └── kong.yml                            # Centralized routing, rate-limiting, CORS, and Prometheus
│
├── appointment-service/                    # Autonomous Appointments & Scheduling Microservice (:3001)
│   ├── Dockerfile                          # Multi-stage production Dockerfile
│   └── src/
│       ├── main.ts                         # Bootstrap (:3001), Swagger (/api/appointments/docs)
│       ├── domain/                         # Value Objects (anti-overlap AppointmentSlot)
│       ├── kafka/                          # Outbox & Saga Orchestrator SEC
│       └── appointments/                   # Medical Appointments, Sagas, and Choreographed Events
│
├── patient-service/                        # Autonomous Patients & Insurers Microservice (:3002)
│   ├── Dockerfile                          # Multi-stage production Dockerfile
│   └── src/
│       ├── main.ts                         # Bootstrap (:3002), Swagger (/api/patients/docs)
│       ├── kafka/                          # Kafka Emitter (patient.registered, profile_updated)
│       └── patients/                       # Patient Registry, Insurer Catalog, and Countries
│
├── billing-service/                        # Autonomous Cashier & Billing Microservice (:3003)
│   ├── Dockerfile                          # Multi-stage production Dockerfile
│   └── src/
│       ├── main.ts                         # Bootstrap (:3003), Swagger (/api/billing/docs)
│       ├── domain/                         # BillingCalculatorDomainService (coinsurance and copays)
│       ├── kafka/                          # Kafka Emitter (billing.payment_received)
│       └── billing/                        # Billing, Concepts, and Hospital Tariffs
│
├── pharmacy-service/                       # Autonomous Pharmacy & Inventory Microservice (:3004)
│   ├── Dockerfile                          # Multi-stage production Dockerfile
│   └── src/
│       ├── main.ts                         # Bootstrap (:3004), Swagger (/api/pharmacy/docs)
│       ├── kafka/                          # Kafka Emitter (pharmacy.medication_dispensed, stock_low)
│       └── pharmacy/                       # Medication Catalog, Dispensing, and Warehouses
│
├── notification-service/                   # Autonomous Notifications Microservice (:3005)
│   ├── Dockerfile                          # Multi-stage production Dockerfile
│   └── src/
│       ├── main.ts                         # Hybrid App: HTTP Server (:3005) + Kafka Consumer
│       ├── redis/                          # Distributed Idempotency Control
│       └── notifications/                  # Multi-channel Dispatcher (Email, SMS, In-App)
│
├── clinical-records-service/               # Autonomous Electronic Health Record (EHR), Census & HIPAA Microservice (:3006)
│   ├── Dockerfile                          # Multi-stage production Dockerfile
│   └── src/
│       ├── main.ts                         # Bootstrap (:3006), Swagger (/api/clinical-records/docs)
│       ├── medical-records/                # EHR NOM-004, Spanish PostgreSQL FTS, and Vital Signs
│       ├── hospitalizations/               # Bed Census, Rooms, and Elasticsearch Sync
│       └── audit/                          # Immutable HIPAA § 164.312 & NOM-024 Audit Log
│
├── staff-service/                          # Autonomous Medical Staff & Consulting Rooms Microservice (:3007)
│   ├── Dockerfile                          # Multi-stage production Dockerfile
│   └── src/
│       ├── main.ts                         # Bootstrap (:3007), Swagger (/api/doctors/docs)
│       ├── redis/                          # Distributed Cache Service for Medical Catalogs
│       └── doctors/                        # Physicians, Specialties, Rooms, and WITH RECURSIVE Hierarchy
│
├── frontend/                               # Angular 21 (100% decoupled HTML and TS)
│   ├── nginx.conf                          # SINGLE Nginx config with GZIP compression and Rate Limiting
│   └── src/app/
│       ├── core/
│       │   ├── services/hipaa-session.ts   # Inactivity listener per HIPAA § 164.312
│       │   ├── services/auth-state.ts      # Reactive role selector (admin_user vs basic_user)
│       │   └── components/hipaa-modal/     # Session lock modal and screen
│       └── features/                       # Modular views in TailwindCSS v4
│
├── database/
│   └── init/                               # Autonomous PostgreSQL 18 initialization
│       ├── 00_init_keycloak_db.sql         # 'keycloak' database creation
│       ├── 01_schema_centromedico.sql      # Medical Center DDL + registro_auditoria table
│       ├── 02_seed_centromedico.sql        # Initial seed of physicians, patients, and beds
│       ├── 03_centromedico_practice_queries.sql
│       ├── 03_seed_hipaa_audit.sql
│       ├── 04_schema_saga_outbox.sql       # outbox_evento and instancia_saga tables
│       └── 05_schema_service_isolation.sql # Service-isolated schemas and views
│
├── kong/
│   └── kong.yml                            # Declarative DB-less Kong Gateway 3.9.4 configuration
│
├── observability/
│   └── elastic-agent.yml                   # Elastic Agent 9.5.5 configuration with APM & OTLP
│
├── keycloak/
│   └── realm-export.json                   # Realm, Hospital Roles, and Clients definition
│
└── scripts/
    └── bootstrap-keycloak.ps1              # Keycloak 26.8.1 provisioning script
```

---

## 📊 Comprehensive Observability with Elastic Stack 9.5.5 & OpenTelemetry

The platform implements the 3 pillars of modern observability using stable native dependencies:
1. **Distributed Traces:** Automatic instrumentation via `@opentelemetry/sdk-node` and `@opentelemetry/auto-instrumentations-node`, exporting traces over OTLP HTTP to Elastic Agent (port `8200` / `/v1/traces`).
2. **Performance & Business Metrics:** Counters and histograms exported over OTLP HTTP (`/v1/metrics`) tracking:
   - `healthtech_appointments_total`: Created, confirmed, and canceled appointments.
   - `healthtech_phi_access_total`: Clinical record views and downloads by role.
   - `healthtech_billing_amount_total`: Billed and collected amounts in Mexican pesos.
   - `healthtech_hospitalizations_total`: Admissions and discharges in the hospital census.
3. **Structured Logs (Elastic Common Schema - ECS):** All logs emitted by NestJS include `@timestamp`, `log.level`, `service.name`, `context`, and are automatically correlated with the active transaction's `trace.id` and `span.id`.

---

## 🔒 HIPAA & NOM-024-SSA3-2012 Compliance

1. **Inactivity Auto-Logout:**
   - User activity tracking in the Angular client.
   - Preventive warning at **14 minutes** with countdown timer.
   - Session lock and destruction at **15 minutes** per HIPAA § 164.312(a)(2)(iii).
2. **Immutable PHI Audit Trail:**
   - PostgreSQL `registro_auditoria` table with optimized indexes.
   - `PhiAuditInterceptor` that automatically audits every read and mutation on clinical records and patients.

---

## ⚡ Full Platform Deployment

### 1. Start with Docker Compose (PostgreSQL 18, Redis 8.8.1, Keycloak 26.8.1, Kong 3.9.4, Elastic 9.5.5, Kibana, NestJS 12, and Nginx)
```powershell
cd c:\Users\jorge\codegxx\healthtech-platform
docker compose up -d --build
```

### 2. Provision Users & Realm in Keycloak (Optional if hot-sync is required)
```powershell
.\scripts\bootstrap-keycloak.ps1
```

### 3. Run E2E Verification Suite (Sagas, Outbox CDC, Notifications & Idempotency)
```powershell
node .\scripts\verify-e2e-microservices.mjs
```

### 🌐 Topology URLs & Ports:
* **Kong API Gateway (DB-less):** [http://localhost:8000](http://localhost:8000) (Unified Proxy) and [http://localhost:8001](http://localhost:8001) (Admin API)
* **Web Platform (Angular 21 + Nginx):** [http://localhost](http://localhost) (Port 80)
* **Strangled Monolith Backend (NestJS 12):** [http://localhost:3000/api](http://localhost:3000/api)
  - Swagger OpenAPI Docs: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
  - Sagas & Outbox Admin Panel: `GET /api/admin/sagas`, `GET /api/admin/outbox/stats`
* **Appointment Microservice (Appointment-Service):** [http://localhost:3001/api/appointments](http://localhost:3001/api/appointments)
  - Swagger OpenAPI Docs: [http://localhost:3001/api/appointments/docs](http://localhost:3001/api/appointments/docs)
  - Orchestrated Booking Saga: `POST /api/appointments/saga-booking`
* **Patient Microservice (Patient-Service):** [http://localhost:3002/api/patients](http://localhost:3002/api/patients)
  - Swagger OpenAPI Docs: [http://localhost:3002/api/patients/docs](http://localhost:3002/api/patients/docs)
* **Billing Microservice (Billing-Service):** [http://localhost:3003/api/billing](http://localhost:3003/api/billing)
  - Swagger OpenAPI Docs: [http://localhost:3003/api/billing/docs](http://localhost:3003/api/billing/docs)
  - Coinsurance Calculation & Kafka Events: `POST /api/billing`, `GET /api/billing/tariffs`
* **Pharmacy Microservice (Pharmacy-Service):** [http://localhost:3004/api/pharmacy](http://localhost:3004/api/pharmacy)
  - Swagger OpenAPI Docs: [http://localhost:3004/api/pharmacy/docs](http://localhost:3004/api/pharmacy/docs)
  - Dispensing & Stock Alerts: `POST /api/pharmacy/:id/dispense`, `GET /api/pharmacy/summary`
* **Notification Microservice (Notification-Service):** [http://localhost:3005/api/notifications](http://localhost:3005/api/notifications)
  - Server-Sent Events (SSE Real-Time Stream): `GET /api/notifications/stream`
  - Dead-Letter Queue (DLQ Buffer & Retry): `GET /api/notifications/dlq`, `POST /api/notifications/dlq/:id/retry`
  - Health & Dispatch Metrics: `GET /api/notifications/health`, `GET /api/notifications/history`
* **Apache Kafka 8.3.2 (KRaft Mode):** `localhost:9092` (external: `localhost:29092`)
* **Kafka UI Dashboard:** [http://localhost:8085](http://localhost:8085) (Inspect topics, partitions, and offsets)
* **Keycloak 26.8.1 IAM (on PostgreSQL 18):** [http://localhost:8080](http://localhost:8080)
  - Master Admin: `admin` / `admin`
  - App Admin: `admin_user` / `Admin123!` (Full access + Administration Panel)
  - Patient Portal: `basic_user` / `User123!` (My Appointments, My History, and My Data)
* **Kibana 9.5.5 (Dashboards & Tracing):** [http://localhost:5601](http://localhost:5601)
* **Elasticsearch Engine 9.5.5 (Single-Node):** [http://localhost:9200](http://localhost:9200)
* **Elastic Agent 9.5.5 (APM & OTLP Collector):** [http://localhost:8200](http://localhost:8200)
* **Redis 8.8.1-alpine:** `localhost:6379`
* **PostgreSQL 18:** `localhost:5432` (`centromedico` and `keycloak`)

---

## ☁️ Cloud Delivery, DevSecOps & Documentation

- **Cloud Target:** Microsoft Azure (AKS, ACR, Azure Database for PostgreSQL, Event Hubs, Key Vault, Front Door) via **Terraform** (`terraform/environments/azure/`).
- **CI/CD:** **Azure DevOps** (`azure-devops/pipelines/` for all 8 services + `infra.yml`).
- **Local Deployment:** `./platform-minikube.ps1 up -Build` (local Kubernetes parity + `devsecops/` gates).
- **Documentation & Diagrams Hub:**
  - [Architecture Diagrams (Draw.io)](./docs/Diagrams.drawio)
  - [Architecture & Azure Cloud Infrastructure](./docs/ARCHITECTURE_AND_AZURE.md)
  - [DevSecOps & Azure DevOps CI/CD](./docs/DEVSECOPS_AND_AZURE_DEVOPS.md)
  - [Operations & Local Minikube CLI](./docs/OPERATIONS_AND_LOCAL.md)
