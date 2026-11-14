# 🚀 Local Operations & Minikube CLI (`healthtech-platform`)

> **Visual Blueprint:** [`docs/Diagrams.drawio`](./Diagrams.drawio) (Tab 4)

## 1. Unified Local & Azure CLI (`platform-minikube.ps1`)
```powershell
# Audit local tooling & run all 6 DevSecOps shift-left gates
./platform-minikube.ps1 tools
./platform-minikube.ps1 security-scan

# Build images into Minikube Docker daemon & deploy Helm chart locally
./platform-minikube.ps1 up -Build

# Verify cluster, run contract/performance/DAST suites, or rollback
./platform-minikube.ps1 doctor
./platform-minikube.ps1 contract
./platform-minikube.ps1 performance
./platform-minikube.ps1 rollback

# Azure Cloud Terraform operations
./platform-minikube.ps1 plan -Platform azure -Environment dev
./platform-minikube.ps1 apply -Platform azure -Environment dev

# Regenerate docs/Diagrams.drawio
./platform-minikube.ps1 sync-diagrams
```

## 2. Docker Compose Quickstart
```powershell
docker compose up -d --build
```
Endpoints: Frontend `:80`, Kong `:8000`, Keycloak `:8080`, Kibana `:5601`, Kafka UI `:8085`.
