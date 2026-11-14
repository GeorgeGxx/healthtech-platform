# 🏗️ Architecture & Azure Cloud Infrastructure (`healthtech-platform`)

> **Visual Blueprint:** [`docs/Diagrams.drawio`](./Diagrams.drawio) (Tabs 1 & 2)

## 1. Domain Microservices & Edge Topology
- **Frontend SPA:** `frontend` (Angular 21 + TailwindCSS v4 + Nginx, `:80`)
- **API Gateway & IAM:** Kong 3.9.4 DB-less (`:8000` / `:8001`) + Keycloak 26.8.1 (`healthtech-realm`, `:8080`)
- **7 NestJS Microservices:**
  - `appointment-service` (`:3001`) — Scheduling & Transactional Outbox
  - `patient-service` (`:3002`) — Patient Registry & Insurers
  - `billing-service` (`:3003`) — Tariffs & Billing
  - `pharmacy-service` (`:3004`) — Prescriptions & Stock
  - `notification-service` (`:3005`) — Kafka Consumer & SSE/Email Dispatch
  - `clinical-records-service` (`:3006`) — PHI AES-256-GCM Crypto, HIPAA Audit & Hospitalizations
  - `staff-service` (`:3007`) — Doctors & Schedules
- **Data & Observability:** PostgreSQL 18, Redis 8.8.1, Kafka 8.3.2 (KRaft), Elastic Stack 9.5.5 (Elasticsearch, Kibana, Elastic Agent).

## 2. Azure Cloud Infrastructure (`terraform/environments/azure`)
All cloud infrastructure is provisioned exclusively on **Microsoft Azure** via Terraform (`dev`, `staging`, `prod` workspaces) using `terraform/modules/azure/`:

| Capability | Azure Service / Module |
| :--- | :--- |
| **Networking** | `vnet` (Dedicated AKS & DB subnets + prod DP2 subnet) |
| **Kubernetes** | `aks` (`healthtech-azure-<env>-aks`; dual dataplane `aks_dp2` in `prod`) |
| **Registry** | `acr` (`healthtechazure<env>acr` with `AcrPull` role on AKS) |
| **Database** | `postgresql` (Azure Database for PostgreSQL Flexible Server) |
| **Cache** | `redis` (Azure Cache for Redis TLS 1.2) |
| **Messaging** | `eventhubs` (Azure Event Hubs with Kafka protocol) |
| **Secrets & Identity** | `keyvault` (Azure Key Vault) + `workload_identity` (Federated OIDC) |
| **Edge & DNS** | `frontdoor` (Azure Front Door Premium + WAF) + `dns_zone` + `storage_account` |
| **Observability** | `monitor` (Azure Monitor & Log Analytics) |
