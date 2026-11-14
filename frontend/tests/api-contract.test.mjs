import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(frontendRoot, '..');

test('every frontend api.service.ts endpoint prefix is routed in Kong Gateway', () => {
  const apiServiceSrc = fs.readFileSync(
    path.join(frontendRoot, 'src/app/core/services/api.service.ts'),
    'utf8',
  );
  const kongYml = fs.readFileSync(path.join(repoRoot, 'kong/kong.yml'), 'utf8');

  const routePrefixes = new Set(
    [...kongYml.matchAll(/^\s*-\s*(\/api\/[a-z0-9-]+)/gm)].map((m) => m[1]),
  );

  const calledEndpoints = [...apiServiceSrc.matchAll(/\$\{this\.baseUrl\}(\/[a-z0-9-]+)/g)].map(
    (m) => `/api${m[1]}`,
  );

  assert.ok(calledEndpoints.length > 0, 'Expected api.service.ts to call backend endpoints');
  for (const prefix of calledEndpoints) {
    assert.ok(
      routePrefixes.has(prefix),
      `Frontend calls ${prefix} which is missing from kong/kong.yml`,
    );
  }
});

test('frontend uses aligned patient catalog routes without stale endpoints', () => {
  const apiServiceSrc = fs.readFileSync(
    path.join(frontendRoot, 'src/app/core/services/api.service.ts'),
    'utf8',
  );
  assert.ok(apiServiceSrc.includes('/patients/catalogs/insurances'));
  assert.ok(apiServiceSrc.includes('/patients/catalogs/countries'));
  assert.ok(!apiServiceSrc.includes('`${this.baseUrl}/patients/insurances`'));
  assert.ok(!apiServiceSrc.includes('`${this.baseUrl}/patients/countries`'));
});
