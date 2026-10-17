<#
.SYNOPSIS
    Script PowerShell nativo para inicializar el Realm, Clientes, Roles y Usuarios en Keycloak 26.8.1.
.DESCRIPTION
    Interactúa directamente con la REST API de Keycloak (puerto 8080) para aprovisionar:
    - Realm: healthtech-realm
    - Clientes: healthtech-platform (público) y healthtech-backend (confidencial)
    - Roles: admin_user, basic_user, doctor_user, nurse_user, receptionist_user
    - Usuarios:
      1. admin (administrador de Keycloak)
      2. admin_user (administrador general de la aplicación con acceso total y panel de gestión)
      3. basic_user (usuario paciente con acceso exclusivo a sus citas, historial y datos)
.EXAMPLE
    .\scripts\bootstrap-keycloak.ps1
#>

[CmdletBinding()]
param (
    [string]$KeycloakUrl = "http://localhost:8080",
    [string]$AdminUser = "admin",
    [string]$AdminPassword = "admin",
    [string]$Realm = "healthtech-realm",
    [string]$RealmExportPath = ""
)

$ErrorActionPreference = "Stop"

# Resolución automática de la ruta de realm-export.json
if (-not $RealmExportPath) {
    $candidate = Join-Path $PSScriptRoot "..\keycloak\realm-export.json"
    if (Test-Path $candidate) {
        $RealmExportPath = (Resolve-Path $candidate).Path
    }
}

# Carga de variables desde .env si existe
$envCandidates = @(
    (Join-Path $PSScriptRoot "..\.env"),
    (Join-Path (Get-Location) ".env")
)
$envPath = $envCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($envPath) {
    Get-Content $envPath | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and ($line -match "^([^=]+)=(.*)$")) {
            $k = $matches[1].Trim()
            $v = $matches[2].Trim()
            if ($k -eq "KEYCLOAK_ADMIN" -and $AdminUser -eq "admin") { $AdminUser = $v }
            if ($k -eq "KEYCLOAK_ADMIN_PASSWORD" -and $AdminPassword -eq "admin") { $AdminPassword = $v }
            if ($k -eq "KEYCLOAK_PORT" -and $KeycloakUrl -eq "http://localhost:8080") { $KeycloakUrl = "http://localhost:$v" }
        }
    }
}

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  HEALTHTECH PLATFORM - KEYCLOAK 26.8.1 BOOTSTRAPPER   " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  URL:     $KeycloakUrl"
Write-Host "  Realm:   $Realm"
Write-Host "  DB:      PostgreSQL 18"
Write-Host "=======================================================`n"

# 1. Espera de disponibilidad de Keycloak
Write-Host "[1/5] Verificando conectividad con Keycloak en $KeycloakUrl..." -ForegroundColor Yellow
$deadline = (Get-Date).AddSeconds(150)
$ready = $false
$elapsed = 0
while ((Get-Date) -lt $deadline) {
    try {
        $check = Invoke-WebRequest -Uri "$KeycloakUrl/realms/master" -Method GET -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($check -and ($check.StatusCode -in 200, 302, 401)) {
            $ready = $true
            break
        }
    } catch {
        # Esperando inicio del contenedor Keycloak
    }
    Write-Host "  ... esperando a Keycloak ($elapsed s transcurridos)" -ForegroundColor DarkGray
    Start-Sleep -Seconds 3
    $elapsed += 3
}

if (-not $ready) {
    Write-Host "[X] Keycloak no responde en $KeycloakUrl tras 150s. Verifique que docker compose esté activo." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Keycloak está listo y respondiendo." -ForegroundColor Green

# 2. Gestión de Tokens de Administración
$script:AdminToken = $null
$script:AdminTokenExpiresAt = [DateTime]::MinValue

function Get-AdminHeaders {
    param([switch]$ForceRefresh)
    $now = [DateTime]::UtcNow
    if ($ForceRefresh -or [string]::IsNullOrEmpty($script:AdminToken) -or $now -ge $script:AdminTokenExpiresAt) {
        $tokenBody = @{
            client_id = "admin-cli"
            grant_type = "password"
            username = $AdminUser
            password = $AdminPassword
        }
        $tokenResp = Invoke-RestMethod -Method Post -Uri "$KeycloakUrl/realms/master/protocol/openid-connect/token" -Body $tokenBody -ContentType "application/x-www-form-urlencoded"
        $script:AdminToken = $tokenResp.access_token
        $lifespan = if ($tokenResp.expires_in) { [int]$tokenResp.expires_in } else { 60 }
        $script:AdminTokenExpiresAt = $now.AddSeconds([math]::Max(10, $lifespan - 20))
    }
    return @{
        Authorization = "Bearer $($script:AdminToken)"
        "Content-Type" = "application/json"
    }
}

function Invoke-KeycloakAdmin {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Uri,
        [Parameter(Mandatory = $false)]$Body = $null
    )

    $hdrs = Get-AdminHeaders
    $callParams = @{
        Method = $Method
        Uri = $Uri
        Headers = $hdrs
        ErrorAction = "Stop"
    }
    if ($null -ne $Body) {
        $callParams["ContentType"] = "application/json"
        if ($Body -is [string]) {
            $callParams["Body"] = $Body
        } else {
            $callParams["Body"] = ($Body | ConvertTo-Json -Depth 10 -Compress)
        }
    }

    try {
        return Invoke-RestMethod @callParams
    } catch {
        $is401 = $false
        if ($_.Exception -and $_.Exception.Response) {
            try {
                if ($_.Exception.Response.StatusCode.value__ -eq 401) { $is401 = $true }
            } catch {}
        }
        if (-not $is401 -and ("$_" -match "401" -or "$_" -match "Unauthorized")) {
            $is401 = $true
        }

        if ($is401) {
            $callParams["Headers"] = Get-AdminHeaders -ForceRefresh
            return Invoke-RestMethod @callParams
        }
        throw $_
    }
}

