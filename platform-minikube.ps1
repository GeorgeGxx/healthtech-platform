#!/usr/bin/env pwsh
#Requires -Version 7.0
# ==============================================================================
# HealthTech Platform - Minikube & Azure Cloud DevSecOps Orchestrator
# Local Minikube parity + Azure AKS Terraform/Helm/DevSecOps CLI
# ==============================================================================
[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet(
        "up", "bootstrap", "start", "resume", "down", "stop", "destroy", "build",
        "test", "doctor", "verify", "status", "security-scan", "policy",
        "dast", "contract", "performance", "plan", "apply", "rollback", "unlock",
        "urls", "diagrams", "sync-diagrams", "tools", "help"
    )]
    [string]$Command = "help",

    [ValidateSet("minikube", "azure")]
    [string]$Platform = "minikube",

    [ValidateSet("dev", "minikube", "staging", "prod")]
    [string]$Environment = "dev",

    [string]$Service = "all",
    [string]$ImageTag = "1.0.0",
    [switch]$Build = $false,
    [switch]$Fast = $false,
    [switch]$SkipScans = $false,
    [switch]$AutoApprove = $false,
    [switch]$SkipCosignVerify = $false,
    [string]$LockId = "",
    [string]$TargetUrl = "http://127.0.0.1:8000"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root          = $PSScriptRoot
$helmChartDir  = Join-Path $root "k8s\helm\healthtech-platform"
$minikubeDir   = Join-Path $root "k8s\minikube"
$tfAzureDir    = Join-Path $root "terraform\environments\azure"
$scriptsDir    = Join-Path $root "scripts"
$devsecopsDir  = Join-Path $root "devsecops"
$helmRelease   = "healthtech"
$targetNs      = switch ($Environment) {
    "minikube" { "dev" }
    "prod"     { "production" }
    default    { $Environment }
}
$targetCloudEnv = if ($Environment -eq "minikube") { "dev" } else { $Environment }

$HealthTechServices = @(
    @{ Name = "appointment-service";      Port = 3001; Health = "/api/appointments/health/liveness" },
    @{ Name = "patient-service";          Port = 3002; Health = "/api/patients/health/liveness" },
    @{ Name = "billing-service";          Port = 3003; Health = "/api/billing/health/liveness" },
    @{ Name = "pharmacy-service";         Port = 3004; Health = "/api/pharmacy/health/liveness" },
    @{ Name = "notification-service";     Port = 3005; Health = "/api/notifications/health/liveness" },
    @{ Name = "clinical-records-service"; Port = 3006; Health = "/api/health/liveness" },
    @{ Name = "staff-service";            Port = 3007; Health = "/api/doctors/health/liveness" },
    @{ Name = "frontend";                 Port = 80;   Health = "/" }
)

function Show-Banner {
    param([string]$Title)
    Write-Host ""
    Write-Host ("=" * 78) -ForegroundColor Cyan
    Write-Host "  $Title" -ForegroundColor White
    Write-Host ("=" * 78) -ForegroundColor Cyan
}

function Show-Success { param([string]$Msg) Write-Host "  [OK] $Msg" -ForegroundColor Green }
function Show-Warn    { param([string]$Msg) Write-Host "  [WARN] $Msg" -ForegroundColor Yellow }
function Show-Info    { param([string]$Msg) Write-Host "  [INFO] $Msg" -ForegroundColor Cyan }

function Get-ToolInventory {
    $tools = @(
        @{ Name = "docker";    Purpose = "Container runtime & build" },
        @{ Name = "minikube";  Purpose = "Local Kubernetes cluster" },
        @{ Name = "kubectl";   Purpose = "Kubernetes CLI" },
        @{ Name = "helm";      Purpose = "Helm 4 chart deployments" },
        @{ Name = "terraform"; Purpose = "Azure IaC provisioning" },
        @{ Name = "az";        Purpose = "Azure CLI (AKS/ACR/KeyVault)" },
        @{ Name = "tflint";    Purpose = "Terraform linter" },
        @{ Name = "gitleaks";  Purpose = "SAST secret detection" },
        @{ Name = "semgrep";   Purpose = "SAST code rules" },
        @{ Name = "trivy";     Purpose = "Vuln, IaC & SBOM scanner" },
        @{ Name = "conftest";  Purpose = "OPA Rego policy gate" },
        @{ Name = "cosign";    Purpose = "Supply-chain signature verify" },
        @{ Name = "k6";        Purpose = "SLO load testing" },
        @{ Name = "newman";    Purpose = "API contract testing" },
        @{ Name = "python";    Purpose = "Draw.io & helper scripts" },
        @{ Name = "node";      Purpose = "NestJS / Angular runtime" }
    )
    foreach ($t in $tools) {
        $found = [bool](Get-Command $t.Name -ErrorAction SilentlyContinue)
        $status = if ($found) { "INSTALLED" } else { "MISSING" }
        $color  = if ($found) { "Green" } else { "Yellow" }
        Write-Host ("  {0,-12} [{1,-9}] - {2}" -f $t.Name, $status, $t.Purpose) -ForegroundColor $color
    }
}

