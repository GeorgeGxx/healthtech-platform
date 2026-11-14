# 🛡️ DevSecOps & Azure DevOps CI/CD (`healthtech-platform`)

> **Visual Blueprint:** [`docs/Diagrams.drawio`](./Diagrams.drawio) (Tab 3)

## 1. Centralized DevSecOps Hub (`devsecops/`)
All shift-left, supply-chain, policy, and post-deploy verification controls live in `devsecops/` and are shared by both Azure DevOps pipelines and `platform-minikube.ps1`:

- **SAST & Secrets:** Gitleaks (`devsecops/sast/gitleaks/.gitleaks.toml`), Semgrep (`devsecops/sast/semgrep/semgrep-rules.yaml`)
- **IaC & Containers:** TFLint (`devsecops/iac/tflint/.tflint.hcl`), Trivy (`devsecops/compliance/trivy/trivy.yaml` & `.trivyignore`)
- **Policy-as-Code:** OPA Conftest (`devsecops/policies/conftest/kubernetes.rego`), OPA Gatekeeper (`devsecops/policies/gatekeeper/`)
- **Supply Chain:** Sigstore Cosign (`devsecops/supply-chain/cosign/`)
- **DAST & Quality:** OWASP ZAP (`devsecops/dast/zap/zap.yaml`), k6 (`devsecops/testing/k6/load-test.js`), Newman (`devsecops/testing/newman/`)

## 2. Azure DevOps Pipelines (`azure-devops/`)
- **Infrastructure (`azure-devops/pipelines/infra.yml` + `templates/infra-stages.yml`):**
  1. TFLint + Trivy IaC security scan
  2. `terraform fmt`, `validate`, and saved `plan` artifact
  3. Environment-gated `apply` to `dev`, `staging`, and `prod` (Dual-Dataplane)
- **8 Service Pipelines (`azure-devops/pipelines/<service>.yml` + `templates/app-stages.yml`):**
  - `frontend.yml`, `appointment-service.yml`, `patient-service.yml`, `billing-service.yml`, `pharmacy-service.yml`, `notification-service.yml`, `clinical-records-service.yml`, `staff-service.yml`
  - Stages: Unit Tests -> SAST/Secrets -> BuildKit Image + CycloneDX SBOM -> Trivy Container Scan -> Conftest & Cosign Gate -> Push to Azure ACR -> Helm Deploy to AKS (`k8s/helm`) -> Newman/k6/ZAP Gates -> Atomic Rollback (`steps/helm-rollback.yml`).
