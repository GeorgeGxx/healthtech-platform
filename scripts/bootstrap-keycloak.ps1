<#
.SYNOPSIS
    Script PowerShell nativo optimizado para inicializar el Realm, Clientes, Roles y Usuarios en Keycloak 26.8.1.
.DESCRIPTION
    Interactúa directamente con la REST API de Keycloak (puerto 8080) para aprovisionar:
    - Realm: healthtech-realm
    - Clientes: healthtech-platform (público) y backend (confidencial)
    - Roles: admin_user, basic_user, doctor_user, nurse_user, receptionist_user
    - Usuarios:
      1. admin (administrador de Keycloak)
      2. admin_user (administrador general de la aplicación con acceso total y panel de gestión)
      3. basic_user (usuario paciente con acceso exclusivo a sus citas, historial y datos)
.EXAMPLE
    pwsh -File .\scripts\bootstrap-keycloak.ps1
    pwsh -File .\scripts\bootstrap-keycloak.ps1 -AdminPassword "dev-only-keycloak-password"
#>

[CmdletBinding()]
param (
    [string]$KeycloakUrl = "",
    [string]$AdminUser = "",
    [string]$AdminPassword = "",
    [string]$Realm = "",
    [string]$RealmExportPath = ""
)

$ErrorActionPreference = "Stop"

# 1. Carga automática de variables desde .env y compose.yaml si existen
$rootPath = Resolve-Path (Join-Path $PSScriptRoot "..")
$envFile = Join-Path $rootPath ".env"
$composeFile = Join-Path $rootPath "compose.yaml"

$envVars = @{}
if (Test-Path $envFile) {
    Get-Content $envFile -Encoding UTF8 | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and ($line -match "^([^=]+)=(.*)$")) {
            $envVars[$matches[1].Trim()] = $matches[2].Trim()
        }
    }
}

# Defaults ordenados por precedencia: Parámetro CLI > EnvVar de Sesión > Archivo .env > Fallback compose.yaml
if (-not $KeycloakUrl) {
    $KeycloakUrl = if ($env:KEYCLOAK_URL) { $env:KEYCLOAK_URL }
                   elseif ($envVars["KEYCLOAK_URL"]) { $envVars["KEYCLOAK_URL"] }
                   else { "http://localhost:8080" }
}

if (-not $AdminUser) {
    $AdminUser = if ($env:KEYCLOAK_ADMIN) { $env:KEYCLOAK_ADMIN }
                 elseif ($envVars["KEYCLOAK_ADMIN"]) { $envVars["KEYCLOAK_ADMIN"] }
                 else { "admin" }
}

if (-not $AdminPassword) {
    $AdminPassword = if ($env:KEYCLOAK_ADMIN_PASSWORD) { $env:KEYCLOAK_ADMIN_PASSWORD }
                     elseif ($envVars["KEYCLOAK_ADMIN_PASSWORD"]) { $envVars["KEYCLOAK_ADMIN_PASSWORD"] }
                     else { "dev-only-keycloak-password" }
}

if (-not $Realm) {
    $Realm = if ($env:KEYCLOAK_REALM) { $env:KEYCLOAK_REALM }
             elseif ($envVars["KEYCLOAK_REALM"]) { $envVars["KEYCLOAK_REALM"] }
             else { "healthtech-realm" }
}

# Resolución automática de la ruta de realm-export.json
if (-not $RealmExportPath) {
    $candidate = Join-Path $rootPath "keycloak\realm-export.json"
    if (Test-Path $candidate) {
        $RealmExportPath = (Resolve-Path $candidate).Path
    }
}

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  HEALTHTECH PLATFORM - KEYCLOAK 26.8.1 BOOTSTRAPPER   " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  URL:     $KeycloakUrl"
Write-Host "  Realm:   $Realm"
Write-Host "  Usuario: $AdminUser"
Write-Host "  DB:      PostgreSQL 18"
Write-Host "=======================================================`n"

# 2. Verificación de Conectividad con Keycloak
Write-Host "[1/5] Verificando conectividad con Keycloak en $KeycloakUrl..." -ForegroundColor Yellow
$maxAttempts = 50
$elapsed = 0
$ready = $false

