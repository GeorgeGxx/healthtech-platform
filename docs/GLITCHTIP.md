# GlitchTip error tracking

## Selected release

- GlitchTip image: `glitchtip/glitchtip:7.0.0` (exact stable tag; latest stable observed on 2026-11-18).
- Official Helm chart: `9.2.0`, appVersion `7.0.0` (chart digest `sha256:a14b1face40ee3631ae017d5ed213ee19536f94e5d568cf06675eb9e8b8bf8f5`).
- Local database: PostgreSQL `18.7` (`postgres:18.7-alpine`); GlitchTip 7.0 requires PostgreSQL 15 or newer. The official installation page still says 14+, so the 7.0 release note takes precedence.
- Kubernetes uses the chart's authenticated Valkey deployment. Local Compose does not add Valkey.

## Local Compose

This instance is opt-in, isolated from the healthcare database, and bound to loopback on port 8091. Use synthetic data only.

The PostgreSQL 18 image mounts its data volume at `/var/lib/postgresql`. This configuration is for a new PostgreSQL 18 data directory; it does not migrate an existing PostgreSQL 16 volume. Back up and migrate existing data with `pg_dump`/restore before switching.

```powershell
$env:GLITCHTIP_DB_PASSWORD = '<URL-safe local password>'
$env:GLITCHTIP_SECRET_KEY = '<generated random secret>'
docker compose -f compose.yaml -f compose.glitchtip.yaml --profile glitchtip up -d glitchtip
```

Open `http://localhost:8091` and create a project. Store its DSN in an untracked local environment as `GLITCHTIP_DSN`. Never configure a public/shared GlitchTip endpoint. Stop without deleting data using `docker compose -f compose.yaml -f compose.glitchtip.yaml --profile glitchtip down` (omit `-v`).

## AKS deployment

The official Helm chart is `glitchtip` version `9.2.0` from `https://gitlab.com/api/v4/projects/16325141/packages/helm/stable`; environment values are in `k8s/helm/glitchtip/`. Create `glitchtip-django-secret` (`SECRET_KEY`) and `glitchtip-database-url` (`DATABASE_URL`) through Azure Key Vault and the existing workload identity/secret delivery path before deployment. Use a private Azure Database for PostgreSQL Flexible Server 18 instance with backups; Azure manages the minor version. The chart's authenticated Valkey is enabled for queue/cache use.

The chart does not enable ingress. Use private AKS networking and configure a private DNS name and TLS before production (`errors.example.invalid` is a placeholder). Configure retention to match the approved health-data policy; the sample's 30-day setting is for local/development use only. No AKS apply, compliance review, or cloud ingestion validation was performed.

## PHI protection and status

The Compose overlay passes `GLITCHTIP_DSN` to service containers; blank DSNs disable sending. Sentry SDK setup, PHI sanitization, and ingestion verification remain pending. Until a documented security/compliance review approves a specific data flow, do not send PHI, clinical content, patient identifiers, request bodies, headers, or authentication data. The existing Elastic/OTel stack remains the telemetry system; GlitchTip is only for sanitized error groups and release metadata.

The repository package manifest reports Angular 22, while the mission brief names Angular 21. The manifest and lockfile are the implementation baseline; no framework downgrade was made.
# Audit status

All seven NestJS services and the Angular frontend initialize GlitchTip-compatible SDKs. Backend DSN is read from `SENTRY_DSN`; Angular loads its browser DSN from the runtime configuration. Event hooks omit request, user, context, extra, breadcrumb, message, and transaction payloads and redact exception text. Trace sampling is disabled.

The AKS pipeline is manual and the cluster/connection values must be supplied. Preprovision the chart database, Django, Valkey, and application DSNs as Kubernetes secrets. Cloud ingress remains disabled. Validate with a synthetic event and confirm retention, backup, and alerting before calling the rollout complete.