function New-GitleaksScanSource {
    $scanSource = Join-Path ([System.IO.Path]::GetTempPath()) ("healthtech-gitleaks-{0}" -f [guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $scanSource -Force | Out-Null
    $files = & git -C $root ls-files --cached --others --exclude-standard 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $files) {
        throw "Could not enumerate git files for Gitleaks scan."
    }
    foreach ($rel in $files) {
        $src = Join-Path $root $rel
        if (Test-Path -LiteralPath $src -PathType Leaf) {
            $dst = Join-Path $scanSource $rel
            $dstDir = Split-Path -Parent $dst
            if (-not (Test-Path -LiteralPath $dstDir)) {
                New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
            }
            Copy-Item -LiteralPath $src -Destination $dst -Force
        }
    }
    return $scanSource
}

function Invoke-DevSecOpsGates {
    param([switch]$IncludeRenderedPolicy = $true)
    Show-Banner "HealthTech DevSecOps Shift-Left Security Gates (devsecops/)"

    $gitleaksConfig = Join-Path $devsecopsDir "sast\gitleaks\.gitleaks.toml"
    $semgrepConfig  = Join-Path $devsecopsDir "sast\semgrep\semgrep-rules.yaml"
    $tflintConfig   = Join-Path $devsecopsDir "iac\tflint\.tflint.hcl"
    $trivyConfig    = Join-Path $devsecopsDir "compliance\trivy\trivy.yaml"
    $trivyIgnore    = Join-Path $devsecopsDir "compliance\trivy\.trivyignore"
    $conftestPolicy = Join-Path $devsecopsDir "policies\conftest"
    $cosignPub      = Join-Path $devsecopsDir "supply-chain\cosign\cosign.pub"
    $cosignManifest = Join-Path $devsecopsDir "supply-chain\cosign\supply-chain-manifest.json"
    $cosignBundle   = Join-Path $devsecopsDir "supply-chain\cosign\supply-chain-manifest.sigstore.json"

    # 1. Gitleaks
    if (Get-Command gitleaks -ErrorAction SilentlyContinue) {
        Show-Info "[1/6] Running Gitleaks secret scan..."
        $src = New-GitleaksScanSource
        try {
            & gitleaks detect --source $src --config $gitleaksConfig --no-git --redact=100 --no-banner
            if ($LASTEXITCODE -ne 0) { throw "Gitleaks detected secrets." }
            Show-Success "Gitleaks: 0 secret leaks."
        } finally {
            Remove-Item -LiteralPath $src -Recurse -Force -ErrorAction SilentlyContinue
        }
    } else { Show-Warn "[1/6] gitleaks not installed; skipping." }

    # 2. Semgrep
    if (Get-Command semgrep -ErrorAction SilentlyContinue) {
        Show-Info "[2/6] Running Semgrep SAST..."
        & semgrep scan --config $semgrepConfig --severity ERROR --error $root
        if ($LASTEXITCODE -ne 0) { throw "Semgrep reported ERROR findings." }
        Show-Success "Semgrep: clean."
    } else { Show-Warn "[2/6] semgrep not installed; skipping." }

    # 3. TFLint
    if (Get-Command tflint -ErrorAction SilentlyContinue) {
        Show-Info "[3/6] Running TFLint on terraform/environments/azure..."
        & tflint --init --config=$tflintConfig --chdir=$tfAzureDir | Out-Null
        & tflint --config=$tflintConfig --chdir=$tfAzureDir
        if ($LASTEXITCODE -ne 0) { throw "TFLint failed." }
        Show-Success "TFLint: clean."
    } else { Show-Warn "[3/6] tflint not installed; skipping." }

    # 4. Trivy IaC / Config
    if (Get-Command trivy -ErrorAction SilentlyContinue) {
        Show-Info "[4/6] Running Trivy IaC & misconfiguration scan..."
        & trivy config --config $trivyConfig --ignorefile $trivyIgnore $tfAzureDir
        if ($LASTEXITCODE -ne 0) { throw "Trivy config scan failed." }
        Show-Success "Trivy IaC: clean."
    } else { Show-Warn "[4/6] trivy not installed; skipping." }

    # 5. OPA Conftest on rendered Helm chart
    if ($IncludeRenderedPolicy -and (Get-Command helm -ErrorAction SilentlyContinue) -and (Get-Command conftest -ErrorAction SilentlyContinue)) {
        Show-Info "[5/6] Rendering Helm chart and running OPA Conftest..."
        $tmpYaml = Join-Path ([System.IO.Path]::GetTempPath()) "healthtech-rendered.yaml"
        & helm template $helmRelease $helmChartDir --namespace $targetNs | Set-Content -Path $tmpYaml -Encoding UTF8
        try {
            & conftest test $tmpYaml --policy $conftestPolicy
            if ($LASTEXITCODE -ne 0) { throw "Conftest policy gate failed." }
            Show-Success "OPA Conftest: all Kubernetes manifests compliant."
        } finally {
            Remove-Item -LiteralPath $tmpYaml -Force -ErrorAction SilentlyContinue
        }
    } else { Show-Warn "[5/6] helm or conftest missing; skipping policy gate." }

    # 6. Cosign supply-chain manifest verification
    if (-not $SkipCosignVerify -and (Get-Command cosign -ErrorAction SilentlyContinue)) {
        Show-Info "[6/6] Verifying Cosign supply-chain manifest..."
        & cosign verify-blob --key $cosignPub --bundle $cosignBundle --insecure-ignore-tlog=true $cosignManifest
        if ($LASTEXITCODE -ne 0) { throw "Cosign manifest verification failed." }
        Show-Success "Cosign: supply-chain manifest verified."
    } else { Show-Warn "[6/6] cosign skipped or not installed." }
}

function Invoke-ServiceBuild {
    Show-Banner "Building HealthTech Container Images (Minikube Docker Daemon)"
    $targets = if ($Service -eq "all") { $HealthTechServices } else { @($HealthTechServices | Where-Object { $_.Name -eq $Service }) }
    if ($targets.Count -eq 0) { throw "Unknown service '$Service'." }

    if ($Platform -eq "minikube" -and (Get-Command minikube -ErrorAction SilentlyContinue)) {
        & minikube -p minikube docker-env --shell powershell | Invoke-Expression
    }

    foreach ($svc in $targets) {
        $svcDir = Join-Path $root $svc.Name
        $tag = "georgegxx/$($svc.Name):$ImageTag"
        Show-Info "Building $tag..."
        & docker build -t $tag -f (Join-Path $svcDir "Dockerfile") $svcDir
        if ($LASTEXITCODE -ne 0) { throw "Docker build failed for $($svc.Name)." }
        Show-Success "Built $tag"
    }
}

function Invoke-ServiceTests {
    Show-Banner "Running HealthTech Unit Tests & Builds"
    $targets = if ($Service -eq "all") { $HealthTechServices } else { @($HealthTechServices | Where-Object { $_.Name -eq $Service }) }
    foreach ($svc in $targets) {
        $svcDir = Join-Path $root $svc.Name
        Show-Info "Testing $($svc.Name)..."
        Push-Location $svcDir
        try {
            if (-not (Test-Path "node_modules")) { & npm ci --no-audit }
            & npm run build
            if ($LASTEXITCODE -ne 0) { throw "Build failed for $($svc.Name)." }
            if ($svc.Name -ne "frontend") {
                & npm test -- --passWithNoTests
                if ($LASTEXITCODE -ne 0) { throw "Tests failed for $($svc.Name)." }
            }
            Show-Success "$($svc.Name) passed."
        } finally {
            Pop-Location
        }
    }
}

function Invoke-AzureTerraform {
    param([Parameter(Mandatory = $true)][ValidateSet("plan", "apply", "destroy", "unlock", "status")][string]$Action)
    Show-Banner "Azure Cloud Terraform ($Action - $targetCloudEnv)"
    if (-not (Get-Command terraform -ErrorAction SilentlyContinue)) { throw "terraform CLI not found." }
    Push-Location $tfAzureDir
    try {
        & terraform fmt -check -recursive
        if ($LASTEXITCODE -ne 0) { throw "terraform fmt check failed." }
        switch ($Action) {
            "plan" {
                & terraform init -backend=false -input=false
                & terraform workspace select $targetCloudEnv 2>$null
                if ($LASTEXITCODE -ne 0) { & terraform workspace new $targetCloudEnv }
                & terraform validate -no-color
                $varFile = "$targetCloudEnv/terraform.tfvars"
                $argsList = @("plan", "-no-color")
                if (Test-Path $varFile) { $argsList += "-var-file=$varFile" }
                & terraform @argsList
            }
            "apply" {
                & terraform init -input=false
                & terraform workspace select $targetCloudEnv 2>$null
                if ($LASTEXITCODE -ne 0) { & terraform workspace new $targetCloudEnv }
                $varFile = "$targetCloudEnv/terraform.tfvars"
                $argsList = @("apply", "-no-color")
                if (Test-Path $varFile) { $argsList += "-var-file=$varFile" }
                if ($AutoApprove) { $argsList += "-auto-approve" }
                & terraform @argsList
            }
            "destroy" {
                & terraform workspace select $targetCloudEnv
                $varFile = "$targetCloudEnv/terraform.tfvars"
                $argsList = @("destroy", "-no-color")
                if (Test-Path $varFile) { $argsList += "-var-file=$varFile" }
                if ($AutoApprove) { $argsList += "-auto-approve" }
                & terraform @argsList
            }
            "unlock" {
                if (-not $LockId) { throw "Pass -LockId <id> to unlock Terraform state." }
                & terraform force-unlock -force $LockId
            }
            "status" {
                & terraform workspace list
            }
        }
        if ($LASTEXITCODE -ne 0) { throw "Terraform $Action failed." }
    } finally {
        Pop-Location
    }
}

function Show-Help {
    Show-Banner "HealthTech Platform CLI (platform-minikube.ps1)"
    Write-Host @"
  Local Minikube Commands:
    up | bootstrap       Start Minikube, run DevSecOps gates (unless -SkipScans), deploy Helm chart
    start | resume       Start stopped Minikube cluster
    down | stop          Stop Minikube cluster (preserves state)
    destroy              Delete Minikube cluster
    build                Build Docker images into Minikube daemon (-Service all|<name>)
    test                 Run NestJS/Angular builds & unit tests
    doctor | verify      Check Minikube, namespaces, pods, and Helm release health
    status               Show Kubernetes pods, services, and Helm releases
    rollback             Rollback Helm release on Minikube
    urls                 Print local service & Kong/Keycloak/Kibana endpoints

  DevSecOps & Testing Commands (devsecops/):
    security-scan        Run Gitleaks, Semgrep, TFLint, Trivy, OPA Conftest, Cosign
    policy               Run OPA Conftest against rendered Helm manifests
    dast                 Run OWASP ZAP DAST baseline against -TargetUrl
    contract             Run Newman API contract suite
    performance          Run k6 load test against -TargetUrl
    tools                Audit installed local DevSecOps & cloud CLI tools

  Azure Cloud (Terraform) Commands (-Platform azure -Environment dev|staging|prod):
    plan | apply         Validate, plan, or apply Azure AKS/ACR/Postgres/KeyVault Terraform
    unlock               Force-unlock Azure Blob state (-LockId <id>)
    diagrams             Open/validate docs/Diagrams.drawio
    sync-diagrams        Regenerate docs/Diagrams.drawio via scripts/generate_drawio.py
"@
}

switch ($Command) {
    "help"          { Show-Help }
    "tools"         { Show-Banner "Tooling Inventory"; Get-ToolInventory }
    "security-scan" { Invoke-DevSecOpsGates -IncludeRenderedPolicy:$true }
    "policy"        {
        $tmpYaml = Join-Path ([System.IO.Path]::GetTempPath()) "healthtech-rendered.yaml"
        & helm template $helmRelease $helmChartDir --namespace $targetNs | Set-Content -Path $tmpYaml -Encoding UTF8
        & conftest test $tmpYaml --policy (Join-Path $devsecopsDir "policies\conftest")
        Remove-Item -LiteralPath $tmpYaml -Force -ErrorAction SilentlyContinue
    }
    "build"         { Invoke-ServiceBuild }
    "test"          { Invoke-ServiceTests }
    "dast"          {
        $zapCfg = Join-Path $devsecopsDir "dast\zap\zap.yaml"
        & docker run --rm --network host -v "${devsecopsDir}\dast\zap:/zap/wrk" ghcr.io/zaproxy/zaproxy:stable zap.sh -cmd -autorun /zap/wrk/zap.yaml
    }
    "contract"      {
        $col = Join-Path $devsecopsDir "testing\newman\microservices.postman_collection.json"
        & newman run $col --env-var "baseUrl=$TargetUrl"
    }
    "performance"   {
        $k6Script = Join-Path $devsecopsDir "testing\k6\load-test.js"
        & k6 run -e BASE_URL=$TargetUrl $k6Script
    }
    { $_ -in @("up", "bootstrap") } {
        Show-Banner "HealthTech Minikube Bootstrap ($targetNs)"
        if (-not $SkipScans) { Invoke-DevSecOpsGates -IncludeRenderedPolicy:$true }
        & minikube status 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) {
            & minikube start --cpus=4 --memory=8192 --kubernetes-version=v1.37.0
            if ($LASTEXITCODE -ne 0) { throw "Failed to start Minikube." }
        }
        & kubectl apply -f (Join-Path $minikubeDir "infra\namespaces.yaml")
        if ($Build) { Invoke-ServiceBuild }
        & helm upgrade --install $helmRelease $helmChartDir --namespace $targetNs --create-namespace --values (Join-Path $helmChartDir "values-$targetCloudEnv.yaml") --wait --timeout 5m
        if ($LASTEXITCODE -ne 0) { throw "Helm deployment failed." }
        Show-Success "HealthTech Platform deployed to Minikube namespace '$targetNs'."
    }
    { $_ -in @("start", "resume") } { & minikube start }
    { $_ -in @("down", "stop") }    { & minikube stop }
    "destroy"       { & minikube delete }
    "rollback"      {
        if ($Platform -eq "azure") {
            throw "Azure AKS rollback is owned by Azure DevOps (azure-devops/templates/steps/helm-rollback.yml)."
        }
        & helm rollback $helmRelease --namespace $targetNs --wait --timeout 5m
    }
    { $_ -in @("doctor", "verify", "status") } {
        if ($Platform -eq "azure") {
            Invoke-AzureTerraform -Action status
        } else {
            Show-Banner "Minikube Health & Status ($targetNs)"
            & minikube status
            & helm status $helmRelease --namespace $targetNs
            & kubectl get pods,svc -n $targetNs
        }
    }
    "plan"          { Invoke-AzureTerraform -Action plan }
    "apply"         { Invoke-AzureTerraform -Action apply }
    "unlock"        { Invoke-AzureTerraform -Action unlock }
    "urls"          {
        Show-Banner "HealthTech Local Endpoints"
        Write-Host "  Frontend SPA (Angular) : http://127.0.0.1:80" -ForegroundColor Green
        Write-Host "  Kong API Gateway       : http://127.0.0.1:8000 (Admin: :8001)" -ForegroundColor Green
        Write-Host "  Keycloak IAM           : http://127.0.0.1:8080 (realm: healthtech-realm)" -ForegroundColor Green
        Write-Host "  Kibana Observability   : http://127.0.0.1:5601" -ForegroundColor Green
        foreach ($svc in $HealthTechServices | Where-Object { $_.Port -ne 80 }) {
            Write-Host ("  {0,-24}: http://127.0.0.1:{1}{2}" -f $svc.Name, $svc.Port, $svc.Health) -ForegroundColor Cyan
        }
    }
    "sync-diagrams" {
        Push-Location $root
        try { & python (Join-Path $scriptsDir "generate_drawio.py") } finally { Pop-Location }
    }
    "diagrams"      {
        $diag = Join-Path $root "docs\Diagrams.drawio"
        if (Test-Path $diag) { Show-Success "Diagram available at $diag" } else { Show-Warn "Run sync-diagrams first." }
    }
}