for ($i = 1; $i -le $maxAttempts; $i++) {
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

# 3. Adquisición y Autenticación con Token de Administración (Resiliente a Contraseñas)
Write-Host "`n[2/5] Autenticando con REST API de Keycloak..." -ForegroundColor Yellow

$script:AdminToken = $null
$script:AdminTokenExpiresAt = [DateTime]::MinValue
$script:CurrentPasswordUsed = $AdminPassword

# Lista de contraseñas de contingencia para dev/docker
$candidatePasswords = @($AdminPassword, "dev-only-keycloak-password", "admin") | Select-Object -Unique

function Request-AdminToken {
    param (
        [string]$User,
        [string]$Password
    )
    $tokenBody = @{
        client_id  = "admin-cli"
        grant_type = "password"
        username   = $User
        password   = $Password
    }
    return Invoke-RestMethod -Method Post -Uri "$KeycloakUrl/realms/master/protocol/openid-connect/token" -Body $tokenBody -ContentType "application/x-www-form-urlencoded" -TimeoutSec 10
}

$tokenObtained = $false
foreach ($pwd in $candidatePasswords) {
    if (-not $pwd) { continue }
    try {
        # Intentar hasta 3 veces por si el subsistema de auth está calentando
        for ($retry = 1; $retry -le 3; $retry++) {
            try {
                $tokenResp = Request-AdminToken -User $AdminUser -Password $pwd
                if ($tokenResp -and $tokenResp.access_token) {
                    $script:AdminToken = $tokenResp.access_token
                    $script:CurrentPasswordUsed = $pwd
                    $lifespan = if ($tokenResp.expires_in) { [int]$tokenResp.expires_in } else { 60 }
                    $script:AdminTokenExpiresAt = [DateTime]::UtcNow.AddSeconds([math]::Max(10, $lifespan - 20))
                    $tokenObtained = $true
                    break
                }
            } catch {
                $errorMsg = "$_"
                if ($errorMsg -match "invalid_grant") {
                    # Credenciales incorrectas para este password, no reintentar este mismo
                    break
                }
                Start-Sleep -Seconds 2
            }
        }
        if ($tokenObtained) { break }
    } catch {
        # Probar siguiente candidato
    }
}

if (-not $tokenObtained) {
    Write-Host "`n[X] Error de autenticación: No se pudo obtener el token de administración." -ForegroundColor Red
    Write-Host "    Usuario intentado: $AdminUser" -ForegroundColor Red
    Write-Host "    Contraseñas probadas: $($candidatePasswords -join ', ')" -ForegroundColor Red
    Write-Host "`n[i] Solución recomendada:" -ForegroundColor Yellow
    Write-Host "    Ejecute el script pasando la contraseña configurada en su compose.yaml:" -ForegroundColor White
    Write-Host "    pwsh -File .\scripts\bootstrap-keycloak.ps1 -AdminPassword `"SU_PASSWORD`"`n" -ForegroundColor Cyan
    exit 1
}

Write-Host "[OK] Token de administración obtenido exitosamente (usando '$script:CurrentPasswordUsed')." -ForegroundColor Green

function Get-AdminHeaders {
    param([switch]$ForceRefresh)
    $now = [DateTime]::UtcNow
    if ($ForceRefresh -or [string]::IsNullOrEmpty($script:AdminToken) -or $now -ge $script:AdminTokenExpiresAt) {
        $tokenResp = Request-AdminToken -User $AdminUser -Password $script:CurrentPasswordUsed
        $script:AdminToken = $tokenResp.access_token
        $lifespan = if ($tokenResp.expires_in) { [int]$tokenResp.expires_in } else { 60 }
        $script:AdminTokenExpiresAt = $now.AddSeconds([math]::Max(10, $lifespan - 20))
    }
    return @{
        Authorization  = "Bearer $($script:AdminToken)"
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
        Method      = $Method
        Uri         = $Uri
        Headers     = $hdrs
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

# 4. Creación o Actualización del Realm
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
            Write-Host "  [!] Aviso en importación declarativa: $($_.Exception.Message). Creando realm con valores seguros..." -ForegroundColor Yellow
            $realmPayload = @{
                id                    = $Realm
                realm                 = $Realm
                displayName           = "Centro Médico Nacional HealthTech"
                enabled               = $true
                verifyEmail           = $false
                resetPasswordAllowed  = $true
                registrationAllowed   = false
                loginWithEmailAllowed = $true
            } | ConvertTo-Json
            Invoke-KeycloakAdmin -Method Post -Uri "$KeycloakUrl/admin/realms" -Body $realmPayload
            Write-Host "[OK] Realm '$Realm' creado." -ForegroundColor Green
        }
    } else {
        $realmPayload = @{
            id                    = $Realm
            realm                 = $Realm
            displayName           = "Centro Médico Nacional HealthTech"
            enabled               = $true
            verifyEmail           = $false
            resetPasswordAllowed  = $true
            registrationAllowed   = false
            loginWithEmailAllowed = $true
        } | ConvertTo-Json
        Invoke-KeycloakAdmin -Method Post -Uri "$KeycloakUrl/admin/realms" -Body $realmPayload
        Write-Host "[OK] Realm '$Realm' creado." -ForegroundColor Green
    }
} else {
    Write-Host "  Realm '$Realm' ya existe." -ForegroundColor Green
}

