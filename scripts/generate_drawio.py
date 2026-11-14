import os
import xml.etree.ElementTree as ET


def build_drawio_xml():
    mxfile = ET.Element("mxfile", host="app.diagrams.net", type="device")

    def create_page(page_id, page_name):
        diagram = ET.SubElement(mxfile, "diagram", id=page_id, name=page_name)
        model = ET.SubElement(
            diagram,
            "mxGraphModel",
            dx="1420",
            dy="820",
            grid="1",
            gridSize="10",
            guides="1",
            tooltips="1",
            connect="1",
            arrows="1",
            fold="1",
            page="1",
            pageScale="1",
            pageWidth="1900",
            pageHeight="1100",
            math="0",
            shadow="0",
        )
        root = ET.SubElement(model, "root")
        ET.SubElement(root, "mxCell", id="0")
        ET.SubElement(root, "mxCell", id="1", parent="0")
        return root

    def add_node(root, node_id, parent, value, style, x, y, w, h):
        cell = ET.SubElement(
            root,
            "mxCell",
            id=node_id,
            value=value,
            style=style,
            vertex="1",
            parent=parent,
        )
        ET.SubElement(
            cell,
            "mxGeometry",
            x=str(x),
            y=str(y),
            width=str(w),
            height=str(h),
            **{"as": "geometry"},
        )

    def add_edge(root, edge_id, source, target, value="", style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#475569;strokeWidth=1.5;"):
        cell = ET.SubElement(
            root,
            "mxCell",
            id=edge_id,
            value=value,
            style=style,
            edge="1",
            parent="1",
            source=source,
            target=target,
        )
        ET.SubElement(cell, "mxGeometry", relative="1", **{"as": "geometry"})

    title_style = "text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;"
    box_blue = "rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#3B82F6;strokeWidth=1.5;fontColor=#1E3A8A;fontSize=11;"
    box_green = "rounded=1;whiteSpace=wrap;html=1;fillColor=#ECFDF5;strokeColor=#10B981;strokeWidth=1.5;fontColor=#064E3B;fontSize=11;"
    box_amber = "rounded=1;whiteSpace=wrap;html=1;fillColor=#FFFBEB;strokeColor=#F59E0B;strokeWidth=1.5;fontColor=#78350F;fontSize=11;"
    box_purple = "rounded=1;whiteSpace=wrap;html=1;fillColor=#F5F3FF;strokeColor=#8B5CF6;strokeWidth=1.5;fontColor=#4C1D95;fontSize=11;"
    box_slate = "rounded=1;whiteSpace=wrap;html=1;fillColor=#F8FAFC;strokeColor=#64748B;strokeWidth=1.5;fontColor=#1E293B;fontSize=11;"

    # PAGE 1: General Architecture & Microservices
    r1 = create_page("page_arch", "1. HealthTech Architecture")
    add_node(r1, "t1", "1", "<b style='font-size:22px;color:#1E293B;'>HEALTHTECH PLATFORM — MICROSERVICES ARCHITECTURE</b><br><span style='font-size:13px;color:#64748B;'>Angular Frontend • Kong 3.9.4 API Gateway • Keycloak 26.8.1 HIPAA IAM • 7 NestJS Microservices • Elastic Observability</span>", title_style, 250, 25, 1400, 50)
    add_node(r1, "cli", "1", "<b>Angular SPA</b><br>frontend (:80)<br>HIPAA Session Modal", box_blue, 80, 140, 220, 90)
    add_node(r1, "kong", "1", "<b>Kong API Gateway 3.9.4</b><br>Proxy :8000 | Admin :8001<br>JWT + Rate Limit + CORS", box_purple, 380, 140, 240, 90)
    add_node(r1, "kc", "1", "<b>Keycloak 26.8.1</b><br>healthtech-realm (:8080)<br>OIDC / RBAC / JWKS", box_amber, 380, 270, 240, 80)

    services = [
        ("svc_appt", "appointment-service (:3001)<br>Outbox + Scheduling", 720, 100),
        ("svc_pat", "patient-service (:3002)<br>Demographics & Intake", 720, 180),
        ("svc_bill", "billing-service (:3003)<br>Tariffs & Invoices", 720, 260),
        ("svc_pharm", "pharmacy-service (:3004)<br>Prescriptions & Stock", 720, 340),
        ("svc_notif", "notification-service (:3005)<br>Kafka Consumer + SSE/Email", 720, 420),
        ("svc_clin", "clinical-records-service (:3006)<br>PHI Crypto + Audit + Hospitalizations", 720, 500),
        ("svc_staff", "staff-service (:3007)<br>Doctors & Schedules", 720, 580),
    ]
    for sid, label, x, y in services:
        add_node(r1, sid, "1", f"<b>{label}</b>", box_green, x, y, 290, 65)
        add_edge(r1, f"e_kong_{sid}", "kong", sid)

    add_node(r1, "pg", "1", "<b>PostgreSQL 18</b><br>Isolated Schemas / DBs<br>(:5432)", box_slate, 1140, 130, 240, 90)
    add_node(r1, "redis", "1", "<b>Redis 8.8.1</b><br>Cache & Idempotency<br>(:6379)", box_slate, 1140, 250, 240, 85)
    add_node(r1, "kafka", "1", "<b>Apache Kafka 8.3.2 (KRaft)</b><br>Event Bus + Outbox<br>Kafka UI (:8085)", box_amber, 1140, 365, 240, 95)
    add_node(r1, "elastic", "1", "<b>Elastic Stack 9.5.5</b><br>Elasticsearch + Kibana + Elastic Agent<br>Negocio & Tech/HIPAA Dashboards", box_purple, 1140, 495, 290, 105)

    add_edge(r1, "e_cli_kong", "cli", "kong")
    add_edge(r1, "e_kong_kc", "kong", "kc")
    add_edge(r1, "e_svc_pg", "svc_clin", "pg")
    add_edge(r1, "e_svc_kafka", "svc_appt", "kafka")
    add_edge(r1, "e_kafka_notif", "kafka", "svc_notif")

    # PAGE 2: Azure Cloud Infrastructure (Terraform)
    r2 = create_page("page_azure", "2. Azure Cloud & Terraform")
    add_node(r2, "t2", "1", "<b style='font-size:22px;color:#1E293B;'>AZURE CLOUD INFRASTRUCTURE (TERRAFORM)</b><br><span style='font-size:13px;color:#64748B;'>terraform/environments/azure/ (dev • staging • prod Dual-Dataplane) • terraform/modules/azure/</span>", title_style, 250, 25, 1400, 50)
    add_node(r2, "az_edge", "1", "<b>Azure Front Door + Azure DNS Zone</b><br>WAF + TLS Termination + Static SPA Blob Storage", box_blue, 100, 130, 420, 110)
    add_node(r2, "az_aks", "1", "<b>Azure Kubernetes Service (AKS)</b><br>dev: healthtech-azure-dev-aks<br>staging: healthtech-azure-staging-aks<br>prod: Dual Dataplane (DP1 + DP2)", box_green, 100, 280, 420, 140)
    add_node(r2, "az_acr", "1", "<b>Azure Container Registry (ACR)</b><br>AcrPull Role + Cosign Signed Images<br>OCI Helm Chart (k8s/helm/healthtech-platform)", box_purple, 600, 130, 420, 110)
    add_node(r2, "az_data", "1", "<b>Azure Managed Data & Messaging</b><br>• Azure Database for PostgreSQL Flexible Server<br>• Azure Cache for Redis (TLS 1.2)<br>• Azure Event Hubs (Kafka Protocol)", box_amber, 600, 280, 420, 140)
    add_node(r2, "az_sec", "1", "<b>Security, Identity & Observability</b><br>• Azure Key Vault (PHI & DB Secrets)<br>• Azure Workload Identity (Federated OIDC)<br>• Azure Monitor + Log Analytics + VNet", box_slate, 1100, 130, 420, 290)

    # PAGE 3: Azure DevOps CI/CD & DevSecOps
    r3 = create_page("page_azdo", "3. Azure DevOps & DevSecOps")
    add_node(r3, "t3", "1", "<b style='font-size:22px;color:#1E293B;'>AZURE DEVOPS CI/CD &amp; DEVSECOPS PIPELINES</b><br><span style='font-size:13px;color:#64748B;'>azure-devops/pipelines/ (8 Services + infra.yml) • Centralized devsecops/ Hub</span>", title_style, 250, 25, 1400, 50)
    add_node(r3, "ci_1", "1", "<b>1. Build &amp; Unit Tests</b><br>Node 24 (NestJS / Angular)<br>Optional SonarCloud Quality Gate", box_blue, 80, 150, 260, 110)
    add_node(r3, "ci_2", "1", "<b>2. Shift-Left SAST &amp; IaC</b><br>• Gitleaks (.gitleaks.toml)<br>• Semgrep (semgrep-rules.yaml)<br>• TFLint (.tflint.hcl) + Trivy IaC", box_amber, 380, 150, 290, 110)
    add_node(r3, "ci_3", "1", "<b>3. Image, SBOM &amp; Policy</b><br>• BuildKit OCI + CycloneDX SBOM<br>• Trivy Container Scan (HIGH/CRIT)<br>• OPA Conftest + Cosign v3.1.3", box_purple, 710, 150, 290, 110)
    add_node(r3, "ci_4", "1", "<b>4. AKS Helm Deploy &amp; Verify</b><br>• Azure ACR Push + AKS Helm Upgrade<br>• Newman Contract + k6 SLO + ZAP DAST<br>• Atomic Helm Rollback Stage", box_green, 1040, 150, 310, 110)
    add_node(r3, "ci_tf", "1", "<b>Terraform Azure Pipeline (infra.yml)</b><br>TFLint + Trivy IaC -> Plan Artifact -> Workspace Apply (dev/staging/prod)", box_slate, 80, 320, 1270, 90)
    add_edge(r3, "e12", "ci_1", "ci_2")
    add_edge(r3, "e23", "ci_2", "ci_3")
    add_edge(r3, "e34", "ci_3", "ci_4")

    # PAGE 4: Local Minikube & CLI
    r4 = create_page("page_minikube", "4. Local Minikube CLI")
    add_node(r4, "t4", "1", "<b style='font-size:22px;color:#1E293B;'>LOCAL MINIKUBE &amp; PLATFORM CLI (platform-minikube.ps1)</b><br><span style='font-size:13px;color:#64748B;'>Zero-cloud-cost local Kubernetes parity + DevSecOps shift-left gates</span>", title_style, 250, 25, 1400, 50)
    add_node(r4, "mk_1", "1", "<b>Lifecycle Commands</b><br>• up / bootstrap<br>• start / stop / down / destroy<br>• build / test / doctor / verify / rollback", box_blue, 100, 150, 360, 150)
    add_node(r4, "mk_2", "1", "<b>DevSecOps Gates (devsecops/)</b><br>• security-scan (Gitleaks, Semgrep, TFLint, Trivy, Conftest, Cosign)<br>• policy (OPA Conftest)<br>• dast (ZAP) • contract (Newman) • performance (k6)", box_amber, 520, 150, 440, 150)
    add_node(r4, "mk_3", "1", "<b>Azure Cloud Terraform (-Platform azure)</b><br>• plan / apply / unlock<br>• sync-diagrams (updates docs/Diagrams.drawio)", box_green, 1020, 150, 380, 150)

    os.makedirs("docs", exist_ok=True)
    tree = ET.ElementTree(mxfile)
    ET.indent(tree, space="  ", level=0)
    tree.write("docs/Diagrams.drawio", encoding="utf-8", xml_declaration=True)
    print("Successfully generated docs/Diagrams.drawio for healthtech-platform with 4 tabs!")


if __name__ == "__main__":
    build_drawio_xml()