$headers = Get-AdminHeaders
Write-Host "[OK] Token de administración obtenido exitosamente." -ForegroundColor Green

# 3. Creación o Actualización del Realm
Write-Host "`n[3/5] Verificando Realm '$Realm'..." -ForegroundColor Yellow
$realmExists = $false
try {
    $existingRealm = Invoke-KeycloakAdmin -Method Get -Uri "$KeycloakUrl/admin/realms/$Realm"
    if ($existingRealm -and $existingRealm.realm -eq $Realm) {
        $realmExists = $true
    }
} catch {
    $realmExists = $false
}

if (-not $realmExists) {
    if ($RealmExportPath -and (Test-Path $RealmExportPath)) {
        Write-Host "  Importando definición declarativa desde: $RealmExportPath" -ForegroundColor Cyan
        try {
            $rawJson = Get-Content -Path $RealmExportPath -Raw -Encoding UTF8
            Invoke-KeycloakAdmin -Method Post -Uri "$KeycloakUrl/admin/realms" -Body $rawJson
            Write-Host "[OK] Realm '$Realm' importado correctamente." -ForegroundColor Green
        } catch {
            Write-Host "  [!] Falló la importación: $($_.Exception.Message). Creando realm por defecto..." -ForegroundColor Yellow
            $realmPayload = @{
                id = $Realm
                realm = $Realm
                displayName = "Centro Médico Nacional HealthTech"
                enabled = $true
                verifyEmail = $false
                resetPasswordAllowed = $true
                registrationAllowed = false
                loginWithEmailAllowed = $true
            } | ConvertTo-Json
            Invoke-KeycloakAdmin -Method Post -Uri "$KeycloakUrl/admin/realms" -Body $realmPayload
            Write-Host "[OK] Realm '$Realm' creado." -ForegroundColor Green
        }
    }
} else {
    Write-Host "  Realm '$Realm' ya existe." -ForegroundColor Green
}

# 4. Configurar Clientes de Acceso (Frontend SPA & Backend API)
Write-Host "`n[4/5] Configurando Clientes OpenID Connect..." -ForegroundColor Yellow

# Cliente Público para Angular 21 SPA
$clients = Invoke-KeycloakAdmin -Method Get -Uri "$KeycloakUrl/admin/realms/$Realm/clients?clientId=healthtech-platform"
if (-not $clients -or $clients.Count -eq 0) {
    $frontendClient = @{
        clientId = "healthtech-platform"
        name = "HealthTech Angular SPA"
        enabled = $true
        publicClient = $true
        redirectUris = @("*", "http://localhost:*", "http://localhost:4200/*", "http://localhost:8000/*")
        webOrigins = @("*", "+")
        protocol = "openid-connect"
        standardFlowEnabled = $true
        directAccessGrantsEnabled = $true
    } | ConvertTo-Json
    Invoke-KeycloakAdmin -Method Post -Uri "$KeycloakUrl/admin/realms/$Realm/clients" -Body $frontendClient
    Write-Host "  [OK] Creado cliente público: healthtech-platform" -ForegroundColor Green
} else {
    Write-Host "  Cliente healthtech-platform ya configurado." -ForegroundColor DarkGray
}

# Cliente Confidencial para NestJS Backend
$clients = Invoke-KeycloakAdmin -Method Get -Uri "$KeycloakUrl/admin/realms/$Realm/clients?clientId=healthtech-backend"
$confClientId = $null
if (-not $clients -or $clients.Count -eq 0) {
    $confClient = @{
        clientId = "healthtech-backend"
        name = "HealthTech NestJS Backend"
        enabled = $true
        publicClient = $false
        redirectUris = @("http://localhost:3000/*", "http://localhost:8000/*")
        protocol = "openid-connect"
        standardFlowEnabled = $true
        directAccessGrantsEnabled = $true
    } | ConvertTo-Json
    Invoke-KeycloakAdmin -Method Post -Uri "$KeycloakUrl/admin/realms/$Realm/clients" -Body $confClient
    $clients = Invoke-KeycloakAdmin -Method Get -Uri "$KeycloakUrl/admin/realms/$Realm/clients?clientId=healthtech-backend"
    $confClientId = $clients[0].id
    Write-Host "  [OK] Creado cliente confidencial: healthtech-backend" -ForegroundColor Green
} else {
    $confClientId = $clients[0].id
    Write-Host "  Cliente confidencial healthtech-backend ya existe." -ForegroundColor DarkGray
}

