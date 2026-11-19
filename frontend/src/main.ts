import * as Sentry from '@sentry/angular';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

const runtimeConfig = window as Window & {
  __GLITCHTIP_DSN__?: string;
  __APP_RELEASE__?: string;
  __APP_ENV__?: string;
};
Sentry.init({
  dsn: runtimeConfig.__GLITCHTIP_DSN__ || undefined,
  environment: runtimeConfig.__APP_ENV__ || 'development',
  release: runtimeConfig.__APP_RELEASE__ || 'unknown',
  maxBreadcrumbs: 0,
  tracesSampleRate: 0,
  beforeSend(event) {
    event.request = undefined;
    event.user = undefined;
    event.contexts = undefined;
    event.extra = undefined;
    event.breadcrumbs = [];
    event.message = undefined;
    event.transaction = undefined;
    for (const exception of event.exception?.values ?? []) exception.value = '[redacted]';
    return event;
  },
});

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