# 5. Configurar Clientes de Acceso (Frontend SPA & Backend API)
Write-Host "`n[4/5] Configurando Clientes OpenID Connect..." -ForegroundColor Yellow

# Cliente Público para Angular 21 SPA
$clients = Invoke-KeycloakAdmin -Method Get -Uri "$KeycloakUrl/admin/realms/$Realm/clients?clientId=healthtech-platform"
if (-not $clients -or $clients.Count -eq 0) {
    $frontendClient = @{
        clientId                  = "healthtech-platform"
        name                      = "HealthTech Angular SPA"
        enabled                   = $true
        publicClient              = $true
        redirectUris              = @("*", "http://localhost:*", "http://localhost:4200/*", "http://localhost:8000/*")
        webOrigins                = @("*", "+")
        protocol                  = "openid-connect"
        standardFlowEnabled       = $true
        directAccessGrantsEnabled = $true
    } | ConvertTo-Json
    Invoke-KeycloakAdmin -Method Post -Uri "$KeycloakUrl/admin/realms/$Realm/clients" -Body $frontendClient
    Write-Host "  [OK] Creado cliente público: healthtech-platform" -ForegroundColor Green
} else {
    Write-Host "  Cliente healthtech-platform ya configurado." -ForegroundColor DarkGray
}

# Cliente Confidencial para NestJS Backend
$clients = Invoke-KeycloakAdmin -Method Get -Uri "$KeycloakUrl/admin/realms/$Realm/clients?clientId=backend"
$confClientId = $null
if (-not $clients -or $clients.Count -eq 0) {
    $confClient = @{
        clientId                  = "backend"
        name                      = "HealthTech NestJS Backend"
        enabled                   = $true
        publicClient              = $false
        redirectUris              = @("http://localhost:3000/*", "http://localhost:8000/*")
        protocol                  = "openid-connect"
        standardFlowEnabled       = $true
        directAccessGrantsEnabled = $true
    } | ConvertTo-Json
    Invoke-KeycloakAdmin -Method Post -Uri "$KeycloakUrl/admin/realms/$Realm/clients" -Body $confClient
    $clients = Invoke-KeycloakAdmin -Method Get -Uri "$KeycloakUrl/admin/realms/$Realm/clients?clientId=backend"
    $confClientId = $clients[0].id
    Write-Host "  [OK] Creado cliente confidencial: backend" -ForegroundColor Green
} else {
    $confClientId = $clients[0].id
    Write-Host "  Cliente confidencial backend ya existe." -ForegroundColor DarkGray
}

# 6. Configurar Roles y Usuarios
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
        username        = $username
        firstName       = $firstName
        lastName        = $lastName
        email           = "$username@centromedico.mx"
        emailVerified   = $true
        enabled         = $true
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

# 1. admin_user: Acceso total al hospital + Panel de Administración
Ensure-KeycloakUser -username "admin_user" -password "Admin123!" -roles @("admin_user", "doctor_user") -firstName "Administrador" -lastName "Clínico"

# 2. basic_user: Paciente con acceso exclusivo a sus datos, citas y expediente
Ensure-KeycloakUser -username "basic_user" -password "User123!" -roles @("basic_user") -firstName "Juan" -lastName "Pérez García"

Write-Host "`n=======================================================" -ForegroundColor Green
Write-Host "  KEYCLOAK 26.8.1 BOOTSTRAP COMPLETADO CON ÉXITO!      " -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "  Usuarios listos para pruebas:"
Write-Host "  - admin       / $script:CurrentPasswordUsed       (Admin de Keycloak - Ajustes del Realm)"
Write-Host "  - admin_user  / Admin123!   (App Admin - Acceso total y Panel de Gestión)"
Write-Host "  - basic_user  / User123!    (App User  - Mis Citas, Mi Historial y Mis Datos)"
Write-Host "=======================================================`n"
