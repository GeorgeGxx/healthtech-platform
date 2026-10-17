# Script de aprovisionamiento de Elasticsearch y Kibana para el Centro Médico
# Indices: healthtech-pharmacy-stock, healthtech-beds-census, healthtech-clinical-operations

$esUrl = "http://localhost:9200"
$kibanaUrl = "http://localhost:5601"

Write-Host "1. Verificando conectividad con Elasticsearch ($esUrl)..." -ForegroundColor Cyan
$esHealth = Invoke-RestMethod -Uri "$esUrl" -Method Get
Write-Host "Elasticsearch v$($esHealth.version.number) disponible y respondiendo." -ForegroundColor Green

Write-Host "2. Verificando conectividad con Kibana ($kibanaUrl)..." -ForegroundColor Cyan
$kbnHealth = Invoke-RestMethod -Uri "$kibanaUrl/api/status" -Method Get
Write-Host "Kibana status: $($kbnHealth.status.overall.level)" -ForegroundColor Green

# 3. Creando mapeo e índice para Inventario de Farmacia
Write-Host "3. Creando índice healthtech-pharmacy-stock..." -ForegroundColor Cyan
$pharmacyMapping = @{
    settings = @{
        number_of_shards = 1
        number_of_replicas = 0
    }
    mappings = @{
        properties = @{
            medicamento_id = @{ type = "keyword" }
            nombre_comercial = @{ type = "text"; fields = @{ keyword = @{ type = "keyword" } } }
            principio_activo = @{ type = "text"; fields = @{ keyword = @{ type = "keyword" } } }
            categoria_terapeutica = @{ type = "keyword" }
            presentacion = @{ type = "keyword" }
            lote = @{ type = "keyword" }
            caducidad = @{ type = "date" }
            stock_actual = @{ type = "integer" }
            stock_minimo = @{ type = "integer" }
            stock_maximo = @{ type = "integer" }
            nivel_alerta = @{ type = "keyword" }
            ubicacion_almacen = @{ type = "keyword" }
            precio_unitario_mxn = @{ type = "float" }
            costo_total_inventario_mxn = @{ type = "float" }
            "@timestamp" = @{ type = "date" }
        }
    }
} | ConvertTo-Json -Depth 6

Invoke-RestMethod -Uri "$esUrl/healthtech-pharmacy-stock" -Method Delete -ErrorAction SilentlyContinue | Out-Null
Invoke-RestMethod -Uri "$esUrl/healthtech-pharmacy-stock" -Method Put -Body $pharmacyMapping -ContentType "application/json" | Out-Null

# 4. Creando mapeo e índice para Censo de Camas Hospitalarias
Write-Host "4. Creando índice healthtech-beds-census..." -ForegroundColor Cyan
$bedsMapping = @{
    settings = @{
        number_of_shards = 1
        number_of_replicas = 0
    }
    mappings = @{
        properties = @{
            cama_id = @{ type = "keyword" }
            numero = @{ type = "keyword" }
            piso = @{ type = "integer" }
            tipo = @{ type = "keyword" }
            estado = @{ type = "keyword" }
            tarifa_noche_mxn = @{ type = "float" }
            paciente_nombre = @{ type = "text"; fields = @{ keyword = @{ type = "keyword" } } }
            paciente_dni = @{ type = "keyword" }
            medico_responsable = @{ type = "keyword" }
            dias_estancia = @{ type = "integer" }
            costo_acumulado_mxn = @{ type = "float" }
            "@timestamp" = @{ type = "date" }
        }
    }
} | ConvertTo-Json -Depth 6

Invoke-RestMethod -Uri "$esUrl/healthtech-beds-census" -Method Delete -ErrorAction SilentlyContinue | Out-Null
Invoke-RestMethod -Uri "$esUrl/healthtech-beds-census" -Method Put -Body $bedsMapping -ContentType "application/json" | Out-Null

# 5. Creando mapeo e índice para Operaciones Clínicas
Write-Host "5. Creando índice healthtech-clinical-operations..." -ForegroundColor Cyan
$opsMapping = @{
    settings = @{
        number_of_shards = 1
        number_of_replicas = 0
    }
    mappings = @{
        properties = @{
            operacion_id = @{ type = "keyword" }
            tipo_evento = @{ type = "keyword" }
            especialidad = @{ type = "keyword" }
            medico = @{ type = "keyword" }
            paciente = @{ type = "keyword" }
            estado = @{ type = "keyword" }
            aseguradora = @{ type = "keyword" }
            monto_mxn = @{ type = "float" }
            copago_mxn = @{ type = "float" }
            "@timestamp" = @{ type = "date" }
        }
    }
} | ConvertTo-Json -Depth 6

Invoke-RestMethod -Uri "$esUrl/healthtech-clinical-operations" -Method Delete -ErrorAction SilentlyContinue | Out-Null
Invoke-RestMethod -Uri "$esUrl/healthtech-clinical-operations" -Method Put -Body $opsMapping -ContentType "application/json" | Out-Null

Write-Host "Indices creados exitosamente en Elasticsearch." -ForegroundColor Green

# Ejecutar seeder de documentos, Data Views y Dashboard en Kibana
$scriptPath = Join-Path $PSScriptRoot "seed-elasticsearch-kibana.mjs"
if (Test-Path $scriptPath) {
    node $scriptPath
}
