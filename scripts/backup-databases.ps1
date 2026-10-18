# Respaldo automatizado de Base de Datos PostgreSQL 18
param(
    [string]$BackupDir = "database/backups",
    [int]$RetentionDays = 14
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   HealthTech Platform - Respaldo de Base de Datos" -ForegroundColor Cyan
Write-Host "   PostgreSQL 18 Multi-Tenant & Keycloak IAM" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar contenedor
$containerCheck = docker ps --filter "name=postgres" --filter "status=running" --format "{{.Names}}"
if (-not $containerCheck -or $containerCheck -notcontains "postgres") {
    Write-Error "El contenedor 'postgres' no esta en ejecucion."
    exit 1
}

# 2. Asegurar existencia de directorio
$targetPath = Join-Path $PSScriptRoot "..\$BackupDir"
if (-not (Test-Path $targetPath)) {
    New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
    Write-Host "Carpeta de respaldos creada: $targetPath" -ForegroundColor DarkGray
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$cmBackupFile = Join-Path $targetPath "centromedico_$timestamp.sql"
$kcBackupFile = Join-Path $targetPath "keycloak_$timestamp.sql"

# 3. Respaldo de centromedico
Write-Host "1/2 Respaldando base de datos clinica 'centromedico'..." -NoNewline -ForegroundColor Yellow
try {
    docker exec postgres pg_dump -U postgres --clean --if-exists centromedico | Out-File -FilePath $cmBackupFile -Encoding utf8
    if (Test-Path $cmBackupFile) {
        $cmSize = (Get-Item $cmBackupFile).Length / 1KB
        Write-Host " [OK] ($([Math]::Round($cmSize, 2)) KB)" -ForegroundColor Green
    } else {
        Write-Host " [FALLO]" -ForegroundColor Red
        throw "No se genero el archivo centromedico."
    }
} catch {
    Write-Host " [ERROR]" -ForegroundColor Red
    Write-Error "Error respaldando 'centromedico': $_"
    exit 1
}

# 4. Respaldo de keycloak
Write-Host "2/2 Respaldando base de datos de identidad 'keycloak'..." -NoNewline -ForegroundColor Yellow
try {
    docker exec postgres pg_dump -U postgres --clean --if-exists keycloak | Out-File -FilePath $kcBackupFile -Encoding utf8
    if (Test-Path $kcBackupFile) {
        $kcSize = (Get-Item $kcBackupFile).Length / 1KB
        Write-Host " [OK] ($([Math]::Round($kcSize, 2)) KB)" -ForegroundColor Green
    } else {
        Write-Host " [FALLO]" -ForegroundColor Red
        throw "No se genero el archivo keycloak."
    }
} catch {
    Write-Host " [ERROR]" -ForegroundColor Red
    Write-Error "Error respaldando 'keycloak': $_"
    exit 1
}

# 5. Politica de Retencion
Write-Host ""
Write-Host "Aplicando politica de retencion ($RetentionDays dias)..." -ForegroundColor DarkGray
$oldBackups = Get-ChildItem -Path $targetPath -Filter "*.sql" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) }
foreach ($old in $oldBackups) {
    Remove-Item $old.FullName -Force
    Write-Host "  - Respaldo antiguo purgado: $($old.Name)" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "[OK] Proceso de respaldo completado con exito." -ForegroundColor Green
Write-Host "Archivos generados:" -ForegroundColor Cyan
Write-Host "  - Clinica:   $cmBackupFile" -ForegroundColor White
Write-Host "  - Keycloak:  $kcBackupFile" -ForegroundColor White
Write-Host ""
Write-Host "Comando para restaurar en contingencia:" -ForegroundColor DarkYellow
Write-Host "  Get-Content <archivo.sql> | docker exec -i postgres psql -U postgres -d centromedico" -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
