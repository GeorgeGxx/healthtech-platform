import { Global, Module } from '@nestjs/common';
import { KeycloakAuthGuard } from './keycloak.guard.js';
import { RolesGuard } from './roles.guard.js';

@Global()
@Module({
  providers: [KeycloakAuthGuard, RolesGuard],
  exports: [KeycloakAuthGuard, RolesGuard],
})
export class AuthModule {}