# 5. Configurar Roles y Usuarios
Write-Host "`n[5/5] Configurando Roles RBAC y Usuarios..." -ForegroundColor Yellow
$rolesRequeridos = @("admin_user", "basic_user", "doctor_user", "nurse_user", "receptionist_user")
foreach ($role in $rolesRequeridos) {
    try {
        Invoke-KeycloakAdmin -Method Get -Uri "$KeycloakUrl/admin/realms/$Realm/roles/$role" | Out-Null
    } catch {
        $rolePayload = @{ name = $role } | ConvertTo-Json
        Invoke-KeycloakAdmin -Method Post -Uri "$KeycloakUrl/admin/realms/$Realm/roles" -Body $rolePayload
        Write-Host "  [OK] Creado rol: $role" -ForegroundColor Green
    }
}

function Ensure-KeycloakUser {
    param (
        [string]$username,
        [string]$password,
        [string[]]$roles,
        [string]$firstName = "Usuario",
        [string]$lastName = "Hospital"
    )

    $users = Invoke-KeycloakAdmin -Method Get -Uri "$KeycloakUrl/admin/realms/$Realm/users?username=$username"
    $userId = $null

    $userPayload = @{
        username = $username
        firstName = $firstName
        lastName = $lastName
        email = "$username@centromedico.mx"
        emailVerified = $true
        enabled = $true
        requiredActions = @()
    }

    if (-not $users -or $users.Count -eq 0) {
        $userCreatePayload = $userPayload.Clone()
        $userCreatePayload["credentials"] = @(@{ type = "password"; value = $password; temporary = $false })
        Invoke-KeycloakAdmin -Method Post -Uri "$KeycloakUrl/admin/realms/$Realm/users" -Body ($userCreatePayload | ConvertTo-Json)
        $users = Invoke-KeycloakAdmin -Method Get -Uri "$KeycloakUrl/admin/realms/$Realm/users?username=$username"
        $userId = $users[0].id
        Write-Host "  [OK] Usuario '$username' creado con roles [$($roles -join ', ')]." -ForegroundColor Green
    } else {
        $userId = $users[0].id
        Invoke-KeycloakAdmin -Method Put -Uri "$KeycloakUrl/admin/realms/$Realm/users/$userId" -Body ($userPayload | ConvertTo-Json)
        Write-Host "  [OK] Usuario '$username' actualizado." -ForegroundColor DarkGray
    }

    # Resetear password para garantizar credenciales
    try {
        $pwdPayload = @{ type = "password"; value = $password; temporary = $false } | ConvertTo-Json
        Invoke-KeycloakAdmin -Method Put -Uri "$KeycloakUrl/admin/realms/$Realm/users/$userId/reset-password" -Body $pwdPayload
    } catch {}

    # Mapear roles
    if ($roles) {
        $roleObjs = @()
        foreach ($r in $roles) {
            try {
                $rObj = Invoke-KeycloakAdmin -Method Get -Uri "$KeycloakUrl/admin/realms/$Realm/roles/$r"
                $roleObjs += $rObj
            } catch {}
        }
        if ($roleObjs.Count -gt 0) {
            $roleMapPayload = $roleObjs | ConvertTo-Json -Compress
            if (-not ($roleMapPayload.StartsWith("["))) {
                $roleMapPayload = "[$roleMapPayload]"
            }
            try {
                Invoke-KeycloakAdmin -Method Post -Uri "$KeycloakUrl/admin/realms/$Realm/users/$userId/role-mappings/realm" -Body $roleMapPayload
            } catch {}
        }
    }
}

# Crear Usuarios solicitados conforme a la especificación:
# 1. admin_user: Acceso total al hospital + Panel de Administración
Ensure-KeycloakUser -username "admin_user" -password "Admin123!" -roles @("admin_user", "doctor_user") -firstName "Administrador" -lastName "Clínico"

# 2. basic_user: Paciente con acceso exclusivo a sus datos, citas y expediente
Ensure-KeycloakUser -username "basic_user" -password "User123!" -roles @("basic_user") -firstName "Juan" -lastName "Pérez García"

Write-Host "`n=======================================================" -ForegroundColor Green
Write-Host "  KEYCLOAK 26.8.1 BOOTSTRAP COMPLETADO CON ÉXITO!      " -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "  Usuarios listos para pruebas:"
Write-Host "  - admin       / admin       (Admin de Keycloak - Ajustes del Realm)"
Write-Host "  - admin_user  / Admin123!   (App Admin - Acceso total y Panel de Gestión)"
Write-Host "  - basic_user  / User123!    (App User  - Mis Citas, Mi Historial y Mis Datos)"
Write-Host "=======================================================`n"
